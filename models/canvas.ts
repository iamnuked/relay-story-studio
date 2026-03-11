import { Model, Schema, model, models, Types } from "mongoose";

export type CanvasDocument = {
  _id: Types.ObjectId;
  title: string;
  rootNodeId: Types.ObjectId;
  maxUserNodesPerBranch: number;
  creatorId: Types.ObjectId;
  shareKey: string;
  createdAt: Date;
  updatedAt: Date;
};

const canvasSchema = new Schema<CanvasDocument>(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    rootNodeId: {
      type: Schema.Types.ObjectId,
      required: true
    },
    maxUserNodesPerBranch: {
      type: Number,
      required: true,
      min: 1,
      default: 12
    },
    creatorId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User"
    },
    shareKey: {
      type: String,
      required: true,
      unique: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

export const CanvasModel =
  (models.Canvas as Model<CanvasDocument> | undefined) ??
  model<CanvasDocument>("Canvas", canvasSchema);
