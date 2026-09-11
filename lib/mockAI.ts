// ─────────────────────────────────────────────
// Demo AI motoru — API anahtarı olmadan siteyi çalıştırır.
// Gerçek API bağlandığında app/api/chat/route.ts içindeki
// generateWithProvider() fonksiyonu devralacak.
// ─────────────────────────────────────────────

import { AIModel } from "./models";

const TR_CHARS = /[çÇğĞıİöÖşŞüÜ]/;
const TR_WORDS =
  /\b(merhaba|selam|nasıl|nedir|nasılsın|teşekkür|lutfen|lütfen|yap|yapar|olur|için|değil|bir|şey|çok|neden|hangi|kaç|yaz|kod|örnek|anlat|açıkla|yardım|plan|fikir|hesapla|çevir|özet)\b/i;

function detectLang(prompt: string): "tr" | "en" {
  if (TR_CHARS.test(prompt) || TR_WORDS.test(prompt)) return "tr";
  return "en";
}

const CODE_HINT =
  /(kod|code|fonksiyon|function|python|javascript|typescript|react|sql|html|css|api|algoritma|algorithm|debug|hata|error|script|uygulama|app|program)/i;

function isGreeting(prompt: string): boolean {
  return /^(merhaba|selam|selamlar|hey|hi|hello|günaydın|iyi akşamlar|naber|nasılsın|how are you)\b/i.test(
    prompt.trim()
  );
}

function topicOf(prompt: string): string {
  const clean = prompt.replace(/\s+/g, " ").trim();
  if (clean.length <= 70) return clean;
  return clean.slice(0, 67) + "…";
}

function codeBlock(lang: "tr" | "en"): string {
  if (lang === "tr") {
    return (
      "```python\n" +
      "def merhaba(isim: str) -> str:\n" +
      '    """Kullanıcıyı selamlayan basit fonksiyon."""\n' +
      '    return f"Merhaba, {isim}! Hoş geldin."\n' +
      "\n" +
      'print(merhaba("Arena"))\n' +
      "```"
    );
  }
  return (
    "```python\n" +
    'def greet(name: str) -> str:\n' +
    '    """A simple greeting function."""\n' +
    '    return f"Hello, {name}! Welcome."\n' +
    "\n" +
    'print(greet("Arena"))\n' +
    "```"
  );
}

const OPENERS: Record<string, { tr: string[]; en: string[] }> = {
  analytical: {
    tr: ["Konuyu parçalara ayırarak inceleyelim.", "Önce mantıksal çerçeveyi kuralım."],
    en: ["Let's break this down step by step.", "First, let me frame this logically."],
  },
  creative: {
    tr: ["Harika bir konu! Biraz farklı açılardan bakalım.", "Hayal gücünü çalıştıralım."],
    en: ["Great topic! Let's look at it from fresh angles.", "Let's get imaginative here."],
  },
  concise: {
    tr: ["Kısa ve net cevap:", "Özetle:"],
    en: ["Short and clear:", "In brief:"],
  },
  detailed: {
    tr: ["Bu konuyu derinlemesine ele alalım.", "Tüm yönleriyle açıklıyorum:"],
    en: ["Let's cover this in depth.", "Here is the full picture:"],
  },
  coder: {
    tr: ["Teknik açıdan yaklaşıyorum.", "Önce problemi netleştirelim, sonra koda geçelim."],
    en: ["Approaching this technically.", "Let's define the problem, then jump to code."],
  },
  friendly: {
    tr: ["Selam! Sana yardımcı olmaya geldim.", "Güzel soru, birlikte bakalım!"],
    en: ["Hey! Happy to help with this.", "Nice question — let's figure it out together!"],
  },
};

