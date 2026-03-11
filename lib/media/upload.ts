import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import { serializeAsset } from "@/lib/media/assets";
import { getExtensionForMimeType, writeStoredAsset } from "@/lib/media/storage";
import type { MediaAsset } from "@/lib/media/types";
import { badRequest, notFound } from "@/lib/server/errors";
import { toObjectId } from "@/lib/utils/object-id";
import { AssetModel, CanvasModel, NodeModel } from "@/models";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export type CreateUploadedAssetInput = {
  canvasId: string;
  baseNodeId: string;
  fileName: string;
  mimeType: string;
  bytes: Buffer;
};

export async function createUploadedAsset(userId: string, input: CreateUploadedAssetInput): Promise<MediaAsset> {
  await connectToDatabase();

  const canvasId = toObjectId(input.canvasId, "canvasId");
  const baseNodeId = toObjectId(input.baseNodeId, "baseNodeId");
  const createdBy = toObjectId(userId, "userId");

  if (input.bytes.length === 0) {
    throw badRequest("Uploaded file is empty.");
  }

  if (input.bytes.length > MAX_UPLOAD_BYTES) {
    throw badRequest("Uploaded file must be 5 MB or smaller.");
  }

  const [canvas, baseNode] = await Promise.all([
    CanvasModel.findById(canvasId),
    NodeModel.findById(baseNodeId)
  ]);

  if (!canvas) {
    throw notFound("Canvas not found.");
  }

  if (!baseNode || baseNode.canvasId.toString() !== canvasId.toString()) {
    throw notFound("Base node not found inside this canvas.");
  }

  const assetId = new Types.ObjectId();
  const extension = getExtensionForMimeType(input.mimeType);
  const fileName = `${assetId.toString()}${extension}`;
  await writeStoredAsset(fileName, input.bytes);

  const asset = await AssetModel.create({
    _id: assetId,
    canvasId,
    nodeId: null,
    type: "uploaded-image",
    url: `/api/assets/file/${fileName}`,
    prompt: null,
    createdBy
  });

  return serializeAsset(asset);
}

