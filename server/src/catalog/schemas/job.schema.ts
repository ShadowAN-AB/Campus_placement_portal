import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

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

  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  postedBy: Types.ObjectId;
}

export type JobDocument = HydratedDocument<Job>;
export const JobSchema = SchemaFactory.createForClass(Job);
