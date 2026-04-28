/**
 * match-scorer Lambda
 *
 * Trigger: EventBridge Scheduler — every Monday at 06:00 UTC
 *          Also invocable manually via the AWS console or admin API.
 *
 * Scores all entries for the previous week by comparing each player's picks
 * against the recorded match results. Updates entries.correct_picks,
 * entries.points, entries.entries_earned, and entries.scored_at.
 *
 * Reuses the scoring logic from src/lib/scoring.ts (copied inline to keep
 * this Lambda independently deployable without the Next.js build).
 */

import { eq, isNotNull, isNull } from "drizzle-orm";
import {
  integer, pgEnum, pgTable, text, timestamp, uuid,
} from "drizzle-orm/pg-core";
import { getDb, closeDb } from "../../shared/db";
import { getPreviousWeekId } from "../../shared/week";

// ---------------------------------------------------------------------------
// Inline schema (subset needed by this Lambda)
// ---------------------------------------------------------------------------

const matches = pgTable("matches", {
  id: uuid("id").primaryKey().defaultRandom(),
  weekId: text("week_id").notNull(),
  homeScore: integer("home_score"),
  awayScore: integer("away_score"),
  resultsFetchedAt: timestamp("results_fetched_at", { withTimezone: true }),
});

const entries = pgTable("entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  waNumber: text("wa_number").notNull(),
  weekId: text("week_id").notNull(),
  linkToken: text("link_token").notNull(),
  correctPicks: integer("correct_picks"),
  points: integer("points").notNull().default(0),
  entriesEarned: integer("entries_earned").notNull().default(1),
  scoredAt: timestamp("scored_at", { withTimezone: true }),
});

const entryPicks = pgTable("entry_picks", {
  id: uuid("id").primaryKey().defaultRandom(),
  entryId: uuid("entry_id").notNull(),
  matchId: uuid("match_id").notNull(),
  pick: text("pick").notNull(),
});

// ---------------------------------------------------------------------------
// Scoring logic (from src/lib/scoring.ts)
// ---------------------------------------------------------------------------

type Pick = "H" | "D" | "A";

function outcomeFromScores(homeScore: number | null, awayScore: number | null): Pick | null {
  if (homeScore === null || awayScore === null) return null;
  if (homeScore > awayScore) return "H";
  if (homeScore < awayScore) return "A";
  return "D";
}

function pointsForCorrectPicks(correctPicks: number): number {
  if (correctPicks <= 0) return 0;
  if (correctPicks === 1) return 1;
  if (correctPicks === 2) return 2;
  if (correctPicks === 3) return 10;
  if (correctPicks === 4) return 20;
  if (correctPicks === 5) return 50;
  if (correctPicks === 6) return 100;
  if (correctPicks === 7) return 200;
  if (correctPicks === 8) return 400;
  if (correctPicks === 9) return 800;
  return 1600;
}

function countCorrectPicks(picks: Pick[], outcomes: Pick[]): number {
  let correct = 0;
  for (let i = 0; i < outcomes.length; i += 1) {
    if (picks[i] === outcomes[i]) correct += 1;
  }
  return correct;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

/**
 * Scores all entries for the previous ISO week.
 *
 * @example
 * ```typescript
 * // Manual invocation payload (EventBridge or console test)
 * { "weekId": "2026-W17" }   // optional override
 * {}                          // uses getPreviousWeekId()
 * ```
 */
export const handler = async (event: { weekId?: string }): Promise<void> => {
  const db = await getDb();
  const weekId = event.weekId ?? getPreviousWeekId();
  console.log(`[match-scorer] Scoring week ${weekId}`);

  // Fetch all scored matches for the week
  const weekMatches = await db
    .select({ id: matches.id, homeScore: matches.homeScore, awayScore: matches.awayScore })
    .from(matches)
    .where(eq(matches.weekId, weekId));

  if (weekMatches.length === 0) {
    console.warn(`[match-scorer] No matches found for week ${weekId} — exiting`);
    await closeDb();
    return;
  }

  const unscoredMatches = weekMatches.filter((m) => m.homeScore === null || m.awayScore === null);
  if (unscoredMatches.length > 0) {
    console.warn(`[match-scorer] ${unscoredMatches.length} match(es) have no result yet — exiting`);
    await closeDb();
    return;
  }

  // Build outcome map: matchId → Pick
  const outcomes = new Map<string, Pick>();
  for (const m of weekMatches) {
    const outcome = outcomeFromScores(m.homeScore, m.awayScore);
    if (outcome) outcomes.set(m.id, outcome);
  }

  // Fetch all unscored entries for the week
  const unscoredEntries = await db
    .select({ id: entries.id })
    .from(entries)
    .where(eq(entries.weekId, weekId));

  console.log(`[match-scorer] Scoring ${unscoredEntries.length} entries`);

  for (const entry of unscoredEntries) {
    // Fetch picks for this entry
    const picks = await db
      .select({ matchId: entryPicks.matchId, pick: entryPicks.pick })
      .from(entryPicks)
      .where(eq(entryPicks.entryId, entry.id));

    // Align picks to match order
    const entryOutcomes: Pick[] = [];
    const entryPicsList: Pick[] = [];
    for (const p of picks) {
      const outcome = outcomes.get(p.matchId);
      if (outcome) {
        entryOutcomes.push(outcome);
        entryPicsList.push(p.pick as Pick);
      }
    }

    const correctPicks = countCorrectPicks(entryPicsList, entryOutcomes);
    const points = pointsForCorrectPicks(correctPicks);
    const entriesEarned = points + 1; // minimum 1 participation ticket

    await db
      .update(entries)
      .set({ correctPicks, points, entriesEarned, scoredAt: new Date() })
      .where(eq(entries.id, entry.id));
  }

  console.log(`[match-scorer] Done — scored ${unscoredEntries.length} entries for week ${weekId}`);
  await closeDb();
};
