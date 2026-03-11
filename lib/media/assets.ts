import type { AssetDocument } from "@/models";
import type { MediaAsset } from "@/lib/media/types";

export function serializeAsset(asset: AssetDocument): MediaAsset {
  return {
    id: asset._id.toString(),
    canvasId: asset.canvasId.toString(),
    nodeId: asset.nodeId ? asset.nodeId.toString() : null,
    type: asset.type as MediaAsset["type"],
    url: asset.url,
    prompt: asset.prompt,
    createdBy: asset.createdBy.toString(),
    createdAt: asset.createdAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString()
  };
}

export async function getAssetsByIds(assetIds: string[]) {
  if (assetIds.length === 0) {
    return [];
  }

  const { connectToDatabase } = await import("@/lib/db/mongoose");
  const { AssetModel } = await import("@/models");

  await connectToDatabase();

  const assets = await AssetModel.find({
    _id: {
      $in: assetIds
    }
  });

  const serializedAssets = assets.map(serializeAsset);
  const assetMap = new Map(serializedAssets.map((asset) => [asset.id, asset]));

  return assetIds.flatMap((assetId) => {
    const asset = assetMap.get(assetId);
    return asset ? [asset] : [];
  });
}

