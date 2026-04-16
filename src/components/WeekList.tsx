"use client";

import Image from "next/image";
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
      <ul className=" overflow-y-auto pr-1">
        {weeks.map((week) => (
          <li key={week.id}>
            <Link
              href={`/leaderboard/${leaderboardId}/week/${week.weekId}?entryId=${week.id}${token ? `&token=${token}` : ""}`}
              onClick={() => setLoadingWeekId(week.weekId)}
            >
              <div className="relative flex min-h-16 items-center justify-between px-7 py-3">
                <Image src="/images/entry_content_frame_panel.png" alt="" fill sizes="(max-width: 500px) 100vw, 500px" style={{ objectFit: 'fill' }} />
                <div className="relative z-10 flex flex-col">
                  <span className="font-semibold -mb-1 text-white tracking-wider">
                    {new Date(week.submittedAt).toLocaleString("en-ZA", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="ms-2 font-semibold mb-2 text-white tracking-wider">{week.weekId}</span>
                </div>
                {week.weekId === currentWeekId && (
                  <div className="relative z-10">
                    <Image src="/images/current_frame_panel.png" alt="" width={112} height={32} sizes="112px" className="w-28 h-auto mb-2" />
                    {/* <span className="absolute inset-0 flex items-center justify-center text-xs font-bold tracking-wider"></span> */}
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
