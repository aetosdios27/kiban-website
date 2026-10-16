import { AfterWriteDiagram } from "@/components/kiban/after-write-diagram";
import { WriteDiagram } from "@/components/kiban/write-diagram";
import { CorrectnessStats } from "@/components/kiban/correctness-stats";
import { ArchitectureDiagram } from "@/components/kiban/architecture-diagram";
import { SectionHead } from "@/components/kiban/section-head";
import { AskAi } from "@/components/kiban/ask-ai";
import { HeroInstall } from "@/components/kiban/hero-install";
import { Quickstart } from "@/components/kiban/quickstart";
import { Guarantees } from "@/components/kiban/guarantees";
import { VersusRocksdb } from "@/components/kiban/versus-rocksdb";
import { LsmAscii } from "@/components/kiban/lsm-ascii";
import {
  getFacts,
  getExamples,
  getInstall,
  heroStatement,
} from "@/lib/kiban/facts";
import { Status } from "@/components/kiban/status";
import { ArrowDown } from "pixelarticons/react";

export const revalidate = 3600;

export default async function Home() {
  const facts = await getFacts();
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
          <p className="hero-statement" style={{ overflowWrap: "anywhere" }}>
            {heroStatement(facts)}
          </p>
          <AskAi />
          <HeroInstall {...getInstall(facts)} />
          <a className="mono-link" href="#quickstart">
            see it in code
            <ArrowDown className="icon icon-drop" aria-hidden="true" />
          </a>
        </div>
        <div className="hero-art">
          <LsmAscii />
        </div>
      </section>
      <Quickstart examples={getExamples(facts)} specs={facts.specs} />
      <Guarantees facts={facts} />
      <CorrectnessStats facts={facts} />
      <VersusRocksdb facts={facts} />
      <section
        id="write-path"
        className="section"
        aria-labelledby="write-title"
      >
        <SectionHead
          index="05"
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
          index="06"
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
      <Status facts={facts} />
    </main>
  );
}
