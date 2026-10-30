"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { fmtOps, fmtUs, losses } from "@/lib/kiban/bench";
import {
  at,
  comparisonEngines,
  races,
  run,
  stalls,
  type RaceId,
  type Run,
} from "@/lib/kiban/race";
import { cue } from "@/lib/kiban/sound";
import { DOT, plot } from "./braille";

// The long runs as a pinned instrument: scroll is the clock. Each chapter owns
// a slice of the scroll, and a stalled second takes far more scroll than a
// running one, so the reader sits through the stops the engine sat through.

type Chapter =
  | { kind: "race"; id: RaceId; title: string; share: number; dwell: number }
  | { kind: "bill"; title: string; share: number };

const CHAPTERS: Chapter[] = [
  { kind: "race", id: "read-100m", title: "100M reads", share: 0.3, dwell: 1 },
  {
    kind: "race",
    id: "updates-10m",
    title: "hot updates",
    share: 0.15,
    dwell: 1,
  },
  { kind: "race", id: "write-10m", title: "the stall", share: 0.4, dwell: 7 },
  { kind: "bill", title: "the bill", share: 0.15 },
];
const LINE_PX = 12;
const GUTTER = 6;
const ENGINE = Object.fromEntries(
  comparisonEngines.map(({ key, name }) => [key, name]),
);

function raceLength(id: RaceId) {
  return Math.max(run(id, "kiban").finish_s, run(id, "rocksdb").finish_s);
}

/** Inverse of a timeline where stalled seconds weigh `dwell` running ones. */
function timeAt(id: RaceId, dwell: number, progress: number) {
  const len = raceLength(id);
  const stopped = new Set(stalls(run(id, "kiban")).map((s) => Math.ceil(s)));
  const seconds = Math.ceil(len);
  const weight = (s: number) => (stopped.has(s) ? dwell : 1);
  let total = 0;
  for (let s = 1; s <= seconds; s++) total += weight(s);
  let left = progress * total;
  for (let s = 1; s <= seconds; s++) {
    if (left <= weight(s)) return Math.min(len, s - 1 + left / weight(s));
    left -= weight(s);
  }
  return len;
}

function locate(progress: number) {
  let start = 0;
  for (const chapter of CHAPTERS) {
    if (progress <= start + chapter.share || chapter === CHAPTERS.at(-1))
      return {
        chapter,
        local: Math.min(1, Math.max(0, (progress - start) / chapter.share)),
      };
    start += chapter.share;
  }
  throw new Error("unreachable");
}

function Plot({
  id,
  t,
  cols,
  rows,
}: {
  id: RaceId;
  t: number;
  cols: number;
  rows: number;
}) {
  const len = raceLength(id);
  const total = run(id, "kiban").operations;
  const W = cols * 2;
  const Hd = rows * 4;
  const dx = (s: number) => Math.round((Math.min(s, len) / len) * (W - 1));
  const dy = (ops: number) => Math.round((1 - ops / total) * (Hd - 1));
  const layer = () => new Uint8Array(cols * rows);
  const ghost = layer();
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
  for (const key of ["kiban", "rocksdb"] as const) {
    const r = run(id, key);
    plot(
      ghost,
      cols,
      Hd,
      r.points.map(([s, , done]) => [dx(s), dy(done)]),
    );
    plot(lit[key], cols, Hd, played(r));
  }
  for (let x = 0; x < W; x += 2) ghost[x >> 1] |= DOT[x & 1][0];

  const lines: ReactNode[] = [];
  for (let y = 0; y < rows; y++) {
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
      const i = y * cols + c;
      const k = lit.kiban[i];
      const r = lit.rocksdb[i];
      const [next, bits] = k
        ? ["b-kiban", k | r]
        : r
          ? ["b-rocks", r]
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
      <div key={y} className="mr-line">
        {spans}
      </div>,
    );
  }
  return <>{lines}</>;
}

