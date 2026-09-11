// ─────────────────────────────────────────────
// Model kataloğu — arena.ai'deki gibi model listesi.
// `real` alanı: gerçek sağlayıcı seçildiğinde hangi
// modelin çağrılacağını belirler (otomatik eşleşme).
// ─────────────────────────────────────────────

export type ModelStyle =
  | "analytical"
  | "creative"
  | "concise"
  | "detailed"
  | "coder"
  | "friendly";

export interface RealMapping {
  groq: string;
  openai: string;
  gemini: string;
}

export interface AIModel {
  id: string;
  name: string;
  org: string;
  description: string;
  baseRating: number;
  color: string;
  style: ModelStyle;
  real: RealMapping;
}

export const MODELS: AIModel[] = [
  {
    id: "atlas-ultra",
    name: "Atlas Ultra",
    org: "Atlas AI",
    description: "Güçlü muhakeme ve analiz modeli",
    baseRating: 1287,
    color: "#7c6cf0",
    style: "analytical",
    real: {
      groq: "llama-3.3-70b-versatile",
      openai: "gpt-4o",
      gemini: "gemini-2.0-flash",
    },
  },
  {
    id: "nova-pro",
    name: "Nova Pro",
    org: "Nova Labs",
    description: "Yaratıcı yazım ve fikir üretimi",
    baseRating: 1262,
    color: "#f06595",
    style: "creative",
    real: {
      groq: "llama-3.3-70b-versatile",
      openai: "gpt-4o",
      gemini: "gemini-2.0-flash",
    },
  },
  {
    id: "orion-max",
    name: "Orion Max",
    org: "Orion",
    description: "Derin, kapsamlı açıklamalar",
    baseRating: 1241,
    color: "#339af0",
    style: "detailed",
    real: {
      groq: "llama-3.1-70b-versatile",
      openai: "gpt-4o",
      gemini: "gemini-1.5-pro",
    },
  },
  {
    id: "coderx-70b",
    name: "CoderX 70B",
    org: "CoderX",
    description: "Kod yazma ve teknik sorular uzmanı",
    baseRating: 1215,
    color: "#51cf66",
    style: "coder",
    real: {
      groq: "llama-3.3-70b-versatile",
      openai: "gpt-4o",
      gemini: "gemini-2.0-flash",
    },
  },
  {
    id: "zephyr-turbo",
    name: "Zephyr Turbo",
    org: "Zephyr",
    description: "Hızlı ve öz cevaplar",
    baseRating: 1198,
    color: "#ffa94d",
    style: "concise",
    real: {
      groq: "llama-3.1-8b-instant",
      openai: "gpt-4o-mini",
      gemini: "gemini-2.0-flash-lite",
    },
  },
  {
    id: "lyra-chat",
    name: "Lyra Chat",
    org: "Lyra",
    description: "Samimi günlük sohbet arkadaşı",
    baseRating: 1154,
    color: "#63e6be",
    style: "friendly",
    real: {
      groq: "llama-3.1-8b-instant",
      openai: "gpt-4o-mini",
      gemini: "gemini-1.5-flash",
    },
  },
  {
    id: "titan-lite",
    name: "Titan Lite",
    org: "Titan",
    description: "Hafif ve hızlı genel model",
    baseRating: 1109,
    color: "#e599f7",
    style: "concise",
    real: {
      groq: "gemma2-9b-it",
      openai: "gpt-4o-mini",
      gemini: "gemini-1.5-flash",
    },
  },
  {
    id: "pulsar-1",
    name: "Pulsar 1",
    org: "Pulsar",
    description: "Mantık ve problem çözme odaklı",
    baseRating: 1076,
    color: "#ffd43b",
    style: "analytical",
    real: {
      groq: "llama-3.3-70b-versatile",
      openai: "gpt-4.1-mini",
      gemini: "gemini-2.0-flash",
    },
  },
];

/** Bir model adı çalışmazsa denenecek yedekler */
export const FALLBACKS: Record<"groq" | "openai" | "gemini", string[]> = {
  groq: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
  openai: ["gpt-4o-mini", "gpt-3.5-turbo"],
  gemini: ["gemini-2.0-flash", "gemini-1.5-flash"],
};

export function getModel(id: string): AIModel {
  return MODELS.find((m) => m.id === id) ?? MODELS[0];
}

/** Battle için birbirinden farklı 2 rastgele model seç */
export function pickBattlePair(): [AIModel, AIModel] {
  const a = MODELS[Math.floor(Math.random() * MODELS.length)];
  let b = MODELS[Math.floor(Math.random() * MODELS.length)];
  let guard = 0;
  while (b.id === a.id && guard++ < 50) {
    b = MODELS[Math.floor(Math.random() * MODELS.length)];
  }
  return [a, b];
}
