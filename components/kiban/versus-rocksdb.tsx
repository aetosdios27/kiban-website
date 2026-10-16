import { ExternalLink } from "pixelarticons/react";
import {
  HISTORICAL_BENCHMARK,
  getBenchmarkRows,
  type Facts,
} from "@/lib/kiban/facts";
import { ENGINE_REPO } from "@/lib/kiban/source";
import { Race } from "./bench/race";
import { Scoreboard } from "./bench/scoreboard";
import { SectionHead } from "./section-head";

// The historical comparison, in the site's own terms: a scoreboard
// of every workload, then the three long runs replayed as a terminal readout.

export function VersusRocksdb({ facts }: { facts: Facts }) {
  const { source, commit } = facts.benchmarks;
  const rows = getBenchmarkRows(facts);
  const comparisonUrl = rows
    ? `${ENGINE_REPO}/blob/${encodeURIComponent(commit || "main")}/${source || "validation/COMPARISON.md"}`
    : HISTORICAL_BENCHMARK.url;
  return (
    <section
      id="benchmarks"
      className="section"
      aria-labelledby="benchmarks-title"
    >
      <SectionHead
        index="04"
        label="Benchmarks"
        id="benchmarks-title"
        title={
          <>
            against <span className="px">rocksdb.</span>
          </>
        }
      >
        {rows
          ? "Throughput and latency from the engine's comparison results."
          : HISTORICAL_BENCHMARK.introduction}
      </SectionHead>

      <div className="section-body bench">
        <Scoreboard rows={rows} />

        {rows === undefined && (
          <>
            <div className="bench-sub">
              <p className="bench-sub-title">replay the long runs</p>
              <p className="bench-sub-text">
                The scale runs, second by second from each engine&apos;s median
                trial. Press play, or drag across the plot.
              </p>
            </div>
            <Race />
          </>
        )}
      </div>

      <div className="section-foot">
        <p style={{ overflowWrap: "anywhere" }}>
          {rows
            ? `Source: ${source || "comparison results"}${commit ? ` · ${commit}` : ""}. Tested workloads, not a claim about every workload.`
            : HISTORICAL_BENCHMARK.context}
        </p>
        <a className="read-link" href={comparisonUrl}>
          Methodology and raw results{" "}
          <ExternalLink className="icon icon-ext" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
