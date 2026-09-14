import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Inject } from "@nestjs/common";
import { Connection } from "mongoose";
import Redis from "ioredis";
import { REDIS } from "../infra/redis/redis.module";

@Controller()
export class HealthController {
  constructor(
    @InjectConnection() private readonly mongo: Connection,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  @Get("health")
  health() {
    return { ok: true, service: process.env.SERVICE ?? "all" };
  }

  @Get("ready")
  async ready() {
    const mongoOk = this.mongo.readyState === 1;
    let redisOk = false;
    try {
      redisOk = (await this.redis.ping()) === "PONG";
    } catch {
      redisOk = false;
    }
    if (!mongoOk || !redisOk) {
      throw new ServiceUnavailableException({ mongoOk, redisOk });
    }
    return { ok: true, mongoOk, redisOk };
  }
}
