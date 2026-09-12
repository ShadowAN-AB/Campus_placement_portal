import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";
import { RefId } from "../../common/oid";

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: RefId, ref: "User", required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  body: string;

  @Prop()
  link?: string;

  @Prop({ default: false })
  read: boolean;

  @Prop({ type: Object, default: {} })
  meta: Record<string, unknown>;
}

export type NotificationDocument = HydratedDocument<Notification>;
export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
