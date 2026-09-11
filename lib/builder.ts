// ─────────────────────────────────────────────
// Site Kurucu çekirdeği: kod üretimi, ayrıştırma,
// önizleme birleştirme. Demo + gerçek motor uyumlu.
// ─────────────────────────────────────────────

import { AIModel } from "./models";

export interface SiteFiles {
  html: string;
  css: string;
  js: string;
}

// ── Model çıktısından kod bloklarını çek ──

export function parseCodeBlocks(text: string): SiteFiles {
  const files: SiteFiles = { html: "", css: "", js: "" };
  const re = /```(\w*)\n([\s\S]*?)```/g;
  const blocks: { lang: string; code: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    blocks.push({ lang: (m[1] || "").toLowerCase(), code: m[2].trim() });
  }
  for (const b of blocks) {
    if ((b.lang === "html" || b.lang === "htm") && !files.html) files.html = b.code;
    else if (b.lang === "css" && !files.css) files.css = b.code;
    else if ((b.lang === "js" || b.lang === "javascript") && !files.js) files.js = b.code;
  }
  if (!files.html && blocks.length > 0) {
    const first =
      blocks.find((b) =>
        /<(!doctype|html|head|body|header|main|section|div|nav)/i.test(b.code)
      ) ?? blocks[0];
    files.html = first.code;
  }
  // html içindeki gömülü style/script'i temizle (çift eklenmesin)
  files.html = files.html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "");
  return files;
}

// ── Önizleme için tek belgeye birleştir ──

export function assemblePreview(f: SiteFiles): string {
  const css = f.css ? `<style>\n${f.css}\n</style>` : "";
  const jsTag = f.js ? `<script>\n${f.js}\n</scr` + `ipt>` : "";
  let html = f.html.trim();
  if (/<html[\s>]/i.test(html)) {
    if (css) {
      html = /<\/head>/i.test(html)
        ? html.replace(/<\/head>/i, css + "\n</head>")
        : css + "\n" + html;
    }
    if (jsTag) {
      html = /<\/body>/i.test(html)
        ? html.replace(/<\/body>/i, jsTag + "\n</body>")
        : html + "\n" + jsTag;
    }
    return html;
  }
  return (
    `<!DOCTYPE html>\n<html lang="tr">\n<head>\n` +
    `<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n` +
    `<title>Site Önizleme</title>\n${css}\n</head>\n<body>\n${html}\n${jsTag}\n</body>\n</html>`
  );
}

// ── Gerçek sağlayıcı komutları ──

const FORMAT_RULES = `Kurallar:
- SADECE kod blokları döndür, başka açıklama yazma.
- Sırasıyla şu 3 bloğu ver: \`\`\`html , \`\`\`css , \`\`\`js
- html bloğu eksiksiz bir HTML belgesi olsun (<html><head><body> ile) AMA <style> ve <script> etiketi İÇERMESİN.
- Tüm stiller css bloğunda, tüm etkileşim js bloğunda olsun.
- Tasarım modern, responsive ve Türkçe içerikli olsun.`;

export function buildWebsitePrompt(task: string): string {
  return (
    `Sen uzman bir front-end geliştiricisin. Şu siteyi tek sayfa olarak kodla:\n\n${task}\n\n` +
    FORMAT_RULES
  );
}

export function refineWebsitePrompt(files: SiteFiles, request: string): string {
  const cur =
    `MEVCUT HTML:\n\`\`\`html\n${files.html.slice(0, 6000)}\n\`\`\`\n\n` +
    `MEVCUT CSS:\n\`\`\`css\n${files.css.slice(0, 4000)}\n\`\`\`\n\n` +
    `MEVCUT JS:\n\`\`\`js\n${files.js.slice(0, 2500)}\n\`\`\``;
  return (
    `Sen uzman bir front-end geliştiricisin. Aşağıdaki sitenin TAMAMINI, istenen değişikliği uygulayarak baştan yaz.\n\n` +
    `DEĞİŞİKLİK İSTEĞİ: ${request}\n\n${cur}\n\n` +
    FORMAT_RULES
  );
}

