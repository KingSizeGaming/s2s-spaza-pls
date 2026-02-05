import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { links, users } from "@/db/schema";
import { generateToken } from "@/lib/tokens";
import { getCurrentWeekId } from "@/lib/week";

function getBaseUrl(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured && configured.trim().length > 0) {
    return configured.trim();
  }

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

export async function POST(request: NextRequest) {
  const weekId = getCurrentWeekId();
  const baseUrl = getBaseUrl(request);
  const now = new Date();
  const expiresAt = getIsoWeekEndUtc(now);

  const activeUsers = await db
    .select({ waNumber: users.waNumber })
    .from(users)
    .where(eq(users.state, "ACTIVE"));

  if (activeUsers.length === 0) {
    return NextResponse.json({
      ok: true,
      weekId,
      created: 0,
      skippedExisting: 0,
      broadcasts: [],
    });
  }

  const waNumbers = activeUsers.map((user) => user.waNumber);
  const existingLinks = await db
    .select({ waNumber: links.waNumber })
    .from(links)
    .where(
      and(
        eq(links.weekId, weekId),
        eq(links.type, "PREDICTION"),
        inArray(links.waNumber, waNumbers)
      )
    );

  const existingSet = new Set(existingLinks.map((row) => row.waNumber));
  const broadcasts: Array<{
    waNumber: string;
    predictionUrl: string;
    message: string;
  }> = [];

  let created = 0;
  let skippedExisting = 0;

  for (const user of activeUsers) {
    if (existingSet.has(user.waNumber)) {
      skippedExisting += 1;
      continue;
    }

    const token = generateToken("pred");
    await db.insert(links).values({
      token,
      type: "PREDICTION",
      waNumber: user.waNumber,
      weekId,
      status: "VALID",
      expiresAt,
    });

    const predictionUrl = `${baseUrl}/predict/${token}`;
    const message = [
      "Your weekly free entry is ready.",
      "Submit your predictions here:",
      predictionUrl,
    ].join("\n");

    broadcasts.push({
      waNumber: user.waNumber,
      predictionUrl,
      message,
    });
    created += 1;
  }

  return NextResponse.json({
    ok: true,
    weekId,
    created,
    skippedExisting,
    broadcasts,
  });
}
