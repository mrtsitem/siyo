// ─────────────────────────────────────────────
// Agent Modu çekirdeği: plan + adım çalıştırma.
// Hem demo motoru hem gerçek sağlayıcılar için.
// ─────────────────────────────────────────────

import { AIModel } from "./models";

// ── Gerçek sağlayıcılara gönderilen komutlar ──

export function buildPlanPrompt(task: string): string {
  return (
    `Görev: ${task}\n\n` +
    `Yukarıdaki görevi 3 ile 6 arasında somut, uygulanabilir adıma böl. ` +
    `SADECE adımları listele; her satır tam olarak şu formatta olsun:\n` +
    `STEP: <adım başlığı>\n` +
    `Başka hiçbir açıklama yazma.`
  );
}

export function buildStepPrompt(args: {
  task: string;
  plan: string[];
  step: string;
  index: number;
  total: number;
  context: string[];
}): string {
  const { task, plan, step, index, total, context } = args;
  const planList = plan.map((p, i) => `${i + 1}) ${p}`).join("\n");
  const ctx =
    context.length > 0
      ? `\nÖnceki adımların özet çıktıları:\n${context
          .map((c, i) => `--- Adım ${i + 1} çıktısı ---\n${c.slice(0, 700)}`)
          .join("\n")}\n`
      : "";
  return (
    `Görev: ${task}\n\nPlan:\n${planList}\n${ctx}\n` +
    `Şimdi uygula — Adım ${index + 1}/${total}: ${step}\n\n` +
    `Bu adımı şimdi gerçekleştir ve somut çıktıyı üret. Markdown kullan, ` +
    `kod gerekiyorsa kod bloğu yaz. Kısa bir giriş, ardından asıl çıktı, ` +
    `sonunda tek cümlelik sonuç yaz.`
  );
}

// ── Plan ayrıştırma ──

export function parsePlan(text: string): string[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const steps: string[] = [];
  for (const l of lines) {
    const m = l.match(/^(?:STEP|ADIM)\s*:\s*(.+)$/i) || l.match(/^Step\s*\d+\s*:\s*(.+)$/i);
    if (m && m[1].length > 2) steps.push(m[1].trim().slice(0, 160));
  }
  if (steps.length > 0) return steps.slice(0, 6);
  // Yedek: numaralı liste
  for (const l of lines) {
    const m = l.match(/^\d+[.)]\s+(.+)$/);
    if (m && m[1].length > 4 && !/^(not|evet|tamam)/i.test(m[1])) {
      steps.push(m[1].trim().slice(0, 160));
    }
  }
  return steps.slice(0, 6);
}

// ── Demo motoru: plan üret ──

const CODE_HINT =
  /(kod|code|python|javascript|typescript|react|next|sql|html|css|api|uygulama|uygulaması|oyun|game|dashboard|landing|site|web|uygulama|yazılım|program|bot|script)/i;
const WRITE_HINT =
  /(yaz|blog|makale|hikaye|hikâye|şiir|metin|içerik|reklam|mektup|e-posta|eposta|sunum|rapor|özet|plân|plan)/i;

export function generateMockPlan(task: string, model: AIModel): string {
  const t = task.toLocaleLowerCase("tr");
  let steps: string[];
  if (CODE_HINT.test(t)) {
    steps = [
      "Gereksinimleri analiz et ve teknolojiyi seç",
      "Proje iskeletini ve dosya yapısını oluştur",
      "Ana özelliği kodla",
      "Test senaryolarını çalıştır ve hataları düzelt",
      "Son dokunuşlar ve kurulum özeti",
    ];
  } else if (WRITE_HINT.test(t)) {
    steps = [
      "Hedef kitleyi ve tonu belirle",
      "Taslak ve bölüm başlıklarını hazırla",
      "İçeriği bölüm bölüm üret",
      "Gözden geçir, sadeleştir ve iyileştir",
      "Final çıktıyı ve önerileri sun",
    ];
  } else {
    steps = [
      "Görevi parçalara ayır ve önceliklendir",
      "Gerekli bilgileri topla",
      "Çözümü adım adım uygula",
      "Sonucu kontrol et ve eksikleri kapat",
      "Özet rapor hazırla",
    ];
  }
  const L = [`Plan hazır — ${model.name} ${steps.length} adımda ilerleyecek:`, ""];
  for (const s of steps) L.push(`STEP: ${s}`);
  return L.join("\n");
}

