import { Schema, Types } from "mongoose";

/** Use on @Prop refs so Mongoose actually casts string ids to ObjectId. */
export const RefId = Schema.Types.ObjectId;

export function oid(id: string | Types.ObjectId) {
  if (id instanceof Types.ObjectId) return id;
  return new Types.ObjectId(id);
}

/** Match both ObjectId and leftover string ids from earlier writes. */
export function idMatch(id: string | Types.ObjectId) {
  const value = String(id);
  if (!Types.ObjectId.isValid(value)) return value;
  return { $in: [oid(value), value] };
}
