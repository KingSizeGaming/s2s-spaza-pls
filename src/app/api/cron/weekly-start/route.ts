import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { links, users } from "@/db/schema";
import { generateToken } from "@/lib/tokens";
import {
  getCurrentWeekId,
  getIsoWeekEndUtc,
  incrementWeekId,
  isoWeekStartUtc,
  parseWeekId,
} from "@/lib/week";
import { getBaseUrlFromRequest } from "@/lib/url";

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentWeekId = getCurrentWeekId();
  const baseUrl = getBaseUrlFromRequest(request);
  const now = new Date();

  const latestPredictionWeek = await db
    .select({ weekId: links.weekId })
    .from(links)
    .where(and(eq(links.type, "PREDICTION"), sql`${links.weekId} is not null`))
    .orderBy(desc(links.weekId))
    .limit(1);

  const baseWeekId =
    latestPredictionWeek.length > 0 &&
    latestPredictionWeek[0].weekId &&
    latestPredictionWeek[0].weekId > currentWeekId
      ? latestPredictionWeek[0].weekId
      : currentWeekId;
  const weekId = incrementWeekId(baseWeekId);
  const targetWeekStart = parseWeekId(weekId);
  const expiresAt = targetWeekStart
    ? getIsoWeekEndUtc(isoWeekStartUtc(targetWeekStart.year, targetWeekStart.week))
    : getIsoWeekEndUtc(now);

  const activeUsers = await db
    .select({ waNumber: users.waNumber })
    .from(users)
    .where(eq(users.state, "ACTIVE"));

  if (activeUsers.length === 0) {
    return NextResponse.json({
      ok: true,
      weekId,
      previousWeekId: currentWeekId,
      created: 0,
      expiredPreviousLinks: 0,
      broadcasts: [],
    });
  }

  const broadcasts: Array<{
    waNumber: string;
    predictionUrl: string;
    message: string;
  }> = [];

  const result = await db.transaction(async (tx) => {
    const expiredPreviousLinks = await tx
      .update(links)
      .set({ status: "EXPIRED", updatedAt: now })
      .where(
        and(
          eq(links.type, "PREDICTION"),
          eq(links.status, "VALID"),
          ne(links.weekId, weekId)
        )
      )
      .returning({ id: links.id });

    await tx
      .delete(links)
      .where(and(eq(links.type, "PREDICTION"), eq(links.weekId, weekId)));

    for (const user of activeUsers) {
      const token = generateToken("pred");
      await tx.insert(links).values({
        token,
        type: "PREDICTION",
        waNumber: user.waNumber,
        weekId,
        status: "VALID",
        expiresAt,
      });

      const predictionUrl = `${baseUrl}/predict/${token}`;
      const message = [
        `PSL Weekly Predictions are live (${weekId}).`,
        "Submit before kickoff:",
        predictionUrl,
        "Want more entries? Spend R100+ and send your voucher code here.",
      ].join("\n");

      broadcasts.push({
        waNumber: user.waNumber,
        predictionUrl,
        message,
      });
    }

    return {
      expiredPreviousLinks: expiredPreviousLinks.length,
      created: activeUsers.length,
    };
  });

  return NextResponse.json({
    ok: true,
    weekId,
    previousWeekId: currentWeekId,
    created: result.created,
    expiredPreviousLinks: result.expiredPreviousLinks,
    broadcasts,
  });
}
