/**
 * prize-draw Lambda
 *
 * Trigger: EventBridge Scheduler — every Monday at 06:30 UTC
 *          (30 minutes after match-scorer to ensure scoring is complete)
 *
 * Selects winners from the previous week's scored entries using a weighted
 * random draw (more correct picks = more tickets = higher chance of winning).
 * Records winners in the prize_draws table and publishes winner notification
 * jobs to the spaza-notifications SQS queue.
 *
 * Guards against running before scoring is complete and against running twice
 * for the same week.
 *
 * Reuses the draw logic from src/lib/draw.ts (copied inline to keep this
 * Lambda independently deployable without the Next.js build).
 */

import { eq, isNotNull, isNull, sql } from "drizzle-orm";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import {
  integer, pgTable, text, timestamp, uuid,
} from "drizzle-orm/pg-core";
import { getDb, closeDb } from "../../shared/db";
import { getPreviousWeekId } from "../../shared/week";

// ---------------------------------------------------------------------------
// Inline schema (subset needed by this Lambda)
// ---------------------------------------------------------------------------

const entries = pgTable("entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  waNumber: text("wa_number").notNull(),
  weekId: text("week_id").notNull(),
  entriesEarned: integer("entries_earned").notNull().default(1),
  scoredAt: timestamp("scored_at", { withTimezone: true }),
});

const prizeDraws = pgTable("prize_draws", {
  id: uuid("id").primaryKey().defaultRandom(),
  weekId: text("week_id").notNull(),
  waNumber: text("wa_number").notNull(),
  prizeCode: text("prize_code").notNull(),
  message: text("message").notNull(),
});

// ---------------------------------------------------------------------------
// Draw logic (from src/lib/draw.ts)
// ---------------------------------------------------------------------------

type DrawCandidate = { waNumber: string; tickets: number };

function pickWeightedWinnerIndex(candidates: DrawCandidate[]): number {
  const totalTickets = candidates.reduce((sum, row) => sum + row.tickets, 0);
  let randomTicket = Math.floor(Math.random() * totalTickets) + 1;
  for (let i = 0; i < candidates.length; i += 1) {
    randomTicket -= candidates[i].tickets;
    if (randomTicket <= 0) return i;
  }
  return candidates.length - 1;
}

function drawWeightedUnique(candidates: DrawCandidate[], winnerCount: number): DrawCandidate[] {
  const pool = candidates.filter((row) => row.tickets > 0);
  const winners: DrawCandidate[] = [];
  while (pool.length > 0 && winners.length < winnerCount) {
    const winnerIndex = pickWeightedWinnerIndex(pool);
    winners.push(pool[winnerIndex]);
    pool.splice(winnerIndex, 1);
  }
  return winners;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PRIZE_TIERS: Array<{ prizeCode: string; message: string }> = [
  { prizeCode: "PRIZE_1ST", message: "Congratulations! You are this week's grand prize winner! 🎉" },
  { prizeCode: "PRIZE_2ND", message: "Congratulations! You are this week's second prize winner! 🎊" },
  { prizeCode: "PRIZE_3RD", message: "Congratulations! You are this week's third prize winner! 🎈" },
];

async function publishWinnerNotification(waNumber: string, message: string, weekId: string) {
  const sqs = new SQSClient({ region: process.env.AWS_REGION ?? "af-south-1" });
  await sqs.send(new SendMessageCommand({
    QueueUrl: process.env.SQS_NOTIFICATIONS_QUEUE_URL,
    MessageBody: JSON.stringify({
      waNumber,
      messageBody: message,
      purpose: "winner_notification",
      weekId,
      requestKey: `${waNumber}:winner:${weekId}`,
    }),
  }));
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

/**
 * Runs the prize draw for the previous ISO week.
 *
 * @example
 * ```typescript
 * // Manual invocation payload
 * { "weekId": "2026-W17" }   // optional override
 * {}                          // uses getPreviousWeekId()
 * ```
 */
export const handler = async (event: { weekId?: string }): Promise<void> => {
  const db = await getDb();
  const weekId = event.weekId ?? getPreviousWeekId();
  console.log(`[prize-draw] Running draw for week ${weekId}`);

  // Guard: prevent running twice for the same week
  const existingDraw = await db
    .select({ id: prizeDraws.id })
    .from(prizeDraws)
    .where(eq(prizeDraws.weekId, weekId))
    .limit(1);

  if (existingDraw.length > 0) {
    console.warn(`[prize-draw] Draw already completed for week ${weekId} — exiting`);
    await closeDb();
    return;
  }

  // Guard: ensure all entries are scored before drawing
  const unscoredCount = await db
    .select({ id: entries.id })
    .from(entries)
    .where(eq(entries.weekId, weekId));

  const unscored = unscoredCount.filter((e) => (e as { scoredAt?: Date | null }).scoredAt == null);
  if (unscored.length > 0) {
    console.warn(`[prize-draw] ${unscored.length} entries not yet scored for week ${weekId} — exiting`);
    await closeDb();
    return;
  }

  // Aggregate total tickets per player across all their entries for the week
  const ticketRows = await db
    .select({
      waNumber: entries.waNumber,
      tickets: sql<number>`sum(${entries.entriesEarned})::int`,
    })
    .from(entries)
    .where(eq(entries.weekId, weekId))
    .groupBy(entries.waNumber);

  if (ticketRows.length === 0) {
    console.warn(`[prize-draw] No eligible entries for week ${weekId} — exiting`);
    await closeDb();
    return;
  }

  const candidates: DrawCandidate[] = ticketRows.map((r) => ({
    waNumber: r.waNumber,
    tickets: r.tickets,
  }));

  const winners = drawWeightedUnique(candidates, PRIZE_TIERS.length);
  console.log(`[prize-draw] Drew ${winners.length} winner(s) for week ${weekId}`);

  for (let i = 0; i < winners.length; i++) {
    const winner = winners[i];
    const tier = PRIZE_TIERS[i];

    await db.insert(prizeDraws).values({
      weekId,
      waNumber: winner.waNumber,
      prizeCode: tier.prizeCode,
      message: tier.message,
    });

    await publishWinnerNotification(winner.waNumber, tier.message, weekId);
    console.log(`[prize-draw] Winner ${i + 1}: ${winner.waNumber} (${tier.prizeCode})`);
  }

  console.log(`[prize-draw] Done for week ${weekId}`);
  await closeDb();
};
