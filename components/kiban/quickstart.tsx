"use client";

import { Check, Copy } from "pixelarticons/react";
import { ToggleGroup } from "radix-ui";
import { useEffect, useState, type ReactNode } from "react";
import { examples, specs } from "@/lib/kiban/engine";
import { cue } from "@/lib/kiban/sound";
import { SectionHead } from "./section-head";

type Id = (typeof examples)[number]["id"];

// A small Rust highlighter: comments, strings, keywords, macros, types.
// Enough for these snippets; not a general tokenizer.
const TOKENS =
  /(\/\/[^\n]*)|(b?"(?:[^"\\]|\\.)*")|\b(use|fn|let|mut|for|in|move|drop|Ok|Some|None)\b|\b([a-z_]+!)|\b([A-Z][A-Za-z0-9]*)\b/g;

function highlight(code: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of code.matchAll(TOKENS)) {
    if (m.index > last) out.push(code.slice(last, m.index));
    const kind = m[1]
      ? "comment"
      : m[2]
        ? "string"
        : m[3]
          ? "keyword"
          : m[4]
            ? "macro"
            : "type";
    out.push(
      <span key={m.index} className={`tok-${kind}`}>
        {m[0]}
      </span>,
    );
    last = m.index + m[0].length;
  }
  out.push(code.slice(last));
  return out;
}

export function Quickstart() {
  const [id, setId] = useState<Id>("basic");
  const [copied, setCopied] = useState(false);
  const example = examples.find((e) => e.id === id)!;

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = () =>
    navigator.clipboard.writeText(example.code).then(
      () => {
        setCopied(true);
        cue("success", { emphasis: "subtle" });
      },
      () => {},
    );

  return (
    <section
      id="quickstart"
      className="section"
      aria-labelledby="quickstart-title"
    >
      <SectionHead
        index="01"
        label="Quickstart"
        id="quickstart-title"
        title={
          <>
            open, put, <span className="px">sync().</span>
          </>
        }
      >
        Open a directory, write, sync, read. Byte keys and byte values, kept in
        order, inside your process.
      </SectionHead>
      <div className="section-body quickstart">
        <div className="code-card">
          <div className="code-head">
            <ToggleGroup.Root
              type="single"
              value={id}
              onValueChange={(v) => {
                if (!v) return;
                setId(v as Id);
                setCopied(false);
              }}
              aria-label="Example"
              className="install-tabs"
            >
              {examples.map((e) => (
                <ToggleGroup.Item
                  key={e.id}
                  value={e.id}
                  className="install-tab"
                  data-cuelume-select
                >
                  {e.label}
                </ToggleGroup.Item>
              ))}
            </ToggleGroup.Root>
            <button
              type="button"
              className="install-copy code-copy"
              onClick={copy}
              data-copied={copied || undefined}
              aria-label={copied ? "Copied" : `Copy the ${id} example`}
            >
              {copied ? (
                <Check className="icon" aria-hidden="true" />
              ) : (
                <Copy className="icon" aria-hidden="true" />
              )}
            </button>
          </div>
          <pre className="code-body">
            <code>{highlight(example.code)}</code>
          </pre>
        </div>
        <p className="spec-line">{specs.join(" · ")}</p>
      </div>
    </section>
  );
}
