"use client";

import { bind, setEnabled, unlock } from "cuelume";
import { useEffect, useSyncExternalStore } from "react";
import { SOUND_KEY, cue, soundPreferred } from "@/lib/kiban/sound";

// Wires every data-cuelume-* control on the page, and lets the visitor
// switch interface sounds off. The choice is remembered.
const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    removeEventListener("storage", cb);
  };
}

export function SoundToggle() {
  const on = useSyncExternalStore(subscribe, soundPreferred, () => true);

  useEffect(() => setEnabled(on), [on]);
  useEffect(() => bind(), []);

  const toggle = () => {
    localStorage.setItem(SOUND_KEY, on ? "off" : "on");
    listeners.forEach((cb) => cb());
    if (!on) {
      setEnabled(true);
      unlock().then(() => cue("toggle"));
    }
  };

  return (
    <button
      type="button"
      className="sound-toggle"
      onClick={toggle}
      aria-pressed={on}
      aria-label="Interface sounds"
      title={on ? "sound on" : "sound off"}
    >
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="sound-bar" aria-hidden="true" />
      ))}
    </button>
  );
}
