// ─────────────────────────────────────────────
// İstemci tarafı veri deposu (localStorage).
// Puanlar ve geçmiş tarayıcıda saklanır — giriş gerekmez.
// İleride sunucu tarafı DB (Postgres/Upstash) eklenebilir.
// ─────────────────────────────────────────────
"use client";

import { MODELS } from "./models";
import { updateRatings, VoteResult } from "./elo";

export interface ModelStats {
  rating: number;
  battles: number;
  wins: number;
  losses: number;
  ties: number;
}

export interface BattleRecord {
  id: string;
  prompt: string;
  modelAId: string;
  modelBId: string;
  result: VoteResult;
  ts: number;
}

const RATINGS_KEY = "arena.ratings.v1";
const HISTORY_KEY = "arena.history.v1";

function seedRatings(): Record<string, ModelStats> {
  const out: Record<string, ModelStats> = {};
  for (const m of MODELS) {
    out[m.id] = { rating: m.baseRating, battles: 0, wins: 0, losses: 0, ties: 0 };
  }
  return out;
}

export function getRatings(): Record<string, ModelStats> {
  try {
    const raw = localStorage.getItem(RATINGS_KEY);
    if (!raw) {
      const seed = seedRatings();
      localStorage.setItem(RATINGS_KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw) as Record<string, ModelStats>;
    // Yeni eklenen modeller varsa tohuma ekle
    for (const m of MODELS) {
      if (!parsed[m.id]) parsed[m.id] = { rating: m.baseRating, battles: 0, wins: 0, losses: 0, ties: 0 };
    }
    return parsed;
  } catch {
    return seedRatings();
  }
}

export function recordVote(
  modelAId: string,
  modelBId: string,
  result: VoteResult
): { ratings: Record<string, ModelStats>; deltaA: number; deltaB: number } {
  const ratings = getRatings();
  const a = ratings[modelAId];
  const b = ratings[modelBId];
  const { newA, newB, deltaA, deltaB } = updateRatings(a.rating, b.rating, result);

  a.rating = newA;
  b.rating = newB;
  a.battles += 1;
  b.battles += 1;

  if (result === "a") {
    a.wins += 1;
    b.losses += 1;
  } else if (result === "b") {
    b.wins += 1;
    a.losses += 1;
  } else {
    a.ties += 1;
    b.ties += 1;
  }

  localStorage.setItem(RATINGS_KEY, JSON.stringify(ratings));
  return { ratings, deltaA, deltaB };
}

export function resetRatings(): Record<string, ModelStats> {
  const seed = seedRatings();
  localStorage.setItem(RATINGS_KEY, JSON.stringify(seed));
  return seed;
}

// ── Geçmiş ──

export function getHistory(): BattleRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as BattleRecord[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveBattle(rec: Omit<BattleRecord, "id" | "ts">): BattleRecord {
  const full: BattleRecord = {
    ...rec,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: Date.now(),
  };
  const hist = getHistory();
  hist.unshift(full);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(hist.slice(0, 200)));
  return full;
}

export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}
