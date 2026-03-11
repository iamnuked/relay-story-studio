import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import { ApiError, badRequest, notFound } from "@/lib/server/errors";
import { toObjectId } from "@/lib/utils/object-id";
import { serializeAsset } from "@/lib/media/assets";
import { getExtensionForMimeType, writeStoredAsset } from "@/lib/media/storage";
import type {
  GenerateImageRequest,
  GenerateImageResponse,
  GenerateImageSource,
  MediaAsset
} from "@/lib/media/types";
import { AssetModel, CanvasModel, NodeModel } from "@/models";

const OPENAI_IMAGE_API_URL = "https://api.openai.com/v1/images/generations";
const DEFAULT_OPENAI_IMAGE_MODEL = "gpt-image-1-mini";
const DEFAULT_OPENAI_IMAGE_SIZE = "1024x1024";
const DEFAULT_OPENAI_IMAGE_QUALITY = "low";
const DEFAULT_OPENAI_IMAGE_OUTPUT_FORMAT = "png";

const OUTPUT_FORMAT_TO_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp"
};

type PreparedImageInput = {
  canvasId: Types.ObjectId;
  createdBy: Types.ObjectId;
  prompt: string;
};

type OpenAiImagesResponse = {
  data?: Array<{
    b64_json?: string;
  }>;
  error?: {
    message?: string;
  };
};

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

function getOpenAiApiKey() {
  return process.env.OPENAI_API_KEY?.trim() ?? "";
}

function resolveImageProvider(): GenerateImageSource {
  const configured = process.env.AI_IMAGE_PROVIDER?.trim().toLowerCase() ?? "auto";
  const hasOpenAiKey = getOpenAiApiKey().length > 0;

  if (configured === "auto") {
    return hasOpenAiKey ? "openai" : "mock";
  }

  if (configured === "mock") {
    return "mock";
  }

  if (configured === "openai") {
    if (!hasOpenAiKey) {
      throw new ApiError(500, "AI_IMAGE_PROVIDER is set to openai but OPENAI_API_KEY is not configured.");
    }

    return "openai";
  }

  throw new ApiError(500, "AI_IMAGE_PROVIDER must be auto, mock, or openai.");
}

function getOpenAiImageConfig() {
  const apiKey = getOpenAiApiKey();

  if (!apiKey) {
    throw new ApiError(500, "OPENAI_API_KEY is not configured.");
  }

  const outputFormat = (process.env.OPENAI_IMAGE_OUTPUT_FORMAT?.trim().toLowerCase() || DEFAULT_OPENAI_IMAGE_OUTPUT_FORMAT);
  const mimeType = OUTPUT_FORMAT_TO_MIME[outputFormat];

  if (!mimeType) {
    throw new ApiError(500, "OPENAI_IMAGE_OUTPUT_FORMAT must be png, jpg, jpeg, or webp.");
  }

  return {
    apiKey,
    model: process.env.OPENAI_IMAGE_MODEL?.trim() || DEFAULT_OPENAI_IMAGE_MODEL,
    size: process.env.OPENAI_IMAGE_SIZE?.trim() || DEFAULT_OPENAI_IMAGE_SIZE,
    quality: process.env.OPENAI_IMAGE_QUALITY?.trim() || DEFAULT_OPENAI_IMAGE_QUALITY,
    outputFormat,
    mimeType
  };
}

async function prepareGeneratedImageInput(userId: string, input: GenerateImageRequest): Promise<PreparedImageInput> {
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

  return {
    canvasId,
    createdBy,
    prompt
  };
}

async function persistGeneratedAsset(input: PreparedImageInput, mimeType: string, bytes: Buffer): Promise<MediaAsset> {
  const assetId = new Types.ObjectId();
  const extension = getExtensionForMimeType(mimeType);
  const fileName = `${assetId.toString()}${extension}`;
  await writeStoredAsset(fileName, bytes);

  const asset = await AssetModel.create({
    _id: assetId,
    canvasId: input.canvasId,
    nodeId: null,
    type: "generated-image",
    url: `/api/assets/file/${fileName}`,
    prompt: input.prompt,
    createdBy: input.createdBy
  });

  return serializeAsset(asset);
}

async function createMockGeneratedAsset(input: PreparedImageInput): Promise<MediaAsset> {
  const svg = buildMockSvg(input.prompt);
  return persistGeneratedAsset(input, "image/svg+xml", Buffer.from(svg, "utf8"));
}

async function readOpenAiError(response: Response) {
  try {
    const payload = (await response.json()) as OpenAiImagesResponse;
    return payload.error?.message ?? "OpenAI image generation failed.";
  } catch {
    return "OpenAI image generation failed.";
  }
}

async function createOpenAiGeneratedAsset(input: PreparedImageInput): Promise<MediaAsset> {
  const config = getOpenAiImageConfig();
  const response = await fetch(OPENAI_IMAGE_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.model,
      prompt: input.prompt,
      size: config.size,
      quality: config.quality,
      output_format: config.outputFormat
    }),
    signal: AbortSignal.timeout(120000)
  });

  if (!response.ok) {
    throw new ApiError(502, await readOpenAiError(response));
  }

  const payload = (await response.json()) as OpenAiImagesResponse;
  const base64Image = payload.data?.[0]?.b64_json;

  if (!base64Image) {
    throw new ApiError(502, "OpenAI image response did not include image data.");
  }

  return persistGeneratedAsset(input, config.mimeType, Buffer.from(base64Image, "base64"));
}

export async function createGeneratedImage(
  userId: string,
  input: GenerateImageRequest
): Promise<GenerateImageResponse> {
  const prepared = await prepareGeneratedImageInput(userId, input);
  const source = resolveImageProvider();
  const asset = source === "openai"
    ? await createOpenAiGeneratedAsset(prepared)
    : await createMockGeneratedAsset(prepared);

  return {
    asset,
    source
  };
}