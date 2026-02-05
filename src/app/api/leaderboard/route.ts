import { NextResponse } from "next/server";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { entries, users } from "@/db/schema";
import { getCurrentWeekId } from "@/lib/week";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const weekId = searchParams.get("weekId") || getCurrentWeekId();

  const rows = await db
    .select({
      leaderboardId: users.leaderboardId,
      entryCount: sql<number>`count(${entries.id})`,
    })
    .from(entries)
    .innerJoin(users, eq(entries.waNumber, users.waNumber))
    .where(
      and(eq(entries.weekId, weekId), isNotNull(users.leaderboardId))
    )
    .groupBy(users.leaderboardId)
    .orderBy(users.leaderboardId);

  return NextResponse.json({ weekId, leaderboards: rows });
}
