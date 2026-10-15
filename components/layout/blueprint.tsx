"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ENGINE_COMMIT } from "@/lib/kiban/source";

// The engine drawn as a building section. The ground line is the line between
// memory and disk: the memtable stands above it, every level is a deeper,
// wider foundation below it, and the WAL and MANIFEST are the piles that hold
// it up. It draws itself once, the first time it scrolls into view.

const spec: [string, string][] = [
  ["type", "embedded LSM-tree key-value store"],
  ["language", "Rust"],
  ["license", "MIT"],
  ["reviewed", ENGINE_COMMIT.slice(0, 7)],
  ["tested", "1,000 SIGKILL / reopen cycles"],
];

const GROUND = 130;
const idx = (i: number) => ({ "--i": i }) as CSSProperties;

export function Blueprint() {
  const root = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"idle" | "armed" | "in">("idle");

  useEffect(() => {
    const el = root.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setState("armed");
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        setState("in");
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div className="bp" ref={root} data-state={state}>
      <svg
        className="bp-svg"
        viewBox="0 0 620 340"
        role="img"
        aria-labelledby="bp-title bp-desc"
      >
        <title id="bp-title">kiban as a building section</title>
        <desc id="bp-desc">
          A section drawing of the engine. The memtable stands above the ground
          line, which is memory. Below it, disk: levels L0, L1 and L2 get wider
          with depth, and the WAL and MANIFEST are the piles at either side.
        </desc>
        <defs>
          <pattern
            id="bp-hatch"
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="6" className="bp-hatch" />
          </pattern>
        </defs>

        {/* ground: memory above, disk below */}
        <path
          className="bp-line"
          pathLength={1}
          style={idx(0)}
          d={`M8 ${GROUND} H612`}
        />
        <text className="bp-text" x="72" y={GROUND - 10}>
          MEMORY
        </text>
        <text className="bp-text" x="72" y={GROUND + 24}>
          DISK
        </text>

        {/* the write falling in */}
        <path
          className="bp-line bp-hot"
          pathLength={1}
          style={idx(7)}
          d="M310 18 V70 m-5 -6 l5 6 l5 -6"
        />
        <text className="bp-text bp-hot-text" x="320" y="32">
          put()
        </text>

        {/* memtable */}
        <rect
          className="bp-line"
          pathLength={1}
          style={idx(1)}
          x="250"
          y={GROUND - 46}
          width="120"
          height="46"
        />
        <text
          className="bp-text bp-slab"
          x="310"
          y={GROUND - 20}
          textAnchor="middle"
        >
          memtable
        </text>

        {/* L0: files may overlap */}
        <rect
          className="bp-line"
          pathLength={1}
          style={idx(2)}
          x="226"
          y={GROUND}
          width="100"
          height="48"
        />
        <rect
          className="bp-line"
          pathLength={1}
          style={idx(2)}
          x="296"
          y={GROUND}
          width="100"
          height="48"
        />
        <text
          className="bp-text bp-slab"
          x="311"
          y={GROUND + 29}
          textAnchor="middle"
        >
          L0
        </text>

        {/* L1 */}
        <rect
          className="bp-line"
          pathLength={1}
          style={idx(3)}
          x="166"
          y={GROUND + 48}
          width="288"
          height="48"
        />
        {[238, 310, 382].map((x) => (
          <path
            key={x}
            className="bp-line bp-seam"
            pathLength={1}
            style={idx(3)}
            d={`M${x} ${GROUND + 48} V${GROUND + 96}`}
          />
        ))}
        <text
          className="bp-text bp-slab"
          x="202"
          y={GROUND + 77}
          textAnchor="middle"
        >
          L1
        </text>

        {/* L2 */}
        <rect
          className="bp-line"
          pathLength={1}
          style={idx(4)}
          x="86"
          y={GROUND + 96}
          width="448"
          height="48"
        />
        {[142, 198, 254, 310, 366, 422, 478].map((x) => (
          <path
            key={x}
            className="bp-line bp-seam"
            pathLength={1}
            style={idx(4)}
            d={`M${x} ${GROUND + 96} V${GROUND + 144}`}
          />
        ))}
        <text
          className="bp-text bp-slab"
          x="114"
          y={GROUND + 125}
          textAnchor="middle"
        >
          L2
        </text>

        {/* piles: WAL and MANIFEST */}
        <rect
          className="bp-line bp-pile"
          pathLength={1}
          style={idx(5)}
          x="36"
          y={GROUND}
          width="26"
          height="170"
        />
        <rect
          className="bp-line bp-pile"
          pathLength={1}
          style={idx(5)}
          x="552"
          y={GROUND}
          width="26"
          height="170"
        />
        <text className="bp-text" x="49" y={GROUND + 190} textAnchor="middle">
          WAL
        </text>
        <text className="bp-text" x="565" y={GROUND + 190} textAnchor="middle">
          MANIFEST
        </text>

        {/* dimension: capacity grows with depth */}
        <path
          className="bp-line bp-dim"
          pathLength={1}
          style={idx(6)}
          d={`M86 ${GROUND + 168} H534 M86 ${GROUND + 162} v12 M534 ${GROUND + 162} v12`}
        />
        <text className="bp-text" x="310" y={GROUND + 190} textAnchor="middle">
          capacity grows with every level
        </text>
      </svg>

      <dl className="bp-spec">
        <div className="bp-spec-head">
          <span>spec sheet</span>
          <span>基盤</span>
        </div>
        {spec.map(([k, v]) => (
          <div key={k} className="bp-spec-row">
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
