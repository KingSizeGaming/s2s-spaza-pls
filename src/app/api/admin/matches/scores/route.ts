import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { matches } from "@/db/schema";

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

  return NextResponse.json({ ok: true, updated: updated.length });
}
