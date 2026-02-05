function getIsoWeekYearAndWeek(date: Date): { year: number; week: number } {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((+utcDate - +yearStart) / 86400000 + 1) / 7);
  return { year: utcDate.getUTCFullYear(), week };
}

export function getCurrentWeekId(date: Date = new Date()): string {
  const override = process.env.CURRENT_WEEK_ID;
  if (override && override.trim().length > 0) {
    return override.trim();
  }

  const { year, week } = getIsoWeekYearAndWeek(date);
  const weekString = String(week).padStart(2, "0");
  return `${year}-W${weekString}`;
}

if (process.env.NODE_ENV !== "production") {
  const sample = new Date(Date.UTC(2026, 0, 29)); // 2026-01-29
  const id = getCurrentWeekId(sample);
  if (!/^\d{4}-W\d{2}$/.test(id)) {
    throw new Error(`week.ts sanity check failed: ${id}`);
  }
}