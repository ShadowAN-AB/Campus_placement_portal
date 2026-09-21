import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";
import { RefId } from "../../common/oid";

@Schema({ timestamps: true })
export class Job {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, trim: true })
  company: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: [String], default: [] })
  requiredSkills: string[];

  @Prop({ default: 0 })
  minExperience: number;

  @Prop({ default: 0 })
  minSalary: number;

  @Prop({ default: 0 })
  maxSalary: number;

  @Prop({ default: "active", enum: ["active", "closed"] })
  status: "active" | "closed";

  @Prop({ default: false, index: true })
  approved: boolean;

  @Prop({ default: "", trim: true })
  season: string;

  @Prop({ type: [String], default: [] })
  departments: string[];

  @Prop({ default: 0 })
  minCgpa: number;

  @Prop({ default: 0 })
  graduationYear: number;

  @Prop({ type: RefId, ref: "User", required: true, index: true })
  postedBy: Types.ObjectId;
}

export type JobDocument = HydratedDocument<Job>;
export const JobSchema = SchemaFactory.createForClass(Job);
