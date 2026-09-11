"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import CopyBtn from "@/components/CopyBtn";
import { MODELS } from "@/lib/models";
import { streamAgent } from "@/lib/client";
import {
  parseCodeBlocks,
  assemblePreview,
  fileNameFromTask,
  SiteFiles,
} from "@/lib/builder";
import { getSettings, providerName, ProviderId } from "@/lib/settings";

interface Version {
  label: string;
  time: string;
  files: SiteFiles;
}

const TEMPLATES = [
  { icon: "🍽️", title: "Restoran", task: "Sıcak ve davetkar bir restoran tanıtım sitesi yap: hero, menü bölümü, rezervasyon formu ve iletişim." },
  { icon: "💼", title: "Portfolyo", task: "Freelance tasarımcı için modern portfolyo sitesi yap: hakkımda, projeler galerisi ve iletişim." },
  { icon: "🚀", title: "SaaS Landing", task: "Bir proje yönetim uygulaması için SaaS landing page yap: özellikler, fiyatlandırma ve kayıt formu." },
  { icon: "🏪", title: "Mini Mağaza", task: "El yapımı ürünler satan şık bir vitrin sitesi yap: ürün kartları, sepet butonu ve kampanya bandı." },
  { icon: "📝", title: "Blog", task: "Kişisel bir blog ana sayfası yap: öne çıkan yazı, yazı kartları ve bülten kayıt formu." },
  { icon: "🏋️", title: "Spor Salonu", task: "Spor salonu tanıtım sitesi yap: programlar, eğitmenler, üyelik fiyatları ve deneme dersi formu." },
];

type ViewTab = "preview" | "html" | "css" | "js";

