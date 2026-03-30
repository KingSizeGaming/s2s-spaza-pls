import { boolean, index, integer, jsonb, pgEnum,
  pgTable, text, timestamp, uniqueIndex, uuid,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const userStateEnum = pgEnum("user_state", [
  "UNKNOWN",
  "PENDING_REGISTRATION",
  "ACTIVE",
]);

export const linkTypeEnum = pgEnum("link_type", ["REGISTRATION", "PREDICTION"]);

export const linkStatusEnum = pgEnum("link_status", ["VALID", "USED", "EXPIRED"]);

export const deliveryStatusEnum = pgEnum("delivery_status", [
  "accepted",
  "sent",
  "delivered",
  "read",
  "failed",
]);

// ---------------------------------------------------------------------------
// spaza_sids
// Participating spaza shops. Each shop has a unique SID (e.g. "ABC123") set
// by an admin — not auto-generated. Only is_active = true SIDs are accepted
// in the "new <SID>" registration flow. Deactivating a SID does not affect
// players already registered through it.
// ---------------------------------------------------------------------------
export const spazaSids = pgTable(
  "spaza_sids",
  {
    sid: text("sid").primaryKey(),
    name: text("name").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [
    index("spaza_sids_is_active_idx").on(t.isActive),
    index("spaza_sids_name_idx").on(t.name),
  ]
);

// ---------------------------------------------------------------------------
// users
// One record per player, identified by WhatsApp number. Registration is a
// two-step process tracked via `state`:
//   UNKNOWN → PENDING_REGISTRATION (user sends "new <SID>")
//   PENDING_REGISTRATION → ACTIVE (user completes web form)
// wa_number is always digits-only (no +, spaces, or dashes).
// leaderboard_id is a generated 3-letter + 3-digit code (e.g. "KAY482").
// sa_id_hash is HMAC-SHA256 of the raw SA ID — the raw ID is never stored.
// ---------------------------------------------------------------------------
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    waNumber: text("wa_number").notNull(),
    state: userStateEnum("state").notNull().default("UNKNOWN"),
    homeSid: text("home_sid").references(() => spazaSids.sid),
    firstName: text("first_name"),
    lastName: text("last_name"),
    saIdHash: text("sa_id_hash"),
    leaderboardId: text("leaderboard_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("users_wa_number_uq").on(t.waNumber),
    uniqueIndex("users_leaderboard_id_uq").on(t.leaderboardId),
    index("users_state_idx").on(t.state),
    index("users_home_sid_idx").on(t.homeSid),
  ]
);

// ---------------------------------------------------------------------------
// vouchers
// One-time codes issued by spazas to customers who make qualifying purchases
// (R100+). Each code is valid for a specific week. Redemption must be atomic:
// mark used + create prediction link + insert purchase_patterns in one
// transaction. Use an optimistic lock (WHERE is_used = false) to handle races.
// Store and compare voucher_token in UPPERCASE.
// ---------------------------------------------------------------------------
export const vouchers = pgTable(
  "vouchers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    voucherToken: text("voucher_token").notNull(),
    issuingSid: text("issuing_sid").notNull().references(() => spazaSids.sid),
    weekId: text("week_id").notNull(),
    isUsed: boolean("is_used").notNull().default(false),
    usedByWaNumber: text("used_by_wa_number"),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("vouchers_voucher_token_uq").on(t.voucherToken),
    index("vouchers_issuing_sid_idx").on(t.issuingSid),
    index("vouchers_week_id_idx").on(t.weekId),
    index("vouchers_is_used_idx").on(t.isUsed),
  ]
);

// ---------------------------------------------------------------------------
// links
// Single-use, time-limited access tokens for the registration and prediction
// pages. Type is REGISTRATION or PREDICTION. Status transitions:
//   VALID → USED (consumed by the user) or EXPIRED (nightly cleanup job).
// Validity check: status = 'VALID' AND expires_at > now().
// REGISTRATION links expire 24h after creation.
// PREDICTION links expire at Sunday 23:59:59 UTC of the ISO week.
// A player may have multiple VALID prediction links in a week (one free + one
// per voucher redemption).
// ---------------------------------------------------------------------------
export const links = pgTable(
  "links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    token: text("token").notNull(),
    type: linkTypeEnum("type").notNull(),
    waNumber: text("wa_number").notNull(),
    weekId: text("week_id"),
    status: linkStatusEnum("status").notNull().default("VALID"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("links_token_uq").on(t.token),
    index("links_wa_number_idx").on(t.waNumber),
    index("links_week_id_idx").on(t.weekId),
    index("links_status_idx").on(t.status),
    index("links_type_idx").on(t.type),
    index("links_expires_at_idx").on(t.expiresAt),
  ]
);

