import { NextRequest } from "next/server";
import { getModel, FALLBACKS } from "@/lib/models";
import { generateMockResponse } from "@/lib/mockAI";
import {
  callOpenAICompatible,
  callGemini,
  HistoryTurn,
} from "@/lib/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function splitChunks(text: string, size: number): string[] {
  const out: string[] = [];
  const words = text.split(/(\s+)/);
  let buf = "";
  for (const w of words) {
    buf += w;
    if (buf.length >= size) {
      out.push(buf);
      buf = "";
    }
  }
  if (buf) out.push(buf);
  return out;
}

type Provider = "mock" | "groq" | "openai" | "gemini";

async function generateFull(
  prompt: string,
  modelId: string,
  history: HistoryTurn[],
  provider: Provider,
  apiKey: string
): Promise<string> {
  const model = getModel(modelId);

  if (provider === "groq") {
    if (!apiKey) throw new Error("Groq anahtarı girilmedi. Ayarlar sayfasından ekleyin.");
    return callOpenAICompatible(
      "https://api.groq.com/openai/v1",
      apiKey,
      model,
      model.real.groq,
      FALLBACKS.groq,
      history,
      prompt
    );
  }
  if (provider === "openai") {
    if (!apiKey) throw new Error("OpenAI anahtarı girilmedi. Ayarlar sayfasından ekleyin.");
    return callOpenAICompatible(
      "https://api.openai.com/v1",
      apiKey,
      model,
      model.real.openai,
      FALLBACKS.openai,
      history,
      prompt
    );
  }
  if (provider === "gemini") {
    if (!apiKey) throw new Error("Gemini anahtarı girilmedi. Ayarlar sayfasından ekleyin.");
    return callGemini(apiKey, model, model.real.gemini, FALLBACKS.gemini, history, prompt);
  }
  // Varsayılan: demo motoru
  return generateMockResponse(prompt, model);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = String(body.prompt ?? "").slice(0, 4000);
    const modelId = String(body.modelId ?? "atlas-ultra");
    const history = (Array.isArray(body.history) ? body.history : []) as HistoryTurn[];
    const provider = (String(body.provider ?? "mock") as Provider) || "mock";
    const apiKey = String(body.apiKey ?? "");

    if (!prompt.trim()) {
      return new Response("Boş mesaj gönderilemez.", { status: 400 });
    }
    if (!["mock", "groq", "openai", "gemini"].includes(provider)) {
      return new Response("Geçersiz motor seçimi.", { status: 400 });
    }

    let full: string;
    try {
      full = await generateFull(prompt, modelId, history, provider, apiKey);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Üretim hatası.";
      return new Response(msg, { status: 502 });
    }

    const encoder = new TextEncoder();
    const chunks = splitChunks(full, 28);

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        for (const c of chunks) {
          controller.enqueue(encoder.encode(c));
          await sleep(20 + Math.random() * 40);
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Model-Id": modelId,
        "X-Provider": provider,
      },
    });
  } catch (e) {
    console.error("chat api error:", e);
    return new Response("Sunucu hatası.", { status: 500 });
  }
}
