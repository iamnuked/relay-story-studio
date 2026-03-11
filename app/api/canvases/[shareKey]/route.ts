import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { getCanvasDetailByShareKey } from "@/lib/services/canvas";
import { handleRouteError } from "@/lib/server/api";
import type { CanvasDetailResponse } from "@/lib/types/api";

type RouteContext = {
  params: Promise<{
    shareKey: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  try {
    const { shareKey } = await context.params;
    const viewer = await getSession();
    const result = await getCanvasDetailByShareKey(shareKey, viewer);

    return NextResponse.json<CanvasDetailResponse>(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
