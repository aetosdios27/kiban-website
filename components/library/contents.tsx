"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ScrollProgress from "@/components/ui/scroll-progress";
import type { Heading } from "@/lib/library/document";
import { cue } from "@/lib/kiban/sound";

// A lens barrel on its side. Each section is a major tick whose length is that
// section's length, with minor ticks between. The needle rides the barrel and
// falls into a detent at every heading, like a zoom ring clicking into place.

const WORDS_PER_MINUTE = 220;
const HEADER = 96;
const DETENT = 0.14; // the share of a section on each side that pulls the needle in

const settle = (f: number) =>
  Math.min(1, Math.max(0, (f - DETENT) / (1 - DETENT * 2)));

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
  const rows = useRef<(HTMLLIElement | null)[]>([]);
  const needle = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState(0);
  const [lengths, setLengths] = useState<number[]>(() => sections.map(() => 1));
  const [left, setLeft] = useState(Math.ceil(words / WORDS_PER_MINUTE));

  useEffect(() => {
    let tops: number[] = [];
    let end = 0;
    let frame = 0;
    let current = -1;
    const measure = () => {
      tops = sections.map(
        (s) =>
          (document.getElementById(s.id)?.getBoundingClientRect().top ?? 0) +
          scrollY,
      );
      end =
        (document.querySelector(".lib-prose")?.getBoundingClientRect().bottom ??
          0) + scrollY;
      setLengths(tops.map((top, i) => (tops[i + 1] ?? end) - top));
    };
    const read = () => {
      frame = 0;
      const at = scrollY + HEADER + 2;
      let index = 0;
      tops.forEach((top, i) => {
        if (top <= at) index = i;
      });
      const row = rows.current[index];
      if (!row || !needle.current) return;
      const span = (tops[index + 1] ?? end) - tops[index];
      const f = Math.max(0, (at - tops[index]) / span);
      const y = row.offsetTop + settle(f) * row.offsetHeight;
      needle.current.style.transform = `translateY(${y.toFixed(1)}px)`;
      if (index !== current) {
        if (current !== -1) {
          cue("tap", { emphasis: "subtle" });
          row.animate(
            [
              { transform: "translateX(0)" },
              { transform: "translateX(3px)" },
              { transform: "translateX(0)" },
            ],
            { duration: 180, easing: "ease-out" },
          );
        }
        current = index;
        setActive(index);
      }
      const done = Math.min(1, Math.max(0, (at - tops[0]) / (end - tops[0])));
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
  }, [sections, words]);

  if (!sections.length) return <div />;
  const longest = Math.max(...lengths, 1);
  return (
    <>
      <nav className="lens" aria-label="On this page">
        <ol>
          <span ref={needle} className="lens-needle" aria-hidden="true" />
          {sections.map((section, i) => {
            const share = Math.sqrt(lengths[i] / longest);
            return (
              <li
                key={section.id}
                ref={(el) => {
                  rows.current[i] = el;
                }}
                data-on={i === active || undefined}
                style={{ height: 26 + share * 34 }}
              >
                <a
                  href={`#${section.id}`}
                  aria-current={i === active ? "location" : undefined}
                >
                  <i style={{ width: 12 + share * 40 }} aria-hidden="true" />
                  <span>{section.text}</span>
                </a>
              </li>
            );
          })}
        </ol>
        <p className="lens-left">{left} min left</p>
      </nav>
      <ScrollProgress
        className="lib-pill"
        sections={sections.map((s) => ({ id: s.id, label: s.text }))}
      />
    </>
  );
}
