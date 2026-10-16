import { cache } from "react";
import snapshot from "./facts.snapshot.json";
import { ENGINE_REPO } from "./source";

export const FACTS_URL =
  "https://raw.githubusercontent.com/aetosdios27/kiban/site-data/facts.json";
export const FACTS_REVALIDATE_SECONDS = 3600;

export type Guarantee = { key: string; clause: string; evidence: string[] };
type Spread = { median: number; min: number; max: number };
export type PublishedBenchmarkRow = {
  campaign: string;
  case: string;
  engine: "kiban" | "rocksdb";
  trials?: number;
  ops_per_second: Spread;
  read_p99_us: Spread | null;
  write_p99_us: Spread | null;
};
type ComparisonSide = {
  ops: Spread;
  read: { p99: number } | null;
  write: { p99: number } | null;
};
export type BenchmarkRow = {
  id: string;
  label: string;
  detail: string;
  campaign: string;
  kiban: ComparisonSide;
  rocksdb: ComparisonSide;
};
export type Facts = {
  schema: 1;
  generated_at: string;
  engine: { version: string; commit: string; commit_date: string };
  specs: string[];
  guarantees: {
    promised: Guarantee[];
    not_promised: Guarantee[];
    not_built: Guarantee[];
  };
  tests: {
    lib_tests?: number;
    crash_seeds_per_pr?: number;
    crashes_per_seed?: number;
    nightly_seeds_total?: number;
  };
  local_sweeps: {
    date: string;
    commit: string;
    suite?: "direct" | "shared";
    seeds: number;
    result: string;
  }[];
  bugs_found: { date: string; title: string; pr?: number }[];
  capabilities: {
    id: string;
    label: string;
    status?: "shipped" | "in_review" | "planned";
    link: string;
  }[];
  roadmap: {
    id: string;
    title: string;
    status?: "done" | "active" | "next" | "planned";
  }[];
  examples: Partial<Record<ExampleId, string>>;
  benchmarks: {
    source: string;
    commit: string;
    rows?: PublishedBenchmarkRow[];
  };
};

export const EXAMPLE_IDS = [
  "basic",
  "batch",
  "range",
  "snapshot",
  "shared",
  "python",
] as const;
export type ExampleId = (typeof EXAMPLE_IDS)[number];
export type Example = { id: ExampleId; label: string; code: string };

// Missing fields stay empty. Only a failed fetch or invalid document uses the
// snapshot; merging live data with old claims would misrepresent the engine.
function object(value: unknown): Record<string, unknown> {
  if (value === undefined) return {};
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error("expected an object");
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (value === undefined) return "";
  if (typeof value !== "string") throw new Error("expected a string");
  return value;
}
function count(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)
    throw new Error("expected a nonnegative integer");
  return value;
}
function list<T>(value: unknown, parse: (item: unknown) => T): T[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error("expected an array");
  return value.map(parse);
}
function choice<const T extends string>(
  value: unknown,
  choices: readonly T[],
): T | undefined {
  if (value === undefined || value === "") return undefined;
  for (const candidate of choices) if (value === candidate) return candidate;
  throw new Error(`expected one of ${choices.join(", ")}`);
}
function date(value: unknown): string {
  const result = text(value);
  if (
    result &&
    (!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(result) ||
      !Number.isFinite(Date.parse(result)))
  )
    throw new Error("expected an ISO date");
  return result;
}
function link(value: unknown): string {
  const result = text(value);
  if (result && !["https:", "http:"].includes(new URL(result).protocol))
    throw new Error("expected an http(s) link");
  return result;
}
function guarantee(value: unknown): Guarantee {
  const row = object(value);
  return {
    key: text(row.key),
    clause: text(row.clause),
    evidence: list(row.evidence, text).filter(Boolean),
  };
}
function finite(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0)
    throw new Error("expected a finite nonnegative measurement");
  return value;
}
function spread(value: unknown): Spread {
  const row = object(value);
  return {
    median: finite(row.median),
    min: finite(row.min),
    max: finite(row.max),
  };
}
function publishedBenchmark(value: unknown): PublishedBenchmarkRow {
  const row = object(value);
  const name = text(row.case);
  const engine = choice(row.engine, ["kiban", "rocksdb"]);
  if (!name || !engine)
    throw new Error("benchmark row needs a case and engine");
  const ops = spread(row.ops_per_second);
  if (ops.median === 0)
    throw new Error("benchmark throughput must be positive");
  const read = row.read_p99_us == null ? null : spread(row.read_p99_us);
  const write = row.write_p99_us == null ? null : spread(row.write_p99_us);
  if (!read && !write) throw new Error("benchmark needs read or write latency");
  return {
    campaign: text(row.campaign),
    case: name,
    engine,
    trials: count(row.trials),
    ops_per_second: ops,
    read_p99_us: read,
    write_p99_us: write,
  };
}

