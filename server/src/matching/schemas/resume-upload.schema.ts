import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";
import { ResumeStatus } from "../../common/types";

@Schema({ timestamps: true })
export class ResumeUpload {
  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  filePath: string;

  @Prop({ default: 1 })
  version: number;

  @Prop({ default: "uploaded", enum: ["uploaded", "parsing", "extracted", "analyzed", "failed"] })
  status: ResumeStatus;

  @Prop()
  error?: string;
}

export type ResumeUploadDocument = HydratedDocument<ResumeUpload>;
export const ResumeUploadSchema = SchemaFactory.createForClass(ResumeUpload);
ResumeUploadSchema.pre("save", async function () {
  if (!this.isNew) return;
  const Model = this.constructor as typeof this extends { constructor: infer C } ? C : never;
  const last = await (this.constructor as any).findOne({ userId: this.userId }).sort({ version: -1 });
  this.version = (last?.version ?? 0) + 1;
  void Model;
});
