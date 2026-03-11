import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/server";
import { createNode } from "@/lib/services/canvas";
import { handleRouteError, readJsonBody } from "@/lib/server/api";
import type { CreateNodeRequest, CreateNodeResponse } from "@/lib/types/api";

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await readJsonBody<CreateNodeRequest>(request);
    const result = await createNode(session.userId, body);

    return NextResponse.json<CreateNodeResponse>(result, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
