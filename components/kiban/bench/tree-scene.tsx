"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fmtOps } from "@/lib/kiban/bench";
import {
  beatAt,
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
} from "@/lib/kiban/tree";
import { iso, type Pt } from "../iso-kit";

// One write run, inside the engine. The stacked levels pull apart, then scroll
// plays the run: the plates hold the files each level really had that second,
// and both charts share the same clock. Discrete state renders through React;
// the continuous parts write straight to the DOM on each frame.

const OPEN_END = 0.14;
const DRAIN_START = 0.8;
const CLOCK_END = 0.97;
const ease = (x: number) => 1 - (1 - x) ** 3;

/** Scroll to seconds. The last four seconds get a fifth of the scroll. */
function clock(progress: number) {
  if (progress <= OPEN_END) return 0;
  if (progress < DRAIN_START)
    return ((progress - OPEN_END) / (DRAIN_START - OPEN_END)) * finishS;
  const f = Math.min(1, (progress - DRAIN_START) / (CLOCK_END - DRAIN_START));
  return finishS + f * (endS - finishS);
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
}: {
  level: number;
  files: number;
  active: boolean;
  stopped: boolean;
  groupRef: (el: SVGGElement | null) => void;
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
        <text
          className="tp-count"
          x={leaderStart[0] + 42}
          y={leaderStart[1] + 10}
        >
          {files}
          {level === 0 ? ` / ${l0Stop}` : ""}
        </text>
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
  const guides = useRef<(SVGLineElement | null)[]>([]);
  const clips = useRef<(SVGRectElement | null)[]>([]);
  const cursors = useRef<(SVGLineElement | null)[]>([]);
  const clockText = useRef<HTMLElement>(null);
  const iso3d = useRef<SVGSVGElement>(null);
  const [t, setT] = useState(0);

  useEffect(() => {
    let frame = 0;
    let shown = -1;
    const draw = () => {
      frame = requestAnimationFrame(draw);
      const el = root.current;
      if (!el) return;
      const { top, height } = el.getBoundingClientRect();
      if (top > innerHeight || top + height < 0) return;
      const progress = Math.min(1, Math.max(0, -top / (height - innerHeight)));
      const open = ease(Math.min(1, progress / OPEN_END));
      const now = clock(progress);
      const gap = CLOSED_GAP + (OPEN_GAP - CLOSED_GAP) * open;
      plates.current.forEach((plate, level) =>
        plate?.setAttribute(
          "transform",
          `translate(0 ${(level * gap - 1.5 * (gap - CLOSED_GAP)).toFixed(2)})`,
        ),
      );
      iso3d.current?.style.setProperty(
        "--callout",
        String(Math.min(1, Math.max(0, (open - 0.55) / 0.45))),
      );
      const reach = 1 - open;
      guides.current.forEach((line) =>
        line?.setAttribute("stroke-dashoffset", String(reach * 400)),
      );
      const width = String(x(now));
      clips.current.forEach((clip) => clip?.setAttribute("width", width));
      cursors.current.forEach((line) => {
        line?.setAttribute("x1", width);
        line?.setAttribute("x2", width);
      });
      if (clockText.current)
        clockText.current.textContent = `t + ${now.toFixed(1)} s`;
      const key = Math.round(now * 4) / 4;
      if (key !== shown) {
        shown = key;
        setT(now);
      }
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);

  const sample = sampleAt(t);
  const stopped = isStopped(sample) && t > 0;
  const beat = beatAt(t);
  const files = filesAt(t);
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
          <b ref={clockText}>t + 0.0 s</b>
        </div>
        <div className="tree-panes">
          <svg
            ref={iso3d}
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
                active={beat.active === level && !stopped}
                stopped={stopped && level === 0}
                groupRef={(el) => {
                  plates.current[level] = el;
                }}
              />
            ))}
          </svg>
          <div className="tree-data">
            <p className="tree-metric">
              <span>writes per second</span>
              <b data-stopped={stopped || undefined}>
                {t === 0 ? "ready" : t > finishS ? "done" : fmtOps(sample[1])}
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
              <b>{t === 0 ? 0 : sample[3]} MiB</b>
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
            <div key={beat.title} className="tree-beat">
              <p>{beat.title}</p>
              <p>{beat.body}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
