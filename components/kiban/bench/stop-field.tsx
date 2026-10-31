"use client";

import { DitherShader } from "@/lib/dither";

// Rings leaving L0, where a stopped second is felt. Runs only during a stop.
const RIPPLE = `
float field(vec2 uv, vec2 res, float t) {
  vec2 p = (uv - vec2(0.46, 0.72)) * vec2(res.x / res.y, 1.0);
  float r = length(p * vec2(1.0, 1.7));
  return (0.5 + 0.5 * sin(r * 26.0 - t * 5.0)) * smoothstep(0.62, 0.08, r) * 0.7;
}`;

export function StopField({ on }: { on: boolean }) {
  return (
    <DitherShader
      className="tree-stopfield"
      data-on={on || undefined}
      field={RIPPLE}
      palette={["--background", "--destructive"]}
      cell={4}
      animate={on}
    />
  );
}
