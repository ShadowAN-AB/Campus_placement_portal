import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Job, JobSchema } from "../catalog/schemas/job.schema";
import { StudentProfile, StudentProfileSchema } from "../catalog/schemas/profile.schema";
import { User, UserSchema } from "../identity/schemas/user.schema";
import { ApplicationsController } from "./applications.controller";
import { ApplicationsService } from "./applications.service";
import { Application, ApplicationSchema } from "./schemas/application.schema";
import { MatchScore, MatchScoreSchema } from "./schemas/match-score.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Application.name, schema: ApplicationSchema },
      { name: MatchScore.name, schema: MatchScoreSchema },
      { name: Job.name, schema: JobSchema },
      { name: StudentProfile.name, schema: StudentProfileSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
  exports: [ApplicationsService, MongooseModule],
})
export class ApplicationsModule {}
