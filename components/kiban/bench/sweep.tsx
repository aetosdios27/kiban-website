"use client";

import { Pause, Play } from "pixelarticons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  fmtFull,
  fmtOps,
  fmtUs,
  sweep,
  type SweepKey,
} from "@/lib/kiban/bench";
import { FillPattern } from "@/lib/dither";
import { cue } from "@/lib/kiban/sound";
import { Morph } from "./morph";
import { useWidth } from "./use-width";

// Durable throughput as writers double. The line glides between measured
// points, but every number on screen is a measured value at its nearest stop.

const SWEEP_MS = 5200;
const RETURN_RATE = 0.006; // stops per millisecond when settling on a stop
const LAST = sweep.writers.length - 1;
const HEIGHT = 320;
const PAD = { top: 18, right: 96, bottom: 34, left: 46 };
const SEGMENT_SAMPLES = 28;
const SERIES: { key: SweepKey; name: string; color: string; dash?: string }[] =
  [
    { key: "kiban-group", name: "kiban", color: "#ffe24a" },
    { key: "rocksdb", name: "RocksDB", color: "#4f9dff" },
    { key: "sqlite", name: "SQLite", color: "#3ed6b0" },
    {
      key: "kiban-sync",
      name: "kiban, ungrouped",
      color: "#b59a2e",
      dash: "6 6",
    },
  ];
const TOP =
  Math.ceil(
    Math.max(
      ...SERIES.flatMap(({ key }) => sweep.series[key].map((p) => p.ops)),
    ) / 5000,
  ) * 5000;
const TICKS = Array.from({ length: TOP / 5000 + 1 }, (_, i) => i * 5000);

/** Monotone cubic through the measured points, so a curve never invents a peak. */
function curve(values: number[]) {
  const slopes = values.slice(1).map((v, i) => v - values[i]);
  const tangents = values.map((_, i) => {
    if (i === 0) return slopes[0];
    if (i === values.length - 1) return slopes[i - 1];
    const [a, b] = [slopes[i - 1], slopes[i]];
    return a * b <= 0 ? 0 : (2 * a * b) / (a + b);
  });
  return (pos: number) => {
    const i = Math.min(values.length - 2, Math.floor(pos));
    const t = pos - i;
    const [t2, t3] = [t * t, t * t * t];
    return (
      (2 * t3 - 3 * t2 + 1) * values[i] +
      (t3 - 2 * t2 + t) * tangents[i] +
      (-2 * t3 + 3 * t2) * values[i + 1] +
      (t3 - t2) * tangents[i + 1]
    );
  };
}

const CURVES = Object.fromEntries(
  SERIES.map(({ key }) => [key, curve(sweep.series[key].map((p) => p.ops))]),
) as Record<SweepKey, (pos: number) => number>;

