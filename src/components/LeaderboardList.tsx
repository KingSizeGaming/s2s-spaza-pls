"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { TrophyGoldIcon, TrophySilverIcon, TrophyBronzeIcon } from "@/components/ui/icons";
import LoadingModal from "@/components/modals/LoadingModal";

type LeaderboardRow = {
  leaderboardId: string | null;
  entryCount: number;
  totalPoints: number;
  canView?: boolean;
};

export default function LeaderboardList({
  leaderboards,
  weekId,
  token,
  hasToken,
}: {
  leaderboards: LeaderboardRow[];
  weekId: string;
  token?: string;
  hasToken: boolean;
}) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const buildHref = (leaderboardId: string) =>
    `/leaderboard/${leaderboardId}?weekId=${weekId}${token ? `&token=${token}` : ""}`;

  return (
    <div className="relative">
      <ul className="space-y-3 overflow-y-auto pr-1">
        {leaderboards.map((row, index) => {
          const TrophyComponent = index === 0 ? TrophyGoldIcon : index === 1 ? TrophySilverIcon : index === 2 ? TrophyBronzeIcon : null;
          const content = (
            <div className="relative flex h-16 bg-green-dark items-center justify-between overflow-hidden rounded-2xl px-5 text-white">
              {/* <Image
                src="/images/player_panel.png"
                alt="Player"
                fill
                sizes="100vw"
                className="absolute inset-0 h-full w-full object-cover"
              /> */}
              <div className="relative z-10 text-lg font-semibold">
                {row.leaderboardId ?? "Unknown"}
              </div>
              <div className="relative z-10 flex items-center">
                <Image
                  src="/images/pts_panel.png"
                  alt="Points"
                  width={64}
                  height={40}
                  className="h-10 w-16 object-contain"
                />
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                  {row.totalPoints}ps
                </span>

                {TrophyComponent && <span className="absolute -top-2 -right-5"><TrophyComponent size={40} /></span>}

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

          return <li key={row.leaderboardId ?? "unknown"}>{content}</li>;
        })}
      </ul>

      {loadingId && <LoadingModal />}
    </div>
  );
}