const CLOSERS: Record<string, { tr: string[]; en: string[] }> = {
  analytical: {
    tr: ["Sonuç olarak: konuyu bu çerçevede değerlendirmen en sağlıklısı olur."],
    en: ["Bottom line: evaluating it through this framework is the soundest approach."],
  },
  creative: {
    tr: ["Umarım bu fikirler ilham vermiştir — devamını istersen genişletebilirim!"],
    en: ["Hope these ideas spark something — I can expand any of them!"],
  },
  concise: {
    tr: ["Başka bir şey lazım mı?"],
    en: ["Need anything else?"],
  },
  detailed: {
    tr: ["Özetle yukarıdaki tüm noktalar birlikte değerlendirilmeli. Detay istersen bir başlığı derinleştirebilirim."],
    en: ["In summary, all the points above should be weighed together. I can go deeper on any section."],
  },
  coder: {
    tr: ["Kodu kendi projen için uyarlayabilirsin. Hata alırsan mesajı paylaş, birlikte çözelim."],
    en: ["Feel free to adapt the code to your project. If you hit an error, share it and we'll fix it."],
  },
  friendly: {
    tr: ["Umarım yardımcı olmuşumdur! Başka bir konuda da buradayım."],
    en: ["Hope that helped! I'm here if you need anything else."],
  },
};

