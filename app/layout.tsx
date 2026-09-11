import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import "./v2.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Arena — AI Battle & Leaderboard",
  description:
    "İki yapay zekâ modelini karşılaştır, oy ver, liderlik tablosunu takip et. Battle, side-by-side ve direkt sohbet modları.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>
        <div className="app-shell">
          <Sidebar />
          <div className="main-col">
            <main className="main">{children}</main>
            <footer className="footer">
              <span>⚔️ Arena v2 — Battle • Karşılaştırma • Liderlik</span>
              <span className="foot-links">
                <Link href="/models">Modeller</Link>
                <Link href="/settings">Motor ayarları</Link>
              </span>
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}
