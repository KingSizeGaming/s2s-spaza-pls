import Link from "next/link";

import { getBaseUrl } from "@/lib/url";
import Logo from "../ui/Logo";

type Pick = "H" | "D" | "A";

type WeekDetailResponse = {
  leaderboardId: string;
  weekId: string;
  submittedAt: string;
  matches: Array<{
    id: string;
    homeTeam: string;
    awayTeam: string;
    kickoffAt: string;
    pick: Pick | null;
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
  searchParams?: Promise<{ token?: string; entryId?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const token = resolvedSearchParams?.token;
  const entryId = resolvedSearchParams?.entryId;

  const baseUrl = await getBaseUrl();
  const query = new URLSearchParams();
  if (token) query.set("token", token);
  if (entryId) query.set("entryId", entryId);

  const res = await fetch(
    `${baseUrl}/api/leaderboard/${resolvedParams.leaderboardId}/week/${resolvedParams.weekId}?${query.toString()}`,
    { cache: "no-store" }
  );
  const data = (await res.json()) as WeekDetailResponse;

  const backHref = `/leaderboard/${resolvedParams.leaderboardId}${token ? `?token=${token}` : ""}`;

  if (!res.ok) {
    return (
      <main className="flex justify-center h-screen overflow-hidden">
        <div className="bg-green-dark w-full max-w-125 px-6 py-10 flex flex-col items-center justify-center gap-4 text-white">
          <h1 className="text-center text-2xl font-bold">Unable to load week</h1>
          <p className="text-center text-sm text-white/80">{data.error ?? "No picks available for this week."}</p>
          <Link className="text-sm font-medium text-white" href={backHref}>
            Back to your entries
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex justify-center h-screen overflow-hidden">
      <div className="bg-green-dark w-full max-w-125 px-6 py-10 flex flex-col items-center gap-8">
        <Logo />

        <div className="relative w-full flex-1 min-h-0 flex flex-col rounded-3xl bg-green-600 px-3 pt-8 mt-12 overflow-visible">
          <h1 className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-xl font-extrabold text-white tracking-wide border-2 border-yellow-500 rounded-xl bg-green-600 px-8 py-2 text-center z-10">Your Picks</h1>

          <div className="flex-1 min-h-0 mx-3 my-2 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden space-y-3">
            {data.matches.map((match) => {
              const kickoff = new Date(match.kickoffAt);
              const kickoffLabel = Number.isNaN(kickoff.getTime())
                ? "TBD"
                : kickoff.toLocaleString("en-ZA", { weekday: "short", hour: "2-digit", minute: "2-digit" });
              return (
                <div key={match.id} className="rounded-2xl bg-green-950 px-4 py-3 mb-2 text-center">
                  <p className="font-extrabold text-white text-base">{`${match.homeTeam} vs ${match.awayTeam}`}</p>
                  <p className="text-white/70 text-xs mb-2">{kickoffLabel}</p>
                  {match.isFinished && (
                    <p className="text-white/60 text-xs mb-2">Score: {match.homeScore} - {match.awayScore}</p>
                  )}
                  <div className="flex justify-center gap-2">
                    {(["H", "D", "A"] as Pick[]).map((option) => (
                      <button
                        key={option}
                        type="button"
                        disabled
                        className={`rounded-full px-4 py-1 text-sm font-bold ${
                          match.pick === option
                            ? "bg-cyan-500 text-white shadow-[0_3px_0_#0e7490]"
                            : "bg-cyan-700/60 text-white/80"
                        }`}
                      >
                        {option === "H" ? "HOME" : option === "D" ? "DRAW" : "AWAY"}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-center">
          <Link
            href={backHref}
            className="rounded-full py-3 px-12 font-extrabold text-white text-base tracking-wide shadow-lg"
            style={{ background: "linear-gradient(180deg, #4caf50 0%, #1b5e20 100%)", boxShadow: "0 4px 0 #0a3d0c" }}
          >
            Back
          </Link>
        </div>
      </div>
    </main>
  );
}
