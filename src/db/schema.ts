import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const userStateEnum = pgEnum("user_state", [
  "UNKNOWN",
  "PENDING_REGISTRATION",
  "ACTIVE",
]);

export const linkTypeEnum = pgEnum("link_type", ["REGISTRATION", "PREDICTION"]);

export const linkStatusEnum = pgEnum("link_status", ["VALID", "USED", "EXPIRED"]);

export const spazaSids = pgTable(
  "spaza_sids",
  {
    sid: text("sid").primaryKey(),
    name: text("name").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    isActiveIdx: index("spaza_sids_is_active_idx").on(table.isActive),
    nameIdx: index("spaza_sids_name_idx").on(table.name),
  })
);

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
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    waNumberUnique: uniqueIndex("users_wa_number_uq").on(table.waNumber),
    leaderboardUnique: uniqueIndex("users_leaderboard_id_uq").on(
      table.leaderboardId
    ),
    stateIdx: index("users_state_idx").on(table.state),
    homeSidIdx: index("users_home_sid_idx").on(table.homeSid),
  })
);

export const vouchers = pgTable(
  "vouchers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    voucherToken: text("voucher_token").notNull(),
    issuingSid: text("issuing_sid")
      .notNull()
      .references(() => spazaSids.sid),
    weekId: text("week_id").notNull(),
    isUsed: boolean("is_used").notNull().default(false),
    usedByWaNumber: text("used_by_wa_number"),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    voucherTokenUnique: uniqueIndex("vouchers_voucher_token_uq").on(
      table.voucherToken
    ),
    issuingSidIdx: index("vouchers_issuing_sid_idx").on(table.issuingSid),
    weekIdIdx: index("vouchers_week_id_idx").on(table.weekId),
    isUsedIdx: index("vouchers_is_used_idx").on(table.isUsed),
  })
);

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
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    tokenUnique: uniqueIndex("links_token_uq").on(table.token),
    waNumberIdx: index("links_wa_number_idx").on(table.waNumber),
    weekIdIdx: index("links_week_id_idx").on(table.weekId),
    statusIdx: index("links_status_idx").on(table.status),
    typeIdx: index("links_type_idx").on(table.type),
    expiresAtIdx: index("links_expires_at_idx").on(table.expiresAt),
  })
);

export const entries = pgTable(
  "entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    waNumber: text("wa_number").notNull(),
    weekId: text("week_id").notNull(),
    linkToken: text("link_token").notNull(),
    picks: jsonb("picks").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    linkTokenUnique: uniqueIndex("entries_link_token_uq").on(table.linkToken),
    waWeekIdx: index("entries_wa_week_idx").on(table.waNumber, table.weekId),
    linkTokenIdx: index("entries_link_token_idx").on(table.linkToken),
    submittedAtIdx: index("entries_submitted_at_idx").on(table.submittedAt),
  })
);
