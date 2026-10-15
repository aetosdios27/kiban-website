import { play, type PlayOptions, type SoundName } from "cuelume";

// One place for interface sounds. Cuelume synthesises them live with Web
// Audio; nothing plays until the visitor has interacted with the page, and
// the header toggle turns everything off (remembered in localStorage).

export const SOUND_KEY = "kiban:sound";

export const soundPreferred = () =>
  typeof localStorage === "undefined" ||
  localStorage.getItem(SOUND_KEY) !== "off";

export function cue(name: SoundName, options?: PlayOptions) {
  if (soundPreferred()) play(name, options);
}

// Several numbers roll at once; they share one rising breath.
let lastCount = 0;
export function cueCount(duration: number) {
  const now = performance.now();
  if (now - lastCount < 1500) return;
  lastCount = now;
  cue("count", { duration, emphasis: "subtle" });
}
