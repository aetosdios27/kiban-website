import type { Facts } from "@/lib/kiban/facts";
import { SectionHead } from "./section-head";

export function Status({ facts }: { facts: Facts }) {
  if (!facts.capabilities.length && !facts.roadmap.length) return null;
  return (
    <section id="status" className="section" aria-labelledby="status-title">
      <SectionHead
        index="08"
        label="Status"
        id="status-title"
        title={
          <>
            what&apos;s <span className="px">here.</span>
          </>
        }
      >
        Shipped features and the work ahead.
      </SectionHead>
      <div className="section-body spec-sheet">
        <dl className="spec-col" data-kept>
          <dt className="spec-col-title">capabilities</dt>
          {facts.capabilities
            .filter((row) => row.label)
            .map((row, i) => (
              <dd key={`${row.id}-${i}`}>
                <code style={{ minWidth: 0, overflowWrap: "anywhere" }}>
                  {row.link ? (
                    <a className="read-link" href={row.link}>
                      {row.label}
                    </a>
                  ) : (
                    row.label
                  )}
                </code>
                <span>
                  {row.status?.replaceAll("_", " ") ?? "status unavailable"}
                </span>
              </dd>
            ))}
        </dl>
        <dl className="spec-col">
          <dt className="spec-col-title">roadmap</dt>
          {facts.roadmap
            .filter((row) => row.title)
            .map((row, i) => (
              <dd key={`${row.id}-${i}`}>
                <code style={{ minWidth: 0, overflowWrap: "anywhere" }}>
                  {row.title}
                </code>
                <span>{row.status ?? "status unavailable"}</span>
              </dd>
            ))}
        </dl>
      </div>
    </section>
  );
}
