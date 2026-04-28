import { NextRequest, NextResponse } from "next/server";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { links, matches, spazaSids, users, vouchers } from "@/db/schema";
import { generateToken } from "@/lib/tokens";
import { getCurrentWeekId, getIsoWeekEndUtc } from "@/lib/week";
import { getBaseUrlFromRequest } from "@/lib/url";
import { normalizeWaNumber, normalizeMessage } from "@/lib/normalize";

// const NEW_SID_REGEX = /^new\s+(\S+)/i;
const NEW_SID_REGEX = /^(\S+)$/i;
const LEADERBOARD_REGEX = /^leaderboard\s+(\S+)/i;

/**
 * Looks up a voucher code in the database and checks if it is valid for the current week.
 *
 * @param code - Uppercased, sanitised voucher token (e.g. "ABC123")
 * @param weekId - ISO week string for the current week (e.g. "2026-W18")
 *
 * @returns
 * - `{ exists: false }` — voucher not found
 * - `{ exists: true, voucher: { id, weekId, isUsed }, weekMatch: boolean }` — voucher found;
 *   `weekMatch` is false when the voucher belongs to a different week
 *
 * @example
 * ```typescript
 * await lookupVoucher("ABC123", "2026-W18")
 * // { exists: true, voucher: { id: 42, weekId: "2026-W18", isUsed: false }, weekMatch: true }
 * ```
 */
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

/**
 * Handles the full inbound message processing synchronously — used in development mode
 * so local testing works without a real SQS queue. In production this logic moves to
 * the whatsapp-processor Lambda function.
 *
 * Parses the message text and dispatches to one of three flows:
 * 1. Leaderboard query ("leaderboard ABC123") — returns a leaderboard link
 * 2. Registration ("SPAZA01") — creates a REGISTRATION link and returns a registration URL
 * 3. Voucher redemption ("VOUCHER123") — marks the voucher used and returns a prediction URL
 *
 * @param request - The incoming Next.js request (used to derive the base URL)
 * @param from - Normalised WhatsApp number of the sender (digits only, e.g. "27821234567")
 * @param message - Normalised, lowercased message text from the sender
 * @param debugEnabled - When true, appends internal state info to error replies
 *
 * @returns A NextResponse with a JSON body shaped as:
 * `{ reply: { type: "text", body: string } }`
 *
 * @example
 * ```typescript
 * // Registration flow
 * await processMessageSynchronously(req, "27821234567", "spaza01", false)
 * // { reply: { type: "text", body: "Please complete your registration here: https://..." } }
 *
 * // Voucher redemption flow
 * await processMessageSynchronously(req, "27821234567", "abc123", false)
 * // { reply: { type: "text", body: "Code accepted. Here is your next prediction entry: https://..." } }
 * ```
 */
async function processMessageSynchronously(
  request: NextRequest,
  from: string,
  message: string,
  debugEnabled: boolean
): Promise<NextResponse> {
  const baseUrl = getBaseUrlFromRequest(request);
  const weekId = getCurrentWeekId();

  const leaderboardMatch = message.match(LEADERBOARD_REGEX);
  if (leaderboardMatch) {
    const requestedId = leaderboardMatch[1].toUpperCase();

    const userRow = await db
      .select({ leaderboardId: users.leaderboardId })
      .from(users)
      .where(and(
        sql`regexp_replace(${users.waNumber}, '[^0-9]', '', 'g') = ${from}`,
        eq(users.state, "ACTIVE"),
        eq(users.leaderboardId, requestedId)
      ))
      .limit(1);

    if (userRow.length === 0) {
      return NextResponse.json({ reply: { type: "text", body: "Leaderboard ID not found for your number." } });
    }

    const matchCount = await db
      .select({ id: matches.id })
      .from(matches)
      .where(eq(matches.weekId, weekId))
      .limit(1);

    if (matchCount.length === 0) {
      return NextResponse.json({ reply: { type: "text", body: "No matches available for this week yet." } });
    }

    const existingLink = await db
      .select({ id: links.id, token: links.token })
      .from(links)
      .where(and(
        sql`regexp_replace(${links.waNumber}, '[^0-9]', '', 'g') = ${from}`,
        eq(links.type, "PREDICTION"),
        eq(links.weekId, weekId)
      ))
      .limit(1);

    if (existingLink.length === 0) {
      return NextResponse.json({ reply: { type: "text", body: "You have not played this week yet. Get a Spaza voucher code to play." } });
    }

    await db
      .update(links)
      .set({ status: "VALID" })
      .where(eq(links.id, existingLink[0].id));

    const url = `${baseUrl}/leaderboard?token=${existingLink[0].token}`;
    return NextResponse.json({ reply: { type: "text", body: `Here is your leaderboard link: ${url}` } });
  }

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

  if (user.length === 0 || user[0].state !== "ACTIVE") {
    return NextResponse.json({
      reply: {
        type: "text",
        body:
          "Get a Spaza Shop code and get a chance to play" +
          (debugEnabled
            ? ` [debug: user_not_active state=${user[0]?.state ?? "none"}]`
            : ""),
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

/**
 * POST /api/webhook/inbound
 *
 * Entry point for inbound WhatsApp messages. Behaviour differs by environment:
 *
 * - **Production**: validates the sender and message, publishes a job to the SQS inbound
 *   queue, and returns 200 immediately. The actual message processing happens asynchronously
 *   in the whatsapp-processor Lambda. SQS publish failures are logged but never returned
 *   as errors — the WhatsApp provider must always receive a 200 or it will retry.
 *
 * - **Development**: runs the full message processing synchronously in-process so local
 *   testing works without a real SQS queue or Lambda.
 *
 * @param request - Incoming POST request with JSON body `{ from: string, message: string }`
 *   - `from` — sender's WhatsApp number (any format; normalised internally)
 *   - `message` — raw message text from the sender
 *
 * @returns
 * - `400` if `from` or `message` is missing
 * - `200` with `{ reply: { type: "text", body: string } }` in development (synchronous reply)
 * - `200` with empty body in production (message queued; reply sent later by Lambda)
 *
 * @example
 * ```typescript
 * // Request
 * POST /api/webhook/inbound
 * { "from": "+27 82 123 4567", "message": "SPAZA01" }
 *
 * // Development response
 * { "reply": { "type": "text", "body": "Please complete your registration here: https://..." } }
 *
 * // Production response
 * 200 OK (empty body — message queued to SQS)
 * ```
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const from = normalizeWaNumber(String(body?.from ?? ""));
  const message = normalizeMessage(String(body?.message ?? ""));

  if (!from || !message) {
    return NextResponse.json(
      { reply: { type: "text", body: "Missing sender or message." } },
      { status: 400 }
    );
  }

  // Development: run synchronous processing so local testing works without SQS
  if (process.env.NODE_ENV === "development") {
    const debugEnabled =
      request.nextUrl.searchParams.get("debug") === "1" ||
      request.headers.get("x-debug") === "1";
    return processMessageSynchronously(request, from, message, debugEnabled);
  }

  // Production: publish to SQS and return 200 immediately
  const messageId = crypto.randomUUID();
  try {
    const sqs = new SQSClient({ region: process.env.AWS_REGION });
    await sqs.send(
      new SendMessageCommand({
        QueueUrl: process.env.SQS_INBOUND_QUEUE_URL,
        MessageBody: JSON.stringify({
          messageId,
          waNumber: from,
          messageText: message,
          timestamp: new Date().toISOString(),
        }),
      })
    );
  } catch (error) {
    console.error("[webhook] Failed to publish to SQS:", error);
  }

  return new NextResponse(null, { status: 200 });
}
