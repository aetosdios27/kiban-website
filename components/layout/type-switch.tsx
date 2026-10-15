"use client";

import { useEffect, useState } from "react";

// A review aid for the type rethink: /?type=proposed swaps the whole site to
// the candidate stack (Mona Sans, Departure Mono, Commit Mono) and shows a
// switch to flip between the two. Without the parameter it renders nothing.
type Stack = "current" | "proposed";

export function TypeSwitch() {
  const [stack, setStack] = useState<Stack | null>(null);

  useEffect(() => {
    const param = new URLSearchParams(location.search).get("type");
    if (param !== "current" && param !== "proposed") return;
    // Reading the URL is a one-off sync from outside React.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStack(param);
  }, []);

  useEffect(() => {
    if (!stack) return;
    document.documentElement.dataset.type = stack;
    const url = new URL(location.href);
    url.searchParams.set("type", stack);
    history.replaceState(null, "", url);
  }, [stack]);

  if (!stack) return null;
  return (
    <div className="type-switch" role="group" aria-label="Type stack">
      {(["current", "proposed"] as const).map((s) => (
        <button
          key={s}
          type="button"
          aria-pressed={stack === s}
          onClick={() => setStack(s)}
          data-cuelume-select
        >
          {s}
        </button>
      ))}
    </div>
  );
}
