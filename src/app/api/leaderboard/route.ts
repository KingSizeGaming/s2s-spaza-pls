import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { entries, links, users } from "@/db/schema";
import { getCurrentWeekId } from "@/lib/week";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const weekId = searchParams.get("weekId") || getCurrentWeekId();
  const token = searchParams.get("token");

  if (token) {
    const linkRows = await db
      .select({ waNumber: links.waNumber, type: links.type })
      .from(links)
      .where(eq(links.token, token))
      .limit(1);

    if (linkRows.length === 0 || linkRows[0].type !== "PREDICTION") {
      return NextResponse.json(
        { error: "Invalid token." },
        { status: 403 }
      );
    }

    const userRows = await db
      .select({ leaderboardId: users.leaderboardId })
      .from(users)
      .where(eq(users.waNumber, linkRows[0].waNumber))
      .limit(1);

    if (userRows.length === 0 || !userRows[0].leaderboardId) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const rows = await db
      .select({
        leaderboardId: users.leaderboardId,
        entryCount: sql<number>`count(${entries.id})`,
      })
      .from(entries)
      .innerJoin(users, eq(entries.waNumber, users.waNumber))
      .where(
        and(
          eq(entries.weekId, weekId),
          eq(users.leaderboardId, userRows[0].leaderboardId)
        )
      )
      .groupBy(users.leaderboardId);

    return NextResponse.json({ weekId, leaderboards: rows });
  }

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
