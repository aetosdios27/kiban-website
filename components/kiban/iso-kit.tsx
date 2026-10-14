"use client";

import { Reload } from "pixelarticons/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

// Shared parts for the isometric explainer diagrams: one projection, boxes,
// plates, flat readable cards, numbered markers, and IsoFigure, which owns the
// walkthrough (plays once on first view), hover linking and the step list.

export type Pt = [number, number];
export type Range = [number, number];

export const iso = (o: Pt, x: number, y: number, z = 0): Pt => [
  o[0] + (x - y) * 0.866,
  o[1] + (x + y) * 0.5 - z,
];
const pts = (a: Pt[]) =>
  a.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

export function Box({
  o,
  x,
  y,
  z,
  className = "",
}: {
  o: Pt;
  x: Range;
  y: Range;
  z: Range;
  className?: string;
}) {
  const [x0, x1] = x;
  const [y0, y1] = y;
  const [z0, z1] = z;
  const p = (a: number, b: number, c: number) => iso(o, a, b, c);
  return (
    <g className={`wd-box ${className}`}>
      <polygon
        className="wd-front"
        points={pts([
          p(x0, y1, z1),
          p(x1, y1, z1),
          p(x1, y1, z0),
          p(x0, y1, z0),
        ])}
      />
      <polygon
        className="wd-side"
        points={pts([
          p(x1, y0, z1),
          p(x1, y1, z1),
          p(x1, y1, z0),
          p(x1, y0, z0),
        ])}
      />
      <polygon
        className="wd-top"
        points={pts([
          p(x0, y0, z1),
          p(x1, y0, z1),
          p(x1, y1, z1),
          p(x0, y1, z1),
        ])}
      />
    </g>
  );
}

export function Plate({
  o,
  w,
  d,
  t,
  className,
}: {
  o: Pt;
  w: number;
  d: number;
  t: number;
  className: string;
}) {
  return <Box o={o} x={[0, w]} y={[0, d]} z={[-t, 0]} className={className} />;
}

export type Row = { text: string; hot?: boolean; muted?: boolean };

// A flat, screen-aligned card so the words stay easy to read.
export function Card({
  at: [x, y],
  title,
  note,
  rows,
  width = 170,
}: {
  at: Pt;
  title: string;
  note?: string;
  rows: Row[];
  width?: number;
}) {
  const h = 34 + rows.length * 19;
  return (
    <g className="wd-card">
      <rect x={x} y={y} width={width} height={h} rx={3} />
      <text className="wd-card-title" x={x + 12} y={y + 20}>
        {title}
      </text>
      {note && (
        <text
          className="wd-card-note"
          x={x + width - 12}
          y={y + 20}
          textAnchor="end"
        >
          {note}
        </text>
      )}
      {rows.map((r, i) => (
        <text
          key={r.text}
          className={`wd-row ${r.hot ? "is-hot" : ""} ${r.muted ? "is-muted" : ""}`}
          x={x + 12}
          y={y + 42 + i * 19}
        >
          {r.text}
        </text>
      ))}
    </g>
  );
}

export function Marker({ at: [x, y], n }: { at: Pt; n: number }) {
  return (
    <g className="wd-marker">
      <circle cx={x} cy={y} r={12} />
      <text x={x} y={y + 0.5} textAnchor="middle" dominantBaseline="middle">
        {n}
      </text>
    </g>
  );
}

// Everything inside belongs to these steps: hovering another step fades it.
export const Step = ({
  n,
  children,
}: {
  n: number | number[];
  children: ReactNode;
}) => <g data-steps={Array.isArray(n) ? n.join(" ") : String(n)}>{children}</g>;

export type IsoStep = { title: string; body: string };

export function IsoFigure({
  id,
  title,
  desc,
  viewBox,
  steps,
  paths,
  children,
}: {
  id: string;
  title: string;
  desc: string;
  viewBox: string;
  steps: IsoStep[];
  /** The path the tour token rides for each step; null holds still. */
  paths: (string | null)[];
  /** Drawing contents; `arrow` is the marker id for arrowheads. */
  children: (arrow: string) => ReactNode;
}) {
  const [active, setActive] = useState<number | null>(null);
  const [tour, setTour] = useState<number | null>(null);
  const [toured, setToured] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const shown = active ?? tour;
  const arrow = `${id}-arrow`;

  // Play the walkthrough once, the first time the figure is mostly in view.
  useEffect(() => {
    const quiet = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const el = root.current;
    if (quiet || !el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        setTour(1);
      },
      { threshold: 0.55 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (tour === null) return;
    const id = setTimeout(
      () => {
        if (tour >= steps.length) {
          setTour(null);
          setToured(true);
        } else setTour(tour + 1);
      },
      tour === steps.length ? 1700 : 1400,
    );
    return () => clearTimeout(id);
  }, [tour, steps.length]);

  const path = tour !== null ? paths[tour - 1] : null;

  return (
    <div
      className="write-diagram"
      ref={root}
      data-active={shown ?? undefined}
      data-touring={tour !== null || undefined}
      onMouseLeave={() => setActive(null)}
    >
      <div className="wd-figure panel panel-grid">
        <svg
          className="wd-svg"
          viewBox={viewBox}
          role="img"
          aria-labelledby={`${id}-title ${id}-desc`}
        >
          <title id={`${id}-title`}>{title}</title>
          <desc id={`${id}-desc`}>{desc}</desc>
          <defs>
            <marker
              id={arrow}
              viewBox="0 0 8 8"
              refX="7"
              refY="4"
              markerWidth="8"
              markerHeight="8"
              orient="auto-start-reverse"
            >
              <path d="M0 0 L8 4 L0 8" className="wd-arrowhead" />
            </marker>
          </defs>
          {children(`url(#${arrow})`)}
          {/* Tour token: one glowing dot rides the current step's path. */}
          {path && (
            <g key={tour} className="wd-token">
              <circle r={14} className="wd-token-glow" />
              <circle r={6} className="wd-token-core" />
              <animateMotion
                ref={(el) => (el as SVGAnimationElement | null)?.beginElement()}
                begin="indefinite"
                dur="0.9s"
                fill="freeze"
                calcMode="spline"
                keyTimes="0;1"
                keySplines="0.45 0 0.25 1"
                path={path}
              />
            </g>
          )}
        </svg>
        <button
          type="button"
          className="wd-replay"
          onClick={() => {
            setActive(null);
            setTour(1);
          }}
          hidden={tour !== null || !toured}
        >
          <Reload className="icon" aria-hidden="true" />
          replay
        </button>
      </div>

      <ol className="wd-steps">
        {steps.map((s, i) => (
          <li
            key={s.title}
            className={shown === i + 1 ? "is-active" : ""}
            onMouseEnter={() => {
              setTour(null);
              setActive(i + 1);
            }}
            onFocus={() => setActive(i + 1)}
            onBlur={() => setActive(null)}
            tabIndex={0}
          >
            <span className="wd-step-n">{i + 1}</span>
            <div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
