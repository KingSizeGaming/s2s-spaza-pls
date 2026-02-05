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
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-16">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            S2S Spaza PSL POC
          </p>
          <h1 className="text-3xl font-semibold">Leaderboard Access</h1>
          <p className="text-sm text-zinc-600">
            {data.error ?? "Unable to view this leaderboard."}
          </p>
        </header>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-16">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
          S2S Spaza PSL POC
        </p>
        <h1 className="text-3xl font-semibold">Leaderboard {data.leaderboardId}</h1>
        <p className="text-sm text-zinc-600">Week: {data.weekId}</p>
        <Link
          className="text-sm font-medium text-zinc-900"
          href={`/leaderboard?weekId=${data.weekId}`}
        >
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
                <p className="text-xs text-zinc-500">
                  {entry.submittedAt} {entry.weekId ? `· ${entry.weekId}` : ""}
                </p>
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
