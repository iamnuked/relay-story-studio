import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/server";
import { listParticipatedCanvases } from "@/lib/services/canvas";
import { handleRouteError } from "@/lib/server/api";
import type { CanvasesMeResponse } from "@/lib/types/api";

export async function GET() {
  try {
    const session = await requireSession();
    const canvases = await listParticipatedCanvases(session.userId);

    return NextResponse.json<CanvasesMeResponse>({
      viewer: session,
      canvases
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
