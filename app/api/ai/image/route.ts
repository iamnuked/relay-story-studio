import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/server";
import { createMockGeneratedImage } from "@/lib/ai/image";
import { handleRouteError, readJsonBody } from "@/lib/server/api";
import type { GenerateImageRequest, GenerateImageResponse } from "@/lib/media/types";

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await readJsonBody<GenerateImageRequest>(request);
    const asset = await createMockGeneratedImage(session.userId, body);

    return NextResponse.json<GenerateImageResponse>(
      {
        asset,
        source: "mock"
      },
      { status: 201 }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
