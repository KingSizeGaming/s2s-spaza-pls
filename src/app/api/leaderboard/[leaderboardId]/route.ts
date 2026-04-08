import { NextRequest, NextResponse } from "next/server";
import { getLeaderboardDetail } from "@/lib/queries/leaderboard";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leaderboardId: string }> }
) {
  const { searchParams } = new URL(request.url);
  const { leaderboardId } = await params;
  const result = await getLeaderboardDetail({
    leaderboardId,
    weekId: searchParams.get("weekId"),
    token: searchParams.get("token"),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result);
}
