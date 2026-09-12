import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { MatchScore, MatchScoreSchema } from "../applications/schemas/match-score.schema";
import { Job, JobSchema } from "../catalog/schemas/job.schema";
import { MatchingController } from "./matching.controller";
import { MatchingService } from "./matching.service";
import { ChatMessage, ChatMessageSchema } from "./schemas/chat-message.schema";
import { ResumeAnalysis, ResumeAnalysisSchema } from "./schemas/resume-analysis.schema";
import { ResumeUpload, ResumeUploadSchema } from "./schemas/resume-upload.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ResumeUpload.name, schema: ResumeUploadSchema },
      { name: ResumeAnalysis.name, schema: ResumeAnalysisSchema },
      { name: ChatMessage.name, schema: ChatMessageSchema },
      { name: MatchScore.name, schema: MatchScoreSchema },
      { name: Job.name, schema: JobSchema },
    ]),
  ],
  controllers: [MatchingController],
  providers: [MatchingService],
  exports: [MatchingService, MongooseModule],
})
export class MatchingModule {}
