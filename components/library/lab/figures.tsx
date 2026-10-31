"use client";

import { sweep } from "@/lib/kiban/bench";
import { iso, type Pt } from "@/lib/kiban/iso";
import { Beam, Note, Scene, seg, Slab, type Tone } from "./kit";

// Each figure draws one real mechanism from the report it sits in. Numbers come
// from the measured data or the on-disk format documents, never from the eye.

const group = sweep.series["kiban-group"].at(-1)!;
const WRITERS = 16;

export function GroupCommitFigure() {
  const o: Pt = [150, 150];
  return (
    <Scene
      fig="01"
      title="one sync, many writers"
      caption={`Sixteen writers queue behind a leader, which appends every record and issues one fdatasync. 4,000 durable writes took ${group.syncs} syncs.`}
    >
      {(p) => {
        const gather = seg(p, 0.1, 0.45);
        const sync = seg(p, 0.45, 0.68);
        const publish = seg(p, 0.68, 0.92);
        const cubes = Array.from({ length: WRITERS }, (_, i) => {
          const col = i % 4;
          const row = Math.floor(i / 4);
          const startX = col * 58;
          const startY = row * 58;
          const startZ = 190 - ((i * 7) % 5) * 30;
          const endX = 300 + col * 32;
          const endY = 60 + row * 32;
          return {
            i,
            x: startX + (endX - startX) * gather,
            y: startY + (endY - startY) * gather,
            z: startZ + (34 - startZ) * gather + sync * 0,
          };
        }).sort((a, b) => a.x + a.y - (b.x + b.y));
        const gate = iso(o, 590, 130, 60);
        const wal = iso(o, 640, 160, 26);
        const mem = iso(o, 860, 160, 26);
        return (
          <>
            <Slab o={o} x={-20} y={-20} w={260} d={260} h={10} tone="ghost" />
            <Slab
              o={o}
              x={286}
              y={46}
              w={160}
              d={160}
              h={22}
              tone="hot"
              opacity={0.25 + gather * 0.75}
            />
            {cubes.map((c) => (
              <Slab
                key={c.i}
                o={o}
                x={c.x}
                y={c.y}
                z={c.z}
                w={24}
                d={24}
                h={22}
                tone={gather > 0.96 ? "solid" : "wire"}
              />
            ))}
            <Slab
              o={o}
              x={560}
              y={20}
              w={20}
              d={220}
              h={150}
              tone={sync > 0.05 ? "hot" : "wire"}
            />
            <Slab
              o={o}
              x={620}
              y={40}
              w={150}
              d={180}
              h={18}
              tone={sync > 0.5 ? "hot" : "wire"}
            />
            <Slab
              o={o}
              x={820}
              y={40}
              w={150}
              d={180}
              h={18}
              tone={publish > 0.5 ? "hot" : "wire"}
            />
            <Beam from={iso(o, 446, 130, 40)} to={gate} at={sync} />
            <Beam from={gate} to={wal} at={seg(p, 0.6, 0.72)} />
            <Beam from={wal} to={mem} at={publish} />
            <Note
              at={iso(o, 110, 240, 10)}
              to={[70, 520]}
              title="16 writers"
              body="each asks for durability"
              show={seg(p, 0, 0.15)}
            />
            <Note
              at={iso(o, 366, 206, 22)}
              to={[190, 720]}
              title="one queue"
              body="a leader takes the group"
              show={gather}
            />
            <Note
              at={iso(o, 570, 20, 150)}
              to={[640, 60]}
              title="one fdatasync"
              body={`${group.syncs} syncs, not 4,000`}
              show={sync}
            />
            <Note
              at={iso(o, 895, 220, 18)}
              to={[1090, 800]}
              title="then visible"
              body="nothing shows before the sync"
              show={publish}
            />
          </>
        );
      }}
    </Scene>
  );
}

function Tape({
  o,
  y,
  count,
  tone,
  fade = 1,
}: {
  o: Pt;
  y: number;
  count: number;
  tone: (i: number) => Tone;
  fade?: number;
}) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <Slab
          key={i}
          o={o}
          x={i * 46}
          y={y}
          w={40}
          d={70}
          h={14}
          tone={tone(i)}
          opacity={fade}
        />
      ))}
    </>
  );
}