function snippetFor(task: string): { lang: string; code: string } {
  const t = task.toLocaleLowerCase("tr");
  if (/react|jsx|component|bileşen/.test(t)) {
    return {
      lang: "jsx",
      code:
        `function Kart({ baslik, aciklama }) {\n` +
        `  return (\n` +
        `    <div className="kart">\n` +
        `      <h2>{baslik}</h2>\n` +
        `      <p>{aciklama}</p>\n` +
        `      <button>İncele</button>\n` +
        `    </div>\n` +
        `  );\n` +
        `}`,
    };
  }
  if (/html|css|landing|site|sayfa/.test(t)) {
    return {
      lang: "html",
      code:
        `<section class="hero">\n` +
        `  <h1>Dakikalar içinde yayına alın</h1>\n` +
        `  <p>Kod yazmadan modern sayfalar oluşturun.</p>\n` +
        `  <a class="btn" href="#basla">Hemen Başla</a>\n` +
        `</section>`,
    };
  }
  if (/sql|veritabanı|database|tablo/.test(t)) {
    return {
      lang: "sql",
      code:
        `CREATE TABLE urunler (\n` +
        `  id SERIAL PRIMARY KEY,\n` +
        `  ad VARCHAR(120) NOT NULL,\n` +
        `  fiyat NUMERIC(10,2) NOT NULL,\n` +
        `  stok INT DEFAULT 0\n` +
        `);`,
    };
  }
  return {
    lang: "python",
    code:
      `def ozet(metin: str, limit: int = 3) -> list[str]:\n` +
      `    """Metni cümlelere bölüp ilk N cümleyi döndürür."""\n` +
      `    cumleler = [c.strip() for c in metin.split(".") if c.strip()]\n` +
      `    return cumleler[:limit]\n` +
      `\n` +
      `print(ozet("Arena güçlü bir araçtır. Hızlı çalışır. Kolay kullanılır."))`,
  };
}

// ── Demo motoru: adım çıktısı üret ──

export function generateMockStep(
  task: string,
  step: string,
  index: number,
  total: number,
  model: AIModel
): string {
  const isCode = CODE_HINT.test(task + " " + step);
  const L: string[] = [];
  L.push(`## Adım ${index + 1}/${total}: ${step}`);
  L.push("");
  L.push(`${model.name} bu adımı uyguluyor:`);
  L.push("");

  if (/analiz|belirle|gereksinim|hedef|parçal|bilgi|topla/i.test(step)) {
    L.push("### Tespitler");
    L.push("");
    L.push(`- **Görev:** ${task.length > 120 ? task.slice(0, 120) + "…" : task}`);
    L.push("- **Kapsam:** tek seferde bitirilebilir büyüklükte.");
    L.push("- **Risk:** belirsiz noktalar varsayımlarla kapatıldı.");
    L.push("- **Çıktı formatı:** Markdown + " + (isCode ? "çalışır kod" : "madde listeleri") + ".");
  } else if (/kodla|kod|iskelet|dosya|oluştur|üret|uygula|özellik/i.test(step)) {
    L.push("### Uygulama");
    L.push("");
    L.push("Bu adımın somut çıktısı aşağıda:");
    L.push("");
    if (isCode) {
      const s = snippetFor(task);
      L.push("```" + s.lang);
      L.push(s.code);
      L.push("```");
      L.push("");
      L.push("- Kod doğrudan kopyalanıp çalıştırılabilir.");
      L.push("- Değişken ve fonksiyon adları açıklayıcı seçildi.");
    } else {
      L.push("1. **Taslak hazırlandı** — ana başlıklar çıkarıldı.");
      L.push("2. **İçerik üretildi** — her başlık 2-3 cümleyle dolduruldu.");
      L.push("3. **Tutarlılık sağlandı** — dil ve üslup birliği kuruldu.");
    }
  } else if (/test|kontrol|gözden|düzelt|hata|eksik/i.test(step)) {
    L.push("### Kontrol Listesi");
    L.push("");
    L.push("- [x] Çıktı görev tanımıyla eşleşiyor");
    L.push("- [x] " + (isCode ? "Kod sözdizimi tutarlı, örnek girdiyle doğrulandı" : "Dil ve imla gözden geçirildi"));
    L.push("- [x] Eksik nokta kalmadı");
    L.push("");
    L.push("Bulunan 1 küçük sorun giderildi, çıktı güncellendi.");
  } else {
    L.push("### Sonuç");
    L.push("");
    L.push("Bu adım tamamlandı. Elde edilenler:");
    L.push("");
    L.push("- Adım hedefi karşılandı.");
    L.push("- Sonraki adıma hazır girdi üretildi.");
    if (index === total - 1) {
      L.push("");
      L.push(`**Görev tamamlandı.** "${task.length > 80 ? task.slice(0, 80) + "…" : task}" için tüm adımlar uygulandı. Çıktıları yukarıdan kopyalayabilirsin. 🎉`);
    }
  }

  L.push("");
  L.push(`*Adım ${index + 1}/${total} tamamlandı.* ✅`);
  return L.join("\n");
}
