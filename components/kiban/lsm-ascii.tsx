"use client";

import { useEffect, useRef } from "react";

// An LSM tree rendered as ASCII. Four levels are real 3D boxes, split into SST
// files, under a slowly swaying orthographic camera. Every character cell
// casts one ray; the hit face is lit, and brightness picks a character from
// the ramp. Writes fall into the memtable, a flush drops into L0, and
// compaction ripples down through L1 and L2, all in the accent colour.

type V = [number, number, number];
type Box = { min: V; max: V; level: number; file: number; hot: number };

const RAMP = " .,:;-=+*#%@";
const LOOP = 9;
// Cell size at a 500px canvas; larger canvases scale the cells up so the
// grid keeps the same density and the glyphs stay legible.
const CELL_W = 5; // CSS px per character
const CELL_H = 8.5;
const FONT = 8;

const levels = [
  { name: "memtable", a: 0.36, y: [1.02, 1.12], files: 1 },
  { name: "L0", a: 0.52, y: [0.56, 0.7], files: 3 },
  { name: "L1", a: 0.72, y: [0.06, 0.24], files: 4 },
  { name: "L2", a: 0.96, y: [-0.5, -0.26], files: 6 },
] as const;
const GAP = 0.035;

// Deterministic write positions on the memtable.
const WRITES = Array.from({ length: 8 }, (_, i) => ({
  x: (((i * 37) % 9) / 8 - 0.5) * 0.5,
  z: (((i * 53) % 7) / 6 - 0.5) * 0.5,
  at: 0.3 + i * 0.38,
}));
const FLUSH: [number, number] = [3.7, 4.5];
const COMPACT = 5.2;

const norm = (v: V): V => {
  const l = Math.hypot(...v);
  return [v[0] / l, v[1] / l, v[2] / l];
};
const LIGHT = norm([-0.45, 0.85, 0.35]);

function files(): Box[] {
  const out: Box[] = [];
  levels.forEach((lv, level) => {
    const w = (2 * lv.a) / lv.files;
    for (let f = 0; f < lv.files; f++) {
      const x0 = -lv.a + f * w + (f ? GAP / 2 : 0);
      const x1 = -lv.a + (f + 1) * w - (f < lv.files - 1 ? GAP / 2 : 0);
      out.push({
        min: [x0, lv.y[0], -lv.a],
        max: [x1, lv.y[1], lv.a],
        level,
        file: f,
        hot: 0,
      });
    }
  });
  return out;
}

const smooth = (p: number) => {
  const c = Math.min(1, Math.max(0, p));
  return c * c * (3 - 2 * c);
};
const pulse = (t: number, at: number, len: number) =>
  t < at || t > at + len ? 0 : Math.sin(((t - at) / len) * Math.PI);

// Everything that changes over the loop.
function scene(t: number, base: Box[]) {
  const boxes = base.map((b) => ({ ...b, hot: 0 }));
  const mem = levels[0];
  const memTop = mem.y[1];

  // Writes: small cubes fall onto the memtable and sit there until the flush.
  for (const w of WRITES) {
    if (t < w.at || t > FLUSH[0]) continue;
    const p = smooth((t - w.at) / 0.45);
    const y = memTop + (1 - p) * 0.9;
    const s = 0.045;
    boxes.push({
      min: [w.x - s, y, w.z - s],
      max: [w.x + s, y + 2 * s, w.z + s],
      level: -1,
      file: -1,
      hot: 1,
    });
  }
  // Memtable warms as it fills.
  const filled = WRITES.filter((w) => t > w.at + 0.45 && t < FLUSH[0]).length;
  boxes[0].hot = (filled / WRITES.length) * 0.55;

  // Flush: a slab of the memtable drops into the first free L0 file.
  if (t >= FLUSH[0] && t <= FLUSH[1]) {
    const p = smooth((t - FLUSH[0]) / (FLUSH[1] - FLUSH[0]));
    const l0 = levels[1];
    const y0 = mem.y[0] + (l0.y[1] + 0.02 - mem.y[0]) * p;
    boxes.push({
      min: [-mem.a * (1 - p * 0.4), y0, -mem.a],
      max: [mem.a * (1 - p * 0.4), y0 + 0.06, mem.a],
      level: -1,
      file: -1,
      hot: 1,
    });
  }
  // The new L0 file glows after the flush lands.
  const landed = pulse(t, FLUSH[1] - 0.1, 1.3);
  // Compaction: L0 files light, then a sweep runs left to right through L1 and L2.
  for (const b of boxes) {
    if (b.level === 1 && b.file === 1) b.hot = Math.max(b.hot, landed);
    if (b.level === 1) b.hot = Math.max(b.hot, pulse(t, COMPACT, 0.9));
    if (b.level === 2)
      b.hot = Math.max(b.hot, pulse(t, COMPACT + 0.5 + b.file * 0.18, 0.9));
    if (b.level === 3)
      b.hot = Math.max(
        b.hot,
        pulse(t, COMPACT + 1.3 + b.file * 0.14, 0.9) * 0.7,
      );
  }
  return boxes;
}

