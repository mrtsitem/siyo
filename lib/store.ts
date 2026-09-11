// ─────────────────────────────────────────────
// İstemci tarafı veri deposu (localStorage).
// Puanlar HER KATEGORİ için ayrı tutulur.
// ─────────────────────────────────────────────
"use client";

import { MODELS } from "./models";
import { updateRatings, VoteResult } from "./elo";
import { Category, detectCategory } from "./category";

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
  category?: Exclude<Category, "overall">;
}

const RATINGS_KEY = "arena.ratings.v2";
const LEGACY_KEY = "arena.ratings.v1";
const HISTORY_KEY = "arena.history.v1";

type AllRatings = Record<Category, Record<string, ModelStats>>;

function seedOne(): Record<string, ModelStats> {
  const out: Record<string, ModelStats> = {};
  for (const m of MODELS) {
    out[m.id] = { rating: m.baseRating, battles: 0, wins: 0, losses: 0, ties: 0 };
  }
  return out;
}

function seedAll(): AllRatings {
  return {
    overall: seedOne(),
    coding: seedOne(),
    creative: seedOne(),
    chat: seedOne(),
  };
}

function fillMissing(all: AllRatings): AllRatings {
  for (const cat of Object.keys(all) as Category[]) {
    for (const m of MODELS) {
      if (!all[cat][m.id]) {
        all[cat][m.id] = { rating: m.baseRating, battles: 0, wins: 0, losses: 0, ties: 0 };
      }
    }
  }
  return all;
}

function getAll(): AllRatings {
  try {
    const raw = localStorage.getItem(RATINGS_KEY);
    if (raw) return fillMissing(JSON.parse(raw) as AllRatings);
    // v1'den taşıma: eski puanlar "overall" olur
    const legacy = localStorage.getItem(LEGACY_KEY);
    const all = seedAll();
    if (legacy) {
      const parsed = JSON.parse(legacy) as Record<string, ModelStats>;
      for (const m of MODELS) {
        if (parsed[m.id]) all.overall[m.id] = parsed[m.id];
      }
    }
    localStorage.setItem(RATINGS_KEY, JSON.stringify(all));
    return all;
  } catch {
    return seedAll();
  }
}

export function getRatings(cat: Category = "overall"): Record<string, ModelStats> {
  return getAll()[cat];
}

function applyVote(
  bucket: Record<string, ModelStats>,
  aId: string,
  bId: string,
  result: VoteResult
): { deltaA: number; deltaB: number } {
  const a = bucket[aId];
  const b = bucket[bId];
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
  return { deltaA, deltaB };
}

export function recordVote(
  modelAId: string,
  modelBId: string,
  result: VoteResult,
  prompt: string
): {
  ratings: Record<string, ModelStats>;
  deltaA: number;
  deltaB: number;
  category: Exclude<Category, "overall">;
} {
  const all = getAll();
  const category = detectCategory(prompt);
  const { deltaA, deltaB } = applyVote(all.overall, modelAId, modelBId, result);
  applyVote(all[category], modelAId, modelBId, result);
  localStorage.setItem(RATINGS_KEY, JSON.stringify(all));
  return { ratings: all.overall, deltaA, deltaB, category };
}

export function resetRatings(): AllRatings {
  const seed = seedAll();
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
    category: rec.category ?? detectCategory(rec.prompt),
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
