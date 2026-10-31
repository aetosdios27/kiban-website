"use client";

import Link from "next/link";
import { resources, rows, sweep } from "@/lib/kiban/bench";
import { NextRead } from "../next-read";
import { Term } from "../term";
import { Mark, Story } from "./kit";
import { PathFigure, type Stop } from "./path";

const WRITE_STOPS: Stop[] = [
  { name: "memtable", where: "memory" },
  { name: "write-ahead log", where: "disk" },
  { name: "frozen memtable", where: "memory" },
  { name: "new SST", where: "disk" },
  { name: "MANIFEST", where: "disk" },
  { name: "lower levels", where: "disk" },
];

const WRITE = [
  {
    title: "put returns",
    at: [0, 1],
    verdict: "not yet",
    body: (
      <p>
        The record is appended to the <Term id="WAL" />, the{" "}
        <Term id="memtable" /> is updated, and the call returns.{" "}
        <Mark>That return is not a promise.</Mark> The log is still buffered,
        and a crash here can lose the record. Kiban says so in its API instead
        of hiding it.
      </p>
    ),
  },
  {
    title: "sync makes the promise",
    at: [1],
    verdict: "yes",
    safe: true,
    body: (
      <p>
        <code>sync()</code> is the line between accepted and durable. It covers
        every write accepted so far, in every live log file. If a sync fails,
        the engine refuses further writes until it is reopened, because it can
        no longer say what the disk holds.
      </p>
    ),
  },
  {
    title: "the memtable freezes",
    at: [2],
    verdict: "yes, through the log",
    safe: true,
    body: (
      <p>
        When enough has been written, the memtable freezes and a new one takes
        over with a new log. The old log has to stay alive, and still be
        syncable, because it is the only durable copy of that data. Getting this
        wrong was one of our worst bugs.
      </p>
    ),
  },
  {
    title: "a file nobody will change",
    at: [3],
    verdict: "yes, through the log",
    safe: true,
    body: (
      <p>
        The frozen memtable is written out as a sorted <Term id="SST" /> and
        synced. The record is now in two places, and neither has been let go.
        The file exists, but nothing refers to it yet.
      </p>
    ),
  },
  {
    title: "one atomic switch",
    at: [4],
    verdict: "yes, in the SST",
    safe: true,
    body: (
      <p>
        The <Term id="MANIFEST" /> names every live file. A new one goes to a
        temporary file, gets synced, renamed into place, and the directory is
        synced. That rename is the commit point.{" "}
        <Mark>Only after it can the old log be retired.</Mark>
      </p>
    ),
  },
  {
    title: "compaction moves it down",
    at: [5],
    verdict: "yes, in the SST",
    safe: true,
    body: (
      <p>
        <Term id="compaction" /> merges files into lower levels, where key
        ranges never overlap. It builds new files outside the engine&apos;s main
        lock, then applies the change through the same MANIFEST switch. Nothing
        is deleted until nothing can still need it.
      </p>
    ),
  },
];

const READ_STOPS: Stop[] = [
  { name: "read view", where: "memory" },
  { name: "active memtable", where: "memory" },
  { name: "frozen memtable", where: "memory" },
  { name: "one table per level", where: "disk" },
  { name: "newest visible version", where: "memory" },
];

const READ = [
  {
    title: "take a consistent view",
    at: [0],
    verdict: "nothing yet",
    body: (
      <p>
        A read starts by capturing a published view of the database: which
        memtables and which files count. Writers can keep moving. This read will
        answer from the state it captured.
      </p>
    ),
  },
  {
    title: "check memory first",
    at: [1, 2],
    verdict: "newest writes live here",
    body: (
      <p>
        The active memtable holds the newest data, then the frozen one. A later
        log means a later sequence number, so a match here wins and the read is
        done.
      </p>
    ),
  },
  {
    title: "one table per level",
    at: [3],
    verdict: "one candidate each",
    body: (
      <p>
        Below <Term id="L0" />, files in a level never overlap, so a binary
        search on first keys finds the only table that could hold the key.
        Inside it, the <Link href="/library/perfect-hash">perfect hash</Link>{" "}
        computes the record&apos;s location instead of searching for it.
      </p>
    ),
  },
  {
    title: "sequence decides",
    at: [4],
    verdict: "highest visible sequence",
    safe: true,
    body: (
      <p>
        Finding the key is not enough. Which level a file sits in does not prove
        which value is newest, so the read compares sequence numbers and takes
        the highest one it is allowed to see.{" "}
        <Mark>A newer delete wins too.</Mark> The <Term id="tombstone" /> hides
        everything older, and the key reads as missing.
      </p>
    ),
  },
];

