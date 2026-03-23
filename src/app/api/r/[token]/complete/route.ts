import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { links, users } from "@/db/schema";
import { generateUniqueLeaderboardId } from "@/lib/leaderboard";
import { generateToken } from "@/lib/tokens";
import { getCurrentWeekId, getIsoWeekEndUtc } from "@/lib/week";
import { getBaseUrlFromRequest } from "@/lib/url";
import { parseSaIdBirthDate, isAtLeastAge, hashSaId } from "@/lib/sa-id";

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

  const birthDate = parseSaIdBirthDate(idNumber);
  if (!birthDate) {
    return NextResponse.json(
      { error: "SA Identity Number is invalid." },
      { status: 400 }
    );
  }
  if (!isAtLeastAge(birthDate, 18)) {
    return NextResponse.json(
      { error: "You must be at least 18 years old to register." },
      { status: 400 }
    );
  }

  const saIdHash = hashSaId(idNumber);
  if (!saIdHash) {
    return NextResponse.json(
      { error: "Server missing SA ID hash configuration." },
      { status: 500 }
    );
  }

  const { token } = await params;
  const now = new Date();
  const baseUrl = getBaseUrlFromRequest(request);

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

    const duplicateSaIdRows = await tx
      .select({ waNumber: users.waNumber })
      .from(users)
      .where(eq(users.saIdHash, saIdHash))
      .limit(1);

    if (
      duplicateSaIdRows.length > 0 &&
      duplicateSaIdRows[0].waNumber !== link.waNumber
    ) {
      return { error: "SA Identity Number already registered." } as const;
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
        firstName,
        lastName,
        saIdHash,
      });
    } else {
      await tx
        .update(users)
        .set({
          state: "ACTIVE",
          leaderboardId,
          firstName,
          lastName,
          saIdHash,
        })
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

    const predictionUrl = `${baseUrl}/predict/${predictionToken}`;
    const outboundMessage = [
      "Welcome! You are now registered.",
      `Your Leaderboard ID is: ${leaderboardId}`,
      "Submit your predictions here:",
      predictionUrl,
    ].join("\n");

    return {
      leaderboardId,
      predictionUrl,
      outboundMessage,
    } as const;
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
