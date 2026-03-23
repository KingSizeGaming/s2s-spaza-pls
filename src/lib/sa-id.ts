import { createHash } from "crypto";

export function parseSaIdBirthDate(idNumber: string): Date | null {
  if (!/^[0-9]{13}$/.test(idNumber)) return null;
  const yy = Number(idNumber.slice(0, 2));
  const mm = Number(idNumber.slice(2, 4));
  const dd = Number(idNumber.slice(4, 6));
  if (Number.isNaN(yy) || Number.isNaN(mm) || Number.isNaN(dd)) return null;
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;

  const now = new Date();
  const currentYY = now.getFullYear() % 100;
  const year = yy <= currentYY ? 2000 + yy : 1900 + yy;
  const date = new Date(year, mm - 1, dd);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== mm - 1 ||
    date.getDate() !== dd
  ) {
    return null;
  }
  return date;
}

export function isAtLeastAge(birthDate: Date, minAge: number, now = new Date()): boolean {
  const cutoff = new Date(
    now.getFullYear() - minAge,
    now.getMonth(),
    now.getDate()
  );
  return birthDate <= cutoff;
}

export function hashSaId(idNumber: string): string | null {
  const salt = process.env.SA_ID_HASH_SALT;
  if (!salt) return null;
  return createHash("sha256").update(`${salt}:${idNumber}`).digest("hex");
}
