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

// What happens once a write is safe: L0 files are merged into L1, a snapshot
// keeps what it reads alive, the MANIFEST commits the new file set, replaced
// files are deleted when unused, and a crash is recovered from the WAL.

const MEM: Pt = [190, 96];
const DISK: Pt = [430, 262];

export const afterSteps = [
  {
    title: "Merge",
    body: "L0 files can overlap in key range. Compaction merge-sorts them into L1, where ranges never overlap.",
  },
  {
    title: "Keep what snapshots see",
    body: "A snapshot pins the files it was opened on. The versions it can still see survive the merge.",
  },
  {
    title: "Commit the new files",
    body: "The MANIFEST records the new file set before readers are switched over to it.",
  },
  {
    title: "Reclaim",
    body: "Replaced files are deleted only once no snapshot or reader still uses them.",
  },
  {
    title: "Survive a crash",
    body: "Memory is lost. On reopen, kiban reads the MANIFEST, removes unreferenced files and replays the WAL.",
  },
];

const OLD_L1: [number, number][] = [
  [240, 300],
  [306, 366],
  [372, 432],
];
const NEW_L1: [number, number][] = [
  [240, 286],
  [292, 338],
  [344, 390],
  [396, 442],
];

export function AfterWriteDiagram() {
  // Anchor points, all derived from the plates.
  const l0Top = iso(DISK, 120, 70, 24);
  const oldTop = iso(DISK, 336, 50, 18);
  const oldRight = iso(DISK, 432, 50, 9);
  const newTop = iso(DISK, 315, 150, 18);
  const newRight = iso(DISK, 442, 150, 9);
  const manLeft = iso(DISK, 474, 150, 8);
  const manTop = iso(DISK, 495, 150, 16);
  const walTop = iso(DISK, 85, 178, 12);
  const memLeft = iso(MEM, 60, 80, 10);
  const memTop = iso(MEM, 115, 65, 20);
  const pinBase = oldTop;
  const pinTop: Pt = [pinBase[0], pinBase[1] - 74];

  const paths = [
    `M${l0Top[0]} ${l0Top[1]} C${l0Top[0] + 40} ${l0Top[1] + 90} ${newTop[0] - 90} ${newTop[1] - 10} ${newTop[0] - 4} ${newTop[1] - 4}`,
    `M${pinTop[0]} ${pinTop[1] + 8} L${pinBase[0]} ${pinBase[1] - 4}`,
    `M${newRight[0] + 4} ${newRight[1]} L${manLeft[0] - 6} ${manLeft[1] + 2}`,
    `M${manTop[0]} ${manTop[1] - 6} C${manTop[0]} ${manTop[1] - 70} ${oldRight[0] + 60} ${oldRight[1] + 10} ${oldRight[0] + 6} ${oldRight[1]}`,
    `M${walTop[0] - 30} ${walTop[1] - 6} C${walTop[0] - 90} ${walTop[1] - 80} ${memLeft[0] - 40} ${memLeft[1] + 60} ${memLeft[0] - 4} ${memLeft[1] + 4}`,
  ];

  return (
    <IsoFigure
      id="aw"
      title="What happens after a write"
      desc="On disk, two overlapping L0 files are merged with L1 into a new set of non-overlapping L1 files. A snapshot pins the old L1 files it reads. The MANIFEST records the new files; the replaced files are deleted once nothing uses them. After a crash, memory is lost and the WAL is replayed into a fresh memtable."
      viewBox="20 20 960 650"
      steps={afterSteps}
    >
      {(arrow) => (
        <>
          <Plate o={DISK} w={520} d={220} t={14} className="wd-plate-disk" />
          <Plate o={MEM} w={220} d={120} t={8} className="wd-plate-memory" />

          <text
            className="wd-plate-label"
            x={iso(MEM, 0, 120)[0] - 30}
            y={iso(MEM, 0, 120)[1] + 62}
          >
            MEMORY
          </text>
          <text
            className="wd-plate-sub"
            x={iso(MEM, 0, 120)[0] - 30}
            y={iso(MEM, 0, 120)[1] + 80}
          >
            lost on crash
          </text>
          <text
            className="wd-plate-label"
            x={iso(DISK, 520, 220)[0] + 14}
            y={iso(DISK, 520, 220)[1] + 4}
          >
            DISK
          </text>
          <text
            className="wd-plate-sub"
            x={iso(DISK, 520, 220)[0] + 14}
            y={iso(DISK, 520, 220)[1] + 22}
          >
            survives a crash
          </text>

          {/* Memory: the memtable rebuilt after a crash */}
          <Step n={5}>
            <Box
              o={MEM}
              x={[60, 170]}
              y={[35, 95]}
              z={[0, 20]}
              className="wd-obj wd-obj-memory"
            />
          </Step>

          {/* Disk: WAL, L0, L1 before and after, MANIFEST */}
          <Step n={5}>
            <Box
              o={DISK}
              x={[20, 150]}
              y={[160, 195]}
              z={[0, 12]}
              className="wd-obj wd-obj-wal"
            />
          </Step>
          <Step n={1}>
            <Box
              o={DISK}
              x={[40, 140]}
              y={[30, 90]}
              z={[0, 12]}
              className="wd-obj"
            />
            <Box
              o={DISK}
              x={[90, 190]}
              y={[40, 100]}
              z={[12, 24]}
              className="wd-obj"
            />
          </Step>
          <Step n={[1, 2, 4]}>
            {OLD_L1.map((x, i) => (
              <Box
                key={i}
                o={DISK}
                x={x}
                y={[20, 80]}
                z={[0, 18]}
                className="wd-obj wd-obj-old"
              />
            ))}
          </Step>
          <Step n={[1, 3]}>
            {NEW_L1.map((x, i) => (
              <Box
                key={i}
                o={DISK}
                x={x}
                y={[120, 180]}
                z={[0, 18]}
                className="wd-obj wd-obj-sst"
              />
            ))}
          </Step>
          <Step n={3}>
            <Box
              o={DISK}
              x={[474, 516]}
              y={[125, 175]}
              z={[0, 16]}
              className="wd-obj wd-obj-manifest"
            />
          </Step>

          {/* Arrows and links */}
          <Step n={1}>
            <path className="wd-arrow" d={paths[0]} markerEnd={arrow} />
          </Step>
          <Step n={2}>
            <line
              className="wd-pin"
              x1={pinBase[0]}
              y1={pinBase[1] - 2}
              x2={pinTop[0]}
              y2={pinTop[1]}
            />
            <path
              className="wd-flag"
              d={`M${pinTop[0]} ${pinTop[1]} l26 7 l-26 7 Z`}
            />
          </Step>
          <Step n={3}>
            <path className="wd-arrow" d={paths[2]} markerEnd={arrow} />
          </Step>
          <Step n={4}>
            <path
              className="wd-arrow wd-arrow-muted"
              d={paths[3]}
              markerEnd={arrow}
            />
          </Step>
          <Step n={5}>
            <path className="wd-arrow" d={paths[4]} markerEnd={arrow} />
          </Step>

          {/* Cards */}
          <Step n={1}>
            <Card
              at={[l0Top[0] - 20, l0Top[1] - 130]}
              title="L0"
              note="ranges overlap"
              rows={[{ text: "apple … pear" }, { text: "kiwi … zebra" }]}
            />
          </Step>
          <Step n={[2, 4]}>
            <Card
              at={[pinTop[0] + 40, pinTop[1] - 40]}
              title="snapshot"
              note="seq 41"
              rows={[{ text: "still reads old L1", hot: true }]}
            />
          </Step>
          <Step n={[1, 3]}>
            <Card
              at={[newTop[0] - 210, newTop[1] + 70]}
              title="L1"
              note="no overlaps"
              rows={[
                { text: "apple … fig" },
                { text: "grape … kiwi" },
                { text: "lemon … zebra" },
              ]}
            />
          </Step>
          <Step n={[3, 4]}>
            <Card
              at={[manTop[0] + 60, manTop[1] - 70]}
              title="MANIFEST"
              note="commit"
              width={190}
              rows={[
                { text: "+ L1 0021 … 0024", hot: true },
                { text: "− L1 0011 … 0013", muted: true },
                { text: "− L0 0007, 0008", muted: true },
              ]}
            />
          </Step>
          <Step n={5}>
            <Card
              at={[walTop[0] - 190, walTop[1] + 30]}
              title="WAL"
              note="on disk"
              rows={[{ text: "42 pear = green", hot: true }]}
            />
          </Step>
          <Step n={5}>
            <Card
              at={[memTop[0] - 150, memTop[1] - 120]}
              title="memtable"
              note="rebuilt"
              rows={[{ text: "replayed from WAL", hot: true }]}
            />
          </Step>

          {/* Step numbers */}
          <Step n={1}>
            <Marker at={[l0Top[0] + 70, l0Top[1] + 70]} n={1} />
          </Step>
          <Step n={2}>
            <Marker at={[pinTop[0] - 22, pinTop[1] + 4]} n={2} />
          </Step>
          <Step n={3}>
            <Marker
              at={[
                (newRight[0] + manLeft[0]) / 2,
                (newRight[1] + manLeft[1]) / 2 - 22,
              ]}
              n={3}
            />
          </Step>
          <Step n={4}>
            <Marker at={[oldRight[0] + 40, oldRight[1] - 36]} n={4} />
          </Step>
          <Step n={5}>
            <Marker at={[walTop[0] - 96, walTop[1] - 70]} n={5} />
          </Step>
        </>
      )}
    </IsoFigure>
  );
}
