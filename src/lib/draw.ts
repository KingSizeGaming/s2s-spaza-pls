export type DrawCandidate = {
  waNumber: string;
  tickets: number;
};

export function pickWeightedWinnerIndex(candidates: DrawCandidate[]): number {
  const totalTickets = candidates.reduce((sum, row) => sum + row.tickets, 0);
  let randomTicket = Math.floor(Math.random() * totalTickets) + 1;
  for (let i = 0; i < candidates.length; i += 1) {
    randomTicket -= candidates[i].tickets;
    if (randomTicket <= 0) return i;
  }
  return candidates.length - 1;
}

export function drawWeightedUnique(
  candidates: DrawCandidate[],
  winnerCount: number
): DrawCandidate[] {
  const pool = candidates.filter((row) => row.tickets > 0);
  const winners: DrawCandidate[] = [];
  while (pool.length > 0 && winners.length < winnerCount) {
    const winnerIndex = pickWeightedWinnerIndex(pool);
    winners.push(pool[winnerIndex]);
    pool.splice(winnerIndex, 1);
  }
  return winners;
}