// ---------------------------------------------------------------------------
// matches
// PSL football fixtures for a given week. Entered by admin; scores are written
// exclusively by the fetch-results cron job via API-Football — never manually.
// external_match_id is the API-Football fixture ID; without it the cron job
// cannot fetch results and will emit a CloudWatch warning.
// results_fetched_at is set by the cron job when a confirmed result (FT/AET/
// PEN) is written. Scoring runs when all matches in the week have a non-null
// results_fetched_at.
// Prediction cutoff = MIN(kickoff_at) across all matches in the week.
// ---------------------------------------------------------------------------
export const matches = pgTable(
  "matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    weekId: text("week_id").notNull(),
    homeTeam: text("home_team").notNull(),
    awayTeam: text("away_team").notNull(),
    kickoffAt: timestamp("kickoff_at", { withTimezone: true }).notNull(),
    homeScore: integer("home_score"),
    awayScore: integer("away_score"),
    externalMatchId: integer("external_match_id").unique(),
    resultsFetchedAt: timestamp("results_fetched_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [
    index("matches_week_id_idx").on(t.weekId),
    index("matches_kickoff_at_idx").on(t.kickoffAt),
    index("matches_results_fetched_at_idx").on(t.resultsFetchedAt),
  ]
);

// ---------------------------------------------------------------------------
// entries
// One record per prediction link submitted. A player can have multiple entries
// in a week (one free + one per voucher). Scoring populates correct_picks,
// points, entries_earned, and scored_at. entries_earned = points + 1 (minimum
// 1 — even 0 correct picks earns a participation draw ticket). The draw engine
// uses SUM(entries_earned) per player as their total ticket count.
// ---------------------------------------------------------------------------
export const entries = pgTable(
  "entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    waNumber: text("wa_number").notNull(),
    weekId: text("week_id").notNull(),
    linkToken: text("link_token").notNull(),
    correctPicks: integer("correct_picks"),
    points: integer("points").notNull().default(0),
    entriesEarned: integer("entries_earned").notNull().default(1),
    scoredAt: timestamp("scored_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("entries_link_token_uq").on(t.linkToken),
    index("entries_wa_week_idx").on(t.waNumber, t.weekId),
    index("entries_link_token_idx").on(t.linkToken),
    index("entries_submitted_at_idx").on(t.submittedAt),
    index("entries_points_idx").on(t.points),
    index("entries_scored_at_idx").on(t.scoredAt),
  ]
);

// ---------------------------------------------------------------------------
// entry_picks
// Individual match predictions within an entry. Immutable once submitted —
// no updated_at column. One pick per match per entry, enforced by unique
// constraint. Pick values: "H" (home win), "D" (draw), "A" (away win).
// Created atomically with the parent entries record.
// ---------------------------------------------------------------------------
export const entryPicks = pgTable(
  "entry_picks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entryId: uuid("entry_id").notNull().references(() => entries.id, { onDelete: "cascade" }),
    matchId: uuid("match_id").notNull().references(() => matches.id),
    pick: text("pick").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("entry_picks_entry_match_uq").on(t.entryId, t.matchId),
    index("entry_picks_entry_id_idx").on(t.entryId),
    index("entry_picks_match_id_idx").on(t.matchId),
    index("entry_picks_pick_idx").on(t.pick),
  ]
);

// ---------------------------------------------------------------------------
// purchase_patterns
// Cross-shop analytics. One immutable row per voucher redemption. Records
// whether the voucher came from the player's home spaza (is_cross_shop = false)
// or a different shop (is_cross_shop = true). home_sid is a snapshot of the
// player's home_sid at the time of redemption — it is not a live FK.
// Inserted in the same transaction as the voucher redemption and prediction
// link creation. Used by the spaza dashboard to show cross-shop traffic.
// ---------------------------------------------------------------------------
export const purchasePatterns = pgTable(
  "purchase_patterns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    waNumber: text("wa_number").notNull(),
    issuingSid: text("issuing_sid").notNull().references(() => spazaSids.sid),
    homeSid: text("home_sid").notNull(),
    isCrossShop: boolean("is_cross_shop").notNull(),
    weekId: text("week_id").notNull(),
    voucherId: uuid("voucher_id").notNull().references(() => vouchers.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("purchase_patterns_voucher_uq").on(t.voucherId),
    index("purchase_patterns_wa_number_idx").on(t.waNumber),
    index("purchase_patterns_issuing_sid_idx").on(t.issuingSid),
    index("purchase_patterns_home_sid_idx").on(t.homeSid),
    index("purchase_patterns_is_cross_shop_idx").on(t.isCrossShop),
    index("purchase_patterns_week_id_idx").on(t.weekId),
  ]
);

