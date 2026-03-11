import { Model, Schema, model, models, Types } from "mongoose";

export type UserDocument = {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  nickname: string;
  createdAt: Date;
  updatedAt: Date;
};

const userSchema = new Schema<UserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    nickname: {
      type: String,
      required: true,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

export const UserModel =
  (models.User as Model<UserDocument> | undefined) ?? model<UserDocument>("User", userSchema);
