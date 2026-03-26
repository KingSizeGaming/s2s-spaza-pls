// Returns the ISO 8601 week year and week number for a given UTC date.
export function getIsoWeekYearAndWeek(date: Date): { year: number; week: number } {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((+utcDate - +yearStart) / 86400000 + 1) / 7);
  return { year: utcDate.getUTCFullYear(), week };
}

// Formats a date as a YYYY-Www week ID string (e.g. "2026-W05").
export function toWeekId(date: Date): string {
  const { year, week } = getIsoWeekYearAndWeek(date);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

// Parses a YYYY-Www string into { year, week }. Returns null if the format is invalid.
export function parseWeekId(weekId: string): { year: number; week: number } | null {
  const match = weekId.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const week = Number(match[2]);
  if (!Number.isInteger(year) || !Number.isInteger(week)) return null;
  if (week < 1 || week > 53) return null;
  return { year, week };
}

// Returns the Monday UTC midnight that starts the given ISO week.
export function isoWeekStartUtc(year: number, week: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - (jan4Day - 1));
  const target = new Date(week1Monday);
  target.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
  return target;
}

// Returns Sunday 23:59:59.999 UTC — the final moment of the ISO week containing the given date.
export function getIsoWeekEndUtc(date: Date): Date {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + (7 - day));
  utc.setUTCHours(23, 59, 59, 999);
  return utc;
}

// Advances a YYYY-Www week ID string by exactly one week.
export function incrementWeekId(weekId: string): string {
  const parsed = parseWeekId(weekId);
  if (!parsed) return toWeekId(new Date(Date.now() + 7 * 86400000));
  const start = isoWeekStartUtc(parsed.year, parsed.week);
  start.setUTCDate(start.getUTCDate() + 7);
  return toWeekId(start);
}

// Returns today's real ISO week ID, ignoring any CURRENT_WEEK_ID env override.
export function getRealCurrentWeekId(date: Date = new Date()): string {
  return toWeekId(date);
}

// Returns the active week ID. Respects the CURRENT_WEEK_ID env var to allow testing with a fixed week.
export function getCurrentWeekId(date: Date = new Date()): string {
  const override = process.env.CURRENT_WEEK_ID;
  if (override && override.trim().length > 0) {
    return override.trim();
  }
  return toWeekId(date);
}

if (process.env.NODE_ENV !== "production") {
  const sample = new Date(Date.UTC(2026, 0, 29)); // 2026-01-29
  const id = getCurrentWeekId(sample);
  if (!/^\d{4}-W\d{2}$/.test(id)) {
    throw new Error(`week.ts sanity check failed: ${id}`);
  }
}
