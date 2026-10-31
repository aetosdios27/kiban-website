import Link from "next/link";
import { ArrowRight } from "pixelarticons/react";
import { BENCHMARK, headlines, losses, unmeasured } from "@/lib/kiban/bench";
import { Race } from "./bench/race";
import { Scoreboard } from "./bench/scoreboard";
import { Sweep } from "./bench/sweep";
import { TreeScene } from "./bench/tree-scene";
import { RollingStat } from "./rolling-stat";
import { SectionHead } from "./section-head";

// One campaign, in the site's own terms: the headline ratios, a scoreboard per
// opponent, the writer sweep, the long runs, and what kiban gives up for it.
// Curated on purpose; it changes only when a new campaign is published.

export function VersusField() {
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
            against the <span className="px">field.</span>
          </>
        }
      >
        {BENCHMARK.introduction}
      </SectionHead>

      <div className="section-body bench">
        <dl className="correctness-results">
          {headlines.map(({ value, label }) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>
                <RollingStat value={value} />
              </dd>
            </div>
          ))}
        </dl>

        <div className="bench-sub">
          <p className="bench-sub-title">every workload</p>
          <p className="bench-sub-text">
            Median latency, p99 beneath. Pick an opponent. A gap that changes
            sign between trials reads as even.
          </p>
        </div>
        <Scoreboard />

        <div className="bench-sub">
          <p className="bench-sub-title">double the writers</p>
          <p className="bench-sub-text">
            Group commit shares one sync across waiting writers. Press play, or
            drag across the plot.
          </p>
        </div>
        <Sweep />

        <TreeScene />

        <div className="bench-sub">
          <p className="bench-sub-title">replay the long runs</p>
          <p className="bench-sub-text">
            The scale runs, second by second from each engine&apos;s median
            trial. Press play, or drag across the plot.
          </p>
        </div>
        <Race />

        <div className="bench-sub">
          <p className="bench-sub-title">the other column</p>
          <p className="bench-sub-text">
            What these wins cost, and what this campaign cannot tell you.
          </p>
        </div>
        <div className="spec-sheet">
          {(
            [
              ["where it loses", losses, true],
              ["not measured", unmeasured, false],
            ] as const
          ).map(([title, items, kept]) => (
            <dl key={title} className="spec-col" data-kept={kept || undefined}>
              <dt className="spec-col-title">{title}</dt>
              {items.map(({ key, clause }) => (
                <dd key={key}>
                  <code>{key}</code>
                  <span>{clause}</span>
                </dd>
              ))}
            </dl>
          ))}
        </div>
      </div>

      <div className="section-foot">
        <p>{BENCHMARK.context}</p>
        <Link className="read-link" href={BENCHMARK.url}>
          Methodology and raw results{" "}
          <ArrowRight className="icon" aria-hidden="true" />
        </Link>
        <Link className="read-link" href={BENCHMARK.archiveUrl}>
          {BENCHMARK.archiveLabel}{" "}
          <ArrowRight className="icon" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
