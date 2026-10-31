"use client";

import { Pause, Play } from "pixelarticons/react";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
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
import { Morph } from "./morph";
import { useWidth } from "./use-width";
import { DOT, plot } from "./braille";

// Durable throughput as writers double. The line glides between measured
// points, but every number on screen is a measured value at its nearest stop.

const SWEEP_MS = 5200;
const RETURN_RATE = 0.006; // stops per millisecond when settling on a stop
const LAST = sweep.writers.length - 1;
const SEGMENT_SAMPLES = 28;
const SERIES: { key: SweepKey; name: string; color: string; dash?: string }[] =
  [
    { key: "kiban-group", name: "kiban", color: "#ffe24a" },
    { key: "rocksdb", name: "RocksDB", color: "#a3a3a3" },
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

const CURVES = (() => {
  const out = {} as Record<SweepKey, (pos: number) => number>;
  for (const { key } of SERIES) {
    const values = sweep.series[key].map((p) => p.ops);
    const slopes = values.slice(1).map((v, i) => v - values[i]);
    const tangents = values.map((_, i) => {
      if (i === 0) return slopes[0];
      if (i === values.length - 1) return slopes[i - 1];
      const [a, b] = [slopes[i - 1], slopes[i]];
      return a * b <= 0 ? 0 : (2 * a * b) / (a + b);
    });
    out[key] = (pos: number) => {
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
  return out;
})();

const GUTTER = 6;

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
  const probe = useRef<HTMLSpanElement>(null);
  const dragging = useRef(false);
  const [ch, setCh] = useState(8);
  useLayoutEffect(() => {
    const measured = probe.current?.getBoundingClientRect().width;
    if (measured) setCh(measured / 10);
  }, [width]);

  const rows = width < 640 ? 12 : 16;
  const cols = Math.max(20, Math.floor(width / ch) - GUTTER);
  const W = cols * 2;
  const Hd = rows * 4;
  const base = Hd - 1;
  const dx = (p: number) => Math.round((p / LAST) * (W - 1));
  const dy = (ops: number) => Math.round((1 - ops / TOP) * (Hd - 1));

  const layer = () => new Uint8Array(cols * rows);

  const build = useMemo(() => {
    if (width <= 0) return null;
    const g0 = layer(); // kiban
    const g1 = layer(); // rocksdb
    const g2 = layer(); // sqlite
    const g3 = layer(); // sync
    const p0 = layer();
    const p1 = layer();
    const p2 = layer();
    const p3 = layer();
    const pFill = layer();
    const cursorL = layer();

    const sampleFull = (key: SweepKey) => {
      const pts: [number, number][] = [];
      for (let i = 0; i <= LAST * SEGMENT_SAMPLES; i++) {
        const pp = i / SEGMENT_SAMPLES;
        pts.push([dx(pp), dy(CURVES[key](pp))]);
      }
      return pts;
    };
    const gArr = [g0, g1, g2, g3];
    const pLayers = [p0, p1, p2, p3];
    SERIES.forEach(({ key }, idx) => {
      plot(gArr[idx], cols, Hd, sampleFull(key));
    });

    const playedLast = Math.max(0, Math.min(LAST, pos));
    const playedSamples = Math.floor(playedLast * SEGMENT_SAMPLES);
    SERIES.forEach(({ key }, idx) => {
      const pts: [number, number][] = [];
      for (let i = 0; i <= playedSamples; i++) {
        const pp = i / SEGMENT_SAMPLES;
        pts.push([dx(pp), dy(CURVES[key](pp))]);
      }
      pts.push([dx(playedLast), dy(CURVES[key](playedLast))]);
      plot(pLayers[idx], cols, Hd, pts);
    });

    // Dithered fill under the kiban curve, up to the cursor.
    const lastX = dx(playedLast);
    for (let x = 0; x <= lastX && x < W; x++) {
      const pp = (x / (W - 1)) * LAST;
      const topY = dy(CURVES["kiban-group"](pp));
      for (let y = topY; y <= base; y++) {
        if ((x + y) % 2 === 0) {
          pFill[(y >> 2) * cols + (x >> 1)] |= DOT[x & 1][y & 3];
        }
      }
    }

    // Cursor line.
    const cx = dx(playedLast);
    for (let y = 0; y <= base; y++) {
      cursorL[(y >> 2) * cols + (cx >> 1)] |= DOT[cx & 1][y & 3];
    }

    const ghostCombined = new Uint8Array(cols * rows);
    for (let i = 0; i < cols * rows; i++) {
      ghostCombined[i] = g0[i] | g1[i] | g2[i] | g3[i];
    }

    return {
      pLayers,
      pFill,
      cursorL,
      ghostCombined,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, pos]);

  const seek = (clientX: number, el: Element) => {
    const rect = el.getBoundingClientRect();
    const col = (clientX - rect.left) / ch - GUTTER;
    const p = Math.min(LAST, Math.max(0, (col / cols) * LAST));
    onDrag(p);
  };

  if (width <= 0 || !build) {
    return (
      <div ref={ref} className="sw-plot" aria-hidden="true">
        <span ref={probe} className="tr-probe" aria-hidden="true">
          ⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
        </span>
      </div>
    );
  }

  const { pLayers, pFill, cursorL, ghostCombined } = build;

  const yLabels = new Map<number, string>([
    [0, fmtOps(TOP)],
    [Math.round((rows - 1) / 2), fmtOps(Math.round(TOP / 2))],
    [rows - 1, "0"],
  ]);

  // X (writer) labels.
  const timeRow: string[] = Array(cols).fill(" ");
  const writerLabels = sweep.writers.map((w, i) => ({ w, col: Math.round((i / LAST) * (cols - 1)) }));
  for (const { w, col } of writerLabels) {
    const label = String(w);
    const start = Math.max(0, Math.min(cols - label.length, col - Math.floor(label.length / 2)));
    for (let i = 0; i < label.length; i++) timeRow[start + i] = label[i];
  }

  const lines: ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
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
      let next = "";
      let bits = 0;
      if (pLayers[0][i]) {
        next = "b-kiban";
        bits = pLayers[0][i] | pFill[i];
      } else if (pLayers[1][i]) {
        next = "b-rocks";
        bits = pLayers[1][i];
      } else if (pLayers[2][i]) {
        next = "b-sqlite";
        bits = pLayers[2][i];
      } else if (pLayers[3][i]) {
        next = "b-sync";
        bits = pLayers[3][i];
      } else if (pFill[i]) {
        next = "b-fill";
        bits = pFill[i];
      } else if (ghostCombined[i]) {
        next = "b-ghost";
        bits = ghostCombined[i];
      } else if (cursorL[i]) {
        next = "b-cursor";
        bits = cursorL[i];
      }
      if (next !== cls) {
        flush();
        cls = next;
      }
      text += bits ? String.fromCharCode(0x2800 + bits) : " ";
    }
    flush();
    const label = yLabels.get(r);
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
        </div>
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