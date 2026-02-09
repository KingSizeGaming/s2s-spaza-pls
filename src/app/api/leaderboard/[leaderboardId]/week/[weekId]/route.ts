import { NextRequest, NextResponse } from "next/server";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { entries, entryPicks, links, matches, users } from "@/db/schema";

type Pick = "H" | "D" | "A";

export async function GET(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ leaderboardId: string; weekId: string }> }
) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const { leaderboardId, weekId } = await params;
  const normalizedLeaderboardId = leaderboardId.toUpperCase();

  if (!token) {
    return NextResponse.json({ error: "Missing token." }, { status: 401 });
  }

  const linkRows = await db
    .select({ waNumber: links.waNumber, type: links.type })
    .from(links)
    .where(eq(links.token, token))
    .limit(1);

  if (linkRows.length === 0 || linkRows[0].type !== "PREDICTION") {
    return NextResponse.json({ error: "Invalid token." }, { status: 403 });
  }

  const userRows = await db
    .select({ leaderboardId: users.leaderboardId })
    .from(users)
    .where(
      sql`regexp_replace(${users.waNumber}, '[^0-9]', '', 'g') = ${linkRows[0].waNumber}`
    )
    .limit(1);

  if (userRows.length === 0 || !userRows[0].leaderboardId) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (userRows[0].leaderboardId !== normalizedLeaderboardId) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const entryRows = await db
    .select({
      id: entries.id,
      submittedAt: entries.submittedAt,
    })
    .from(entries)
    .innerJoin(users, eq(entries.waNumber, users.waNumber))
    .where(
      and(eq(users.leaderboardId, normalizedLeaderboardId), eq(entries.weekId, weekId))
    )
    .orderBy(desc(entries.submittedAt))
    .limit(1);

  if (entryRows.length === 0) {
    return NextResponse.json({ error: "No entries found for this week." }, { status: 404 });
  }

  const latestEntry = entryRows[0];
  const matchRows = await db
    .select({
      id: matches.id,
      homeTeam: matches.homeTeam,
      awayTeam: matches.awayTeam,
      kickoffAt: matches.kickoffAt,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
    })
    .from(matches)
    .where(eq(matches.weekId, weekId))
    .orderBy(asc(matches.kickoffAt));

  const pickRows = await db
    .select({
      matchId: entryPicks.matchId,
      pick: entryPicks.pick,
    })
    .from(entryPicks)
    .where(eq(entryPicks.entryId, latestEntry.id));

  const pickByMatchId = new Map<string, Pick>();
  for (const row of pickRows) {
    if (row.pick === "H" || row.pick === "D" || row.pick === "A") {
      pickByMatchId.set(row.matchId, row.pick);
    }
  }

  return NextResponse.json({
    leaderboardId: normalizedLeaderboardId,
    weekId,
    submittedAt: latestEntry.submittedAt,
    matches: matchRows.map((match) => ({
      id: match.id,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      kickoffAt: match.kickoffAt,
      pick: pickByMatchId.get(match.id) ?? null,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      isFinished: match.homeScore !== null && match.awayScore !== null,
    })),
  });
}

