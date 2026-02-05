import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { vouchers } from "@/db/schema";
import { getCurrentWeekId } from "@/lib/week";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawCode = searchParams.get("code") ?? "";
  const code = rawCode.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

  if (!code) {
    return NextResponse.json(
      { error: "Missing code." },
      { status: 400 }
    );
  }

  const weekId = getCurrentWeekId();
  const rows = await db
    .select({
      voucherToken: vouchers.voucherToken,
      weekId: vouchers.weekId,
      isUsed: vouchers.isUsed,
      issuingSid: vouchers.issuingSid,
    })
    .from(vouchers)
    .where(sql`upper(${vouchers.voucherToken}) = ${code}`)
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json({
      exists: false,
      code,
      weekId,
    });
  }

  const voucher = rows[0];
  return NextResponse.json({
    exists: true,
    code,
    weekId,
    isUsed: voucher.isUsed,
    weekMatch: voucher.weekId === weekId,
    issuingSid: voucher.issuingSid,
    voucherWeekId: voucher.weekId,
  });
}
