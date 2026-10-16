# Engine facts feed

`getFacts()` in `facts.ts` reads the public `site-data/facts.json` feed during
prerendering. It requests an hourly Next.js fetch cache lifetime. The homepage
also exports an hourly route revalidation interval, so an HTTP failure during
build does not leave the snapshot page cached forever. Revalidation runs when
the page receives traffic after that interval; it is not a background cron job.
This uses the installed Next.js guide for applications without Cache Components.

The loader validates schema version 1 and every consumed field. HTTP errors,
network failures, a ten-second timeout, invalid JSON, and invalid field values
produce a warning and return `facts.snapshot.json`. React memoizes the loader
within a render. The committed snapshot is validated through the same parser.

Missing fields become empty collections, empty text, or absent counts. A valid
partial feed does not inherit older snapshot claims. Zero nightly seeds are
hidden. Correctness prioritizes PR crash coverage, the largest local sweep,
nonzero nightly coverage, library tests, and bugs found. Counts use compact
notation when needed. The stats and short bug list have at most six entries;
other lists grow vertically. Examples scroll inside the existing code panel.
The Python tab appears only for a nonempty `examples.python`.

Hero language and platform come from `specs`. The architectural introduction
stays the same as the untouched write-path and architecture diagrams. V1 does
not provide an explicit hero-description field.

## Benchmark rows

With no `benchmarks.rows`, the page retains `bench-data.json`, the historical
comparison text, and the existing race replays. Their release versions describe
that historical dataset, independently of the current engine version.

The live publisher emits one summary row per engine, campaign, and case:

```json
{
  "campaign": "validation/comparison-results/cache",
  "case": "reads-cache-warm",
  "engine": "kiban",
  "trials": 3,
  "ops_per_second": { "median": 100, "min": 90, "max": 110 },
  "read_p99_us": { "median": 3, "min": 2, "max": 4 },
  "write_p99_us": null
}
```

The validator reads that published shape. Throughput must be positive and each
row must supply read or write latency. `getBenchmarkRows` pairs kiban and RocksDB
by both campaign and case, preserving throughput and the median p99 measurement.
It renders only complete pairs with a common operation. It does not manufacture
other latency percentiles or memory measurements. Trial counts appear when both
engines report the same count. Case names come from the feed, without borrowing
workload descriptions from an older dataset.

An explicit empty row array shows an empty feed comparison. Feed comparisons
link to their own source and commit and omit historical race replays and
conclusions. The publisher also emits `data_source`, an additional provenance
field that the site does not need to render the table. Hardware, opponent
version, and race time series are not specified by v1, so the site does not
invent them for a new comparison.

## Scope and checks

`pnpm lint` runs `scripts/check-facts.mjs`. It checks the validator, loader
failure cases, snapshot corrections, optional metrics, benchmark rows, and
digit-bearing engine claim strings in `components/kiban/`. Section indexes,
illustrative diagram levels, and fixed chart scales are UI values.

The header, footer, diagrams, fonts, global stylesheet, animation code, and sound
code remain unchanged. The footer still describes the existing release through
`source.ts`; its static release copy is outside this refactor because the owner
explicitly excluded footer changes. The older validation-campaign metrics
have no fields in v1 and are replaced by the current feed's evidence.
