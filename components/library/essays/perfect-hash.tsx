"use client";

import Link from "next/link";
import { rows } from "@/lib/kiban/bench";
import { Term } from "../term";
import { Bars, Mark, Story } from "./kit";
import { TraceFigure } from "./trace";

const point = rows.find((row) => row.id === "point")!;

const STEPS = [
  {
    title: "a read begins",
    body: (
      <p>
        An application asks for one record. It is sitting in memory, already
        cached. Nothing touches the disk. So why does it take any time at all?
      </p>
    ),
  },
  {
    title: "memory is the wall",
    body: (
      <p>
        Every stop means following a pointer to somewhere new in memory. We
        timed it: one uncached memory load costs about <b>161 ns</b>. Two cost
        332 ns. Eight cost 1,317 ns. It is almost perfectly linear, so{" "}
        <Mark>the cost of a read is how many places it has to visit.</Mark>
      </p>
    ),
  },
  {
    title: "five stops",
    body: (
      <p>
        A sorted file makes the CPU search. Check the <Term id="Bloom filter" />
        , search the index, find the block, search inside it, decode the entry.
        Each step is sensible. Together they are a long walk for one small
        record.
      </p>
    ),
  },
  {
    title: "a hash, not a search",
    body: (
      <p>
        An <Term id="SST" /> never changes once written, and that is the
        opening. If you know every key in advance, you can build a{" "}
        <Term id="MPHF">perfect hash</Term>: every key gets its own slot, with
        no collisions. The key computes where it lives. Nothing is searched.
      </p>
    ),
  },
  {
    title: "reject the impostors",
    body: (
      <p>
        A perfect hash only knows the keys it was built from, so a missing key
        still lands on some slot. A 16-bit <Term id="fingerprint" /> beside the
        slot throws out nearly all of those cheaply.
      </p>
    ),
  },
  {
    title: "prove it, then return it",
    body: (
      <p>
        The slot points straight at the record. A full-key compare proves the
        match, so a hit is never a guess. Three stops, and the value is on its
        way back.
      </p>
    ),
  },
];

export function PerfectHashEssay() {
  const lmdb = point.rivals.lmdb as { p50: number; ratio: number };
  const rocks = point.rivals.rocksdb as { p50: number };
  const sqlite = point.rivals.sqlite as { p50: number };
  return (
    <main id="main-content" className="es">
      <header className="es-head">
        <p className="lib-crumb">
          <Link href="/library">library</Link> · how it got fast
        </p>
        <h1>
          the perfect <span className="px">hash.</span>
        </h1>
        <p className="es-lead">
          LSM trees are not supposed to beat <Term id="B+tree">B+trees</Term> at
          reading. Kiban does, because of one thing they have that a B+tree
          never will: files that never change.
        </p>
        <p className="lib-meta">
          6 min read ·{" "}
          <Link href="/library/perfect-hash/report">
            the full report behind this story
          </Link>
        </p>
      </header>

      <div className="es-body">
        <p>
          <Term id="LMDB" /> is the read-speed benchmark for embedded storage.
          It was also the one engine kiban could not catch. After every
          optimisation we could find, a cached point read still sat well behind
          it, and the profile had stopped pointing at anything obvious.
        </p>
        <p>
          The usual suspects were innocent. Hashing took a fraction of the time.
          The real cost was somewhere less obvious.
        </p>
      </div>

      <Story steps={STEPS} figure={(step) => <TraceFigure step={step} />} />

      <div className="es-body">
        <h2>did it actually work?</h2>
        <p>
          An experiment is cheap to believe in, so we tried to kill this one. We
          built the same data twice and searched one copy with plain binary
          search. It took <b>2,851 ns</b>. The hash took <b>465 ns</b>.{" "}
          <Mark>
            The gain was the hash itself, not a side effect of the new layout.
          </Mark>
        </p>
        <p>
          Then it went into the real engine, with snapshots, versions and every
          safety check. Point reads went from 2.05 µs to 1.15 µs, and throughput
          from about 480k to 853k reads a second.
        </p>
        <Bars
          unit="µs"
          rows={[
            {
              name: "kiban",
              value: (point.kiban as { p50: number }).p50,
              lead: true,
            },
            { name: "LMDB", value: lmdb.p50 },
            { name: "SQLite", value: sqlite.p50 },
            { name: "RocksDB", value: rocks.p50 },
          ]}
          note="Median cached point read, 1M records, normal layout. Five paired trials at one commit. Shorter is faster."
        />
        <p>
          Kiban now answers a cached point read{" "}
          <Mark>{lmdb.ratio.toFixed(1)}× faster than LMDB</Mark> in this
          benchmark. A B+tree cannot make the same move, because its pages
          change in place and a perfect hash has to be built from a key set that
          holds still.
        </p>

        <h2>what it costs</h2>
        <p>
          Nothing here is free, and pretending otherwise would be the fastest
          way to lose your trust.
        </p>
        <ul className="es-costs">
          <li>
            <b>1.36×</b>
            <span>slower flushes, because every new file builds its index</span>
          </li>
          <li>
            <b>1.26×</b>
            <span>slower compaction builds, for the same reason</span>
          </li>
          <li>
            <b>+9%</b>
            <span>more disk, after PH3 cut the index by 61%</span>
          </li>
          <li>
            <b>2×+</b>
            <span>
              slower on one 100M read run with a 33 MiB cache, where it halves
              throughput
            </span>
          </li>
        </ul>
        <p>
          That last one is unresolved, and we would rather show it than bury it.
          It is exactly the kind of thing the next round of work is for.
        </p>

        <aside className="es-end">
          <p>Want every trial, range and caveat?</p>
          <Link href="/library/perfect-hash/report">
            read the original report
          </Link>
        </aside>
      </div>
    </main>
  );
}
