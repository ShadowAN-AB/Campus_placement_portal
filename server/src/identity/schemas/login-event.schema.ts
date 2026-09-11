import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

@Schema({ timestamps: true })
export class LoginEvent {
  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  email: string;

  @Prop()
  ip?: string;

  @Prop()
  userAgent?: string;
}

export type LoginEventDocument = HydratedDocument<LoginEvent>;
export const LoginEventSchema = SchemaFactory.createForClass(LoginEvent);
