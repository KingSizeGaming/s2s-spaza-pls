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
              <div className="relative flex min-h-16 items-center justify-between px-5 py-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/entry_content_frame_panel.png" alt="" className="absolute inset-0 w-full h-full object-fill" />
                <div className="relative z-10 flex flex-col">
                  <span className="text-sm font-semibold text-white">
                    {new Date(week.submittedAt).toLocaleString("en-ZA", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="text-sm ms-2 font-semibold text-white">{week.weekId}</span>
                </div>
                {week.weekId === currentWeekId && (
                  <div className="relative z-10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/images/current_frame_panel.png" alt="" className="w-26 h-auto" />
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold tracking-wider"></span>
                  </div>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {loadingWeekId && <LoadingModal />}
    </div>
  );
}
