import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { Application, ApplicationSchema } from "../applications/schemas/application.schema";
import { Job, JobSchema } from "../catalog/schemas/job.schema";
import { env } from "../infra/config/env";
import { User, UserSchema } from "../identity/schemas/user.schema";
import { InterviewsController } from "./interviews.controller";
import { InterviewsService } from "./interviews.service";
import { Interview, InterviewSchema } from "./schemas/interview.schema";

@Module({
  imports: [
    JwtModule.register({ secret: env.jwtSecret }),
    MongooseModule.forFeature([
      { name: Interview.name, schema: InterviewSchema },
      { name: Application.name, schema: ApplicationSchema },
      { name: Job.name, schema: JobSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [InterviewsController],
  providers: [InterviewsService],
  exports: [InterviewsService, MongooseModule],
})
export class InterviewsModule {}
