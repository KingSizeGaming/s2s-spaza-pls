import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { links, users } from "@/db/schema";
import { generateToken } from "@/lib/tokens";
import { getCurrentWeekId } from "@/lib/week";

function getBaseUrl(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured && configured.trim().length > 0) {
    return configured.trim();
  }

  const host = request.headers.get("host") ?? "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

function getIsoWeekEndUtc(date: Date): Date {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + (7 - day));
  utc.setUTCHours(23, 59, 59, 999);
  return utc;
}

function getIsoWeekYearAndWeek(date: Date): { year: number; week: number } {
  const utcDate = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((+utcDate - +yearStart) / 86400000 + 1) / 7);
  return { year: utcDate.getUTCFullYear(), week };
}

function toWeekId(date: Date): string {
  const { year, week } = getIsoWeekYearAndWeek(date);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

function parseWeekId(weekId: string): { year: number; week: number } | null {
  const match = weekId.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const week = Number(match[2]);
  if (!Number.isInteger(year) || !Number.isInteger(week)) return null;
  if (week < 1 || week > 53) return null;
  return { year, week };
}

function isoWeekStartUtc(year: number, week: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - (jan4Day - 1));
  const target = new Date(week1Monday);
  target.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
  return target;
}

function incrementWeekId(weekId: string): string {
  const parsed = parseWeekId(weekId);
  if (!parsed) return toWeekId(new Date(Date.now() + 7 * 86400000));
  const start = isoWeekStartUtc(parsed.year, parsed.week);
  start.setUTCDate(start.getUTCDate() + 7);
  return toWeekId(start);
}

export async function POST(request: NextRequest) {
  const currentWeekId = getCurrentWeekId();
  const baseUrl = getBaseUrl(request);
  const now = new Date();
  const latestPredictionWeek = await db
    .select({ weekId: links.weekId })
    .from(links)
    .where(and(eq(links.type, "PREDICTION"), sql`${links.weekId} is not null`))
    .orderBy(desc(links.weekId))
    .limit(1);

  const baseWeekId =
    latestPredictionWeek.length > 0 &&
    latestPredictionWeek[0].weekId &&
    latestPredictionWeek[0].weekId > currentWeekId
      ? latestPredictionWeek[0].weekId
      : currentWeekId;
  const weekId = incrementWeekId(baseWeekId);
  const targetWeekStart = parseWeekId(weekId);
  const expiresAt = targetWeekStart
    ? getIsoWeekEndUtc(isoWeekStartUtc(targetWeekStart.year, targetWeekStart.week))
    : getIsoWeekEndUtc(now);

  const activeUsers = await db
    .select({ waNumber: users.waNumber })
    .from(users)
    .where(eq(users.state, "ACTIVE"));

  if (activeUsers.length === 0) {
    return NextResponse.json({
      ok: true,
      weekId,
      previousWeekId: baseWeekId,
      created: 0,
      expiredPreviousLinks: 0,
      broadcasts: [],
    });
  }

  const broadcasts: Array<{
    waNumber: string;
    predictionUrl: string;
    message: string;
  }> = [];

  const result = await db.transaction(async (tx) => {
    const expiredPreviousLinks = await tx
      .update(links)
      .set({ status: "EXPIRED", updatedAt: now })
      .where(
        and(
          eq(links.type, "PREDICTION"),
          eq(links.status, "VALID"),
          ne(links.weekId, weekId)
        )
      )
      .returning({ id: links.id });

    await tx
      .delete(links)
      .where(and(eq(links.type, "PREDICTION"), eq(links.weekId, weekId)));

    for (const user of activeUsers) {
      const token = generateToken("pred");
      await tx.insert(links).values({
        token,
        type: "PREDICTION",
        waNumber: user.waNumber,
        weekId,
        status: "VALID",
        expiresAt,
      });

      const predictionUrl = `${baseUrl}/predict/${token}`;
      const message = [
        `PSL Weekly Predictions are live (${weekId}).`,
        "Submit before kickoff:",
        predictionUrl,
        "Want more entries? Spend R100+ and send your voucher code here.",
      ].join("\n");

      broadcasts.push({
        waNumber: user.waNumber,
        predictionUrl,
        message,
      });
    }

    return {
      expiredPreviousLinks: expiredPreviousLinks.length,
      created: activeUsers.length,
    };
  });

  return NextResponse.json({
    ok: true,
    weekId,
    previousWeekId: baseWeekId,
    created: result.created,
    expiredPreviousLinks: result.expiredPreviousLinks,
    broadcasts,
  });
}
