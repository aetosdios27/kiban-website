// kiban v0.1.0 against RocksDB 11.8.1. The numbers come from
// bench-data.json, generated from the engine's raw comparison results by
// scripts/bench-data.py: medians of three verified trials per engine.

import raw from "./bench-data.json";

type Spread = { median: number; min: number; max: number };
type Latency = { p50: number; p95: number; p99: number; p999: number } | null;
type Side = { ops: Spread; read: Latency; write: Latency; rss_mib: number };
type Case = { campaign: string; kiban: Side; rocksdb: Side };

const data = raw as unknown as Record<string, Case>;

export function bench(id: string): Case {
  const c = data[id];
  if (!c) throw new Error(`no benchmark case ${id}`);
  return c;
}

/** kiban throughput divided by RocksDB's; above 1 means kiban is faster. */
export const ratio = (id: string) =>
  bench(id).kiban.ops.median / bench(id).rocksdb.ops.median;

// --------------------------------------------------------------- overview --

export type Workload = { id: string; label: string; detail: string };

export const overview: { title: string; rows: Workload[] }[] = [
  {
    title: "reads",
    rows: [
      {
        id: "read-100m",
        label: "100M warm reads",
        detail: "100k hot keys within 1M",
      },
      {
        id: "random-read-1t",
        label: "cached reads, 1 thread",
        detail: "100k keys",
      },
      { id: "read-1m", label: "cached reads, 4 threads", detail: "100k keys" },
      {
        id: "random-read-64t",
        label: "cached reads, 64 threads",
        detail: "22 logical CPUs",
      },
      {
        id: "reads-cache-warm",
        label: "1M-key working set",
        detail: "136 MB, warmed",
      },
    ],
  },
  {
    title: "writes and mixed",
    rows: [
      { id: "mixed-1m", label: "50/50 mixed, 4 threads", detail: "100k keys" },
      {
        id: "sequential-1m",
        label: "sequential writes",
        detail: "1M unique keys",
      },
      { id: "updates-1m", label: "hot updates", detail: "10k hot keys" },
      {
        id: "write-sync-1",
        label: "sync after every write",
        detail: "10k writes",
      },
      {
        id: "random-write-1m",
        label: "random writes",
        detail: "into an empty database",
      },
      {
        id: "write-10m",
        label: "10M random writes",
        detail: "1M-key working set",
      },
    ],
  },
];

// ------------------------------------------------------------------ format --

const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumSignificantDigits: 3,
});
export const fmtOps = (n: number) => compact.format(n);
export const fmtFull = (n: number) => Math.round(n).toLocaleString("en");
export const fmtUs = (us: number) =>
  us >= 1000
    ? `${(us / 1000).toFixed(us >= 10_000 ? 0 : 1)} ms`
    : `${us >= 10 ? Math.round(us) : us.toFixed(us >= 1 ? 1 : 2)} µs`;
export const fmtRatio = (r: number) =>
  r >= 1 ? `${r.toFixed(r >= 10 ? 0 : 1)}×` : `${(1 / r).toFixed(1)}×`;
