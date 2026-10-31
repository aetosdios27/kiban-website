"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { GooeyNav } from "@/components/ui/gooey-nav";

const LINKS = [
  { label: "quickstart", href: "/#quickstart" },
  { label: "guarantees", href: "/#guarantees" },
  { label: "benchmarks", href: "/#benchmarks" },
  { label: "internals", href: "/#write-path" },
  { label: "library", href: "/library" },
];
const LIBRARY = LINKS.length - 1;

// Page sections in order, each lighting one link; -1 lights none.
const SECTIONS: [string, number][] = [
  ["quickstart", 0],
  ["guarantees", 1],
  ["correctness", 1],
  ["benchmarks", 2],
  ["write-path", 3],
  ["status", -1],
  ["library", LIBRARY],
];

export function SiteNav() {
  const pathname = usePathname();
  const [section, setSection] = useState(-1);

  useEffect(() => {
    if (pathname !== "/") return;
    let frame = 0;
    const read = () => {
      frame = 0;
      const line = innerHeight * 0.4;
      let current = -1;
      for (const [id, link] of SECTIONS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = link;
      }
      setSection(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    return () => {
      removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [pathname]);

  return (
    <GooeyNav
      aria-label="Sections"
      className="site-gooey"
      items={LINKS}
      value={pathname.startsWith("/library") ? LIBRARY : section}
      size="sm"
      radius={2}
      separation={10}
      activeColor="var(--primary)"
      activeLabelColor="var(--primary-foreground)"
    />
  );
}
