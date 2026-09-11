"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import MobileNav from "@/components/MobileNav";
import { getHistory, clearHistory, BattleRecord } from "@/lib/store";
import { getModel } from "@/lib/models";
import { categoryLabel, detectCategory } from "@/lib/category";
import { VoteResult } from "@/lib/elo";

function resultBadge(r: VoteResult, aName: string, bName: string) {
  if (r === "a") return <span className="badge-win">👍 {aName} kazandı</span>;
  if (r === "b") return <span className="badge-win">👍 {bName} kazandı</span>;
  if (r === "tie") return <span className="badge-draw">🤝 Berabere</span>;
  return <span className="badge-lose">👎 İkisi de kötü</span>;
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "az önce";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa önce`;
  return new Date(ts).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function History() {
  const [hist, setHist] = useState<BattleRecord[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    setHist(getHistory());
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase("tr");
    if (!needle) return hist;
    return hist.filter((h) => {
      const a = getModel(h.modelAId).name.toLocaleLowerCase("tr");
      const b = getModel(h.modelBId).name.toLocaleLowerCase("tr");
      return (
        h.prompt.toLocaleLowerCase("tr").includes(needle) ||
        a.includes(needle) ||
        b.includes(needle)
      );
    });
  }, [hist, q]);

  const dist = useMemo(() => {
    const c = { a: 0, b: 0, tie: 0, bad: 0 };
    for (const h of hist) {
      if (h.result === "a") c.a++;
      else if (h.result === "b") c.b++;
      else if (h.result === "tie") c.tie++;
      else c.bad++;
    }
    return c;
  }, [hist]);

  const total = hist.length || 1;

  function exportJSON() {
    const blob = new Blob([JSON.stringify(hist, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "arena-gecmis.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div>
      <MobileNav />
      <h1 className="page-title">🕘 Battle Geçmişi</h1>
      <p className="page-sub">Yaptığın tüm battle&apos;lar ve oyların. Ara, incele, dışa aktar.</p>

      {hist.length > 0 && (
        <div className="settings-card">
          <h3>📊 Oy dağılımı ({hist.length} battle)</h3>
          <div className="dist-bar">
            <div style={{ width: `${(dist.a / total) * 100}%`, background: "#51cf66" }} />
            <div style={{ width: `${(dist.b / total) * 100}%`, background: "#339af0" }} />
            <div style={{ width: `${(dist.tie / total) * 100}%`, background: "#ffd43b" }} />
            <div style={{ width: `${(dist.bad / total) * 100}%`, background: "#ff6b6b" }} />
          </div>
          <div className="dist-legend">
            <span>🟩 A kazandı: {dist.a}</span>
            <span>🟦 B kazandı: {dist.b}</span>
            <span>🟨 Berabere: {dist.tie}</span>
            <span>🟥 İkisi de kötü: {dist.bad}</span>
          </div>
        </div>
      )}

      <div className="search-row">
        <input
          type="search"
          placeholder="🔍 Soru veya model adı ara…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {hist.length > 0 && (
          <>
            <button className="btn btn-ghost" onClick={exportJSON}>
              📥 Dışa aktar
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => {
                if (confirm("Tüm geçmiş silinsin mi?")) {
                  clearHistory();
                  setHist([]);
                }
              }}
            >
              🗑️ Temizle
            </button>
          </>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          {hist.length === 0 ? (
            <>
              Henüz battle yapılmamış. ⚔️
              <br />
              <br />
              <Link href="/" className="btn btn-primary" style={{ textDecoration: "none", display: "inline-block" }}>
                İlk battle&apos;ı başlat
              </Link>
            </>
          ) : (
            <>Aramana uygun sonuç bulunamadı.</>
          )}
        </div>
      ) : (
        filtered.map((h) => {
          const a = getModel(h.modelAId);
          const b = getModel(h.modelBId);
          const cat = h.category ?? detectCategory(h.prompt);
          return (
            <div key={h.id} className="hist-item">
              <div className="hist-prompt">
                💬 {h.prompt.length > 220 ? h.prompt.slice(0, 220) + "…" : h.prompt}
              </div>
              <div className="hist-meta">
                <span className="chip">🅰️ {a.name}</span>
                <span style={{ color: "var(--dim)" }}>vs</span>
                <span className="chip">🅱️ {b.name}</span>
                {resultBadge(h.result, a.name, b.name)}
                <span className="cat-chip">{categoryLabel(cat)}</span>
                <span style={{ marginLeft: "auto" }}>{timeAgo(h.ts)}</span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
