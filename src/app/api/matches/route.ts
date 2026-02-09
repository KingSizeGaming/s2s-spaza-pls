import { NextRequest, NextResponse } from "next/server";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { links, matches } from "@/db/schema";
import { getCurrentWeekId } from "@/lib/week";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const weekIdParam = searchParams.get("weekId");

  const currentWeekId = getCurrentWeekId();
  let weekId = weekIdParam || currentWeekId;
  let linkWeekId: string | null = null;
  if (token) {
    const linkRows = await db
      .select({ weekId: links.weekId })
      .from(links)
      .where(eq(links.token, token))
      .limit(1);
    if (linkRows.length > 0 && linkRows[0].weekId) {
      linkWeekId = linkRows[0].weekId;
      weekId = linkRows[0].weekId;
    }
  }

  const weekCandidates = Array.from(
    new Set(
      [weekIdParam, linkWeekId, currentWeekId]
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value))
    )
  );

  let rows: Array<{
    id: string;
    weekId: string;
    homeTeam: string;
    awayTeam: string;
    kickoffAt: Date;
    homeScore: number | null;
    awayScore: number | null;
  }> = [];
  let resolvedWeekId = weekId;

  for (const candidateWeekId of weekCandidates) {
    const candidateRows = await db
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
      .where(eq(matches.weekId, candidateWeekId))
      .orderBy(asc(matches.kickoffAt));
    if (candidateRows.length > 0) {
      rows = candidateRows;
      resolvedWeekId = candidateWeekId;
      break;
    }
  }

  if (rows.length === 0) {
    const latest = await db
      .select({ weekId: matches.weekId })
      .from(matches)
      .orderBy(desc(matches.kickoffAt))
      .limit(1);
    if (latest.length > 0) {
      resolvedWeekId = latest[0].weekId;
      rows = await db
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
        .where(eq(matches.weekId, resolvedWeekId))
        .orderBy(asc(matches.kickoffAt));
    }
  }

  return NextResponse.json({ weekId: resolvedWeekId, matches: rows });
}
