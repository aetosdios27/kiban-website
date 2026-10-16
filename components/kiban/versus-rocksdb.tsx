import { ExternalLink } from "pixelarticons/react";
import { COMPARISON_URL } from "@/lib/kiban/engine";
import { Race } from "./bench/race";
import { Scoreboard } from "./bench/scoreboard";
import { SectionHead } from "./section-head";

// kiban v0.1.0 against RocksDB 11.8.1, in the site's own terms: a scoreboard
// of every workload, then the three long runs replayed as a terminal readout.

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
        The v0.1.0 tag against RocksDB 11.8.1 on one machine, matched settings,
        compression off, medians of three verified trials. RocksDB wins every
        write workload. Reads are closer, and one large read run goes the other
        way.
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
        <p>
          One shared desktop: Intel Core Ultra 9 185H, 22 logical CPUs, NVMe,
          Linux 7.2. Every dataset fits in RAM, so this says nothing about
          larger-than-memory or cold-storage performance. kiban&apos;s mixed
          throughput stops improving past four threads, and on 1M random writes
          it uses more memory (79.8 vs 33.9 MiB RSS) and writes more (3.09× vs
          2.48× SST amplification). 204 trials, none failed.
        </p>
        <a className="read-link" href={COMPARISON_URL}>
          Methodology and raw results{" "}
          <ExternalLink className="icon icon-ext" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
