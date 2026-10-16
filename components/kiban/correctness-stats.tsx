import {
  FACT_COPY,
  evidenceFraming,
  getCorrectnessResults,
  sourceUrl,
  type Facts,
} from "@/lib/kiban/facts";
import { RollingStat } from "./rolling-stat";
import { SectionHead } from "./section-head";
import { ExternalLink } from "pixelarticons/react";

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
        <a
          className="read-link"
          href={sourceUrl(facts, "validation/CORRECTNESS.md")}
        >
          Read the validation report{" "}
          <ExternalLink className="icon icon-ext" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