// ── Demo motoru: şık site üret ──

const THEMES = [
  { p: "#7c6cf0", s: "#f06595", bg: "#0b0e17", card: "#151b2e", name: "Gece Moru" },
  { p: "#0ea5a5", s: "#84e0b8", bg: "#071417", card: "#0d2226", name: "Okyanus" },
  { p: "#f59f00", s: "#ff6b6b", bg: "#170f07", card: "#241610", name: "Gün Batımı" },
  { p: "#4dabf7", s: "#b197fc", bg: "#0a1017", card: "#121c28", name: "Buzul" },
];

const STOP = new Set([
  "yap", "yaparmısın", "hazırla", "hazırlar", "tasarla", "oluştur", "kur", "kodla",
  "site", "sitesi", "sitem", "website", "web", "sayfa", "sayfası", "için", "bir", "bana",
  "modern", "şık", "güzel", "basit", "tarz", "lütfen", "lutfen", "istiyorum", "lazım",
]);

function titleFromTask(task: string): string {
  const words = task
    .replace(/[?!.,:;'"()]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w.toLocaleLowerCase("tr")));
  const pick = words.slice(0, 3).join(" ");
  if (!pick) return "Benim Sitem";
  return pick
    .split(" ")
    .map((w) => w.charAt(0).toLocaleUpperCase("tr") + w.slice(1))
    .join(" ");
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function generateMockWebsite(task: string, seedExtra = ""): SiteFiles {
  const title = titleFromTask(task);
  const theme = THEMES[hashStr(task + seedExtra) % THEMES.length];
  const short = task.length > 110 ? task.slice(0, 110) + "…" : task;

  const html =
    `<!DOCTYPE html>\n<html lang="tr">\n<head>\n` +
    `<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n` +
    `<title>${title}</title>\n</head>\n<body>\n` +
    `<nav class="nav">\n  <div class="logo">✦ ${title}</div>\n` +
    `  <button class="menu-btn" onclick="toggleMenu()">☰</button>\n` +
    `  <div class="links" id="links">\n` +
    `    <a href="#ozellikler">Özellikler</a>\n    <a href="#nasil">Nasıl Çalışır</a>\n` +
    `    <a href="#iletisim" class="cta">Hemen Başla</a>\n  </div>\n</nav>\n\n` +
    `<header class="hero">\n  <div class="badge">🚀 Yeni • Arena Agent ile üretildi</div>\n` +
    `  <h1>${title} ile fark yaratın</h1>\n  <p>${short}</p>\n` +
    `  <div class="hero-btns">\n    <a href="#iletisim" class="btn primary">Hemen Başla</a>\n` +
    `    <a href="#ozellikler" class="btn ghost">Keşfet</a>\n  </div>\n` +
    `  <div class="stats">\n` +
    `    <div><b data-count="2500">0</b><span>Mutlu Müşteri</span></div>\n` +
    `    <div><b data-count="99">0</b><span>% Memnuniyet</span></div>\n` +
    `    <div><b data-count="12">0</b><span>Ödül</span></div>\n  </div>\n</header>\n\n` +
    `<section class="features" id="ozellikler">\n  <h2>Neden ${title}?</h2>\n` +
    `  <div class="grid">\n` +
    `    <div class="card"><div class="ico">⚡</div><h3>Hızlı</h3><p>Saniyeler içinde açılan, optimize edilmiş deneyim.</p></div>\n` +
    `    <div class="card"><div class="ico">🎨</div><h3>Modern Tasarım</h3><p>Göz alıcı, responsive ve güncel arayüz.</p></div>\n` +
    `    <div class="card"><div class="ico">🔒</div><h3>Güvenilir</h3><p>Verileriniz koruma altında, %99.9 çalışma süresi.</p></div>\n` +
    `  </div>\n</section>\n\n` +
    `<section class="steps" id="nasil">\n  <h2>Nasıl Çalışır?</h2>\n  <ol>\n` +
    `    <li><b>1. Keşfet</b> — İhtiyacını belirle, planı seç.</li>\n` +
    `    <li><b>2. Başla</b> — Tek tıkla hesabını oluştur.</li>\n` +
    `    <li><b>3. Büyüt</b> — Sonuçları izle ve ölçekle.</li>\n  </ol>\n</section>\n\n` +
    `<section class="cta-band" id="iletisim">\n  <h2>Bugün başlayın</h2>\n` +
    `  <p>Kredi kartı gerekmez • 14 gün ücretsiz deneme</p>\n` +
    `  <form onsubmit="return subscribe(event)">\n` +
    `    <input type="email" id="email" placeholder="E-posta adresiniz" required>\n` +
    `    <button type="submit">Katıl</button>\n  </form>\n  <p id="msg"></p>\n</section>\n\n` +
    `<footer>© <span id="yil"></span> ${title} • Arena Agent ile üretildi ⚔️</footer>\n` +
    `</body>\n</html>`;

  const css =
    `* { box-sizing: border-box; margin: 0; padding: 0; }\n` +
    `body { font-family: 'Segoe UI', system-ui, sans-serif; background: ${theme.bg}; color: #eef1f8; line-height: 1.6; }\n` +
    `.nav { display: flex; align-items: center; justify-content: space-between; padding: 16px 6%; position: sticky; top: 0; background: rgba(10,12,20,.85); backdrop-filter: blur(10px); z-index: 10; }\n` +
    `.logo { font-weight: 800; font-size: 19px; }\n` +
    `.links { display: flex; gap: 22px; align-items: center; }\n` +
    `.links a { color: #c6cdf5; text-decoration: none; font-size: 14.5px; }\n` +
    `.links a:hover { color: #fff; }\n` +
    `.links .cta, .btn.primary { background: linear-gradient(135deg, ${theme.p}, ${theme.s}); color: #fff !important; padding: 10px 22px; border-radius: 999px; font-weight: 700; }\n` +
    `.menu-btn { display: none; background: none; border: 1px solid #333d5c; color: #fff; font-size: 20px; border-radius: 8px; padding: 4px 12px; cursor: pointer; }\n` +
    `.hero { text-align: center; padding: 90px 6% 70px; background: radial-gradient(700px 320px at 50% 0%, ${theme.p}33, transparent); }\n` +
    `.badge { display: inline-block; border: 1px solid ${theme.p}; border-radius: 999px; padding: 5px 16px; font-size: 13px; color: ${theme.s}; margin-bottom: 18px; }\n` +
    `.hero h1 { font-size: clamp(30px, 5.5vw, 54px); margin-bottom: 14px; }\n` +
    `.hero p { color: #aab2cc; max-width: 640px; margin: 0 auto 26px; }\n` +
    `.hero-btns { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }\n` +
    `.btn { text-decoration: none; padding: 12px 30px; border-radius: 999px; font-weight: 700; }\n` +
    `.btn.ghost { border: 1px solid #333d5c; color: #fff; }\n` +
    `.stats { display: flex; gap: 44px; justify-content: center; margin-top: 46px; flex-wrap: wrap; }\n` +
    `.stats b { font-size: 30px; display: block; color: ${theme.s}; }\n` +
    `.stats span { font-size: 13px; color: #8b93ad; }\n` +
    `.features { padding: 70px 6%; text-align: center; }\n` +
    `.features h2, .steps h2, .cta-band h2 { font-size: 28px; margin-bottom: 26px; }\n` +
    `.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; max-width: 960px; margin: 0 auto; }\n` +
    `.card { background: ${theme.card}; border: 1px solid #262e4a; border-radius: 16px; padding: 28px 22px; }\n` +
    `.card .ico { font-size: 36px; margin-bottom: 10px; }\n` +
    `.card p { color: #aab2cc; font-size: 14px; margin-top: 6px; }\n` +
    `.steps { padding: 20px 6% 70px; max-width: 720px; margin: 0 auto; text-align: center; }\n` +
    `.steps ol { list-style: none; text-align: left; }\n` +
    `.steps li { background: ${theme.card}; border: 1px solid #262e4a; border-radius: 12px; padding: 16px 20px; margin-bottom: 12px; }\n` +
    `.cta-band { text-align: center; padding: 70px 6%; background: linear-gradient(135deg, ${theme.p}26, ${theme.s}26); border-top: 1px solid #262e4a; }\n` +
    `.cta-band form { display: flex; gap: 8px; justify-content: center; margin-top: 20px; flex-wrap: wrap; }\n` +
    `.cta-band input { padding: 12px 18px; border-radius: 999px; border: 1px solid #333d5c; background: #0d1220; color: #fff; min-width: 240px; }\n` +
    `.cta-band button { padding: 12px 28px; border-radius: 999px; border: 0; background: linear-gradient(135deg, ${theme.p}, ${theme.s}); color: #fff; font-weight: 700; cursor: pointer; }\n` +
    `#msg { margin-top: 12px; color: ${theme.s}; font-weight: 700; }\n` +
    `footer { text-align: center; padding: 26px; color: #6b7390; font-size: 13px; border-top: 1px solid #1c2338; }\n` +
    `@media (max-width: 640px) { .links { display: none; flex-direction: column; position: absolute; top: 62px; right: 4%; background: ${theme.card}; border: 1px solid #333d5c; border-radius: 12px; padding: 14px 22px; } .links.open { display: flex; } .menu-btn { display: block; } }`;

  const js =
    `document.getElementById('yil').textContent = new Date().getFullYear();\n` +
    `function toggleMenu() { document.getElementById('links').classList.toggle('open'); }\n` +
    `function subscribe(e) { e.preventDefault();\n` +
    `  var em = document.getElementById('email').value;\n` +
    `  document.getElementById('msg').textContent = '🎉 Aramıza hoş geldin, ' + em;\n` +
    `  document.getElementById('email').value = '';\n  return false; }\n` +
    `document.querySelectorAll('a[href^="#"]').forEach(function(a) {\n` +
    `  a.addEventListener('click', function(e) { var t = document.querySelector(a.getAttribute('href')); if (t) { e.preventDefault(); t.scrollIntoView({behavior:'smooth'}); } });\n` +
    `});\n` +
    `var counters = document.querySelectorAll('[data-count]');\n` +
    `var io = new IntersectionObserver(function(es) { es.forEach(function(en) { if (en.isIntersecting) { anim(en.target); io.unobserve(en.target); } }); });\n` +
    `counters.forEach(function(c) { io.observe(c); });\n` +
    `function anim(el) { var target = +el.dataset.count, cur = 0, step = Math.max(1, Math.floor(target / 60));\n` +
    `  var iv = setInterval(function() { cur += step; if (cur >= target) { cur = target; clearInterval(iv); } el.textContent = cur.toLocaleString('tr-TR'); }, 25); }`;

  return { html, css, js };
}

/** Demo çıktısını model formatında (kod bloklu) paketle */
export function formatMockBuild(task: string, model: AIModel, seedExtra = ""): string {
  const f = generateMockWebsite(task, seedExtra);
  return (
    `${model.name} siteyi hazırladı:\n\n` +
    "```html\n" + f.html + "\n```\n\n" +
    "```css\n" + f.css + "\n```\n\n" +
    "```js\n" + f.js + "\n```"
  );
}

export function fileNameFromTask(task: string): string {
  const slug = task
    .toLocaleLowerCase("tr")
    .replace(/[ç]/g, "c").replace(/[ğ]/g, "g").replace(/[ı]/g, "i")
    .replace(/[ö]/g, "o").replace(/[ş]/g, "s").replace(/[ü]/g, "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return (slug || "sitem") + ".html";
}
