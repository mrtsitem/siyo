# ⚔️ Arena — AI Battle & Leaderboard (v2.1)

arena.ai mantığıyla çalışan yapay zekâ karşılaştırma platformu:
**Battle + Side-by-Side + Direkt Sohbet + Agent + Kategorili Elo Tablosu + Geçmiş + Gerçek AI Motorları.**

## Özellikler

- 🤖 **Agent Modu:** Görev ver, AI planlasın ve adım adım uygulasın (canlı ilerleme, durdurma, kopyalama)
- 🌐 **Site Kurucu:** "Restoran sitesi yap" de, agent gerçek HTML/CSS/JS yazsın — canlı önizleme, mobil/masaüstü, revizyon, sürümler, tek tıkla indirme

- ⚔️ **Battle Mode:** 2 gizli model yarışır, oy verilir, kimlikler açılır (multi-turn)
- 🆚 **Side-by-Side:** 2 modeli ismiyle seçip karşılaştırma
- 💬 **Direkt Sohbet:** 8 modelden biriyle birebir konuşma (kopyala + yeniden üret)
- 🏆 **Liderlik Tablosu:** Genel / Kodlama / Yaratıcı / Sohbet kategorilerinde Elo (K=32)
- 🕘 **Geçmiş:** Oy dağılımı, kategori rozetleri, arama, JSON dışa aktarma
- 🧠 **Modeller:** Katalog, puanlar, tek tıkla sohbet
- 🔌 **Gerçek AI:** Ayarlar'dan kendi anahtarını gir — Groq (ücretsiz) / OpenAI / Gemini
- 📎 Dosya ekleme, 🌍 TR/EN algılama, 📱 mobil uyum

## Yerelde çalıştırma

```bash
npm install
npm run dev
# http://localhost:3000
```

## Vercel'den yayınlama

1. [vercel.com](https://vercel.com) → **Add New Project** → bu repoyu seç → **Deploy**
2. Her `git push` otomatik yayınlanır

## Gerçek AI bağlama

Kod hazır — anahtar gerekmez, Ayarlar sayfasından kullanıcı kendi anahtarını girer:

1. Siteyi aç → **Ayarlar** → motor seç (örn. Groq)
2. [console.groq.com/keys](https://console.groq.com/keys) adresinden ücretsiz anahtar al
3. Anahtarı yapıştır → **Kaydet** → **Bağlantıyı test et**

Anahtarlar yalnızca tarayıcıda (localStorage) saklanır, sunucuda tutulmaz.

## Teknoloji

Next.js 14 (App Router) • React 18 • TypeScript • Saf CSS (koyu tema)
