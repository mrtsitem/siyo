"use client";

import React, { useMemo } from "react";

/** Hafif markdown gösterimi: başlık, kalın, liste, kod bloğu, satır içi kod. */
export default function Markdown({ text }: { text: string }) {
  const nodes = useMemo(() => renderMarkdown(text), [text]);
  return <div className="md">{nodes}</div>;
}

function inline(line: string, keyPrefix: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // `kod` ve **kalın** ayrıştır
  const re = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) parts.push(line.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("`")) {
      parts.push(
        <code key={`${keyPrefix}-${i}`} className="inline-code">
          {tok.slice(1, -1)}
        </code>
      );
    } else {
      parts.push(
        <strong key={`${keyPrefix}-${i}`}>{tok.slice(2, -2)}</strong>
      );
    }
    i++;
    last = m.index + tok.length;
  }
  if (last < line.length) parts.push(line.slice(last));
  return parts;
}

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.replace(/\r/g, "").split("\n");
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Kod bloğu
    if (line.trimStart().startsWith("```")) {
      const lang = line.trim().slice(3).trim();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
        buf.push(lines[i]);
        i++;
      }
      i++; // kapanış ``` satırını atla
      out.push(
        <pre key={key++} className="code-block">
          {lang && <span className="code-lang">{lang}</span>}
          <code>{buf.join("\n")}</code>
        </pre>
      );
      continue;
    }

    // Başlıklar
    const h = line.match(/^(#{1,3})\s+(.*)/);
    if (h) {
      const level = h[1].length;
      const content = inline(h[2], `h${key}`);
      if (level === 1) out.push(<h1 key={key++}>{content}</h1>);
      else if (level === 2) out.push(<h2 key={key++}>{content}</h2>);
      else out.push(<h3 key={key++}>{content}</h3>);
      i++;
      continue;
    }

    // Madde listesi
    if (/^\s*[-•]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-•]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-•]\s+/, ""));
        i++;
      }
      out.push(
        <ul key={key++}>
          {items.map((it, j) => (
            <li key={j}>{inline(it, `ul${key}-${j}`)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Numaralı liste
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      out.push(
        <ol key={key++}>
          {items.map((it, j) => (
            <li key={j}>{inline(it, `ol${key}-${j}`)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Boş satır
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Normal paragraf (ardışık satırları birleştir)
    const buf: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].trimStart().startsWith("```") &&
      !/^(#{1,3})\s+/.test(lines[i]) &&
      !/^\s*[-•]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      buf.push(lines[i]);
      i++;
    }
    out.push(<p key={key++}>{inline(buf.join(" "), `p${key}`)}</p>);
  }

  return out;
}
