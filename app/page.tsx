import { AfterWriteDiagram } from "@/components/kiban/after-write-diagram";
import { WriteDiagram } from "@/components/kiban/write-diagram";
import { CorrectnessStats } from "@/components/kiban/correctness-stats";
import { ArchitectureDiagram } from "@/components/kiban/architecture-diagram";
import { SectionHead } from "@/components/kiban/section-head";
import { AskAi } from "@/components/kiban/ask-ai";
import { HeroInstall } from "@/components/kiban/hero-install";
import { LsmAscii } from "@/components/kiban/lsm-ascii";
import { ArrowDown } from "pixelarticons/react";

export default function Home() {
  return (
    <main id="main-content">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="chip">
            <span className="chip-mark" aria-hidden="true" /> kiban · 基盤 · n.
            foundation
          </p>
          <h1 id="hero-title">
            a storage engine, built from <span className="px">scratch.</span>
          </h1>
          <p className="hero-statement">
            kiban is an embedded LSM-tree key-value store for Linux, written in
            Rust: a write-ahead log, memtables, SSTs, leveled compaction,
            snapshots and crash recovery.
          </p>
          <AskAi />
          <HeroInstall />
          <a className="mono-link" href="#write-path">
            follow a write
            <ArrowDown className="icon icon-drop" aria-hidden="true" />
          </a>
        </div>
        <div className="hero-art">
          <LsmAscii />
        </div>
      </section>
      <CorrectnessStats />
      <section
        id="write-path"
        className="section"
        aria-labelledby="write-title"
      >
        <SectionHead
          index="02"
          label="Write path"
          id="write-title"
          title={
            <>
              follow a <span className="px">write.</span>
            </>
          }
        >
          One <code>put()</code>, from the log to memory to a sorted file on
          disk.
        </SectionHead>
        <div className="section-body">
          <WriteDiagram />
        </div>
      </section>
      <section
        id="after-write"
        className="section"
        aria-labelledby="after-title"
      >
        <SectionHead
          index="03"
          label="After put()"
          id="after-title"
          title={
            <>
              what happens after <span className="px">put()?</span>
            </>
          }
        >
          The work that follows a write: compaction, snapshots, file cleanup,
          and recovery after a crash.
        </SectionHead>
        <div className="section-body">
          <AfterWriteDiagram />
        </div>
      </section>
      <ArchitectureDiagram />
    </main>
  );
}
