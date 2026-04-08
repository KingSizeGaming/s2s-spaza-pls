import { and, asc, desc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { entries, entryPicks, links, matches, users } from "@/db/schema";
import { getCurrentWeekId } from "@/lib/week";
import { normalizeDesiredLeaderboard } from "@/lib/leaderboard";

// ── Leaderboard list (used by LeaderboardPage + GET /api/leaderboard) ──

type LeaderboardRow = {
  leaderboardId: string | null;
  entryCount: number;
  totalPoints: number;
  canView: boolean;
};

export type LeaderboardListResult = {
  weekId: string;
  leaderboards: LeaderboardRow[];
};

export async function getLeaderboardList(opts: {
  weekId?: string | null;
  token?: string | null;
}): Promise<LeaderboardListResult> {
  const { weekId: requestedWeekId, token } = opts;
  const currentWeekId = getCurrentWeekId();

  let viewerLeaderboardId: string | null = null;
  let tokenWeekId: string | null = null;

  if (token) {
    const linkRows = await db
      .select({ waNumber: links.waNumber, type: links.type, weekId: links.weekId })
      .from(links)
      .where(eq(links.token, token))
      .limit(1);

    if (linkRows.length !== 0 && linkRows[0].type === "PREDICTION") {
      tokenWeekId = linkRows[0].weekId ?? null;
      const userRows = await db
        .select({ leaderboardId: users.leaderboardId })
        .from(users)
        .where(
          sql`regexp_replace(${users.waNumber}, '[^0-9]', '', 'g') = ${linkRows[0].waNumber}`
        )
        .limit(1);

      if (userRows.length !== 0 && userRows[0].leaderboardId) {
        viewerLeaderboardId = userRows[0].leaderboardId;
      }
    }
  }

  const getRowsForWeek = async (wId: string) =>
    db
      .select({
        leaderboardId: users.leaderboardId,
        entryCount: sql<number>`count(${entries.id})::int`,
        totalPoints: sql<number>`coalesce(sum(${entries.points}), 0)::int`,
      })
      .from(entries)
      .innerJoin(
        users,
        sql`regexp_replace(${users.waNumber}, '[^0-9]', '', 'g') = ${entries.waNumber}`
      )
      .where(and(eq(entries.weekId, wId), isNotNull(users.leaderboardId)))
      .groupBy(users.leaderboardId)
      .orderBy(users.leaderboardId);

  const weekCandidates = Array.from(
    new Set(
      [requestedWeekId, tokenWeekId, currentWeekId]
        .map((v) => v?.trim())
        .filter((v): v is string => Boolean(v))
    )
  );

  let weekId = weekCandidates[0] ?? currentWeekId;
  let rows: Awaited<ReturnType<typeof getRowsForWeek>> = [];
  for (const candidateWeekId of weekCandidates) {
    const candidateRows = await getRowsForWeek(candidateWeekId);
    if (candidateRows.length > 0) {
      weekId = candidateWeekId;
      rows = candidateRows;
      break;
    }
  }

  if (rows.length === 0) {
    const latestEntryWeek = await db
      .select({ weekId: entries.weekId })
      .from(entries)
      .orderBy(desc(entries.submittedAt))
      .limit(1);

    if (latestEntryWeek.length > 0) {
      weekId = latestEntryWeek[0].weekId;
      rows = await getRowsForWeek(weekId);
    }
  }

  const leaderboards = rows
    .map((row) => ({
      ...row,
      canView: viewerLeaderboardId
        ? row.leaderboardId === viewerLeaderboardId
        : false,
    }))
    .sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (!viewerLeaderboardId) {
        return String(a.leaderboardId ?? "").localeCompare(
          String(b.leaderboardId ?? "")
        );
      }
      const aIsViewer = a.leaderboardId === viewerLeaderboardId;
      const bIsViewer = b.leaderboardId === viewerLeaderboardId;
      if (aIsViewer === bIsViewer) return 0;
      return aIsViewer ? -1 : 1;
    });

  return { weekId, leaderboards };
}

// ── Leaderboard detail / entries list (used by EntriesPage) ──

export type LeaderboardDetailResult =
  | {
      ok: true;
      weekId: string;
      leaderboardId: string;
      weeks: { id: string; weekId: string; submittedAt: string }[];
    }
  | { ok: false; error: string; status: number };

