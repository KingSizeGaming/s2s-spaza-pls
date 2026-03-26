"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

type WeekRow = {
  weekId: string;
  entriesCount: number;
  latestSubmittedAt: string;
};

export default function WeekList({
  weeks,
  currentWeekId,
  leaderboardId,
  token,
}: {
  weeks: WeekRow[];
  currentWeekId: string;
  leaderboardId: string;
  token?: string;
}) {
  const [loadingWeekId, setLoadingWeekId] = useState<string | null>(null);

  return (
    <div className="relative flex-1 overflow-hidden">
      <ul className="space-y-3 overflow-y-auto pr-1">
        {weeks.map((week) => (
          <li key={week.weekId}>
            <Link
              href={`/leaderboard/${leaderboardId}/week/${week.weekId}${token ? `?token=${token}` : ""}`}
              onClick={() => setLoadingWeekId(week.weekId)}
            >
              <div className="relative flex min-h-[64px] flex-col justify-center overflow-hidden rounded-2xl px-5 py-3">
                <Image
                  src="/images/player_panel.png"
                  alt="Week entry"
                  fill
                  sizes="100vw"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="relative z-10 text-xs text-white/80">
                  {new Date(week.latestSubmittedAt).toLocaleString("en-ZA", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                <div className="relative z-10 flex items-center justify-between gap-3 text-sm font-semibold text-white">
                  <span>{week.weekId}</span>
                  {week.weekId === currentWeekId && (
                    <span className="rounded-full border border-amber-100/70 bg-amber-200/25 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-amber-100">
                      Current
                    </span>
                  )}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {loadingWeekId && (
        <div className="absolute inset-0 z-40 flex items-center justify-center rounded-3xl bg-black/40">
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-white/90 p-5 text-zinc-900 shadow-xl">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
            <p className="text-sm font-semibold">Loading history...</p>
          </div>
        </div>
      )}
    </div>
  );
}
