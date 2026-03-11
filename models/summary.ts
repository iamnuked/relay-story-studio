import { Model, Schema, model, models, Types } from "mongoose";

export type SummaryDocument = {
  _id: Types.ObjectId;
  canvasId: Types.ObjectId;
  baseNodeId: Types.ObjectId;
  summaryText: string;
  sourceNodeIds: Types.ObjectId[];
  estimatedTokenCount: number;
  createdAt: Date;
  updatedAt: Date;
};

const summarySchema = new Schema<SummaryDocument>(
  {
    canvasId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Canvas"
    },
    baseNodeId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Node"
    },
    summaryText: {
      type: String,
      required: true
    },
    sourceNodeIds: {
      type: [Schema.Types.ObjectId],
      required: true,
      default: []
    },
    estimatedTokenCount: {
      type: Number,
      required: true,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

export const SummaryModel =
  (models.Summary as Model<SummaryDocument> | undefined) ??
  model<SummaryDocument>("Summary", summarySchema);
