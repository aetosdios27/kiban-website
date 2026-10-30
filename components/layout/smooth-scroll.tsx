"use client";

import Lenis, { type VirtualScrollData } from "lenis";
import { useEffect } from "react";

let lenis: Lenis | null = null;
let gate: ((data: VirtualScrollData) => boolean) | null = null;

/** Lets a pinned scene claim wheel input; return false to swallow an event. */
export function setScrollGate(next: typeof gate) {
  gate = next;
}

/** Moves the page at once, keeping Lenis in step with it. */
export function scrollPage(y: number) {
  if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
  else scrollTo({ top: y, behavior: "instant" });
}

export const pageScrollTarget = () => lenis?.targetScroll ?? scrollY;

// Wheel and trackpad input glide instead of stepping. Touch keeps native
// scrolling, and reduced-motion visitors never start the loop.
export function SmoothScroll() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const instance = new Lenis({
      anchors: true,
      lerp: 0.11,
      virtualScroll: (data) => (gate ? gate(data) : true),
    });
    lenis = instance;
    let frame = requestAnimationFrame(function loop(time) {
      instance.raf(time);
      frame = requestAnimationFrame(loop);
    });
    return () => {
      cancelAnimationFrame(frame);
      instance.destroy();
      lenis = null;
    };
  }, []);
  return null;
}
