"use client";

import Link from "next/link";
import { ArrowRight } from "pixelarticons/react";
import { useState } from "react";
import { CATALOG } from "@/lib/library/catalog";
import { DitherShader } from "@/lib/dither";

// Chevrons streaming toward the next article: still until the reader leans in.
const CHEVRONS = `
float field(vec2 uv, vec2 res, float t) {
  float x = uv.x * 9.0 - t * 1.6 - abs(uv.y - 0.5) * 4.0;
  float band = abs(fract(x) - 0.5);
  return smoothstep(0.34, 0.08, band) * smoothstep(0.0, 0.75, uv.x) * 0.9;
}`;

export function NextRead({ slug }: { slug: string }) {
  const [on, setOn] = useState(false);
  const index = CATALOG.findIndex((entry) => entry.slug === slug);
  const next = CATALOG[(index + 1) % CATALOG.length];
  return (
    <Link
      href={`/library/${next.slug}`}
      className="next page-width"
      data-on={on || undefined}
      onPointerEnter={() => setOn(true)}
      onPointerLeave={() => setOn(false)}
      onFocus={() => setOn(true)}
      onBlur={() => setOn(false)}
    >
      <DitherShader
        className="next-field"
        field={CHEVRONS}
        cell={5}
        animate={on}
        stillTime={2}
      />
      <span className="next-label">
        next read <ArrowRight className="icon" aria-hidden="true" />
      </span>
      <span className="next-title">
        {next.title[0]} <span className="px">{next.title[1]}</span>
      </span>
      <small>{next.dek}</small>
    </Link>
  );
}
