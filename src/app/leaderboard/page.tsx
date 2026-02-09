import { headers } from "next/headers";
import LeaderboardList from "./leaderboard-list";

async function getBaseUrl(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

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
    <main className="min-h-screen bg-white">
      <div className="mx-auto flex min-h-screen w-full max-w-[390px] items-center px-4 py-6">
        <div className="relative h-[844px] w-full scale-[1.35] overflow-hidden rounded-3xl">
          <img
            src="/images/bg_1.png"
            alt="Background"
            className="absolute inset-0 h-full w-full object-cover opacity-90"
          />
          <div className="relative z-10 flex h-full flex-col px-5 py-8">
            <h1 className="text-center text-3xl font-bold text-white">
              This Week's
              <br />
              Leaderboard
            </h1>

            <div className="mt-5 flex flex-1 flex-col overflow-hidden rounded-3xl bg-[url('/images/leaderboard_bg.png')] bg-cover bg-center px-3 py-5">
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
      </div>
    </main>
  );
}
