import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { links, spazaSids, users, vouchers } from "@/db/schema";
import { generateToken } from "@/lib/tokens";
import { getCurrentWeekId } from "@/lib/week";

const NEW_SID_REGEX = /^new\s+(\S+)/i;

function normalizeWaNumber(input: string): string {
  return input.replace(/[^0-9]/g, "");
}

function normalizeMessage(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

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

async function lookupVoucher(code: string, weekId: string) {
  const rows = await db
    .select({
      id: vouchers.id,
      weekId: vouchers.weekId,
      isUsed: vouchers.isUsed,
    })
    .from(vouchers)
    .where(sql`upper(${vouchers.voucherToken}) = ${code}`)
    .limit(1);

  if (rows.length === 0) {
    return { exists: false } as const;
  }

  const voucher = rows[0];
  return {
    exists: true,
    voucher,
    weekMatch: voucher.weekId === weekId,
  } as const;
}

export async function POST(request: NextRequest) {
  const debugEnabled =
    request.nextUrl.searchParams.get("debug") === "1" ||
    request.headers.get("x-debug") === "1";
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
      .where(sql`regexp_replace(${users.waNumber}, '[^0-9]', '', 'g') = ${from}`)
      .limit(1);

    if (existingUser.length === 0) {
      await db.insert(users).values({
        waNumber: from,
        state: "PENDING_REGISTRATION",
        homeSid: sid,
      });
    } else {
      const current = await db
        .select({ state: users.state })
        .from(users)
        .where(sql`regexp_replace(${users.waNumber}, '[^0-9]', '', 'g') = ${from}`)
        .limit(1);
      if (current.length > 0 && current[0].state === "ACTIVE") {
        return NextResponse.json({
          reply: {
            type: "text",
            body: "This number is already registered and used its first pick.\nGet a Spaza voucher code to play more.",
          },
        });
      }
      await db
        .update(users)
        .set({ state: "PENDING_REGISTRATION", homeSid: sid, waNumber: from })
        .where(sql`regexp_replace(${users.waNumber}, '[^0-9]', '', 'g') = ${from}`);
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
    .where(sql`regexp_replace(${users.waNumber}, '[^0-9]', '', 'g') = ${from}`)
    .limit(1);

  if (user.length === 0) {
    return NextResponse.json({
      reply: {
        type: "text",
        body:
          "Get a Spaza Shop code and get a chance to play" +
          (debugEnabled ? " [debug: user_not_active]" : ""),
      },
    });
  }

  const voucherMessage = message.replace(/\s+/g, " ").trim();
  const codeMatch = voucherMessage.match(/^code\s+(\S+)/i);
  const voucherToken = (codeMatch ? codeMatch[1] : voucherMessage)
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
  const voucherStatus = await lookupVoucher(voucherToken, weekId);

  if (!voucherStatus.exists) {
    return NextResponse.json({
      reply: {
        type: "text",
        body:
          "This code is not valid or expired. Please get a Spaza Voucher code to play." +
          (debugEnabled ? " [debug: voucher_not_found]" : ""),
      },
    });
  }

  const voucher = voucherStatus.voucher;
  if (!voucherStatus.weekMatch || voucher.isUsed) {
    return NextResponse.json({
      reply: {
        type: "text",
        body:
          "This code is not valid or expired. Please get a Spaza Voucher code to play." +
          (debugEnabled
            ? ` [debug: used=${voucher.isUsed} week_match=${voucherStatus.weekMatch}]`
            : ""),
      },
    });
  }

  const replyBody = await db.transaction(async (tx) => {
    await tx
      .update(vouchers)
      .set({
        isUsed: true,
        usedByWaNumber: from,
        usedAt: new Date(),
      })
      .where(and(eq(vouchers.id, voucher.id), eq(vouchers.weekId, weekId)))
      .returning({ id: vouchers.id });

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
