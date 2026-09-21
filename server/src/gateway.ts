import http from "http";
import { randomUUID } from "crypto";
import { FEATURE_SERVICES, SERVICE_PORTS, resolveService, type FeatureService } from "./apps/services";

const GATEWAY_PORT = Number(process.env.GATEWAY_PORT ?? process.env.PORT ?? 5050);
const UPSTREAM_HOST = process.env.GATEWAY_UPSTREAM_HOST ?? "127.0.0.1";
const USE_SERVICE_DNS = process.env.GATEWAY_USE_SERVICE_DNS === "1";

function json(res: http.ServerResponse, status: number, body: unknown, requestId?: string) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (requestId) headers["x-request-id"] = requestId;
  res.writeHead(status, headers);
  res.end(JSON.stringify(body));
}

function requestIdOf(req: http.IncomingMessage) {
  const header = req.headers["x-request-id"];
  if (typeof header === "string" && header.trim()) return header.trim();
  return randomUUID();
}

function hostOf(service: FeatureService) {
  const named = process.env[`GATEWAY_${service.toUpperCase()}_HOST`];
  if (named) return named;
  return USE_SERVICE_DNS ? service : UPSTREAM_HOST;
}

function portOf(service: FeatureService) {
  const named = process.env[`GATEWAY_${service.toUpperCase()}_PORT`];
  if (named) return Number(named);
  return SERVICE_PORTS[service];
}

function probe(service: FeatureService): Promise<boolean> {
  const hostname = hostOf(service);
  const port = portOf(service);
  return new Promise((resolve) => {
    const req = http.request(
      { hostname, port, path: "/health", method: "GET", timeout: 1500 },
      (r) => {
        r.resume();
        resolve((r.statusCode ?? 500) < 500);
      },
    );
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

function proxy(req: http.IncomingMessage, res: http.ServerResponse, service: FeatureService, requestId: string) {
  const hostname = hostOf(service);
  const port = portOf(service);
  const headers = { ...req.headers, host: `${hostname}:${port}`, "x-request-id": requestId };
  const upstream = http.request(
    {
      hostname,
      port,
      path: req.url,
      method: req.method,
      headers,
      timeout: 60_000,
    },
    (pres) => {
      const out = { ...pres.headers, "x-request-id": requestId };
      res.writeHead(pres.statusCode ?? 502, out);
      pres.pipe(res);
    },
  );
  upstream.on("error", () => {
    json(res, 503, {
      message: `${service} service is unavailable`,
      service,
    }, requestId);
  });
  upstream.on("timeout", () => {
    upstream.destroy();
    json(res, 504, { message: `${service} service timed out`, service }, requestId);
  });
  req.pipe(upstream);
}

export function createGatewayServer() {
  return http.createServer(async (req, res) => {
    const path = req.url ?? "/";
    const requestId = requestIdOf(req);
    if (path.split("?")[0] === "/health") {
      const services: Record<string, boolean> = {};
      await Promise.all(
        FEATURE_SERVICES.map(async (name) => {
          services[name] = await probe(name);
        }),
      );
      json(res, 200, { ok: true, gateway: true, services }, requestId);
      return;
    }
    if (path.split("?")[0] === "/ready") {
      const identity = await probe("identity");
      const catalog = await probe("catalog");
      if (!identity || !catalog) {
        json(res, 503, { ok: false, identity, catalog }, requestId);
        return;
      }
      json(res, 200, { ok: true, identity, catalog }, requestId);
      return;
    }
    const service = resolveService(path);
    if (!service) {
      json(res, 404, { message: "No feature service for this path" }, requestId);
      return;
    }
    proxy(req, res, service, requestId);
  });
}

const entry = process.argv[1] ?? "";
if (/\bgateway\.(ts|js)$/.test(entry)) {
  createGatewayServer().listen(GATEWAY_PORT, () => {
    const targets = FEATURE_SERVICES.map((s) => `${s}@${hostOf(s)}:${portOf(s)}`).join(" ");
    console.log(`PlaceCell gateway :${GATEWAY_PORT} → ${targets}`);
  });
}
