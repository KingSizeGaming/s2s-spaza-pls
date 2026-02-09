import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { entries, matches, prizeDraws } from "@/db/schema";
import { getCurrentWeekId } from "@/lib/week";

type Candidate = {
  waNumber: string;
  tickets: number;
};

function pickWeightedWinnerIndex(candidates: Candidate[]): number {
  const totalTickets = candidates.reduce((sum, row) => sum + row.tickets, 0);
  let randomTicket = Math.floor(Math.random() * totalTickets) + 1;
  for (let i = 0; i < candidates.length; i += 1) {
    randomTicket -= candidates[i].tickets;
    if (randomTicket <= 0) return i;
  }
  return candidates.length - 1;
}

function drawWeightedUnique(candidates: Candidate[], winnerCount: number): Candidate[] {
  const pool = candidates.filter((row) => row.tickets > 0);
  const winners: Candidate[] = [];
  while (pool.length > 0 && winners.length < winnerCount) {
    const winnerIndex = pickWeightedWinnerIndex(pool);
    winners.push(pool[winnerIndex]);
    pool.splice(winnerIndex, 1);
  }
  return winners;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const weekId = String(body?.weekId ?? "").trim() || getCurrentWeekId();
  const minPoints = Math.max(
    1,
    Number(body?.minPoints ?? body?.requiredCorrect ?? 1)
  );
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

  const candidates = await db
    .select({
      waNumber: entries.waNumber,
      points: entries.points,
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

  const ticketsByWa = new Map<string, number>();
  for (const row of candidates) {
    const entryPoints = Math.max(0, row.points ?? 0);
    const prev = ticketsByWa.get(row.waNumber) ?? 0;
    ticketsByWa.set(row.waNumber, prev + entryPoints);
  }

  const eligible = Array.from(ticketsByWa.entries())
    .map(([waNumber, tickets]) => ({ waNumber, tickets }))
    .filter((row) => row.tickets >= minPoints);

  if (eligible.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No players met the minimum ticket threshold." },
      { status: 404 }
    );
  }

  if (prizeCodes.length === 0) {
    return NextResponse.json({ ok: false, error: "No prize codes provided." }, { status: 400 });
  }

  const winners = drawWeightedUnique(
    eligible,
    Math.min(prizeCodes.length, eligible.length)
  );

  const notifications = winners.map((winner, index) => {
    const codePrize = prizeCodes[index];
    const message = [
      "Congratulations you've won on your picks this week.",
      "Please go to your home spaza to claim your prize.",
      codePrize,
    ].join("\n");
    return {
      waNumber: winner.waNumber,
      tickets: winner.tickets,
      codePrize,
      message,
    };
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
    minPoints,
    totalEligible: eligible.length,
    winners: notifications,
  });
}
