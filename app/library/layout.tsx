import type { ReactNode } from "react";
import { ScrollReset } from "@/components/library/scroll-reset";

export default function LibraryLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ScrollReset />
      {children}
    </>
  );
}
