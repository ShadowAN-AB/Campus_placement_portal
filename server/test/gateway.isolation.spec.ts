import http from "http";
import { AddressInfo } from "net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createGatewayServer } from "../src/gateway";

function listen(server: http.Server) {
  return new Promise<number>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve((server.address() as AddressInfo).port));
  });
}

function jsonServer(handler: (req: http.IncomingMessage, res: http.ServerResponse) => void) {
  return http.createServer((req, res) => {
    if ((req.url ?? "").split("?")[0] === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    handler(req, res);
  });
}

describe("gateway isolation", () => {
  const applies = new Map<string, { _id: string; replayed?: boolean }>();
  let identity: http.Server;
  let catalog: http.Server;
  let applications: http.Server;
  let gateway: http.Server;
  let base = "";

  beforeAll(async () => {
    identity = jsonServer((req, res) => {
      if (req.method === "POST" && (req.url ?? "").startsWith("/v1/auth/login")) {
        res.writeHead(201, { "content-type": "application/json" });
        res.end(JSON.stringify({ accessToken: "test-token" }));
        return;
      }
      res.writeHead(404);
      res.end();
    });
    catalog = jsonServer((req, res) => {
      if (req.method === "GET" && (req.url ?? "").startsWith("/v1/jobs")) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ items: [{ _id: "job1", title: "SDE" }] }));
        return;
      }
      res.writeHead(404);
      res.end();
    });
    applications = jsonServer((req, res) => {
      if (req.method === "POST" && (req.url ?? "").split("?")[0] === "/v1/applications") {
        const key = String(req.headers["idempotency-key"] ?? "");
        if (key && applies.has(key)) {
          res.writeHead(201, { "content-type": "application/json" });
          res.end(JSON.stringify({ ...applies.get(key), replayed: true }));
          return;
        }
        const created = { _id: `app-${applies.size + 1}` };
        if (key) applies.set(key, created);
        res.writeHead(201, { "content-type": "application/json" });
        res.end(JSON.stringify(created));
        return;
      }
      res.writeHead(404);
      res.end();
    });

    const identityPort = await listen(identity);
    const catalogPort = await listen(catalog);
    const applicationsPort = await listen(applications);
    process.env.GATEWAY_IDENTITY_HOST = "127.0.0.1";
    process.env.GATEWAY_IDENTITY_PORT = String(identityPort);
    process.env.GATEWAY_CATALOG_HOST = "127.0.0.1";
    process.env.GATEWAY_CATALOG_PORT = String(catalogPort);
    process.env.GATEWAY_APPLICATIONS_HOST = "127.0.0.1";
    process.env.GATEWAY_APPLICATIONS_PORT = String(applicationsPort);
    process.env.GATEWAY_MATCHING_HOST = "127.0.0.1";
    process.env.GATEWAY_MATCHING_PORT = "1";

    gateway = createGatewayServer();
    const gatewayPort = await listen(gateway);
    base = `http://127.0.0.1:${gatewayPort}`;
  });

  afterAll(async () => {
    await Promise.all([identity, catalog, applications, gateway].map((s) => new Promise<void>((resolve) => s.close(() => resolve()))));
  });

  it("logs in through identity", async () => {
    const res = await fetch(`${base}/v1/auth/login`, { method: "POST" });
    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toEqual({ accessToken: "test-token" });
    expect(res.headers.get("x-request-id")).toBeTruthy();
  });

  it("replays apply with the same idempotency key", async () => {
    const first = await fetch(`${base}/v1/applications`, {
      method: "POST",
      headers: { "Idempotency-Key": "apply-1" },
    });
    const second = await fetch(`${base}/v1/applications`, {
      method: "POST",
      headers: { "Idempotency-Key": "apply-1" },
    });
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(await second.json()).toMatchObject({ replayed: true });
  });

  it("keeps /v1/jobs up when matching is down", async () => {
    const jobs = await fetch(`${base}/v1/jobs`);
    expect(jobs.status).toBe(200);
    await expect(jobs.json()).resolves.toMatchObject({ items: [{ title: "SDE" }] });

    const resumes = await fetch(`${base}/v1/resumes`, { method: "POST" });
    expect(resumes.status).toBe(503);
    await expect(resumes.json()).resolves.toMatchObject({ service: "matching" });

    const health = await fetch(`${base}/health`);
    const body = (await health.json()) as { services: Record<string, boolean> };
    expect(body.services.catalog).toBe(true);
    expect(body.services.identity).toBe(true);
    expect(body.services.matching).toBe(false);
  });
});