function hit(o: V, d: V, b: Box) {
  let tmin = -Infinity;
  let tmax = Infinity;
  let axis = 0;
  for (let i = 0; i < 3; i++) {
    const inv = 1 / d[i];
    let t0 = (b.min[i] - o[i]) * inv;
    let t1 = (b.max[i] - o[i]) * inv;
    if (t0 > t1) [t0, t1] = [t1, t0];
    if (t0 > tmin) {
      tmin = t0;
      axis = i;
    }
    if (t1 < tmax) tmax = t1;
    if (tmax < tmin) return null;
  }
  return tmin > 0 ? { t: tmin, axis } : null;
}

export function LsmAscii() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const style = getComputedStyle(canvas);
    const mono = style.fontFamily;
    const ink = style.getPropertyValue("--ascii-ink").trim() || "245,245,245";
    const hot = style.getPropertyValue("--ascii-accent").trim() || "#ffe24a";
    const dim = style.getPropertyValue("--ascii-grid").trim() || "#1a1a1a";
    const label = style.getPropertyValue("--ascii-label").trim() || "#7a7a7a";
    const base = files();
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let size = 0;
    let cellW = CELL_W;
    let cellH = CELL_H;
    let scale = 1;
    let frame = 0;
    let visible = true;
    const t0 = performance.now();

    // The camera sways; size the shot once so the whole stack, and the writes
    // falling onto it, stay inside the drawable rows at every angle.
    const SWAY = 0.32;
    const EL = 0.6;
    const basis = (az: number) => {
      const d: V = [
        -Math.cos(EL) * Math.sin(az),
        -Math.sin(EL),
        -Math.cos(EL) * Math.cos(az),
      ];
      const r: V = [Math.cos(az), 0, -Math.sin(az)];
      const u: V = [
        r[1] * d[2] - r[2] * d[1],
        r[2] * d[0] - r[0] * d[2],
        r[0] * d[1] - r[1] * d[0],
      ];
      return { d, r, u };
    };
    const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    let fitK = 1;
    let offX = 0;
    let offY = 0;
    function fitShot(cols: number, rows: number) {
      let x0 = Infinity,
        x1 = -Infinity,
        y0 = Infinity,
        y1 = -Infinity;
      const tops = levels[0].y[1] + 0.95; // highest a falling write starts
      for (let i = 0; i <= 12; i++) {
        const { r, u } = basis(
          Math.PI / 4 + SWAY * Math.sin((i / 12) * Math.PI * 2),
        );
        for (const lv of levels) {
          for (const y of [lv.y[0], lv.y[1], tops]) {
            if (y === tops && lv !== levels[0]) continue;
            for (const x of [-lv.a, lv.a])
              for (const z of [-lv.a, lv.a]) {
                const q: V = [x, y, z];
                x0 = Math.min(x0, dot(q, r));
                x1 = Math.max(x1, dot(q, r));
                y0 = Math.min(y0, dot(q, u));
                y1 = Math.max(y1, dot(q, u));
              }
          }
        }
      }
      // Leave room on the right for the level labels.
      fitK = Math.max(
        (x1 - x0) / (cols * cellW * 0.84),
        (y1 - y0) / (rows * cellH * 0.96),
      );
      offX = (x0 + x1) / 2 + fitK * cols * cellW * 0.06;
      offY = (y0 + y1) / 2;
    }

    function render(time: number) {
      const t = time % LOOP;
      const cols = Math.floor(size / cellW);
      const rows = Math.floor(size / cellH);
      const k = fitK; // world units per CSS px
      const az = Math.PI / 4 + SWAY * Math.sin((time / 26) * Math.PI * 2);
      const { d, r, u } = basis(az);
      const centre: V = [
        r[0] * offX + u[0] * offY,
        r[1] * offX + u[1] * offY,
        r[2] * offX + u[2] * offY,
      ];
      const boxes = scene(t, base);

      ctx!.clearRect(0, 0, size, size);
      ctx!.font = `${FONT * scale}px ${mono}`;
      ctx!.textBaseline = "top";
      for (let row = 0; row < rows; row++) {
        const sy = -(row + 0.5 - rows / 2) * cellH * k;
        for (let col = 0; col < cols; col++) {
          const sx = (col + 0.5 - cols / 2) * cellW * k;
          const o: V = [
            centre[0] + r[0] * sx + u[0] * sy - d[0] * 8,
            centre[1] + r[1] * sx + u[1] * sy - d[1] * 8,
            centre[2] + r[2] * sx + u[2] * sy - d[2] * 8,
          ];
          let best: { t: number; axis: number } | null = null;
          let bestBox: Box | null = null;
          for (const b of boxes) {
            const h = hit(o, d, b);
            if (h && (!best || h.t < best.t)) {
              best = h;
              bestBox = b;
            }
          }
          const x = col * cellW;
          const y = row * cellH;
          if (!best || !bestBox) {
            if (col % 4 === 0 && row % 2 === 0) {
              ctx!.fillStyle = dim;
              ctx!.fillText("·", x, y);
            }
            continue;
          }
          // Lambert shading on the hit face, plus a bright rim at box edges.
          const n: V = [0, 0, 0];
          n[best.axis] = -Math.sign(d[best.axis]);
          let shade =
            0.16 +
            0.84 *
              Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]);
          const p: V = [
            o[0] + d[0] * best.t,
            o[1] + d[1] * best.t,
            o[2] + d[2] * best.t,
          ];
          let edge = Infinity;
          for (let i = 0; i < 3; i++) {
            if (i === best.axis) continue;
            edge = Math.min(edge, p[i] - bestBox.min[i], bestBox.max[i] - p[i]);
          }
          if (edge < 0.022) shade = Math.min(1, shade + 0.45);
          const glow = bestBox.hot;
          const ch =
            RAMP[
              Math.max(
                1,
                Math.min(
                  RAMP.length - 1,
                  Math.round((shade + glow * 0.35) * (RAMP.length - 1)),
                ),
              )
            ];
          ctx!.fillStyle =
            glow > 0.35
              ? hot
              : `rgba(${ink},${(0.3 + 0.7 * shade).toFixed(2)})`;
          ctx!.fillText(ch, x, y);
        }
      }

      // Labels track each level's right-front corner as the camera sways.
      ctx!.font = `${Math.round(11 * Math.min(scale, 1.2))}px ${mono}`;
      ctx!.textBaseline = "middle";
      levels.forEach((lv) => {
        const q: V = [lv.a, (lv.y[0] + lv.y[1]) / 2, -lv.a];
        const rel: V = [q[0] - centre[0], q[1] - centre[1], q[2] - centre[2]];
        const px =
          (rel[0] * r[0] + rel[1] * r[1] + rel[2] * r[2]) / k +
          (Math.floor(size / cellW) * cellW) / 2;
        const py =
          -(rel[0] * u[0] + rel[1] * u[1] + rel[2] * u[2]) / k +
          (Math.floor(size / cellH) * cellH) / 2;
        ctx!.fillStyle = label;
        ctx!.fillText(`─ ${lv.name}`, Math.min(px + 10, size - 80), py);
      });
    }

    function tick(now: number) {
      if (!visible) return;
      render((now - t0) / 1000);
      frame = requestAnimationFrame(tick);
    }
    function fit() {
      const dpr = devicePixelRatio || 1;
      size = canvas!.clientWidth;
      canvas!.width = canvas!.height = Math.round(size * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      scale = Math.min(1.5, Math.max(1, size / 500));
      cellW = CELL_W * scale;
      cellH = CELL_H * scale;
      fitShot(Math.floor(size / cellW), Math.floor(size / cellH));
      if (reduced) render(FLUSH[0] - 0.2);
    }

    const ro = new ResizeObserver(fit);
    ro.observe(canvas);
    fit();
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      cancelAnimationFrame(frame);
      if (visible && !reduced) frame = requestAnimationFrame(tick);
    });
    io.observe(canvas);
    return () => {
      ro.disconnect();
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="lsm-ascii"
      role="img"
      aria-label="An LSM tree drawn in ASCII characters: writes fall into the memtable, a flush drops it into L0, and compaction ripples down through L1 and L2."
    />
  );
}