export function LostGenerationFigure() {
  const o: Pt = [360, 90];
  return (
    <Scene
      fig="02"
      title="the lost generation"
      caption="Before the repair, sync covered only the active WAL, so records in a frozen generation could vanish on power loss. Now the frozen memtable owns its writer and sync covers both."
    >
      {(p) => {
        const crash = seg(p, 0.15, 0.42);
        const fix = seg(p, 0.55, 0.85);
        const lost = crash * (1 - fix);
        const frozen = iso(o, 170, 115, 14);
        const active = iso(o, 170, 275, 14);
        const syncFrom = iso(o, -30, 420, 24);
        return (
          <>
            <Tape
              o={o}
              y={80}
              count={8}
              tone={() => (fix > 0.5 ? "hot" : lost > 0.5 ? "fail" : "wire")}
              fade={1 - lost * 0.55}
            />
            <Tape o={o} y={240} count={8} tone={() => "hot"} />
            <Slab o={o} x={-60} y={390} w={60} d={60} h={24} tone="solid" />
            <Note
              at={syncFrom}
              to={[60, 640]}
              title="sync()"
              body="acknowledges durability"
            />
            <Beam from={syncFrom} to={active} at={seg(p, 0, 0.15)} />
            <Beam from={syncFrom} to={frozen} at={fix} />
            <Note
              at={iso(o, 0, 80, 14)}
              to={[40, 120]}
              title="frozen WAL"
              body="writer dropped, never synced"
              show={1 - fix}
            />
            <Note
              at={iso(o, 0, 80, 14)}
              to={[40, 120]}
              title="frozen WAL"
              body="owned until the SST is durable"
              show={fix}
            />
            <Note
              at={iso(o, 368, 310, 14)}
              to={[700, 560]}
              title="active WAL"
              body="sync() reached only this one"
              show={1 - fix}
            />
            <Note
              at={iso(o, 368, 310, 14)}
              to={[700, 560]}
              title="active WAL"
              body="sync() now covers both"
              show={fix}
            />
            <Note
              at={iso(o, 368, 150, 14)}
              to={[730, 200]}
              title="power loss"
              body="acknowledged records gone"
              show={lost}
            />
          </>
        );
      }}
    </Scene>
  );
}

export function LookupFigure() {
  const o: Pt = [330, 70];
  const layers = [
    { name: "pilot table", note: "the key's bucket picks one u32", z: 300 },
    { name: "slots", note: "offset plus a 16-bit fingerprint", z: 200 },
    { name: "arena", note: "full key compared, no block search", z: 100 },
    { name: "value", note: "returned", z: 0 },
  ];
  return (
    <Scene
      fig="03"
      title="anatomy of a lookup"
      caption="A point probe hashes the key to a pilot, the pilot to one slot, and the slot to one record. A full-key compare proves the hit, with no sorted-block search."
      height={680}
    >
      {(p) => {
        const open = seg(p, 0, 0.35);
        const fall = seg(p, 0.35, 0.95);
        const spread = 0.42 + open * 0.58;
        return (
          <>
            {layers.toReversed().map((layer, i) => {
              const z = layer.z * spread;
              const index = layers.length - 1 - i;
              const lit = fall > index / 4;
              return (
                <g key={layer.name}>
                  <Slab
                    o={o}
                    z={z}
                    w={300}
                    d={300}
                    h={12}
                    tone={lit ? "hot" : "wire"}
                  />
                  {Array.from({ length: 36 }, (_, c) => (
                    <Slab
                      key={c}
                      o={o}
                      x={22 + (c % 6) * 44}
                      y={22 + Math.floor(c / 6) * 44}
                      z={z + 12}
                      w={30}
                      d={30}
                      h={c === cellIndex(index) && lit ? 12 : 2}
                      tone={c === cellIndex(index) && lit ? "solid" : "ghost"}
                    />
                  ))}
                  <Note
                    at={iso(o, 300, 0, z + 12)}
                    to={[830, 60 + index * 130]}
                    title={layer.name}
                    body={layer.note}
                    show={open}
                  />
                </g>
              );
            })}
            {[0, 1, 2].map((i) => {
              const a = cellPoint(o, i, layers[i].z * spread);
              const b = cellPoint(o, i + 1, layers[i + 1].z * spread);
              return (
                <Beam
                  key={i}
                  from={a}
                  to={b}
                  at={seg(fall, i / 3, (i + 1) / 3)}
                />
              );
            })}
          </>
        );
      }}
    </Scene>
  );
}
const cellIndex = (layer: number) => [8, 21, 14, 27][layer];
function cellPoint(o: Pt, layer: number, z: number): Pt {
  const c = cellIndex(layer);
  return iso(o, 37 + (c % 6) * 44, 37 + Math.floor(c / 6) * 44, z + 24);
}

