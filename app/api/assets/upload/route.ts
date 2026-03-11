import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/server";
import { createUploadedAsset } from "@/lib/media/upload";
import { badRequest } from "@/lib/server/errors";
import { handleRouteError } from "@/lib/server/api";
import type { UploadAssetResponse } from "@/lib/media/types";

function readStringField(formData: FormData, name: string) {
  const value = formData.get(name);

  if (typeof value !== "string" || !value.trim()) {
    throw badRequest(`${name} is required.`);
  }

  return value.trim();
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw badRequest("file is required.");
    }

    const asset = await createUploadedAsset(session.userId, {
      canvasId: readStringField(formData, "canvasId"),
      baseNodeId: readStringField(formData, "baseNodeId"),
      fileName: file.name,
      mimeType: file.type,
      bytes: Buffer.from(await file.arrayBuffer())
    });

    return NextResponse.json<UploadAssetResponse>({ asset }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

