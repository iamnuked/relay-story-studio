import { NextResponse } from "next/server";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { loginUser } from "@/lib/services/auth";
import { handleRouteError, readJsonBody } from "@/lib/server/api";
import type { AuthResponse, LoginRequest } from "@/lib/types/api";
import { serializeUser } from "@/lib/utils/serializers";

export async function POST(request: Request) {
  try {
    const body = await readJsonBody<LoginRequest>(request);
    const user = await loginUser(body);
    const session = createSession({
      userId: user._id.toString(),
      email: user.email,
      nickname: user.nickname
    });

    const response = NextResponse.json<AuthResponse>({
      user: serializeUser(user),
      session
    });

    setSessionCookie(response, session);

    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
