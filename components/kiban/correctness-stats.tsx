import {
  FACT_COPY,
  evidenceFraming,
  getCorrectnessResults,
  type Facts,
} from "@/lib/kiban/facts";
import { RollingStat } from "./rolling-stat";
import { SectionHead } from "./section-head";
import Link from "next/link";
import { ArrowRight } from "pixelarticons/react";

export function CorrectnessStats({ facts }: { facts: Facts }) {
  const results = getCorrectnessResults(facts).slice(0, 6);
  return (
    <section
      id="correctness"
      className="section"
      aria-labelledby="correctness-title"
    >
      <SectionHead
        index="03"
        label="Correctness"
        id="correctness-title"
        title={
          <>
            we tried to <span className="px">break</span> it.
          </>
        }
      >
        {FACT_COPY.correctness}
      </SectionHead>
      <dl className="section-body correctness-results">
        {results.map(({ value, label }) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>
              <RollingStat value={value} />
            </dd>
          </div>
        ))}
      </dl>
      <div className="section-foot">
        <p>
          {evidenceFraming(facts)} {FACT_COPY.honesty}
        </p>
        <Link className="read-link" href="/library/correctness">
          Read the repair report{" "}
          <ArrowRight className="icon" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
