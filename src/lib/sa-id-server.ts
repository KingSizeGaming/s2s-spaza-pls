import { createHash } from "crypto";

// Creates a salted SHA-256 hash of an SA ID number for safe storage. Requires SA_ID_HASH_SALT env var.
export function hashSaId(idNumber: string): string | null {
  const salt = process.env.SA_ID_HASH_SALT;
  if (!salt) return null;
  return createHash("sha256").update(`${salt}:${idNumber}`).digest("hex");
}
