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
  picks: Pick[];
  matchesLoading: boolean;
  onUpdatePickAction: (index: number, value: Pick) => void;
}) {
  return (
    <div className="flex-1 min-h-0 h-full overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden space-y-3">
      {matchesLoading && (
        <div className="p-4 text-center text-sm text-white/80">Loading matches...</div>
      )}
      {!matchesLoading && matches.length === 0 && (
        <div className="p-4 text-center text-sm text-white/80">No matches available for this week yet.</div>
      )}
      {matches.map((match, index) => {
        const pick = picks[index] ?? "H";
        const kickoff = new Date(match.kickoffAt);
        const kickoffLabel = Number.isNaN(kickoff.getTime())
          ? "TBD"
          : kickoff.toLocaleString("en-ZA", { weekday: "short", hour: "2-digit", minute: "2-digit" });
        return (
          <div key={match.id} className="rounded-2xl bg-green-950 px-4 py-3 mb-2 text-center">
            <p className="font-extrabold text-white text-base">{`${match.homeTeam} vs ${match.awayTeam}`}</p>
            <p className="text-white/70 text-xs mb-2">{kickoffLabel}</p>
            <p className="text-white/60 text-xs mb-2">Select Your Pick!</p>
            <div className="flex justify-center gap-2">
              {(["H", "D", "A"] as Pick[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onUpdatePickAction(index, option)}
                  className={`rounded-full px-4 py-1 text-sm font-bold transition ${
                    pick === option
                      ? "bg-cyan-500 text-white shadow-[0_3px_0_#0e7490]"
                      : "bg-cyan-700/60 text-white/80"
                  }`}
                >
                  {option === "H" ? "HOME" : option === "D" ? "DRAW" : "AWAY"}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
