import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { randomUUID } from "crypto";
import { AppModule } from "./app.module";
import { env } from "./infra/config/env";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.use(cookieParser());
  app.use((req: { headers: Record<string, string>; id?: string }, _res: unknown, next: () => void) => {
    req.id = req.headers["x-request-id"] || randomUUID();
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
