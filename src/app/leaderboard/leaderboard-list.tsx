"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

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

  const buildHref = (leaderboardId: string) => {
    return `/leaderboard/${leaderboardId}?weekId=${weekId}${token ? `&token=${token}` : ""}`;
  };

  return (
    <div className="relative">
      <ul className="space-y-3 overflow-y-auto pr-1">
        {leaderboards.map((row) => {
          const content = (
            <div className="relative flex h-16 items-center justify-between overflow-hidden rounded-2xl px-5 text-white">
              <Image
                src="/images/player_panel.png"
                alt="Player"
                fill
                sizes="100vw"
                className="absolute inset-0 h-full w-full object-cover"
              />
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
              </div>
            </div>
          );

          if (row.leaderboardId && row.canView && hasToken) {
            return (
              <li key={row.leaderboardId}>
                <Link
                  href={buildHref(row.leaderboardId)}
                  onClick={() => setLoadingId(row.leaderboardId)}
                >
                  {content}
                </Link>
              </li>
            );
          }

          return <li key={row.leaderboardId ?? "unknown"}>{content}</li>;
        })}
      </ul>

      {loadingId && (
        <div className="absolute inset-0 z-40 flex items-center justify-center rounded-3xl bg-black/40">
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-white/90 p-5 text-zinc-900 shadow-xl">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
            <p className="text-sm font-semibold">Loading...</p>
          </div>
        </div>
      )}
    </div>
  );
}