// ---------------------------------------------------------------------------
// outbound_messages
// Every WhatsApp message sent by WKW via S2S. Source of truth for delivery
// status correlation. Create the record before calling S2S so a failed call
// still has a row for retry. request_key uniqueness prevents duplicate sends
// even on application retries. Update provider_message_id immediately when
// S2S returns the wamid. Delivery status is updated via delivery_events.
// purpose values: registration_complete | prediction_link | weekly_broadcast |
//   winner_notification | weekly_reminder
// ---------------------------------------------------------------------------
export const outboundMessages = pgTable(
  "outbound_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    referenceId: text("reference_id").notNull(),
    requestKey: text("request_key").notNull(),
    waNumber: text("wa_number").notNull(),
    messageBody: text("message_body").notNull(),
    providerMessageId: text("provider_message_id"),
    purpose: text("purpose").notNull(),
    weekId: text("week_id"),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    lastStatus: deliveryStatusEnum("last_status"),
    lastStatusAt: timestamp("last_status_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("outbound_messages_reference_id_uq").on(t.referenceId),
    uniqueIndex("outbound_messages_request_key_uq").on(t.requestKey),
    index("outbound_messages_wa_number_idx").on(t.waNumber),
    index("outbound_messages_provider_msg_id_idx").on(t.providerMessageId),
    index("outbound_messages_week_id_idx").on(t.weekId),
    index("outbound_messages_purpose_idx").on(t.purpose),
  ]
);

// ---------------------------------------------------------------------------
// delivery_events
// Immutable log of every delivery status callback received from S2S. Inserts
// must be idempotent: use ON CONFLICT (provider_message_id, status) DO NOTHING.
// After a successful insert, update outbound_messages.last_status to reflect
// the latest state. failure_code and failure_reason are only populated when
// status = 'failed'. raw_payload stores the full callback body for debugging.
// ---------------------------------------------------------------------------
export const deliveryEvents = pgTable(
  "delivery_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerMessageId: text("provider_message_id").notNull(),
    referenceId: text("reference_id"),
    toNumber: text("to_number").notNull(),
    status: deliveryStatusEnum("status").notNull(),
    statusAt: timestamp("status_at", { withTimezone: true }).notNull(),
    failureCode: text("failure_code"),
    failureReason: text("failure_reason"),
    rawPayload: jsonb("raw_payload"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("delivery_events_msg_status_uq").on(t.providerMessageId, t.status),
    index("delivery_events_provider_msg_idx").on(t.providerMessageId),
    index("delivery_events_reference_id_idx").on(t.referenceId),
    index("delivery_events_status_idx").on(t.status),
    index("delivery_events_status_at_idx").on(t.statusAt),
  ]
);

// ---------------------------------------------------------------------------
// inbound_webhook_events
// Deduplication cache for inbound WhatsApp messages. Prevents re-processing
// S2S retries. On every inbound message: check for an existing row by
// (provider, message_id) — if found, replay response_body immediately (200).
// If not found, process the message, then insert ON CONFLICT DO NOTHING.
// message_hash is SHA-256 of '{wa_number}|{message}' — for audit only.
// Records older than 30 days should be deleted by a cleanup job.
// ---------------------------------------------------------------------------
export const inboundWebhookEvents = pgTable(
  "inbound_webhook_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: text("provider").notNull().default("s2s"),
    messageId: text("message_id").notNull(),
    waNumber: text("wa_number").notNull(),
    responseBody: text("response_body").notNull(),
    messageHash: text("message_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("inbound_webhook_events_provider_msg_uq").on(t.provider, t.messageId),
    index("inbound_webhook_events_wa_number_idx").on(t.waNumber),
    index("inbound_webhook_events_created_at_idx").on(t.createdAt),
  ]
);

// ---------------------------------------------------------------------------
// prize_draws
// Immutable winners log. One row per prize tier per week. The draw engine
// removes each winner from the pool before drawing the next tier (no duplicate
// winners per week). Before running a draw, check this table for existing
// week_id rows to prevent running the draw twice. Outbound winner notifications
// are queued separately via outbound_messages.
// ---------------------------------------------------------------------------
export const prizeDraws = pgTable(
  "prize_draws",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    weekId: text("week_id").notNull(),
    waNumber: text("wa_number").notNull(),
    prizeCode: text("prize_code").notNull(),
    message: text("message").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("prize_draws_week_id_idx").on(t.weekId),
    index("prize_draws_wa_number_idx").on(t.waNumber),
  ]
);
