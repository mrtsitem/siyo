"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Markdown from "@/components/Markdown";
import { MODELS, getModel, pickBattlePair, AIModel } from "@/lib/models";
import { recordVote, saveBattle } from "@/lib/store";
import { VoteResult } from "@/lib/elo";

type Mode = "battle" | "direct";

interface ChatMsg {
  role: "user" | "ai";
  text: string;
  modelName?: string;
}

const SUGGESTIONS = [
  { t: "🚀 Landing page fikri", d: "Ürünüm için modern tanıtım sayfası planla", p: "Bir SaaS ürünü için modern bir landing page planı hazırla. Bölümler, başlıklar ve harekete geçirici mesajlarla birlikte ver." },
  { t: "📊 Dashboard yap", d: "Veriyi grafiğe dönüştür", p: "Satış verilerini gösteren bir dashboard nasıl tasarlanır? Hangi grafikler kullanılmalı, adım adım anlat." },
  { t: "🎮 Oyun yap", d: "Tarayıcıda oynanan oyun", p: "JavaScript ile tarayıcıda oynanabilen basit bir yılan oyununun kodunu yaz ve nasıl çalıştığını açıkla." },
  { t: "💻 Kod yaz", d: "Python / JS örnekleri", p: "Python'da bir yapılacaklar listesi uygulaması için örnek kod yaz ve açıkla." },
];

