"use client";

import Scritto from "@scritto/react";
import { useEffect, useRef, useState } from "react";

// A value that morphs when it changes. Assistive technology reads the plain copy.
export function Morph({
  value,
  duration = 520,
  prose = false,
}: {
  value: string;
  duration?: number;
  /** Long sentences: Scritto holds one line, so narrow screens get plain text. */
  prose?: boolean;
}) {
  return (
    <>
      <span className={prose ? "morph-plain" : "visually-hidden"}>{value}</span>
      <span aria-hidden="true" className={prose ? "morph-live" : undefined}>
        <Scritto
          value={value}
          trend={0}
          transition={{ duration }}
          respectMotionPreference
        />
      </span>
    </>
  );
}

/** Holds a fast-moving value to one update per `ms`, so morphs can finish. */
export function useSampled<T>(value: T, ms: number) {
  const [shown, setShown] = useState(value);
  const last = useRef(0);
  useEffect(() => {
    const wait = Math.max(0, ms - (performance.now() - last.current));
    const timer = setTimeout(() => {
      last.current = performance.now();
      setShown(value);
    }, wait);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return shown;
}
