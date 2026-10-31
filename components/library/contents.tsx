"use client";

import { useEffect, useMemo, useState } from "react";
import { Morph } from "@/components/kiban/bench/morph";
import RailToc from "@/components/ui/rail-toc";
import ScrollProgress from "@/components/ui/scroll-progress";
import type { Heading } from "@/lib/library/document";

// A live readout over the page's rail. Below the desktop layout the rail gives
// way to a floating pill that names the section and how far through it is.

const WORDS_PER_MINUTE = 220;
const RAIL_LIMIT = 18;

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
  const shown = headings.length > RAIL_LIMIT ? sections : headings;
  const items = useMemo(
    () =>
      shown.map((h) => ({
        id: h.id,
        label: h.text,
        depth: h.depth === 3 ? 1 : 0,
      })),
    [shown],
  );
  const [active, setActive] = useState(0);
  const [read, setRead] = useState(0);

  useEffect(() => {
    let tops: number[] = [];
    let span = 1;
    const measure = () => {
      tops = sections.map(
        (s) =>
          (document.getElementById(s.id)?.getBoundingClientRect().top ?? 0) +
          scrollY,
      );
      span = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    };
    let frame = 0;
    const read = () => {
      frame = 0;
      const line = scrollY + innerHeight * 0.3;
      let current = 0;
      tops.forEach((top, i) => {
        if (top <= line) current = i;
      });
      setActive(current);
      setRead(Math.round((scrollY / span) * 40) / 40);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    measure();
    onScroll();
    const sizes = new ResizeObserver(measure);
    sizes.observe(document.body);
    addEventListener("scroll", onScroll, { passive: true });
    return () => {
      sizes.disconnect();
      removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [sections]);

  if (!sections.length) return <div />;
  const left = Math.ceil(((1 - read) * words) / WORDS_PER_MINUTE);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <>
      <aside className="lib-log" aria-label="On this page">
        <p className="lib-log-pos">
          <Morph
            value={`record ${pad(active + 1)} / ${pad(sections.length)}`}
            duration={320}
          />
        </p>
        <p className="lib-log-now">
          <Morph value={sections[active]?.text ?? ""} duration={380} prose />
        </p>
        <RailToc className="lib-rail" items={items} title="on this page" />
        <p className="lib-log-left">
          <Morph
            value={left > 0 ? `${left} min left` : "end of log"}
            duration={320}
          />
        </p>
      </aside>
      <ScrollProgress
        className="lib-pill"
        sections={sections.map((s) => ({ id: s.id, label: s.text }))}
      />
    </>
  );
}
