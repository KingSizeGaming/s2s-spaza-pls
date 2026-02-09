import { headers } from "next/headers";
import Link from "next/link";
import { getCurrentWeekId } from "@/lib/week";
import WeekList from "./week-list";

async function getBaseUrl(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

type LeaderboardDetailResponse = {
  weekId: string;
  leaderboardId: string;
  weeks: { weekId: string; entriesCount: number; latestSubmittedAt: string }[];
  error?: string;
};

export default async function LeaderboardDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ leaderboardId: string }>;
  searchParams?: Promise<{ weekId?: string; token?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const currentWeekId = getCurrentWeekId();
  const weekIdQuery = resolvedSearchParams?.weekId;
  const token = resolvedSearchParams?.token;
  const baseUrl = await getBaseUrl();
  const queryParts = new URLSearchParams();
  if (weekIdQuery) queryParts.set("weekId", weekIdQuery);
  if (token) queryParts.set("token", token);
  const queryString = queryParts.toString();
  const res = await fetch(
    `${baseUrl}/api/leaderboard/${resolvedParams.leaderboardId}${
      queryString ? `?${queryString}` : ""
    }`,
    { cache: "no-store" }
  );

  const data = (await res.json()) as LeaderboardDetailResponse;

  if (!res.ok) {
    return (
      <main className="min-h-screen bg-white">
        <div className="mx-auto flex min-h-screen w-full max-w-[390px] items-center px-4 py-6">
          <div className="relative h-[844px] w-full scale-[1.35] overflow-hidden rounded-3xl">
            <img
              src="/images/bg_1.png"
              alt="Background"
              className="absolute inset-0 h-full w-full object-cover opacity-90"
            />
            <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-white">
              <h1 className="text-center text-2xl font-bold">Access denied</h1>
              <p className="mt-3 text-center text-sm text-white/80">
                {data.error ?? "Unable to view this leaderboard."}
              </p>
              <Link
                className="mt-6 text-sm font-semibold text-white"
                href={`/leaderboard${weekIdQuery ? `?weekId=${weekIdQuery}` : ""}`}
              >
                Back to leaderboards
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto flex min-h-screen w-full max-w-[390px] items-center px-4 py-6">
        <div className="relative h-[844px] w-full scale-[1.35] overflow-hidden rounded-3xl">
          <img
            src="/images/bg_1.png"
            alt="Background"
            className="absolute inset-0 h-full w-full object-cover opacity-90"
          />
          <div className="relative z-10 flex h-full flex-col px-5 py-8 text-white">
            <h1 className="text-center text-3xl font-bold">Your Entries</h1>
            <p className="mt-2 text-center text-sm text-white/80">
              {data.leaderboardId}
            </p>
            <p className="mt-1 text-center text-xs uppercase tracking-[0.2em] text-amber-100/90">
              Current Week: {currentWeekId}
            </p>

            <div className="mt-5 flex flex-1 flex-col overflow-hidden rounded-3xl bg-[url('/images/leaderboard_bg.png')] bg-cover bg-center px-3 py-5">
              {data.weeks.length === 0 ? (
                <p className="text-center text-sm text-white/80">No entries found.</p>
              ) : (
                <WeekList
                  weeks={data.weeks}
                  currentWeekId={currentWeekId}
                  leaderboardId={data.leaderboardId}
                  token={token}
                />
              )}
            </div>

            <Link
              className="mt-4 text-center text-sm font-semibold text-white"
              href={`/leaderboard?weekId=${data.weekId}${token ? `&token=${token}` : ""}`}
            >
              Back to leaderboards
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
