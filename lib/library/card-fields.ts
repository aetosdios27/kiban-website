// One hover dither per document, each drawn from what that document is about.
// Motifs work in square units: p.x runs 0 to A, p.y runs 0 to 1. The shared
// frame dissolves them towards the card's text and wipes them in from the edge.

const KIT = `
float ccLine(float d, float width, vec2 res) {
  return 1.0 - smoothstep(width - 0.5, width + 0.5, abs(d) * res.y);
}
float ccPeak(float d, float width) {
  return exp(-(d / width) * (d / width));
}
float ccTri(float x) {
  return abs(fract(x) - 0.5) * 2.0 - 0.5;
}
`;

const FRAME = `
float field(vec2 uv, vec2 res, float t) {
  float A = res.x / res.y;
  float wipe = smoothstep(0.0, 0.4, t * 1.5 - (1.0 - uv.x) * 0.8);
  float fade = smoothstep(0.0, 0.42, uv.x);
  return clamp(motif(vec2(uv.x * A, uv.y), A, res, t), 0.0, 1.0) * fade * wipe;
}`;

const MOTIFS: Record<string, string> = {
  // Four tiers of the tree, each wider than the last.
  overview: `
float motif(vec2 p, float A, vec2 res, float t) {
  float tone = 0.0;
  for (int i = 0; i < 4; i++) {
    float f = float(i);
    float width = A * (0.34 + f * 0.2);
    float row = 1.0 - step(0.075, abs(p.y - (0.8 - f * 0.22)));
    float from = (p.x - (A - width)) / width;
    float shimmer = 0.16 * sin(p.x * 7.0 - t * 2.0 + f);
    tone = max(tone, row * step(0.0, from) * (mix(0.22, 0.82, from) + shimmer));
  }
  return tone;
}`,
  // A floor plan: walled rooms that light up in turn.
  architecture: `
float motif(vec2 p, float A, vec2 res, float t) {
  vec2 g = p * vec2(5.0, 4.0);
  vec2 id = floor(g);
  vec2 f = fract(g);
  float seed = hash21(id);
  float wall = step(min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)), 0.05);
  float glow = pow(0.5 + 0.5 * sin(t * 1.3 + seed * 6.28), 4.0);
  return step(seed, 0.68) * max(wall * 0.9, 0.08 + glow * 0.62);
}`,
  // Commits on a line, passing like releases.
  changelog: `
float motif(vec2 p, float A, vec2 res, float t) {
  float line = ccLine(p.y - 0.5, 1.0, res) * 0.55;
  float x = p.x * 2.4 - t * 0.2;
  float id = floor(x);
  float up = step(0.5, hash21(vec2(id, 1.0))) * 2.0 - 1.0;
  float d = length(vec2((fract(x) - 0.5) / 2.4, p.y - 0.5));
  float stem = ccLine((fract(x) - 0.5) / 2.4, 1.0, res) * step(0.0, (p.y - 0.5) * up) * step(abs(p.y - 0.5), 0.34);
  float cap = 1.0 - smoothstep(0.05, 0.06, length(vec2((fract(x) - 0.5) / 2.4, p.y - 0.5 - up * 0.34)));
  return max(max(line, stem * 0.5), max(cap * 0.75, 1.0 - smoothstep(0.075, 0.09, d)));
}`,
  // A fault line through solid ground, closing and reopening.
  correctness: `
float motif(vec2 p, float A, vec2 res, float t) {
  float y = 0.5 + 0.26 * ccTri(p.x * 1.7) + 0.13 * ccTri(p.x * 4.3 + 0.2);
  float gap = 0.012 + 0.085 * (0.5 + 0.5 * sin(t * 0.9));
  float d = abs(p.y - y);
  return step(gap, d) * mix(0.86, 0.14, smoothstep(0.0, 0.5, d));
}`,
  // A beam walks a field of dots and leaves its findings lit.
  audit: `
float motif(vec2 p, float A, vec2 res, float t) {
  vec2 g = p * 13.0;
  float dots = step(length(fract(g) - 0.5), 0.3);
  float sweep = mod(t * 0.42, A + 0.5) - 0.25;
  float done = 1.0 - smoothstep(0.0, 0.1, p.x - sweep);
  float finding = step(0.8, hash21(floor(g)));
  float beam = ccLine(p.x - sweep, 1.2, res);
  return max(dots * (0.2 + done * finding * 0.75), beam * 0.92);
}`,
  // Write lanes under test, each with its own pace.
  "group-commit-qa": `
float motif(vec2 p, float A, vec2 res, float t) {
  float row = floor(p.y * 7.0);
  float seed = hash21(vec2(row, 4.0));
  float lane = step(abs(fract(p.y * 7.0) - 0.5), 0.2);
  float x = p.x * (2.0 + seed * 3.0) - t * (0.25 + seed * 0.5) + seed * 9.0;
  return lane * (0.2 + 0.68 * step(fract(x), 0.28 + seed * 0.42));
}`,
  // A ruler, with a caliper hunting along it.
  validation: `
float motif(vec2 p, float A, vec2 res, float t) {
  float step10 = floor(p.x * 18.0);
  float major = 1.0 - step(0.5, mod(step10, 5.0));
  float tick = step(fract(p.x * 18.0), 0.2) * step(p.y, mix(0.34, 0.68, major));
  float at = A * (0.58 + 0.34 * sin(t * 0.6));
  float jaw = ccLine(p.x - at, 1.2, res);
  float reach = ccLine(p.y - 0.84, 1.0, res) * step(abs(p.x - at), 0.12);
  return max(tick * mix(0.36, 0.72, major), max(jaw * 0.95, reach));
}`,
  // Four engines racing their lanes to the edge.
  "the-field": `
float motif(vec2 p, float A, vec2 res, float t) {
  float row = floor(p.y * 4.0);
  float seed = hash21(vec2(row, 7.0));
  float width = A * fract(t * (0.08 + seed * 0.13) + seed);
  float lane = step(abs(fract(p.y * 4.0) - 0.5), 0.28);
  return lane * step(p.x, width) * mix(0.14, 0.9, p.x / max(width, 0.01));
}`,
  // Ridgelines, each hiding the ones behind it.
  rocksdb: `
float motif(vec2 p, float A, vec2 res, float t) {
  for (int i = 0; i < 5; i++) {
    float f = float(i);
    float h = 0.06 + f * 0.16 + 0.12 * abs(sin(p.x * (2.2 + f * 0.4) + f * 1.9 + t * 0.24));
    if (p.y < h + 1.0 / res.y)
      return max(ccLine(p.y - h, 1.0, res), 0.05 + 0.12 * step(0.5, fract((p.x + p.y) * 10.0)) * (1.0 - f * 0.1));
  }
  return 0.0;
}`,
  // Pages nested inside pages, the shape of a B-tree file.
  sqlite: `
float motif(vec2 p, float A, vec2 res, float t) {
  vec2 c = p - vec2(A * 0.64, 0.5);
  float d = max(abs(c.x) / 1.5, abs(c.y));
  float band = fract(d * 6.0 - t * 0.3);
  return step(band, 0.42) * step(d, 0.48) * mix(0.9, 0.24, d * 2.0);
}`,
  // Two strands wound around each other, joined by rungs.
  "helix-lmdb": `
float motif(vec2 p, float A, vec2 res, float t) {
  float a = p.x * 4.6 + t * 0.7;
  float y = 0.5 + 0.34 * sin(a);
  float z = 0.5 - 0.34 * sin(a);
  float front = ccLine(p.y - y, 1.4, res) * (0.45 + 0.55 * step(0.0, cos(a)));
  float back = ccLine(p.y - z, 1.4, res) * (0.45 + 0.55 * step(cos(a), 0.0));
  float rung = step(fract(p.x * 9.0), 0.16) * step(min(y, z), p.y) * step(p.y, max(y, z));
  return max(max(front, back), rung * 0.38);
}`,
  // Many writers, one sync.
  "group-commit": `
float motif(vec2 p, float A, vec2 res, float t) {
  float tone = 0.0;
  float k = clamp(p.x / (A * 0.74), 0.0, 1.0);
  k = k * k * (3.0 - 2.0 * k);
  for (int i = 0; i < 7; i++) {
    float f = float(i);
    float y = mix((f + 0.5) / 7.0, 0.5, k);
    float pulse = ccPeak(fract(p.x * 0.6 - t * 0.34 + f * 0.37) - 0.5, 0.1);
    tone = max(tone, ccLine(p.y - y, 0.9, res) * (0.3 + 0.7 * pulse));
  }
  return max(tone, step(A * 0.74, p.x) * ccLine(p.y - 0.5, 2.0, res));
}`,
  // A flame graph: where the cycles went.
  "read-path": `
float motif(vec2 p, float A, vec2 res, float t) {
  float row = floor(p.y * 6.0);
  float x = p.x / A;
  float span = 1.0 - row * 0.15;
  float n = 2.0 + row;
  float id = floor(x * n + hash21(vec2(row, 2.0)));
  float seed = hash21(vec2(id, row));
  float gaps = step(0.06, fract(x * n + hash21(vec2(row, 2.0)))) * step(0.12, fract(p.y * 6.0));
  return gaps * step(abs(x - 0.62), span * 0.42) * (0.24 + 0.62 * seed + 0.1 * sin(t * 1.6 + seed * 6.28));
}`,
  // A scan window sliding over ordered keys.
  "range-cache": `
float motif(vec2 p, float A, vec2 res, float t) {
  vec2 g = p * vec2(11.0, 3.0);
  vec2 f = abs(fract(g) - 0.5);
  float tile = step(max(f.x, f.y), 0.36);
  float at = fract(t * 0.13) * (A + 0.7) - 0.35;
  float inside = 1.0 - step(0.3, abs(p.x - at));
  return tile * mix(0.18, 0.92, inside);
}`,
  // Every key straight to its own slot, no two paths to one place.
  "perfect-hash": `
float motif(vec2 p, float A, vec2 res, float t) {
  float tone = 0.0;
  for (int i = 0; i < 9; i++) {
    float f = float(i);
    float top = (f + 0.5) / 9.0 * A;
    float bottom = (mod(f * 4.0 + 2.0, 9.0) + 0.5) / 9.0 * A;
    float x = mix(bottom, top, p.y);
    float pulse = ccPeak(fract(p.y - t * 0.3 + f * 0.31) - 0.5, 0.09);
    tone = max(tone, ccLine((p.x - x) * 0.8, 0.9, res) * (0.28 + 0.72 * pulse));
  }
  return tone;
}`,
  // The same locators in fewer bytes: rows squeezing to 39%.
  "point-index-cost": `
float motif(vec2 p, float A, vec2 res, float t) {
  float row = floor(p.y * 5.0);
  float width = A * mix(1.0, 0.39, 0.5 + 0.5 * sin(t * 0.7 + row * 0.5));
  float x = (A - p.x) / width;
  float lane = step(abs(fract(p.y * 5.0) - 0.5), 0.3);
  return lane * step(x, 1.0) * step(0.16, fract(x * 8.0)) * mix(0.84, 0.28, x);
}`,
  // Ten columns, newest brightest, always arriving.
  "latest-ten": `
float motif(vec2 p, float A, vec2 res, float t) {
  float c = p.x / A * 10.0 + t * 0.35;
  float id = floor(c);
  float height = 0.26 + 0.64 * hash21(vec2(id, 5.0));
  float recent = p.x / A;
  return step(fract(c), 0.68) * step(p.y, height) * mix(0.1, 0.96, recent * recent);
}`,
  // A little cache over a lot of data.
  "small-cache": `
float motif(vec2 p, float A, vec2 res, float t) {
  vec2 g = p * 15.0;
  float dots = step(length(fract(g) - 0.5), 0.32);
  vec2 d = abs(p - vec2(A * (0.62 + 0.3 * sin(t * 0.41)), 0.5 + 0.26 * cos(t * 0.59)));
  float box = max(d.x / 1.4, d.y);
  float rim = ccLine(box - 0.2, 1.0, res);
  return max(dots * mix(0.16, 0.92, 1.0 - step(0.2, box)), rim);
}`,
  // A lens passing over someone else's source.
  "rocksdb-study": `
float motif(vec2 p, float A, vec2 res, float t) {
  vec2 c = vec2(A * (0.62 + 0.26 * sin(t * 0.45)), 0.54);
  vec2 q = p - c;
  float d = length(q);
  float inside = 1.0 - step(0.3, d);
  vec2 m = inside > 0.5 ? c + q * 0.62 : p;
  float mark = step(fract(m.y * 11.0), 0.5) * step(fract(m.x * 3.0 + hash21(vec2(floor(m.y * 11.0), 8.0))), 0.74);
  float rim = ccLine(d - 0.3, 1.5, res);
  vec2 h = q - vec2(0.3, -0.3) * 0.72;
  float handle = ccLine((h.x + h.y) * 0.7, 1.5, res) * step(0.0, h.x) * step(h.x, 0.16);
  return max(mark * mix(0.2, 0.92, inside), max(rim, handle));
}`,
  // Rays from a single starting point.
  "v0-1-comparison": `
float motif(vec2 p, float A, vec2 res, float t) {
  vec2 q = p - vec2(A, 0.0);
  float a = atan(q.y, -q.x);
  float r = length(q);
  float ray = step(0.5, fract(a * 6.0 + t * 0.14));
  return ray * step(0.08, r) * mix(0.9, 0.12, smoothstep(0.0, 1.5, r));
}`,
};

export const cardField = (slug: string) =>
  `${KIT}${MOTIFS[slug] ?? MOTIFS.overview}${FRAME}`;
