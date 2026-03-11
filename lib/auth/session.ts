import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextResponse } from "next/server";
import type { AuthSession } from "@/lib/types/auth";

type SessionTokenPayload = {
  userId: string;
  email: string;
  nickname: string;
  exp: number;
};

export const SESSION_COOKIE_NAME = "relay_story_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error("SESSION_SECRET is not configured.");
  }

  return secret;
}

function encodeBase64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(payload: string) {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
}

export function createSession(user: Pick<AuthSession, "userId" | "email" | "nickname">): AuthSession {
  return {
    ...user,
    expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString()
  };
}

export function createSignedSessionToken(session: AuthSession) {
  const payload: SessionTokenPayload = {
    userId: session.userId,
    email: session.email,
    nickname: session.nickname,
    exp: Math.floor(new Date(session.expiresAt).getTime() / 1000)
  };

  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifySignedSessionToken(token: string): AuthSession | null {
  const [encodedPayload, providedSignature] = token.split(".");

  if (!encodedPayload || !providedSignature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);

  if (expectedSignature.length !== providedSignature.length) {
    return null;
  }

  if (
    !timingSafeEqual(
      Buffer.from(expectedSignature, "utf8"),
      Buffer.from(providedSignature, "utf8")
    )
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(encodedPayload)) as SessionTokenPayload;

    if (payload.exp * 1000 <= Date.now()) {
      return null;
    }

    return {
      userId: payload.userId,
      email: payload.email,
      nickname: payload.nickname,
      expiresAt: new Date(payload.exp * 1000).toISOString()
    };
  } catch {
    return null;
  }
}

export function setSessionCookie(response: NextResponse, session: AuthSession) {
  response.cookies.set(SESSION_COOKIE_NAME, createSignedSessionToken(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(session.expiresAt)
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0)
  });
}
