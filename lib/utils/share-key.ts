import { randomBytes } from "node:crypto";

export function generateShareKey(length = 12) {
  const raw = randomBytes(length)
    .toString("base64url")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();

  return raw.slice(0, length);
}
