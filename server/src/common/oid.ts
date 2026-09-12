import { Types } from "mongoose";

export function oid(id: string | Types.ObjectId) {
  if (id instanceof Types.ObjectId) return id;
  return new Types.ObjectId(id);
}