function Chart({
  pos,
  stop,
  onDrag,
  onRelease,
  onSeek,
  onToggle,
}: {
  pos: number;
  stop: number;
  onDrag: (pos: number) => void;
  onRelease: () => void;
  onSeek: (stop: number) => void;
  onToggle: () => void;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const dragging = useRef(false);
  const inner = Math.max(120, width - PAD.left - PAD.right);
  const fx = (p: number) => PAD.left + (p / LAST) * inner;
  const fy = (ops: number) =>
    PAD.top + (1 - ops / TOP) * (HEIGHT - PAD.top - PAD.bottom);
  const base = HEIGHT - PAD.bottom;
  const paths = useMemo(() => {
    const out = {} as Record<SweepKey, string>;
    for (const { key } of SERIES) {
      const parts: string[] = [];
      for (let i = 0; i <= LAST * SEGMENT_SAMPLES; i++) {
        const p = i / SEGMENT_SAMPLES;
        parts.push(`${fx(p).toFixed(1)},${fy(CURVES[key](p)).toFixed(1)}`);
      }
      out[key] = `M${parts.join(" L")}`;
    }
    return out;
    // fx and fy only change with the measured width.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width]);

  const seek = (clientX: number, el: Element) => {
    const rect = el.getBoundingClientRect();
    onDrag(
      Math.min(
        LAST,
        Math.max(0, ((clientX - rect.left - PAD.left) / inner) * LAST),
      ),
    );
  };

  return (
    <div
      ref={ref}
      className="sw-plot"
      tabIndex={0}
      role="slider"
      aria-label="Number of concurrent writers"
      aria-valuemin={sweep.writers[0]}
      aria-valuemax={sweep.writers[LAST]}
      aria-valuenow={sweep.writers[stop]}
      aria-valuetext={`${sweep.writers[stop]} writers. ${SERIES.map(
        ({ key, name }) =>
          `${name}: ${fmtFull(sweep.series[key][stop].ops)} writes per second`,
      ).join("; ")}.`}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") onSeek(Math.min(LAST, stop + 1));
        if (e.key === "ArrowLeft") onSeek(Math.max(0, stop - 1));
        if (e.key === "Home") onSeek(0);
        if (e.key === "End") onSeek(LAST);
        if (e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
      onPointerDown={(e) => {
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        seek(e.clientX, e.currentTarget);
      }}
      onPointerMove={(e) =>
        dragging.current && seek(e.clientX, e.currentTarget)
      }
      onPointerUp={() => {
        dragging.current = false;
        onRelease();
      }}
    >
      {width > 0 && (
        <svg width={width} height={HEIGHT} aria-hidden="true">
          <defs>
            <FillPattern
              id="sw-kiban"
              fill="gradient"
              color="#ffe24a"
              level={0.34}
              floor={0}
              ramp={{ edge: "top", at: PAD.top, length: base - PAD.top }}
            />
            <clipPath id="sw-played">
              <rect x={0} y={0} width={fx(pos)} height={HEIGHT} />
            </clipPath>
          </defs>
          {TICKS.map((tick) => (
            <g key={tick}>
              <line
                className="sw-grid"
                x1={PAD.left}
                x2={PAD.left + inner}
                y1={fy(tick)}
                y2={fy(tick)}
              />
              <text
                className="sw-tick"
                x={PAD.left - 10}
                y={fy(tick) + 4}
                textAnchor="end"
              >
                {tick ? fmtOps(tick) : "0"}
              </text>
            </g>
          ))}
          {sweep.writers.map((writers, i) => (
            <text
              key={writers}
              className="sw-tick"
              data-on={i === stop || undefined}
              x={fx(i)}
              y={HEIGHT - 10}
              textAnchor="middle"
            >
              {writers}
            </text>
          ))}
          {SERIES.map(({ key, color, dash }) => (
            <path
              key={key}
              className="sw-ghost"
              d={paths[key]}
              stroke={color}
              strokeDasharray={dash}
            />
          ))}
          <g clipPath="url(#sw-played)">
            <path
              d={`${paths["kiban-group"]} L${fx(LAST)},${base} L${fx(0)},${base} Z`}
              fill="url(#sw-kiban)"
            />
            {SERIES.toReversed().map(({ key, color, dash }) => (
              <path
                key={key}
                className="sw-line"
                d={paths[key]}
                stroke={color}
                strokeDasharray={dash}
                data-lead={key === "kiban-group" || undefined}
              />
            ))}
          </g>
          <line
            className="sw-cursor"
            x1={fx(pos)}
            x2={fx(pos)}
            y1={PAD.top}
            y2={base}
          />
          {SERIES.toReversed().map(({ key, color }) => (
            <circle
              key={key}
              className="sw-head"
              cx={fx(pos)}
              cy={fy(CURVES[key](pos))}
              r={key === "kiban-group" ? 5 : 4}
              fill={color}
            />
          ))}
          {SERIES.slice(0, 2).map(({ key, name, color }) => (
            <g key={key} className="sw-end">
              <line
                x1={fx(LAST) + 8}
                x2={fx(LAST) + 20}
                y1={fy(sweep.series[key][LAST].ops)}
                y2={fy(sweep.series[key][LAST].ops)}
                stroke={color}
              />
              <text x={fx(LAST) + 26} y={fy(sweep.series[key][LAST].ops) + 4}>
                {name}
              </text>
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}

export function Sweep() {
  const [pos, setPos] = useState(LAST);
  const [playing, setPlaying] = useState(false);
  const position = useRef(LAST);
  const target = useRef(LAST);
  const frame = useRef(0);
  const stop = Math.round(pos);

  const glide = () => {
    cancelAnimationFrame(frame.current);
    let last = performance.now();
    const tick = (now: number) => {
      const step = (now - last) * RETURN_RATE;
      last = now;
      const gap = target.current - position.current;
      position.current =
        Math.abs(gap) <= step
          ? target.current
          : position.current + Math.sign(gap) * step;
      setPos(position.current);
      if (position.current !== target.current)
        frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const speed = LAST / SWEEP_MS;
    const tick = (now: number) => {
      position.current = Math.min(
        LAST,
        position.current + (now - last) * speed,
      );
      last = now;
      setPos(position.current);
      if (position.current >= LAST) {
        setPlaying(false);
        cue("success", { emphasis: "subtle" });
        return;
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [playing]);

  const drag = (next: number) => {
    setPlaying(false);
    cancelAnimationFrame(frame.current);
    position.current = next;
    setPos(next);
  };
  const seek = (next: number) => {
    setPlaying(false);
    target.current = next;
    glide();
  };
  const release = () => seek(Math.round(position.current));
  const toggle = () => {
    if (playing) return setPlaying(false);
    cancelAnimationFrame(frame.current);
    if (position.current >= LAST) {
      position.current = 0;
      setPos(0);
    }
    setPlaying(true);
  };

  return (
    <div className="tr">
      <div className="tr-head">
        <p className="tr-sweep-title">writes per second, every one synced</p>
        <div className="tr-controls">
          <span className="tr-clock">
            <Morph value={`${sweep.writers[stop]} writers`} />
            <small>
              <Morph value={`${stop + 1} of ${LAST + 1}`} />
            </small>
          </span>
          <button
            type="button"
            className="race-play"
            onClick={toggle}
            aria-label={playing ? "Pause sweep" : "Play sweep"}
          >
            {playing ? (
              <Pause className="icon" aria-hidden="true" />
            ) : (
              <Play className="icon" aria-hidden="true" />
            )}
            {playing ? "pause" : pos >= LAST ? "replay" : "play"}
          </button>
        </div>
      </div>

      <Chart
        pos={pos}
        stop={stop}
        onDrag={drag}
        onRelease={release}
        onSeek={seek}
        onToggle={toggle}
      />

      <div className="tr-lanes">
        {SERIES.map(({ key, name, color }) => {
          const point = sweep.series[key][stop];
          return (
            <div key={key} className="tr-lane sw-lane">
              <span className="tr-lane-name">
                <i className="key" style={{ background: color }} />
                {name}
              </span>
              <span className="tr-meter" aria-hidden="true">
                <span
                  style={{
                    width: `${(point.ops / TOP) * 100}%`,
                    background: color,
                  }}
                />
              </span>
              <span className="tr-count">
                <Morph value={fmtFull(point.ops)} />
              </span>
              <span className="tr-live">
                <Morph
                  value={`p99 ${fmtUs(point.p99)} · ${fmtFull(point.syncs)} syncs`}
                />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
