"use client";

import { useEffect, useRef, useState } from "react";
import { fmtUs, lightMetres, rows } from "@/lib/kiban/bench";

// Microseconds are too small to feel, so one median read is drawn as the
// distance light covers in that time. Both pulses run at the same speed; the
// animation ends when each engine's read does, slowed down a millionfold.

const point = rows.find((row) => row.id === "point");
const SECONDS_PER_US = 1;

export function LightRace() {
  const ref = useRef<HTMLDivElement>(null);
  const [lit, setLit] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setLit(true);
        observer.disconnect();
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  if (!point || !("p50" in point.kiban)) return null;
  const rival = point.rivals.rocksdb;
  if (!rival || !("p50" in rival)) return null;
  const lanes = [
    { name: "kiban", us: point.kiban.p50, cls: "lr-kiban" },
    { name: "RocksDB", us: rival.p50, cls: "lr-rocks" },
  ];
  const widest = Math.max(...lanes.map((lane) => lightMetres(lane.us)));
  return (
    <div ref={ref} className="lr" data-lit={lit || undefined}>
      <p className="lr-title">
        one point read, measured in <span className="px">light.</span>
      </p>
      {lanes.map(({ name, us, cls }) => (
        <div key={name} className={`lr-lane ${cls}`}>
          <span className="lr-name">{name}</span>
          <span className="lr-track" aria-hidden="true">
            <span
              style={{
                width: lit ? `${(lightMetres(us) / widest) * 100}%` : 0,
                transitionDuration: `${us * SECONDS_PER_US}s`,
              }}
            />
          </span>
          <span className="lr-metres">{lightMetres(us)} m</span>
          <span className="lr-time">{fmtUs(us)}</span>
        </div>
      ))}
      <p className="lr-note">
        The distance light travels in a vacuum during one median read.
      </p>
    </div>
  );
}
