import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { CatalogController } from "./catalog.controller";
import { CatalogService } from "./catalog.service";
import { Application, ApplicationSchema } from "../applications/schemas/application.schema";
import { Job, JobSchema } from "./schemas/job.schema";
import { StudentProfile, StudentProfileSchema } from "./schemas/profile.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Job.name, schema: JobSchema },
      { name: StudentProfile.name, schema: StudentProfileSchema },
      { name: Application.name, schema: ApplicationSchema },
    ]),
  ],
  controllers: [CatalogController],
  providers: [CatalogService],
  exports: [CatalogService, MongooseModule],
})
export class CatalogModule {}
