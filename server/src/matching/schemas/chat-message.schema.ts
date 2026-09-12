import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";
import { RefId } from "../../common/oid";

@Schema({ timestamps: true })
export class ChatMessage {
  @Prop({ type: RefId, ref: "User", required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: ["user", "assistant"] })
  role: "user" | "assistant";

  @Prop({ required: true })
  text: string;

  @Prop()
  fromContext?: boolean;

  @Prop()
  confidence?: number;
}

export type ChatMessageDocument = HydratedDocument<ChatMessage>;
export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);
ChatMessageSchema.index({ userId: 1, createdAt: 1 });
