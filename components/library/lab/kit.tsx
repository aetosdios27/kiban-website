"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { iso, type Pt } from "@/lib/kiban/iso";

// The drafting kit behind the library's figures: one projection, hatched
// faces, leader lines and a title block. Every figure is a function of `p`,
// how far it has scrolled into view, so it assembles and reverses with the page.

export const seg = (p: number, from: number, to: number) => {
  const t = Math.min(1, Math.max(0, (p - from) / (to - from)));
  return 1 - (1 - t) ** 3;
};
export const pts = (a: Pt[]) =>
  a.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

export type Tone = "wire" | "hot" | "fail" | "ghost" | "solid";

export function Slab({
  o,
  x = 0,
  y = 0,
  z = 0,
  w,
  d,
  h,
  tone = "wire",
  opacity = 1,
}: {
  o: Pt;
  x?: number;
  y?: number;
  z?: number;
  w: number;
  d: number;
  h: number;
  tone?: Tone;
  opacity?: number;
}) {
  const p = (a: number, b: number, c: number) => iso(o, x + a, y + b, z + c);
  return (
    <g className={`lx lx-${tone}`} opacity={opacity}>
      <polygon
        className="lx-left"
        points={pts([p(0, d, h), p(w, d, h), p(w, d, 0), p(0, d, 0)])}
      />
      <polygon
        className="lx-right"
        points={pts([p(w, 0, h), p(w, d, h), p(w, d, 0), p(w, 0, 0)])}
      />
      <polygon
        className="lx-top"
        points={pts([p(0, 0, h), p(w, 0, h), p(w, d, h), p(0, d, h)])}
      />
    </g>
  );
}

/** A light path that draws itself: `at` runs 0 to 1 along the line. */
export function Beam({
  from,
  to,
  at,
  tone = "hot",
}: {
  from: Pt;
  to: Pt;
  at: number;
  tone?: "hot" | "fail" | "dim";
}) {
  if (at <= 0) return null;
  const x = from[0] + (to[0] - from[0]) * at;
  const y = from[1] + (to[1] - from[1]) * at;
  return (
    <g className={`lx-beam lx-beam-${tone}`}>
      <line x1={from[0]} y1={from[1]} x2={x} y2={y} />
      <circle cx={x} cy={y} r={3} />
    </g>
  );
}

/** A leader from a point on the drawing to its note. */
export function Note({
  at,
  to,
  title,
  body,
  show = 1,
  align = "start",
}: {
  at: Pt;
  to: Pt;
  title: string;
  body?: string;
  show?: number;
  align?: "start" | "end";
}) {
  const end = to[0] + (align === "start" ? 150 : -150);
  return (
    <g className="lx-note" opacity={show}>
      <circle cx={at[0]} cy={at[1]} r={2.5} />
      <polyline points={pts([at, [to[0], to[1]], [end, to[1]]])} />
      <text x={align === "start" ? to[0] : end} y={to[1] - 7}>
        {title}
      </text>
      {body && (
        <text
          className="lx-note-body"
          x={align === "start" ? to[0] : end}
          y={to[1] + 16}
        >
          {body}
        </text>
      )}
    </g>
  );
}

const PAD = 44;
const PLAY_PX = 900; // wheel travel that plays a figure start to finish

function Mark({ x, y }: { x: number; y: number }) {
  return (
    <path
      className="lx-mark"
      d={`M${x - 6} ${y}H${x + 6}M${x} ${y - 6}V${y + 6}`}
    />
  );
}

