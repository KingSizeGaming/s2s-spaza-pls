import Link from 'next/link';
import {getCurrentWeekId} from '@/lib/week';
import {getLeaderboardDetail} from '@/lib/queries/leaderboard';
import WeekList from '@/components/WeekList';
import Logo from '../ui/Logo';
import EntriesErrorModal from '@/components/modals/EntriesErrorModal';

export default async function EntriesPage({params, searchParams}: {params: Promise<{leaderboardId: string}>; searchParams?: Promise<{weekId?: string; token?: string}>}) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const currentWeekId = getCurrentWeekId();
  const weekIdQuery = resolvedSearchParams?.weekId;
  const token = resolvedSearchParams?.token;

  const data = await getLeaderboardDetail({ leaderboardId: resolvedParams.leaderboardId, weekId: weekIdQuery, token });

  if (!data.ok) {
    const backHref = `/leaderboard${weekIdQuery ? `?weekId=${weekIdQuery}` : ''}`;
    return <EntriesErrorModal message={data.error ?? 'Unable to view this leaderboard.'} backHref={backHref} />;
  }

  return (
    <main className="flex justify-center min-h-screen font-hitroad">
      <div className={`w-full max-w-125 px-4 sm:px-6 flex flex-col items-center bg-[url('/images/bg-purple.webp')] bg-cover bg-center `}>
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
            <div className="text-center text-xl sm:text-2xl tracking-wider shrink-0">{data.leaderboardId}</div>
            <div className="relative mx-auto -mt-2 shrink-0 ">
              {/* <img src="/images/current_frame_panel.png" alt="" className="w-56 h-auto" /> */}
              <span className="flex items-center text-yellow-dark font-semibold justify-center text-lg uppercase">Current Week: {currentWeekId}</span>
            </div>
            <div className="flex-1 max-h-[60%] mx-2 sm:mx-6 overflow-y-auto wkw-scrollbar">
              {data.weeks.length === 0 ? <p className="text-center text-sm text-white">No entries found.</p> : <WeekList weeks={data.weeks} currentWeekId={currentWeekId} leaderboardId={data.leaderboardId} token={token} />}
            </div>
          </div>
        </div>
        <div className="flex justify-center -mt-3">
          <Link
            href={`/leaderboard?weekId=${data.weekId}${token ? `&token=${token}` : ''}`}
            className="w-32 h-12 sm:w-40 sm:h-14 bg-[url('/images/back_button_untapped.png')] bg-contain bg-center bg-no-repeat active:bg-[url('/images/back_button_tapped.png')] block"
          />
        </div>
      </div>
    </main>
  );
}
