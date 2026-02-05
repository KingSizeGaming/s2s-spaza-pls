import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { matches } from "@/db/schema";
import { getCurrentWeekId } from "@/lib/week";

type MatchInput = {
  weekId?: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
};

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const defaultWeekId = String(body?.weekId ?? "").trim() || getCurrentWeekId();
  const items = Array.isArray(body?.matches) ? body.matches : null;

  if (!items || items.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Missing matches array." },
      { status: 400 }
    );
  }

  const rows: MatchInput[] = [];
  for (const item of items) {
    const homeTeam = String(item?.homeTeam ?? "").trim();
    const awayTeam = String(item?.awayTeam ?? "").trim();
    const kickoffAt = String(item?.kickoffAt ?? "").trim();
    const weekId = String(item?.weekId ?? "").trim() || defaultWeekId;
    if (!homeTeam || !awayTeam || !kickoffAt || !weekId) {
      return NextResponse.json(
        { ok: false, error: "Each match needs homeTeam, awayTeam, kickoffAt." },
        { status: 400 }
      );
    }
    rows.push({ homeTeam, awayTeam, kickoffAt, weekId });
  }

  const inserted = await db
    .insert(matches)
    .values(
      rows.map((row) => ({
        weekId: row.weekId ?? defaultWeekId,
        homeTeam: row.homeTeam,
        awayTeam: row.awayTeam,
        kickoffAt: new Date(row.kickoffAt),
      }))
    )
    .returning({ id: matches.id });

  return NextResponse.json({
    ok: true,
    weekId: defaultWeekId,
    created: inserted.length,
  });
}
