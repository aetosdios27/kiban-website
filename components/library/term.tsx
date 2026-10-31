import type { ReactNode } from "react";
import { GLOSSARY } from "@/lib/library/glossary";

// A hover or focus definition, done in CSS: nothing runs while reading.
export function Term({ id, children }: { id: string; children?: ReactNode }) {
  return (
    <span className="term" tabIndex={0}>
      {children ?? id}
      <span className="term-tip" role="tooltip">
        <b>{id}</b>
        {GLOSSARY[id]}
      </span>
    </span>
  );
}
