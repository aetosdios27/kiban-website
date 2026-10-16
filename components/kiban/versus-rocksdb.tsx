import { ExternalLink } from "pixelarticons/react";
import { HISTORICAL_BENCHMARK } from "@/lib/kiban/facts";
import { Race } from "./bench/race";
import { Scoreboard } from "./bench/scoreboard";
import { SectionHead } from "./section-head";

// The historical comparison, in the site's own terms: a scoreboard
// of every workload, then the three long runs replayed as a terminal readout.
// Curated on purpose; it changes only when a new comparison is published.

export function VersusRocksdb() {
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
        {HISTORICAL_BENCHMARK.introduction}
      </SectionHead>

      <div className="section-body bench">
        <Scoreboard />

        <div className="bench-sub">
          <p className="bench-sub-title">replay the long runs</p>
          <p className="bench-sub-text">
            The scale runs, second by second from each engine&apos;s median
            trial. Press play, or drag across the plot.
          </p>
        </div>
        <Race />
      </div>

      <div className="section-foot">
        <p>{HISTORICAL_BENCHMARK.context}</p>
        <a className="read-link" href={HISTORICAL_BENCHMARK.url}>
          Methodology and raw results{" "}
          <ExternalLink className="icon icon-ext" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
