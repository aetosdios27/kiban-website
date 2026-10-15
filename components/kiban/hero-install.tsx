"use client";

import { Check, Copy } from "pixelarticons/react";
import { ToggleGroup } from "radix-ui";
import { useEffect, useState } from "react";
import { cue } from "@/lib/kiban/sound";
import { ENGINE_COMMIT } from "@/lib/kiban/source";

// The one place to install from. Both commands are pinned to the reviewed
// commit; the bar shows a short form and copies the full command.
const methods = {
  cargo: {
    shown: "cargo add kiban --git github.com/aetosdios27/kiban",
    command: `cargo add kiban --git https://github.com/aetosdios27/kiban --rev ${ENGINE_COMMIT}`,
  },
  source: {
    shown: "git clone github.com/aetosdios27/kiban && cargo build",
    command: `git clone https://github.com/aetosdios27/kiban.git\ncd kiban\ngit checkout ${ENGINE_COMMIT}\ncargo build --release --locked`,
  },
} as const;
type Method = keyof typeof methods;

export function HeroInstall() {
  const [method, setMethod] = useState<Method>("cargo");
  const [copied, setCopied] = useState(false);
  const m = methods[method];

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(id);
  }, [copied]);

  const copy = () =>
    navigator.clipboard.writeText(m.command).then(
      () => {
        setCopied(true);
        cue("success", { emphasis: "subtle" });
      },
      () => {}, // Blocked clipboard: the full command is in the bar's title.
    );

  return (
    <div id="installation" className="hero-install">
      <div className="flex max-w-[520px] items-center justify-between gap-4">
        <ToggleGroup.Root
          type="single"
          value={method}
          onValueChange={(v) => {
            if (!v) return;
            setMethod(v as Method);
            setCopied(false);
          }}
          aria-label="Install method"
          className="install-toggle"
        >
          {(Object.keys(methods) as Method[]).map((id) => (
            <ToggleGroup.Item
              key={id}
              value={id}
              className="install-toggle-item"
              data-cuelume-select
            >
              {id}
            </ToggleGroup.Item>
          ))}
        </ToggleGroup.Root>
        <span className="install-pin">
          pinned to {ENGINE_COMMIT.slice(0, 7)}
        </span>
      </div>
      <div className="install-bar">
        <code title={m.command}>
          <span className="install-prompt" aria-hidden="true">
            $
          </span>
          {m.shown}
        </code>
        <button
          type="button"
          className="install-copy"
          onClick={copy}
          aria-label={copied ? "Copied" : `Copy the ${method} command`}
        >
          {copied ? (
            <Check className="icon" aria-hidden="true" />
          ) : (
            <Copy className="icon" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}
