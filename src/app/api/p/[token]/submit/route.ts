import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { entries, links, users } from "@/db/schema";
import { getCurrentWeekId } from "@/lib/week";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const body = await request.json().catch(() => null);
  const picks = body?.picks;

  if (picks === undefined) {
    return NextResponse.json(
      { error: "Missing picks." },
      { status: 400 }
    );
  }

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
    })
    .from(links)
    .where(eq(links.token, token))
    .limit(1);

  if (linkRows.length === 0) {
    return NextResponse.json({ error: "Link not found." }, { status: 400 });
  }

  const link = linkRows[0];
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
      .where(eq(users.waNumber, latest[0].waNumber))
      .limit(1);

    if (userRows.length === 0 || !userRows[0].leaderboardId) {
      return { error: "User is not registered." } as const;
    }

    await tx.insert(entries).values({
      waNumber: latest[0].waNumber,
      weekId,
      linkToken: token,
      picks,
      submittedAt: now,
    });

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
