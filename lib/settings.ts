// ─────────────────────────────────────────────
// Motor ayarları (BYOK — kendi anahtarını getir).
// Anahtarlar SADECE tarayıcıda (localStorage) saklanır,
// sunucuya sadece istek anında gönderilir.
// ─────────────────────────────────────────────
"use client";

export type ProviderId = "mock" | "groq" | "openai" | "gemini";

export interface Settings {
  provider: ProviderId;
  keys: Record<Exclude<ProviderId, "mock">, string>;
}

export const PROVIDERS: {
  id: ProviderId;
  name: string;
  desc: string;
  keyUrl: string;
  keyPlaceholder: string;
}[] = [
  {
    id: "mock",
    name: "Demo Motoru",
    desc: "Anahtar gerekmez. Arayüzü ve oylamayı denemek için ideal.",
    keyUrl: "",
    keyPlaceholder: "",
  },
  {
    id: "groq",
    name: "Groq (önerilen, ücretsiz)",
    desc: "Çok hızlı + cömert ücretsiz katman. Llama modelleri çalışır.",
    keyUrl: "https://console.groq.com/keys",
    keyPlaceholder: "gsk_...",
  },
  {
    id: "openai",
    name: "OpenAI (ücretli)",
    desc: "GPT-4o / GPT-4o-mini. Kredi gerektirir.",
    keyUrl: "https://platform.openai.com/api-keys",
    keyPlaceholder: "sk-...",
  },
  {
    id: "gemini",
    name: "Google Gemini (ücretsiz katman)",
    desc: "Google AI Studio'dan ücretsiz anahtar alınabilir.",
    keyUrl: "https://aistudio.google.com/apikey",
    keyPlaceholder: "AIza...",
  },
];

const KEY = "arena.settings.v1";

export function defaultSettings(): Settings {
  return { provider: "mock", keys: { groq: "", openai: "", gemini: "" } };
}

export function getSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSettings();
    const p = JSON.parse(raw) as Partial<Settings>;
    return {
      provider: p.provider ?? "mock",
      keys: { groq: "", openai: "", gemini: "", ...(p.keys ?? {}) },
    };
  } catch {
    return defaultSettings();
  }
}

export function saveSettings(s: Settings): void {
  localStorage.setItem(KEY, JSON.stringify(s));
}

/** Aktif sağlayıcının anahtarı (yoksa boş string) */
export function activeKey(s: Settings): string {
  if (s.provider === "mock") return "";
  return (s.keys[s.provider] ?? "").trim();
}

export function providerName(id: ProviderId): string {
  return PROVIDERS.find((p) => p.id === id)?.name ?? id;
}
