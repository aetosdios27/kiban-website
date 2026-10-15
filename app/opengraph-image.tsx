import { ImageResponse } from "next/og";
import { BRAND, PixelK, ogFonts } from "@/lib/kiban/brand";

export const alt =
  "kiban: a storage engine, built from scratch. An embedded LSM-tree key-value store in Rust.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Four LSM levels as an isometric stack, drawn with the same projection the
// site's diagrams use: memtable, L0, L1, L2.
const O = [880, 290] as const;
const iso = (x: number, y: number, z: number): [number, number] => [
  O[0] + (x - y) * 0.866,
  O[1] + (x + y) * 0.5 - z,
];
const pts = (p: [number, number][]) => p.map((q) => q.join(",")).join(" ");
const levels = [
  { a: 52, z: 190, hot: true },
  { a: 82, z: 110, hot: false },
  { a: 112, z: 30, hot: false },
  { a: 142, z: -50, hot: false },
];

function Stack() {
  return (
    <svg width="440" height="520" viewBox="660 20 440 520">
      {[...levels].reverse().map(({ a, z, hot }) => {
        const t = 16;
        const top = (x: number, y: number) => iso(x, y, z);
        const bot = (x: number, y: number) => iso(x, y, z - t);
        return (
          <g key={z}>
            <polygon
              points={pts([top(-a, a), top(a, a), bot(a, a), bot(-a, a)])}
              fill={hot ? "#c9ad2c" : "#1a1a1a"}
              stroke={hot ? "#000" : "#555"}
            />
            <polygon
              points={pts([top(a, -a), top(a, a), bot(a, a), bot(a, -a)])}
              fill={hot ? "#8a7720" : "#101010"}
              stroke={hot ? "#000" : "#555"}
            />
            <polygon
              points={pts([top(-a, -a), top(a, -a), top(a, a), top(-a, a)])}
              fill={hot ? BRAND.yellow : "#262626"}
              stroke={hot ? "#000" : "#6a6a6a"}
            />
          </g>
        );
      })}
    </svg>
  );
}

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: BRAND.black,
        backgroundImage: "radial-gradient(#262626 1.5px, transparent 1.5px)",
        backgroundSize: "28px 28px",
        color: BRAND.ink,
        fontFamily: "Inter Tight",
      }}
    >
      <div
        style={{
          position: "absolute",
          right: 20,
          top: 40,
          display: "flex",
        }}
      >
        <Stack />
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              background: BRAND.yellow,
            }}
          >
            <PixelK size={32} color={BRAND.black} />
          </div>
          <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: -1 }}>
            kiban
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              width: 680,
              fontSize: 90,
              fontWeight: 800,
              letterSpacing: -5,
              lineHeight: 0.95,
            }}
          >
            <span style={{ marginRight: 24 }}>a storage</span>
            <span style={{ marginRight: 24 }}>engine,</span>
            <span style={{ marginRight: 24 }}>built from</span>
            <span
              style={{
                fontFamily: "Geist Pixel",
                fontWeight: 500,
                letterSpacing: -2,
                color: BRAND.yellow,
              }}
            >
              scratch.
            </span>
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 30,
              fontSize: 28,
              color: BRAND.muted,
              letterSpacing: -0.5,
            }}
          >
            an embedded LSM-tree key-value store, written in Rust.
          </div>
        </div>
      </div>
    </div>,
    { ...size, fonts: await ogFonts },
  );
}