export function ArchitectureEssay() {
  const point = rows.find((row) => row.id === "point")!;
  const group = sweep.series["kiban-group"].at(-1)!;
  const alone = sweep.series["kiban-sync"].at(-1)!;
  const rocks = point.rivals.rocksdb!;
  return (
    <main id="main-content" className="es">
      <header className="es-head">
        <p className="lib-crumb">
          <Link href="/library">library</Link> · start here
        </p>
        <h1>
          how it is <span className="px">built.</span>
        </h1>
        <p className="es-lead">
          Follow one write until it is safe, then one read until it is right.
          Most of a storage engine is deciding exactly when you are allowed to
          say yes.
        </p>
        <p className="lib-meta">
          8 min read · kiban v0.2.0 ·{" "}
          <Link href="/library/architecture/report">
            the full architecture reference
          </Link>
        </p>
      </header>

      <div className="es-body">
        <p>
          Kiban is an embedded <Term id="LSM">LSM-tree</Term> storage engine in
          Rust. There is no server. Your program links the library, owns a
          directory, and stores ordered byte keys and byte values. An exclusive
          lock on that directory means one owner at a time, even across
          processes.
        </p>
        <p>
          The LSM idea is simple: never edit data in place. New writes go to a
          log and to memory, and memory is written out as sorted files that
          never change again. Everything hard comes from one fact. For a while,
          the same data exists in several places, and at every moment the engine
          must know which copy it can trust.
        </p>
        <h2>one write</h2>
        <p>
          Watch the question on the figure. It is the only one that matters: if
          the power went out right now, would this record survive?
        </p>
      </div>

      <Story
        steps={WRITE}
        figure={(step) => (
          <PathFigure
            stops={WRITE_STOPS}
            at={WRITE[step].at}
            label="survives a crash?"
            verdict={WRITE[step].verdict}
            safe={WRITE[step].safe}
          />
        )}
      />

      <div className="es-body">
        <p>
          Syncing is slow, and that is where <Term id="group commit" /> comes
          in. Writers that arrive while a sync is running wait together, and the
          next sync covers them all. At 16 writers, kiban reaches{" "}
          <b>{Math.round(group.ops).toLocaleString("en")}</b> synced writes a
          second with <b>{Math.round(group.syncs)}</b> syncs. Without grouping
          it manages {Math.round(alone.ops).toLocaleString("en")} a second and
          needs {Math.round(alone.syncs).toLocaleString("en")} syncs. Every
          write is still synced before it returns.
        </p>
        <h2>one read</h2>
        <p>
          Reads have the opposite problem. The record may be in several places
          at once, in different versions, and the engine has to return the right
          one quickly.
        </p>
      </div>

      <Story
        steps={READ}
        figure={(step) => (
          <PathFigure
            stops={READ_STOPS}
            at={READ[step].at}
            label="answer"
            verdict={READ[step].verdict}
            safe={READ[step].safe}
          />
        )}
      />

      <div className="es-body">
        <p>
          A cached point read over a million records takes a median of{" "}
          <b>{(point.kiban as { p50: number }).p50.toFixed(2)} µs</b>,{" "}
          {rocks.ratio.toFixed(1)}× faster than tuned <Term id="RocksDB" /> in
          the same campaign.{" "}
          <Link href="/library/perfect-hash">The perfect hash essay</Link>{" "}
          explains how, and that speed depends on a warm cache.
        </p>

        <h2>what broke</h2>
        <p>
          The diagrams above are tidy because each line was paid for. These are
          three of the failures that scale testing found in our own engine.
        </p>
        <h3>a sync that lied</h3>
        <p>
          When a memtable froze, its log file stayed listed as live, but the
          object that wrote to it was dropped. Dropping it did not sync it. The
          next <code>sync()</code> covered only the new log, so it could report
          success for records that a power cut would erase. Now the frozen
          memtable owns its log writer, and sync covers both.{" "}
          <Mark>
            A successful sync now covers every accepted write until a committed
            SST replaces its log.
          </Mark>
        </p>
        <h3>a snapshot that lost its data</h3>
        <p>
          A <Term id="snapshot" /> kept its sequence number and file list, but
          read the engine&apos;s current memtables. Once its data was flushed,
          that data was in neither place. The fix made snapshots own their
          sources. Then testing found a second cause: moving a file between
          levels created a new record for the same physical file, so a pinned
          file could still be deleted. A real filesystem reproduced it with no
          crash at all.
        </p>
        <h3>a read that disagreed with a scan</h3>
        <p>
          Versions of one key can span search intervals inside a block, and
          lookup could start too late and skip the newest ones. A reproduction
          with 40 updates returned value 8 from a point read while a scan
          correctly returned 40. It could skip a delete as well. Lookup was
          corrected, and every read path now uses the same sequence rule.
        </p>

        <h2>how we check</h2>
        <p>
          Every fix above has a regression test. Beyond those, a simulated
          device loses unsynced data on command, crash suites run across
          millions of seeds, processes are killed and reopened for 1,000 cycles,
          and Loom explores thread orderings in the custom locking.
        </p>
        <p>
          The limits matter just as much. Killing a process keeps the OS cache,
          so it is not a real power cut. The device and concurrency models are
          bounded.{" "}
          <Mark>
            None of this proves kiban correct, and it does not make it
            production-ready.
          </Mark>{" "}
          It is evidence, and all of it is published.
        </p>

        <h2>what it costs</h2>
        <ul className="es-costs">
          <li>
            <b>{resources.kiban.rss_mib} MiB</b>
            <span>
              peak memory on the 1M run, against {resources.rocksdb.rss_mib} for
              RocksDB
            </span>
          </li>
          <li>
            <b>{resources.kiban.disk_mib} MiB</b>
            <span>
              on disk for 1M records, against {resources.rocksdb.disk_mib}
            </span>
          </li>
          <li>
            <b>3×</b>
            <span>
              roughly how much sooner RocksDB finishes long write runs
            </span>
          </li>
          <li>
            <b>none</b>
            <span>
              of transactions, compression, reverse iterators or range deletes
              yet
            </span>
          </li>
        </ul>
        <p>
          Kiban runs on Linux and makes no API or format promise before 1.0. It
          is an early engine with its losses in the open.
        </p>

        <aside className="es-end">
          <p>Want every invariant and limit, in full?</p>
          <Link href="/library/architecture/report">
            read the architecture reference
          </Link>
        </aside>
      </div>
      <NextRead slug="architecture" />
    </main>
  );
}
