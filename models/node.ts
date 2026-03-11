import { Model, Schema, model, models, Types } from "mongoose";
import type { EndingType, NodeKind } from "@/lib/types/domain";

export type NodeDocument = {
  _id: Types.ObjectId;
  canvasId: Types.ObjectId;
  parentNodeId: Types.ObjectId | null;
  ancestorIds: Types.ObjectId[];
  depth: number;
  userNodeCountInPath: number;
  content: string;
  isEnding: boolean;
  endingType: EndingType;
  nodeKind: NodeKind;
  imageAssetIds: Types.ObjectId[];
  position: {
    x: number;
    y: number;
  };
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const nodeSchema = new Schema<NodeDocument>(
  {
    canvasId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Canvas",
      index: true
    },
    parentNodeId: {
      type: Schema.Types.ObjectId,
      default: null,
      ref: "Node"
    },
    ancestorIds: {
      type: [Schema.Types.ObjectId],
      required: true,
      default: []
    },
    depth: {
      type: Number,
      required: true,
      min: 0
    },
    userNodeCountInPath: {
      type: Number,
      required: true,
      min: 1
    },
    content: {
      type: String,
      required: true
    },
    isEnding: {
      type: Boolean,
      required: true,
      default: false
    },
    endingType: {
      type: String,
      default: null
    },
    nodeKind: {
      type: String,
      required: true,
      enum: ["user", "system"],
      default: "user"
    },
    imageAssetIds: {
      type: [Schema.Types.ObjectId],
      required: true,
      default: []
    },
    position: {
      x: {
        type: Number,
        required: true
      },
      y: {
        type: Number,
        required: true
      }
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

export const NodeModel =
  (models.Node as Model<NodeDocument> | undefined) ?? model<NodeDocument>("Node", nodeSchema);
