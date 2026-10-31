"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { scrollPage } from "@/components/layout/smooth-scroll";

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
    if (!location.hash) scrollPage(0);
  }, [pathname]);
  return null;
}
