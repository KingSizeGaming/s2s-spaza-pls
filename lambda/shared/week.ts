/**
 * Computes the ISO 8601 week ID (YYYY-Www) for a given date.
 *
 * @param date - The date to compute the week for
 * @returns ISO week string, e.g. "2026-W18"
 *
 * @example
 * ```typescript
 * isoWeekId(new Date("2026-04-28")) // "2026-W18"
 * ```
 */
function isoWeekId(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

/**
 * Returns the current ISO week ID, respecting the CURRENT_WEEK_ID env override
 * used for testing.
 *
 * @example
 * ```typescript
 * getCurrentWeekId() // "2026-W18"
 * ```
 */
export function getCurrentWeekId(): string {
  if (process.env.CURRENT_WEEK_ID) return process.env.CURRENT_WEEK_ID;
  return isoWeekId(new Date());
}

/**
 * Returns the ISO week ID for the week immediately before the current one.
 * Used by match-scorer and prize-draw which run on Monday mornings — by then
 * the ISO week has rolled over, so "current" is already the new week.
 *
 * @example
 * ```typescript
 * // Called on Monday 2026-04-28 (start of W18)
 * getPreviousWeekId() // "2026-W17"
 * ```
 */
export function getPreviousWeekId(): string {
  const prev = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return isoWeekId(prev);
}
