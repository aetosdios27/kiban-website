"use client";

import { useState } from "react";
import { CopyButton } from "@/components/animate-ui/components/buttons/copy";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/animate-ui/components/radix/toggle-group";
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
  const m = methods[method];

  return (
    <div id="installation" className="hero-install">
      <div className="flex max-w-[520px] items-center justify-between gap-4">
        <ToggleGroup
          type="single"
          value={method}
          onValueChange={(v) => v && setMethod(v as Method)}
          aria-label="Install method"
          className="install-toggle"
        >
          {(Object.keys(methods) as Method[]).map((id) => (
            <ToggleGroupItem
              key={id}
              value={id}
              className="install-toggle-item"
            >
              {id}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
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
        <CopyButton
          content={m.command}
          delay={1600}
          aria-label={`Copy the ${method} command`}
          className="install-copy"
        />
      </div>
    </div>
  );
}
