// ─────────────────────────────────────────────
// İstemci → /api/chat streaming yardımcısı.
// Ayarlardaki motor + anahtar otomatik eklenir.
// ─────────────────────────────────────────────
"use client";

import { getSettings, activeKey } from "./settings";

export interface HistTurn {
  role: "user" | "assistant";
  text: string;
}

export async function streamChat(
  prompt: string,
  modelId: string,
  onChunk: (partial: string) => void,
  history: HistTurn[] = []
): Promise<string> {
  const s = getSettings();
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      modelId,
      history: history.slice(-10),
      provider: s.provider,
      apiKey: activeKey(s),
    }),
  });
  if (!res.ok || !res.body) {
    let msg = "API hatası";
    try {
      msg = (await res.text()) || msg;
    } catch {
      /* yoksay */
    }
    throw new Error(msg);
  }
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