export function MachineRoom() {
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const probe = useRef<HTMLSpanElement>(null);
  const [progress, setProgress] = useState(0);
  const [size, setSize] = useState({ cols: 0, rows: 0 });
  const wasStalled = useRef(false);

  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      const el = root.current;
      if (!el) return;
      const { top, height } = el.getBoundingClientRect();
      const travel = height - innerHeight;
      setProgress(Math.min(1, Math.max(0, -top / travel)));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    read();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => {
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  const { chapter, local } = locate(progress);
  const race = chapter.kind === "race" ? chapter : null;
  const inRace = race !== null;
  const t = race ? timeAt(race.id, race.dwell, local) : 0;
  const kiban = race ? at(run(race.id, "kiban"), t) : null;
  const rocks = race ? at(run(race.id, "rocksdb"), t) : null;
  const stalled = Boolean(
    kiban && !kiban.finished && kiban.rate === 0 && t > 0,
  );
  const stallList = race ? stalls(run(race.id, "kiban")) : [];
  // A sample at s covers the second before it, so a stall counts once entered.
  const stallsSoFar = stallList.filter((s) => s - 1 <= t).length;

  useLayoutEffect(() => {
    const el = stage.current;
    if (!el) return;
    const measure = () => {
      const measured = probe.current?.getBoundingClientRect().width;
      const rect = el.getBoundingClientRect();
      if (!measured || !rect.height) return;
      const ch = measured / 10;
      setSize({
        cols: Math.max(20, Math.floor(rect.width / ch) - GUTTER),
        rows: Math.max(8, Math.floor(rect.height / LINE_PX)),
      });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [inRace]);

  useEffect(() => {
    if (stalled && !wasStalled.current) cue("error", { emphasis: "subtle" });
    wasStalled.current = stalled;
  }, [stalled]);

  return (
    <div ref={root} className="mr" data-stalled={stalled || undefined}>
      <div className="mr-pin">
        <div className="mr-grain" aria-hidden="true" />
        <div className="mr-top">
          <span>
            <span className="mr-accent">machine room</span> · scroll is the
            clock
          </span>
          {race && (
            <span>
              {races.find((r) => r.id === race.id)?.label} ·{" "}
              <b>t + {t.toFixed(1)} s</b>
            </span>
          )}
        </div>

        <nav className="mr-rail" aria-hidden="true">
          {CHAPTERS.map((c) => (
            <span key={c.title} data-on={c === chapter || undefined}>
              {c.title}
            </span>
          ))}
        </nav>

        {race && kiban && rocks ? (
          <>
            <div ref={stage} className="mr-stage" aria-hidden="true">
              <span ref={probe} className="tr-probe">
                ⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
              </span>
              {size.cols > 0 && (
                <Plot id={race.id} t={t} cols={size.cols} rows={size.rows} />
              )}
            </div>
            <div className="mr-foot">
              {stalled ? (
                <div className="mr-stop">
                  <p className="mr-zero">0 ops/s</p>
                  <p className="mr-why">
                    kiban stopped. Writers are blocked while background
                    maintenance catches up.
                  </p>
                </div>
              ) : (
                <div className="mr-lead">
                  <span className="mr-name">
                    <i className="key key-kiban" />
                    {ENGINE.kiban}
                  </span>
                  <b>{Math.round(kiban.done).toLocaleString("en")}</b>
                  <span className="mr-rate">
                    {kiban.finished
                      ? "finished"
                      : `${fmtOps(kiban.rate)} ops/s`}
                    {!kiban.finished && kiban.p99 !== null
                      ? ` · p99 ${fmtUs(kiban.p99)}`
                      : ""}
                  </span>
                </div>
              )}
              <div className="mr-rival">
                <span className="mr-name">
                  <i className="key key-rocks" />
                  {ENGINE.rocksdb}
                </span>
                <b>{Math.round(rocks.done).toLocaleString("en")}</b>
                <span className="mr-rate">
                  {rocks.finished ? "finished" : `${fmtOps(rocks.rate)} ops/s`}
                </span>
              </div>
              {stallList.length > 0 && (
                <div className="mr-ticks">
                  <span className="mr-rate">
                    {stallsSoFar} of {stallList.length} stalls
                  </span>
                  <span aria-hidden="true">
                    {stallList.map((s) => (
                      <i key={s} data-hit={s - 1 <= t || undefined} />
                    ))}
                  </span>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="mr-bill">
            <p className="mr-bill-title">
              the <span className="px">bill.</span>
            </p>
            <dl>
              {losses.map(({ key, clause }) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd>{clause}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
