"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Markdown from "@/components/Markdown";
import CopyBtn from "@/components/CopyBtn";
import MobileNav from "@/components/MobileNav";
import { MODELS, getModel, pickBattlePair, AIModel } from "@/lib/models";
import { recordVote, saveBattle } from "@/lib/store";
import { streamChat, HistTurn } from "@/lib/client";
import { getSettings, providerName, ProviderId } from "@/lib/settings";
import { VoteResult } from "@/lib/elo";

type Mode = "battle" | "side" | "direct";

interface Turn {
  id: number;
  role: "user" | "a" | "b";
  text: string;
}

interface ChatMsg {
  role: "user" | "ai";
  text: string;
  modelName?: string;
}

interface VoteInfo {
  aName: string;
  dA: number;
  bName: string;
  dB: number;
  round: number;
}

const SUGGESTIONS = [
  { t: "🚀 Landing page fikri", d: "Modern tanıtım sayfası planla", p: "Bir SaaS ürünü için modern bir landing page planı hazırla. Bölümler, başlıklar ve harekete geçirici mesajlarla birlikte ver." },
  { t: "📊 Dashboard tasarla", d: "Veriyi grafiğe dönüştür", p: "Satış verilerini gösteren bir dashboard nasıl tasarlanır? Hangi grafikler kullanılmalı, adım adım anlat." },
  { t: "🎮 Oyun kodla", d: "Tarayıcıda oynanan oyun", p: "JavaScript ile tarayıcıda oynanabilen basit bir yılan oyununun kodunu yaz ve nasıl çalıştığını açıkla." },
  { t: "🎨 Tasarımdan koda", d: "Brief'ten HTML/CSS üret", p: "Şık bir restoran sitesi için tek sayfalık HTML + CSS kodu yaz. Hero bölümü, menü ve iletişim alanları olsun." },
  { t: "🏪 Online mağaza aç", d: "E-ticaret yol haritası", p: "El yapımı ürünler satan küçük bir online mağaza açmak istiyorum. Adım adım yol haritası ve dikkat edilecekleri listele." },
  { t: "💡 Fullstack uygulama", d: "Uçtan uca proje planı", p: "Bir not alma uygulaması için fullstack proje planı çıkar: teknoloji seçimi, veri modeli ve geliştirme adımları." },
];

