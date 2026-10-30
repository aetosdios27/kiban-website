import { iso, type Pt } from "@/lib/kiban/iso";

const LEVELS = [0, 1, 2, 3];
const pts = (a: Pt[]) =>
  a.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

// The site's stack of levels, with one lit: a quiet mark for each shelf.
export function StackMark({ lit }: { lit: number }) {
  const S = 60;
  return (
    <svg className="lib-mark" viewBox="0 0 120 112" aria-hidden="true">
      {LEVELS.toReversed().map((level) => {
        const o: Pt = [60, 6 + level * 20];
        const p = (x: number, y: number) => iso(o, x, y);
        return (
          <polygon
            key={level}
            data-lit={level === lit || undefined}
            points={pts([p(0, 0), p(S, 0), p(S, S), p(0, S)])}
          />
        );
      })}
    </svg>
  );
}
