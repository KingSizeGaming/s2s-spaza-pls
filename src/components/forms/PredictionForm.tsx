"use client";

type Pick = "H" | "D" | "A";
type Match = {
  id: string;
  weekId: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
};

export default function PredictionForm({
  matches,
  picks,
  matchesLoading,
  onUpdatePickAction,
}: {
  matches: Match[];
  picks: (Pick | null)[];
  matchesLoading: boolean;
  onUpdatePickAction: (index: number, value: Pick) => void;
}) {
  return (
    <div className="font-arlrdbd">
      {matchesLoading && (
        <div className="p-4 text-center text-sm text-white/80">Loading matches...</div>
      )}
      {!matchesLoading && matches.length === 0 && (
        <div className="p-4 text-center text-sm text-white/80">No matches available for this week yet.</div>
      )}
      {matches.map((match, index) => {
        const pick = picks[index] ?? null;
        const kickoff = new Date(match.kickoffAt);
        const kickoffLabel = Number.isNaN(kickoff.getTime())
          ? "TBD"
          : kickoff.toLocaleString("en-ZA", { weekday: "long", hour: "2-digit", minute: "2-digit" });
        return (
          <div key={match.id} className="relative px-2 py-4 text-center -mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/content_frame_panel.png" alt="" className="absolute inset-0 w-full h-full object-fill" />
            <div className="relative z-10">
              <p className="font-medium text-2xl">{`${match.homeTeam} vs ${match.awayTeam}`}</p>
              <p className="text-md font-medium">{kickoffLabel}</p>
              <div className="flex justify-center -space-x-1">
                {/* {(["H", "D", "A"] as Pick[]).map((option) => {
                  const styles = {
                    H: { active: "bg-orange-500", inactive: "bg-gray-300 text-black" },
                    D: { active: "bg-yellow-400 text-black ", inactive: "bg-gray-300 text-black" },
                    A: { active: "bg-cyan-400 ", inactive: "bg-gray-300 text-black" },
                  }[option];
                  return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => onUpdatePickAction(index, option)}
                    className={`rounded-lg px-3 py-1 tracking-wide font-bold transition ${
                      pick === option ? styles.active : styles.inactive
                    }`}
                  >
                    {option === "H" ? "HOME" : option === "D" ? "DRAW" : "AWAY"}
                  </button>
                  );
                })} */}
                {(["H", "D", "A"] as Pick[]).map((option) => {
                  const images = {
                    H: { picked: "/images/home_button_picked.png", untapped: "/images/home_button_untapped.png" },
                    D: { picked: "/images/draw_button_picked.png", untapped: "/images/draw_button_untapped.png" },
                    A: { picked: "/images/away_button_picked.png", untapped: "/images/away_button_untapped.png" },
                  }[option];
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => onUpdatePickAction(index, option)}
                      className="w-28 h-14 bg-contain bg-center bg-no-repeat transition"
                      style={{ backgroundImage: `url('${pick === option ? images.picked : images.untapped}')` }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
