import Link from 'next/link';
import {getCurrentWeekId} from '@/lib/week';
import {getBaseUrl} from '@/lib/url';
import WeekList from '@/components/WeekList';
import Logo from '../ui/Logo';

type LeaderboardDetailResponse = {
  weekId: string;
  leaderboardId: string;
  weeks: {id: string; weekId: string; submittedAt: string}[];
  error?: string;
};

export default async function LeaderboardDetailPage({params, searchParams}: {params: Promise<{leaderboardId: string}>; searchParams?: Promise<{weekId?: string; token?: string}>}) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const currentWeekId = getCurrentWeekId();
  const weekIdQuery = resolvedSearchParams?.weekId;
  const token = resolvedSearchParams?.token;
  const baseUrl = await getBaseUrl();
  const queryParts = new URLSearchParams();
  if (weekIdQuery) queryParts.set('weekId', weekIdQuery);
  if (token) queryParts.set('token', token);
  const queryString = queryParts.toString();
  const res = await fetch(`${baseUrl}/api/leaderboard/${resolvedParams.leaderboardId}${queryString ? `?${queryString}` : ''}`, {cache: 'no-store'});

  const data = (await res.json()) as LeaderboardDetailResponse;

  if (!res.ok) {
    return (
      <main className="flex justify-center h-screen overflow-hidden">
        <div className="bg-green-dark w-full max-w-125 px-6 py-10 flex flex-col items-center justify-center gap-4 text-white">
          <h1 className="text-center text-2xl font-bold">Access denied</h1>
          <p className="text-center text-sm text-white/80">{data.error ?? 'Unable to view this leaderboard.'}</p>
          <Link className="text-sm font-medium text-white" href={`/leaderboard${weekIdQuery ? `?weekId=${weekIdQuery}` : ''}`}>
            Back to Leaderboards
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex justify-center h-screen overflow-hidden">
      <div className="bg-green-dark w-full max-w-125 px-6 py-10 flex flex-col items-center gap-6">
        <Logo />

        <div className="relative w-full flex-1 flex flex-col rounded-3xl bg-green-700 px-3 pt-10 mt-12 overflow-visible">
          <h1 className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-xl font-extrabold text-white tracking-wide border-2 border-yellow-500 rounded-xl bg-green-700 px-8 py-2 text-center z-10">Your Entries</h1>

          <div className="text-center text-2xl">{data.leaderboardId}</div>
          <div className="text-center text-lg uppercase text-amber-100/90 mb-3">Current Week: {currentWeekId}</div>

          <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {data.weeks.length === 0 ? <p className="text-center text-sm text-white/80">No entries found.</p> : <WeekList weeks={data.weeks} currentWeekId={currentWeekId} leaderboardId={data.leaderboardId} token={token} />}
          </div>
        </div>
        <Link className="text-center text-sm font-medium text-white " href={`/leaderboard?weekId=${data.weekId}${token ? `&token=${token}` : ''}`}>
          Back to Leaderboards
        </Link>
      </div>
    </main>
  );
}
