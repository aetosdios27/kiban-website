"use client";

import { DitherShader } from "@/lib/dither";

// Four slow strata, densest at the right edge: the LSM levels as weather.
const STRATA = `
float field(vec2 uv, vec2 res, float t) {
  float tone = 0.0;
  for (int i = 0; i < 4; i++) {
    float f = float(i);
    float line = 0.2 + f * 0.2 + 0.05 * sin(uv.x * (3.0 + f) + t * (0.18 + f * 0.05) + f * 2.0);
    tone = max(tone, smoothstep(0.1, 0.0, abs(uv.y - line)) * (0.82 - f * 0.15));
  }
  return tone * smoothstep(0.08, 0.72, uv.x);
}`;

export function LibraryField() {
  return (
    <DitherShader
      className="lib-field"
      field={STRATA}
      cell={4}
      fps={24}
      speed={0.8}
    />
  );
}
