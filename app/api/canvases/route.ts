import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/server";
import { createCanvasWithRoot } from "@/lib/services/canvas";
import { handleRouteError, readJsonBody } from "@/lib/server/api";
import type { CreateCanvasRequest, CreateCanvasResponse } from "@/lib/types/api";

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await readJsonBody<CreateCanvasRequest>(request);
    const result = await createCanvasWithRoot(session.userId, body);

    return NextResponse.json<CreateCanvasResponse>(result, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
