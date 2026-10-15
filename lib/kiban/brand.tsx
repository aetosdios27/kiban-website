import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Shared by every generated image (favicon, touch icon, social card).
export const BRAND = {
  black: "#0a0a0a",
  ink: "#f5f5f5",
  muted: "#8f8f8f",
  yellow: "#ffe24a",
} as const;

export const SITE_DESCRIPTION =
  "An embedded LSM-tree key-value storage engine written in Rust, built from scratch. Follow a write through the WAL, memtable, SST and MANIFEST, and see how it survives a crash.";

// The "k" mark, drawn as a 5 x 7 pixel bitmap so it needs no font.
const K = ["X....", "X....", "X..X.", "X.X..", "XX...", "X.X..", "X..X."];

export function PixelK({ size, color }: { size: number; color: string }) {
  // Whole device pixels only, or small sizes smear.
  const px = Math.max(1, Math.floor(size / 7));
  return (
    <div style={{ display: "flex", flexDirection: "column", width: px * 5 }}>
      {K.map((row, y) => (
        <div key={y} style={{ display: "flex", height: px }}>
          {[...row].map((c, x) => (
            <div
              key={x}
              style={{
                width: px,
                height: px,
                background: c === "X" ? color : "transparent",
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function IconTile({ size }: { size: number }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: BRAND.yellow,
      }}
    >
      <PixelK size={size * 0.58} color={BRAND.black} />
    </div>
  );
}

// Read once at module scope; the files never change per request.
export const ogFonts = (async () => {
  const dir = join(process.cwd(), "assets/og");
  const [sans, pixel] = await Promise.all([
    readFile(join(dir, "mona-sans-800.ttf")),
    readFile(join(dir, "departure-mono.ttf")),
  ]);
  return [
    {
      name: "Mona Sans",
      data: sans,
      weight: 800 as const,
      style: "normal" as const,
    },
    {
      name: "Departure Mono",
      data: pixel,
      weight: 400 as const,
      style: "normal" as const,
    },
  ];
})();
