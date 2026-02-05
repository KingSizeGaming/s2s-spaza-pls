import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { getCurrentWeekId } from "@/lib/week";

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({
      status: "ok",
      db: true,
      weekId: getCurrentWeekId(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        status: "error",
        db: false,
        weekId: getCurrentWeekId(),
        error: message,
      },
      { status: 500 }
    );
  }
}