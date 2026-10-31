"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Every article opens at its start, including on the way back.
export function ScrollReset() {
  const pathname = usePathname();
  useEffect(() => {
    history.scrollRestoration = "manual";
    return () => {
      history.scrollRestoration = "auto";
    };
  }, []);
  useEffect(() => {
    if (!location.hash) scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}
