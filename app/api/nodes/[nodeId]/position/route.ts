import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/server";
import { updateNodePosition } from "@/lib/services/canvas";
import { handleRouteError, readJsonBody } from "@/lib/server/api";
import type { UpdateNodePositionRequest, UpdateNodePositionResponse } from "@/lib/types/api";

type RouteContext = {
  params: Promise<{
    nodeId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requireSession();
    const { nodeId } = await context.params;
    const body = await readJsonBody<UpdateNodePositionRequest>(request);
    const result = await updateNodePosition(session.userId, nodeId, body);

    return NextResponse.json<UpdateNodePositionResponse>(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
