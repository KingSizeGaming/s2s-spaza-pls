import { NextRequest, NextResponse } from "next/server";
import { getEntryDetail } from "@/lib/queries/leaderboard";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leaderboardId: string; weekId: string }> }
) {
  const { searchParams } = new URL(request.url);
  const { leaderboardId, weekId } = await params;
  const result = await getEntryDetail({
    leaderboardId,
    weekId,
    token: searchParams.get("token"),
    entryId: searchParams.get("entryId"),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result);
}

