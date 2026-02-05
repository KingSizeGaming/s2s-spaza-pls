import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { spazaSids } from "@/db/schema";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const sid = String(body?.sid ?? "").trim();
  const name = String(body?.name ?? "").trim();
  const isActive = body?.isActive !== undefined ? Boolean(body.isActive) : true;

  if (!sid || !name) {
    return NextResponse.json(
      { ok: false, error: "Missing sid or name." },
      { status: 400 }
    );
  }

  const inserted = await db
    .insert(spazaSids)
    .values({ sid, name, isActive })
    .onConflictDoNothing()
    .returning({ sid: spazaSids.sid });

  if (inserted.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Spaza SID already exists." },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true, sid });
}
