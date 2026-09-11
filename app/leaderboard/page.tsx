"use client";

import { useEffect, useState } from "react";
import MobileNav from "@/components/MobileNav";
import { MODELS } from "@/lib/models";
import { getRatings, resetRatings, ModelStats } from "@/lib/store";
import { CATEGORIES, Category } from "@/lib/category";

function medal(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

export default function Leaderboard() {
  const [cat, setCat] = useState<Category>("overall");
  const [ratings, setRatings] = useState<Record<string, ModelStats> | null>(null);
  const [overall, setOverall] = useState<Record<string, ModelStats> | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    setRatings(getRatings(cat));
    setOverall(getRatings("overall"));
  }, [cat]);

  if (!ratings || !overall) {
    return (
      <div>
        <MobileNav />
        <h1 className="page-title">🏆 Liderlik Tablosu</h1>
        <p className="page-sub">Yükleniyor…</p>
      </div>
    );
  }

  const needle = q.trim().toLocaleLowerCase("tr");
  const rows = MODELS.map((m) => ({ model: m, stats: ratings[m.id] }))
    .filter(({ model }) => {
      if (!needle) return true;
      return (
        model.name.toLocaleLowerCase("tr").includes(needle) ||
        model.org.toLocaleLowerCase("tr").includes(needle) ||
        model.style.includes(needle)
      );
    })
    .sort((x, y) => y.stats.rating - x.stats.rating);

  const max = Math.max(...rows.map((r) => r.stats.rating), 1);
  const totalBattles = Math.round(
    Object.values(overall).reduce((s, r) => s + r.battles, 0) / 2
  );
  const leader = MODELS.map((m) => ({ model: m, stats: overall[m.id] })).sort(
    (x, y) => y.stats.rating - x.stats.rating
  )[0];

  return (
    <div>
      <MobileNav />
      <h1 className="page-title">🏆 Liderlik Tablosu</h1>
      <p className="page-sub">
        Elo puanı ile sıralanır (K=32). Her oy hem genel hem de sorunun kategorisindeki tabloyu etkiler.
      </p>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="v">⚔️ {totalBattles}</div>
          <div className="l">Toplam battle</div>
        </div>
        <div className="stat-card">
          <div className="v">👑 {leader.model.name}</div>
          <div className="l">Lider • {leader.stats.rating} puan</div>
        </div>
        <div className="stat-card">
          <div className="v">🧠 {MODELS.length}</div>
          <div className="l">Kayıtlı model</div>
        </div>
      </div>

      <div className="cat-tabs">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            className={`cat-tab ${cat === c.id ? "active" : ""}`}
            onClick={() => setCat(c.id)}
          >
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      <div className="board-card">
        <div className="board-head">
          <input
            type="search"
            placeholder="🔍 Model ara…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ minWidth: 180 }}
          />
          <div className="toolbar">
            <button
              className="btn btn-ghost"
              style={{ padding: "8px 14px", fontSize: 13 }}
              onClick={() => {
                setRatings(getRatings(cat));
                setOverall(getRatings("overall"));
              }}
            >
              🔄 Yenile
            </button>
            <button
              className="btn btn-ghost"
              style={{ padding: "8px 14px", fontSize: 13 }}
              onClick={() => {
                if (confirm("TÜM kategorilerdeki puanlar sıfırlansın mı?")) {
                  resetRatings();
                  setRatings(getRatings(cat));
                  setOverall(getRatings("overall"));
                }
              }}
            >
              ♻️ Sıfırla
            </button>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="board">
            <thead>
              <tr>
                <th>Sıra</th>
                <th>Model</th>
                <th>Puan</th>
                <th>Battle</th>
                <th>G / M / B</th>
                <th>Kazanma %</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ model, stats }, i) => {
                const winRate =
                  stats.battles > 0 ? Math.round((stats.wins / stats.battles) * 100) : 0;
                return (
                  <tr key={model.id}>
                    <td className="rank">{medal(i + 1)}</td>
                    <td>
                      <div className="model-cell">
                        <div
                          className="avatar"
                          style={{ background: model.color, width: 30, height: 30, fontSize: 14 }}
                        >
                          {model.name[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700 }}>{model.name}</div>
                          <div style={{ fontSize: 12, color: "var(--dim)" }}>{model.org}</div>
                        </div>
                        <span className="style-badge">{model.style}</span>
                      </div>
                    </td>
                    <td>
                      <span className="rating-val">{stats.rating}</span>
                      <div className="rating-bar">
                        <div style={{ width: `${Math.round((stats.rating / max) * 100)}%` }} />
                      </div>
                    </td>
                    <td>{stats.battles}</td>
                    <td style={{ fontVariantNumeric: "tabular-nums" }}>
                      <span style={{ color: "var(--green)" }}>{stats.wins}</span>
                      {" / "}
                      <span style={{ color: "var(--red)" }}>{stats.losses}</span>
                      {" / "}
                      <span style={{ color: "var(--yellow)" }}>{stats.ties}</span>
                    </td>
                    <td style={{ fontWeight: 700 }}>%{winRate}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p style={{ marginTop: 14, fontSize: 12.5, color: "var(--dim)" }}>
        💡 Puanlar tarayıcınızda saklanır. Kategori, sorunun içeriğinden otomatik algılanır.
      </p>
    </div>
  );
}
