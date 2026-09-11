# ⚔️ Arena — AI Battle & Leaderboard

arena.ai mantığıyla çalışan yapay zekâ karşılaştırma platformu:
**Battle Mode + Direkt Sohbet + Elo Liderlik Tablosu + Geçmiş/Arama.**

> Şu an **Demo Modu** ile çalışır — API anahtarı gerekmez.
> Gerçek AI bağlantısı (Groq / OpenAI / Gemini) `app/api/chat/route.ts` içindeki
> `generateWithProvider()` fonksiyonuna eklenecek şekilde hazırdır.

## Özellikler

- ⚔️ **Battle Mode:** 2 gizli model aynı soruya cevap verir, kullanıcı oylar
- 💬 **Direkt Sohbet:** 8 modelden birini seç, birebir konuş
- 🏆 **Liderlik Tablosu:** Elo puanı (K=32), galibiyet/mağlubiyet, kazanma %
- 🕘 **Geçmiş:** Tüm battle'lar + soru/model araması
- 📎 **Dosya ekleme:** txt/md/kod dosyası içeriğini soruya dahil etme
- 🌍 **TR/EN algılama:** Sorunun dilinde cevap

## Yerelde çalıştırma

```bash
npm install
npm run dev
# http://localhost:3000
```

## Vercel'den yayınlama

1. Bu klasörü GitHub'a yükle (aşağıya bak)
2. [vercel.com](https://vercel.com) → **Add New Project** → repoyu seç → **Deploy**
3. Başka ayar gerekmez (Next.js otomatik tanınır)

## GitHub'a yükleme

```bash
git init
git add .
git commit -m "Arena v1: battle + leaderboard + history"
git branch -M main
git remote add origin https://github.com/KULLANICI/arena.git
git push -u origin main
```

## Gerçek AI bağlama (2. adım)

Ücretsiz seçenekler: **Groq** veya **Google Gemini** (ücretsiz katman).
Anahtar alınınca Vercel → Project → Settings → Environment Variables bölümüne
örn. `GROQ_API_KEY` eklenir, `lib/models.ts` içindeki modellere
`provider` + `providerModel` yazılır.

## Teknoloji

Next.js 14 (App Router) • React 18 • TypeScript • Saf CSS (koyu tema)
