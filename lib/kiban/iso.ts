export type Pt = [number, number];

/** The site's one isometric projection. */
export const iso = (o: Pt, x: number, y: number, z = 0): Pt => [
  o[0] + (x - y) * 0.866,
  o[1] + (x + y) * 0.5 - z,
];
