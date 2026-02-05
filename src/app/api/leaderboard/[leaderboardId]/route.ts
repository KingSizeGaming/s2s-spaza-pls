import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { entries, users } from "@/db/schema";
import { getCurrentWeekId } from "@/lib/week";

function summarizePicks(picks: unknown): string {
  if (Array.isArray(picks)) {
    return picks.join(",");
  }
  if (picks && typeof picks === "object") {
    return JSON.stringify(picks);
  }
  return String(picks ?? "");
}

export async function GET(
  request: Request,
  { params }: { params: { leaderboardId: string } }
) {
  const { searchParams } = new URL(request.url);
  const weekId = searchParams.get("weekId") || getCurrentWeekId();
  const leaderboardId = params.leaderboardId.toUpperCase();

  const rows = await db
    .select({
      submittedAt: entries.submittedAt,
      picks: entries.picks,
    })
    .from(entries)
    .innerJoin(users, eq(entries.waNumber, users.waNumber))
    .where(
      and(eq(entries.weekId, weekId), eq(users.leaderboardId, leaderboardId))
    )
    .orderBy(sql`${entries.submittedAt} desc`);

  const entriesWithSummary = rows.map((row) => ({
    submittedAt: row.submittedAt,
    picks: row.picks,
    summary: summarizePicks(row.picks),
  }));

  return NextResponse.json({
    weekId,
    leaderboardId,
    entries: entriesWithSummary,
  });
}
