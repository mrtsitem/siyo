"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MODELS } from "@/lib/models";
import { getRatings, resetRatings, ModelStats } from "@/lib/store";

function medal(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

export default function Leaderboard() {
  const [ratings, setRatings] = useState<Record<string, ModelStats> | null>(null);

  useEffect(() => {
    setRatings(getRatings());
  }, []);

  if (!ratings) {
    return (
      <div>
        <h1 className="page-title">🏆 Liderlik Tablosu</h1>
        <p className="page-sub">Yükleniyor…</p>
      </div>
    );
  }

  const rows = MODELS.map((m) => ({ model: m, stats: ratings[m.id] })).sort(
    (x, y) => y.stats.rating - x.stats.rating
  );
  const max = Math.max(...rows.map((r) => r.stats.rating), 1);
  const totalBattles = rows.reduce((s, r) => s + r.stats.battles, 0);

  return (
    <div>
      <div className="mobile-nav">
        <Link href="/">💬 Sohbet</Link>
        <Link href="/leaderboard" className="active">🏆 Tablo</Link>
        <Link href="/history">🕘 Geçmiş</Link>
      </div>

      <h1 className="page-title">🏆 Liderlik Tablosu</h1>
      <p className="page-sub">
        Elo puanı ile sıralanır (arena.ai ile aynı sistem). Oy verdikçe puanlar güncellenir.
      </p>

      <div className="board-card">
        <div className="board-head">
          <span style={{ color: "var(--muted)", fontSize: 13.5 }}>
            ⚔️ Toplam <strong style={{ color: "var(--text)" }}>{totalBattles}</strong> battle yapıldı
          </span>
          <div className="toolbar">
            <button className="btn btn-ghost" style={{ padding: "8px 14px", fontSize: 13 }} onClick={() => setRatings(getRatings())}>
              🔄 Yenile
            </button>
            <button
              className="btn btn-ghost"
              style={{ padding: "8px 14px", fontSize: 13 }}
              onClick={() => {
                if (confirm("Puanlar başlangıç değerlerine sıfırlansın mı?")) {
                  setRatings(resetRatings());
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
                  stats.battles > 0
                    ? Math.round((stats.wins / stats.battles) * 100)
                    : 0;
                return (
                  <tr key={model.id}>
                    <td className="rank">{medal(i + 1)}</td>
                    <td>
                      <div className="model-cell">
                        <div className="avatar" style={{ background: model.color, width: 30, height: 30, fontSize: 14 }}>
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
        💡 Puanlar tarayıcınızda saklanır. K = 32 Elo katsayısı kullanılır. Her oy, iki modelin puanını da etkiler.
      </p>
    </div>
  );
}
