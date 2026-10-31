"use client";

import { useMotionValue } from "motion/react";
import { useEffect, useMemo } from "react";
import {
  addScrollGate,
  pageScrollTarget,
} from "@/components/layout/smooth-scroll";
import ScrollProgress from "@/components/ui/scroll-progress";
import { ScrollRail } from "@/components/ui/scroll-rail";
import type { Heading } from "@/lib/library/document";

// The heading sitting on the reading line, as a continuous index for the rail.
// The ends of the page are anchors of their own, so the first and last ticks
// are always reachable, and the wheel grows heavy passing each heading.

const LINE = 98; // where a jump lands a heading, below the sticky header
const DRAG = 0.8; // wheel lost at the centre of a detent
const DRAG_PX = 70; // page distance over which a heading is felt

function focusAt(tops: number[], line: number, range: number) {
  const last = tops.length - 1;
  const points = [
    { index: 0, line: LINE },
    ...tops
      .map((top, index) => ({ index, line: top }))
      .filter((p) => p.line > LINE && p.line < range + LINE),
    { index: last, line: range + LINE },
  ].sort((a, b) => a.line - b.line);
  const after = points.findIndex((p) => line <= p.line);
  if (after === -1) return last;
  if (after === 0) return 0;
  const [from, to] = [points[after - 1], points[after]];
  const through = (line - from.line) / (to.line - from.line || 1);
  return from.index + through * (to.index - from.index);
}

export function Contents({ headings }: { headings: Heading[] }) {
  const sections = useMemo(
    () => headings.filter((h) => h.depth === 2),
    [headings],
  );
  const items = useMemo(
    () => headings.map((h) => ({ id: h.id, title: h.text, gist: h.gist })),
    [headings],
  );
  const focus = useMotionValue(0);

  useEffect(() => {
    let tops: number[] = [];
    let range = 0;
    let frame = 0;

    const measure = () => {
      tops = headings.map(
        (h) =>
          (document.getElementById(h.id)?.getBoundingClientRect().top ?? 0) +
          scrollY,
      );
      range = document.documentElement.scrollHeight - innerHeight;
    };
    const paint = () => {
      frame = 0;
      if (tops.length) focus.set(focusAt(tops, scrollY + LINE, range));
    };
    const request = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };

    const off = addScrollGate((data) => {
      const line = pageScrollTarget() + LINE;
      const gap = Math.min(...tops.map((top) => Math.abs(top - line)));
      data.deltaY *= 1 - DRAG * Math.exp(-((gap / DRAG_PX) ** 2));
      return true;
    });

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
      cancelAnimationFrame(frame);
    };
  }, [headings, focus]);

  if (!sections.length) return <div />;
  return (
    <>
      <div className="rail">
        <ScrollRail items={items} focus={focus} />
      </div>
      <ScrollProgress
        className="lib-pill"
        sections={sections.map((s) => ({ id: s.id, label: s.text }))}
      />
    </>
  );
}
