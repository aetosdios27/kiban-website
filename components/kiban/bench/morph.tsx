"use client";

import Scritto from "@scritto/react";

// A value that morphs when it changes. Assistive technology reads the plain copy.
export function Morph({ value }: { value: string }) {
  return (
    <>
      <span className="visually-hidden">{value}</span>
      <span aria-hidden="true">
        <Scritto
          value={value}
          trend={0}
          transition={{ duration: 520 }}
          respectMotionPreference
        />
      </span>
    </>
  );
}
