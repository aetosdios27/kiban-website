// Replays of the long comparison runs, one-second samples from each engine's
// median trial (generated into race-data.json by scripts/bench-data.py).

import raw from "./race-data.json";

/** [elapsed seconds, ops/s over that second, operations done, p99 µs]. */
type Point = [number, number, number, number | null];
export type Run = {
  trial: string;
  finish_s: number;
  operations: number;
  points: Point[];
};
export type Engine = "kiban" | "rocksdb";
export const comparisonEngines: { key: Engine; name: string }[] = [
  { key: "kiban", name: "kiban v0.1.0" },
  { key: "rocksdb", name: "RocksDB 11.8.1" },
];

const data = raw as unknown as Record<string, Record<Engine, Run>>;

export const races = [
  {
    id: "read-100m",
    label: "100M reads",
    detail: "100k hot keys within 1M, four threads",
    note: "The gap held in all three trials. Its cause has not been isolated.",
  },
  {
    id: "updates-10m",
    label: "10M hot updates",
    detail: "10k hot keys within 100k, four threads",
    note: "On a small hot set, RocksDB finishes in about a third of the time.",
  },
  {
    id: "write-10m",
    label: "10M random writes",
    detail: "1M-key working set, four threads",
    note: "In those seconds its writers are blocked while background maintenance catches up.",
  },
] as const;

export type RaceId = (typeof races)[number]["id"];

export const run = (id: RaceId, engine: Engine): Run => data[id][engine];

export const raceLength = (id: RaceId) =>
  Math.max(run(id, "kiban").finish_s, run(id, "rocksdb").finish_s);

/** Where a run stands at time t: operations done, this second's rate and p99. */
export function at(r: Run, t: number) {
  const pts = r.points;
  if (t >= r.finish_s) {
    const last = pts[pts.length - 1];
    return { done: r.operations, rate: last[1], p99: last[3], finished: true };
  }
  let i = 1;
  while (i < pts.length - 1 && pts[i][0] < t) i++;
  const [t0, , d0] = pts[i - 1];
  const [t1, rate, d1, p99] = pts[i];
  const f = t1 > t0 ? Math.min(1, Math.max(0, (t - t0) / (t1 - t0))) : 1;
  return { done: Math.round(d0 + (d1 - d0) * f), rate, p99, finished: false };
}

export function fmtDuration(s: number) {
  if (s < 60) return `${s.toFixed(1)} s`;
  const m = Math.floor(s / 60);
  return `${m} min ${Math.round(s - m * 60)} s`;
}

/** Seconds in which a run completed no operations at all. */
export const stalls = (r: Run) =>
  r.points.filter(([t, rate]) => t > 0 && rate === 0).map(([t]) => t);
