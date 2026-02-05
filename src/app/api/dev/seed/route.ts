import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { spazaSids, vouchers } from "@/db/schema";
import { getCurrentWeekId } from "@/lib/week";

function assertAdminKey(request: NextRequest) {
  const expected = process.env.DEMO_ADMIN_KEY;
  if (!expected) {
    return { ok: false, status: 500, error: "DEMO_ADMIN_KEY is not set" } as const;
  }

  const provided = request.headers.get("x-demo-admin-key");
  if (!provided || provided !== expected) {
    return { ok: false, status: 401, error: "Unauthorized" } as const;
  }

  return { ok: true } as const;
}

export async function POST(request: NextRequest) {
  const auth = assertAdminKey(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const weekId = getCurrentWeekId();

  const seededSids = await db
    .insert(spazaSids)
    .values([
      { sid: "123456", name: "Spaza 1", isActive: true },
      { sid: "123457", name: "Spaza 2", isActive: true },
    ])
    .onConflictDoNothing()
    .returning({ sid: spazaSids.sid });

  const seededVouchers = await db
    .insert(vouchers)
    .values([
      { voucherToken: "A123", issuingSid: "123456", weekId, isUsed: false },
      { voucherToken: "B123", issuingSid: "123457", weekId, isUsed: false },
    ])
    .onConflictDoNothing()
    .returning({ id: vouchers.id });

  return NextResponse.json({
    ok: true,
    weekId,
    seeded: {
      spazaSids: seededSids.length,
      vouchers: seededVouchers.length,
    },
  });
}
