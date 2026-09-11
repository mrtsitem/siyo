"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MobileNav from "@/components/MobileNav";
import { MODELS } from "@/lib/models";
import { getRatings, ModelStats } from "@/lib/store";

const STYLE_TR: Record<string, string> = {
  analytical: "🔍 Analitik",
  creative: "✨ Yaratıcı",
  concise: "⚡ Öz",
  detailed: "📚 Detaylı",
  coder: "💻 Kodcu",
  friendly: "😊 Samimi",
};

export default function Models() {
  const [ratings, setRatings] = useState<Record<string, ModelStats> | null>(null);

  useEffect(() => {
    setRatings(getRatings("overall"));
  }, []);

  const rows = MODELS.map((m) => ({
    model: m,
    stats: ratings?.[m.id] ?? {
      rating: m.baseRating,
      battles: 0,
      wins: 0,
      losses: 0,
      ties: 0,
    },
  })).sort((x, y) => y.stats.rating - x.stats.rating);

  return (
    <div>
      <MobileNav />
      <h1 className="page-title">🧠 Modeller</h1>
      <p className="page-sub">
        Arenada yarışan {MODELS.length} model. Puanlar güncel Elo sıralamasına göre dizilir.
      </p>

      <div className="model-grid">
        {rows.map(({ model, stats }, i) => {
          const winRate =
            stats.battles > 0 ? Math.round((stats.wins / stats.battles) * 100) : 0;
          return (
            <div key={model.id} className="model-card">
              <div className="model-card-top">
                <div className="avatar" style={{ background: model.color }}>
                  {model.name[0]}
                </div>
                <div>
                  <div className="model-card-name">
                    {i === 0 ? "👑 " : `#${i + 1} `}
                    {model.name}
                  </div>
                  <div className="model-card-org">{model.org}</div>
                </div>
              </div>
              <div className="model-card-desc">{model.description}</div>
              <div className="model-card-stats">
                <span className="chip">⭐ {stats.rating}</span>
                <span className="chip">⚔️ {stats.battles}</span>
                <span className="chip">🏅 %{winRate}</span>
                <span className="style-badge">{STYLE_TR[model.style] ?? model.style}</span>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <Link
                  href={`/?mode=direct&model=${model.id}`}
                  className="btn btn-primary"
                  style={{ textDecoration: "none", flex: 1, textAlign: "center", padding: "9px 10px", fontSize: 13 }}
                >
                  💬 Sohbet et
                </Link>
                <Link
                  href="/"
                  className="btn btn-ghost"
                  style={{ textDecoration: "none", flex: 1, textAlign: "center", padding: "9px 10px", fontSize: 13 }}
                >
                  ⚔️ Battle&apos;a sok
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
