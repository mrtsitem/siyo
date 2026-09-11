// ─────────────────────────────────────────────
// Battle kategorileri — sorunun içeriğinden otomatik algılanır.
// Her kategorinin ayrı Elo tablosu olur (arena.ai'deki gibi).
// ─────────────────────────────────────────────

export type Category = "overall" | "coding" | "creative" | "chat";

export const CATEGORIES: { id: Category; label: string; icon: string }[] = [
  { id: "overall", label: "Genel", icon: "🌐" },
  { id: "coding", label: "Kodlama", icon: "💻" },
  { id: "creative", label: "Yaratıcı", icon: "✨" },
  { id: "chat", label: "Sohbet", icon: "💬" },
];

export function detectCategory(
  prompt: string
): Exclude<Category, "overall"> {
  if (
    /(kod|code|python|javascript|typescript|react|next|vue|sql|html|css|\bapi\b|algoritma|algorithm|debug|hata|error|exception|function|fonksiyon|class |sınıf|deploy|git|veritabanı|database|sunucu|server|framework|kütüphane|library|terminal|linux|docker)/i.test(
      prompt
    )
  )
    return "coding";
  if (
    /(hikaye|hikâye|story|stories|şiir|poem|roman|novel|yaratıcı|creative|fikir|idea|tasarım|design|senaryo|reklam|slogan|şarkı|song|masal|kompozisyon|essay|mektup|davet|başlık|title|içerik|content|blog|yuotube|video fikri)/i.test(
      prompt
    )
  )
    return "creative";
  return "chat";
}

export function categoryLabel(cat: string): string {
  const c = CATEGORIES.find((x) => x.id === cat);
  return c ? `${c.icon} ${c.label}` : cat;
}
