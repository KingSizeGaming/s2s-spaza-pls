import { NextRequest, NextResponse } from "next/server";
import { getLeaderboardList } from "@/lib/queries/leaderboard";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const result = await getLeaderboardList({
    weekId: searchParams.get("weekId"),
    token: searchParams.get("token"),
  });
  return NextResponse.json(result);
}
