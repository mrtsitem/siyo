"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getSettings, providerName, ProviderId } from "@/lib/settings";

const NAV = [
  { href: "/", label: "Sohbet", icon: "💬", desc: "Battle & konuşma" },
  { href: "/agent", label: "Agent", icon: "🤖", desc: "Görev planla & uygula" },
  { href: "/leaderboard", label: "Liderlik Tablosu", icon: "🏆", desc: "Model sıralaması" },
  { href: "/history", label: "Geçmiş", icon: "🕘", desc: "Ara & incele" },
  { href: "/models", label: "Modeller", icon: "🧠", desc: "8 model kataloğu" },
  { href: "/settings", label: "Ayarlar", icon: "⚙️", desc: "Motor & API anahtarı" },
];

export default function Sidebar() {
  const path = usePathname();
  const [prov, setProv] = useState<ProviderId>("mock");

  useEffect(() => {
    try {
      setProv(getSettings().provider);
    } catch {
      /* yoksay */
    }
  }, [path]);

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
        <Link href="/settings" className="demo-pill" style={{ textDecoration: "none" }}>
          <span className="dot" style={prov !== "mock" ? { background: "var(--green)", boxShadow: "0 0 8px var(--green)" } : undefined} />
          {prov === "mock" ? "Demo Modu — ayarlardan değiştir" : providerName(prov)}
        </Link>
      </div>
    </aside>
  );
}
