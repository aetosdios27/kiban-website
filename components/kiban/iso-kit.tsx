"use client";

import { Reload } from "pixelarticons/react";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { iso, type Pt } from "@/lib/kiban/iso";

export { iso, type Pt };

// Shared parts for the isometric explainer diagrams: one projection, boxes,
// plates, flat readable cards, numbered markers, and IsoFigure, which owns the
// walkthrough (plays once on first view), hover linking and the step list.

export type Range = [number, number];

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

// Phones get a focus view instead of a shrunken drawing.
const NARROW = "(max-width: 700px)";
function useNarrow() {
  return useSyncExternalStore(
    (cb) => {
      const m = matchMedia(NARROW);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => matchMedia(NARROW).matches,
    () => false,
  );
}

type VB = [number, number, number, number];
const parseVB = (v: string) => v.split(/\s+/).map(Number) as VB;

// The box around everything that belongs to step n, padded and widened to at
// least `min` so a lone marker never fills the screen.
function stepBox(svg: SVGSVGElement, n: number, min: number): VB | null {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  svg.querySelectorAll<SVGGElement>(`[data-steps~="${n}"]`).forEach((g) => {
    const b = g.getBBox();
    if (!b.width && !b.height) return;
    x0 = Math.min(x0, b.x);
    y0 = Math.min(y0, b.y);
    x1 = Math.max(x1, b.x + b.width);
    y1 = Math.max(y1, b.y + b.height);
  });
  if (x0 === Infinity) return null;
  const pad = 28;
  let w = x1 - x0 + pad * 2;
  let h = y1 - y0 + pad * 2;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  // Match the focus box's square frame so nothing is letterboxed away.
  w = Math.max(w, min, h);
  h = w;
  return [cx - w / 2, cy - h / 2, w, h];
}

export function IsoFigure({
  id,
  title,
  desc,
  viewBox,
  steps,
  note,
  children,
}: {
  id: string;
  title: string;
  desc: string;
  viewBox: string;
  steps: IsoStep[];
  /** A small caption under the drawing, e.g. what is illustrative. */
  note?: string;
  /** Drawing contents; `arrow` is the marker id for arrowheads. */
  children: (arrow: string) => ReactNode;
}) {
  const [active, setActive] = useState<number | null>(null);
  const [tour, setTour] = useState<number | null>(null);
  const [toured, setToured] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const shown = active ?? tour;
  const arrow = `${id}-arrow`;
  const narrow = useNarrow();
  const svgRef = useRef<SVGSVGElement>(null);
  const current = useRef<VB>(parseVB(viewBox));

  // On phones, glide the camera to the shown step; zoom out when none is.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const full = parseVB(viewBox);
    const target =
      (narrow && shown !== null && stepBox(svg, shown, full[2] * 0.36)) || full;
    const from = current.current;
    const quiet = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    const dur = quiet ? 0 : 650;
    let frame = 0;
    const tick = (now: number) => {
      const t = dur ? Math.min(1, (now - start) / dur) : 1;
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const vb = from.map((v, i) => v + (target[i] - v) * e) as VB;
      current.current = vb;
      svg.setAttribute("viewBox", vb.map((v) => v.toFixed(1)).join(" "));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [narrow, shown, viewBox]);

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

  return (
    <div
      className="write-diagram"
      ref={root}
      data-active={shown ?? undefined}
      data-touring={tour !== null || undefined}
      onMouseLeave={() => !narrow && setActive(null)}
    >
      <div className="wd-figure panel panel-grid">
        <svg
          ref={svgRef}
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
        </svg>
        {note && <p className="wd-note">{note}</p>}
        <button
          type="button"
          className="wd-replay"
          data-cuelume-tap
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
              if (narrow) return;
              setTour(null);
              setActive(i + 1);
            }}
          >
            <button
              type="button"
              className="wd-step"
              data-cuelume-select
              aria-pressed={shown === i + 1}
              onClick={() => {
                setTour(null);
                setActive(active === i + 1 ? null : i + 1);
              }}
              onFocus={() => {
                setTour(null);
                setActive(i + 1);
              }}
            >
              <span className="wd-step-n">{i + 1}</span>
              <span className="wd-step-text">
                <span className="wd-step-title">{s.title}</span>
                <span className="wd-step-body">{s.body}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
