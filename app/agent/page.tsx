"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Markdown from "@/components/Markdown";
import CopyBtn from "@/components/CopyBtn";
import MobileNav from "@/components/MobileNav";
import { MODELS, getModel } from "@/lib/models";
import { streamAgent } from "@/lib/client";
import { parsePlan } from "@/lib/agent";
import { getSettings, providerName, ProviderId } from "@/lib/settings";

interface Step {
  title: string;
  status: "wait" | "run" | "done" | "stop";
  output: string;
  open: boolean;
}

const TEMPLATES = [
  { icon: "🚀", title: "Landing page", task: "Modern bir SaaS landing page'i için tam plan + metinler + HTML/CSS kodu hazırla." },
  { icon: "📊", title: "Dashboard", task: "Satış takip dashboard'u tasarla: metrikler, grafik türleri ve örnek veri yapısı çıkar." },
  { icon: "🎮", title: "Mini oyun", task: "Tarayıcıda oynanan basit bir hafıza kartı oyunu tasarla ve JavaScript kodunu yaz." },
  { icon: "🏪", title: "Mağaza", task: "El yapımı mum satan online mağaza için marka, ürün sayfası metinleri ve lansman planı hazırla." },
  { icon: "📝", title: "Blog yazısı", task: "Yapay zekâ ile verimlilik konulu, SEO uyumlu bir blog yazısı yaz." },
  { icon: "🗓️", title: "Proje planı", task: "3 kişilik ekiple 1 ayda mobil uygulama çıkarmak için haftalık proje planı yap." },
];

