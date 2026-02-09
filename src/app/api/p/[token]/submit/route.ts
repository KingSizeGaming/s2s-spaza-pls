import { NextRequest, NextResponse } from "next/server";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { entries, entryPicks, links, matches, users } from "@/db/schema";
import type { Pick } from "@/lib/scoring";
import { getCurrentWeekId } from "@/lib/week";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const body = await request.json().catch(() => null);
  const picksInput = body?.picks as unknown;

  if (!Array.isArray(picksInput)) {
    return NextResponse.json(
      { error: "Missing picks." },
      { status: 400 }
    );
  }
  if (!picksInput.every((pick) => pick === "H" || pick === "D" || pick === "A")) {
    return NextResponse.json(
      { error: "Invalid picks. Use H, D, or A." },
      { status: 400 }
    );
  }
  const picks = picksInput as Pick[];

  const { token } = await params;
  const now = new Date();
  const weekId = getCurrentWeekId();
  const host = request.headers.get("host") ?? "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  const baseUrl = `${proto}://${host}`;

  const linkRows = await db
    .select({
      token: links.token,
      type: links.type,
      status: links.status,
      expiresAt: links.expiresAt,
      waNumber: links.waNumber,
      weekId: links.weekId,
    })
    .from(links)
    .where(eq(links.token, token))
    .limit(1);

  if (linkRows.length === 0) {
    return NextResponse.json({ error: "Link not found." }, { status: 400 });
  }

  const link = linkRows[0];
  const linkWeekId = link.weekId ?? weekId;
  if (link.type !== "PREDICTION") {
    return NextResponse.json({ error: "Invalid link type." }, { status: 400 });
  }

  if (link.status !== "VALID") {
    return NextResponse.json(
      { error: "Entry already submitted." },
      { status: 409 }
    );
  }

  if (link.expiresAt.getTime() < now.getTime()) {
    return NextResponse.json(
      { error: "Link expired." },
      { status: 400 }
    );
  }

  const result = await db.transaction(async (tx) => {
    let effectiveWeekId = linkWeekId;
    let matchRows = await tx
      .select({ id: matches.id })
      .from(matches)
      .where(eq(matches.weekId, effectiveWeekId))
      .orderBy(asc(matches.kickoffAt));

    if (matchRows.length === 0) {
      const latestWeek = await tx
        .select({ weekId: matches.weekId })
        .from(matches)
        .orderBy(desc(matches.kickoffAt))
        .limit(1);

      if (latestWeek.length > 0) {
        effectiveWeekId = latestWeek[0].weekId;
        matchRows = await tx
          .select({ id: matches.id })
          .from(matches)
          .where(eq(matches.weekId, effectiveWeekId))
          .orderBy(asc(matches.kickoffAt));
      }
    }

    if (matchRows.length === 0) {
      return { error: "No fixtures available for submission yet." } as const;
    }

    if (matchRows.length !== picks.length) {
      return { error: "Picks do not match this week's fixtures." } as const;
    }

    const latest = await tx
      .select({ status: links.status, expiresAt: links.expiresAt, waNumber: links.waNumber })
      .from(links)
      .where(eq(links.token, token))
      .limit(1);

    if (latest.length === 0) {
      return { error: "Link not found." } as const;
    }

    if (latest[0].status !== "VALID") {
      return { error: "Entry already submitted.", status: 409 } as const;
    }

    if (latest[0].expiresAt.getTime() < now.getTime()) {
      return { error: "Link expired.", status: 400 } as const;
    }

    const userRows = await tx
      .select({ leaderboardId: users.leaderboardId })
      .from(users)
      .where(
        sql`regexp_replace(${users.waNumber}, '[^0-9]', '', 'g') = ${latest[0].waNumber}`
      )
      .limit(1);

    if (userRows.length === 0 || !userRows[0].leaderboardId) {
      return { error: "User is not registered." } as const;
    }

    let entryId: string;
    try {
      const inserted = await tx
        .insert(entries)
        .values({
        waNumber: latest[0].waNumber,
        weekId: effectiveWeekId,
        linkToken: token,
        submittedAt: now,
        })
        .returning({ id: entries.id });
      if (inserted.length === 0) {
        return { error: "Unable to create entry." } as const;
      }
      entryId = inserted[0].id;
      await tx.insert(entryPicks).values(
        matchRows.map((match, index) => ({
          entryId,
          matchId: match.id,
          pick: picks[index] as Pick,
        }))
      );
    } catch {
      return { error: "Entry already submitted.", status: 409 } as const;
    }

    const updated = await tx
      .update(links)
      .set({ status: "USED", usedAt: now })
      .where(and(eq(links.token, token), eq(links.status, "VALID")))
      .returning({ token: links.token });

    if (updated.length === 0) {
      return { error: "Entry already submitted.", status: 409 } as const;
    }

    const leaderboardUrl = `${baseUrl}/leaderboard/${userRows[0].leaderboardId}?token=${token}`;
    const outboundMessage = [
      "Your entry has been accepted.",
      "",
      "View your picks and history here:",
      leaderboardUrl,
    ].join("\n");

    return {
      ok: true,
      leaderboardUrl,
      outboundMessage,
    } as const;
  });

  if ("error" in result) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status ?? 400 }
    );
  }

  return NextResponse.json(result);
}
