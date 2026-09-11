// ─────────────────────────────────────────────
// Elo puan sistemi — arena.ai / Chatbot Arena ile aynı mantık.
// Kazananın puanı artar, kaybedenin düşer.
// Beraberlikte puanlar birbirine yaklaşır.
// ─────────────────────────────────────────────

export type VoteResult = "a" | "b" | "tie" | "both_bad";

export const K_FACTOR = 32;
const SCALE = 400;

export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / SCALE));
}

/** Oya göre yeni Elo puanlarını hesapla */
export function updateRatings(
  ratingA: number,
  ratingB: number,
  result: VoteResult
): { newA: number; newB: number; deltaA: number; deltaB: number } {
  // both_bad iki tarafa da küçük ceza olarak işlenir
  let scoreA: number;
  if (result === "a") scoreA = 1;
  else if (result === "b") scoreA = 0;
  else scoreA = 0.5;

  const expA = expectedScore(ratingA, ratingB);
  const expB = expectedScore(ratingB, ratingA);

  let newA = Math.round(ratingA + K_FACTOR * (scoreA - expA));
  let newB = Math.round(ratingB + K_FACTOR * (1 - scoreA - expB));

  if (result === "both_bad") {
    newA -= 4;
    newB -= 4;
  }

  return {
    newA,
    newB,
    deltaA: newA - ratingA,
    deltaB: newB - ratingB,
  };
}
