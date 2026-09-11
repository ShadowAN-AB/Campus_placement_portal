import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { MongooseModule } from "@nestjs/mongoose";
import { env } from "./infra/config/env";
import { QUEUE_EVENTS } from "./common/types";
import { RedisInfraModule } from "./infra/redis/redis.module";
import { StorageModule } from "./infra/storage/storage.module";
import { MailModule } from "./infra/mail/mail.module";
import { LlmModule } from "./infra/llm/llm.module";
import { OutboxModule } from "./infra/outbox/outbox.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { EventsProcessor } from "./infra/queue/events.processor";
import { OutboxSweeper } from "./infra/queue/outbox.sweeper";
import { ResumeUpload, ResumeUploadSchema } from "./matching/schemas/resume-upload.schema";
import { ResumeAnalysis, ResumeAnalysisSchema } from "./matching/schemas/resume-analysis.schema";
import { StudentProfile, StudentProfileSchema } from "./catalog/schemas/profile.schema";
import { Job, JobSchema } from "./catalog/schemas/job.schema";
import { MatchScore, MatchScoreSchema } from "./applications/schemas/match-score.schema";
import { Application, ApplicationSchema } from "./applications/schemas/application.schema";
import { User, UserSchema } from "./identity/schemas/user.schema";
import { Interview, InterviewSchema } from "./interviews/schemas/interview.schema";

@Module({
  imports: [
    MongooseModule.forRoot(env.mongodbUri),
    BullModule.forRoot({ connection: { url: env.redisUrl, maxRetriesPerRequest: null } }),
    BullModule.registerQueue({ name: QUEUE_EVENTS }),
    MongooseModule.forFeature([
      { name: ResumeUpload.name, schema: ResumeUploadSchema },
      { name: ResumeAnalysis.name, schema: ResumeAnalysisSchema },
      { name: StudentProfile.name, schema: StudentProfileSchema },
      { name: Job.name, schema: JobSchema },
      { name: MatchScore.name, schema: MatchScoreSchema },
      { name: Application.name, schema: ApplicationSchema },
      { name: User.name, schema: UserSchema },
      { name: Interview.name, schema: InterviewSchema },
    ]),
    RedisInfraModule,
    StorageModule,
    MailModule,
    LlmModule,
    OutboxModule,
    NotificationsModule,
    AnalyticsModule,
  ],
  providers: [EventsProcessor, OutboxSweeper],
})
export class WorkerModule {}
