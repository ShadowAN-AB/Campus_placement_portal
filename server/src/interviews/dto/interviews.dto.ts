import { IsDateString, IsMongoId, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";
import { Type } from "class-transformer";

export class ScheduleInterviewDto {
  @IsMongoId()
  applicationId: string;

  @IsDateString()
  scheduledAt: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(15)
  @Max(180)
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  meetingType?: string;

  @IsOptional()
  @IsString()
  meetingLink?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RescheduleDto {
  @IsDateString()
  scheduledAt: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(15)
  @Max(180)
  durationMinutes?: number;
}

export class CancelDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CompleteDto {
  @IsOptional()
  @IsString()
  feedback?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;
}
