import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { randomUUID } from "crypto";
import { PlacecellAppModule } from "./apps/build-app.module";
import { env } from "./infra/config/env";

const service = process.env.SERVICE ?? "all";

async function bootstrap() {
  const app = await NestFactory.create(PlacecellAppModule.forService(service));
  app.use(helmet());
  app.use(cookieParser());
  app.use((req: { headers: Record<string, string | string[] | undefined>; id?: string; method?: string; originalUrl?: string; url?: string }, res: { setHeader: (k: string, v: string) => void; on: (e: string, cb: () => void) => void; statusCode?: number }, next: () => void) => {
    const header = req.headers["x-request-id"];
    const id = (typeof header === "string" && header.trim()) || randomUUID();
    req.id = id;
    res.setHeader("x-request-id", id);
    const started = Date.now();
    res.on("finish", () => {
      console.log(`${id} ${req.method} ${req.originalUrl ?? req.url} ${res.statusCode} ${Date.now() - started}ms service=${service}`);
    });
    next();
  });
  app.enableCors({
    origin: env.clientOrigin,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );
  await app.listen(env.port);
}

bootstrap();
