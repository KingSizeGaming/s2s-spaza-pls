import { randomBytes } from "crypto";

// Converts a Buffer to a URL-safe base64 string with no padding characters.
function base64Url(input: Buffer): string {
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

// Generates a URL-safe random token from 9 random bytes. Accepts an optional prefix (e.g. "r", "p").
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
