import { NextResponse } from "next/server";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { signupUser } from "@/lib/services/auth";
import { handleRouteError, readJsonBody } from "@/lib/server/api";
import type { AuthResponse, SignupRequest } from "@/lib/types/api";
import { serializeUser } from "@/lib/utils/serializers";

export async function POST(request: Request) {
  try {
    const body = await readJsonBody<SignupRequest>(request);
    const user = await signupUser(body);
    const session = createSession({
      userId: user._id.toString(),
      email: user.email,
      nickname: user.nickname
    });

    const response = NextResponse.json<AuthResponse>(
      {
        user: serializeUser(user),
        session
      },
      { status: 201 }
    );

    setSessionCookie(response, session);

    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
