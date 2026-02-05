import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { links, spazaSids, users, vouchers } from "@/db/schema";
import { generateToken } from "@/lib/tokens";
import { getCurrentWeekId } from "@/lib/week";

const NEW_SID_REGEX = /^new\s+(\S+)/i;

function normalizeWaNumber(input: string): string {
  return input.trim().replace(/\s+/g, "");
}

function normalizeMessage(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

function getBaseUrl(request: Request): string {
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

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const from = normalizeWaNumber(String(body?.from ?? ""));
  const message = normalizeMessage(String(body?.message ?? ""));

  if (!from || !message) {
    return NextResponse.json({
      reply: {
        type: "text",
        body: "Missing sender or message.",
      },
    });
  }

  const baseUrl = getBaseUrl(request);
  const weekId = getCurrentWeekId();

  const newMatch = message.match(NEW_SID_REGEX);
  if (newMatch) {
    const sid = newMatch[1];

    const sidRow = await db
      .select({ sid: spazaSids.sid, isActive: spazaSids.isActive })
      .from(spazaSids)
      .where(eq(spazaSids.sid, sid))
      .limit(1);

    if (sidRow.length === 0 || !sidRow[0].isActive) {
      return NextResponse.json({
        reply: {
          type: "text",
          body: "That Spaza ID is not valid. Please check and try again.",
        },
      });
    }

    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.waNumber, from))
      .limit(1);

    if (existingUser.length === 0) {
      await db.insert(users).values({
        waNumber: from,
        state: "PENDING_REGISTRATION",
        homeSid: sid,
      });
    } else {
      await db
        .update(users)
        .set({ state: "PENDING_REGISTRATION", homeSid: sid })
        .where(eq(users.waNumber, from));
    }

    const token = generateToken("reg");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.insert(links).values({
      token,
      type: "REGISTRATION",
      waNumber: from,
      weekId: null,
      status: "VALID",
      expiresAt,
    });

    const url = `${baseUrl}/register/${token}`;
    return NextResponse.json({
      reply: {
        type: "text",
        body: `Please complete your registration here: ${url}`,
      },
    });
  }

  const user = await db
    .select({ state: users.state })
    .from(users)
    .where(eq(users.waNumber, from))
    .limit(1);

  if (user.length === 0 || user[0].state !== "ACTIVE") {
    return NextResponse.json({
      reply: {
        type: "text",
        body: "Welcome! To begin, reply with: new <SID>",
      },
    });
  }

  const voucherToken = message.toUpperCase();
  const voucherRows = await db
    .select({
      id: vouchers.id,
      weekId: vouchers.weekId,
      isUsed: vouchers.isUsed,
    })
    .from(vouchers)
    .where(eq(vouchers.voucherToken, voucherToken))
    .limit(1);

  if (voucherRows.length === 0) {
    return NextResponse.json({
      reply: {
        type: "text",
        body: "Sorry, that code is invalid or expired.",
      },
    });
  }

  const voucher = voucherRows[0];
  if (voucher.isUsed || voucher.weekId !== weekId) {
    return NextResponse.json({
      reply: {
        type: "text",
        body: "Sorry, that code is invalid or expired.",
      },
    });
  }

  const replyBody = await db.transaction(async (tx) => {
    const updated = await tx
      .update(vouchers)
      .set({
        isUsed: true,
        usedByWaNumber: from,
        usedAt: new Date(),
      })
      .where(
        and(
          eq(vouchers.id, voucher.id),
          eq(vouchers.isUsed, false),
          eq(vouchers.weekId, weekId)
        )
      )
      .returning({ id: vouchers.id });

    if (updated.length === 0) {
      return "Sorry, that code is invalid or expired.";
    }

    const token = generateToken("pred");
    const expiresAt = getIsoWeekEndUtc(new Date());

    await tx.insert(links).values({
      token,
      type: "PREDICTION",
      waNumber: from,
      weekId,
      status: "VALID",
      expiresAt,
    });

    const url = `${baseUrl}/predict/${token}`;
    return `Code accepted. Here is your next prediction entry: ${url}`;
  });

  return NextResponse.json({
    reply: {
      type: "text",
      body: replyBody,
    },
  });
}
