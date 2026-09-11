import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

@Schema({ _id: false })
class Factors {
  @Prop() skills: number;
  @Prop() experience: number;
  @Prop() salary: number;
  @Prop() education: number;
  @Prop() projects: number;
}

@Schema({ _id: false })
class JobFit {
  @Prop({ type: Types.ObjectId })
  jobId: Types.ObjectId;
  @Prop()
  title: string;
  @Prop()
  company: string;
  @Prop()
  score: number;
  @Prop({ type: [String], default: [] })
  matchedSkills: string[];
  @Prop({ type: [String], default: [] })
  missingSkills: string[];
  @Prop({ type: Factors })
  factors?: Factors;
}

@Schema({ timestamps: true })
export class ResumeAnalysis {
  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "ResumeUpload", required: true })
  resumeId: Types.ObjectId;

  @Prop({ type: Object, default: {} })
  extractedData: Record<string, unknown>;

  @Prop({ type: [JobFit], default: [] })
  jobFitScores: JobFit[];

  @Prop({ type: [JobFit], default: [] })
  companyFitScores: JobFit[];
}

export type ResumeAnalysisDocument = HydratedDocument<ResumeAnalysis>;
export const ResumeAnalysisSchema = SchemaFactory.createForClass(ResumeAnalysis);
ResumeAnalysisSchema.index({ userId: 1, resumeId: 1 }, { unique: true });
