// Overlay parts for the footer feed: hard detection boxes with solid tags,
// and "FIG." windows that step open out of a detection and show a small
// moving wireframe diagram. Everything is drawn on a 2D canvas in device
// pixels.

export type Rect = { x: number; y: number; w: number; h: number };

export const YELLOW = "255,226,74";
const ink = (a: number) => `rgba(${YELLOW},${a})`;
const BG = "10,10,10";

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerpRect = (a: Rect, b: Rect, t: number): Rect => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
  w: lerp(a.w, b.w, t),
  h: lerp(a.h, b.h, t),
});

// ------------------------------------------------------------ primitives --

export function strokeRect(
  g: CanvasRenderingContext2D,
  r: Rect,
  lw: number,
  colour: string,
) {
  g.strokeStyle = colour;
  g.lineWidth = lw;
  g.strokeRect(
    Math.round(r.x) + lw / 2,
    Math.round(r.y) + lw / 2,
    Math.round(r.w) - lw,
    Math.round(r.h) - lw,
  );
}

/** A solid tag sitting on the top edge of a box. */
export function tag(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  px: number,
  alpha: number,
) {
  const padX = 6 * px;
  const h = 16 * px;
  const tw = g.measureText(text).width;
  g.fillStyle = ink(alpha);
  g.fillRect(Math.round(x), Math.round(y - h), Math.round(tw + padX * 2), h);
  g.fillStyle = `rgba(${BG},${alpha})`;
  g.fillText(text, Math.round(x + padX), Math.round(y - 4 * px));
}

// -------------------------------------------------------------- windows --

/** A FIG. window: light title bar, dotted body, then the diagram. */
export function figure(
  g: CanvasRenderingContext2D,
  r: Rect,
  title: string,
  px: number,
  content: number, // 0..1, how far the diagram has faded in
  draw: (body: Rect) => void,
) {
  const bar = 16 * px;
  const b = 2 * px;
  g.fillStyle = `rgba(${BG},0.96)`;
  g.fillRect(r.x, r.y, r.w, r.h);
  // frame and title bar
  g.fillStyle = ink(0.92);
  g.fillRect(r.x, r.y, r.w, bar);
  g.fillRect(r.x, r.y, b, r.h);
  g.fillRect(r.x + r.w - b, r.y, b, r.h);
  g.fillRect(r.x, r.y + r.h - b, r.w, b);
  if (r.w < 60 * px || r.h < 40 * px) return;
  g.fillStyle = `rgb(${BG})`;
  const tw = g.measureText(title).width;
  g.fillText(title, r.x + (r.w - tw) / 2, r.y + bar - 4 * px);
  // terminal glyph on the left, sliders on the right
  g.fillText(">_", r.x + 5 * px, r.y + bar - 4 * px);
  for (let i = 0; i < 3; i++) {
    const yy = r.y + 4 * px + i * 3 * px;
    g.fillRect(r.x + r.w - 14 * px, yy, 9 * px, px);
    g.fillRect(r.x + r.w - (i === 1 ? 8 : 12) * px, yy - px, 2 * px, 3 * px);
  }
  const body: Rect = {
    x: r.x + b,
    y: r.y + bar,
    w: r.w - 2 * b,
    h: r.h - bar - b,
  };
  if (content <= 0) return;
  g.save();
  g.beginPath();
  g.rect(body.x, body.y, body.w, body.h);
  g.clip();
  g.globalAlpha = content;
  g.fillStyle = ink(0.18);
  for (let yy = body.y + 8 * px; yy < body.y + body.h; yy += 12 * px)
    for (let xx = body.x + 8 * px; xx < body.x + body.w; xx += 12 * px)
      g.fillRect(xx, yy, px, px);
  draw(body);
  g.restore();
}

// ------------------------------------------------------------- diagrams --
// Small wireframes, each a nod to an engine part: levels, the log ring, a
// hashed sphere and a latency trace. All move continuously.

type Diagram = (
  g: CanvasRenderingContext2D,
  r: Rect,
  t: number,
  px: number,
) => void;

