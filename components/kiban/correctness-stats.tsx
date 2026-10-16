import { ENGINE_SOURCE } from "@/lib/kiban/source";
import { RollingStat } from "./rolling-stat";
import { SectionHead } from "./section-head";
import { ExternalLink } from "pixelarticons/react";

const results = [
  ["1,000", "Simulated crash recoveries"],
  ["415,929", "Mutations, simulated"],
  ["332", "Injected faults fired"],
  ["1,000", "SIGKILL / reopen cycles"],
  ["530,100", "Acknowledged writes verified"],
  ["260", "Library tests"],
] as const;

export function CorrectnessStats() {
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
        Simulated crashes, injected filesystem faults and real SIGKILLs. After
        each one, the reopened database is checked against every write it
        acknowledged.
      </SectionHead>
      <dl className="section-body correctness-results">
        {results.map(([value, label]) => (
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
          From the v0.1.0 validation campaigns. Tested cases, not a proof, and
          not a claim of production readiness.
        </p>
        <a
          className="read-link"
          href={`${ENGINE_SOURCE}/validation/CORRECTNESS.md`}
        >
          Read the validation report{" "}
          <ExternalLink className="icon icon-ext" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
