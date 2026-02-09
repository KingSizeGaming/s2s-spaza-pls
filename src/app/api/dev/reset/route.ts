import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  entries,
  entryPicks,
  links,
  matches,
  prizeDraws,
  spazaSids,
  users,
  vouchers,
} from "@/db/schema";
import { getCurrentWeekId } from "@/lib/week";

function getIsoWeekYearAndWeek(date: Date): { year: number; week: number } {
  const utcDate = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((+utcDate - +yearStart) / 86400000 + 1) / 7);
  return { year: utcDate.getUTCFullYear(), week };
}

function getRealCurrentWeekId(date: Date = new Date()): string {
  const { year, week } = getIsoWeekYearAndWeek(date);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export async function POST() {
  const weekId = getRealCurrentWeekId();
  const configuredWeekId = getCurrentWeekId();

  const deletedPrizeDraws = await db.delete(prizeDraws).returning({ id: prizeDraws.id });
  const deletedEntryPicks = await db.delete(entryPicks).returning({ id: entryPicks.id });
  const deletedMatches = await db.delete(matches).returning({ id: matches.id });
  const deletedEntries = await db.delete(entries).returning({ id: entries.id });
  const deletedLinks = await db.delete(links).returning({ id: links.id });
  const deletedVouchers = await db.delete(vouchers).returning({ id: vouchers.id });
  const deletedUsers = await db.delete(users).returning({ id: users.id });
  const deletedSids = await db.delete(spazaSids).returning({ sid: spazaSids.sid });

  const seededSids = await db
    .insert(spazaSids)
    .values([
      { sid: "123458", name: "Spaza Three", isActive: true },
      { sid: "123459", name: "Spaza Four", isActive: true },
      { sid: "123460", name: "Spaza Five", isActive: true },
      { sid: "123461", name: "Spaza Six", isActive: true },
      { sid: "123462", name: "Spaza Seven", isActive: true },
    ])
    .returning({ sid: spazaSids.sid });

  const seededVouchers = await db
    .insert(vouchers)
    .values([
      { voucherToken: "C123", issuingSid: "123458", weekId, isUsed: false },
      { voucherToken: "C124", issuingSid: "123458", weekId, isUsed: false },
      { voucherToken: "D123", issuingSid: "123459", weekId, isUsed: false },
      { voucherToken: "D124", issuingSid: "123459", weekId, isUsed: false },
      { voucherToken: "E123", issuingSid: "123460", weekId, isUsed: false },
      { voucherToken: "E124", issuingSid: "123460", weekId, isUsed: false },
      { voucherToken: "F123", issuingSid: "123461", weekId, isUsed: false },
      { voucherToken: "F124", issuingSid: "123461", weekId, isUsed: false },
      { voucherToken: "G123", issuingSid: "123462", weekId, isUsed: false },
      { voucherToken: "G124", issuingSid: "123462", weekId, isUsed: false },
    ])
    .returning({ id: vouchers.id });

  return NextResponse.json({
    ok: true,
    weekId,
    configuredWeekId,
    cleared: {
      entries: deletedEntries.length,
      entryPicks: deletedEntryPicks.length,
      matches: deletedMatches.length,
      prizeDraws: deletedPrizeDraws.length,
      links: deletedLinks.length,
      vouchers: deletedVouchers.length,
      users: deletedUsers.length,
      spazaSids: deletedSids.length,
    },
    seeded: {
      spazaSids: seededSids.length,
      vouchers: seededVouchers.length,
    },
  });
}
