"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Sohbet", icon: "💬", desc: "Yeni konuşma" },
  { href: "/leaderboard", label: "Liderlik Tablosu", icon: "🏆", desc: "Model sıralaması" },
  { href: "/history", label: "Geçmiş", icon: "🕘", desc: "Ara & incele" },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside className="sidebar">
      <Link href="/" className="brand">
        <span className="brand-mark">⚔️</span>
        <span className="brand-name">Arena</span>
      </Link>
      <nav className="nav">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={`nav-item ${path === n.href ? "active" : ""}`}
          >
            <span className="nav-icon">{n.icon}</span>
            <span className="nav-text">
              <span className="nav-label">{n.label}</span>
              <span className="nav-desc">{n.desc}</span>
            </span>
          </Link>
        ))}
      </nav>
      <div className="side-foot">
        <div className="demo-pill">
          <span className="dot" />
          Demo Modu — API anahtarsız çalışır
        </div>
      </div>
    </aside>
  );
}
