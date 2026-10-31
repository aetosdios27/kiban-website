import { iso, type Pt } from "@/lib/kiban/iso";

// One read, two routes. Each plate is one stop for the CPU. The left route is
// what an LSM normally does; the right is the point index. The figure changes
// only with the step being read, so everything is a CSS transition.

const pts = (a: Pt[]) =>
  a.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

const SORTED = [
  "Bloom filter",
  "index search",
  "block cache",
  "restart search",
  "entry decode",
];
const HASHED = ["pilot table", "slot + fingerprint", "full key + value"];

function Plate({
  o,
  label,
  state,
}: {
  o: Pt;
  label: string;
  state: "idle" | "lit" | "done";
}) {
  const [W, D, T] = [130, 130, 16];
  const p = (x: number, y: number, z: number) => iso(o, x, y, z);
  const tag = p(W, 0, T);
  return (
    <g className="tr-plate" data-state={state}>
      <polygon
        className="tp-l"
        points={pts([p(0, D, T), p(W, D, T), p(W, D, 0), p(0, D, 0)])}
      />
      <polygon
        className="tp-r"
        points={pts([p(W, 0, T), p(W, D, T), p(W, D, 0), p(W, 0, 0)])}
      />
      <polygon
        className="tp-t"
        points={pts([p(0, 0, T), p(W, 0, T), p(W, D, T), p(0, D, T)])}
      />
      <text x={tag[0] + 14} y={tag[1] + 5}>
        {label}
      </text>
    </g>
  );
}

export function TraceFigure({ step }: { step: number }) {
  const sorted = step === 0 ? 0 : step >= 2 ? SORTED.length : 2;
  const hashed = step < 3 ? 0 : Math.min(HASHED.length, step - 2);
  return (
    <figure className="tr-figure">
      <svg
        viewBox="0 0 900 560"
        role="img"
        aria-label={`Sorted route: ${sorted} of 5 stops. Point index: ${hashed} of 3 stops.`}
      >
        <text className="tr-head" x="30" y="34">
          the usual route
        </text>
        <text
          className="tr-count"
          x="30"
          y="80"
          data-on={sorted > 0 || undefined}
        >
          {sorted}
          <tspan> of 5 stops</tspan>
        </text>
        {SORTED.toReversed().map((label, i) => {
          const index = SORTED.length - 1 - i;
          return (
            <Plate
              key={label}
              o={[130, 330 - i * 44 + 40]}
              label={label}
              state={
                index === sorted - 1 ? "lit" : index < sorted ? "done" : "idle"
              }
            />
          );
        })}
        <text className="tr-head" x="490" y="34">
          the point index
        </text>
        <text
          className="tr-count"
          x="490"
          y="80"
          data-on={hashed > 0 || undefined}
        >
          {hashed}
          <tspan> of 3 stops</tspan>
        </text>
        {HASHED.toReversed().map((label, i) => {
          const index = HASHED.length - 1 - i;
          return (
            <Plate
              key={label}
              o={[590, 276 - i * 44 + 40]}
              label={label}
              state={
                index === hashed - 1 ? "lit" : index < hashed ? "done" : "idle"
              }
            />
          );
        })}
      </svg>
    </figure>
  );
}
