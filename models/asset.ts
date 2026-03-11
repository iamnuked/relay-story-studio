import { Model, Schema, model, models, Types } from "mongoose";

export type AssetDocument = {
  _id: Types.ObjectId;
  canvasId: Types.ObjectId;
  nodeId: Types.ObjectId | null;
  type: string;
  url: string;
  prompt: string | null;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const assetSchema = new Schema<AssetDocument>(
  {
    canvasId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Canvas"
    },
    nodeId: {
      type: Schema.Types.ObjectId,
      default: null,
      ref: "Node"
    },
    type: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    prompt: {
      type: String,
      default: null
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User"
    }
  },
  {
    timestamps: true
  }
);

export const AssetModel =
  (models.Asset as Model<AssetDocument> | undefined) ?? model<AssetDocument>("Asset", assetSchema);
