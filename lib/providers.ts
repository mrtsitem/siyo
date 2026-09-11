// ─────────────────────────────────────────────
// Gerçek AI sağlayıcı çağrıları (sunucu tarafı).
// Kullanıcının anahtarı istek anında gelir, saklanmaz.
// ─────────────────────────────────────────────

import { AIModel } from "./models";

export interface HistoryTurn {
  role: "user" | "assistant";
  text: string;
}

const TEMP: Record<AIModel["style"], number> = {
  analytical: 0.5,
  creative: 0.9,
  concise: 0.3,
  detailed: 0.6,
  coder: 0.4,
  friendly: 0.7,
};

function sysPrompt(model: AIModel): string {
  return (
    `Sen ${model.name} adlı bir yapay zekâ asistanısın. ` +
    `Kullanıcının dilinde cevap ver (Türkçe sorarsa Türkçe, İngilizce sorarsa İngilizce). ` +
    `Gerektiğinde Markdown (başlık, liste, kod bloğu) kullan. Kısa ve öz olmaktan çok faydalı olmaya odaklan.`
  );
}

interface OpenAIMsg {
  role: "system" | "user" | "assistant";
  content: string;
}

/** OpenAI-uyumlu endpoint (OpenAI kendisi + Groq) */
export async function callOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  model: AIModel,
  modelName: string,
  fallbacks: string[],
  history: HistoryTurn[],
  prompt: string
): Promise<string> {
  const msgs: OpenAIMsg[] = [
    { role: "system", content: sysPrompt(model) },
    ...history.slice(-10).map((h): OpenAIMsg => ({ role: h.role, content: h.text })),
    { role: "user", content: prompt },
  ];

  let lastErr = "";
  const tried = new Set<string>();
  for (const m of [modelName, ...fallbacks]) {
    if (!m || tried.has(m)) continue;
    tried.add(m);
    let res: Response;
    try {
      res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: m,
          messages: msgs,
          temperature: TEMP[model.style],
          max_tokens: 1500,
        }),
      });
    } catch {
      throw new Error("Sağlayıcıya bağlanılamadı. İnternet/VPN durumunu kontrol et.");
    }

    if (res.ok) {
      const data = await res.json();
      const t = data?.choices?.[0]?.message?.content;
      if (t && String(t).trim()) return String(t);
      lastErr = "boş cevap";
      continue;
    }
    let txt = "";
    try {
      txt = await res.text();
    } catch {
      /* yoksay */
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error("API anahtarı geçersiz veya yetkisiz (401). Ayarlar'dan anahtarını kontrol et.");
    }
    if (res.status === 429) {
      throw new Error("Hız/kota limiti aşıldı (429). Biraz bekleyip tekrar dene.");
    }
    lastErr = `${m} → HTTP ${res.status}: ${txt.slice(0, 160)}`;
  }
  throw new Error(`Model çağrısı başarısız. ${lastErr}`);
}

/** Google Gemini */
export async function callGemini(
  apiKey: string,
  model: AIModel,
  modelName: string,
  fallbacks: string[],
  history: HistoryTurn[],
  prompt: string
): Promise<string> {
  const contents = [
    ...history.slice(-10).map((h) => ({
      role: h.role === "assistant" ? "model" : "user",
      parts: [{ text: h.text }],
    })),
    { role: "user", parts: [{ text: prompt }] },
  ];

  let lastErr = "";
  const tried = new Set<string>();
  for (const m of [modelName, ...fallbacks]) {
    if (!m || tried.has(m)) continue;
    tried.add(m);
    let res: Response;
    try {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: sysPrompt(model) }] },
            contents,
            generationConfig: {
              temperature: TEMP[model.style],
              maxOutputTokens: 1500,
            },
          }),
        }
      );
    } catch {
      throw new Error("Google'a bağlanılamadı. İnternet/VPN durumunu kontrol et.");
    }

    if (res.ok) {
      const data = await res.json();
      const parts = data?.candidates?.[0]?.content?.parts as
        | { text?: string }[]
        | undefined;
      const t = (parts ?? []).map((p) => p.text ?? "").join("");
      if (t.trim()) return t;
      lastErr = "boş cevap";
      continue;
    }
    let txt = "";
    try {
      txt = await res.text();
    } catch {
      /* yoksay */
    }
    if (/API_KEY_INVALID/i.test(txt)) {
      throw new Error("Gemini API anahtarı geçersiz. Ayarlar'dan anahtarını kontrol et.");
    }
    if (res.status === 429) {
      throw new Error("Hız/kota limiti aşıldı (429). Biraz bekleyip tekrar dene.");
    }
    lastErr = `${m} → HTTP ${res.status}: ${txt.slice(0, 160)}`;
  }
  throw new Error(`Gemini çağrısı başarısız. ${lastErr}`);
}
