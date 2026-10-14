"use client";

import {
  Box,
  Card,
  IsoFigure,
  Marker,
  Plate,
  Step,
  iso,
  type Pt,
} from "./iso-kit";

// One write, drawn as two places: memory (fast, lost if the process dies) on
// an upper plate, disk (survives a crash) on a lower one. The record
// pear = green is shown, in plain text, everywhere it lands.

const MEM: Pt = [300, 92];
const DISK: Pt = [560, 316];

export const writeSteps = [
  {
    title: "Log it",
    body: "put() appends the change to the write-ahead log, a file on disk. Once sync() returns, it survives a crash.",
  },
  {
    title: "Remember it",
    body: "The same change goes into the memtable: a table in memory, kept in key order so reads are fast.",
  },
  {
    title: "Freeze it",
    body: "When the memtable fills up, it is frozen. A fresh memtable and a fresh log take new writes.",
  },
  {
    title: "Write it down, sorted",
    body: "The frozen table is written to disk as a sorted file, an SST, and synced.",
  },
  {
    title: "Make it official",
    body: "The MANIFEST, kiban's list of live files, records the new SST. Now it is part of the database.",
  },
  {
    title: "Clean up",
    body: "The old log is no longer needed for these changes, so it is deleted.",
  },
];

export function WriteDiagram() {
  // Anchor points, all derived from the plates.
  const memtableTop = iso(MEM, 95, 75, 22);
  const frozenTop = iso(MEM, 265, 75, 22);
  const memtableLeft = iso(MEM, 40, 90, 11);
  const memtableRight = iso(MEM, 150, 75, 11);
  const frozenLeft = iso(MEM, 210, 75, 11);
  const frozenFront = iso(MEM, 265, 105, 4);
  const walLeft = iso(DISK, 30, 150, 8);
  const walTop = iso(DISK, 110, 140, 12);
  const sstTop = iso(DISK, 240, 60, 30);
  const sstBack = iso(DISK, 210, 40, 30);
  const sstFront = iso(DISK, 260, 100, 14);
  const manTop = iso(DISK, 280, 150, 16);
  const put: Pt = [196, 404];
  // One path per step 1–5; the tour token rides the same curves.
  const arrows = [
    `M${put[0] + 70} ${put[1] - 2} C${put[0] + 150} ${put[1] - 2} ${walLeft[0] - 70} ${walLeft[1] + 4} ${walLeft[0] - 6} ${walLeft[1] + 4}`,
    `M${put[0]} ${put[1] - 16} C${put[0]} ${put[1] - 120} ${memtableLeft[0] - 40} ${memtableLeft[1] + 40} ${memtableLeft[0] - 4} ${memtableLeft[1] + 6}`,
    `M${memtableRight[0] + 4} ${memtableRight[1] + 2} L${frozenLeft[0] - 6} ${frozenLeft[1] - 1}`,
    `M${frozenFront[0]} ${frozenFront[1] + 4} C${frozenFront[0]} ${frozenFront[1] + 80} ${sstBack[0] - 30} ${sstBack[1] - 70} ${sstBack[0] - 2} ${sstBack[1] - 6}`,
    `M${sstFront[0] + 4} ${sstFront[1] + 6} L${manTop[0] - 2} ${manTop[1] - 6}`,
  ];

  return (
    <IsoFigure
      id="wd"
      title="Where one write goes"
      desc="Memory is drawn above disk. put(pear = green) is appended to the write-ahead log on disk and inserted into the memtable in memory. The full memtable freezes, is written to disk as a sorted SST, and the MANIFEST records the SST. Then the old log is deleted."
      viewBox="40 24 940 590"
      steps={writeSteps}
      paths={[...arrows, null]}
    >
      {(arrow) => (
        <>
          {/* Plates */}
          <Plate o={DISK} w={340} d={190} t={14} className="wd-plate-disk" />
          <Plate o={MEM} w={340} d={150} t={8} className="wd-plate-memory" />

          <text
            className="wd-plate-label"
            x={iso(MEM, 0, 150)[0] - 8}
            y={iso(MEM, 0, 150)[1] + 30}
            textAnchor="end"
          >
            MEMORY
          </text>
          <text
            className="wd-plate-sub"
            x={iso(MEM, 0, 150)[0] - 8}
            y={iso(MEM, 0, 150)[1] + 48}
            textAnchor="end"
          >
            lost on crash
          </text>
          <text
            className="wd-plate-label"
            x={iso(DISK, 340, 190)[0] + 14}
            y={iso(DISK, 340, 190)[1] + 8}
          >
            DISK
          </text>
          <text
            className="wd-plate-sub"
            x={iso(DISK, 340, 190)[0] + 14}
            y={iso(DISK, 340, 190)[1] + 26}
          >
            survives a crash
          </text>

          {/* Memory: memtable and its frozen successor */}
          <Step n={[2, 3]}>
            <Box
              o={MEM}
              x={[40, 150]}
              y={[45, 105]}
              z={[0, 22]}
              className="wd-obj wd-obj-memory"
            />
          </Step>
          <Step n={[3, 4]}>
            <Box
              o={MEM}
              x={[210, 320]}
              y={[45, 105]}
              z={[0, 22]}
              className="wd-obj wd-obj-frozen"
            />
          </Step>

          {/* Disk: WAL, SST, MANIFEST */}
          <Step n={[1, 6]}>
            <Box
              o={DISK}
              x={[30, 190]}
              y={[125, 155]}
              z={[0, 12]}
              className="wd-obj wd-obj-wal"
            />
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
              const a = iso(DISK, 30 + i * 20, 125, 12);
              const b = iso(DISK, 30 + i * 20, 155, 12);
              return (
                <line
                  key={i}
                  className="wd-seam"
                  x1={a[0]}
                  y1={a[1]}
                  x2={b[0]}
                  y2={b[1]}
                />
              );
            })}
          </Step>
          <Step n={[4, 5]}>
            <Box
              o={DISK}
              x={[200, 300]}
              y={[20, 100]}
              z={[0, 30]}
              className="wd-obj wd-obj-sst"
            />
          </Step>
          <Step n={5}>
            <Box
              o={DISK}
              x={[240, 320]}
              y={[130, 175]}
              z={[0, 16]}
              className="wd-obj wd-obj-manifest"
            />
          </Step>

          {/* Arrows, in order */}
          <Step n={1}>
            <path className="wd-arrow" d={arrows[0]} markerEnd={arrow} />
          </Step>
          <Step n={2}>
            <path className="wd-arrow" d={arrows[1]} markerEnd={arrow} />
          </Step>
          <Step n={3}>
            <path className="wd-arrow" d={arrows[2]} markerEnd={arrow} />
          </Step>
          <Step n={4}>
            <path
              className="wd-arrow wd-arrow-down"
              d={arrows[3]}
              markerEnd={arrow}
            />
          </Step>
          <Step n={5}>
            <path className="wd-arrow" d={arrows[4]} markerEnd={arrow} />
          </Step>

          {/* The write itself */}
          <Step n={[1, 2]}>
            <g className="wd-put">
              <rect
                x={put[0] - 74}
                y={put[1] - 16}
                width={148}
                height={32}
                rx={16}
              />
              <text
                x={put[0]}
                y={put[1] + 1}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                put(pear = green)
              </text>
            </g>
          </Step>

          {/* Cards: what each place holds */}
          <Step n={[2, 3]}>
            <line
              className="wd-stem"
              x1={memtableTop[0]}
              y1={memtableTop[1] - 4}
              x2={memtableTop[0]}
              y2={memtableTop[1] - 24}
            />
            <Card
              at={[memtableTop[0] - 85, memtableTop[1] - 24 - 91]}
              title="memtable"
              note="key order"
              rows={[
                { text: "apple" },
                { text: "pear = green", hot: true },
                { text: "zebra" },
              ]}
            />
          </Step>
          <Step n={[3, 4]}>
            <line
              className="wd-stem"
              x1={frozenTop[0] + 8}
              y1={frozenTop[1] - 4}
              x2={frozenTop[0] + 120}
              y2={frozenTop[1] - 50}
            />
            <Card
              at={[frozenTop[0] + 120, frozenTop[1] - 50 - 60]}
              title="frozen"
              note="no new writes"
              rows={[
                { text: "apple" },
                { text: "pear = green", hot: true },
                { text: "zebra" },
              ]}
            />
          </Step>
          <Step n={[1, 6]}>
            <line
              className="wd-stem"
              x1={walTop[0]}
              y1={walTop[1] + 8}
              x2={walTop[0]}
              y2={walTop[1] + 40}
            />
            <Card
              at={[walTop[0] - 85, walTop[1] + 40]}
              title="write-ahead log"
              rows={[
                { text: "40 orange", muted: true },
                { text: "41 apple", muted: true },
                { text: "42 pear = green", hot: true },
              ]}
            />
          </Step>
          <Step n={[4, 5]}>
            <line
              className="wd-stem"
              x1={sstTop[0] + 6}
              y1={sstTop[1] - 4}
              x2={sstTop[0] + 60}
              y2={sstTop[1] - 40}
            />
            <Card
              at={[sstTop[0] + 60, sstTop[1] - 40 - 72]}
              title="SST file"
              note="sorted"
              rows={[
                { text: "apple … zebra", muted: true },
                { text: "pear = green", hot: true },
              ]}
            />
          </Step>
          <Step n={5}>
            <line
              className="wd-stem"
              x1={manTop[0] + 20}
              y1={manTop[1]}
              x2={manTop[0] + 70}
              y2={manTop[1] + 18}
            />
            <Card
              at={[manTop[0] + 70, manTop[1] + 4]}
              title="MANIFEST"
              note="live files"
              rows={[{ text: "+ SST 0012", hot: true }]}
              width={190}
            />
          </Step>

          {/* Step numbers */}
          <Step n={1}>
            <Marker at={[put[0] + 168, put[1] - 6]} n={1} />
          </Step>
          <Step n={2}>
            <Marker at={[put[0] - 6, put[1] - 86]} n={2} />
          </Step>
          <Step n={3}>
            <Marker
              at={[
                (memtableRight[0] + frozenLeft[0]) / 2,
                (memtableRight[1] + frozenLeft[1]) / 2 - 18,
              ]}
              n={3}
            />
          </Step>
          <Step n={4}>
            <Marker at={[frozenFront[0] + 46, frozenFront[1] + 62]} n={4} />
          </Step>
          <Step n={5}>
            <Marker
              at={[
                (sstFront[0] + manTop[0]) / 2 + 18,
                (sstFront[1] + manTop[1]) / 2,
              ]}
              n={5}
            />
          </Step>
          <Step n={6}>
            <Marker at={[walLeft[0] + 4, walLeft[1] - 26]} n={6} />
          </Step>
        </>
      )}
    </IsoFigure>
  );
}
