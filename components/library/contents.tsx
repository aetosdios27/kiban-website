"use client";

import { useEffect, useState } from "react";
import { Morph } from "@/components/kiban/bench/morph";
import type { Heading } from "@/lib/library/document";

// The page's outline, following the reader. The label above it morphs to the
// section in view; the bar beside it fills with progress through the document.
export function Contents({ headings }: { headings: Heading[] }) {
  const [active, setActive] = useState(headings[0]?.id ?? "");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      const line = innerHeight * 0.3;
      let current = headings[0]?.id ?? "";
      for (const { id } of headings) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }
      setActive(current);
      const page = document.documentElement;
      setProgress(scrollY / Math.max(1, page.scrollHeight - innerHeight));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    read();
    addEventListener("scroll", onScroll, { passive: true });
    return () => {
      removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [headings]);

  const current = headings.find((h) => h.id === active);
  return (
    <nav className="lib-contents" aria-label="On this page">
      <p className="lib-now">
        <Morph value={current?.text ?? "contents"} duration={380} />
      </p>
      <span className="lib-progress" aria-hidden="true">
        <span style={{ transform: `scaleX(${progress})` }} />
      </span>
      <ol>
        {headings
          .filter((h) => h.depth === 2)
          .map((h) => (
            <li key={h.id} data-on={h.id === active || undefined}>
              <a href={`#${h.id}`}>{h.text}</a>
            </li>
          ))}
      </ol>
    </nav>
  );
}
