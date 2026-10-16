import { EngineStrata } from "./engine-strata";
import { SectionHead } from "./section-head";

const structures = [
  [
    "block cache",
    "Holds checksum-verified SST blocks for reads. Compaction streams through its own reader and leaves the cache alone.",
  ],
  [
    "MANIFEST",
    "Records which WAL and SST files are live, and at which level, before any reader sees the change.",
  ],
  [
    "compaction",
    "Merges overlapping files downward. From L1 on, files in a level never overlap in key range.",
  ],
  [
    "snapshots",
    "Pin a sequence number and the files behind it. Later writes and compactions don't change what a snapshot reads.",
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
        index="07"
        label="Architecture"
        id="architecture-title"
        title={
          <>
            inside the <span className="px">engine.</span>
          </>
        }
      >
        An ordered byte-key, byte-value store that runs inside your process. The
        MANIFEST decides which log and table files belong to the database.
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
          <code>get()</code> and <code>scan()</code> read the memtables, then
          the SSTs, newest first; the newest visible version wins.
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
    </section>
  );
}
