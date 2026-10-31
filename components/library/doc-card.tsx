"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { DitherShader } from "@/lib/dither";
import { cardField } from "@/lib/library/card-fields";

// Each document has its own dither, which plays in the card's empty corner
// while it is hovered. Only the hovered card holds a shader.
const FADE_MS = 240;

export function DocCard({
  slug,
  children,
}: {
  slug: string;
  children: ReactNode;
}) {
  const [live, setLive] = useState(false);
  const [shown, setShown] = useState(false);
  const leaving = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(leaving.current), []);

  const enter = () => {
    clearTimeout(leaving.current);
    setLive(true);
    setShown(true);
  };
  const leave = () => {
    setShown(false);
    leaving.current = setTimeout(() => setLive(false), FADE_MS);
  };

  return (
    <Link
      href={`/library/${slug}`}
      className="lib-card"
      onPointerEnter={(e) => e.pointerType === "mouse" && enter()}
      onPointerLeave={leave}
      onFocus={(e) => e.currentTarget.matches(":focus-visible") && enter()}
      onBlur={leave}
    >
      {live && (
        <DitherShader
          className="lib-card-field"
          data-shown={shown || undefined}
          field={cardField(slug)}
          cell={2}
          fps={30}
          stillTime={4}
        />
      )}
      {children}
    </Link>
  );
}
