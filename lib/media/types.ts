export type MediaAssetType = "uploaded-image" | "generated-image";

export type MediaAsset = {
  id: string;
  canvasId: string;
  nodeId: string | null;
  type: MediaAssetType;
  url: string;
  prompt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type UploadAssetResponse = {
  asset: MediaAsset;
};

export type GenerateImageRequest = {
  canvasId: string;
  baseNodeId: string;
  prompt: string;
};

export type GenerateImageSource = "mock" | "openai";

export type GenerateImageResponse = {
  asset: MediaAsset;
  source: GenerateImageSource;
};