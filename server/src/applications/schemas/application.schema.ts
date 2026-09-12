import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";
import { RefId } from "../../common/oid";
import { ApplicationStatus } from "../../common/types";

@Schema({ timestamps: true })
export class Application {
  @Prop({ type: RefId, ref: "User", required: true, index: true })
  studentId: Types.ObjectId;

  @Prop({ type: RefId, ref: "Job", required: true, index: true })
  jobId: Types.ObjectId;

  @Prop({ default: "pending", enum: ["pending", "shortlisted", "rejected", "interview"] })
  status: ApplicationStatus;

  @Prop({ default: 0 })
  matchScore: number;

  @Prop({ default: Date.now })
  appliedAt: Date;

  @Prop()
  idempotencyKey?: string;
}

export type ApplicationDocument = HydratedDocument<Application>;
export const ApplicationSchema = SchemaFactory.createForClass(Application);
ApplicationSchema.index({ studentId: 1, jobId: 1 }, { unique: true });
ApplicationSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });
