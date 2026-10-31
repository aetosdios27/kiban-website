"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  pageScrollTarget,
  scrollPage,
  addScrollGate,
} from "@/components/layout/smooth-scroll";
import { fmtOps } from "@/lib/kiban/bench";
import { cue } from "@/lib/kiban/sound";
import {
  endS,
  filesAt,
  finishS,
  isStopped,
  l0Stop,
  peakDebt,
  peakOps,
  rocksdbFinishS,
  sampleAt,
  samples,
  stops,
} from "@/lib/kiban/tree";
import { iso, type Pt } from "../iso-kit";
import { Morph, useSampled } from "./morph";

// One write run, inside the engine. The stacked levels pull apart, then each
// wheel gesture springs to the next moment worth reading, so a failure lands
// and holds instead of passing under the scroll. The plates hold the files each
// level really had that second, and both charts share the same clock.

const ease = (x: number) => 1 - (1 - x) ** 3;
const LAST = stops.length - 1;

// Apple's spring model: a perceptual duration and a small bounce.
const SPRING_S = 0.72;
const BOUNCE = 0.16;
const OMEGA = (2 * Math.PI) / SPRING_S;
const DAMPING = 1 - BOUNCE;

// Browsers hide trackpad momentum, so a new gesture is inferred: a pause in the
// stream of wheel events, or deltas rising again after decaying.
const GESTURE_GAP_MS = 140;
const RISE_RATIO = 1.5;
const MIN_STEP_MS = 340;
const IDLE_SNAP_MS = 220;

/** Scroll progress to seconds, linear between neighbouring stops. */
function clock(progress: number) {
  const f = Math.min(LAST, Math.max(0, progress * LAST));
  const i = Math.min(LAST - 1, Math.floor(f));
  return stops[i].t + (stops[i + 1].t - stops[i].t) * (f - i);
}
const SIZE = 118;
const THICK = 7;
const COLS = 8;
const ROWS = 6;
const INSET = 12;
const CELL_X = (SIZE * 2 - INSET * 2) / COLS;
const CELL_Y = (SIZE * 2 - INSET * 2) / ROWS;
const O: Pt = [290, 110];
const LEVELS = [0, 1, 2, 3] as const;
const CLOSED_GAP = 15;
const OPEN_GAP = 128;
const pts = (a: Pt[]) =>
  a.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

// A fixed scatter per level: files feel placed, and no two levels match.
const scatter = (level: number) =>
  Array.from({ length: COLS * ROWS }, (_, i) => i).sort(
    (a, b) =>
      ((a * (37 + level * 6) + level * 11) % 47) -
      ((b * (37 + level * 6) + level * 11) % 47),
  );

function File({ cell }: { cell: number }) {
  const cx = cell % COLS;
  const cy = Math.floor(cell / COLS);
  const x0 = INSET + cx * CELL_X + 3;
  const y0 = INSET + cy * CELL_Y + 3;
  const x1 = x0 + CELL_X - 6;
  const y1 = y0 + CELL_Y - 6;
  const h = 7;
  const p = (x: number, y: number, z: number) => iso(O, x, y, z);
  return (
    <g className="tp-file">
      <polygon
        className="f-left"
        points={pts([p(x0, y1, h), p(x1, y1, h), p(x1, y1, 0), p(x0, y1, 0)])}
      />
      <polygon
        className="f-right"
        points={pts([p(x1, y0, h), p(x1, y1, h), p(x1, y1, 0), p(x1, y0, 0)])}
      />
      <polygon
        className="f-top"
        points={pts([p(x0, y0, h), p(x1, y0, h), p(x1, y1, h), p(x0, y1, h)])}
      />
    </g>
  );
}

function Plate({
  level,
  files,
  active,
  stopped,
  groupRef,
  bodyRef,
}: {
  level: number;
  files: number;
  active: boolean;
  stopped: boolean;
  groupRef: (el: SVGGElement | null) => void;
  bodyRef: (el: SVGGElement | null) => void;
}) {
  const w = SIZE * 2;
  const p = (x: number, y: number, z = 0) => iso(O, x, y, z);
  const filled = useMemo(
    () =>
      scatter(level)
        .slice(0, files)
        .sort(
          (a, b) =>
            (a % COLS) +
            Math.floor(a / COLS) -
            ((b % COLS) + Math.floor(b / COLS)),
        ),
    [files, level],
  );
  const leaderStart = p(w, 0);
  return (
    <g
      ref={groupRef}
      className="tp-level"
      data-active={active || undefined}
      data-stopped={stopped || undefined}
    >
      <g ref={bodyRef}>
        <polygon
          className="tp-side"
          points={pts([p(0, w), p(w, w), p(w, w, -THICK), p(0, w, -THICK)])}
        />
        <polygon
          className="tp-side"
          points={pts([p(w, 0), p(w, w), p(w, w, -THICK), p(w, 0, -THICK)])}
        />
        <polygon
          className="tp-top"
          points={pts([p(0, 0), p(w, 0), p(w, w), p(0, w)])}
        />
        {Array.from({ length: COLS * ROWS }, (_, cell) => {
          const [x, y] = p(
            INSET + (cell % COLS) * CELL_X + CELL_X / 2,
            INSET + Math.floor(cell / COLS) * CELL_Y + CELL_Y / 2,
          );
          return <circle key={cell} className="tp-cell" cx={x} cy={y} r={1} />;
        })}
        {filled.map((cell) => (
          <File key={cell} cell={cell} />
        ))}
      </g>
      <g className="tp-callout">
        <line
          className="tp-leader"
          x1={leaderStart[0]}
          y1={leaderStart[1]}
          x2={leaderStart[0] + 34}
          y2={leaderStart[1]}
        />
        <text
          className="tp-label"
          x={leaderStart[0] + 42}
          y={leaderStart[1] - 12}
        >
          L{level}
        </text>
        <foreignObject
          x={leaderStart[0] + 42}
          y={leaderStart[1] - 10}
          width={110}
          height={30}
        >
          <div className="tp-count">
            <Morph
              value={`${files}${level === 0 ? ` / ${l0Stop}` : ""}`}
              duration={160}
            />
          </div>
        </foreignObject>
      </g>
    </g>
  );
}

const CHART_W = 600;
const OPS_H = 200;
const DEBT_H = 80;
const x = (t: number) => (t / endS) * CHART_W;

