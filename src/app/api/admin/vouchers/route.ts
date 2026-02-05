import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { vouchers } from "@/db/schema";
import { getCurrentWeekId } from "@/lib/week";

type VoucherInput = {
  voucherToken: string;
  issuingSid: string;
  weekId: string;
};

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const defaultWeekId = String(body?.weekId ?? "").trim() || getCurrentWeekId();
  const items = Array.isArray(body?.vouchers) ? body.vouchers : null;

  if (!items || items.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Missing vouchers array." },
      { status: 400 }
    );
  }

  const rows: VoucherInput[] = [];
  for (const item of items) {
    const voucherToken = String(item?.voucherToken ?? "").trim();
    const issuingSid = String(item?.issuingSid ?? "").trim();
    const weekId = String(item?.weekId ?? "").trim() || defaultWeekId;
    if (!voucherToken || !issuingSid || !weekId) {
      return NextResponse.json(
        { ok: false, error: "Each voucher needs voucherToken, issuingSid, weekId." },
        { status: 400 }
      );
    }
    rows.push({ voucherToken, issuingSid, weekId });
  }

  const inserted = await db
    .insert(vouchers)
    .values(rows.map((row) => ({ ...row, isUsed: false })))
    .onConflictDoNothing()
    .returning({ id: vouchers.id });

  return NextResponse.json({
    ok: true,
    weekId: defaultWeekId,
    requested: rows.length,
    created: inserted.length,
    skipped: rows.length - inserted.length,
  });
}
