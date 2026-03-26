export type Pick = "H" | "D" | "A";

// Derives the match outcome (H/D/A) from home and away scores. Returns null if scores are not yet available.
export function outcomeFromScores(
  homeScore: number | null,
  awayScore: number | null
): Pick | null {
  if (homeScore === null || awayScore === null) return null;
  if (homeScore > awayScore) return "H";
  if (homeScore < awayScore) return "A";
  return "D";
}

// Returns the point value for a given number of correct picks, following the game's scoring table.
export function pointsForCorrectPicks(correctPicks: number): number {
  if (correctPicks <= 0) return 0;
  if (correctPicks === 1) return 1;
  if (correctPicks === 2) return 2;
  if (correctPicks === 3) return 10;
  if (correctPicks === 4) return 20;
  if (correctPicks === 5) return 50;
  if (correctPicks === 6) return 100;
  if (correctPicks === 7) return 200;
  if (correctPicks === 8) return 400;
  if (correctPicks === 9) return 800;
  return 1600;
}

// Counts how many picks in the user's submission match the actual match outcomes.
export function countCorrectPicks(picks: Pick[], outcomes: Pick[]): number {
  let correct = 0;
  for (let i = 0; i < outcomes.length; i += 1) {
    if (picks[i] === outcomes[i]) correct += 1;
  }
  return correct;
}
