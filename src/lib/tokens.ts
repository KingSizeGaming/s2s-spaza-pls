import { randomBytes } from "crypto";

function base64Url(input: Buffer): string {
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function generateToken(prefix?: string): string {
  const token = base64Url(randomBytes(9));
  return prefix ? `${prefix}_${token}` : token;
}

if (process.env.NODE_ENV !== "production") {
  const token = generateToken();
  if (!/^[A-Za-z0-9_-]{12}$/.test(token)) {
    throw new Error(`tokens.ts sanity check failed: ${token}`);
  }
}