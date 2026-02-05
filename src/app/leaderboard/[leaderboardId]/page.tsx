import { headers } from "next/headers";
import Link from "next/link";

async function getBaseUrl(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

type LeaderboardDetailResponse = {
  weekId: string;
  leaderboardId: string;
  entries: { submittedAt: string; summary: string; weekId?: string }[];
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
              {data.leaderboardId} - Week {data.weekId}
            </p>

            <div className="mt-5 flex flex-1 flex-col overflow-hidden rounded-3xl bg-[url('/images/leaderboard_bg.png')] bg-cover bg-center px-3 py-5">
              {data.entries.length === 0 ? (
                <p className="text-center text-sm text-white/80">No entries found.</p>
              ) : (
                <ul className="space-y-3 overflow-y-auto pr-1">
                  {data.entries.map((entry) => (
                    <li key={`${entry.submittedAt}-${entry.summary}`}>
                      <div className="relative flex min-h-[64px] flex-col justify-center overflow-hidden rounded-2xl px-5 py-3">
                        <img
                          src="/images/player_panel.png"
                          alt="Entry"
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                        <div className="relative z-10 text-xs text-white/80">
                          {entry.submittedAt}
                          {entry.weekId ? ` - ${entry.weekId}` : ""}
                        </div>
                        <div className="relative z-10 text-sm font-semibold text-white">
                          {entry.summary}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
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