function pick(arr: string[], seed: number): string {
  return arr[Math.abs(seed) % arr.length];
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

/** Model tarzına göre demo cevabı üretir */
export function generateMockResponse(prompt: string, model: AIModel): string {
  const lang = detectLang(prompt);
  const topic = topicOf(prompt);
  const seed = hashStr(prompt + model.id);
  const opener = pick(OPENERS[model.style][lang], seed);
  const closer = pick(CLOSERS[model.style][lang], seed >> 3);
  const wantsCode = CODE_HINT.test(prompt);

  // Selamlaşma — kısa tut
  if (isGreeting(prompt) && prompt.trim().length < 40) {
    return lang === "tr"
      ? `${opener}\n\nBen **${model.name}** (${model.org}). Sana nasıl yardımcı olabilirim?\n\n- Soru sorabilir,\n- Kod yazmamı isteyebilir,\n- Fikir ve plan hazırlamamı isteyebilirsin.`
      : `${opener}\n\nI'm **${model.name}** (${model.org}). How can I help you today?\n\n- Ask me a question,\n- Request some code,\n- Or brainstorm ideas and plans.`;
  }

  const L: string[] = [];
  L.push(`## ${model.style === "coder" ? "💻" : model.style === "creative" ? "✨" : "📌"} ${topic}`);
  L.push("");
  L.push(opener);
  L.push("");

  if (model.style === "concise") {
    if (lang === "tr") {
      L.push(`**Kısa cevap:** "${topic}" konusunda bilmen gereken en önemli 3 şey:`);
      L.push("");
      L.push("1. **Temel kavramı anla** — önce işin özünü kavra, detay sonra gelir.");
      L.push("2. **Küçük adımlarla ilerle** — büyük hedefi parçalara böl.");
      L.push("3. **Pratik yap** — öğrendiklerini hemen uygula.");
    } else {
      L.push(`**Short answer:** the 3 most important things about "${topic}":`);
      L.push("");
      L.push("1. **Grasp the core idea** — details come later.");
      L.push("2. **Move in small steps** — split big goals into pieces.");
      L.push("3. **Practice** — apply what you learn right away.");
    }
  } else if (model.style === "coder" || wantsCode) {
    if (lang === "tr") {
      L.push("### Yaklaşım");
      L.push("");
      L.push("Problemi üç adımda çözüyorum: **anla → planla → kodla**. Aşağıda hemen çalıştırabileceğin bir örnek var:");
      L.push("");
      L.push(codeBlock(lang));
      L.push("");
      L.push("### Neden bu şekilde?");
      L.push("");
      L.push("- **Okunabilirlik:** fonksiyon küçük ve tek iş yapıyor.");
      L.push("- **Tip ipuçları:** hata yakalamayı kolaylaştırıyor.");
      L.push("- **Test edilebilir:** her parça ayrı denenebilir.");
    } else {
      L.push("### Approach");
      L.push("");
      L.push("I solve this in three steps: **understand → plan → code**. Here's a runnable example:");
      L.push("");
      L.push(codeBlock(lang));
      L.push("");
      L.push("### Why this way?");
      L.push("");
      L.push("- **Readable:** the function is small and does one thing.");
      L.push("- **Type hints:** make catching bugs easier.");
      L.push("- **Testable:** each part can be tried separately.");
    }
  } else if (model.style === "creative") {
    if (lang === "tr") {
      L.push("### 3 Farklı Bakış Açısı");
      L.push("");
      L.push("**1. Hikâye gibi düşün:** Konuyu bir karakterin yolculuğu gibi anlat. Başlangıç, dönüm noktası ve çözüm olsun.");
      L.push("");
      L.push("**2. Tersinden bak:** Herkesin yaptığının tersini dene. Çoğu orijinal fikir buradan çıkar.");
      L.push("");
      L.push("**3. Karıştır ve eşleştir:** İki alakasız fikri birleştir — örn. müzik + matematik, oyun + eğitim.");
      L.push("");
      L.push(`"${topic}" için bu üçünden birini seçip derinleşebiliriz.`);
    } else {
      L.push("### 3 Different Angles");
      L.push("");
      L.push("**1. Think in stories:** frame the topic as a character's journey — setup, twist, resolution.");
      L.push("");
      L.push("**2. Flip it:** try the opposite of what everyone does. Most original ideas live there.");
      L.push("");
      L.push("**3. Mash it up:** combine two unrelated ideas — e.g. music + math, games + learning.");
      L.push("");
      L.push(`Pick one of these for "${topic}" and we can go deeper.`);
    }
  } else {
    // analytical / detailed / friendly → yapılandırılmış cevap
    if (lang === "tr") {
      L.push("### Genel Bakış");
      L.push("");
      L.push(`"${topic}" konusunu değerlendirirken önce hedefini netleştirmen önemli. Ne istediğini bilirsen doğru yöntemi seçmek kolaylaşır.`);
      L.push("");
      L.push("### Önemli Noktalar");
      L.push("");
      L.push("- **Bağlam:** Konunun hangi durumda geçtiği cevabı değiştirir.");
      L.push("- **Öncelikler:** En kritik 1-2 maddeye odaklan, gerisini ele.");
      L.push("- **Kaynaklar:** Zamanın ve araçların sınırlıysa basit çözüm genelde en iyisidir.");
      L.push("");
      L.push("### Önerilen Adımlar");
      L.push("");
      L.push("1. Hedefi tek cümleyle yaz.");
      L.push("2. İlk küçük adımı bugün at.");
      L.push("3. Sonucu gözden geçir ve yönünü düzelt.");
      if (model.style === "detailed") {
        L.push("");
        L.push("### Ekstra İpucu");
        L.push("");
        L.push("Aynı konuda farklı kaynaklardan 2-3 görüş oku; tek kaynağa bağlı kalmak yanılgıya yol açar. Notlarını kısa tut ama düzenli tekrar et.");
      }
    } else {
      L.push("### Overview");
      L.push("");
      L.push(`When thinking about "${topic}", clarifying your goal matters most. Knowing what you want makes picking the right method easy.`);
      L.push("");
      L.push("### Key Points");
      L.push("");
      L.push("- **Context:** the situation changes the answer.");
      L.push("- **Priorities:** focus on the 1–2 most critical items.");
      L.push("- **Resources:** with limited time and tools, the simple solution is usually best.");
      L.push("");
      L.push("### Suggested Steps");
      L.push("");
      L.push("1. Write the goal in one sentence.");
      L.push("2. Take the first small step today.");
      L.push("3. Review the result and adjust direction.");
      if (model.style === "detailed") {
        L.push("");
        L.push("### Extra Tip");
        L.push("");
        L.push("Read 2–3 views on the topic from different sources; relying on one source misleads. Keep notes short but review them regularly.");
      }
    }
  }

  L.push("");
  L.push(closer);

  // Battle'da çeşitlilik için modele özel imza cümlesi (kimlik gizliyken görünmez bilgi vermez)
  return L.join("\n");
}
