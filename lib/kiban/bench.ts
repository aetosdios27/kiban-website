// The site-refresh campaign: kiban at one commit against tuned RocksDB, SQLite
// and LMDB. The numbers come from bench-data.json, generated from the engine's
// raw results by scripts/bench-data.py. Ratios are medians of same-trial
// ratios, stored rather than derived, and above 1 means kiban is faster.

import raw from "./bench-data.json";

export type Rival = "rocksdb" | "sqlite" | "lmdb";
export type Comparison = {
  ratio: number;
  min: number;
  max: number;
  trials: number;
  /** One [kiban, rival] pair per trial, in the row's unit. */
  runs: [number, number][];
};
type Latency = { p50: number; p99: number };
type Throughput = { ops: number; p99: number };
type RivalCell<T> = T & Comparison;
export type Row =
  | {
      id: string;
      group: string;
      label: string;
      detail: string;
      source: string;
      kiban: Latency;
      rivals: Partial<Record<Rival, RivalCell<Latency>>>;
    }
  | {
      id: string;
      group: string;
      label: string;
      detail: string;
      source: string;
      kiban: Throughput;
      rivals: Partial<Record<Rival, RivalCell<Throughput>>>;
    };
type SweepPoint = { ops: number; p99: number; syncs: number };
export type SweepKey = "kiban-group" | "kiban-sync" | "rocksdb" | "sqlite";

const data = raw as unknown as {
  commit: string;
  rows: Row[];
  sweep: { writers: number[]; series: Record<SweepKey, SweepPoint[]> };
  resources: Record<"kiban" | Rival, { rss_mib: number; disk_mib: number }>;
};

export const benchCommit = data.commit;
export const benchRef = data.commit.slice(0, 7);
export const rows = data.rows;
export const sweep = data.sweep;
export const resources = data.resources;

export const rivals: { key: Rival; name: string; pick: string }[] = [
  { key: "rocksdb", name: "RocksDB", pick: "RocksDB, tuned" },
  { key: "sqlite", name: "SQLite", pick: "SQLite, mmap" },
  { key: "lmdb", name: "LMDB", pick: "LMDB" },
];

export const groups = [...new Set(rows.map((row) => row.group))];

/** A gap that changes sign between trials is not a gap. */
export const isEven = ({ min, max }: Comparison) => min <= 1 && max >= 1;

export const isThroughput = (
  row: Row,
): row is Extract<Row, { kiban: Throughput }> => "ops" in row.kiban;

function row(id: string) {
  const found = rows.find((r) => r.id === id);
  if (!found) throw new Error(`no benchmark row ${id}`);
  return found;
}

const comparison = (id: string, rival: Rival): Comparison => {
  const cell = row(id).rivals[rival];
  if (!cell) throw new Error(`no ${rival} result for ${id}`);
  return cell;
};

const sixteen = (key: SweepKey) => sweep.series[key].at(-1)!;

// ------------------------------------------------------------------- copy --

export const BENCHMARK = {
  introduction: `One agent-memory workload on four engines at kiban commit ${benchRef}: warm cache, one worker, every result checked. kiban leads warm reads, keeps pace on durable writes, and gives up disk and memory to do it.`,
  caption:
    "Median latency or throughput of kiban and the selected engine per workload, with p99 and the paired ratio between them.",
  context: `One shared laptop on mains power: Intel Core Ultra 9 185H, NVMe behind LUKS, Linux 7.2. A memory record is a JSON value with 200 bytes of text, across 64 agents. Reads ran on one pinned core, five rotated trials per engine. kiban ran with its agent_memory settings, RocksDB with the winner of its published screen, and SQLite with its fastest read row. These runs are unreleased main, not v0.1.0, and say nothing about larger-than-memory or cold-storage performance.`,
  url: "/library/the-field",
  archiveLabel: "The v0.1.0 throughput comparison",
  archiveUrl: "/library/v0-1-comparison",
};

export const RECEIPT = {
  host: "Core Ultra 9 185H, mains, performance profile, shared",
  rerun: {
    latency: "taskset -c 12-21 python3 validation/site-refresh/campaign.py",
    throughput: "python3 validation/site-refresh/group_commit.py",
  },
};

export const headlines = [
  {
    value: fmtRatio(comparison("point", "rocksdb").ratio),
    label: "Faster point reads than tuned RocksDB",
  },
  {
    value: fmtRatio(comparison("latest", "rocksdb").ratio),
    label: "Faster latest-ten reads than tuned RocksDB",
  },
  {
    value: fmtRatio(comparison("latest", "sqlite").ratio),
    label: "Faster latest-ten reads than SQLite with mmap",
  },
  {
    value: fmtRatio(comparison("point", "lmdb").ratio),
    label: "Faster point reads than LMDB",
  },
  {
    value: fmtRatio(sixteen("kiban-group").ops / sixteen("kiban-sync").ops),
    label: "More durable writes with group commit, at 16 writers",
  },
  {
    value: `1/${Math.round(sixteen("kiban-sync").syncs / sixteen("kiban-group").syncs)}`,
    label: "The syncs for the same durable writes, at 16 writers",
  },
];

