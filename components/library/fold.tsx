"use client";

import { useState, type ReactNode } from "react";

// Long tables start short: a reader chooses to go deeper.
export function Fold({
  rows,
  children,
}: {
  rows: number;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lib-table" data-open={open || undefined}>
      <div className="lib-table-scroll">{children}</div>
      <button type="button" className="lib-fold" onClick={() => setOpen(!open)}>
        {open ? "show fewer rows" : `show all ${rows} rows`}
      </button>
    </div>
  );
}
