import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { entries, links, users } from "@/db/schema";
import { getCurrentWeekId } from "@/lib/week";

function summarizePicks(picks: unknown): string {
  if (Array.isArray(picks)) {
    return picks.join(",");
  }
  if (picks && typeof picks === "object") {
    return JSON.stringify(picks);
  }
  return String(picks ?? "");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leaderboardId: string }> }
) {
  const { searchParams } = new URL(request.url);
  const weekId = searchParams.get("weekId");
  const token = searchParams.get("token");
  const { leaderboardId } = await params;
  const normalizedLeaderboardId = leaderboardId.toUpperCase();

  if (!token) {
    return NextResponse.json(
      { error: "Missing token." },
      { status: 401 }
    );
  }

  const linkRows = await db
    .select({ waNumber: links.waNumber, type: links.type })
    .from(links)
    .where(eq(links.token, token))
    .limit(1);

  if (linkRows.length === 0 || linkRows[0].type !== "PREDICTION") {
    return NextResponse.json(
      { error: "Invalid token." },
      { status: 403 }
    );
  }

  const userRows = await db
    .select({ leaderboardId: users.leaderboardId, waNumber: users.waNumber })
    .from(users)
    .where(
      sql`regexp_replace(${users.waNumber}, '[^0-9]', '', 'g') = ${linkRows[0].waNumber}`
    )
    .limit(1);

  if (userRows.length === 0 || !userRows[0].leaderboardId) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (userRows[0].leaderboardId !== normalizedLeaderboardId) {
    return NextResponse.json(
      { error: "Not authorized." },
      { status: 403 }
    );
  }

  const rows = await db
    .select({
      submittedAt: entries.submittedAt,
      picks: entries.picks,
      weekId: entries.weekId,
    })
    .from(entries)
    .innerJoin(users, eq(entries.waNumber, users.waNumber))
    .where(
      and(
        eq(users.leaderboardId, normalizedLeaderboardId),
        weekId ? eq(entries.weekId, weekId) : sql`true`
      )
    )
    .orderBy(sql`${entries.submittedAt} desc`);

  const entriesWithSummary = rows.map((row) => ({
    submittedAt: row.submittedAt,
    picks: row.picks,
    summary: summarizePicks(row.picks),
  }));

  return NextResponse.json({
    weekId: weekId ?? getCurrentWeekId(),
    leaderboardId: normalizedLeaderboardId,
    entries: entriesWithSummary,
  });
}
