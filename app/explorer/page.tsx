import type { Metadata } from "next";
import { ExplorerShell } from "@/components/kiban/explorer-shell";

export const metadata: Metadata = {
  title: "Explorer",
  description:
    "The foundation for Kiban Explorer. Engine visualization, state inspection, and event playback are in development.",
};

export default function ExplorerPage() {
  return <ExplorerShell />;
}
