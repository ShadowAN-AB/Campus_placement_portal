import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";
import { RefId } from "../../common/oid";
import { InterviewStatus } from "../../common/types";

@Schema({ timestamps: true })
export class Interview {
  @Prop({ type: RefId, ref: "Application", required: true, unique: true })
  applicationId: Types.ObjectId;

  @Prop({ type: RefId, ref: "User", required: true, index: true })
  studentId: Types.ObjectId;

  @Prop({ type: RefId, ref: "User", required: true, index: true })
  recruiterId: Types.ObjectId;

  @Prop({ type: RefId, ref: "Job", required: true })
  jobId: Types.ObjectId;

  @Prop({ required: true })
  scheduledAt: Date;

  @Prop({ default: 30 })
  durationMinutes: number;

  @Prop({ default: "scheduled", enum: ["scheduled", "completed", "cancelled"] })
  status: InterviewStatus;

  @Prop({ default: "online" })
  meetingType: string;

  @Prop()
  meetingLink?: string;

  @Prop()
  location?: string;

  @Prop()
  notes?: string;

  @Prop()
  cancelReason?: string;

  @Prop()
  feedback?: string;

  @Prop()
  rating?: number;
}

export type InterviewDocument = HydratedDocument<Interview>;
export const InterviewSchema = SchemaFactory.createForClass(Interview);
InterviewSchema.index({ studentId: 1, scheduledAt: 1 });
InterviewSchema.index({ recruiterId: 1, scheduledAt: 1 });