export function parseFacts(value: unknown): Facts {
  const root = object(value);
  if (root.schema !== 1)
    throw new Error("unsupported facts schema (expected 1)");
  const engine = object(root.engine);
  const guarantees = object(root.guarantees);
  const tests = object(root.tests);
  const examples = object(root.examples);
  const benchmarks = object(root.benchmarks);
  const parsedExamples: Facts["examples"] = {};
  for (const id of EXAMPLE_IDS) {
    const code = text(examples[id]);
    if (code.trim()) parsedExamples[id] = code;
  }
  return {
    schema: 1,
    generated_at: date(root.generated_at),
    engine: {
      version: text(engine.version),
      commit: text(engine.commit),
      commit_date: date(engine.commit_date),
    },
    specs: list(root.specs, text).filter(Boolean),
    guarantees: {
      promised: list(guarantees.promised, guarantee),
      not_promised: list(guarantees.not_promised, guarantee),
      not_built: list(guarantees.not_built, guarantee),
    },
    tests: {
      lib_tests: count(tests.lib_tests),
      crash_seeds_per_pr: count(tests.crash_seeds_per_pr),
      crashes_per_seed: count(tests.crashes_per_seed),
      nightly_seeds_total: count(tests.nightly_seeds_total),
    },
    local_sweeps: list(root.local_sweeps, (value) => {
      const row = object(value);
      return {
        date: date(row.date),
        commit: text(row.commit),
        suite: choice(row.suite, ["direct", "shared"]),
        seeds: count(row.seeds) ?? 0,
        result: text(row.result),
      };
    }),
    bugs_found: list(root.bugs_found, (value) => {
      const row = object(value);
      const pr = count(row.pr);
      if (pr === 0) throw new Error("PR numbers must be positive");
      return { date: date(row.date), title: text(row.title), pr };
    }),
    capabilities: list(root.capabilities, (value) => {
      const row = object(value);
      return {
        id: text(row.id),
        label: text(row.label),
        status: choice(row.status, ["shipped", "in_review", "planned"]),
        link: link(row.link),
      };
    }),
    roadmap: list(root.roadmap, (value) => {
      const row = object(value);
      return {
        id: text(row.id),
        title: text(row.title),
        status: choice(row.status, ["done", "active", "next", "planned"]),
      };
    }),
    examples: parsedExamples,
    benchmarks: {
      source: text(benchmarks.source),
      commit: text(benchmarks.commit),
      rows:
        benchmarks.rows === undefined
          ? undefined
          : list(benchmarks.rows, publishedBenchmark),
    },
  };
}

