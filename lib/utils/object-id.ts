import { Types } from "mongoose";
import { badRequest } from "@/lib/server/errors";

export function isObjectId(value: string) {
  return Types.ObjectId.isValid(value);
}

export function toObjectId(value: string, fieldName: string) {
  if (!isObjectId(value)) {
    throw badRequest(`${fieldName} must be a valid ObjectId string.`);
  }

  return new Types.ObjectId(value);
}
