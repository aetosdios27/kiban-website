"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ScrollProgress from "@/components/ui/scroll-progress";
import type { Heading } from "@/lib/library/document";

// A hairline rail and one marker. The marker covers every section now on
// screen and glides with CSS, so reading never runs per-frame work.

const WORDS_PER_MINUTE = 220;
const RAIL_LIMIT = 18;
const HEADER = 96;

export function Contents({
  headings,
  words,
}: {
  headings: Heading[];
  words: number;
}) {
  const sections = useMemo(
    () => headings.filter((h) => h.depth === 2),
    [headings],
  );
  const items = headings.length > RAIL_LIMIT ? sections : headings;
  const rows = useRef<(HTMLLIElement | null)[]>([]);
  const [range, setRange] = useState<[number, number]>([0, 0]);
  const [marker, setMarker] = useState({ y: 0, h: 0 });
  const [left, setLeft] = useState(Math.ceil(words / WORDS_PER_MINUTE));

  useEffect(() => {
    let tops: number[] = [];
    let end = 0;
    let frame = 0;
    const measure = () => {
      tops = items.map(
        (h) =>
          (document.getElementById(h.id)?.getBoundingClientRect().top ?? 0) +
          scrollY,
      );
      end =
        (document.querySelector(".lib-prose")?.getBoundingClientRect().bottom ??
          0) + scrollY;
    };
    const read = () => {
      frame = 0;
      const from = scrollY + HEADER + 2;
      const to = scrollY + innerHeight * 0.72;
      let first = 0;
      let last = 0;
      tops.forEach((top, i) => {
        if (top <= from) first = i;
        if (top <= to) last = i;
      });
      setRange(([a, b]) =>
        a === first && b === last ? [a, b] : [first, last],
      );
      const done = Math.min(1, Math.max(0, (to - tops[0]) / (end - tops[0])));
      setLeft(Math.ceil(((1 - done) * words) / WORDS_PER_MINUTE));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    measure();
    onScroll();
    const sizes = new ResizeObserver(() => {
      measure();
      onScroll();
    });
    sizes.observe(document.body);
    addEventListener("scroll", onScroll, { passive: true });
    return () => {
      sizes.disconnect();
      removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [items, words]);

  useEffect(() => {
    const first = rows.current[range[0]];
    const last = rows.current[range[1]];
    if (!first || !last) return;
    const y = first.offsetTop;
    const h = last.offsetTop + last.offsetHeight - y;
    const frame = requestAnimationFrame(() => setMarker({ y, h }));
    return () => cancelAnimationFrame(frame);
  }, [range]);

  if (!sections.length) return <div />;
  return (
    <>
      <nav className="toc" aria-label="On this page">
        <p className="toc-label">on this page</p>
        <ol>
          <span
            className="toc-marker"
            aria-hidden="true"
            style={{
              transform: `translateY(${marker.y}px)`,
              height: marker.h,
            }}
          />
          {items.map((item, i) => (
            <li
              key={item.id}
              ref={(el) => {
                rows.current[i] = el;
              }}
              data-depth={item.depth}
              data-on={(i >= range[0] && i <= range[1]) || undefined}
            >
              <a
                href={`#${item.id}`}
                aria-current={i === range[0] ? "location" : undefined}
              >
                {item.text}
              </a>
            </li>
          ))}
        </ol>
        <p className="toc-left">{left} min left</p>
      </nav>
      <ScrollProgress
        className="lib-pill"
        sections={sections.map((s) => ({ id: s.id, label: s.text }))}
      />
    </>
  );
}
