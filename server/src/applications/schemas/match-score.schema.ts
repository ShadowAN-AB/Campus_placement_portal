import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

@Schema({ timestamps: true })
export class MatchScore {
  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  studentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Job", required: true })
  jobId: Types.ObjectId;

  @Prop({ required: true })
  score: number;

  @Prop({ type: [String], default: [] })
  matchedSkills: string[];

  @Prop({ type: [String], default: [] })
  missingSkills: string[];
}

export type MatchScoreDocument = HydratedDocument<MatchScore>;
export const MatchScoreSchema = SchemaFactory.createForClass(MatchScore);
MatchScoreSchema.index({ studentId: 1, jobId: 1 }, { unique: true });
