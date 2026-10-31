"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Morph } from "@/components/kiban/bench/morph";
import {
  addScrollGate,
  pageScrollTarget,
} from "@/components/layout/smooth-scroll";
import ScrollProgress from "@/components/ui/scroll-progress";
import type { Heading } from "@/lib/library/document";

// A miniature of the article. Every heading is a line at its true position,
// as long as its own title. A tight bulge rides the reading position, like the
// Dock under a pointer, and the wheel grows heavy passing each heading.

const WORDS_PER_MINUTE = 220;
const HEADER = 96;
const RAIL_VH = 0.62;
const MIN_GAP = 5;
const REACH = 22; // how far the bulge spreads, in rail pixels
const SWELL = 0.9;
const DRAG = 0.8; // wheel lost at the centre of a detent
const DRAG_PX = 70; // page distance over which a heading is felt

const lineWidth = (h: Heading) =>
  Math.min(56, 8 + h.text.length * 0.85) * (h.depth === 3 ? 0.72 : 1);

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
  const lines = useRef<(HTMLElement | null)[]>([]);
  const label = useRef<HTMLParagraphElement>(null);
  const pointer = useRef<number | null>(null);
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const [left, setLeft] = useState(Math.ceil(words / WORDS_PER_MINUTE));

  useEffect(() => {
    let tops: number[] = [];
    let ys: number[] = [];
    let start = 0;
    let end = 1;
    let height = 0;
    let frame = 0;
    let current = -1;

    const measure = () => {
      tops = headings.map(
        (h) =>
          (document.getElementById(h.id)?.getBoundingClientRect().top ?? 0) +
          scrollY,
      );
      start = tops[0] ?? 0;
      end =
        (document.querySelector(".lib-prose")?.getBoundingClientRect().bottom ??
          1) + scrollY;
      height = innerHeight * RAIL_VH;
      ys = tops.map((top) => ((top - start) / (end - start)) * height);
      for (let i = 1; i < ys.length; i++)
        ys[i] = Math.max(ys[i], ys[i - 1] + MIN_GAP);
      const overflow = (ys.at(-1) ?? 0) / height;
      if (overflow > 1) ys = ys.map((y) => y / overflow);
      if (rail.current) rail.current.style.height = `${height}px`;
      lines.current.forEach((line, i) => {
        if (line) line.style.top = `${ys[i]}px`;
      });
    };

    const paint = () => {
      frame = 0;
      const at = scrollY + HEADER + 2;
      let index = 0;
      tops.forEach((top, i) => {
        if (top <= at) index = i;
      });
      const next = tops[index + 1] ?? end;
      const f = Math.min(
        1,
        Math.max(0, (at - tops[index]) / (next - tops[index])),
      );
      const reading = ys[index] + f * ((ys[index + 1] ?? height) - ys[index]);
      const centre = pointer.current ?? reading;
      lines.current.forEach((line, i) => {
        if (!line) return;
        const near = Math.exp(-(((ys[i] - centre) / REACH) ** 2));
        line.style.setProperty("--scale", (1 + near * SWELL).toFixed(3));
        line.style.setProperty("--tone", (0.3 + near * 0.7).toFixed(3));
      });
      if (label.current)
        label.current.style.transform = `translateY(${centre.toFixed(1)}px)`;
      if (index !== current) {
        current = index;
        setActive(index);
      }
      const done = Math.min(1, Math.max(0, (at - start) / (end - start)));
      setLeft(Math.ceil(((1 - done) * words) / WORDS_PER_MINUTE));
    };
    const request = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };

    const off = addScrollGate((data) => {
      const line = pageScrollTarget() + HEADER + 2;
      const gap = Math.min(...tops.map((top) => Math.abs(top - line)));
      data.deltaY *= 1 - DRAG * Math.exp(-((gap / DRAG_PX) ** 2));
      return true;
    });

    const list = rail.current;
    const onMove = (e: PointerEvent) => {
      if (!list) return;
      pointer.current = e.clientY - list.getBoundingClientRect().top;
      request();
    };
    const onLeave = () => {
      pointer.current = null;
      setHovered(null);
      request();
    };
    list?.addEventListener("pointermove", onMove);
    list?.addEventListener("pointerleave", onLeave);

    measure();
    request();
    const sizes = new ResizeObserver(() => {
      measure();
      request();
    });
    sizes.observe(document.body);
    addEventListener("scroll", request, { passive: true });
    return () => {
      off();
      sizes.disconnect();
      removeEventListener("scroll", request);
      list?.removeEventListener("pointermove", onMove);
      list?.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(frame);
    };
  }, [headings, words]);

  if (!sections.length) return <div />;
  const named = headings[hovered ?? active];
  return (
    <>
      <nav className="lens" aria-label="On this page">
        <ol ref={rail}>
          <p ref={label} className="lens-name" aria-hidden="true">
            <Morph value={named?.text ?? ""} duration={260} />
          </p>
          {headings.map((heading, i) => (
            <li
              key={heading.id}
              ref={(el) => {
                lines.current[i] = el;
              }}
              data-depth={heading.depth}
              data-on={i === active || undefined}
              onPointerEnter={() => setHovered(i)}
            >
              <a
                href={`#${heading.id}`}
                aria-label={heading.text}
                aria-current={i === active ? "location" : undefined}
              >
                <i style={{ width: lineWidth(heading) }} aria-hidden="true" />
              </a>
            </li>
          ))}
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
