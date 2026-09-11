import { NextRequest } from "next/server";
import { getModel } from "@/lib/models";
import { generateMockResponse } from "@/lib/mockAI";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function splitChunks(text: string, size: number): string[] {
  const out: string[] = [];
  // Kelime sınırından böl ki streaming doğal görünsün
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

// ─────────────────────────────────────────────
// Sağlayıcı katmanı.
// ŞU AN: API anahtarı yok → demo motoru (mock) kullanılır.
// SONRA: Groq / OpenAI / Gemini anahtarı eklenince buraya bağlanacak.
// Ortam değişkeni ör: GROQ_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY
// ─────────────────────────────────────────────
async function generateWithProvider(
  prompt: string,
  modelId: string
): Promise<string> {
  const model = getModel(modelId);

  // TODO(Adım 2): gerçek sağlayıcı entegrasyonu.
  // Örnek iskelet (Groq — OpenAI uyumlu, ücretsiz katmanı var):
  //
  // if (process.env.GROQ_API_KEY && model.provider === "groq") {
  //   const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
  //     method: "POST",
  //     headers: {
  //       "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
  //       "Content-Type": "application/json",
  //     },
  //     body: JSON.stringify({
  //       model: model.providerModel, // örn: "llama-3.3-70b-versatile"
  //       messages: [{ role: "user", content: prompt }],
  //     }),
  //   });
  //   const data = await res.json();
  //   return data.choices[0].message.content;
  // }

  return generateMockResponse(prompt, model);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = String(body.prompt ?? "").slice(0, 4000);
    const modelId = String(body.modelId ?? "atlas-ultra");

    if (!prompt.trim()) {
      return new Response("Boş mesaj gönderilemez.", { status: 400 });
    }

    const full = await generateWithProvider(prompt, modelId);
    const encoder = new TextEncoder();
    const chunks = splitChunks(full, 28);

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        for (const c of chunks) {
          controller.enqueue(encoder.encode(c));
          await sleep(25 + Math.random() * 45);
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Model-Id": modelId,
      },
    });
  } catch (e) {
    console.error("chat api error:", e);
    return new Response("Sunucu hatası.", { status: 500 });
  }
}
