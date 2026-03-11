import fs from "node:fs/promises";
import path from "node:path";
import { badRequest, notFound } from "@/lib/server/errors";

const STORAGE_ROOT = path.join(process.cwd(), "storage", "assets");
const ALLOWED_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]);

const MIME_TO_EXTENSION: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg"
};

const EXTENSION_TO_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml"
};

function assertSafeFileName(fileName: string) {
  if (!/^[A-Za-z0-9._-]+$/.test(fileName) || fileName.includes("..")) {
    throw badRequest("Asset file name is invalid.");
  }

  const extension = path.extname(fileName).toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw badRequest("Asset file extension is not supported.");
  }

  return fileName;
}

export function getExtensionForMimeType(mimeType: string) {
  const extension = MIME_TO_EXTENSION[mimeType];

  if (!extension) {
    throw badRequest("Unsupported image format. Use PNG, JPEG, WEBP, GIF, or SVG.");
  }

  return extension;
}

export function getContentTypeForFileName(fileName: string) {
  const safeFileName = assertSafeFileName(fileName);
  const extension = path.extname(safeFileName).toLowerCase();

  return EXTENSION_TO_MIME[extension] ?? "application/octet-stream";
}

export async function ensureAssetStorageRoot() {
  await fs.mkdir(STORAGE_ROOT, { recursive: true });
}

export async function writeStoredAsset(fileName: string, bytes: Buffer) {
  const safeFileName = assertSafeFileName(fileName);
  await ensureAssetStorageRoot();
  await fs.writeFile(path.join(STORAGE_ROOT, safeFileName), bytes);
}

export async function readStoredAsset(fileName: string) {
  const safeFileName = assertSafeFileName(fileName);
  const assetPath = path.join(STORAGE_ROOT, safeFileName);

  try {
    const buffer = await fs.readFile(assetPath);

    return {
      buffer,
      contentType: getContentTypeForFileName(safeFileName)
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw notFound("Asset file not found.");
    }

    throw error;
  }
}
