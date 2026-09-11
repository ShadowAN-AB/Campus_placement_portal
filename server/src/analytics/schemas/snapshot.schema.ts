import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

@Schema({ timestamps: true })
export class AnalyticsSnapshot {
  @Prop({ required: true, unique: true })
  key: string;

  @Prop({ type: Object, required: true })
  data: Record<string, unknown>;

  @Prop({ default: Date.now })
  computedAt: Date;
}

export type AnalyticsSnapshotDocument = HydratedDocument<AnalyticsSnapshot>;
export const AnalyticsSnapshotSchema = SchemaFactory.createForClass(AnalyticsSnapshot);
