import { type Facts } from "@/lib/kiban/facts";
import { SectionHead } from "./section-head";

// A spec sheet, not a tutorial: a key and a clause per line. The precise
// wording and the tests that check each promise live in the row's tooltip.
export function Guarantees({ facts }: { facts: Facts }) {
  const promised = facts.guarantees.promised;
  const notPromised = [
    ...facts.guarantees.not_promised,
    ...facts.guarantees.not_built,
  ];
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
            {rows.map(({ key, clause, detail, evidence }) => (
              <dd key={key} title={tooltip(detail, evidence)}>
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

function tooltip(detail: string, evidence: string[]): string | undefined {
  const tests = evidence.length ? `Checked by: ${evidence.join(", ")}` : "";
  return [detail, tests].filter(Boolean).join("\n") || undefined;
}
