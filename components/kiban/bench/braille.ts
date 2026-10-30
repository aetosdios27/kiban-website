// Braille dot bits for (x, y) inside a 2 x 4 cell.
export const DOT = [
  [0x01, 0x02, 0x04, 0x40],
  [0x08, 0x10, 0x20, 0x80],
];

/** Bresenham into a grid of braille cells, two dots thick. */
export function plot(
  bits: Uint8Array,
  cols: number,
  height: number,
  pts: [number, number][],
) {
  const dot = (x: number, y: number) => {
    bits[(y >> 2) * cols + (x >> 1)] |= DOT[x & 1][y & 3];
  };
  const set = (x: number, y: number) => {
    dot(x, y);
    dot(x, y + 1 < height ? y + 1 : y - 1);
  };
  for (let i = 1; i < pts.length; i++) {
    let [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      set(x0, y0);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }
}
