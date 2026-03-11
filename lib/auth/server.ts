import { cookies } from "next/headers";
import { unauthorized } from "@/lib/server/errors";
import { SESSION_COOKIE_NAME, verifySignedSessionToken } from "@/lib/auth/session";

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifySignedSessionToken(token);
}

export async function requireSession() {
  const session = await getSession();

  if (!session) {
    throw unauthorized();
  }

  return session;
}