const losing = comparison("latest-32", "lmdb");

export const losses = [
  {
    key: "memory",
    clause: `${resources.kiban.rss_mib} MiB peak RSS, RocksDB ${resources.rocksdb.rss_mib}, SQLite ${resources.sqlite.rss_mib}`,
  },
  {
    key: "disk",
    clause: `${resources.kiban.disk_mib} MiB for 1M records, RocksDB ${resources.rocksdb.disk_mib}, SQLite ${resources.sqlite.disk_mib}`,
  },
  {
    key: "latest ten, small cache",
    clause: `LMDB is ${fmtRatio(losing.ratio)} faster at 32 MiB`,
  },
  {
    key: "point read, no mmap",
    clause: "behind LMDB at 32 MiB unless mmap is on",
  },
  {
    key: "sustained writes",
    clause: "RocksDB finishes the long write runs about 3× sooner",
  },
  {
    key: "point index, tiny cache",
    clause: "halves 100M reads at 33 MiB: 1.7M ops/s, 3.8M with it off",
  },
  {
    key: "flush and compaction",
    clause: "1.36× and 1.26× slower with the point index",
  },
];

export const unmeasured = [
  { key: "larger than memory", clause: "beyond the 32 MiB cache rows" },
  { key: "cold reads", clause: "every read here starts warm" },
  { key: "many readers", clause: "one reader, one pinned core" },
  { key: "shared host", clause: "not an exclusive core" },
];

/** Everything an assistant needs to explain one row, with no repo to read. */
export function receiptPrompt(row: Row, rival: Rival, name: string) {
  const theirs = row.rivals[rival];
  if (!theirs) return "";
  const throughput = isThroughput(row);
  const show = (n: number) =>
    throughput ? `${fmtFull(n)} writes/s` : fmtUs(n);
  const headline = (side: Latency | Throughput) =>
    "ops" in side ? side.ops : side.p50;
  const trials = theirs.runs.map(([mine, other], i) => {
    const ratio = throughput ? mine / other : other / mine;
    return `r${i + 1}: kiban ${show(mine)}, ${name} ${show(other)}, ${ratio.toFixed(2)}×`;
  });
  return [
    "Explain this storage engine benchmark to me in plain language. kiban is an embedded LSM-tree key-value store written in Rust.",
    "",
    `Workload: ${row.label}, ${row.detail} (${row.group}).`,
    `Metric: ${throughput ? "writes per second, higher is better" : "median (p50) latency per operation, lower is better"}.`,
    `Result: kiban ${show(headline(row.kiban))}, p99 ${fmtUs(row.kiban.p99)}. ${name} ${show(headline(theirs))}, p99 ${fmtUs(theirs.p99)}.`,
    `Paired ratio: ${theirs.ratio}, ranging from ${theirs.min} to ${theirs.max} across ${theirs.trials} trials. Above 1 favors kiban. If the range crosses 1, the site calls the row even.`,
    "",
    "Trials:",
    ...trials,
    "",
    `Setup: ${BENCHMARK.context}`,
    `Commit: ${benchCommit}`,
    `Host: ${RECEIPT.host}`,
    `Rerun: ${throughput ? RECEIPT.rerun.throughput : RECEIPT.rerun.latency}`,
    "",
    "Where kiban loses elsewhere in this campaign:",
    ...losses.map((loss) => `- ${loss.key}: ${loss.clause}`),
    "Not measured:",
    ...unmeasured.map((gap) => `- ${gap.key}: ${gap.clause}`),
    "",
    "Tell me what these numbers mean, how consistent the trials are, whether the gap would matter in practice, and what this result does not prove. Use only the numbers above, and say so when they cannot answer something.",
  ].join("\n");
}

// ----------------------------------------------------------------- format --

const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumSignificantDigits: 3,
});
export function fmtOps(n: number) {
  return compact.format(n);
}
export function fmtFull(n: number) {
  return Math.round(n).toLocaleString("en");
}
export function fmtUs(us: number) {
  return us >= 1000
    ? `${(us / 1000).toFixed(us >= 10_000 ? 0 : 1)} ms`
    : `${us >= 10 ? Math.round(us) : us.toFixed(2)} µs`;
}
export function fmtRatio(r: number) {
  return r >= 1 ? `${r.toFixed(r >= 10 ? 0 : 1)}×` : `${(1 / r).toFixed(1)}×`;
}