const RECENT_KEY = "arena.agent.recent.v1";

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function AgentPage() {
  const [task, setTask] = useState("");
  const [modelId, setModelId] = useState(MODELS[0].id);
  const [engine, setEngine] = useState<ProviderId>("mock");
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<"idle" | "plan" | "exec" | "done" | "stopped" | "error">("idle");
  const [planRaw, setPlanRaw] = useState("");
  const [steps, setSteps] = useState<Step[]>([]);
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const [activeTask, setActiveTask] = useState("");

  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    try {
      setEngine(getSettings().provider);
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecent(JSON.parse(raw) as string[]);
    } catch {
      /* yoksay */
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function pushRecent(t: string) {
    setRecent((r) => {
      const next = [t, ...r.filter((x) => x !== t)].slice(0, 8);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        /* yoksay */
      }
      return next;
    });
  }

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  function reset() {
    stop();
    stopTimer();
    setRunning(false);
    setPhase("idle");
    setPlanRaw("");
    setSteps([]);
    setError("");
    setElapsed(0);
    setActiveTask("");
  }

  async function run(taskOverride?: string) {
    const t = (taskOverride ?? task).trim();
    if (!t || running) return;
    reset();
    setRunning(true);
    setPhase("plan");
    setActiveTask(t);
    pushRecent(t);
    setTask("");
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const mid = modelId;

    try {
      // 1) PLAN
      const planText = await streamAgent(mid, { kind: "plan", task: t }, (p) => setPlanRaw(p), ctrl.signal);
      let titles = parsePlan(planText);
      if (titles.length === 0) titles = ["Görevi uygula ve sonucu sun"];
      const initial: Step[] = titles.map((title) => ({ title, status: "wait", output: "", open: false }));
      setSteps(initial);
      setPhase("exec");

      // 2) İCRAAT
      const context: string[] = [];
      for (let i = 0; i < titles.length; i++) {
        setSteps((s) => s.map((x, j) => (j === i ? { ...x, status: "run", open: true } : x)));
        const out = await streamAgent(
          mid,
          { kind: "step", task: t, plan: titles, step: titles[i], index: i, total: titles.length, context: [...context] },
          (p) =>
            setSteps((s) => s.map((x, j) => (j === i ? { ...x, output: p } : x))),
          ctrl.signal
        );
        context.push(out);
        setSteps((s) =>
          s.map((x, j) => (j === i ? { ...x, output: out, status: "done", open: j === titles.length - 1 } : { ...x, open: false }))
        );
      }
      setPhase("done");
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") {
        setPhase("stopped");
        setSteps((s) => s.map((x) => (x.status === "run" ? { ...x, status: "stop" } : x)));
      } else {
        setPhase("error");
        setError(e instanceof Error ? e.message : "Bilinmeyen hata.");
      }
    } finally {
      stopTimer();
      setRunning(false);
    }
  }

  function toggle(i: number) {
    setSteps((s) => s.map((x, j) => (j === i ? { ...x, open: !x.open } : x)));
  }

  const doneCount = steps.filter((s) => s.status === "done").length;
  const model = getModel(modelId);
  const allOutputs = steps.filter((s) => s.output).map((s) => `## ${s.title}\n\n${s.output}`).join("\n\n---\n\n");

  return (
    <div>
      <MobileNav />
      <h1 className="page-title">🤖 Agent Modu</h1>
      <p className="page-sub">
        Görevi yaz, agent planlasın ve adım adım uygulasın. Canlı ilerlemeyi izle, çıktıları kopyala.
      </p>

      <div className="arena-bar">
        <Link href="/settings" className={`engine-chip ${engine !== "mock" ? "live" : ""}`}>
          <span className="dot" /> Motor: {providerName(engine)} ⚙️
        </Link>
        <div className="model-picker" style={{ marginBottom: 0 }}>
          <label>Agent:</label>
          <select value={modelId} onChange={(e) => setModelId(e.target.value)} disabled={running}>
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} — {m.description}
              </option>
            ))}
          </select>
        </div>
        {phase !== "idle" && !running && (
          <button className="btn btn-ghost" style={{ padding: "7px 14px", fontSize: 12.5 }} onClick={reset}>
            🔄 Yeni görev
          </button>
        )}
      </div>

      {phase === "idle" && (
        <>
          <div className="suggest-grid">
            {TEMPLATES.map((s) => (
              <button key={s.title} className="suggest-card" onClick={() => run(s.task)} disabled={running}>
                <div className="t">{s.icon} {s.title}</div>
                <div className="d">{s.task.slice(0, 60)}…</div>
              </button>
            ))}
          </div>
          {recent.length > 0 && (
            <div className="settings-card">
              <h3>🕘 Son görevler</h3>
              <p className="hint">Tekrar çalıştırmak için tıkla.</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {recent.map((r) => (
                  <button key={r} className="action-btn" onClick={() => run(r)} disabled={running}>
                    ▶ {r.length > 50 ? r.slice(0, 50) + "…" : r}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {error && phase === "error" && <div className="error-note">⚠️ {error}</div>}

      {/* Görev başlığı + ilerleme */}
      {activeTask && (
        <div className="agent-task-card">
          <div className="agent-task-top">
            <div className="avatar" style={{ background: model.color }}>{model.name[0]}</div>
            <div style={{ flex: 1 }}>
              <div className="agent-task-title">{activeTask}</div>
              <div className="panel-sub">
                {phase === "plan" && "🗺️ Plan hazırlanıyor…"}
                {phase === "exec" && `⚙️ Çalışıyor — ${doneCount}/${steps.length} adım • ⏱️ ${fmtTime(elapsed)}`}
                {phase === "done" && `✅ Tamamlandı — ${steps.length} adım • ⏱️ ${fmtTime(elapsed)}`}
                {phase === "stopped" && `⏹️ Durduruldu — ${doneCount}/${steps.length} adım`}
                {phase === "error" && "❌ Hata oluştu"}
              </div>
            </div>
            {allOutputs && <CopyBtn text={allOutputs} small />}
          </div>
          {steps.length > 0 && (
            <div className="agent-progress">
              <div style={{ width: `${Math.round((doneCount / steps.length) * 100)}%` }} />
            </div>
          )}
        </div>
      )}

      {/* Plan akışı */}
      {phase === "plan" && (
        <div className="agent-plan-stream">
          <Markdown text={planRaw || "Plan hazırlanıyor…"} />
          <span className="typing" />
        </div>
      )}

      {steps.length > 0 && (
        <div className="agent-steps">
          {steps.map((s, i) => (
            <div key={i} className={`agent-step ${s.status}`}>
              <button className="agent-step-head" onClick={() => toggle(i)}>
                <span className="agent-step-ico">
                  {s.status === "done" ? "✅" : s.status === "run" ? "⚙️" : s.status === "stop" ? "⏹️" : "⭕"}
                </span>
                <span className="agent-step-title">
                  {i + 1}. {s.title}
                </span>
                <span className="agent-step-arrow">{s.open ? "▾" : "▸"}</span>
              </button>
              {s.open && (
                <div className="agent-step-body">
                  {s.output ? (
                    <>
                      <Markdown text={s.output} />
                      {s.status === "run" && <span className="typing" />}
                      {s.status === "done" && (
                        <div className="msg-actions">
                          <CopyBtn text={s.output} small />
                        </div>
                      )}
                    </>
                  ) : (
                    <span style={{ color: "var(--dim)" }}>
                      {s.status === "run" ? <>yazıyor… <span className="typing" /></> : "Bekliyor…"}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {phase === "done" && (
        <div className="vote-bar" style={{ borderColor: "var(--green)" }}>
          <div className="vote-title">🎉 Görev tamamlandı!</div>
          <div className="vote-result">
            {model.name} {steps.length} adımı {fmtTime(elapsed)} içinde bitirdi. Tüm çıktıları yukarıdan
            kopyalayabilir veya yeni bir görev başlatabilirsin.
          </div>
        </div>
      )}

      {/* Görev girişi */}
      <div className="composer">
        <div className="composer-row">
          <textarea
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="Agent'e bir görev ver… (örn. Portfolyo sitem için hakkımda yazısı + proje bölümü hazırla)"
            disabled={running}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                run();
              }
            }}
          />
          {running ? (
            <button className="btn btn-ghost" onClick={stop} style={{ borderColor: "var(--red)", color: "#ffa8a8" }}>
              ⏹ Durdur
            </button>
          ) : (
            <button className="btn btn-primary" disabled={!task.trim()} onClick={() => run()}>
              ▶ Çalıştır
            </button>
          )}
        </div>
        <div className="attach-row">
          <span>Agent önce plan çıkarır, sonra adımları tek tek uygular • Gerçek AI için Ayarlar&apos;dan anahtar ekle</span>
        </div>
      </div>
    </div>
  );
}
