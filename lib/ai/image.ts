import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import { badRequest, notFound } from "@/lib/server/errors";
import { toObjectId } from "@/lib/utils/object-id";
import { serializeAsset } from "@/lib/media/assets";
import { getExtensionForMimeType, writeStoredAsset } from "@/lib/media/storage";
import type { GenerateImageRequest, MediaAsset } from "@/lib/media/types";
import { AssetModel, CanvasModel, NodeModel } from "@/models";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function makeColorPair(seed: number) {
  const baseHue = seed % 360;
  const accentHue = (baseHue + 48) % 360;

  return {
    base: `hsl(${baseHue} 62% 46%)`,
    accent: `hsl(${accentHue} 72% 62%)`,
    shadow: `hsl(${(baseHue + 180) % 360} 44% 18%)`
  };
}

function hashPrompt(prompt: string) {
  let hash = 0;

  for (const char of prompt) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return hash;
}

function buildMockSvg(prompt: string) {
  const safePrompt = prompt.trim().slice(0, 120) || "Untitled scene";
  const seed = hashPrompt(safePrompt);
  const palette = makeColorPair(seed);
  const lines = safePrompt.match(/.{1,26}(?:\s|$)/g)?.map((line) => line.trim()).filter(Boolean) ?? [safePrompt];

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900" fill="none">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${palette.base}" />
      <stop offset="100%" stop-color="${palette.accent}" />
    </linearGradient>
    <filter id="blur">
      <feGaussianBlur stdDeviation="48" />
    </filter>
  </defs>
  <rect width="1200" height="900" fill="url(#bg)" />
  <circle cx="210" cy="180" r="150" fill="rgba(255,255,255,0.26)" filter="url(#blur)" />
  <circle cx="960" cy="260" r="180" fill="rgba(255,255,255,0.18)" filter="url(#blur)" />
  <circle cx="860" cy="700" r="220" fill="rgba(18, 22, 28, 0.22)" filter="url(#blur)" />
  <path d="M120 740C240 560 420 530 560 620C680 698 840 696 1080 520V900H120Z" fill="rgba(20, 18, 18, 0.22)" />
  <rect x="86" y="84" width="1028" height="732" rx="44" stroke="rgba(255,255,255,0.34)" />
  <text x="120" y="170" fill="white" font-size="32" font-family="Georgia, serif" opacity="0.82">Relay Story Studio</text>
  <text x="120" y="244" fill="${palette.shadow}" font-size="78" font-family="Georgia, serif" font-weight="700">AI image draft</text>
  ${lines
    .slice(0, 4)
    .map((line, index) => `<text x="126" y="${344 + index * 58}" fill="white" font-size="40" font-family="Georgia, serif">${escapeXml(line)}</text>`)
    .join("\n  ")}
  <text x="120" y="778" fill="rgba(255,255,255,0.88)" font-size="24" font-family="Georgia, serif">Generated locally as a mock AI preview for the current branch.</text>
</svg>`.trim();
}

export async function createMockGeneratedImage(userId: string, input: GenerateImageRequest): Promise<MediaAsset> {
  await connectToDatabase();

  const canvasId = toObjectId(input.canvasId, "canvasId");
  const baseNodeId = toObjectId(input.baseNodeId, "baseNodeId");
  const createdBy = toObjectId(userId, "userId");
  const prompt = input.prompt.trim();

  if (!prompt) {
    throw badRequest("prompt is required.");
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
  const extension = getExtensionForMimeType("image/svg+xml");
  const fileName = `${assetId.toString()}${extension}`;
  const svg = buildMockSvg(prompt);
  await writeStoredAsset(fileName, Buffer.from(svg, "utf8"));

  const asset = await AssetModel.create({
    _id: assetId,
    canvasId,
    nodeId: null,
    type: "generated-image",
    url: `/api/assets/file/${fileName}`,
    prompt,
    createdBy
  });

  return serializeAsset(asset);
}
