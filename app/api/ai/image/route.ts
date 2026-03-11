import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/server";
import { createGeneratedImage } from "@/lib/ai/image";
import { handleRouteError, readJsonBody } from "@/lib/server/api";
import type { GenerateImageRequest, GenerateImageResponse } from "@/lib/media/types";

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await readJsonBody<GenerateImageRequest>(request);
    const result = await createGeneratedImage(session.userId, body);

    return NextResponse.json<GenerateImageResponse>(result, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}