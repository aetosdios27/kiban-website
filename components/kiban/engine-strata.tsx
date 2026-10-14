"use client";

import { useEffect, useState } from "react";

// Kiban means foundation, so the engine is drawn as ground: an isometric
// cut-away whose strata are the LSM levels. Key order runs left to right
// along the cut face. Writes land on the memtable tray and on the WAL; the
// tray freezes and sinks into L0; MANIFEST commits; the old WAL retires;
// compaction pushes L0 down into L1 and re-cuts L1's file boundaries.

type Pt = [number, number];
type Range = [number, number];

const O: Pt = [400, 250];
const P = (x: number, y: number, z: number): Pt => [
  O[0] + (x - y) * 0.866,
  O[1] + (x + y) * 0.5 - z,
];
const pts = (a: Pt[]) =>
  a.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

const W = 380; // key space
const D = 110; // depth
const L2: Range = [0, 48];
const L1: Range = [56, 88];
const L0: Range = [96, 116];
const TRAY = 150;
const L2_FILES = [0, 140, 250, 380];
const L1_CUTS = [
  [0, 100, 210, 300, 380],
  [0, 70, 170, 260, 380],
];
const KEYS = [
  ["pear", 0.66],
  ["apple", 0.08],
  ["yuzu", 0.9],
  ["kiwi", 0.36],
  ["fig", 0.22],
  ["lime", 0.5],
] as const;

// One cycle, in seconds.
const LOOP = 11;
const writeAt = (i: number) => 0.3 + i * 0.6;
const FALL = 0.45;
const FREEZE = 4.0;
const FLUSH: Range = [4.4, 5.6];
const COMMIT = 5.8;
const RETIRE: Range = [5.9, 6.5];
const COMPACT: Range = [7.0, 8.6];
const STATIC_FRAME = 3.6;

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const span = (t: number, [a, b]: Range) => clamp((t - a) / (b - a));
const ease = (p: number) =>
  p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

function Box({
  x,
  y = [0, D],
  z,
  tone = "rock",
  opacity = 1,
}: {
  x: Range;
  y?: Range;
  z: Range;
  tone?: "rock" | "hot" | "tray" | "frozen" | "cube";
  opacity?: number;
}) {
  const [x0, x1] = x;
  const [y0, y1] = y;
  const [z0, z1] = z;
  return (
    <g className={`strata-box strata-${tone}`} opacity={opacity}>
      <polygon
        className="strata-front"
        points={pts([
          P(x0, y1, z1),
          P(x1, y1, z1),
          P(x1, y1, z0),
          P(x0, y1, z0),
        ])}
      />
      <polygon
        className="strata-side"
        points={pts([
          P(x1, y0, z1),
          P(x1, y1, z1),
          P(x1, y1, z0),
          P(x1, y0, z0),
        ])}
      />
      <polygon
        className="strata-top"
        points={pts([
          P(x0, y0, z1),
          P(x1, y0, z1),
          P(x1, y1, z1),
          P(x0, y1, z1),
        ])}
      />
    </g>
  );
}

// Text printed on the cut face (the y = D plane), reading along key order.
function FaceText({
  x,
  z,
  children,
}: {
  x: number;
  z: number;
  children: string;
}) {
  const [sx, sy] = P(x, D, z);
  return (
    <text
      className="strata-face-text"
      transform={`matrix(0.866 0.5 0 1 ${sx} ${sy})`}
    >
      {children}
    </text>
  );
}

function Pill({
  at: [x, y],
  children,
  hot,
}: {
  at: Pt;
  children: string;
  hot?: boolean;
}) {
  const w = children.length * 7.4 + 22;
  return (
    <g className={`strata-pill ${hot ? "strata-pill-hot" : ""}`}>
      <rect x={x - w / 2} y={y - 11} width={w} height={22} rx={11} />
      <text x={x} y={y + 0.5} textAnchor="middle" dominantBaseline="middle">
        {children}
      </text>
    </g>
  );
}

function files(cuts: number[], z: Range, tone: "rock" | "hot", opacity = 1) {
  return cuts
    .slice(1)
    .map((end, i) => (
      <Box
        key={`${cuts[i]}-${end}`}
        x={[cuts[i] + 1.5, end - 1.5]}
        z={z}
        tone={tone}
        opacity={opacity}
      />
    ));
}

