import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { links, users } from "@/db/schema";
import { generateUniqueLeaderboardId } from "@/lib/leaderboard";
import { generateToken } from "@/lib/tokens";
import { getCurrentWeekId } from "@/lib/week";

function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get("host") ?? "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

function getIsoWeekEndUtc(date: Date): Date {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + (7 - day));
  utc.setUTCHours(23, 59, 59, 999);
  return utc;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const body = await request.json().catch(() => null);
  const firstName = String(body?.firstName ?? "").trim();
  const lastName = String(body?.lastName ?? "").trim();
  const idNumber = String(body?.idNumber ?? "").trim();
  const desiredLeaderboardName = String(body?.desiredLeaderboardName ?? "").trim();

  if (!firstName || !lastName || !idNumber || !desiredLeaderboardName) {
    return NextResponse.json(
      { error: "Missing required fields." },
      { status: 400 }
    );
  }

  const { token } = await params;
  const now = new Date();
  const baseUrl = getBaseUrl(request);

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
  if (link.type !== "REGISTRATION") {
    return NextResponse.json({ error: "Invalid link type." }, { status: 400 });
  }

  if (link.status !== "VALID" || link.expiresAt.getTime() < now.getTime()) {
    return NextResponse.json(
      { error: "Link expired or already used." },
      { status: 400 }
    );
  }

  const result = await db.transaction(async (tx) => {
    const latestLinkRows = await tx
      .select({ status: links.status, expiresAt: links.expiresAt })
      .from(links)
      .where(eq(links.token, token))
      .limit(1);

    if (
      latestLinkRows.length === 0 ||
      latestLinkRows[0].status !== "VALID" ||
      latestLinkRows[0].expiresAt.getTime() < now.getTime()
    ) {
      return { error: "Link expired or already used." } as const;
    }

    const existsFn = async (candidate: string) => {
      const rows = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.leaderboardId, candidate))
        .limit(1);
      return rows.length > 0;
    };

    const leaderboardId = await generateUniqueLeaderboardId(
      desiredLeaderboardName,
      existsFn
    );

    const userRows = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.waNumber, link.waNumber))
      .limit(1);

    if (userRows.length === 0) {
      await tx.insert(users).values({
        waNumber: link.waNumber,
        state: "ACTIVE",
        leaderboardId,
      });
    } else {
      await tx
        .update(users)
        .set({ state: "ACTIVE", leaderboardId })
        .where(eq(users.waNumber, link.waNumber));
    }

    const updated = await tx
      .update(links)
      .set({ status: "USED", usedAt: now })
      .where(and(eq(links.token, token), eq(links.status, "VALID")))
      .returning({ token: links.token });

    if (updated.length === 0) {
      return { error: "Link expired or already used." } as const;
    }

    const predictionToken = generateToken("pred");
    const weekId = getCurrentWeekId();

    await tx.insert(links).values({
      token: predictionToken,
      type: "PREDICTION",
      waNumber: link.waNumber,
      weekId,
      status: "VALID",
      expiresAt: getIsoWeekEndUtc(now),
    });

    return {
      leaderboardId,
      predictionUrl: `${baseUrl}/predict/${predictionToken}`,
    } as const;
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
