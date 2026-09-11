import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

@Schema({ _id: false })
class Education {
  @Prop()
  degree?: string;
  @Prop()
  school?: string;
  @Prop()
  year?: string;
}

@Schema({ _id: false })
class Project {
  @Prop()
  name?: string;
  @Prop()
  description?: string;
  @Prop([String])
  skills?: string[];
}

@Schema({ timestamps: true })
export class StudentProfile {
  @Prop({ type: Types.ObjectId, ref: "User", unique: true, required: true })
  userId: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  skills: string[];

  @Prop({ default: "", maxlength: 500 })
  bio: string;

  @Prop({ default: 0 })
  expectedSalary: number;

  @Prop({ type: [String], default: [] })
  prefJobTitles: string[];

  @Prop({ default: 0 })
  yearsOfExperience: number;

  @Prop({ type: [Education], default: [] })
  education: Education[];

  @Prop({ type: [Project], default: [] })
  projects: Project[];

  @Prop({ type: [String], default: [] })
  certifications: string[];

  @Prop({ type: Date, default: null })
  lastAnalyzedAt: Date | null;
}

export type StudentProfileDocument = HydratedDocument<StudentProfile>;
export const StudentProfileSchema = SchemaFactory.createForClass(StudentProfile);
