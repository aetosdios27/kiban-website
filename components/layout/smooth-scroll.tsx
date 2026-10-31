"use client";

import Lenis, { type VirtualScrollData } from "lenis";
import { useEffect } from "react";

let lenis: Lenis | null = null;
type ScrollGate = (data: VirtualScrollData) => boolean;
const gates = new Set<ScrollGate>();

/** Lets a scene shape or claim wheel input; return false to swallow an event. */
export function addScrollGate(gate: ScrollGate) {
  gates.add(gate);
  return () => {
    gates.delete(gate);
  };
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
      virtualScroll: (data) => [...gates].every((gate) => gate(data)),
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
