"use client";

import { Pause, Play } from "pixelarticons/react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { fmtOps, fmtUs } from "@/lib/kiban/bench";
import {
  at,
  comparisonEngines,
  fmtDuration,
  raceLength,
  races,
  run,
  stalls,
  type Engine,
  type RaceId,
  type Run,
} from "@/lib/kiban/race";
import { cue } from "@/lib/kiban/sound";
import { DOT, plot } from "./braille";
import { useWidth } from "./use-width";

// The long runs, replayed as a terminal readout: operations completed over
// time, plotted in braille dots (2 x 4 per character), each engine's median
// trial. Still until you press play or scrub; a race plays back in ~12 s.

const PLAYBACK_S = 12;
const GUTTER = 6; // y labels, then the axis character
const ENGINES = comparisonEngines;
const full = new Intl.NumberFormat("en");

function winner(id: RaceId) {
  const k = run(id, "kiban").finish_s;
  const r = run(id, "rocksdb").finish_s;
  return k < r
    ? { who: "kiban", key: "kiban" as Engine, by: r - k }
    : { who: "RocksDB", key: "rocksdb" as Engine, by: k - r };
}

// ----------------------------------------------------------------- plot --

function Readout({
  id,
  t,
  onSeek,
  onToggle,
}: {
  id: RaceId;
  t: number;
  onSeek: (t: number) => void;
  onToggle: () => void;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const probe = useRef<HTMLSpanElement>(null);
  const dragging = useRef(false);
  const [ch, setCh] = useState(8);
  useLayoutEffect(() => {
    // One braille cell's width, measured in the plot's own font.
    if (probe.current) setCh(probe.current.getBoundingClientRect().width / 10);
  }, [width]);

  const len = raceLength(id);
  const total = run(id, "kiban").operations;
  const cols = Math.max(20, Math.floor(width / ch) - GUTTER);
  const rows = width < 640 ? 12 : 18;
  const W = cols * 2;
  const Hd = rows * 4;
  const dx = (s: number) => Math.round((Math.min(s, len) / len) * (W - 1));
  const dy = (ops: number) => Math.round((1 - ops / total) * (Hd - 1));

  // Layers: the full runs (ghost), the finish line, each engine up to t.
  const layer = () => new Uint8Array(cols * rows);
  const ghost = layer();
  const finish = layer();
  const lit = { kiban: layer(), rocksdb: layer() };
  const played = (r: Run): [number, number][] => {
    const out: [number, number][] = [];
    for (const [s, , done] of r.points) {
      if (s > t) break;
      out.push([dx(s), dy(done)]);
    }
    if (t < r.finish_s) out.push([dx(t), dy(at(r, t).done)]);
    return out;
  };
  for (const { key } of ENGINES) {
    const r = run(id, key);
    plot(
      ghost,
      cols,
      Hd,
      r.points.map(([s, , done]) => [dx(s), dy(done)]),
    );
    plot(lit[key], cols, Hd, played(r));
  }
  for (let x = 0; x < W; x += 2) finish[x >> 1] |= DOT[x & 1][0];

  const yLabels = new Map<number, string>([
    [0, fmtOps(total)],
    [Math.round((rows - 1) / 2), fmtOps(total / 2)],
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
      const k = lit.kiban[i];
      const rk = lit.rocksdb[i];
      let next = "";
      let bits = 0;
      if (k) [next, bits] = ["b-kiban", k | rk];
      else if (rk) [next, bits] = ["b-rocks", rk];
      else if (ghost[i]) [next, bits] = ["b-ghost", ghost[i] | finish[i]];
      else if (finish[i]) [next, bits] = ["b-finish", finish[i]];
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

  // Time labels on the same character grid as the plot.
  const timeRow: string[] = Array(cols).fill(" ");
  for (const f of width < 640 ? [0, 0.5, 1] : [0, 0.25, 0.5, 0.75, 1]) {
    const label = `${Math.round(f * len)} s`;
    const anchor = Math.round(f * (cols - 1));
    const start =
      f === 0
        ? 0
        : f === 1
          ? cols - label.length
          : anchor - Math.floor(label.length / 2);
    for (let i = 0; i < label.length; i++) timeRow[start + i] = label[i];
  }

  const stalled = stalls(run(id, "kiban"));
  const stallCells = new Map<number, boolean>();
  for (const s of stalled)
    stallCells.set(Math.min(cols - 1, dx(s) >> 1), t >= s);

  const seek = (clientX: number, el: Element) => {
    const rect = el.getBoundingClientRect();
    const col = (clientX - rect.left) / ch - GUTTER;
    onSeek(Math.min(len, Math.max(0, (col / cols) * len)));
  };

  return (
    <div
      ref={ref}
      className="tr-plot"
      tabIndex={0}
      role="slider"
      aria-label="Replay position"
      aria-valuemin={0}
      aria-valuemax={Math.round(len)}
      aria-valuenow={Math.round(t)}
      aria-valuetext={`${t.toFixed(1)} seconds. ${ENGINES.map(
        ({ key, name }) =>
          `${name}: ${full.format(at(run(id, key), t).done)} operations`,
      ).join("; ")}.`}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") onSeek(Math.min(len, t + len / 40));
        if (e.key === "ArrowLeft") onSeek(Math.max(0, t - len / 40));
        if (e.key === "Home") onSeek(0);
        if (e.key === "End") onSeek(len);
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
            <span className="b-axis-label">{timeRow.join("")}</span>
          </div>
          {stalled.length > 0 && (
            <div className="tr-row">
              <span className="tr-gutter">{"stall".padStart(GUTTER - 1)} </span>
              {Array.from({ length: cols }, (_, c) =>
                stallCells.has(c) ? (
                  <span
                    key={c}
                    className={stallCells.get(c) ? "b-stall-hit" : "b-stall"}
                  >
                    ▮
                  </span>
                ) : (
                  " "
                ),
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ race --

export function Race() {
  const [id, setId] = useState<RaceId>("read-100m");
  const len = raceLength(id);
  const [t, setT] = useState(len);
  const [playing, setPlaying] = useState(false);
  // The loop advances this ref; state only mirrors it for rendering, so
  // side effects (the finish sound) never run inside a state updater.
  const pos = useRef(len);
  const frame = useRef(0);

  const moveTo = useCallback((s: number) => {
    pos.current = s;
    setT(s);
  }, []);
  const stop = useCallback(() => {
    cancelAnimationFrame(frame.current);
    setPlaying(false);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const speed = len / PLAYBACK_S;
    let last = performance.now();
    const tick = (now: number) => {
      const next = Math.min(len, pos.current + ((now - last) / 1000) * speed);
      last = now;
      moveTo(next);
      if (next >= len) {
        setPlaying(false);
        cue("success", { emphasis: "subtle" });
        return;
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [playing, len, moveTo]);

  const choose = (next: RaceId) => {
    stop();
    setId(next);
    moveTo(raceLength(next));
  };
  const toggle = () => {
    if (playing) return stop();
    if (pos.current >= len) moveTo(0);
    setPlaying(true);
  };
  const seek = (s: number) => {
    stop();
    moveTo(s);
  };

  const race = races.find((r) => r.id === id)!;
  const result = winner(id);
  const stalled = stalls(run(id, "kiban")).length;

  return (
    <div className="tr">
      <div className="tr-head">
        <div className="tr-picks" role="radiogroup" aria-label="Race">
          {races.map((r) => (
            <button
              key={r.id}
              type="button"
              role="radio"
              aria-checked={r.id === id}
              className="tr-pick"
              onClick={() => r.id !== id && choose(r.id)}
              data-cuelume-select
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="tr-controls">
          <span className="tr-clock">
            t + {t.toFixed(1)} s
            <small>{Math.round(len / PLAYBACK_S)}× speed</small>
          </span>
          <button
            type="button"
            className="race-play"
            onClick={toggle}
            aria-label={playing ? "Pause replay" : "Play replay"}
          >
            {playing ? (
              <Pause className="icon" aria-hidden="true" />
            ) : (
              <Play className="icon" aria-hidden="true" />
            )}
            {playing ? "pause" : t >= len ? "replay" : "play"}
          </button>
        </div>
      </div>

      <p className="tr-meta">
        {race.detail}. Operations completed over time; the finish line is{" "}
        {fmtOps(run(id, "kiban").operations)}.
      </p>

      <Readout id={id} t={t} onSeek={seek} onToggle={toggle} />

      <div className="tr-lanes">
        {ENGINES.map(({ key, name }) => {
          const r = run(id, key);
          const s = at(r, t);
          const won = s.finished && key === result.key;
          return (
            <div key={key} className={`tr-lane lane-${key}`}>
              <span className="tr-lane-name">
                <i
                  className={`key key-${key === "kiban" ? "kiban" : "rocks"}`}
                />
                {name}
              </span>
              <span className="tr-meter" aria-hidden="true">
                <span style={{ width: `${(s.done / r.operations) * 100}%` }} />
              </span>
              <span className="tr-count">{full.format(s.done)}</span>
              <span className="tr-live">
                {s.finished ? (
                  <b data-won={won || undefined}>
                    {won ? "first, " : "done, "}
                    {fmtDuration(r.finish_s)}
                  </b>
                ) : t > 0 ? (
                  <>
                    {fmtOps(s.rate)} ops/s
                    {s.p99 !== null && <> · p99 {fmtUs(s.p99)}</>}
                  </>
                ) : (
                  "ready"
                )}
              </span>
            </div>
          );
        })}
      </div>

      <p className="tr-caption">
        <span>
          {result.who} finished {fmtDuration(result.by)} ahead.
        </span>{" "}
        {stalled > 0 &&
          `kiban stalled for ${stalled} separate seconds with no completed writes. `}
        {race.note}
      </p>
    </div>
  );
}
