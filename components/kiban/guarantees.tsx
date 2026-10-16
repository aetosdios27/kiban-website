import { notPromised, promised } from "@/lib/kiban/engine";
import { SectionHead } from "./section-head";

// A spec sheet, not a tutorial: what v0.1.0 promises and what it doesn't,
// a key and a clause per line.
export function Guarantees() {
  return (
    <section
      id="guarantees"
      className="section"
      aria-labelledby="guarantees-title"
    >
      <SectionHead
        index="02"
        label="Guarantees"
        id="guarantees-title"
        title={
          <>
            what <span className="px">Ok</span> means.
          </>
        }
      >
        Ok means accepted. <code>sync()</code> means durable.
      </SectionHead>
      <div className="section-body spec-sheet">
        {(
          [
            ["promised", promised, true],
            ["not promised", notPromised, false],
          ] as const
        ).map(([title, rows, kept]) => (
          <dl key={title} className="spec-col" data-kept={kept || undefined}>
            <dt className="spec-col-title">{title}</dt>
            {rows.map(([key, clause]) => (
              <dd key={key}>
                <code>{key}</code>
                <span>{clause}</span>
              </dd>
            ))}
          </dl>
        ))}
      </div>
    </section>
  );
}
