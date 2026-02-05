import { NextRequest, NextResponse } from "next/server";
import { eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { links, matches } from "@/db/schema";
import { getCurrentWeekId } from "@/lib/week";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const weekIdParam = searchParams.get("weekId");

  let weekId = weekIdParam || getCurrentWeekId();
  if (token) {
    const linkRows = await db
      .select({ weekId: links.weekId })
      .from(links)
      .where(eq(links.token, token))
      .limit(1);
    if (linkRows.length > 0 && linkRows[0].weekId) {
      weekId = linkRows[0].weekId;
    }
  }

  const rows = await db
    .select({
      id: matches.id,
      weekId: matches.weekId,
      homeTeam: matches.homeTeam,
      awayTeam: matches.awayTeam,
      kickoffAt: matches.kickoffAt,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
    })
    .from(matches)
    .where(eq(matches.weekId, weekId))
    .orderBy(asc(matches.kickoffAt));

  return NextResponse.json({ weekId, matches: rows });
}
