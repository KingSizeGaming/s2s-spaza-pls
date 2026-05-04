/**
 * whatsapp-processor Lambda
 *
 * Trigger: SQS queue spaza-whatsapp-inbound, batch size 1
 *
 * Receives queued inbound WhatsApp messages from the Fargate webhook handler
 * and performs the actual message processing: parses intent, runs DB operations,
 * and publishes a reply job to the spaza-notifications queue for the
 * notification-sender to deliver.
 *
 * Processing is idempotent — every message is checked against the
 * inbound_webhook_events table before work begins. Duplicate SQS deliveries
 * (at-least-once) are detected and short-circuited, replaying the stored reply.
 */

import { SQSEvent } from "aws-lambda";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { eq, sql, and } from "drizzle-orm";
import {
  boolean, index, integer, pgEnum, pgTable,
  text, timestamp, uniqueIndex, uuid,
} from "drizzle-orm/pg-core";
import { getDb } from "../../shared/db";
import { getCurrentWeekId, getPreviousWeekId } from "../../shared/week";

// ---------------------------------------------------------------------------
// Inline schema (subset of tables needed by this Lambda)
// ---------------------------------------------------------------------------

const userStateEnum = pgEnum("user_state", ["UNKNOWN", "PENDING_REGISTRATION", "ACTIVE"]);
const linkTypeEnum = pgEnum("link_type", ["REGISTRATION", "PREDICTION"]);
const linkStatusEnum = pgEnum("link_status", ["VALID", "USED", "EXPIRED"]);

const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  waNumber: text("wa_number").notNull(),
  state: userStateEnum("state").notNull().default("UNKNOWN"),
  homeSid: text("home_sid"),
  leaderboardId: text("leaderboard_id"),
});

const spazaSids = pgTable("spaza_sids", {
  sid: text("sid").primaryKey(),
  isActive: boolean("is_active").notNull().default(true),
});

const vouchers = pgTable("vouchers", {
  id: uuid("id").primaryKey().defaultRandom(),
  voucherToken: text("voucher_token").notNull(),
  weekId: text("week_id").notNull(),
  isUsed: boolean("is_used").notNull().default(false),
  usedByWaNumber: text("used_by_wa_number"),
  usedAt: timestamp("used_at", { withTimezone: true }),
});

