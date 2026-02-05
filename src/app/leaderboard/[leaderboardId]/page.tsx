import { headers } from "next/headers";
import Link from "next/link";

function getBaseUrl(): string {
  const headerList = headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

type LeaderboardDetailResponse = {
  weekId: string;
  leaderboardId: string;
  entries: { submittedAt: string; summary: string }[];
};

export default async function LeaderboardDetailPage({
  params,
  searchParams,
}: {
  params: { leaderboardId: string };
  searchParams?: { weekId?: string };
}) {
  const weekIdQuery = searchParams?.weekId;
  const baseUrl = getBaseUrl();
  const res = await fetch(
    `${baseUrl}/api/leaderboard/${params.leaderboardId}${ 
      weekIdQuery ? `?weekId=${weekIdQuery}` : ""
    }`,
    { cache: "no-store" }
  );

  const data = (await res.json()) as LeaderboardDetailResponse;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-16">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
          S2S Spaza PSL POC
        </p>
        <h1 className="text-3xl font-semibold">Leaderboard {data.leaderboardId}</h1>
        <p className="text-sm text-zinc-600">Week: {data.weekId}</p>
        <Link className="text-sm font-medium text-zinc-900" href={`/leaderboard?weekId=${data.weekId}`}>
          Back to leaderboards
        </Link>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        {data.entries.length === 0 ? (
          <p className="text-sm text-zinc-600">No entries found.</p>
        ) : (
          <ul className="space-y-3">
            {data.entries.map((entry) => (
              <li
                key={`${entry.submittedAt}-${entry.summary}`}
                className="rounded-xl border border-zinc-100 px-4 py-3"
              >
                <p className="text-xs text-zinc-500">{entry.submittedAt}</p>
                <p className="mt-2 text-sm font-semibold text-zinc-900">
                  {entry.summary}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
