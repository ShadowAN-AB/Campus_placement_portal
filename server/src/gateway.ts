import http from "http";
import { FEATURE_SERVICES, SERVICE_PORTS, resolveService, type FeatureService } from "./apps/services";

const GATEWAY_PORT = Number(process.env.GATEWAY_PORT ?? process.env.PORT ?? 5050);
const UPSTREAM_HOST = process.env.GATEWAY_UPSTREAM_HOST ?? "127.0.0.1";

function json(res: http.ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

function probe(service: FeatureService): Promise<boolean> {
  const port = SERVICE_PORTS[service];
  return new Promise((resolve) => {
    const req = http.request(
      { hostname: UPSTREAM_HOST, port, path: "/health", method: "GET", timeout: 1500 },
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

function proxy(req: http.IncomingMessage, res: http.ServerResponse, service: FeatureService) {
  const port = SERVICE_PORTS[service];
  const headers = { ...req.headers, host: `${UPSTREAM_HOST}:${port}` };
  const upstream = http.request(
    {
      hostname: UPSTREAM_HOST,
      port,
      path: req.url,
      method: req.method,
      headers,
      timeout: 60_000,
    },
    (pres) => {
      res.writeHead(pres.statusCode ?? 502, pres.headers);
      pres.pipe(res);
    },
  );
  upstream.on("error", () => {
    json(res, 503, {
      message: `${service} service is unavailable`,
      service,
    });
  });
  upstream.on("timeout", () => {
    upstream.destroy();
    json(res, 504, { message: `${service} service timed out`, service });
  });
  req.pipe(upstream);
}

const server = http.createServer(async (req, res) => {
  const path = req.url ?? "/";
  if (path.split("?")[0] === "/health") {
    const services: Record<string, boolean> = {};
    await Promise.all(
      FEATURE_SERVICES.map(async (name) => {
        services[name] = await probe(name);
      }),
    );
    json(res, 200, { ok: true, gateway: true, services });
    return;
  }
  if (path.split("?")[0] === "/ready") {
    const identity = await probe("identity");
    const catalog = await probe("catalog");
    if (!identity || !catalog) {
      json(res, 503, { ok: false, identity, catalog });
      return;
    }
    json(res, 200, { ok: true, identity, catalog });
    return;
  }
  const service = resolveService(path);
  if (!service) {
    json(res, 404, { message: "No feature service for this path" });
    return;
  }
  proxy(req, res, service);
});

server.listen(GATEWAY_PORT, () => {
  console.log(`PlaceCell gateway :${GATEWAY_PORT} → ${UPSTREAM_HOST} ${FEATURE_SERVICES.map((s) => `${s}:${SERVICE_PORTS[s]}`).join(" ")}`);
});