export function TreeScene() {
  const root = useRef<HTMLDivElement>(null);
  const plates = useRef<(SVGGElement | null)[]>([]);
  const bodies = useRef<(SVGGElement | null)[]>([]);
  const guides = useRef<(SVGLineElement | null)[]>([]);
  const clips = useRef<(SVGRectElement | null)[]>([]);
  const cursors = useRef<(SVGLineElement | null)[]>([]);
  const isoSvg = useRef<SVGSVGElement>(null);
  const stepTo = useRef<(index: number) => void>(() => {});
  const [t, setT] = useState(0);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const spring = { x: 0, v: 0, target: 0, active: false, landed: true };
    let current = 0;
    let stepAt = 0;
    let lastWheel = 0;
    let lastDelta = 0;
    let lastY = -1;
    let lastMove = 0;
    let shownT = -1;
    let frame = 0;
    let previous = performance.now();

    const bounds = () => {
      const el = root.current!;
      const top = el.getBoundingClientRect().top + scrollY;
      return { top, travel: el.offsetHeight - innerHeight };
    };
    const yAt = (i: number) => {
      const { top, travel } = bounds();
      return top + (travel * i) / LAST;
    };
    const step = (i: number) => {
      current = Math.min(LAST, Math.max(0, i));
      if (!spring.active) {
        spring.x = scrollY;
        spring.v = 0;
      }
      spring.target = yAt(current);
      spring.active = true;
      spring.landed = false;
      stepAt = performance.now();
    };
    stepTo.current = step;

    const land = () => {
      const moment = stops[current];
      const body = bodies.current[moment.active];
      body?.animate(
        [
          { transform: "translateY(0)" },
          { transform: `translateY(${moment.failure ? 9 : 4}px)` },
          { transform: "translateY(-2px)" },
          { transform: "translateY(0)" },
        ],
        { duration: moment.failure ? 460 : 340, easing: "ease-out" },
      );
      cue(moment.failure ? "error" : "tap", { emphasis: "subtle" });
    };

    const off = addScrollGate(({ deltaY, event }) => {
      const el = root.current;
      if (!el?.offsetHeight || !(event instanceof WheelEvent) || event.ctrlKey)
        return true;
      const { top, travel } = bounds();
      const y = scrollY;
      const dir = Math.sign(deltaY);
      if (y < top - 1 || y > top + travel + 1) {
        const next = pageScrollTarget() + deltaY;
        if (dir > 0 && y < top && next >= top) {
          event.preventDefault();
          step(0);
          return false;
        }
        if (dir < 0 && y > top + travel && next <= top + travel) {
          event.preventDefault();
          step(LAST);
          return false;
        }
        return true;
      }
      const now = performance.now();
      const gap = now - lastWheel;
      const size = Math.abs(deltaY);
      const rising = size > lastDelta * RISE_RATIO && size > 8;
      const fresh = gap > GESTURE_GAP_MS || rising;
      lastWheel = now;
      lastDelta = size;
      const leaving =
        (current === LAST && dir > 0) || (current === 0 && dir < 0);
      if (leaving && !spring.active && fresh) return true;
      event.preventDefault();
      if (fresh && now - stepAt > MIN_STEP_MS && !leaving) step(current + dir);
      return false;
    });

    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      const el = root.current;
      if (!el) return;
      const dt = Math.min(1 / 30, (now - previous) / 1000);
      previous = now;
      if (spring.active) {
        const accel =
          -OMEGA * OMEGA * (spring.x - spring.target) -
          2 * DAMPING * OMEGA * spring.v;
        spring.v += accel * dt;
        spring.x += spring.v * dt;
        scrollPage(spring.x);
        if (!spring.landed && Math.abs(spring.x - spring.target) < 4) {
          spring.landed = true;
          land();
        }
        if (
          Math.abs(spring.x - spring.target) < 0.4 &&
          Math.abs(spring.v) < 6
        ) {
          scrollPage(spring.target);
          spring.active = false;
        }
      }
      const { top, height } = el.getBoundingClientRect();
      if (top > innerHeight || top + height < 0) return;
      const travel = height - innerHeight;
      const progress = Math.min(1, Math.max(0, -top / travel));
      if (scrollY !== lastY) {
        lastY = scrollY;
        lastMove = now;
      }
      const nearest = Math.round(progress * LAST);
      if (
        !spring.active &&
        height > 0 &&
        top <= 1 &&
        top >= -travel - 1 &&
        now - lastMove > IDLE_SNAP_MS &&
        Math.abs(-top - (travel * nearest) / LAST) > 2
      )
        step(nearest);
      if (!spring.active) current = nearest;

      const open = ease(Math.min(1, progress * LAST));
      const moment = clock(progress);
      const gap = CLOSED_GAP + (OPEN_GAP - CLOSED_GAP) * open;
      plates.current.forEach((plate, level) =>
        plate?.setAttribute(
          "transform",
          `translate(0 ${(level * gap - 1.5 * (gap - CLOSED_GAP)).toFixed(2)})`,
        ),
      );
      isoSvg.current?.style.setProperty(
        "--callout",
        String(Math.min(1, Math.max(0, (open - 0.55) / 0.45))),
      );
      guides.current.forEach((line) =>
        line?.setAttribute("stroke-dashoffset", String((1 - open) * 400)),
      );
      const width = String(x(moment));
      clips.current.forEach((clip) => clip?.setAttribute("width", width));
      cursors.current.forEach((line) => {
        line?.setAttribute("x1", width);
        line?.setAttribute("x2", width);
      });
      if (moment !== shownT) {
        shownT = moment;
        setT(moment);
      }
      setIndex(nearest);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      off();
    };
  }, []);

  const sample = sampleAt(t);
  const stopped = isStopped(sample) && t > 0;
  const moment = stops[index];
  const files = filesAt(t);
  const readout = useSampled(
    {
      clock: `t + ${t.toFixed(1)} s`,
      rate: t === 0 ? "ready" : t > finishS ? "done" : fmtOps(sample[1]),
      queue: `${t === 0 ? 0 : sample[3]} MiB`,
    },
    90,
  );
  const bars = useMemo(
    () =>
      samples.map((s, i) => {
        const prev = i ? samples[i - 1][0] : 0;
        return {
          x: x(prev),
          w: Math.max(1, x(s[0]) - x(prev) - 0.8),
          h: (s[1] / peakOps) * (OPS_H - 8),
          stop: isStopped(s),
        };
      }),
    [],
  );
  const debtPath = useMemo(() => {
    const line = samples
      .map(
        (s) =>
          `${x(s[0]).toFixed(1)},${(DEBT_H - (s[3] / peakDebt) * (DEBT_H - 4)).toFixed(1)}`,
      )
      .join(" L");
    return `M0,${DEBT_H} L${line} L${CHART_W},${DEBT_H} Z`;
  }, []);
  const size = SIZE * 2;
  const corners: Pt[] = [
    iso(O, 0, 0),
    iso(O, size, 0),
    iso(O, 0, size),
    iso(O, size, size),
  ];

  return (
    <div ref={root} className="tree">
      <div className="tree-pin">
        <div className="tree-top">
          <span>10M random writes, inside the tree</span>
          <b>
            <Morph value={readout.clock} duration={120} />
          </b>
        </div>
        <div className="tree-panes">
          <svg
            ref={isoSvg}
            className="tree-iso"
            viewBox="50 -84 610 690"
            role="img"
            aria-label="Kiban's four LSM levels and how many files each held at this moment in the write run."
          >
            {corners.map(([cx, cy], i) => (
              <line
                key={i}
                ref={(el) => {
                  guides.current[i] = el;
                }}
                className="tp-guide"
                x1={cx}
                x2={cx}
                y1={cy - 170}
                y2={cy + 230}
                pathLength={400}
              />
            ))}
            {LEVELS.toReversed().map((level) => (
              <Plate
                key={level}
                level={level}
                files={files[level]}
                active={moment.active === level && !stopped}
                stopped={stopped && level === 0}
                groupRef={(el) => {
                  plates.current[level] = el;
                }}
                bodyRef={(el) => {
                  bodies.current[level] = el;
                }}
              />
            ))}
          </svg>

          <div
            className="tree-rail"
            role="group"
            aria-label="Moments in the run"
          >
            {stops.map((stop, i) => (
              <button
                key={stop.title}
                type="button"
                aria-label={stop.title}
                aria-current={i === index ? "step" : undefined}
                data-failure={stop.failure || undefined}
                onClick={() => stepTo.current(i)}
              />
            ))}
          </div>
          <div className="tree-data">
            <p className="tree-metric">
              <span>writes per second</span>
              <b data-stopped={stopped || undefined}>
                <Morph value={readout.rate} duration={180} />
              </b>
            </p>
            <svg
              className="tree-chart"
              viewBox={`0 0 ${CHART_W} ${OPS_H}`}
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <clipPath id="tree-played">
                  <rect
                    ref={(el) => {
                      clips.current[0] = el;
                    }}
                    x={0}
                    y={0}
                    width={0}
                    height={OPS_H}
                  />
                </clipPath>
              </defs>
              {bars.map((bar) => (
                <rect
                  key={bar.x}
                  className="tc-ghost"
                  x={bar.x}
                  y={OPS_H - bar.h}
                  width={bar.w}
                  height={bar.h}
                />
              ))}
              <g clipPath="url(#tree-played)">
                {bars.map((bar) =>
                  bar.stop ? (
                    <rect
                      key={bar.x}
                      className="tc-stop"
                      x={bar.x}
                      y={OPS_H - 10}
                      width={bar.w}
                      height={10}
                    />
                  ) : (
                    <rect
                      key={bar.x}
                      className="tc-bar"
                      x={bar.x}
                      y={OPS_H - bar.h}
                      width={bar.w}
                      height={bar.h}
                    />
                  ),
                )}
              </g>
              <line
                className="tc-rival"
                x1={x(rocksdbFinishS)}
                x2={x(rocksdbFinishS)}
                y1={0}
                y2={OPS_H}
              />
              <line
                className="tc-axis"
                x1={0}
                x2={CHART_W}
                y1={OPS_H}
                y2={OPS_H}
              />
              <line
                ref={(el) => {
                  cursors.current[0] = el;
                }}
                className="tc-cursor"
                y1={0}
                y2={OPS_H}
              />
            </svg>
            <p className="tree-rival-note">
              ┊ RocksDB finished the same run at {rocksdbFinishS.toFixed(0)} s
            </p>
            <p className="tree-metric">
              <span>queued above level targets</span>
              <b>
                <Morph value={readout.queue} duration={180} />
              </b>
            </p>
            <svg
              className="tree-chart"
              viewBox={`0 0 ${CHART_W} ${DEBT_H}`}
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <clipPath id="tree-played-debt">
                  <rect
                    ref={(el) => {
                      clips.current[1] = el;
                    }}
                    x={0}
                    y={0}
                    width={0}
                    height={DEBT_H}
                  />
                </clipPath>
              </defs>
              <path className="tc-area-ghost" d={debtPath} />
              <path
                className="tc-area"
                d={debtPath}
                clipPath="url(#tree-played-debt)"
              />
              <line
                className="tc-axis"
                x1={0}
                x2={CHART_W}
                y1={DEBT_H}
                y2={DEBT_H}
              />
              <line
                ref={(el) => {
                  cursors.current[1] = el;
                }}
                className="tc-cursor"
                y1={0}
                y2={DEBT_H}
              />
            </svg>
            <div
              className="tree-beat"
              data-failure={moment.failure || undefined}
            >
              <p>
                <Morph value={moment.title} duration={420} />
              </p>
              <p>
                <Morph value={moment.body} duration={420} />
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
