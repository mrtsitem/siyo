// ─────────────────────────────────────────────
// Model kataloğu — arena.ai'deki gibi model listesi.
// Gerçek API bağlandığında bu ID'ler sağlayıcıya eşlenecek.
// ─────────────────────────────────────────────

export type ModelStyle =
  | "analytical"
  | "creative"
  | "concise"
  | "detailed"
  | "coder"
  | "friendly";

export interface AIModel {
  id: string;
  name: string;
  org: string;
  description: string;
  baseRating: number;
  color: string;
  style: ModelStyle;
  // Gerçek API'ye geçildiğinde kullanılacak sağlayıcı bilgisi
  provider?: "openai" | "anthropic" | "groq" | "gemini" | "mock";
  providerModel?: string;
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
    provider: "mock",
  },
  {
    id: "nova-pro",
    name: "Nova Pro",
    org: "Nova Labs",
    description: "Yaratıcı yazım ve fikir üretimi",
    baseRating: 1262,
    color: "#f06595",
    style: "creative",
    provider: "mock",
  },
  {
    id: "orion-max",
    name: "Orion Max",
    org: "Orion",
    description: "Derin, kapsamlı açıklamalar",
    baseRating: 1241,
    color: "#339af0",
    style: "detailed",
    provider: "mock",
  },
  {
    id: "coderx-70b",
    name: "CoderX 70B",
    org: "CoderX",
    description: "Kod yazma ve teknik sorular uzmanı",
    baseRating: 1215,
    color: "#51cf66",
    style: "coder",
    provider: "mock",
  },
  {
    id: "zephyr-turbo",
    name: "Zephyr Turbo",
    org: "Zephyr",
    description: "Hızlı ve öz cevaplar",
    baseRating: 1198,
    color: "#ffa94d",
    style: "concise",
    provider: "mock",
  },
  {
    id: "lyra-chat",
    name: "Lyra Chat",
    org: "Lyra",
    description: "Samimi günlük sohbet arkadaşı",
    baseRating: 1154,
    color: "#63e6be",
    style: "friendly",
    provider: "mock",
  },
  {
    id: "titan-lite",
    name: "Titan Lite",
    org: "Titan",
    description: "Hafif ve hızlı genel model",
    baseRating: 1109,
    color: "#e599f7",
    style: "concise",
    provider: "mock",
  },
  {
    id: "pulsar-1",
    name: "Pulsar 1",
    org: "Pulsar",
    description: "Mantık ve problem çözme odaklı",
    baseRating: 1076,
    color: "#ffd43b",
    style: "analytical",
    provider: "mock",
  },
];

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
