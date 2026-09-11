import { ArrayMaxSize, IsArray, IsIn, IsMongoId, IsOptional, IsString } from "class-validator";
import { ApplicationStatus } from "../../common/types";

export class ApplyDto {
  @IsMongoId()
  jobId: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class StatusDto {
  @IsIn(["pending", "shortlisted", "rejected", "interview"])
  status: ApplicationStatus;
}

export class BulkStatusDto {
  @IsArray()
  @ArrayMaxSize(100)
  @IsMongoId({ each: true })
  appIds: string[];

  @IsIn(["pending", "shortlisted", "rejected", "interview"])
  status: ApplicationStatus;
}
