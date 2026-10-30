"use client";

import Lenis from "lenis";
import { useEffect } from "react";

// Wheel and trackpad input glide instead of stepping. Touch keeps native
// scrolling, and reduced-motion visitors never start the loop.
export function SmoothScroll() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ anchors: true, lerp: 0.11 });
    let frame = requestAnimationFrame(function loop(time) {
      lenis.raf(time);
      frame = requestAnimationFrame(loop);
    });
    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);
  return null;
}
