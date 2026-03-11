import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/server";
import { getSummaryForBranch } from "@/lib/ai/summary";
import { handleRouteError, readJsonBody } from "@/lib/server/api";
import type { SummaryRequest, SummaryResponse } from "@/lib/ai/types";

export async function POST(request: Request) {
  try {
    await requireSession();
    const body = await readJsonBody<SummaryRequest>(request);
    const result = await getSummaryForBranch(body);

    return NextResponse.json<SummaryResponse>(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
