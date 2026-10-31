"use client";

import { useEffect, useState } from "react";
import { Morph } from "./bench/morph";
import { ASSISTANTS, type Assistant } from "@/lib/kiban/assistants";
import { cue } from "@/lib/kiban/sound";

// One click from the hero to an assistant that explains kiban. Services that
// accept a prompt in the URL open with it filled in; the rest open with the
// prompt on the clipboard, and the note says so.
const PROMPT =
  "Explain kiban (https://github.com/aetosdios27/kiban), an embedded LSM-tree key-value storage engine written in Rust. Walk me through how a write moves through the write-ahead log, memtable and sorted tables, how compaction and snapshots work, and how it recovers after a crash. Ground your answer in the README and source, and say when you are unsure.";

export function AskAi() {
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(null), 2600);
    return () => clearTimeout(id);
  }, [copied]);

  const open = (a: Assistant) => (e: React.MouseEvent) => {
    if (a.prefill) return; // the link carries the prompt
    e.preventDefault();
    const go = () => window.open(a.url, "_blank", "noopener,noreferrer");
    navigator.clipboard.writeText(PROMPT).then(() => {
      setCopied(a.name);
      cue("success", { emphasis: "subtle" });
      go();
    }, go);
  };

  return (
    <div className="ask-ai">
      <p className="ask-ai-label">
        ask your ai
        <span className="ask-ai-note" aria-live="polite">
          <Morph
            value={
              copied
                ? `prompt copied, paste it into ${copied}`
                : "opens with a prompt to explain kiban"
            }
            duration={420}
            prose
          />
        </span>
      </p>
      <ul className="ask-ai-list">
        {ASSISTANTS.map((a) => (
          <li key={a.id}>
            <a
              className="ask-ai-item"
              href={a.prefill ? `${a.url}${encodeURIComponent(PROMPT)}` : a.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={open(a)}
              aria-label={`Ask ${a.name} to explain kiban`}
              title={a.name}
              data-cuelume-navigate
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                fillRule="evenodd"
                aria-hidden="true"
                dangerouslySetInnerHTML={{ __html: a.svg }}
              />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
