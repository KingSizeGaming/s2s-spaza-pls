import Link from 'next/link';
import localFont from 'next/font/local';
import {getCurrentWeekId} from '@/lib/week';
import {getBaseUrl} from '@/lib/url';
import WeekList from '@/components/WeekList';
import Logo from '../ui/Logo';
import EntriesErrorModal from '@/components/modals/EntriesErrorModal';

const hitRoad = localFont({
  src: "../../../public/fonts/hitroad.ttf",
  display: "swap",
});

type LeaderboardDetailResponse = {
  weekId: string;
  leaderboardId: string;
  weeks: {id: string; weekId: string; submittedAt: string}[];
  error?: string;
};

export default async function EntriesPage({params, searchParams}: {params: Promise<{leaderboardId: string}>; searchParams?: Promise<{weekId?: string; token?: string}>}) {
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
    const backHref = `/leaderboard${weekIdQuery ? `?weekId=${weekIdQuery}` : ''}`;
    return <EntriesErrorModal message={data.error ?? 'Unable to view this leaderboard.'} backHref={backHref} />;
  }

  return (
    <main className={'flex justify-center min-h-screen ' + hitRoad.className}>
      <div className={`w-full max-w-125 px-6 flex flex-col items-center bg-[url('/images/bg-purple.webp')] bg-cover bg-center `}>
        <Logo />

        <div className="relative w-full flex flex-col h-[70vh] mt-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/entry_big_frame_panel.png" alt="" className="absolute inset-0 w-full h-full object-fill" />
          <div className="relative z-10 flex flex-col px-3 flex-1 min-h-0">
            <div className="mx-auto -mt-4 relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/entry_header_text_bg_panel.png" alt="" className="w-48 h-auto" />
              <span className="absolute inset-0 flex items-center justify-center text-xl font-extrabold tracking-wide"></span>
            </div>
            <div className="text-center text-2xl shrink-0">{data.leaderboardId}</div>
            <div className="relative mx-auto shrink-0 mb-2">
              {/* <img src="/images/current_frame_panel.png" alt="" className="w-56 h-auto" /> */}
              <span className=" flex items-center text-yellow-200 font-semibold justify-center text-sm uppercase">Current Week: {currentWeekId}</span>
            </div>
            <div className="flex-1 max-h-[60%] mx-6 overflow-y-auto wkw-scrollbar">
              {data.weeks.length === 0 ? <p className="text-center text-sm text-white/80">No entries found.</p> : <WeekList weeks={data.weeks} currentWeekId={currentWeekId} leaderboardId={data.leaderboardId} token={token} />}
            </div>
          </div>
        </div>
        <div className="flex justify-center -mt-3">
          <Link
            href={`/leaderboard?weekId=${data.weekId}${token ? `&token=${token}` : ''}`}
            className="w-40 h-14 bg-[url('/images/back_button_untapped.png')] bg-contain bg-center bg-no-repeat active:bg-[url('/images/back_button_tapped.png')] block"
          />
        </div>
      </div>
    </main>
  );
}
