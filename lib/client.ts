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

async function postStream(
  body: Record<string, unknown>,
  onChunk: (partial: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
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

export async function streamChat(
  prompt: string,
  modelId: string,
  onChunk: (partial: string) => void,
  history: HistTurn[] = []
): Promise<string> {
  const s = getSettings();
  return postStream(
    {
      prompt,
      modelId,
      history: history.slice(-10),
      provider: s.provider,
      apiKey: activeKey(s),
    },
    onChunk
  );
}

// ── Agent istekleri ──

export type AgentRequest =
  | { kind: "plan"; task: string }
  | {
      kind: "step";
      task: string;
      plan: string[];
      step: string;
      index: number;
      total: number;
      context: string[];
    }
  | { kind: "build"; task: string }
  | {
      kind: "refine";
      task: string;
      files: { html: string; css: string; js: string };
      request: string;
    };

export async function streamAgent(
  modelId: string,
  req: AgentRequest,
  onChunk: (partial: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const s = getSettings();
  const prompt =
    req.kind === "plan"
      ? req.task
      : req.kind === "step"
      ? req.step
      : req.kind === "build"
      ? req.task
      : req.request;
  return postStream(
    {
      prompt,
      modelId,
      history: [],
      provider: s.provider,
      apiKey: activeKey(s),
      agent: req,
    },
    onChunk,
    signal
  );
}