async function streamChat(
  prompt: string,
  modelId: string,
  onChunk: (partial: string) => void
): Promise<string> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, modelId }),
  });
  if (!res.ok || !res.body) throw new Error("API hatası");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    full += decoder.decode(value, { stream: true });
    onChunk(full);
  }
  full += decoder.decode();
  onChunk(full);
  return full;
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("battle");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [attached, setAttached] = useState<{ name: string; content: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Battle state
  const [modelA, setModelA] = useState<AIModel | null>(null);
  const [modelB, setModelB] = useState<AIModel | null>(null);
  const [textA, setTextA] = useState("");
  const [textB, setTextB] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [voteMsg, setVoteMsg] = useState("");
  const [lastPrompt, setLastPrompt] = useState("");

  // Direct state
  const [directModel, setDirectModel] = useState(MODELS[0].id);
  const [chat, setChat] = useState<ChatMsg[]>([]);

  function fullPrompt(): string {
    const base = input.trim();
    if (attached) return `${base}\n\n[Ekli dosya: ${attached.name}]\n${attached.content.slice(0, 3000)}`;
    return base;
  }

  async function handleFile(f: File | undefined) {
    if (!f) return;
    const text = await f.text();
    setAttached({ name: f.name, content: text.slice(0, 6000) });
  }

  async function sendBattle(promptOverride?: string) {
    const prompt = (promptOverride ?? fullPrompt()).trim();
    if (!prompt || loading) return;
    setLoading(true);
    setVoteMsg("");
    setRevealed(false);
    setTextA("");
    setTextB("");
    setLastPrompt(prompt);
    const [a, b] = pickBattlePair();
    setModelA(a);
    setModelB(b);
    setInput("");
    setAttached(null);
    try {
      await Promise.all([
        streamChat(prompt, a.id, setTextA),
        streamChat(prompt, b.id, setTextB),
      ]);
    } catch {
      setTextA((p) => p || "⚠️ Bağlantı hatası — tekrar deneyin.");
      setTextB((p) => p || "⚠️ Bağlantı hatası — tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  async function vote(result: VoteResult) {
    if (!modelA || !modelB || revealed || loading) return;
    const { deltaA, deltaB } = recordVote(modelA.id, modelB.id, result);
    setRevealed(true);
    saveBattle({ prompt: lastPrompt, modelAId: modelA.id, modelBId: modelB.id, result });
    fetch("/api/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelAId: modelA.id, modelBId: modelB.id, result }),
    }).catch(() => {});

    const fmt = (d: number) =>
      `${d >= 0 ? "+" : ""}${d}`;
    const cls = (d: number) => (d >= 0 ? "delta-up" : "delta-down");
    setVoteMsg(
      `__VOTED__${modelA.name}|${fmt(deltaA)}|${cls(deltaA)}|${modelB.name}|${fmt(deltaB)}|${cls(deltaB)}`
    );
  }

  async function sendDirect(promptOverride?: string) {
    const prompt = (promptOverride ?? fullPrompt()).trim();
    if (!prompt || loading) return;
    setLoading(true);
    const model = getModel(directModel);
    setChat((c) => [...c, { role: "user", text: prompt }, { role: "ai", text: "", modelName: model.name }]);
    setInput("");
    setAttached(null);
    try {
      await streamChat(prompt, model.id, (partial) => {
        setChat((c) => {
          const copy = [...c];
          copy[copy.length - 1] = { role: "ai", text: partial, modelName: model.name };
          return copy;
        });
      });
    } catch {
      setChat((c) => {
        const copy = [...c];
        copy[copy.length - 1] = { role: "ai", text: "⚠️ Bağlantı hatası — tekrar deneyin.", modelName: model.name };
        return copy;
      });
    } finally {
      setLoading(false);
    }
  }

  const send = (p?: string) => (mode === "battle" ? sendBattle(p) : sendDirect(p));
  const canVote = mode === "battle" && modelA && modelB && textA && textB && !loading && !revealed;

  function renderVoteMsg() {
    if (!voteMsg.startsWith("__VOTED__")) return voteMsg;
    const [, aName, dA, cA, bName, dB, cB] = voteMsg.replace("__VOTED__", "").split("|");
    return (
      <>
        Oyunuz kaydedildi! 🎉 <strong>{aName}</strong>{" "}
        <span className={cA}>{dA}</span> • <strong>{bName}</strong>{" "}
        <span className={cB}>{dB}</span> —{" "}
        <Link href="/leaderboard" style={{ color: "#a99bff" }}>
          tabloyu gör
        </Link>
      </>
    );
  }

  return (
    <div>
      <div className="mobile-nav">
        <Link href="/" className="active">💬 Sohbet</Link>
        <Link href="/leaderboard">🏆 Tablo</Link>
        <Link href="/history">🕘 Geçmiş</Link>
      </div>

      <h1 className="page-title">
        {mode === "battle" ? "⚔️ Battle Mode" : "💬 Direkt Sohbet"}
      </h1>
      <p className="page-sub">
        {mode === "battle"
          ? "İki gizli model yarışır — beğendiğine oy ver, kimlikler oydan sonra açılır."
          : "Bir model seç ve doğrudan sohbet et."}
      </p>

      <div className="mode-tabs">
        <button
          className={`mode-tab ${mode === "battle" ? "active" : ""}`}
          onClick={() => setMode("battle")}
        >
          ⚔️ Battle Mode
        </button>
        <button
          className={`mode-tab ${mode === "direct" ? "active" : ""}`}
          onClick={() => setMode("direct")}
        >
          💬 Direkt Sohbet
        </button>
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

      {/* Öneriler */}
      {((mode === "battle" && !modelA) || (mode === "direct" && chat.length === 0)) && (
        <div className="suggest-grid">
          {SUGGESTIONS.map((s) => (
            <button key={s.t} className="suggest-card" onClick={() => send(s.p)} disabled={loading}>
              <div className="t">{s.t}</div>
              <div className="d">{s.d}</div>
            </button>
          ))}
        </div>
      )}

      {/* ── BATTLE ── */}
      {mode === "battle" && (
        <>
          <div className="battle-grid">
            <BattlePanel
              label="Model A"
              model={revealed ? modelA : null}
              text={textA}
              streaming={loading && !textA}
              active={!!modelA}
              accent="#7c6cf0"
            />
            <BattlePanel
              label="Model B"
              model={revealed ? modelB : null}
              text={textB}
              streaming={loading && !textB}
              active={!!modelB}
              accent="#f06595"
            />
          </div>

          {modelA && modelB && (
            <div className="vote-bar">
              <div className="vote-title">
                {revealed ? "✅ Oylama tamamlandı" : loading ? "⏳ Modeller cevap yazıyor…" : "🗳️ Hangisi daha iyi cevap verdi?"}
              </div>
              <div className="vote-btns">
                <button className="vote-btn" disabled={!canVote} onClick={() => vote("a")}>
                  👍 A daha iyi
                </button>
                <button className="vote-btn" disabled={!canVote} onClick={() => vote("b")}>
                  👍 B daha iyi
                </button>
                <button className="vote-btn" disabled={!canVote} onClick={() => vote("tie")}>
                  🤝 Berabere
                </button>
                <button className="vote-btn" disabled={!canVote} onClick={() => vote("both_bad")}>
                  👎 İkisi de kötü
                </button>
              </div>
              {voteMsg && <div className="vote-result">{renderVoteMsg()}</div>}
            </div>
          )}
        </>
      )}

      {/* ── DIRECT ── */}
      {mode === "direct" && chat.length > 0 && (
        <div className="chat-list">
          {chat.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="msg msg-user">
                {m.text}
              </div>
            ) : (
              <div key={i} className="msg msg-ai">
                <div className="msg-role">
                  🤖 {m.modelName}
                  {loading && i === chat.length - 1 && !m.text && <span className="typing" />}
                </div>
                {m.text ? (
                  <Markdown text={m.text} />
                ) : (
                  <span style={{ color: "var(--dim)" }}>yazıyor…</span>
                )}
                {loading && i === chat.length - 1 && m.text && <span className="typing" />}
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
              mode === "battle"
                ? "İki modele de sorulacak mesajı yaz… (Enter: gönder, Shift+Enter: yeni satır)"
                : "Mesajını yaz… (Enter: gönder, Shift+Enter: yeni satır)"
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
            <span>Cevaplar demo motoru ile üretilir • Oyların tabloyu etkiler</span>
          )}
        </div>
      </div>
    </div>
  );
}

function BattlePanel({
  label,
  model,
  text,
  streaming,
  active,
  accent,
}: {
  label: string;
  model: AIModel | null;
  text: string;
  streaming: boolean;
  active: boolean;
  accent: string;
}) {
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
      </div>
      <div className="panel-body">
        {!active && !text ? (
          <div className="panel-empty">
            Henüz soru sorulmadı.
            <br />
            Aşağıdan bir mesaj yaz, iki model yarışsın. ⚔️
          </div>
        ) : text ? (
          <>
            <Markdown text={text} />
            {streaming && <span className="typing" />}
          </>
        ) : (
          <div className="panel-empty">yazıyor… <span className="typing" /></div>
        )}
      </div>
    </div>
  );
}
