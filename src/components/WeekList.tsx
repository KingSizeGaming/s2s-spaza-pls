"use client";

import Link from "next/link";
import { useState } from "react";
import LoadingModal from "@/components/modals/LoadingModal";

type WeekRow = {
  id: string;
  weekId: string;
  submittedAt: string;
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
          <li key={week.id}>
            <Link
              href={`/leaderboard/${leaderboardId}/week/${week.weekId}?entryId=${week.id}${token ? `&token=${token}` : ""}`}
              onClick={() => setLoadingWeekId(week.weekId)}
            >
              <div className="relative bg-green-dark flex min-h-16 flex-col justify-center overflow-hidden rounded-2xl px-5 py-3">
    
                <div className="relative z-10 text-xs text-white/80">
                  {new Date(week.submittedAt).toLocaleString("en-ZA", {
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

      {loadingWeekId && <LoadingModal />}
    </div>
  );
}