export function SectionFigure() {
  const o: Pt = [120, 270];
  const parts = [
    { name: "header", size: "64 bytes", w: 30, tone: "hot" as Tone },
    { name: "pilots", size: "4 bytes per bucket", w: 90, tone: "wire" as Tone },
    {
      name: "slots",
      size: "W + 2 bytes per key",
      w: 150,
      tone: "wire" as Tone,
    },
    { name: "arena", size: "one record per key", w: 310, tone: "wire" as Tone },
    { name: "CRC", size: "covers the section", w: 22, tone: "hot" as Tone },
  ];
  return (
    <Scene
      fig="04"
      title="inside a PH3 section"
      caption="The on-disk layout of the point index: a 64-byte header, u32 pilots, slots of address plus fingerprint, then the key-ordered arena. Widths are illustrative of order, not bytes."
      height={520}
    >
      {(p) => {
        const gap = seg(p, 0.05, 0.7) * 54;
        let x = 0;
        return (
          <>
            {parts.map((part, i) => {
              const at = x + i * gap;
              x += part.w;
              const reveal = seg(p, 0.15 + i * 0.1, 0.4 + i * 0.1);
              return (
                <g key={part.name}>
                  <Slab
                    o={o}
                    x={at}
                    w={part.w}
                    d={190}
                    h={70}
                    tone={part.tone}
                  />
                  <Note
                    at={iso(o, at + part.w / 2, 0, 70)}
                    to={[150 + i * 190, 110 + (i % 2) * 56]}
                    title={part.name}
                    body={part.size}
                    show={reveal}
                  />
                </g>
              );
            })}
          </>
        );
      }}
    </Scene>
  );
}

export function SmallCacheFigure() {
  const o: Pt = [150, 190];
  const DATA = 420;
  const CACHE = 420 * Math.cbrt(32 / 315);
  return (
    <Scene
      fig="05"
      title="ten times the data"
      caption="With 1M records in about 315 MiB of SSTs and a 32 MiB cache, volumes drawn to scale. Compact locators stay resident, so a read jumps to the exact value and verifies only those bytes."
      height={640}
    >
      {(p) => {
        const lift = seg(p, 0, 0.35);
        const jump = seg(p, 0.4, 0.8);
        const z = 150 + lift * 130;
        const hit = iso(o, 300, 210, 200);
        const top = iso(o, 90, 90, z + CACHE * 0.5);
        return (
          <>
            <Slab o={o} w={DATA} d={DATA} h={200} tone="ghost" />
            {Array.from({ length: 64 }, (_, c) => (
              <Slab
                key={c}
                o={o}
                x={12 + (c % 8) * 50}
                y={12 + Math.floor(c / 8) * 50}
                z={200}
                w={42}
                d={42}
                h={2}
                tone="ghost"
              />
            ))}
            <Slab
              o={o}
              x={282}
              y={192}
              z={200}
              w={42}
              d={42}
              h={jump > 0.9 ? 14 : 2}
              tone={jump > 0.9 ? "hot" : "ghost"}
            />
            <Slab
              o={o}
              x={30}
              y={30}
              z={z}
              w={CACHE}
              d={CACHE}
              h={CACHE * 0.5}
              tone="hot"
            />
            <Beam from={top} to={hit} at={jump} />
            <Note
              at={iso(o, DATA, 0, 100)}
              to={[770, 330]}
              title="315 MiB"
              body="1M records on disk"
              show={lift}
            />
            <Note
              at={iso(o, 30 + CACHE, 30, z + CACHE * 0.5)}
              to={[640, 90]}
              title="32 MiB cache"
              body="locators stay resident"
              show={lift}
            />
            <Note
              at={hit}
              to={[770, 500]}
              title="one value"
              body="its own CRC, verified alone"
              show={seg(p, 0.75, 0.95)}
            />
          </>
        );
      }}
    </Scene>
  );
}

