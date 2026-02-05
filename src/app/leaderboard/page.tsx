import { headers } from "next/headers";
import Link from "next/link";

async function getBaseUrl(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

type LeaderboardRow = {
  leaderboardId: string | null;
  entryCount: number;
};

type LeaderboardResponse = {
  weekId: string;
  leaderboards: LeaderboardRow[];
};

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams?: { weekId?: string };
}) {
  const weekIdQuery = searchParams?.weekId;
  const baseUrl = await getBaseUrl();
  const res = await fetch(
    `${baseUrl}/api/leaderboard${weekIdQuery ? `?weekId=${weekIdQuery}` : ""}`,
    { cache: "no-store" }
  );
  const data = (await res.json()) as LeaderboardResponse;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-16">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
          S2S Spaza PSL POC
        </p>
        <h1 className="text-3xl font-semibold">Leaderboards</h1>
        <p className="text-sm text-zinc-600">Week: {data.weekId}</p>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        {data.leaderboards.length === 0 ? (
          <p className="text-sm text-zinc-600">No entries yet.</p>
        ) : (
          <ul className="space-y-3">
            {data.leaderboards.map((row) => (
              <li
                key={row.leaderboardId ?? "unknown"}
                className="flex items-center justify-between rounded-xl border border-zinc-100 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-zinc-900">
                    {row.leaderboardId ?? "Unknown"}
                  </p>
                  <p className="text-xs text-zinc-500">
                    Entries: {row.entryCount}
                  </p>
                </div>
                {row.leaderboardId && (
                  <Link
                    className="text-sm font-medium text-zinc-900"
                    href={`/leaderboard/${row.leaderboardId}?weekId=${data.weekId}`}
                  >
                    View
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