export async function getLeaderboardDetail(opts: {
  leaderboardId: string;
  weekId?: string | null;
  token?: string | null;
}): Promise<LeaderboardDetailResult> {
  const { leaderboardId, weekId, token } = opts;
  const normalizedLeaderboardId = normalizeDesiredLeaderboard(leaderboardId);

  if (!token) {
    return { ok: false, error: "Missing token.", status: 401 };
  }

  const linkRows = await db
    .select({ waNumber: links.waNumber, type: links.type })
    .from(links)
    .where(eq(links.token, token))
    .limit(1);

  if (linkRows.length === 0 || linkRows[0].type !== "PREDICTION") {
    return { ok: false, error: "Invalid token.", status: 403 };
  }

  const userRows = await db
    .select({ leaderboardId: users.leaderboardId, waNumber: users.waNumber })
    .from(users)
    .where(
      sql`regexp_replace(${users.waNumber}, '[^0-9]', '', 'g') = ${linkRows[0].waNumber}`
    )
    .limit(1);

  if (userRows.length === 0 || !userRows[0].leaderboardId) {
    return { ok: false, error: "User not found.", status: 404 };
  }

  if (userRows[0].leaderboardId !== normalizedLeaderboardId) {
    return { ok: false, error: "Not authorized.", status: 403 };
  }

  const rows = await db
    .select({
      id: entries.id,
      weekId: entries.weekId,
      submittedAt: entries.submittedAt,
    })
    .from(entries)
    .where(
      and(
        eq(entries.waNumber, userRows[0].waNumber),
        weekId ? eq(entries.weekId, weekId) : sql`true`
      )
    )
    .orderBy(desc(entries.submittedAt));

  return {
    ok: true,
    weekId: weekId ?? getCurrentWeekId(),
    leaderboardId: normalizedLeaderboardId,
    weeks: rows.map((row) => ({
      id: row.id,
      weekId: row.weekId,
      submittedAt: row.submittedAt?.toISOString() ?? "",
    })),
  };
}

// ── Entry detail / week view (used by EntryDetailPage) ──

type Pick = "H" | "D" | "A";

export type EntryDetailResult =
  | {
      ok: true;
      leaderboardId: string;
      weekId: string;
      submittedAt: string;
      matches: Array<{
        id: string;
        homeTeam: string;
        awayTeam: string;
        kickoffAt: string | null;
        pick: Pick | null;
        homeScore: number | null;
        awayScore: number | null;
        isFinished: boolean;
      }>;
    }
  | { ok: false; error: string; status: number };

export async function getEntryDetail(opts: {
  leaderboardId: string;
  weekId: string;
  token?: string | null;
  entryId?: string | null;
}): Promise<EntryDetailResult> {
  const { leaderboardId, weekId, token, entryId } = opts;
  const normalizedLeaderboardId = normalizeDesiredLeaderboard(leaderboardId);

  if (!token) {
    return { ok: false, error: "Missing token.", status: 401 };
  }

  const linkRows = await db
    .select({ waNumber: links.waNumber, type: links.type })
    .from(links)
    .where(eq(links.token, token))
    .limit(1);

  if (linkRows.length === 0 || linkRows[0].type !== "PREDICTION") {
    return { ok: false, error: "Invalid token.", status: 403 };
  }

  const userRows = await db
    .select({ leaderboardId: users.leaderboardId })
    .from(users)
    .where(
      sql`regexp_replace(${users.waNumber}, '[^0-9]', '', 'g') = ${linkRows[0].waNumber}`
    )
    .limit(1);

  if (userRows.length === 0 || !userRows[0].leaderboardId) {
    return { ok: false, error: "User not found.", status: 404 };
  }

  if (userRows[0].leaderboardId !== normalizedLeaderboardId) {
    return { ok: false, error: "Not authorized.", status: 403 };
  }

  const entryRows = await db
    .select({
      id: entries.id,
      submittedAt: entries.submittedAt,
    })
    .from(entries)
    .where(
      and(
        eq(entries.waNumber, linkRows[0].waNumber),
        eq(entries.weekId, weekId),
        entryId ? eq(entries.id, entryId) : sql`true`
      )
    )
    .orderBy(desc(entries.submittedAt))
    .limit(1);

  if (entryRows.length === 0) {
    return { ok: false, error: "No entries found for this week.", status: 404 };
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

  return {
    ok: true,
    leaderboardId: normalizedLeaderboardId,
    weekId,
    submittedAt: latestEntry.submittedAt?.toISOString() ?? "",
    matches: matchRows.map((match) => ({
      id: match.id,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      kickoffAt: match.kickoffAt?.toISOString() ?? null,
      pick: pickByMatchId.get(match.id) ?? null,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      isFinished: match.homeScore !== null && match.awayScore !== null,
    })),
  };
}
