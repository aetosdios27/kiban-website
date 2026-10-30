import { AfterWriteDiagram } from "@/components/kiban/after-write-diagram";
import { Race } from "@/components/kiban/bench/race";
import { Scoreboard } from "@/components/kiban/bench/scoreboard";
import { Sweep } from "@/components/kiban/bench/sweep";
import { EngineStrata } from "@/components/kiban/engine-strata";
import { WriteDiagram } from "@/components/kiban/write-diagram";
import { iso, type Pt } from "@/lib/kiban/iso";
import type { ComponentType } from "react";

const pts = (a: Pt[]) =>
  a.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

function Step({
  o,
  z,
  label,
  hot,
}: {
  o: Pt;
  z: number;
  label: string;
  hot?: boolean;
}) {
  const p = (x: number, y: number, h = 0) => iso(o, x, y, z + h);
  const [W, D, T] = [150, 150, 12];
  return (
    <g data-hot={hot || undefined} className="lf-step">
      <polygon
        className="lf-left"
        points={pts([p(0, D, T), p(W, D, T), p(W, D), p(0, D)])}
      />
      <polygon
        className="lf-right"
        points={pts([p(W, 0, T), p(W, D, T), p(W, D), p(W, 0)])}
      />
      <polygon
        className="lf-top"
        points={pts([p(0, 0, T), p(W, 0, T), p(W, D, T), p(0, D, T)])}
      />
      <text x={p(W, 0, T)[0] + 18} y={p(W, 0, T)[1] + 4}>
        {label}
      </text>
    </g>
  );
}

const BLOCK_PATH = [
  "bloom filter",
  "index binary search",
  "block cache lookup",
  "restart search",
  "entry decode",
];
const HASH_PATH = ["perfect hash", "fingerprint check", "full-key compare"];

// The two ways to answer one point read, per PR #14: every plate is a step.
function LookupFigure() {
  return (
    <figure className="lib-figure">
      <svg
        viewBox="0 0 900 430"
        role="img"
        aria-label="A sorted-block lookup takes five steps. A perfect-hash lookup takes three."
      >
        <text className="lf-title" x="40" y="26">
          sorted blocks
        </text>
        {BLOCK_PATH.toReversed().map((label, i) => (
          <Step key={label} o={[170, 300 - i * 56]} z={0} label={label} />
        ))}
        <text className="lf-title" x="500" y="26">
          perfect-hash point index
        </text>
        {HASH_PATH.toReversed().map((label, i) => (
          <Step key={label} o={[640, 245 - i * 56]} z={0} label={label} hot />
        ))}
      </svg>
      <figcaption>
        The steps one cached point read takes on each path.
      </figcaption>
    </figure>
  );
}

const wrap = (Inner: ComponentType, wide = true) =>
  function Figure() {
    return (
      <div className={wide ? "lib-figure lib-wide" : "lib-figure"}>
        <Inner />
      </div>
    );
  };

export const LIBRARY_FIGURES: Record<string, ComponentType> = {
  strata: wrap(EngineStrata),
  write: wrap(WriteDiagram),
  after: wrap(AfterWriteDiagram),
  scoreboard: wrap(Scoreboard),
  sweep: wrap(Sweep),
  race: wrap(Race),
  lookup: LookupFigure,
};
