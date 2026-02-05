import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { matches } from "@/db/schema";
import { getCurrentWeekId } from "@/lib/week";

function addDays(date: Date, days: number, hours: number, minutes: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const weekId = String(body?.weekId ?? "").trim() || getCurrentWeekId();

  const existing = await db
    .select({ id: matches.id })
    .from(matches)
    .where(eq(matches.weekId, weekId))
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json(
      { ok: false, error: "Matches already exist for this week." },
      { status: 409 }
    );
  }

  const now = new Date();
  const defaults = [
    { homeTeam: "Chiefs", awayTeam: "Pirates", kickoffAt: addDays(now, 1, 15, 0) },
    { homeTeam: "Sundowns", awayTeam: "SuperSport", kickoffAt: addDays(now, 1, 17, 30) },
    { homeTeam: "Arrows", awayTeam: "AmaZulu", kickoffAt: addDays(now, 1, 19, 0) },
    { homeTeam: "Stellenbosch", awayTeam: "Cape Town City", kickoffAt: addDays(now, 2, 18, 0) },
    { homeTeam: "Polokwane", awayTeam: "Sekhukhune", kickoffAt: addDays(now, 3, 15, 0) },
    { homeTeam: "TS Galaxy", awayTeam: "Royal AM", kickoffAt: addDays(now, 3, 17, 30) },
    { homeTeam: "Swallows", awayTeam: "Richards Bay", kickoffAt: addDays(now, 3, 19, 0) },
  ];

  const inserted = await db
    .insert(matches)
    .values(
      defaults.map((match) => ({
        weekId,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        kickoffAt: match.kickoffAt,
      }))
    )
    .returning({ id: matches.id });

  return NextResponse.json({
    ok: true,
    weekId,
    created: inserted.length,
  });
}
