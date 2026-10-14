import { ENGINE_SOURCE } from "@/lib/kiban/source";
import { RollingStat } from "./rolling-stat";
import { SectionHead } from "./section-head";
import { ExternalLink } from "pixelarticons/react";

const results = [
  ["1,000", "Simulated recovery cycles"],
  ["415,929", "Mutations"],
  ["332", "Injected faults"],
  ["1,000", "SIGKILL / reopen cycles"],
  ["530,100", "Acknowledged mutations"],
  ["260", "Library tests"],
  ["3", "Loom models"],
] as const;

export function CorrectnessStats() {
  return (
    <section
      id="correctness"
      className="section"
      aria-labelledby="correctness-title"
    >
      <SectionHead
        index="01"
        label="Correctness"
        id="correctness-title"
        title={
          <>
            we tried to <span className="px">break</span> it.
          </>
        }
      >
        Crash recovery, snapshots, tombstones, point versus scan consistency,
        filesystem fault injection, and WAL durability.
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
          Reported correctness runs. These counts describe tested cases, not
          formal proof or a production-safety guarantee.
        </p>
        <a
          className="read-link"
          href={`${ENGINE_SOURCE}/README.md#correctness-rules`}
        >
          Read the correctness rules{" "}
          <ExternalLink className="icon icon-ext" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
