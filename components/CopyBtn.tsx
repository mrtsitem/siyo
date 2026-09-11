"use client";

import { useState } from "react";

export default function CopyBtn({ text, small }: { text: string; small?: boolean }) {
  const [ok, setOk] = useState(false);

  async function copy() {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setOk(true);
      setTimeout(() => setOk(false), 1500);
    } catch {
      /* yoksay */
    }
  }

  return (
    <button
      className={`copy-btn ${small ? "sm" : ""}`}
      onClick={copy}
      disabled={!text}
      title="Kopyala"
    >
      {ok ? "✓ Kopyalandı" : "📋 Kopyala"}
    </button>
  );
}
