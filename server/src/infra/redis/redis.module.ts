import { Global, Module } from "@nestjs/common";
import Redis from "ioredis";
import { env } from "../config/env";

export const REDIS = "REDIS";

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      useFactory: () =>
        new Redis(env.redisUrl, {
          maxRetriesPerRequest: null,
          lazyConnect: env.nodeEnv === "test",
          enableOfflineQueue: env.nodeEnv !== "test",
        }),
    },
  ],
  exports: [REDIS],
})
export class RedisInfraModule {}