function turnsToHistory(turns: Turn[], side: "a" | "b"): HistTurn[] {
  const out: HistTurn[] = [];
  for (const t of turns) {
    if (t.role === "user") out.push({ role: "user", text: t.text });
    else if (t.role === side && t.text && !t.text.startsWith("⚠️")) {
      out.push({ role: "assistant", text: t.text });
    }
  }
  return out.slice(-10);
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("battle");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [attached, setAttached] = useState<{ name: string; content: string } | null>(null);
  const [engine, setEngine] = useState<ProviderId>("mock");
  const fileRef = useRef<HTMLInputElement>(null);
  const turnId = useRef(1);

  // Arena (battle + side) state
  const [modelA, setModelA] = useState<AIModel | null>(null);
  const [modelB, setModelB] = useState<AIModel | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [round, setRound] = useState(0);
  const [votedRounds, setVotedRounds] = useState<number[]>([]);
  const [voteInfo, setVoteInfo] = useState<VoteInfo | null>(null);
  const [arenaError, setArenaError] = useState("");
  const [manualA, setManualA] = useState(MODELS[0].id);
  const [manualB, setManualB] = useState(MODELS[1].id);

  // Direct state
  const [directModel, setDirectModel] = useState(MODELS[0].id);
  const [chat, setChat] = useState<ChatMsg[]>([]);

  // URL önayarları (?mode=direct&model=xxx) + motor rozeti
  useEffect(() => {
    try {
      setEngine(getSettings().provider);
      const sp = new URLSearchParams(window.location.search);
      const m = sp.get("mode");
      if (m === "direct" || m === "side" || m === "battle") setMode(m);
      const mid = sp.get("model");
      if (mid && MODELS.some((x) => x.id === mid)) setDirectModel(mid);
      if (m || mid) window.history.replaceState({}, "", window.location.pathname);
    } catch {
      /* yoksay */
    }
  }, []);

  const named = mode === "side";
  const revealed = named || votedRounds.length > 0;

  function resetArena() {
    setTurns([]);
    setModelA(null);
    setModelB(null);
    setRound(0);
    setVotedRounds([]);
    setVoteInfo(null);
    setArenaError("");
  }

  function changeMode(m: Mode) {
    setMode(m);
    resetArena();
  }

  function fullPrompt(): string {
    const base = input.trim();
    if (attached)
      return `${base}\n\n[Ekli dosya: ${attached.name}]\n${attached.content.slice(0, 3000)}`;
    return base;
  }

  async function handleFile(f: File | undefined) {
    if (!f) return;
    const text = await f.text();
    setAttached({ name: f.name, content: text.slice(0, 6000) });
  }

  // ── ARENA ──
  async function sendArena(promptOverride?: string) {
    const prompt = (promptOverride ?? fullPrompt()).trim();
    if (!prompt || loading) return;

    let A = modelA;
    let B = modelB;
    if (!A || !B) {
      if (named) {
        if (manualA === manualB) {
          setArenaError("Karşılaştırma için iki FARKLI model seçmelisin.");
          return;
        }
        A = getModel(manualA);
        B = getModel(manualB);
      } else {
        [A, B] = pickBattlePair();
      }
      setModelA(A);
      setModelB(B);
    }

    setLoading(true);
    setArenaError("");
    const r = round + 1;
    setRound(r);
    const uid = turnId.current++;
    const aId = turnId.current++;
    const bId = turnId.current++;
    const histA = turnsToHistory(turns, "a");
    const histB = turnsToHistory(turns, "b");
    setTurns((t) => [
      ...t,
      { id: uid, role: "user", text: prompt },
      { id: aId, role: "a", text: "" },
      { id: bId, role: "b", text: "" },
    ]);
    setInput("");
    setAttached(null);

    const patch = (id: number, text: string) =>
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, text } : x)));

    try {
      await Promise.all([
        streamChat(prompt, (A as AIModel).id, (p) => patch(aId, p), histA),
        streamChat(prompt, (B as AIModel).id, (p) => patch(bId, p), histB),
      ]);
    } catch (e: unknown) {
      const msg = `⚠️ ${e instanceof Error ? e.message : "Bağlantı hatası — tekrar deneyin."}`;
      setTurns((t) =>
        t.map((x) =>
          (x.id === aId || x.id === bId) && !x.text ? { ...x, text: msg } : x
        )
      );
    } finally {
      setLoading(false);
    }
  }

  function vote(result: VoteResult) {
    if (!modelA || !modelB || loading || round === 0) return;
    if (votedRounds.includes(round)) return;
    const lastUser = [...turns].reverse().find((t) => t.role === "user");
    if (!lastUser) return;
    const { deltaA, deltaB } = recordVote(modelA.id, modelB.id, result, lastUser.text);
    setVotedRounds((v) => [...v, round]);
    setVoteInfo({ aName: modelA.name, dA: deltaA, bName: modelB.name, dB: deltaB, round });
    saveBattle({
      prompt: lastUser.text,
      modelAId: modelA.id,
      modelBId: modelB.id,
      result,
    });
    fetch("/api/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelAId: modelA.id, modelBId: modelB.id, result }),
    }).catch(() => {});
  }

  // ── DIRECT ──
  async function runDirect(prompt: string, hist: HistTurn[]) {
    const model = getModel(directModel);
    setLoading(true);
    setChat((c) => [...c, { role: "ai", text: "", modelName: model.name }]);
    try {
      await streamChat(prompt, model.id, (partial) => {
        setChat((c) => {
          const copy = [...c];
          copy[copy.length - 1] = { role: "ai", text: partial, modelName: model.name };
          return copy;
        });
      }, hist);
    } catch (e: unknown) {
      const msg = `⚠️ ${e instanceof Error ? e.message : "Bağlantı hatası — tekrar deneyin."}`;
      setChat((c) => {
        const copy = [...c];
        copy[copy.length - 1] = { role: "ai", text: msg, modelName: model.name };
        return copy;
      });
    } finally {
      setLoading(false);
    }
  }

  function chatHistory(): HistTurn[] {
    const out: HistTurn[] = [];
    for (const m of chat) {
      if (m.role === "user") out.push({ role: "user", text: m.text });
      else if (m.text && !m.text.startsWith("⚠️")) out.push({ role: "assistant", text: m.text });
    }
    return out.slice(-10);
  }

  async function sendDirect(promptOverride?: string) {
    const prompt = (promptOverride ?? fullPrompt()).trim();
    if (!prompt || loading) return;
    const hist = chatHistory();
    setChat((c) => [...c, { role: "user", text: prompt }]);
    setInput("");
    setAttached(null);
    await runDirect(prompt, hist);
  }

  async function regenerate() {
    if (loading || chat.length === 0) return;
    const lastUser = [...chat].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    const trimmed = chat[chat.length - 1].role === "ai" ? chat.slice(0, -1) : chat;
    const hist: HistTurn[] = [];
    for (const m of trimmed.slice(0, -1)) {
      if (m.role === "user") hist.push({ role: "user", text: m.text });
      else if (m.text && !m.text.startsWith("⚠️")) hist.push({ role: "assistant", text: m.text });
    }
    setChat(trimmed);
    await runDirect(lastUser.text, hist.slice(-10));
  }

  const send = (p?: string) => (mode === "direct" ? sendDirect(p) : sendArena(p));

  const lastA = [...turns].reverse().find((t) => t.role === "a");
  const lastB = [...turns].reverse().find((t) => t.role === "b");
  const pairDone =
    !!lastA?.text && !!lastB?.text && !lastA.text.startsWith("⚠️") && !lastB.text.startsWith("⚠️");
  const canVote = pairDone && !loading && round > 0 && !votedRounds.includes(round);

  const titles: Record<Mode, [string, string]> = {
    battle: ["⚔️ Battle Mode", "İki gizli model yarışır — oy ver, kimlikler açılsın. Konuşmaya devam edebilirsin."],
    side: ["🆚 Side-by-Side", "İki modeli ismiyle seç, aynı soruya verdikleri cevapları karşılaştır ve oyla."],
    direct: ["💬 Direkt Sohbet", "Bir model seç ve doğrudan sohbet et."],
  };

  return (
    <div>
      <MobileNav />
      <h1 className="page-title">{titles[mode][0]}</h1>
      <p className="page-sub">{titles[mode][1]}</p>

      <div className="mode-tabs" style={{ maxWidth: 640 }}>
        <button className={`mode-tab ${mode === "battle" ? "active" : ""}`} onClick={() => changeMode("battle")}>
          ⚔️ Battle
        </button>
        <button className={`mode-tab ${mode === "side" ? "active" : ""}`} onClick={() => changeMode("side")}>
          🆚 Karşılaştır
        </button>
        <button className={`mode-tab ${mode === "direct" ? "active" : ""}`} onClick={() => changeMode("direct")}>
          💬 Direkt
        </button>
      </div>

      <div className="arena-bar">
        <Link href="/settings" className={`engine-chip ${engine !== "mock" ? "live" : ""}`}>
          <span className="dot" /> Motor: {providerName(engine)} ⚙️
        </Link>
        {mode !== "direct" && turns.length > 0 && (
          <button className="btn btn-ghost" style={{ padding: "7px 14px", fontSize: 12.5 }} onClick={resetArena}>
            🔄 Yeni Battle
          </button>
        )}
        {mode === "direct" && chat.length > 0 && (
          <button className="btn btn-ghost" style={{ padding: "7px 14px", fontSize: 12.5 }} onClick={() => setChat([])}>
            🧹 Temizle
          </button>
        )}
      </div>

      {mode === "direct" && (
        <div className="model-picker">
          <label>Model:</label>
          <select value={directModel} onChange={(e) => setDirectModel(e.target.value)}>
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} — {m.description}
              </option>
            ))}
          </select>
        </div>
      )}

      {mode === "side" && (
        <div className="model-picker">
          <label>🅰️ Model A:</label>
          <select
            value={manualA}
            onChange={(e) => {
              setManualA(e.target.value);
              resetArena();
            }}
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <label>🅱️ Model B:</label>
          <select
            value={manualB}
            onChange={(e) => {
              setManualB(e.target.value);
              resetArena();
            }}
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
      )}

      {((mode !== "direct" && turns.length === 0) || (mode === "direct" && chat.length === 0)) && (
        <div className="suggest-grid">
          {SUGGESTIONS.map((s) => (
            <button key={s.t} className="suggest-card" onClick={() => send(s.p)} disabled={loading}>
              <div className="t">{s.t}</div>
              <div className="d">{s.d}</div>
            </button>
          ))}
        </div>
      )}

      {arenaError && <div className="error-note">{arenaError}</div>}

      {/* ── ARENA ── */}
      {mode !== "direct" && (
        <>
          <div className="battle-grid">
            <ArenaPanel
              label="Model A"
              model={revealed ? modelA : null}
              turns={turns}
              side="a"
              loading={loading}
              accent="#7c6cf0"
            />
            <ArenaPanel
              label="Model B"
              model={revealed ? modelB : null}
              turns={turns}
              side="b"
              loading={loading}
              accent="#f06595"
            />
          </div>

          {modelA && modelB && round > 0 && (
            <div className="vote-bar">
              <div className="vote-title">
                {loading
                  ? "⏳ Modeller cevap yazıyor…"
                  : votedRounds.includes(round)
                  ? `✅ ${round}. tur oylandı — devam edebilir veya yeni battle açabilirsin`
                  : `🗳️ ${round}. tur: hangisi daha iyi cevap verdi?`}
              </div>
              <div className="vote-btns">
                <button className="vote-btn" disabled={!canVote} onClick={() => vote("a")}>👍 A daha iyi</button>
                <button className="vote-btn" disabled={!canVote} onClick={() => vote("b")}>👍 B daha iyi</button>
                <button className="vote-btn" disabled={!canVote} onClick={() => vote("tie")}>🤝 Berabere</button>
                <button className="vote-btn" disabled={!canVote} onClick={() => vote("both_bad")}>👎 İkisi de kötü</button>
              </div>
              {voteInfo && (
                <div className="vote-result">
                  {voteInfo.round}. tur oyu kaydedildi! 🎉 <strong>{voteInfo.aName}</strong>{" "}
                  <span className={voteInfo.dA >= 0 ? "delta-up" : "delta-down"}>
                    {voteInfo.dA >= 0 ? "+" : ""}{voteInfo.dA}
                  </span>{" "}
                  • <strong>{voteInfo.bName}</strong>{" "}
                  <span className={voteInfo.dB >= 0 ? "delta-up" : "delta-down"}>
                    {voteInfo.dB >= 0 ? "+" : ""}{voteInfo.dB}
                  </span>{" "}
                  — <Link href="/leaderboard" style={{ color: "#a99bff" }}>tabloyu gör</Link>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── DIRECT ── */}
      {mode === "direct" && chat.length > 0 && (
        <div className="chat-list">
          {chat.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="msg msg-user">{m.text}</div>
            ) : (
              <div key={i} className="msg msg-ai">
                <div className="msg-role">
                  🤖 {m.modelName}
                  {loading && i === chat.length - 1 && !m.text && <span className="typing" />}
                </div>
                {m.text ? <Markdown text={m.text} /> : <span style={{ color: "var(--dim)" }}>yazıyor…</span>}
                {loading && i === chat.length - 1 && m.text && <span className="typing" />}
                {m.text && !m.text.startsWith("⚠️") && (
                  <div className="msg-actions">
                    <CopyBtn text={m.text} small />
                    {i === chat.length - 1 && (
                      <button className="action-btn" onClick={regenerate} disabled={loading}>
                        ↻ Yeniden üret
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}

      {/* ── Composer ── */}
      <div className="composer">
        <div className="composer-row">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              mode === "direct"
                ? "Mesajını yaz… (Enter: gönder, Shift+Enter: yeni satır)"
                : "İki modele de sorulacak mesajı yaz… (Enter: gönder, Shift+Enter: yeni satır)"
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <button className="btn btn-primary" disabled={loading || !input.trim()} onClick={() => send()}>
            {loading ? "…" : "➤"}
          </button>
        </div>
        <div className="attach-row">
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.md,.json,.csv,.js,.ts,.py,.html,.css"
            style={{ display: "none" }}
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <button className="btn btn-ghost" style={{ padding: "7px 12px", fontSize: 12.5 }} onClick={() => fileRef.current?.click()}>
            📎 Dosya ekle
          </button>
          {attached ? (
            <span className="chip">
              📄 {attached.name}
              <button onClick={() => setAttached(null)}>✕</button>
            </span>
          ) : (
            <span>Oyların tabloyu etkiler • Devam soruları bağlamı korur</span>
          )}
        </div>
      </div>
    </div>
  );
}

function ArenaPanel({
  label,
  model,
  turns,
  side,
  loading,
  accent,
}: {
  label: string;
  model: AIModel | null;
  turns: Turn[];
  side: "a" | "b";
  loading: boolean;
  accent: string;
}) {
  const items = turns.filter((t) => t.role === "user" || t.role === side);
  const ownText = turns.filter((t) => t.role === side && t.text).map((t) => t.text).join("\n\n---\n\n");
  const streaming = loading && items.length > 0 && items[items.length - 1].role === side;

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="avatar" style={{ background: model ? model.color : accent }}>
          {model ? model.name[0] : "?"}
        </div>
        <div>
          <div className="panel-title">{model ? model.name : label}</div>
          <div className="panel-sub">
            {model ? `${model.org} • ${model.description}` : "Kimlik gizli — oy verince açılır 🎭"}
          </div>
        </div>
        <div className="spacer" />
        {ownText && <CopyBtn text={ownText} small />}
      </div>
      <div className="panel-body">
        {items.length === 0 ? (
          <div className="panel-empty">
            Henüz soru sorulmadı.
            <br />
            Aşağıdan bir mesaj yaz, iki model yarışsın. ⚔️
          </div>
        ) : (
          items.map((t, i) =>
            t.role === "user" ? (
              <div key={t.id}>
                {i > 0 && <hr className="t-sep" />}
                <div className="t-user">🙋 {t.text}</div>
              </div>
            ) : t.text ? (
              <div key={t.id} className="t-ai">
                <Markdown text={t.text} />
                {streaming && t.id === items[items.length - 1].id && <span className="typing" />}
              </div>
            ) : (
              <div key={t.id} className="t-ai" style={{ color: "var(--dim)" }}>
                yazıyor… <span className="typing" />
              </div>
            )
          )
        )}
      </div>
    </div>
  );
}
