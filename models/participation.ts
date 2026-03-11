import { Model, Schema, model, models, Types } from "mongoose";

export type ParticipationDocument = {
  _id: Types.ObjectId;
  canvasId: Types.ObjectId;
  userId: Types.ObjectId;
  lastVisitedAt: Date;
  lastContributedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const participationSchema = new Schema<ParticipationDocument>(
  {
    canvasId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Canvas",
      index: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
      index: true
    },
    lastVisitedAt: {
      type: Date,
      required: true
    },
    lastContributedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

participationSchema.index({ canvasId: 1, userId: 1 }, { unique: true });

export const ParticipationModel =
  (models.Participation as Model<ParticipationDocument> | undefined) ??
  model<ParticipationDocument>("Participation", participationSchema);
