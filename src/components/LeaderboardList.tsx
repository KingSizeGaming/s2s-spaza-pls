'use client';

import Image from 'next/image';
import Link from 'next/link';
import {useState} from 'react';
import LoadingModal from '@/components/modals/LoadingModal';

type LeaderboardRow = {
  leaderboardId: string | null;
  entryCount: number;
  totalPoints: number;
  canView?: boolean;
};

export default function LeaderboardList({leaderboards, weekId, token, hasToken}: {leaderboards: LeaderboardRow[]; weekId: string; token?: string; hasToken: boolean}) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const buildHref = (leaderboardId: string) => `/leaderboard/${leaderboardId}?weekId=${weekId}${token ? `&token=${token}` : ''}`;

  return (
    <div className="relative">
      <ul className="overflow-y-auto px-3 pr-1 pt-4 wkw-scrollbar">
        {leaderboards.map((row, index) => {
          const hasCrown = index < 1;
          const content = (
            <div className="relative flex h-16 items-center justify-between px-5 text-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/player_info_panel.png" alt="" className="absolute inset-0 w-full h-full object-fill" />
              {hasCrown && <Image src="/images/crown.png" alt="" width={20} height={20} className="absolute top-0.5 -translate-y-1/2 -left-4 w-14 z-20" />}
              <div className="relative z-10 flex items-center">
                <span className="text-2xl tracking-wider ms-3 font-semibold">{row.leaderboardId ?? 'Unknown'}</span>
              </div>
              <div className="relative z-10 flex items-center">
                <span className="right-11 absolute flex items-center justify-center text-2xl tracking-wider font-bold">{row.totalPoints}ps</span>
              </div>
            </div>
          );

          if (row.leaderboardId && row.canView && hasToken) {
            return (
              <li key={row.leaderboardId}>
                <Link href={buildHref(row.leaderboardId)} onClick={() => setLoadingId(row.leaderboardId)}>
                  {content}
                </Link>
              </li>
            );
          }

          return <li key={row.leaderboardId ?? 'unknown'}>{content}</li>;
        })}
      </ul>

      {loadingId && <LoadingModal />}
    </div>
  );
}
