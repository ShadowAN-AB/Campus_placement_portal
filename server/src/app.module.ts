import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { BullModule } from "@nestjs/bullmq";
import { MongooseModule } from "@nestjs/mongoose";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { env } from "./infra/config/env";
import { RedisInfraModule } from "./infra/redis/redis.module";
import { StorageModule } from "./infra/storage/storage.module";
import { MailModule } from "./infra/mail/mail.module";
import { LlmModule } from "./infra/llm/llm.module";
import { OutboxModule } from "./infra/outbox/outbox.module";
import { IdentityModule } from "./identity/identity.module";
import { CatalogModule } from "./catalog/catalog.module";
import { ApplicationsModule } from "./applications/applications.module";
import { MatchingModule } from "./matching/matching.module";
import { InterviewsModule } from "./interviews/interviews.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { HealthController } from "./health/health.controller";
import { QUEUE_EVENTS } from "./common/types";

@Module({
  imports: [
    MongooseModule.forRoot(env.mongodbUri),
    BullModule.forRoot({ connection: { url: env.redisUrl, maxRetriesPerRequest: null } }),
    BullModule.registerQueue({ name: QUEUE_EVENTS }),
    ThrottlerModule.forRoot({
      throttlers: [{ name: "default", ttl: 60000, limit: 120 }],
    }),
    RedisInfraModule,
    StorageModule,
    MailModule,
    LlmModule,
    OutboxModule,
    IdentityModule,
    CatalogModule,
    ApplicationsModule,
    MatchingModule,
    InterviewsModule,
    NotificationsModule,
    AnalyticsModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