export function Scene({
  fig,
  title,
  caption,
  height = 620,
  children,
}: {
  fig: string;
  title: string;
  caption: string;
  height?: number;
  children: (p: number) => ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const measure = useRef<SVGGElement>(null);
  const [p, setP] = useState(0);
  const [box, setBox] = useState({ x: 0, y: 0, w: 1000, h: height });

  // The finished drawing, rendered unseen, frames the figure: nothing can clip.
  useLayoutEffect(() => {
    const bounds = measure.current?.getBBox();
    if (!bounds) return;
    setBox({
      x: bounds.x - PAD,
      y: bounds.y - PAD,
      w: bounds.width + PAD * 2,
      h: bounds.height + PAD * 2,
    });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const frame = requestAnimationFrame(() => setP(1));
      return () => cancelAnimationFrame(frame);
    }
    let target = 0;
    let current = 0;
    let frame = 0;
    let touch = 0;
    const animate = () => {
      frame = 0;
      current += (target - current) * 0.16;
      if (Math.abs(target - current) < 0.001) current = target;
      setP(current);
      if (current !== target) frame = requestAnimationFrame(animate);
    };
    const advance = (delta: number) => {
      target = Math.min(1, Math.max(0, target + delta / PLAY_PX));
      if (!frame) frame = requestAnimationFrame(animate);
    };
    /** Holds the page while the figure plays. True when it took the input. */
    const hold = (delta: number) => {
      const { top, height: h } = el.getBoundingClientRect();
      const seat = Math.max(84, (innerHeight - h) / 2);
      // Once the figure reaches its seat it stays there until it has played.
      if (delta > 0 && target < 1 && top - delta < seat && top > -h / 2) {
        if (Math.abs(top - seat) > 1)
          scrollBy({ top: top - seat, behavior: "instant" });
        advance(delta);
        return true;
      }
      if (delta < 0 && target > 0 && target < 1 && Math.abs(top - seat) < 3) {
        advance(delta);
        return true;
      }
      return false;
    };
    const onWheel = (e: WheelEvent) => {
      if (hold(e.deltaY)) e.preventDefault();
    };
    const onTouchStart = (e: TouchEvent) => {
      touch = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0].clientY;
      if (hold(touch - y)) e.preventDefault();
      touch = y;
    };
    const finishIfPassed = () => {
      if (el.getBoundingClientRect().bottom < 0 && target < 1) {
        target = 1;
        if (!frame) frame = requestAnimationFrame(animate);
      }
    };
    const watch = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        addEventListener("wheel", onWheel, { passive: false });
        addEventListener("touchstart", onTouchStart, { passive: true });
        addEventListener("touchmove", onTouchMove, { passive: false });
      } else {
        removeEventListener("wheel", onWheel);
        removeEventListener("touchstart", onTouchStart);
        removeEventListener("touchmove", onTouchMove);
        finishIfPassed();
      }
    });
    watch.observe(el);
    return () => {
      watch.disconnect();
      removeEventListener("wheel", onWheel);
      removeEventListener("touchstart", onTouchStart);
      removeEventListener("touchmove", onTouchMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <figure ref={ref} className="lib-figure lib-wide lx-scene">
      <svg
        viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
        role="img"
        aria-label={caption}
      >
        <defs>
          <pattern
            id="lx-hatch"
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="6"
              stroke="#2c2c2c"
              strokeWidth="1"
            />
          </pattern>
          <pattern
            id="lx-hatch-hot"
            width="5"
            height="5"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="5"
              stroke="#8a7720"
              strokeWidth="1.2"
            />
          </pattern>
          <pattern
            id="lx-hatch-fail"
            width="5"
            height="5"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="5"
              stroke="#8c3a31"
              strokeWidth="1.2"
            />
          </pattern>
          <pattern
            id="lx-dots"
            width="14"
            height="14"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1" cy="1" r="0.8" fill="#222" />
          </pattern>
          <filter id="lx-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect
          className="lx-field"
          x={box.x}
          y={box.y}
          width={box.w}
          height={box.h}
        />
        <Mark x={box.x + 18} y={box.y + 18} />
        <Mark x={box.x + box.w - 18} y={box.y + 18} />
        <Mark x={box.x + 18} y={box.y + box.h - 18} />
        <Mark x={box.x + box.w - 18} y={box.y + box.h - 18} />
        <g ref={measure} visibility="hidden" aria-hidden="true">
          {children(1)}
        </g>
        {children(p)}
      </svg>
      <span className="lx-play" aria-hidden="true">
        <i style={{ transform: `scaleX(${p})` }} />
      </span>
      <figcaption className="lx-block">
        <b>fig. {fig}</b>
        <span>{title}</span>
        <small>{caption}</small>
      </figcaption>
    </figure>
  );
}
