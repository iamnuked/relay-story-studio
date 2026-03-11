import { Model, Schema, model, models, Types } from "mongoose";

export type DraftDocument = {
  _id: Types.ObjectId;
  canvasId: Types.ObjectId;
  parentNodeId: Types.ObjectId;
  userId: Types.ObjectId;
  content: string;
  selectedImageIds: Types.ObjectId[];
  isEndingDraft: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const draftSchema = new Schema<DraftDocument>(
  {
    canvasId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Canvas"
    },
    parentNodeId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Node"
    },
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User"
    },
    content: {
      type: String,
      required: true,
      default: ""
    },
    selectedImageIds: {
      type: [Schema.Types.ObjectId],
      required: true,
      default: []
    },
    isEndingDraft: {
      type: Boolean,
      required: true,
      default: false
    }
  },
  {
    timestamps: true
  }
);

draftSchema.index({ canvasId: 1, parentNodeId: 1, userId: 1 }, { unique: true });

export const DraftModel =
  (models.Draft as Model<DraftDocument> | undefined) ?? model<DraftDocument>("Draft", draftSchema);
