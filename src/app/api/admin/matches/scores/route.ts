import { NextRequest, NextResponse } from "next/server";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { entries, entryPicks, matches } from "@/db/schema";
import {
  countCorrectPicks,
  outcomeFromScores,
  pointsForCorrectPicks,
} from "@/lib/scoring";
import type { Pick } from "@/lib/scoring";

type ScoreInput = {
  id: string;
  homeScore: number | null;
  awayScore: number | null;
};

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const items = Array.isArray(body?.scores) ? body.scores : null;

  if (!items || items.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Missing scores array." },
      { status: 400 }
    );
  }

  const rows: ScoreInput[] = [];
  for (const item of items) {
    const id = String(item?.id ?? "").trim();
    const homeScore =
      item?.homeScore === null || item?.homeScore === undefined
        ? null
        : Number(item.homeScore);
    const awayScore =
      item?.awayScore === null || item?.awayScore === undefined
        ? null
        : Number(item.awayScore);

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Each score needs id." },
        { status: 400 }
      );
    }
    if ((homeScore !== null && Number.isNaN(homeScore)) || (awayScore !== null && Number.isNaN(awayScore))) {
      return NextResponse.json(
        { ok: false, error: "Scores must be numbers or blank." },
        { status: 400 }
      );
    }
    rows.push({ id, homeScore, awayScore });
  }

  const updated: string[] = [];
  for (const row of rows) {
    await db
      .update(matches)
      .set({
        homeScore: row.homeScore,
        awayScore: row.awayScore,
      })
      .where(eq(matches.id, row.id));
    updated.push(row.id);
  }

  const updatedMatchRows = await db
    .select({ id: matches.id, weekId: matches.weekId })
    .from(matches)
    .where(inArray(matches.id, updated));

  const affectedWeekIds = Array.from(
    new Set(updatedMatchRows.map((row) => row.weekId))
  );

  const scoredWeeks: string[] = [];
  const pendingWeeks: string[] = [];

  for (const weekId of affectedWeekIds) {
    const weekMatches = await db
      .select({
        id: matches.id,
        homeScore: matches.homeScore,
        awayScore: matches.awayScore,
      })
      .from(matches)
      .where(eq(matches.weekId, weekId))
      .orderBy(asc(matches.kickoffAt));

    if (weekMatches.length === 0) continue;

    const matchOutcomes = new Map<string, Pick>();
    for (const row of weekMatches) {
      const outcome = outcomeFromScores(row.homeScore, row.awayScore);
      if (!outcome) continue;
      matchOutcomes.set(row.id, outcome);
    }

    if (matchOutcomes.size !== weekMatches.length) {
      pendingWeeks.push(weekId);
    }

    const weekEntries = await db
      .select({ id: entries.id })
      .from(entries)
      .where(eq(entries.weekId, weekId));

    const now = new Date();
    for (const entry of weekEntries) {
      const picksRows = await db
        .select({
          pick: entryPicks.pick,
          matchId: entryPicks.matchId,
        })
        .from(entryPicks)
        .where(eq(entryPicks.entryId, entry.id));

      const picks: Pick[] = [];
      const outcomes: Pick[] = [];
      for (const row of picksRows) {
        const outcome = matchOutcomes.get(row.matchId);
        if (!outcome) continue;
        if (row.pick === "H" || row.pick === "D" || row.pick === "A") {
          picks.push(row.pick);
          outcomes.push(outcome);
        }
      }

      const correctPicks =
        picks.length > 0 ? countCorrectPicks(picks, outcomes) : 0;
      const points = pointsForCorrectPicks(correctPicks);
      await db
        .update(entries)
        .set({
          correctPicks,
          points,
          scoredAt: matchOutcomes.size > 0 ? now : null,
        })
        .where(eq(entries.id, entry.id));
    }
    scoredWeeks.push(weekId);
  }

  return NextResponse.json({
    ok: true,
    updated: updated.length,
    affectedWeeks: affectedWeekIds,
    scoredWeeks,
    pendingWeeks,
  });
}
