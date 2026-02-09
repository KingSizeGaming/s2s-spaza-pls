import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { getCurrentWeekId } from "@/lib/week";

async function getBaseUrl(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

type WeekDetailResponse = {
  leaderboardId: string;
  weekId: string;
  submittedAt: string;
  matches: Array<{
    id: string;
    homeTeam: string;
    awayTeam: string;
    kickoffAt: string;
    pick: "H" | "D" | "A" | null;
    homeScore: number | null;
    awayScore: number | null;
    isFinished: boolean;
  }>;
  error?: string;
};

export default async function LeaderboardWeekDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ leaderboardId: string; weekId: string }>;
  searchParams?: Promise<{ token?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const currentWeekId = getCurrentWeekId();
  const token = resolvedSearchParams?.token;

  const baseUrl = await getBaseUrl();
  const query = new URLSearchParams();
  if (token) query.set("token", token);

  const res = await fetch(
    `${baseUrl}/api/leaderboard/${resolvedParams.leaderboardId}/week/${resolvedParams.weekId}?${query.toString()}`,
    { cache: "no-store" }
  );
  const data = (await res.json()) as WeekDetailResponse;

  if (!res.ok) {
    return (
      <main className="min-h-screen bg-white">
        <div className="mx-auto flex min-h-screen w-full max-w-[390px] items-center px-4 py-6">
          <div className="relative h-[844px] w-full scale-[1.35] overflow-hidden rounded-3xl">
            <Image
              src="/images/bg_1.png"
              alt="Background"
              fill
              sizes="100vw"
              className="absolute inset-0 h-full w-full object-cover opacity-90"
            />
            <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-white">
              <h1 className="text-center text-2xl font-bold">Unable to load week</h1>
              <p className="mt-3 text-center text-sm text-white/80">
                {data.error ?? "No picks available for this week."}
              </p>
              <Link
                className="mt-6 text-sm font-semibold text-white"
                href={`/leaderboard/${resolvedParams.leaderboardId}${token ? `?token=${token}` : ""}`}
              >
                Back to your weeks
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
          <Image
            src="/images/bg_1.png"
            alt="Background"
            fill
            sizes="100vw"
            className="absolute inset-0 h-full w-full object-cover opacity-90"
          />
          <div className="relative z-10 flex h-full flex-col px-5 py-8 text-white">
            <h1 className="text-center text-3xl font-bold">Your Picks</h1>
            <p className="mt-2 text-center text-sm text-white/80">
              {data.weekId}
            </p>
            <p className="mt-1 text-center text-xs uppercase tracking-[0.2em] text-amber-100/90">
              Current Week: {currentWeekId}
            </p>

            <div className="mt-5 flex-1 space-y-3 overflow-y-auto pr-1">
              {data.matches.map((match) => {
                const kickoff = new Date(match.kickoffAt);
                const kickoffLabel = Number.isNaN(kickoff.getTime())
                  ? "TBD"
                  : kickoff.toLocaleString("en-ZA", {
                      weekday: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                return (
                  <div key={match.id} className="relative overflow-hidden rounded-2xl">
                    <Image
                      src="/images/history_player_panel.png"
                      alt="Match panel"
                      fill
                      sizes="100vw"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="relative z-10 flex items-center justify-between gap-4 px-5 py-4 text-base font-semibold text-amber-100">
                      <div className="flex flex-col">
                        <span>{`${match.homeTeam} vs ${match.awayTeam}`}</span>
                        <span className="text-xs text-amber-100/80">{kickoffLabel}</span>
                        {match.isFinished && (
                          <span className="text-xs text-amber-100/80">
                            Score: {match.homeScore} - {match.awayScore}
                          </span>
                        )}
                      </div>
                      <div className="rounded-full border border-emerald-200/40 bg-black/50 px-3 py-1 text-sm text-white">
                        {match.pick ?? "-"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <Link
              className="mt-4 text-center text-sm font-semibold text-white"
              href={`/leaderboard/${data.leaderboardId}${token ? `?token=${token}` : ""}`}
            >
              Back to your weeks
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