const links = pgTable("links", {
  id: uuid("id").primaryKey().defaultRandom(),
  token: text("token").notNull(),
  type: linkTypeEnum("type").notNull(),
  waNumber: text("wa_number").notNull(),
  weekId: text("week_id"),
  status: linkStatusEnum("status").notNull().default("VALID"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

const matches = pgTable("matches", {
  id: uuid("id").primaryKey().defaultRandom(),
  weekId: text("week_id").notNull(),
});

const inboundWebhookEvents = pgTable("inbound_webhook_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  provider: text("provider").notNull().default("s2s"),
  messageId: text("message_id").notNull(),
  waNumber: text("wa_number").notNull(),
  responseBody: text("response_body").notNull(),
  messageHash: text("message_hash").notNull(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateToken(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 11)}${Date.now().toString(36)}`;
}

function getIsoWeekEndUtc(): Date {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const sunday = new Date(now);
  sunday.setUTCDate(now.getUTCDate() + daysUntilSunday);
  sunday.setUTCHours(23, 59, 59, 999);
  return sunday;
}

async function publishNotification(waNumber: string, messageBody: string, purpose: string, weekId?: string) {
  const sqs = new SQSClient({ region: process.env.AWS_REGION ?? "af-south-1" });
  await sqs.send(new SendMessageCommand({
    QueueUrl: process.env.SQS_NOTIFICATIONS_QUEUE_URL,
    MessageBody: JSON.stringify({
      waNumber,
      messageBody,
      purpose,
      weekId,
      requestKey: `${waNumber}:${purpose}:${Date.now()}`,
    }),
  }));
}

// ---------------------------------------------------------------------------
// Message processing
// ---------------------------------------------------------------------------

const LEADERBOARD_REGEX = /^leaderboard\s+(\S+)/i;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://winakasiwina.co.za";

/**
 * Processes a single inbound WhatsApp message and returns the reply text.
 * Dispatches to one of three flows: leaderboard query, registration, or
 * voucher redemption.
 *
 * @param waNumber - Normalised sender WhatsApp number (digits only)
 * @param messageText - Normalised message text
 * @returns Reply string to send back to the user
 */
async function processMessage(waNumber: string, messageText: string): Promise<string> {
  const db = await getDb();
  const weekId = getCurrentWeekId();

  // Leaderboard query
  const leaderboardMatch = messageText.match(LEADERBOARD_REGEX);
  if (leaderboardMatch) {
    const requestedId = leaderboardMatch[1].toUpperCase();

    const userRow = await db
      .select({ leaderboardId: users.leaderboardId })
      .from(users)
      .where(and(
        sql`regexp_replace(${users.waNumber}, '[^0-9]', '', 'g') = ${waNumber}`,
        eq(users.state, "ACTIVE"),
        eq(users.leaderboardId, requestedId)
      ))
      .limit(1);

    if (userRow.length === 0) return "Leaderboard ID not found for your number.";

    const matchCount = await db
      .select({ id: matches.id })
      .from(matches)
      .where(eq(matches.weekId, weekId))
      .limit(1);

    if (matchCount.length === 0) return "No matches available for this week yet.";

    const existingLink = await db
      .select({ id: links.id, token: links.token })
      .from(links)
      .where(and(
        sql`regexp_replace(${links.waNumber}, '[^0-9]', '', 'g') = ${waNumber}`,
        eq(links.type, "PREDICTION"),
        eq(links.weekId, weekId)
      ))
      .limit(1);

    if (existingLink.length === 0) return "You have not played this week yet. Get a Spaza voucher code to play.";

    await db.update(links).set({ status: "VALID" }).where(eq(links.id, existingLink[0].id));
    return `Here is your leaderboard link: ${SITE_URL}/leaderboard?token=${existingLink[0].token}`;
  }

  // Registration: treat single-word message as a spaza SID
  const sid = messageText.trim();
  const sidRow = await db
    .select({ sid: spazaSids.sid, isActive: spazaSids.isActive })
    .from(spazaSids)
    .where(eq(spazaSids.sid, sid))
    .limit(1);

  if (sidRow.length > 0 && sidRow[0].isActive) {
    const existingUser = await db
      .select({ id: users.id, state: users.state })
      .from(users)
      .where(sql`regexp_replace(${users.waNumber}, '[^0-9]', '', 'g') = ${waNumber}`)
      .limit(1);

    if (existingUser.length > 0 && existingUser[0].state === "ACTIVE") {
      return "This number is already registered and used its first pick.\nGet a Spaza voucher code to play more.";
    }

    if (existingUser.length === 0) {
      await db.insert(users).values({ waNumber, state: "PENDING_REGISTRATION", homeSid: sid });
    } else {
      await db.update(users)
        .set({ state: "PENDING_REGISTRATION", homeSid: sid })
        .where(sql`regexp_replace(${users.waNumber}, '[^0-9]', '', 'g') = ${waNumber}`);
    }

    const token = generateToken("reg");
    await db.insert(links).values({
      token,
      type: "REGISTRATION",
      waNumber,
      weekId: null,
      status: "VALID",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    return `Please complete your registration here: ${SITE_URL}/register/${token}`;
  }

  // Voucher redemption
  const user = await db
    .select({ state: users.state })
    .from(users)
    .where(sql`regexp_replace(${users.waNumber}, '[^0-9]', '', 'g') = ${waNumber}`)
    .limit(1);

  if (user.length === 0 || user[0].state !== "ACTIVE") {
    return "Get a Spaza Shop code and get a chance to play.";
  }

  const voucherToken = messageText.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const voucherRows = await db
    .select({ id: vouchers.id, weekId: vouchers.weekId, isUsed: vouchers.isUsed })
    .from(vouchers)
    .where(sql`upper(${vouchers.voucherToken}) = ${voucherToken}`)
    .limit(1);

  if (voucherRows.length === 0 || voucherRows[0].weekId !== weekId || voucherRows[0].isUsed) {
    return "This code is not valid or expired. Please get a Spaza Voucher code to play.";
  }

  const voucher = voucherRows[0];
  const token = generateToken("pred");

  await db.transaction(async (tx) => {
    await tx.update(vouchers)
      .set({ isUsed: true, usedByWaNumber: waNumber, usedAt: new Date() })
      .where(and(eq(vouchers.id, voucher.id), eq(vouchers.weekId, weekId)));

    await tx.insert(links).values({
      token,
      type: "PREDICTION",
      waNumber,
      weekId,
      status: "VALID",
      expiresAt: getIsoWeekEndUtc(),
    });
  });

  return `Code accepted. Here is your next prediction entry: ${SITE_URL}/predict/${token}`;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

/**
 * SQS event handler — processes one inbound WhatsApp message per invocation.
 *
 * @param event - SQS event with Records array (batch size 1)
 *
 * @example
 * ```typescript
 * // SQS message body shape (published by Fargate webhook handler)
 * {
 *   "messageId": "uuid-v4",
 *   "waNumber": "27821234567",
 *   "messageText": "SPAZA01",
 *   "timestamp": "2026-04-28T06:00:00.000Z"
 * }
 * ```
 */
export const handler = async (event: SQSEvent): Promise<void> => {
  const db = await getDb();

  for (const record of event.Records) {
    const payload = JSON.parse(record.body) as {
      messageId: string;
      waNumber: string;
      messageText: string;
      timestamp: string;
    };

    const { messageId, waNumber, messageText } = payload;

    // Idempotency check — SQS delivers at least once; skip duplicates
    const existing = await db
      .select({ responseBody: inboundWebhookEvents.responseBody })
      .from(inboundWebhookEvents)
      .where(and(
        eq(inboundWebhookEvents.provider, "s2s"),
        eq(inboundWebhookEvents.messageId, messageId)
      ))
      .limit(1);

    if (existing.length > 0) {
      console.log(`[whatsapp-processor] Duplicate message ${messageId} — replaying stored reply`);
      await publishNotification(waNumber, existing[0].responseBody, "replay");
      continue;
    }

    // Process the message
    const replyText = await processMessage(waNumber, messageText);
    console.log(`[whatsapp-processor] Processed ${messageId}: ${replyText.slice(0, 60)}`);

    // Record for idempotency
    const messageHash = `${waNumber}|${messageText}`;
    await db.insert(inboundWebhookEvents).values({
      provider: "s2s",
      messageId,
      waNumber,
      responseBody: replyText,
      messageHash,
    }).onConflictDoNothing();

    // Publish reply to notification queue
    await publishNotification(waNumber, replyText, "inbound_reply");
  }
};
