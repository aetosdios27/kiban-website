// The documents worth reading, in reading order. Each maps one engine file to
// a page. Prose is imported verbatim by scripts/library-sync.mjs; only the
// title treatment and one-line summary here are written for the site.

export type Shelf = "start" | "correctness" | "contests" | "speed" | "history";

export const SHELVES: { id: Shelf; title: string; intro: string }[] = [
  {
    id: "start",
    title: "start here",
    intro: "What kiban is, how it is built, and what changed.",
  },
  {
    id: "correctness",
    title: "how it stays correct",
    intro: "The failures found, the repairs made, and how they were proved.",
  },
  {
    id: "contests",
    title: "head to head",
    intro: "Kiban against the engines people would otherwise use.",
  },
  {
    id: "speed",
    title: "how it got fast",
    intro: "One bottleneck at a time, including what was rejected.",
  },
  {
    id: "history",
    title: "from the archive",
    intro: "Earlier work, kept because the context still matters.",
  },
];

export type Entry = {
  slug: string;
  source: string;
  shelf: Shelf;
  title: [string, string];
  dek: string;
};

export const CATALOG: Entry[] = [
  {
    slug: "overview",
    source: "README.md",
    shelf: "start",
    title: ["meet", "kiban."],
    dek: "What the engine does, how to use it, and what it promises.",
  },
  {
    slug: "architecture",
    source: "ARCHITECTURE.md",
    shelf: "start",
    title: ["how it is", "built."],
    dek: "Ownership, durable state, reads, snapshots and maintenance.",
  },
  {
    slug: "changelog",
    source: "CHANGELOG.md",
    shelf: "start",
    title: ["what", "changed."],
    dek: "Every release and the unreleased work on main.",
  },
  {
    slug: "correctness",
    source: "validation/CORRECTNESS.md",
    shelf: "correctness",
    title: ["the", "repairs."],
    dek: "Three scale-validation failures, their root causes and the fixes.",
  },
  {
    slug: "audit",
    source: "validation/AUDIT_REPAIRS.md",
    shelf: "correctness",
    title: ["the", "audit."],
    dek: "Concrete findings from an engine audit, and how each was closed.",
  },
  {
    slug: "group-commit-qa",
    source: "validation/group-commit-qa/REPORT.md",
    shelf: "correctness",
    title: ["testing the", "write path."],
    dek: "An independent QA pass on group commit, with one medium finding.",
  },
  {
    slug: "validation",
    source: "validation/README.md",
    shelf: "correctness",
    title: ["how we", "measure."],
    dek: "Workloads, cache treatment, fault injection and how to reproduce them.",
  },
  {
    slug: "the-field",
    source: "validation/site-refresh/REPORT.md",
    shelf: "contests",
    title: ["against the", "field."],
    dek: "Four engines at one commit: the campaign behind this site's numbers.",
  },
  {
    slug: "rocksdb",
    source: "validation/rocksdb/REPORT.md",
    shelf: "contests",
    title: ["versus tuned", "RocksDB."],
    dek: "A fair fight: 425 commands, screened settings, and where RocksDB wins.",
  },
  {
    slug: "sqlite",
    source: "validation/sqlite/REPORT.md",
    shelf: "contests",
    title: ["why not just use", "SQLite?"],
    dek: "Both reasonable schemas, tuned, on an agent-memory workload.",
  },
  {
    slug: "helix-lmdb",
    source: "validation/ENGINE_H2H.md",
    shelf: "contests",
    title: ["Helix and", "LMDB."],
    dek: "In-process, with matched durability, at 10k and 1M records.",
  },
  {
    slug: "group-commit",
    source: "validation/group-commit/REPORT.md",
    shelf: "speed",
    title: ["one sync for", "many writers."],
    dek: "How group commit took durable writes from 718 to 5,379 per second.",
  },
  {
    slug: "read-path",
    source: "validation/READ_PATH_PROFILE.md",
    shelf: "speed",
    title: ["where a read", "spends its time."],
    dek: "A ranked cycle profile of the read path, and what it pointed at.",
  },
  {
    slug: "range-cache",
    source: "validation/RANGE_CACHE.md",
    shelf: "speed",
    title: ["reworking the", "read path."],
    dek: "Faster scans, and an optional range tier ported from HelixDB.",
  },
  {
    slug: "perfect-hash",
    source: "validation/phash/REPORT.md",
    shelf: "speed",
    title: ["the perfect", "hash."],
    dek: "The experiment that showed immutable tables could beat a B+tree.",
  },
  {
    slug: "point-index-cost",
    source: "validation/pointindex-cost/PH3_COST_REPORT.md",
    shelf: "speed",
    title: ["making the index", "cheap."],
    dek: "PH3 cuts locator bytes by 61% and frees the path to a default.",
  },
  {
    slug: "latest-ten",
    source: "validation/remix-engine/REPORT.md",
    shelf: "speed",
    title: ["latest ten,", "faster."],
    dek: "A scan extension that beats LMDB in every measured cell.",
  },
  {
    slug: "small-cache",
    source: "validation/smallcache/REPORT.md",
    shelf: "speed",
    title: ["reads on a", "small cache."],
    dek: "Point reads when the data is ten times larger than the cache.",
  },
  {
    slug: "rocksdb-study",
    source: "validation/ROCKSDB_STUDY.md",
    shelf: "history",
    title: ["reading", "RocksDB."],
    dek: "Mechanisms in the RocksDB source that matter to kiban.",
  },
  {
    slug: "v0-1-comparison",
    source: "validation/COMPARISON.md",
    shelf: "history",
    title: ["where it", "started."],
    dek: "The v0.1.0 throughput comparison, losses included.",
  },
];

export const entryFor = (slug: string) =>
  CATALOG.find((entry) => entry.slug === slug);
export const shelfFor = (id: Shelf) =>
  SHELVES.find((shelf) => shelf.id === id)!;
