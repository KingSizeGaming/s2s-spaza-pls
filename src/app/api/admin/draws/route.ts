import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { entries, matches, prizeDraws } from "@/db/schema";
import { getCurrentWeekId } from "@/lib/week";

function shuffle<T>(input: T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const weekId = String(body?.weekId ?? "").trim() || getCurrentWeekId();
  const requiredCorrect = Math.max(1, Number(body?.requiredCorrect ?? 1));
  const prizeCodes = Array.isArray(body?.prizeCodes)
    ? body.prizeCodes.map((code: string) => String(code).trim()).filter(Boolean)
    : [];

  const matchRows = await db
    .select({
      id: matches.id,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
    })
    .from(matches)
    .where(eq(matches.weekId, weekId))
    .orderBy(asc(matches.kickoffAt));

  if (matchRows.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No matches found for this week." },
      { status: 404 }
    );
  }

  if (matchRows.some((row) => row.homeScore === null || row.awayScore === null)) {
    return NextResponse.json(
      { ok: false, error: "All match scores must be set before drawing winners." },
      { status: 400 }
    );
  }

  const results = matchRows.map((row) => {
    if ((row.homeScore ?? 0) > (row.awayScore ?? 0)) return "H";
    if ((row.homeScore ?? 0) < (row.awayScore ?? 0)) return "A";
    return "D";
  });

  const candidates = await db
    .select({
      waNumber: entries.waNumber,
      picks: entries.picks,
    })
    .from(entries)
    .where(eq(entries.weekId, weekId))
    .orderBy(asc(entries.waNumber));

  if (candidates.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No entries found for this week." },
      { status: 404 }
    );
  }

  const bestByWa = new Map<string, number>();
  for (const row of candidates) {
    const picks = Array.isArray(row.picks) ? row.picks : [];
    if (picks.length !== results.length) continue;
    let correct = 0;
    for (let i = 0; i < results.length; i += 1) {
      if (picks[i] === results[i]) correct += 1;
    }
    const prev = bestByWa.get(row.waNumber) ?? 0;
    if (correct > prev) bestByWa.set(row.waNumber, correct);
  }

  const eligible = Array.from(bestByWa.entries())
    .filter(([, correct]) => correct >= requiredCorrect)
    .map(([waNumber]) => waNumber);

  if (eligible.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No winners met the required correct picks." },
      { status: 404 }
    );
  }

  if (prizeCodes.length < eligible.length) {
    return NextResponse.json(
      { ok: false, error: "Not enough prize codes for the winners." },
      { status: 400 }
    );
  }

  const shuffled = shuffle(eligible);
  const winners = shuffled.slice(0, Math.min(prizeCodes.length, shuffled.length));

  const notifications = winners.map((waNumber, index) => {
    const codePrize = prizeCodes[index];
    const message = [
      "Congratulations you've won on your picks this week.",
      "Please go to your home spaza to claim your prize.",
      codePrize,
    ].join("\n");
    return { waNumber, codePrize, message };
  });

  await db.insert(prizeDraws).values(
    notifications.map((item) => ({
      weekId,
      waNumber: item.waNumber,
      prizeCode: item.codePrize,
      message: item.message,
    }))
  );

  return NextResponse.json({
    ok: true,
    weekId,
    requiredCorrect,
    totalEligible: eligible.length,
    winners: notifications,
  });
}