function narrate(t: number, version: number) {
  if (t < FREEZE) {
    const i = Math.min(
      KEYS.length - 1,
      Math.max(0, Math.floor((t - 0.3) / 0.6)),
    );
    return `put(${KEYS[i][0]}) → append to WAL, insert into memtable`;
  }
  if (t < FLUSH[0]) return "freeze → memtable stops taking writes";
  if (t < COMMIT) return "flush → sorted file written to L0, fsync";
  if (t < COMPACT[0]) return `commit → MANIFEST v${version}, old WAL retires`;
  if (t < COMPACT[1]) return "compact → merge L0 into L1, re-cut key ranges";
  return `commit → MANIFEST v${version}`;
}

export function EngineStrata() {
  const [clock, setClock] = useState(STATIC_FRAME);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let visible = false;
    let offset = STATIC_FRAME * 1000 - performance.now();
    let pausedAt = 0;
    const tick = (now: number) => {
      setClock((now + offset) / 1000);
      frame = requestAnimationFrame(tick);
    };
    const el = document.querySelector(".engine-strata");
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting === visible) return;
      visible = entry.isIntersecting;
      if (visible) {
        offset -= pausedAt ? performance.now() - pausedAt : 0;
        frame = requestAnimationFrame(tick);
      } else {
        pausedAt = performance.now();
        cancelAnimationFrame(frame);
      }
    });
    if (el) io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  const cycle = Math.floor(clock / LOOP);
  const t = clock - cycle * LOOP;
  const landed = KEYS.filter((_, i) => t >= writeAt(i) + FALL).length;
  const version =
    40 + cycle * 2 + (t >= COMMIT ? 1 : 0) + (t >= COMPACT[1] ? 1 : 0);
  const seq = 1000 + cycle * KEYS.length + landed;

  const flush = ease(span(t, FLUSH));
  const compact = ease(span(t, COMPACT));
  const retire = span(t, RETIRE);
  const keyX = (k: number) => k * W;
  const inTray = KEYS.slice(0, landed).map(([, k]) => keyX(k));
  const lo = Math.min(...KEYS.map(([, k]) => keyX(k))) - 14;
  const hi = Math.max(...KEYS.map(([, k]) => keyX(k))) + 14;

  const oldCuts = L1_CUTS[cycle % 2];
  const newCuts = L1_CUTS[(cycle + 1) % 2];
  const l1Hot = t >= COMPACT[0] && t < COMPACT[1] + 0.8;
  const l0Exists = t >= FLUSH[1] && t < COMPACT[1];
  const l0Hot = t < COMMIT + 0.6 || t >= COMPACT[0];
  const manifestHot =
    (t >= COMMIT && t < COMMIT + 0.8) ||
    (t >= COMPACT[1] && t < COMPACT[1] + 0.8);
  const walPlates = t < RETIRE[1] ? landed : 0;

  // The tray shrinks onto the flushed key range and sinks into L0.
  const tray: { x: Range; z: Range } = {
    x: [lerp(0, lo, flush), lerp(W, hi, flush)],
    z: [lerp(TRAY, L0[0], flush), lerp(TRAY + 6, L0[1], flush)],
  };
  const falling = KEYS.map(([name, k], i) => ({
    name,
    x: keyX(k),
    p: (t - writeAt(i)) / FALL,
  })).filter((f) => f.p >= 0 && f.p < 1.6);

  const manifestTop = P(W - 30, -120, 24);
  const l0Top = P((lo + hi) / 2, D / 2, L0[1]);
  const l1Top = P(W / 2, D / 2, L1[1]);

  return (
    <svg
      className="engine-strata"
      viewBox="180 40 720 510"
      role="img"
      aria-labelledby="engine-strata-title engine-strata-description"
    >
      <title id="engine-strata-title">Kiban as layered ground</title>
      <desc id="engine-strata-description">
        An isometric cut-away whose layers are the LSM levels, with key order
        running left to right. Writes append to the WAL and land in sorted
        position on the memtable. The memtable freezes and flushes into L0 as a
        sorted file; the MANIFEST commits it and the old WAL retires. Compaction
        then merges L0 into L1 and re-cuts the non-overlapping L1 key ranges. L2
        holds the oldest, largest files.
      </desc>

      {/* WAL: an append-only column of plates in front of the block. */}
      <g className="strata-wal">
        <Box x={[-60, -20]} y={[D + 40, D + 80]} z={[0, 8]} />
        {Array.from({ length: walPlates }, (_, i) => (
          <Box
            key={i}
            x={[-58, -22]}
            y={[D + 42, D + 78]}
            z={[11 + i * 9, 17 + i * 9]}
            tone={i === landed - 1 && t < FREEZE ? "hot" : "rock"}
            opacity={1 - retire}
          />
        ))}
        <Pill
          at={[P(-40, D + 60, 0)[0], P(-40, D + 60, 0)[1] + 34]}
          hot={walPlates > 0 && t < FREEZE}
        >
          WAL
        </Pill>
        <text
          className="strata-meta"
          x={P(-40, D + 60, 0)[0]}
          y={P(-40, D + 60, 0)[1] + 62}
          textAnchor="middle"
        >
          seq {seq}
        </text>
      </g>

      {/* MANIFEST: a ledger behind the block. */}
      <g className={`strata-manifest ${manifestHot ? "is-hot" : ""}`}>
        <Box
          x={[W - 60, W]}
          y={[-150, -90]}
          z={[0, 24]}
          tone={manifestHot ? "hot" : "rock"}
        />
        <Pill at={[manifestTop[0] + 6, manifestTop[1] - 40]} hot>
          MANIFEST
        </Pill>
        <text
          className="strata-version"
          x={manifestTop[0] + 6}
          y={manifestTop[1] - 4}
          textAnchor="middle"
        >
          v{version}
        </text>
      </g>

      {files(L2_FILES, L2, "rock")}
      {t < COMPACT[0] && files(oldCuts, L1, "rock")}
      {t >= COMPACT[0] &&
        t < COMPACT[1] &&
        files(oldCuts, L1, "hot", 1 - compact)}
      {t >= COMPACT[0] && files(newCuts, L1, l1Hot ? "hot" : "rock", compact)}
      {l0Exists && (
        <Box
          x={[lo, hi]}
          z={[lerp(L0[0], L1[0] + 8, compact), lerp(L0[1], L1[1], compact)]}
          tone={l0Hot ? "hot" : "rock"}
          opacity={1 - compact}
        />
      )}

      {t < FLUSH[1] && (
        <>
          <Box x={tray.x} z={tray.z} tone={t >= FREEZE ? "frozen" : "tray"} />
          {inTray.map((x, i) => (
            <Box
              key={i}
              x={[x - 7, x + 7]}
              y={[D / 2 - 7, D / 2 + 7]}
              z={[tray.z[1], tray.z[1] + 12]}
              tone="cube"
              opacity={1 - flush}
            />
          ))}
        </>
      )}
      {falling.map(({ name, x, p }) => {
        const fall = Math.min(p, 1);
        const z = lerp(TRAY + 6 + 80, TRAY + 6, fall * fall);
        const [px, py] = P(x, D / 2, z + 40);
        return (
          <g key={name} opacity={p < 1 ? 1 : 1.6 - p > 0 ? (1.6 - p) / 0.6 : 0}>
            {p < 1 && (
              <Box
                x={[x - 7, x + 7]}
                y={[D / 2 - 7, D / 2 + 7]}
                z={[z, z + 12]}
                tone="cube"
              />
            )}
            <Pill at={[px, py]} hot>{`put(${name})`}</Pill>
          </g>
        );
      })}

      {manifestHot && (
        <path
          className="strata-commit"
          d={`M${manifestTop[0]} ${manifestTop[1]} L${(t >= COMPACT[1] ? l1Top : l0Top).join(" ")}`}
        />
      )}

      <FaceText x={8} z={L2[0] + 18}>
        L2 · oldest, largest files
      </FaceText>
      <FaceText x={8} z={L1[0] + 13}>
        L1 · disjoint key ranges
      </FaceText>
      {l0Exists && compact < 0.3 && (
        <FaceText x={lo + 6} z={L0[0] + 7}>
          L0
        </FaceText>
      )}
      {t < FLUSH[0] && (
        <Pill at={[P(0, D, TRAY)[0] - 54, P(0, D, TRAY)[1]]} hot={t >= FREEZE}>
          {t >= FREEZE ? "frozen" : "memtable"}
        </Pill>
      )}

      <g className="strata-axis">
        <path
          d={`M${P(0, D + 18, 0).join(" ")} L${P(W, D + 18, 0).join(" ")}`}
        />
        <FaceAxisText at={P(0, D + 18, 0)}>a</FaceAxisText>
        <FaceAxisText at={P(W / 2 - 34, D + 18, 0)}>key order</FaceAxisText>
        <FaceAxisText at={P(W - 6, D + 18, 0)}>z</FaceAxisText>
      </g>

      <g className="strata-ticker" transform="translate(200 532)">
        <rect width="8" height="8" y="-7" className="strata-ticker-dot" />
        <text x="18">{narrate(t, version)}</text>
      </g>
    </svg>
  );
}

function FaceAxisText({ at: [x, y], children }: { at: Pt; children: string }) {
  return (
    <text
      className="strata-axis-text"
      transform={`matrix(0.866 0.5 0 1 ${x} ${y + 16})`}
    >
      {children}
    </text>
  );
}