export function PrefixFigure() {
  const o: Pt = [200, 90];
  const LEVELS = [0, 1, 2];
  return (
    <Scene
      fig="06"
      title="the prefix directory"
      caption="A pinned Version derives one global order across its SSTs. A 64-byte directory slot holds each prefix's extent and first locator, so latest-ten starts on its first record."
      height={660}
    >
      {(p) => {
        const open = seg(p, 0, 0.3);
        const drop = seg(p, 0.35, 0.65);
        const light = seg(p, 0.6, 0.95);
        const gap = 90 + open * 40;
        const zAt = (l: number) => 380 - l * gap;
        const lit = Math.round(light * 10);
        const start = iso(o, 240, 40, 420);
        const first = iso(o, 32, 164, zAt(1) - 54);
        return (
          <>
            {LEVELS.toReversed().map((l) => (
              <g key={l}>
                <Slab
                  o={o}
                  z={zAt(l) - 80}
                  w={460}
                  d={280}
                  h={10}
                  tone="ghost"
                />
                {Array.from({ length: 40 }, (_, c) => {
                  const x = 16 + (c % 10) * 43;
                  const y = 16 + Math.floor(c / 10) * 62;
                  const run =
                    l === 1 && Math.floor(c / 10) === 2 && c % 10 < lit;
                  return (
                    <Slab
                      key={c}
                      o={o}
                      x={x}
                      y={y}
                      z={zAt(l) - 70}
                      w={32}
                      d={48}
                      h={run ? 16 : 5}
                      tone={run ? "hot" : "wire"}
                    />
                  );
                })}
              </g>
            ))}
            <Slab
              o={o}
              x={60}
              y={10}
              z={420}
              w={340}
              d={46}
              h={18}
              tone="hot"
            />
            {Array.from({ length: 8 }, (_, i) => (
              <Slab
                key={i}
                o={o}
                x={66 + i * 41}
                y={16}
                z={438}
                w={32}
                d={34}
                h={i === 4 ? 12 : 3}
                tone={i === 4 ? "solid" : "ghost"}
              />
            ))}
            <Beam from={start} to={first} at={drop} />
            <Note
              at={iso(o, 400, 10, 438)}
              to={[730, 90]}
              title="directory"
              body="64 bytes per prefix"
              show={open}
            />
            <Note
              at={iso(o, 460, 0, zAt(0) - 70)}
              to={[780, 250]}
              title="global order"
              body="across every SST"
              show={open}
            />
            <Note
              at={first}
              to={[640, 590]}
              title={`latest ${lit}`}
              body="one contiguous run"
              show={light}
            />
          </>
        );
      }}
    </Scene>
  );
}

const COSTS = [
  { name: "block cache", cycles: 1260 },
  { name: "entry decoding", cycles: 1054 },
  { name: "search and routing", cycles: 919 },
  { name: "heap", cycles: 27 },
];

export function SkylineFigure() {
  const o: Pt = [270, 330];
  return (
    <Scene
      fig="07"
      title="where the extra cycles went"
      caption="Kiban's cycles per cached read beyond LMDB on the bulk layout, from the ranked profile. Height is cycles. Block-cache ownership and entry decoding were the two largest costs."
      height={600}
    >
      {(p) => (
        <>
          <Slab o={o} x={-30} y={-30} w={470} d={170} h={8} tone="ghost" />
          {COSTS.map((cost, i) => {
            const h =
              (cost.cycles / 1260) *
              270 *
              seg(p, 0.1 + i * 0.1, 0.65 + i * 0.1);
            return (
              <g key={cost.name}>
                <Slab
                  o={o}
                  x={i * 105}
                  w={72}
                  d={72}
                  z={8}
                  h={Math.max(2, h)}
                  tone={i === 0 ? "hot" : "wire"}
                />
                <Note
                  at={iso(o, i * 105 + 72, 0, 8 + h)}
                  to={[i === 0 ? 230 : 330 + i * 190, 40 + (i % 2) * 60]}
                  align={i === 0 ? "end" : "start"}
                  title={`${cost.cycles.toLocaleString("en")} cycles`}
                  body={cost.name}
                  show={seg(p, 0.5 + i * 0.1, 0.8 + i * 0.05)}
                />
              </g>
            );
          })}
        </>
      )}
    </Scene>
  );
}
