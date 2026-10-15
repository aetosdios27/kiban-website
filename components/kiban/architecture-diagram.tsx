import { ENGINE_SOURCE } from "@/lib/kiban/source";
import { EngineStrata } from "./engine-strata";
import { SectionHead } from "./section-head";
import { ExternalLink } from "pixelarticons/react";

const structures = [
  [
    "block cache",
    "Caches verified SST blocks for foreground reads. Compaction uses a separate bulk reader.",
  ],
  [
    "MANIFEST",
    "Commits live WAL generations and SST file / level membership before structural state is published.",
  ],
  [
    "compaction",
    "Merges overlapping ranges. L1 and deeper levels maintain disjoint key ranges.",
  ],
  [
    "snapshots",
    "Pin a sequence boundary and file set; visible versions and referenced files remain available.",
  ],
] as const;

export function ArchitectureDiagram() {
  return (
    <section
      id="architecture"
      className="section architecture-section"
      aria-labelledby="architecture-title"
    >
      <SectionHead
        index="04"
        label="Architecture"
        id="architecture-title"
        title={
          <>
            inside the <span className="px">engine.</span>
          </>
        }
      >
        An ordered byte-key / byte-value store inside your process. The MANIFEST
        is the authority for which WALs and SSTables belong to the database.
      </SectionHead>
      <figure className="section-body architecture-diagram">
        <div
          className="architecture-map panel-grid"
          tabIndex={0}
          role="region"
          aria-label="Architecture diagram; scroll horizontally on small screens"
        >
          <EngineStrata />
        </div>
        <figcaption>
          Conceptual paths. <code>get()</code> and <code>scan()</code> read
          memtables, then SSTables; the newest visible version wins. Keys,
          versions and sequence numbers are illustrative.
        </figcaption>
      </figure>
      <dl className="architecture-details">
        {structures.map(([title, description]) => (
          <div key={title}>
            <dt>{title}</dt>
            <dd>{description}</dd>
          </div>
        ))}
      </dl>
      <div className="section-foot">
        <a
          className="read-link"
          href={`${ENGINE_SOURCE}/README.md#architecture`}
        >
          Read the engine architecture{" "}
          <ExternalLink className="icon icon-ext" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
