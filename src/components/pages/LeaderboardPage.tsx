import LeaderboardList from "@/components/LeaderboardList";
import { getBaseUrl } from "@/lib/url";
import Logo from "../ui/Logo";

type LeaderboardRow = {
  leaderboardId: string | null;
  entryCount: number;
  totalPoints: number;
  canView?: boolean;
};

type LeaderboardResponse = {
  weekId: string;
  leaderboards?: LeaderboardRow[];
  error?: string;
};

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ weekId?: string; token?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const weekIdQuery = resolvedSearchParams?.weekId;
  const token = resolvedSearchParams?.token;
  const baseUrl = await getBaseUrl();
  const queryParts = new URLSearchParams();
  if (weekIdQuery) queryParts.set("weekId", weekIdQuery);
  if (token) queryParts.set("token", token);
  const queryString = queryParts.toString();
  const res = await fetch(
    `${baseUrl}/api/leaderboard${queryString ? `?${queryString}` : ""}`,
    { cache: "no-store" }
  );
  const data = (await res.json()) as LeaderboardResponse;
  const leaderboards = data.leaderboards ?? [];
  const hasToken = Boolean(token);

  return (
    <main className="flex justify-center h-screen overflow-hidden">
      <div className="bg-green-dark w-full max-w-125 px-6 py-10 flex flex-col items-center gap-6">
        <Logo />
        

        <div className="relative w-full flex-1 min-h-0 flex flex-col rounded-3xl bg-green-700 px-3 pt-12 mt-15 overflow-visible">
          <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* Page Title */}
          <h1 className="absolute -top-8 left-1/2 -translate-x-1/2 text-xl font-extrabold text-white tracking-wide border-2 border-yellow-500 rounded-xl bg-green-700 px-8 py-1 text-center z-10">
            This Week&apos;s <br></br>Leaderboard
          </h1>
          {leaderboards.length === 0 ? (
            <p className="text-center text-sm text-white/80">No entries yet.</p>
          ) : (
            <LeaderboardList
              leaderboards={leaderboards}
              weekId={data.weekId}
              token={token}
              hasToken={hasToken}
            />
          )}
          </div>
        </div>
      </div>
    </main>
  );
}
