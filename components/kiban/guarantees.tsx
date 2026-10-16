import { evidenceUrl, type Facts } from "@/lib/kiban/facts";
import { SectionHead } from "./section-head";

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
            {rows.map(({ key, clause, evidence }, i) => (
              <dd key={`${key}-${i}`}>
                <code style={{ minWidth: 0, overflowWrap: "anywhere" }}>
                  {key}
                </code>
                <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>
                  {clause}
                  {kept &&
                    evidence.map((test) => (
                      <a
                        key={test}
                        className="read-link"
                        href={evidenceUrl(test)}
                        title={test}
                        aria-label={`Test: ${test}`}
                      >
                        {" · test"}
                      </a>
                    ))}
                </span>
              </dd>
            ))}
          </dl>
        ))}
      </div>
    </section>
  );
}
