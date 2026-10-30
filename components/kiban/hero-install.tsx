"use client";

import { Check, Copy } from "pixelarticons/react";
import { ToggleGroup } from "radix-ui";
import { useEffect, useState } from "react";
import { Morph } from "./bench/morph";
import { cue } from "@/lib/kiban/sound";
import type { InstallMethods } from "@/lib/kiban/facts";

type Method = keyof InstallMethods;

export function HeroInstall({
  methods,
  tag,
  note,
}: {
  methods: InstallMethods;
  tag: string;
  note: string;
}) {
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
    <div id="installation" className="hero-install install">
      <div className="install-head">
        <ToggleGroup.Root
          type="single"
          value={method}
          onValueChange={(v) => {
            if (!v) return;
            setMethod(v as Method);
            setCopied(false);
          }}
          aria-label="Install method"
          className="install-tabs"
        >
          {(Object.keys(methods) as Method[]).map((id) => (
            <ToggleGroup.Item
              key={id}
              value={id}
              className="install-tab"
              data-cuelume-select
            >
              {id}
            </ToggleGroup.Item>
          ))}
        </ToggleGroup.Root>
        <span
          className="install-pin"
          style={{ minWidth: 0, overflowWrap: "anywhere" }}
        >
          {tag}
          {note}
        </span>
      </div>
      <div className="install-bar">
        <code title={m.command}>
          <span className="install-prompt" aria-hidden="true">
            $
          </span>
          <Morph value={m.shown} duration={420} />
        </code>
        <button
          type="button"
          className="install-copy"
          onClick={copy}
          data-copied={copied || undefined}
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
