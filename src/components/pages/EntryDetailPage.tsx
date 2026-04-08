import Link from "next/link";

import { getEntryDetail } from "@/lib/queries/leaderboard";
import Logo from "../ui/Logo";
import EntriesErrorModal from "@/components/modals/EntriesErrorModal";

type Pick = "H" | "D" | "A";

export default async function EntryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ leaderboardId: string; weekId: string }>;
  searchParams?: Promise<{ token?: string; entryId?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const token = resolvedSearchParams?.token;
  const entryId = resolvedSearchParams?.entryId;

  const data = await getEntryDetail({
    leaderboardId: resolvedParams.leaderboardId,
    weekId: resolvedParams.weekId,
    token,
    entryId,
  });

  const backHref = `/leaderboard/${resolvedParams.leaderboardId}${token ? `?token=${token}` : ""}`;

  if (!data.ok) {
    return <EntriesErrorModal message={data.error ?? "Unable to load week entry preview."} backHref={backHref} />;
  }

  return (
    <main className="flex justify-center min-h-screen font-hitroad">
      <div className="w-full max-w-125 px-4 sm:px-6 flex flex-col items-center bg-[url('/images/bg-purple.webp')] bg-cover bg-center">
        <Logo />

        <div className="relative w-full flex flex-col max-h-[80vh] mt-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/big_frame_panel.png" alt="" className="absolute inset-0 w-full h-full object-fill" />
          <div className="relative z-10 flex flex-col px-3 flex-1 min-h-0">
            <div className="mx-auto -mt-2 relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/header_text_bg_panel.png" alt="" className="w-48 h-auto" />
              <span className="absolute inset-0 flex items-center justify-center text-xl font-extrabold tracking-wide"></span>
            </div>
            <div className="flex-1 max-h-[78%] mx-2 sm:mx-6 overflow-y-auto wkw-scrollbar">
              {data.matches.map((match) => {
                const kickoff = match.kickoffAt ? new Date(match.kickoffAt) : null;
                const kickoffLabel = !kickoff || Number.isNaN(kickoff.getTime())
                  ? "TBD"
                  : kickoff.toLocaleString("en-ZA", { weekday: "long", hour: "2-digit", minute: "2-digit" });
                return (
                  <div key={match.id} className="relative px-2 py-4 text-center -mb-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/images/content_frame_panel.png" alt="" className="absolute inset-0 w-full h-full object-fill" />
                    <div className="relative z-10">
                      <p className="font-medium text-lg sm:text-2xl">{`${match.homeTeam} vs ${match.awayTeam}`}</p>
                      <p className="text-md font-medium">{kickoffLabel}</p>
                      {/* {match.isFinished && (
                        <p className="text-sm font-medium">Score: {match.homeScore} - {match.awayScore}</p>
                      )} */}
                      <div className="flex justify-center -space-x-6 sm:-space-x-5">
                        {(["H", "D", "A"] as Pick[]).map((option) => {
                          const images = {
                            H: { picked: "/images/home_button_picked.png", untapped: "/images/home_button_untapped.png" },
                            D: { picked: "/images/draw_button_picked.png", untapped: "/images/draw_button_untapped.png" },
                            A: { picked: "/images/away_button_picked.png", untapped: "/images/away_button_untapped.png" },
                          }[option];
                          return (
                            <div
                              key={option}
                              className="w-20 h-10 sm:w-28 sm:h-14 bg-contain bg-center bg-no-repeat"
                              style={{ backgroundImage: `url('${match.pick === option ? images.picked : images.untapped}')` }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex justify-center">
          <Link
            href={backHref}
            className="-mt-3 w-32 h-12 sm:w-40 sm:h-14 bg-[url('/images/back_button_untapped.png')] bg-contain bg-center bg-no-repeat active:bg-[url('/images/back_button_tapped.png')] block"
          />
        </div>
      </div>
    </main>
  );
}