export const getFacts = cache(async (): Promise<Facts> => {
  try {
    const response = await fetch(FACTS_URL, {
      next: { revalidate: FACTS_REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return parseFacts(await response.json());
  } catch (error) {
    console.warn(
      "[kiban facts] using committed snapshot:",
      error instanceof Error ? error.message : error,
    );
    return parseFacts(snapshot);
  }
});

export function getExamples(facts: Facts): Example[] {
  return EXAMPLE_IDS.flatMap((id) => {
    const code = facts.examples[id];
    return code ? [{ id, label: id, code }] : [];
  });
}
export function engineRef(facts: Facts): string {
  return (
    facts.engine.commit ||
    (facts.engine.version ? `v${facts.engine.version}` : "main")
  );
}
export function sourceUrl(facts: Facts, path: string): string {
  return `${ENGINE_REPO}/blob/${encodeURIComponent(engineRef(facts))}/${path}`;
}
export function evidenceUrl(test: string): string {
  return `${ENGINE_REPO}/search?type=code&q=${encodeURIComponent(test)}`;
}
function statNumber(value: number): string {
  return value.toLocaleString(
    "en",
    value >= 1_000_000_000_000
      ? { notation: "scientific", maximumSignificantDigits: 1 }
      : value >= 10_000
        ? { notation: "compact", maximumSignificantDigits: 3 }
        : undefined,
  );
}
export function getCorrectnessResults(facts: Facts) {
  const results: { value: string; label: string }[] = [];
  const {
    crash_seeds_per_pr: seeds,
    crashes_per_seed: crashes,
    nightly_seeds_total: nightly,
    lib_tests: tests,
  } = facts.tests;
  if (seeds !== undefined && crashes !== undefined) {
    const value = `${statNumber(seeds)} × ${statNumber(crashes)}`;
    results.push({
      value: value.length > 10 ? value.replaceAll(" ", "") : value,
      label: "Crash seeds per PR × crashes per seed",
    });
  }
  const largest = facts.local_sweeps.reduce<
    Facts["local_sweeps"][number] | undefined
  >((best, row) => (!best || row.seeds > best.seeds ? row : best), undefined);
  if (largest)
    results.push({
      value: statNumber(largest.seeds),
      label: `Largest local sweep · ${[largest.suite, largest.result, largest.date, largest.commit.slice(0, 7)].filter(Boolean).join(" · ")}`,
    });
  if (nightly && nightly > 0)
    results.push({ value: statNumber(nightly), label: "Nightly seeds, total" });
  if (tests !== undefined)
    results.push({ value: statNumber(tests), label: "Library tests" });
  if (facts.bugs_found.length)
    results.push({
      value: statNumber(facts.bugs_found.length),
      label: "Bugs found",
    });
  return results;
}

export function evidenceFraming(facts: Facts): string {
  return facts.guarantees.promised.length &&
    facts.guarantees.promised.every((row) => row.evidence.length)
    ? "every claim links to the test that checks it."
    : "Test links are shown when the feed publishes them.";
}

// Historical comparison copy belongs to its committed dataset, never to the
// current engine version. Feed-provided rows use their own provenance instead.
export const HISTORICAL_BENCHMARK = {
  introduction:
    "The v0.1.0 tag against RocksDB 11.8.1 on one machine, matched settings, compression off, medians of three verified trials. RocksDB wins every write workload. Reads are closer, and one large read run goes the other way.",
  caption:
    "Throughput of kiban v0.1.0 and RocksDB 11.8.1 per workload, with p99 latency and the ratio between them.",
  context:
    "One shared desktop: Intel Core Ultra 9 185H, 22 logical CPUs, NVMe, Linux 7.2. Every dataset fits in RAM, so this says nothing about larger-than-memory or cold-storage performance. kiban's mixed throughput stops improving past four threads, and on 1M random writes it uses more memory (79.8 vs 33.9 MiB RSS) and writes more (3.09× vs 2.48× SST amplification). 204 trials, none failed.",
  url: `${ENGINE_REPO}/blob/main/validation/COMPARISON.md`,
};

export const FACT_COPY = {
  correctness:
    "Simulated crashes, injected filesystem faults and real SIGKILLs. After each one, the reopened database is checked for a prefix of accepted writes that includes every synced write.",
  honesty:
    "Tested cases, not a proof, and not a claim of production readiness.",
};
export type InstallMethods = Record<
  "cargo" | "source",
  { shown: string; command: string }
>;
export function getInstall(facts: Facts): {
  methods: InstallMethods;
  tag: string;
  note: string;
} {
  const version = facts.engine.version;
  const ref = engineRef(facts);
  const flag = facts.engine.commit || !version ? "--rev" : "--tag";
  return {
    tag: version ? `v${version}` : ref.slice(0, 7),
    note: version.startsWith("0.") ? " · early release" : "",
    methods: {
      cargo: {
        shown: "cargo add kiban --git github.com/aetosdios27/kiban",
        command: `cargo add kiban --git ${ENGINE_REPO} ${flag} ${ref}`,
      },
      source: {
        shown: "git clone github.com/aetosdios27/kiban && cargo build",
        command: `git clone ${ENGINE_REPO}.git\ncd kiban\ngit checkout ${ref}\ncargo build --release --locked`,
      },
    },
  };
}
export function heroStatement(facts: Facts): string {
  const rust = facts.specs.some((spec) => spec.startsWith("Rust"));
  const linux = facts.specs.includes("Linux");
  return `kiban is an embedded LSM-tree key-value store${linux ? " for Linux" : ""}${rust ? ", written in Rust" : ""}: a write-ahead log, memtables, SSTs, leveled compaction, snapshots and crash recovery.`;
}

export function getBenchmarkRows(facts: Facts): BenchmarkRow[] | undefined {
  if (facts.benchmarks.rows === undefined) return undefined;
  const pairs = new Map<
    string,
    {
      campaign: string;
      case: string;
      kiban?: PublishedBenchmarkRow;
      rocksdb?: PublishedBenchmarkRow;
    }
  >();
  for (const row of facts.benchmarks.rows) {
    const key = `${row.campaign}/${row.case}`;
    const pair = pairs.get(key) ?? { campaign: row.campaign, case: row.case };
    pair[row.engine] = row;
    pairs.set(key, pair);
  }
  return [...pairs].flatMap(([id, pair]) => {
    const { kiban, rocksdb } = pair;
    if (!kiban || !rocksdb) return [];
    const kind =
      kiban.write_p99_us && rocksdb.write_p99_us
        ? "write"
        : kiban.read_p99_us && rocksdb.read_p99_us
          ? "read"
          : undefined;
    if (!kind) return [];
    const side = (row: PublishedBenchmarkRow): ComparisonSide => ({
      ops: row.ops_per_second,
      read:
        kind === "read" && row.read_p99_us
          ? { p99: row.read_p99_us.median }
          : null,
      write:
        kind === "write" && row.write_p99_us
          ? { p99: row.write_p99_us.median }
          : null,
    });
    const trials = kiban.trials === rocksdb.trials ? kiban.trials : undefined;
    return [
      {
        id,
        campaign: pair.campaign,
        label: pair.case.replaceAll("-", " "),
        detail: trials === undefined ? "" : `${trials} trials`,
        kiban: side(kiban),
        rocksdb: side(rocksdb),
      },
    ];
  });
}
