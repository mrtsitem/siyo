"use client";

import { useEffect, useState } from "react";
import MobileNav from "@/components/MobileNav";
import {
  PROVIDERS,
  ProviderId,
  getSettings,
  saveSettings,
  Settings,
} from "@/lib/settings";
import { streamChat } from "@/lib/client";

export default function SettingsPage() {
  const [provider, setProvider] = useState<ProviderId>("mock");
  const [keys, setKeys] = useState<Settings["keys"]>({ groq: "", openai: "", gemini: "" });
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testOut, setTestOut] = useState("");
  const [testErr, setTestErr] = useState(false);

  useEffect(() => {
    const s = getSettings();
    setProvider(s.provider);
    setKeys(s.keys);
  }, []);

  function save(): Settings {
    const s: Settings = { provider, keys };
    saveSettings(s);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    return s;
  }

  async function test() {
    save();
    setTesting(true);
    setTestOut("");
    setTestErr(false);
    try {
      await streamChat(
        "Kısaca kendini tek cümleyle tanıt.",
        "atlas-ultra",
        (p) => setTestOut(p),
        []
      );
    } catch (e: unknown) {
      setTestErr(true);
      setTestOut(e instanceof Error ? e.message : "Bağlantı hatası.");
    } finally {
      setTesting(false);
    }
  }

  const active = PROVIDERS.find((p) => p.id === provider)!;
  const needsKey = provider !== "mock";

  return (
    <div>
      <MobileNav />
      <h1 className="page-title">⚙️ Ayarlar</h1>
      <p className="page-sub">
        Cevap motorunu seç. Anahtarlar yalnızca bu tarayıcıda saklanır, kimseyle paylaşılmaz.
      </p>

      <div className="settings-card">
        <h3>🔌 Cevap motoru</h3>
        <p className="hint">Battle ve sohbetlerde hangi yapay zekânın cevap vereceğini seç.</p>
        <div className="prov-list">
          {PROVIDERS.map((p) => (
            <label key={p.id} className={`prov-item ${provider === p.id ? "selected" : ""}`}>
              <input
                type="radio"
                name="provider"
                checked={provider === p.id}
                onChange={() => setProvider(p.id)}
              />
              <span>
                <span className="prov-name">{p.name}</span>
                <br />
                <span className="prov-desc">{p.desc}</span>
              </span>
            </label>
          ))}
        </div>

        {needsKey && (
          <>
            <div className="key-row">
              <input
                type={showKey ? "text" : "password"}
                placeholder={active.keyPlaceholder}
                value={keys[provider as "groq" | "openai" | "gemini"]}
                onChange={(e) =>
                  setKeys({ ...keys, [provider]: e.target.value })
                }
                autoComplete="off"
                spellCheck={false}
              />
              <button className="btn btn-ghost" onClick={() => setShowKey((s) => !s)}>
                {showKey ? "🙈 Gizle" : "👁️ Göster"}
              </button>
            </div>
            <p className="hint" style={{ marginTop: 8, marginBottom: 0 }}>
              Anahtarın yok mu?{" "}
              <a className="key-link" href={active.keyUrl} target="_blank" rel="noreferrer">
                Buradan ücretsiz al → {active.keyUrl.replace("https://", "")}
              </a>
            </p>
          </>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
          <button className="btn btn-primary" onClick={() => save()}>
            💾 Kaydet
          </button>
          <button className="btn btn-ghost" onClick={test} disabled={testing}>
            {testing ? "⏳ Test ediliyor…" : "🧪 Bağlantıyı test et"}
          </button>
          {saved && <span className="saved-note">✓ Kaydedildi</span>}
        </div>

        {(testOut || testing) && (
          <div className={`test-box ${testErr ? "err" : ""}`}>
            {testOut || "Test ediliyor…"}
            {testing && !testErr && " ▍"}
          </div>
        )}
      </div>

      <div className="settings-card">
        <h3>🧠 Model eşleşmesi</h3>
        <p className="hint">
          Gerçek motor seçildiğinde arena modelleri otomatik eşleşir: güçlü modeller büyük modellere
          (örn. Llama 70B / GPT-4o), hafif modeller hızlı modellere (örn. Llama 8B / GPT-4o-mini) bağlanır.
          Bir model adı çalışmazsa sistem otomatik yedeğe geçer.
        </p>
      </div>

      <div className="settings-card">
        <h3>🔒 Gizlilik</h3>
        <p className="hint" style={{ marginBottom: 0 }}>
          API anahtarların <strong>localStorage</strong>&apos;da, sadece bu cihazda durur. Sunucuya yalnızca
          cevap üretilirken gönderilir ve hiçbir yerde kaydedilmez. Ortak bilgisayar kullanıyorsan işin bitince
          anahtarı buradan sil.
        </p>
      </div>
    </div>
  );
}
