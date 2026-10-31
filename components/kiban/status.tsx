import type { Facts } from "@/lib/kiban/facts";
import { SectionHead } from "./section-head";

const ORDER = ["done", "active", "next", "planned"];
const rank = (status?: string) =>
  status ? ORDER.indexOf(status) : ORDER.length;

// Capability, then roadmap, as the guarantees' key-and-clause spec sheet.
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
            .map((row) => (
              <dd key={row.id}>
                <code>{row.label}</code>
                <span>{row.status?.replaceAll("_", " ") ?? "unknown"}</span>
              </dd>
            ))}
        </dl>
        <dl className="spec-col">
          <dt className="spec-col-title">roadmap</dt>
          {facts.roadmap
            .filter((row) => row.title)
            .toSorted((a, b) => rank(a.status) - rank(b.status))
            .map((row) => (
              <dd key={row.id}>
                <code>{row.status ?? "unknown"}</code>
                <span>{row.title}</span>
              </dd>
            ))}
        </dl>
      </div>
    </section>
  );
}
