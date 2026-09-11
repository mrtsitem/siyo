"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "💬 Sohbet" },
  { href: "/leaderboard", label: "🏆 Tablo" },
  { href: "/history", label: "🕘 Geçmiş" },
  { href: "/models", label: "🧠 Modeller" },
  { href: "/settings", label: "⚙️ Ayarlar" },
];

export default function MobileNav() {
  const path = usePathname();
  return (
    <div className="mobile-nav">
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} className={path === l.href ? "active" : ""}>
          {l.label}
        </Link>
      ))}
    </div>
  );
}
