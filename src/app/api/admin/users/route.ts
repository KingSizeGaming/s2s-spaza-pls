import { NextRequest, NextResponse } from "next/server";
import { ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (!q) {
    return NextResponse.json({ ok: false, error: "Missing query." }, { status: 400 });
  }

  const rows = await db
    .select({
      id: users.id,
      waNumber: users.waNumber,
      state: users.state,
      firstName: users.firstName,
      lastName: users.lastName,
      leaderboardId: users.leaderboardId,
      homeSid: users.homeSid,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(
      or(
        // digits-only match on wa_number
        sql`regexp_replace(${users.waNumber}, '[^0-9]', '', 'g') LIKE ${"%" + q.replace(/\D/g, "") + "%"}`,
        ilike(users.leaderboardId, `%${q}%`),
        ilike(users.firstName, `%${q}%`),
        ilike(users.lastName, `%${q}%`)
      )
    )
    .limit(20);

  return NextResponse.json({ ok: true, users: rows });
}