export default function SiteBuilder() {
  const [task, setTask] = useState("");
  const [modelId, setModelId] = useState("coderx-70b");
  const [engine, setEngine] = useState<ProviderId>("mock");
  const [building, setBuilding] = useState(false);
  const [status, setStatus] = useState("");
  const [versions, setVersions] = useState<Version[]>([]);
  const [active, setActive] = useState(0);
  const [view, setView] = useState<ViewTab>("preview");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [refine, setRefine] = useState("");
  const [error, setError] = useState("");
  const [activeTask, setActiveTask] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      setEngine(getSettings().provider);
    } catch {
      /* yoksay */
    }
  }, []);

  const files = versions[active]?.files ?? null;

  async function build(taskOverride?: string) {
    const t = (taskOverride ?? task).trim();
    if (!t || building) return;
    setBuilding(true);
    setError("");
    setStatus("Tasarım planlanıyor…");
    setActiveTask(t);
    setTask("");
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const raw = await streamAgent(
        modelId,
        { kind: "build", task: t },
        (p) => setStatus(`Kod yazılıyor… (${p.length.toLocaleString("tr")} karakter)`),
        ctrl.signal
      );
      const f = parseCodeBlocks(raw);
      if (!f.html) throw new Error("Modelden geçerli kod alınamadı, tekrar deneyin.");
      const now = new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
      setVersions((v) => [...v, { label: `v${v.length + 1} — ilk sürüm`, time: now, files: f }].slice(-5));
      setActive((versions.length) % 5 === 4 ? 4 : versions.length);
      setView("preview");
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") setStatus("Durduruldu.");
      else setError(e instanceof Error ? e.message : "Bilinmeyen hata.");
    } finally {
      setBuilding(false);
      setStatus("");
    }
  }

  async function applyRefine() {
    const r = refine.trim();
    if (!r || building || !files) return;
    setBuilding(true);
    setError("");
    setStatus("Revizyon uygulanıyor…");
    setRefine("");
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const raw = await streamAgent(
        modelId,
        { kind: "refine", task: activeTask, files, request: r },
        (p) => setStatus(`Kod güncelleniyor… (${p.length.toLocaleString("tr")} karakter)`),
        ctrl.signal
      );
      const f = parseCodeBlocks(raw);
      if (!f.html) throw new Error("Modelden geçerli kod alınamadı, tekrar deneyin.");
      const now = new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
      setVersions((v) => {
        const next = [...v, { label: `v${v.length + 1} — ${r.slice(0, 40)}`, time: now, files: f }].slice(-5);
        setActive(next.length - 1);
        return next;
      });
      setView("preview");
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") setStatus("Durduruldu.");
      else setError(e instanceof Error ? e.message : "Bilinmeyen hata.");
    } finally {
      setBuilding(false);
      setStatus("");
    }
  }

  function download() {
    if (!files) return;
    const blob = new Blob([assemblePreview(files)], { type: "text/html;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileNameFromTask(activeTask || "sitem");
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function openNewTab() {
    if (!files) return;
    const blob = new Blob([assemblePreview(files)], { type: "text/html;charset=utf-8" });
    window.open(URL.createObjectURL(blob), "_blank");
  }

  return (
    <div>
      <div className="arena-bar">
        <Link href="/settings" className={`engine-chip ${engine !== "mock" ? "live" : ""}`}>
          <span className="dot" /> Motor: {providerName(engine)} ⚙️
        </Link>
        <div className="model-picker" style={{ marginBottom: 0 }}>
          <label>Kurucu:</label>
          <select value={modelId} onChange={(e) => setModelId(e.target.value)} disabled={building}>
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
        {versions.length > 0 && !building && (
          <button className="btn btn-ghost" style={{ padding: "7px 14px", fontSize: 12.5 }} onClick={() => { setVersions([]); setActive(0); setActiveTask(""); }}>
            🔄 Baştan başla
          </button>
        )}
      </div>

      {versions.length === 0 && (
        <div className="suggest-grid">
          {TEMPLATES.map((s) => (
            <button key={s.title} className="suggest-card" onClick={() => build(s.task)} disabled={building}>
              <div className="t">{s.icon} {s.title}</div>
              <div className="d">{s.task.slice(0, 62)}…</div>
            </button>
          ))}
        </div>
      )}

      {error && <div className="error-note">⚠️ {error}</div>}
      {building && <div className="builder-status">⚙️ {status || "Çalışıyor…"} <span className="typing" /></div>}

      {files && (
        <>
          <div className="builder-toolbar">
            <div className="builder-tabs">
              {(["preview", "html", "css", "js"] as ViewTab[]).map((v) => (
                <button key={v} className={`cat-tab ${view === v ? "active" : ""}`} onClick={() => setView(v)}>
                  {v === "preview" ? "🖥️ Önizleme" : v === "html" ? "📄 HTML" : v === "css" ? "🎨 CSS" : "⚡ JS"}
                </button>
              ))}
            </div>
            <div className="toolbar">
              {view === "preview" && (
                <>
                  <button className={`action-btn ${device === "desktop" ? "on" : ""}`} onClick={() => setDevice("desktop")}>🖥️ Masaüstü</button>
                  <button className={`action-btn ${device === "mobile" ? "on" : ""}`} onClick={() => setDevice("mobile")}>📱 Mobil</button>
                </>
              )}
              {view !== "preview" && <CopyBtn text={files[view]} small />}
              <button className="action-btn" onClick={openNewTab}>↗ Yeni sekme</button>
              <button className="action-btn" onClick={download}>⬇️ İndir (.html)</button>
            </div>
          </div>

          {versions.length > 1 && (
            <div className="builder-versions">
              {versions.map((v, i) => (
                <button key={i} className={`action-btn ${i === active ? "on" : ""}`} onClick={() => setActive(i)}>
                  {v.label} • {v.time}
                </button>
              ))}
            </div>
          )}

          {view === "preview" ? (
            <div className={`builder-frame-wrap ${device}`}>
              <iframe
                key={active + device}
                title="Site önizleme"
                className="builder-frame"
                sandbox="allow-scripts"
                srcDoc={assemblePreview(files)}
              />
            </div>
          ) : (
            <pre className="code-block builder-code">
              <span className="code-lang">{view}</span>
              <code>{files[view] || "(boş)"}</code>
            </pre>
          )}

          <div className="composer" style={{ marginTop: 12 }}>
            <div className="composer-row">
              <textarea
                value={refine}
                onChange={(e) => setRefine(e.target.value)}
                placeholder="Revizyon iste… (örn. Menüye fiyat bölümü ekle / Renkleri maviye çevir / Butonu büyüt)"
                disabled={building}
                style={{ minHeight: 44 }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    applyRefine();
                  }
                }}
              />
              <button className="btn btn-primary" disabled={building || !refine.trim()} onClick={applyRefine}>
                ✏️ Uygula
              </button>
            </div>
          </div>
        </>
      )}

      {/* Görev girişi */}
      <div className="composer" style={{ marginTop: files ? 12 : 0 }}>
        <div className="composer-row">
          <textarea
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="Ne tür bir site istiyorsun? (örn. Portfolyo sitem için tek sayfalık modern site yap)"
            disabled={building}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                build();
              }
            }}
          />
          {building ? (
            <button className="btn btn-ghost" onClick={() => abortRef.current?.abort()} style={{ borderColor: "var(--red)", color: "#ffa8a8" }}>
              ⏹ Durdur
            </button>
          ) : (
            <button className="btn btn-primary" disabled={!task.trim()} onClick={() => build()}>
              🏗️ Siteyi Kur
            </button>
          )}
        </div>
        <div className="attach-row">
          <span>Agent gerçek HTML/CSS/JS yazar • Önizleme anında açılır • Beğenmezsen revize et veya indir</span>
        </div>
      </div>
    </div>
  );
}
