"use client";

import { Pause, Play } from "pixelarticons/react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  fmtFull,
  fmtOps,
  fmtUs,
  sweep,
  type SweepKey,
} from "@/lib/kiban/bench";
import { cue } from "@/lib/kiban/sound";
import { plot } from "./braille";
import { useWidth } from "./use-width";

// Durable throughput as writers double, in the replay's terminal readout. The
// plot stops at measured points only: nothing is interpolated between them.

const STEP_MS = 900;
const GUTTER = 6;
const SERIES: { key: SweepKey; name: string; cls: string; lane: string }[] = [
  { key: "kiban-group", name: "kiban", cls: "b-kiban", lane: "lane-kiban" },
  { key: "rocksdb", name: "RocksDB", cls: "b-rocks", lane: "" },
  { key: "kiban-sync", name: "kiban, ungrouped", cls: "b-finish", lane: "" },
  { key: "sqlite", name: "SQLite", cls: "b-finish", lane: "" },
];
const LAST = sweep.writers.length - 1;
const CEILING = Math.max(
  ...SERIES.flatMap(({ key }) => sweep.series[key].map((p) => p.ops)),
);

function Readout({
  stop,
  onSeek,
  onToggle,
}: {
  stop: number;
  onSeek: (stop: number) => void;
  onToggle: () => void;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const probe = useRef<HTMLSpanElement>(null);
  const dragging = useRef(false);
  const [ch, setCh] = useState(8);
  useLayoutEffect(() => {
    if (probe.current) setCh(probe.current.getBoundingClientRect().width / 10);
  }, [width]);

  const cols = Math.max(20, Math.floor(width / ch) - GUTTER);
  const rows = width < 640 ? 12 : 18;
  const W = cols * 2;
  const Hd = rows * 4;
  const dx = (i: number) => Math.round((i / LAST) * (W - 1));
  const dy = (ops: number) => Math.round((1 - ops / CEILING) * (Hd - 1));

  const layer = () => new Uint8Array(cols * rows);
  const ghost = layer();
  const lit = SERIES.map(layer);
  SERIES.forEach(({ key }, s) => {
    const pts = sweep.series[key].map((p, i): [number, number] => [
      dx(i),
      dy(p.ops),
    ]);
    plot(ghost, cols, Hd, pts);
    plot(lit[s], cols, Hd, pts.slice(0, stop + 1));
  });

  const yLabels = new Map<number, string>([
    [0, fmtOps(CEILING)],
    [Math.round((rows - 1) / 2), fmtOps(CEILING / 2)],
    [rows - 1, "0"],
  ]);

  const lines: ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    const label = yLabels.get(r);
    const spans: ReactNode[] = [];
    let cls = "";
    let text = "";
    const flush = () => {
      if (text)
        spans.push(
          <span key={spans.length} className={cls || undefined}>
            {text}
          </span>,
        );
      text = "";
    };
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const s = lit.findIndex((bits) => bits[i]);
      const [next, bits] =
        s >= 0
          ? [SERIES[s].cls, lit[s][i]]
          : ghost[i]
            ? ["b-ghost", ghost[i]]
            : ["", 0];
      if (next !== cls) {
        flush();
        cls = next;
      }
      text += bits ? String.fromCharCode(0x2800 + bits) : " ";
    }
    flush();
    lines.push(
      <div key={r} className="tr-row">
        <span className="tr-gutter">
          {(label ?? "").padStart(GUTTER - 1)}
          {label ? "┤" : "│"}
        </span>
        {spans}
      </div>,
    );
  }

  const axis: string[] = Array(cols).fill(" ");
  sweep.writers.forEach((writers, i) => {
    const label = String(writers);
    const anchor = dx(i) >> 1;
    const start = Math.min(cols - label.length, anchor);
    for (let c = 0; c < label.length; c++) axis[start + c] = label[c];
  });
  const marker: string[] = Array(cols).fill(" ");
  marker[Math.min(cols - 1, dx(stop) >> 1)] = "▲";

  const seek = (clientX: number, el: Element) => {
    const rect = el.getBoundingClientRect();
    const col = (clientX - rect.left) / ch - GUTTER;
    onSeek(Math.min(LAST, Math.max(0, Math.round((col / cols) * LAST))));
  };

  return (
    <div
      ref={ref}
      className="tr-plot"
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
      onPointerUp={() => (dragging.current = false)}
    >
      <span ref={probe} className="tr-probe" aria-hidden="true">
        ⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
      </span>
      {width > 0 && (
        <div className="tr-grid" aria-hidden="true">
          {lines}
          <div className="tr-row">
            <span className="tr-gutter">{" ".repeat(GUTTER - 1)}└</span>
            <span className="b-axis">{"─".repeat(cols)}</span>
          </div>
          <div className="tr-row">
            <span className="tr-gutter">{" ".repeat(GUTTER)}</span>
            <span className="b-axis-label">{axis.join("")}</span>
          </div>
          <div className="tr-row">
            <span className="tr-gutter">{" ".repeat(GUTTER)}</span>
            <span className="b-kiban">{marker.join("")}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function Sweep() {
  const [stop, setStop] = useState(LAST);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => {
      if (stop >= LAST) return;
      const next = stop + 1;
      setStop(next);
      if (next === LAST) {
        setPlaying(false);
        cue("success", { emphasis: "subtle" });
      }
    }, STEP_MS);
    return () => clearTimeout(timer);
  }, [playing, stop]);

  const seek = (next: number) => {
    setPlaying(false);
    setStop(next);
  };
  const toggle = () => {
    if (playing) return setPlaying(false);
    if (stop >= LAST) setStop(0);
    setPlaying(true);
  };

  return (
    <div className="tr">
      <div className="tr-head">
        <p className="tr-sweep-title">writes per second, every one synced</p>
        <div className="tr-controls">
          <span className="tr-clock">
            {sweep.writers[stop]} writers
            <small>
              {stop + 1} of {LAST + 1}
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
            {playing ? "pause" : stop >= LAST ? "replay" : "play"}
          </button>
        </div>
      </div>

      <Readout stop={stop} onSeek={seek} onToggle={toggle} />

      <div className="tr-lanes">
        {SERIES.map(({ key, name, lane }) => {
          const point = sweep.series[key][stop];
          return (
            <div key={key} className={`tr-lane ${lane}`}>
              <span className="tr-lane-name">
                <i
                  className={`key ${key === "kiban-group" ? "key-kiban" : "key-rocks"}`}
                />
                {name}
              </span>
              <span className="tr-meter" aria-hidden="true">
                <span style={{ width: `${(point.ops / CEILING) * 100}%` }} />
              </span>
              <span className="tr-count">{fmtFull(point.ops)}</span>
              <span className="tr-live">
                p99 {fmtUs(point.p99)} · {fmtFull(point.syncs)} syncs
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
