import { NextRequest, NextResponse } from "next/server";
import { updateRatings, VoteResult } from "@/lib/elo";
import { MODELS } from "@/lib/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Sunucu tarafı sayaç (demo amaçlı bellek içi).
// Not: Vercel serverless'ta yeniden deploy'da sıfırlanır.
// Kalıcı skorlar istemci localStorage'ında tutulur (lib/store.ts).
// İleride Postgres/Upstash ile kalıcı hale getirilebilir.
const serverStats: Record<
  string,
  { rating: number; battles: number; wins: number }
> = {};

function ensure(id: string) {
  if (!serverStats[id]) {
    const m = MODELS.find((x) => x.id === id);
    serverStats[id] = { rating: m?.baseRating ?? 1200, battles: 0, wins: 0 };
  }
  return serverStats[id];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const aId = String(body.modelAId ?? "");
    const bId = String(body.modelBId ?? "");
    const result = body.result as VoteResult;

    if (!aId || !bId || !["a", "b", "tie", "both_bad"].includes(result)) {
      return NextResponse.json({ error: "Geçersiz oy." }, { status: 400 });
    }

    const a = ensure(aId);
    const b = ensure(bId);
    const { newA, newB } = updateRatings(a.rating, b.rating, result);
    a.rating = newA;
    b.rating = newB;
    a.battles += 1;
    b.battles += 1;
    if (result === "a") a.wins += 1;
    if (result === "b") b.wins += 1;

    return NextResponse.json({ ok: true, ratingA: newA, ratingB: newB });
  } catch (e) {
    console.error("vote api error:", e);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}

export async function GET() {
  for (const m of MODELS) ensure(m.id);
  return NextResponse.json({ stats: serverStats });
}
