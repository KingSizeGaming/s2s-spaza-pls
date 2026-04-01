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
    <div className="flex-1 min-h-0 h-full space-y-3">
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
          : kickoff.toLocaleString("en-ZA", { weekday: "long", hour: "2-digit", minute: "2-digit" });
        return (
          <div key={match.id} className="rounded-2xl bg-purple-dark px-4 py-3 mb-2 text-center">
            <p className="font-bold text-2xl">{`${match.homeTeam} vs ${match.awayTeam}`}</p>
            <p className="text-md font-bold mb-2">{kickoffLabel}</p>
            <div className="flex justify-center gap-2">
              {(["H", "D", "A"] as Pick[]).map((option) => {
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
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