const levels: Diagram = (g, r, t, px) => {
  // Stacked LSM levels rotating about the vertical axis, wider with depth.
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  const s = Math.min(r.w, r.h) * 0.3;
  const a = t * 0.9;
  const tilt = 0.5;
  const proj = (x: number, y: number, z: number) => {
    const rx = x * Math.cos(a) - z * Math.sin(a);
    const rz = x * Math.sin(a) + z * Math.cos(a);
    const ry = y * Math.cos(tilt) - rz * Math.sin(tilt);
    return [cx + rx * s, cy + ry * s] as const;
  };
  g.lineWidth = px;
  for (let i = 0; i < 5; i++) {
    const y = -1 + i * 0.5;
    const k = 0.45 + i * 0.16;
    const pts = [
      proj(-k, y, -k),
      proj(k, y, -k),
      proj(k, y, k),
      proj(-k, y, k),
    ];
    g.strokeStyle = ink(i === 0 ? 0.95 : 0.55);
    g.beginPath();
    pts.forEach(([x, yy], j) => (j ? g.lineTo(x, yy) : g.moveTo(x, yy)));
    g.closePath();
    g.stroke();
  }
};

const ring: Diagram = (g, r, t, px) => {
  // The write-ahead log as a ring of records; the head glows as it advances.
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  const R = Math.min(r.w, r.h) * 0.34;
  const n = 26;
  const head = Math.floor(t * 8) % n;
  g.lineWidth = px;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + t * 0.6;
    const x = cx + Math.cos(a) * R;
    const y = cy + Math.sin(a) * R;
    const lit = (head - i + n) % n;
    g.strokeStyle = ink(lit === 0 ? 1 : lit < 5 ? 0.75 - lit * 0.1 : 0.35);
    g.beginPath();
    g.ellipse(x, y, R * 0.2, R * 0.09, a + Math.PI / 2, 0, Math.PI * 2);
    g.stroke();
  }
  g.strokeStyle = ink(0.3);
  g.beginPath();
  g.ellipse(cx, cy, R * 0.55, R * 0.55, 0, 0, Math.PI * 2);
  g.stroke();
};

const sphere: Diagram = (g, r, t, px) => {
  // A wire sphere spinning: hash space, bloom filter probes.
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  const R = Math.min(r.w, r.h) * 0.36;
  g.lineWidth = px;
  for (let i = 1; i < 6; i++) {
    const lat = (i / 6) * Math.PI - Math.PI / 2;
    g.strokeStyle = ink(0.4);
    g.beginPath();
    g.ellipse(
      cx,
      cy + Math.sin(lat) * R,
      Math.cos(lat) * R,
      Math.cos(lat) * R * 0.28,
      0,
      0,
      Math.PI * 2,
    );
    g.stroke();
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI + t * 0.8;
    const rx = Math.abs(Math.cos(a)) * R;
    g.strokeStyle = ink(Math.cos(a) > 0 ? 0.75 : 0.25);
    g.beginPath();
    g.ellipse(cx, cy, Math.max(0.5, rx), R, 0, 0, Math.PI * 2);
    g.stroke();
  }
  // probe points orbiting
  for (let i = 0; i < 3; i++) {
    const a = t * (1.4 + i * 0.5) + i * 2;
    g.fillStyle = ink(1);
    g.fillRect(
      cx + Math.cos(a) * R * 0.8 - px * 1.5,
      cy + Math.sin(a * 1.3) * R * 0.6 - px * 1.5,
      3 * px,
      3 * px,
    );
  }
};

const trace: Diagram = (g, r, t, px) => {
  // A scrolling latency histogram with a p99 line that breathes.
  const n = 28;
  const bw = r.w / n;
  const base = r.y + r.h - 10 * px;
  for (let i = 0; i < n; i++) {
    const k = i + Math.floor(t * 10);
    const v =
      0.25 +
      0.35 * (0.5 + 0.5 * Math.sin(k * 0.7)) +
      0.25 * (0.5 + 0.5 * Math.sin(k * 2.3 + 1));
    const bh = v * (r.h - 30 * px);
    g.strokeStyle = ink(0.6);
    g.lineWidth = px;
    g.strokeRect(
      Math.round(r.x + i * bw + 2 * px) + 0.5,
      Math.round(base - bh) + 0.5,
      Math.max(1, Math.round(bw - 4 * px)),
      Math.round(bh),
    );
  }
  const p99 = r.y + 16 * px + (0.5 + 0.5 * Math.sin(t * 2)) * 18 * px;
  g.setLineDash([4 * px, 3 * px]);
  g.strokeStyle = ink(1);
  g.beginPath();
  g.moveTo(r.x, p99);
  g.lineTo(r.x + r.w, p99);
  g.stroke();
  g.setLineDash([]);
  g.fillStyle = ink(1);
  g.fillText("p99", r.x + 6 * px, p99 - 4 * px);
};

export const DIAGRAMS = [levels, ring, sphere, trace];
