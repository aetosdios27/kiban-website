"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Morph } from "@/components/kiban/bench/morph";
import type { Heading } from "@/lib/library/document";

// The document as a log. Each section is a record on a tape, sized by its real
// length. A bracket marks what is on screen, following on a spring; ticks swell
// near the pointer, and a live readout says where you are and what is left.

const WORDS_PER_MINUTE = 220;
const REACH_PX = 62;
const STIFFNESS = 0.16;

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
  const rail = useRef<HTMLOListElement>(null);
  const bracket = useRef<HTMLSpanElement>(null);
  const items = useRef<(HTMLLIElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [read, setRead] = useState(0);
  const [lengths, setLengths] = useState<number[]>(() => sections.map(() => 1));

  useEffect(() => {
    let frame = 0;
    let top = 0;
    let bottom = 0;
    let pointer: number | null = null;
    const list = rail.current;
    const onMove = (e: PointerEvent) => {
      pointer = e.clientY;
    };
    const onLeave = () => {
      pointer = null;
    };
    list?.addEventListener("pointermove", onMove);
    list?.addEventListener("pointerleave", onLeave);

    const tops = () =>
      sections.map(
        (s) =>
          (document.getElementById(s.id)?.getBoundingClientRect().top ?? 0) +
          scrollY,
      );
    const end = () =>
      (document.querySelector(".lib-prose")?.getBoundingClientRect().bottom ??
        0) + scrollY;

    const measure = () => {
      const starts = tops();
      const stop = end();
      setLengths(starts.map((s, i) => (starts[i + 1] ?? stop) - s));
    };
    measure();
    const observer = new ResizeObserver(measure);
    const prose = document.querySelector(".lib-prose");
    if (prose) observer.observe(prose);

    const tick = () => {
      frame = requestAnimationFrame(tick);
      if (!list) return;
      const starts = tops();
      const stop = end();
      const rows = items.current;
      // Maps a page position onto the rail through the real section boundaries.
      const map = (y: number) => {
        if (y <= starts[0]) return rows[0]?.offsetTop ?? 0;
        for (let i = 0; i < starts.length; i++) {
          const a = starts[i];
          const b = starts[i + 1] ?? stop;
          if (y < b) {
            const row = rows[i];
            if (!row) return 0;
            return row.offsetTop + ((y - a) / (b - a)) * row.offsetHeight;
          }
        }
        const last = rows.at(-1);
        return last ? last.offsetTop + last.offsetHeight : 0;
      };
      const wantTop = map(scrollY + 96);
      const wantBottom = map(scrollY + innerHeight);
      top += (wantTop - top) * STIFFNESS;
      bottom += (wantBottom - bottom) * STIFFNESS;
      if (bracket.current) {
        bracket.current.style.transform = `translateY(${top.toFixed(1)}px)`;
        bracket.current.style.height = `${Math.max(10, bottom - top).toFixed(1)}px`;
      }
      const line = scrollY + innerHeight * 0.3;
      let current = 0;
      starts.forEach((s, i) => {
        if (s <= line) current = i;
      });
      setActive(current);
      const span = stop - starts[0];
      setRead(
        Math.min(1, Math.max(0, (scrollY + innerHeight - starts[0]) / span)),
      );

      const box = list.getBoundingClientRect();
      rows.forEach((row) => {
        if (!row) return;
        const centre = box.top + row.offsetTop + row.offsetHeight / 2;
        const near =
          pointer === null
            ? 0
            : Math.max(0, 1 - Math.abs(pointer - centre) / REACH_PX);
        row.style.setProperty("--near", (near * near).toFixed(3));
      });
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      list?.removeEventListener("pointermove", onMove);
      list?.removeEventListener("pointerleave", onLeave);
    };
  }, [sections]);

  const longest = Math.max(...lengths, 1);
  const left = Math.ceil(((1 - read) * words) / WORDS_PER_MINUTE);
  const current = sections[active];
  if (!sections.length) return <div />;
  return (
    <nav className="lib-log" aria-label="On this page">
      <p className="lib-log-pos">
        <Morph
          value={`record ${String(active + 1).padStart(2, "0")} / ${String(sections.length).padStart(2, "0")}`}
          duration={320}
        />
      </p>
      <p className="lib-log-now">
        <Morph value={current?.text ?? ""} duration={380} />
      </p>
      <ol ref={rail} className="lib-tape">
        <span ref={bracket} className="lib-bracket" aria-hidden="true" />
        {sections.map((section, i) => (
          <li
            key={section.id}
            ref={(el) => {
              items.current[i] = el;
            }}
            data-on={i === active || undefined}
            data-read={i < active || undefined}
            style={{
              height: `${24 + Math.sqrt(lengths[i] / longest) * 46}px`,
            }}
          >
            <a href={`#${section.id}`}>
              <i aria-hidden="true" />
              <span>{section.text}</span>
            </a>
          </li>
        ))}
      </ol>
      <p className="lib-log-left">
        <Morph
          value={left > 0 ? `${left} min left` : "end of log"}
          duration={320}
        />
      </p>
    </nav>
  );
}
