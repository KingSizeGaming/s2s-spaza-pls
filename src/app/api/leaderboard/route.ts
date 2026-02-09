import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { entries, links, users } from "@/db/schema";
import { getCurrentWeekId } from "@/lib/week";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const requestedWeekId = searchParams.get("weekId");
  const currentWeekId = getCurrentWeekId();
  const token = searchParams.get("token");

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

  const getRowsForWeek = async (weekId: string) =>
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
      .where(and(eq(entries.weekId, weekId), isNotNull(users.leaderboardId)))
      .groupBy(users.leaderboardId)
      .orderBy(users.leaderboardId);

  const weekCandidates = Array.from(
    new Set(
      [requestedWeekId, tokenWeekId, currentWeekId]
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value))
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
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
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

  return NextResponse.json({ weekId, leaderboards });
}
