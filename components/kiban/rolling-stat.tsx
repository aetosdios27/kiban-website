"use client";

import Scritto from "@scritto/react";
import { useEffect, useRef, useState } from "react";

// The server renders the real count. Once the browser takes over, an
// off-screen value drops to zero and rolls up the first time it is seen.
// Assistive technology always reads the real count from the hidden copy.
export function RollingStat({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < innerHeight) return;
    setShown(value.replace(/\d/g, "0").replace(/^[0,]+(?=0)/, ""));
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShown(value);
        observer.disconnect();
      },
      { threshold: 0.6 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  return (
    <>
      <span className="visually-hidden">{value}</span>
      <span ref={ref} aria-hidden="true">
        <Scritto
          value={shown}
          trend={1}
          transition={{ duration: 900 }}
          respectMotionPreference
        />
      </span>
    </>
  );
}
