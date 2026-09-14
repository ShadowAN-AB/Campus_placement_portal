import { DynamicModule, Module, Type } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { BullModule } from "@nestjs/bullmq";
import { MongooseModule } from "@nestjs/mongoose";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { QUEUE_EVENTS } from "../common/types";
import { HealthController } from "../health/health.controller";
import { env } from "../infra/config/env";
import { AuthCoreModule } from "../identity/auth-core.module";
import { IdentityModule } from "../identity/identity.module";
import { CatalogModule } from "../catalog/catalog.module";
import { ApplicationsModule } from "../applications/applications.module";
import { MatchingModule } from "../matching/matching.module";
import { InterviewsModule } from "../interviews/interviews.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { AnalyticsModule } from "../analytics/analytics.module";
import { RedisInfraModule } from "../infra/redis/redis.module";
import { StorageModule } from "../infra/storage/storage.module";
import { MailModule } from "../infra/mail/mail.module";
import { LlmModule } from "../infra/llm/llm.module";
import { OutboxModule } from "../infra/outbox/outbox.module";
import { FEATURE_SERVICES, type FeatureService } from "./services";

const FEATURE_MODULE: Record<FeatureService, Type> = {
  identity: IdentityModule,
  catalog: CatalogModule,
  applications: ApplicationsModule,
  matching: MatchingModule,
  interviews: InterviewsModule,
  notifications: NotificationsModule,
  analytics: AnalyticsModule,
};

function featureImports(service: string) {
  if (service === "all") return Object.values(FEATURE_MODULE);
  if ((FEATURE_SERVICES as string[]).includes(service)) return [FEATURE_MODULE[service as FeatureService]];
  throw new Error(`Unknown SERVICE="${service}". Use all | ${FEATURE_SERVICES.join(" | ")}`);
}

@Module({})
export class PlacecellAppModule {
  static forService(service = process.env.SERVICE ?? "all"): DynamicModule {
    return {
      module: PlacecellAppModule,
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
        AuthCoreModule,
        ...featureImports(service),
      ],
      controllers: [HealthController],
      providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
    };
  }
}
