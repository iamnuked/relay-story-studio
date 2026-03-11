import { NextResponse } from "next/server";
import { readStoredAsset } from "@/lib/media/storage";
import { handleRouteError } from "@/lib/server/api";

type RouteContext = {
  params: Promise<{
    fileName: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  try {
    const { fileName } = await context.params;
    const file = await readStoredAsset(fileName);

    return new NextResponse(file.buffer, {
      headers: {
        "Content-Type": file.contentType,
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
