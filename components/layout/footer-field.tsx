"use client";

import { useEffect, useRef } from "react";
import {
  DIAGRAMS,
  figure,
  lerpRect,
  strokeRect,
  tag,
  YELLOW,
  type Rect,
} from "./footer-hud";

// The closing scene, styled as a corrupted surveillance feed. Behind: a wall
// of ASCII fire, the classic demoscene effect: a fuel row burns at the
// bottom, heat rises by averaging the cells beneath it, cools as it climbs
// and is pushed about by turbulence and wind; embers and sparks drift up out
// of it. Cool heat is grey, hot heat burns kiban yellow, the core goes white.
// In front: a huge "kiban" in the pixel face that scrambles into noise and
// decodes back, one detection at a time locked onto the hottest flame with a
// "FIG." window that steps open, a REC light and a timecode. Every few
// seconds the signal breaks up in a burst. It only runs on screen, and holds
// one still frame for reduced motion. Labels and numbers are illustrative.

// The fire runs smooth; everything over it runs on a choppy feed clock.
const FIRE_FPS = 30;
const FPS = 10;
const RAMP = " .:-=+*#%@";
const CHARS = `${RAMP}!<>_\\/[]{}^?$&01`;
const INDEX = new Map([...CHARS].map((c, i) => [c, i]));
const NOISE = "!<>-_\\/[]{}=+*^?#%@01$&";
const CELL_W = 7; // CSS px per character cell
const CELL_H = 12;
const BG = 0; // #000000 (amoled)
// The fuel burns in rows below the frame, so the visible base is already
// blended heat rather than a flat, flickering wall of fuel.
const HIDDEN = 4;
const WORD = "kiban";
const LABELS = [
  "compaction",
  "wal::append",
  "memtable::insert",
  "sst::build",
  "merge::next",
  "fsync",
  "block::read",
  "bloom::probe",
];

// ----------------------------------------------------------------- shader --

// Each cell: glyph index, brightness, heat (for the grey, yellow, white ramp).
const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
const FRAG = `precision highp float;
uniform vec2 uCell;uniform vec2 uGridSize;uniform float uCount;
uniform sampler2D uGrid;uniform sampler2D uGlyphs;
uniform vec3 uColor;uniform float uBg;uniform float uGain;
void main(){vec2 fc=gl_FragCoord.xy;vec2 cell=floor(fc/uCell);
vec3 g=texture2D(uGrid,(cell+.5)/uGridSize).rgb;
float idx=floor(g.r*255.+.5);vec2 l=fract(fc/uCell);
float a=texture2D(uGlyphs,vec2((idx+l.x)/uCount,1.-l.y)).r;
float heat=g.b;
vec3 ink=mix(vec3(.5,.5,.48),uColor,smoothstep(.3,.62,heat));
ink=mix(ink,vec3(1.,.98,.9),smoothstep(.9,1.,heat));
gl_FragColor=vec4(vec3(uBg)+ink*a*(.15+.85*g.g)*uGain,1.);}`;

// -------------------------------------------------------------- telemetry --

type Phase = "idle" | "lock" | "open" | "hold" | "close";
const DURATION: Record<Phase, number> = {
  idle: 0.9,
  lock: 0.5,
  open: 0.3,
  hold: 3.4,
  close: 0.3,
};
const NEXT: Record<Phase, Phase> = {
  idle: "lock",
  lock: "open",
  open: "hold",
  hold: "close",
  close: "idle",
};
const STEPS = [0.2, 0.6, 1];

type Spark = { x: number; y: number; life: number; ember: boolean };

export function FooterField() {
  const root = useRef<HTMLDivElement>(null);
  const glRef = useRef<HTMLCanvasElement>(null);
  const hudRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = root.current;
    const canvas = glRef.current;
    const hudCanvas = hudRef.current;
    if (!el || !canvas || !hudCanvas) return;
    const gl = canvas.getContext("webgl", { antialias: false });
    const hud = hudCanvas.getContext("2d");
    if (!gl || !hud) return;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

    const shader = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    const u = (n: string) => gl.getUniformLocation(prog, n);

    const makeTexture = (unit: number) => {
      const tex = gl.createTexture()!;
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return tex;
    };
    const gridTex = makeTexture(0);
    const glyphTex = makeTexture(1);
    gl.uniform1i(u("uGrid"), 0);
    gl.uniform1i(u("uGlyphs"), 1);
    const [yr, yg, yb] = YELLOW.split(",").map((v) => Number(v) / 255);
    gl.uniform3f(u("uColor"), yr, yg, yb);
    gl.uniform1f(u("uBg"), BG);
    gl.uniform1f(u("uCount"), CHARS.length);
    gl.uniform1f(u("uGain"), 1);

    // Read live (the declaration updates with the stylesheet), so a font
    // swap or a late stylesheet never leaves the overlay on a stale family.
    const css = getComputedStyle(el);
    let mono = "monospace";
    let pixel = mono;
    const readFonts = () => {
      mono = css.getPropertyValue("--font-mono").trim() || "monospace";
      pixel = css.getPropertyValue("--font-pixel").trim() || mono;
    };
    readFonts();

    let w = 0;
    let h = 0;
    let dpr = 1;
    let narrow = false;
    let cols = 0;
    let rows = 0;
    let cw = 1;
    let ch = 1;
    let grid = new Uint8Array(0);
    // Heat per cell, row 0 at the bottom.
    let simRows = 0;
    let heat = new Float32Array(0);
    let next = new Float32Array(0);
    let fuel = new Float32Array(0);
    const sparks: Spark[] = [];
    let wind = 0;

    // The single detection and its window.
    const feed = {
      phase: "idle" as Phase,
      t0: 0,
      box: null as Rect | null,
      label: "",
      side: 1 as 0 | 1,
      fig: 0,
    };

    // The wordmark: each letter is either settled or showing noise.
    const word = { shown: [...WORD], settleAt: [] as number[] };
    const scramble = (t: number) => {
      word.settleAt = [...WORD].map((_, i) => t + 0.5 + i * 0.14);
    };

    // Bursts: the overlay tears and the wordmark scrambles; the fire never does.
    let burstUntil = -1;
    let nextBurst = 2.5;
    const tears: { r0: number; r1: number; shift: number }[] = [];

    const resize = () => {
      const r = el.getBoundingClientRect();
      dpr = Math.min(2, devicePixelRatio || 1);
      w = Math.round(r.width * dpr);
      h = Math.round(r.height * dpr);
      if (!w || !h) return false;
      for (const c of [canvas, hudCanvas]) {
        c.width = w;
        c.height = h;
      }
      gl.viewport(0, 0, w, h);
      narrow = r.width < 700;
      const k = narrow ? 0.72 : 1;
      cw = Math.round(CELL_W * k * dpr);
      ch = Math.round(CELL_H * k * dpr);
      cols = Math.ceil(w / cw);
      rows = Math.ceil(h / ch);
      grid = new Uint8Array(cols * rows * 3);
      simRows = rows + HIDDEN;
      heat = new Float32Array(cols * simRows);
      next = new Float32Array(cols * simRows);
      fuel = new Float32Array(cols);
      sparks.length = 0;

      const atlas = document.createElement("canvas");
      atlas.width = cw * CHARS.length;
      atlas.height = ch;
      const a = atlas.getContext("2d")!;
      a.fillStyle = "#000";
      a.fillRect(0, 0, atlas.width, ch);
      a.fillStyle = "#fff";
      a.font = `${Math.round(ch * 0.82)}px ${mono}`;
      a.textAlign = "center";
      a.textBaseline = "middle";
      [...CHARS].forEach((g, i) =>
        a.fillText(g, i * cw + cw / 2, ch / 2 + dpr),
      );
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, glyphTex);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        atlas,
      );
      gl.uniform2f(u("uCell"), cw, ch);
      gl.uniform2f(u("uGridSize"), cols, rows);
      feed.phase = "idle";
      feed.box = null;
      // Warm the fire up so the first frame is already burning.
      for (let i = 0; i < rows * 2; i++) burn(i / FIRE_FPS);
      return true;
    };

    // One step of the fire.
    const burn = (t: number) => {
      // Fuel: a wall of fire whose intensity drifts across the width, so
      // tongues rise and fall instead of a flat sheet. A slow pulse breathes.
      const pulse = 0.9 + 0.1 * Math.sin(t * 2.1);
      for (let x = 0; x < cols; x++) {
        const drift =
          0.85 +
          0.2 * Math.sin(x * 0.11 + t * 0.9) +
          0.15 * Math.sin(x * 0.037 - t * 0.6);
        fuel[x] = Math.min(
          1,
          Math.max(0, drift * pulse + (Math.random() - 0.35) * 0.6),
        );
        heat[x] = fuel[x];
        heat[cols + x] = Math.max(fuel[x], heat[cols + x] * 0.6);
      }
      // Wind wanders a little, turbulence jitters each cell.
      wind += (Math.random() - 0.5) * 0.3;
      wind = Math.max(-1, Math.min(1, wind * 0.95));
      // Decay is tuned so the fire climbs to about two thirds of the frame.
      // Slow cooling: the tallest tongues reach the top of the frame.
      const decay = 0.5 / simRows;
      // Near the top the fire cools harder, so the tallest tongues burn out
      // with headroom to spare instead of being cut off by the edge.
      const headroom = Math.round(simRows * 0.3);
      for (let y = 2; y < simRows; y++) {
        const near = simRows - y < headroom ? 1 - (simRows - y) / headroom : 0;
        const cool = decay + near * near * 0.4;
        for (let x = 0; x < cols; x++) {
          const sx = Math.min(
            cols - 1,
            Math.max(0, x + Math.round(wind + (Math.random() - 0.5) * 1.6)),
          );
          const b1 = (y - 1) * cols;
          const v =
            (heat[b1 + Math.max(0, sx - 1)] +
              heat[b1 + sx] * 2 +
              heat[b1 + Math.min(cols - 1, sx + 1)] +
              heat[(y - 2) * cols + sx]) /
            5;
          next[y * cols + x] = Math.max(0, v - cool * (0.4 + Math.random()));
        }
      }
      for (let i = 2 * cols; i < next.length; i++) heat[i] = next[i];

      // Embers drift up slowly; sparks shoot up and die fast.
      if (Math.random() < 0.9)
        for (let i = 0; i < (narrow ? 1 : 3); i++) {
          const x = Math.floor(Math.random() * cols);
          if (fuel[x] > 0.55)
            sparks.push({
              x,
              y: HIDDEN + 2 + Math.random() * simRows * 0.3,
              life: 1,
              ember: Math.random() < 0.6,
            });
        }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.y += s.ember ? 0.5 : 1.4;
        s.x += wind * 0.5 + (Math.random() - 0.5) * (s.ember ? 1.2 : 0.6);
        s.life -= s.ember ? 0.025 : 0.08;
        if (s.life <= 0 || s.y >= simRows) sparks.splice(i, 1);
      }
    };

    const put = (
      c: number,
      r: number,
      glyph: number,
      lum: number,
      hot: number,
    ) => {
      if (c < 0 || c >= cols || r < 0 || r >= rows) return;
      const i = (r * cols + c) * 3;
      grid[i] = glyph;
      grid[i + 1] = Math.round(Math.max(0, Math.min(1, lum)) * 255);
      grid[i + 2] = Math.round(Math.max(0, Math.min(1, hot)) * 255);
    };

    const paint = () => {
      for (let y = 0; y < rows; y++)
        for (let x = 0; x < cols; x++) {
          const v = heat[(y + HIDDEN) * cols + x];
          const g = Math.round(Math.min(1, v * 0.98) * (RAMP.length - 1));
          put(x, y, g, v, v);
        }
      for (const s of sparks)
        put(
          Math.round(s.x),
          Math.round(s.y) - HIDDEN,
          INDEX.get(s.ember ? "." : "^")!,
          s.life,
          0.55 + s.life * 0.4,
        );

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, gridTex);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGB,
        cols,
        rows,
        0,
        gl.RGB,
        gl.UNSIGNED_BYTE,
        grid,
      );
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    // Lock onto the hottest patch of flame clear of the wordmark band.
    const pick = (): Rect | null => {
      const bw = narrow ? 8 : 12;
      const bh = narrow ? 3 : 4;
      let best = -1;
      let at: [number, number] | null = null;
      for (let y = 2; y + bh < rows; y += 2) {
        const top = h - (y + bh) * ch;
        if (top < h * 0.14 || (top < h * 0.62 && top + bh * ch > h * 0.28))
          continue;
        for (let x = 1; x + bw < cols - 1; x += 3) {
          let s = 0;
          for (let j = 0; j < bh; j++)
            for (let i = 0; i < bw; i++)
              s += heat[(y + HIDDEN + j) * cols + x + i];
          s += Math.random() * bw * bh * 0.15;
          if (s > best) {
            best = s;
            at = [x, y];
          }
        }
      }
      if (!at) return null;
      return {
        x: at[0] * cw,
        y: h - (at[1] + bh) * ch,
        w: bw * cw,
        h: bh * ch,
      };
    };

    const insetRect = (side: 0 | 1): Rect => {
      const px = dpr;
      const iw = (narrow ? 132 : 224) * px;
      const ih = (narrow ? 100 : 164) * px;
      const m = (narrow ? 16 : 32) * px;
      return {
        x: side === 0 ? m : w - m - iw,
        y: (narrow ? 40 : 48) * px,
        w: iw,
        h: ih,
      };
    };

    const step = (t: number) => {
      // A burst every four to six seconds; the wordmark scrambles with it.
      if (t >= nextBurst) {
        burstUntil = t + 0.45 + Math.random() * 0.3;
        nextBurst = t + 4 + Math.random() * 2;
        tears.length = 0;
        for (let i = 0, n = 2 + Math.floor(Math.random() * 3); i < n; i++) {
          const r0 = Math.floor(Math.random() * rows * 0.85);
          tears.push({
            r0,
            r1: Math.min(rows, r0 + 1 + Math.floor(Math.random() * 5)),
            shift: Math.round((Math.random() - 0.5) * 50),
          });
        }
        scramble(t);
      }
      word.shown = [...WORD].map((c, i) =>
        t >= (word.settleAt[i] ?? 0)
          ? c
          : NOISE[Math.floor(Math.random() * NOISE.length)],
      );

      while (t - feed.t0 >= DURATION[feed.phase]) {
        feed.t0 += DURATION[feed.phase];
        feed.phase = NEXT[feed.phase];
        if (feed.phase === "lock") {
          feed.box = pick();
          feed.fig += 1;
          feed.label = LABELS[feed.fig % LABELS.length];
          if (feed.box) feed.side = feed.box.x + feed.box.w / 2 < w / 2 ? 0 : 1;
        }
        if (feed.phase === "idle") feed.box = null;
      }
    };

    const drawWord = (t: number) => {
      const g = hud;
      const size = Math.min(w * (narrow ? 0.2 : 0.17), h * 0.36);
      g.font = `${size}px ${pixel}`;
      g.textBaseline = "middle";
      const text = word.shown.join("");
      const tw = g.measureText(WORD).width;
      const x = (w - tw) / 2;
      const y = h * 0.45;
      const glitching = t < burstUntil;
      // A dark outline keeps the letters clean over the flames.
      g.lineJoin = "miter";
      g.lineWidth = size * 0.07;
      g.strokeStyle = "rgba(10,10,10,0.92)";
      g.strokeText(text, x, y);
      if (glitching) {
        g.fillStyle = "rgba(245,245,245,0.35)";
        g.fillText(text, x + (Math.random() - 0.5) * size * 0.08, y);
      }
      g.fillStyle = `rgb(${YELLOW})`;
      g.fillText(text, x, y);
      if (glitching && Math.random() < 0.7) {
        const sy = y - size * 0.5 + Math.random() * size * 0.8;
        const sh = size * (0.06 + Math.random() * 0.14);
        const dx = (Math.random() - 0.5) * size * 0.3;
        g.drawImage(
          hudCanvas,
          x - size * 0.12,
          sy,
          tw + size * 0.24,
          sh,
          x - size * 0.12 + dx,
          sy,
          tw + size * 0.24,
          sh,
        );
      }
    };

    const drawHud = (t: number) => {
      const g = hud;
      const px = dpr;
      const tick = Math.floor(t * FPS);
      g.clearRect(0, 0, w, h);
      const m = (narrow ? 8 : 14) * px;

      drawWord(t);

      // REC light and timecode, top left.
      g.font = `${10 * px}px ${mono}`;
      g.textBaseline = "alphabetic";
      const elapsed = t + 12 * 60 + 49;
      const two = (n: number) => String(n).padStart(2, "0");
      const code = `REC  ${two(Math.floor(elapsed / 3600))}:${two(Math.floor(elapsed / 60) % 60)}:${two(Math.floor(elapsed) % 60)}:${two(Math.floor((elapsed % 1) * 30))}`;
      if (Math.floor(t * 1.5) % 2 === 0) {
        g.fillStyle = `rgb(${YELLOW})`;
        g.fillRect(m + 10 * px, m + 12 * px, 7 * px, 7 * px);
      }
      g.fillStyle = `rgba(${YELLOW},0.85)`;
      g.fillText(code, m + 22 * px, m + 19 * px);

      // The single detection and its window.
      const b = feed.box;
      if (b) {
        const p = (t - feed.t0) / DURATION[feed.phase];
        const blinkOff = feed.phase === "lock" && Math.floor(t * 8) % 2 === 0;
        if (!blinkOff) {
          strokeRect(g, b, 2 * px, `rgb(${YELLOW})`);
          g.font = `${10 * px}px ${mono}`;
          // The reading flickers like a live meter.
          const pct = (38 + ((tick * 7919) % 400) / 10).toFixed(1);
          tag(g, b.x, b.y, `${feed.label.toUpperCase()} ${pct}%`, px, 1);
        }
        const target = insetRect(feed.side);
        let win: Rect | null = null;
        let content = 0;
        const stepAt = STEPS[Math.min(2, Math.floor(p * 3))];
        const jitter = (Math.random() < 0.5 ? -1 : 1) * 3 * px;
        if (feed.phase === "open") {
          win = lerpRect(b, target, stepAt);
          win.x += jitter;
          content = p > 0.66 ? 1 : 0;
        } else if (feed.phase === "hold") {
          win = target;
          content = 1;
        } else if (feed.phase === "close") {
          win = lerpRect(target, b, stepAt);
          win.x += jitter;
        }
        if (win) {
          const near = feed.side === 0 ? win.x + win.w : win.x;
          const edge = feed.side === 0 ? b.x : b.x + b.w;
          g.strokeStyle = `rgba(${YELLOW},0.85)`;
          g.lineWidth = 1.5 * px;
          g.beginPath();
          g.moveTo(edge, b.y);
          g.lineTo(near, win.y);
          g.moveTo(edge, b.y + b.h);
          g.lineTo(near, win.y + win.h);
          g.stroke();
          g.font = `${10 * px}px ${mono}`;
          const draw = DIAGRAMS[feed.fig % DIAGRAMS.length];
          figure(g, win, `[ FIG. ${feed.fig} ]`, px, content, (body) =>
            draw(g, body, tick / FPS, px),
          );
        }
      }

      // During a burst the whole overlay tears with the picture.
      if (t < burstUntil)
        for (const tr of tears) {
          const y = h - tr.r1 * ch;
          const bh = (tr.r1 - tr.r0) * ch;
          g.drawImage(hudCanvas, 0, y, w, bh, tr.shift * cw * 0.5, y, w, bh);
        }
    };

    const start = performance.now();
    let frame = 0;
    let running = false;
    let lastTick = -1;
    let lastBurn = -1;
    const render = (now: number) => {
      const secs = (now - start) / 1000;
      // Fire: a smooth, steady 30 fps.
      const burnTick = Math.floor(secs * FIRE_FPS);
      if (burnTick !== lastBurn) {
        lastBurn = burnTick;
        burn(burnTick / FIRE_FPS);
        paint();
      }
      // Overlay: a low, stuttering feed rate.
      const tick = Math.floor(secs * FPS);
      if (tick !== lastTick) {
        lastTick = tick;
        const t = tick / FPS;
        readFonts();
        step(t);
        drawHud(t);
      }
      if (running) frame = requestAnimationFrame(render);
    };
    const play = () => {
      if (running || still) return;
      running = true;
      frame = requestAnimationFrame(render);
    };
    const pause = () => {
      running = false;
      cancelAnimationFrame(frame);
    };
    // Reduced motion: one settled frame, word resolved, window open.
    const frozen = () => {
      feed.box = pick();
      feed.phase = "hold";
      feed.t0 = 0;
      feed.fig = 1;
      feed.label = LABELS[1];
      if (feed.box) feed.side = feed.box.x + feed.box.w / 2 < w / 2 ? 0 : 1;
      word.settleAt = [];
      word.shown = [...WORD];
      paint();
      drawHud(0);
    };

    let ready = false;
    let visible = false;
    const boot = () =>
      document.fonts.ready.then(() => {
        if (!resize()) return;
        ready = true;
        scramble(0);
        if (still) frozen();
        else if (visible) play();
      });

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (!ready) {
          if (visible) boot();
          return;
        }
        if (visible) play();
        else pause();
      },
      { rootMargin: "200px 0px" },
    );
    io.observe(el);
    const ro = new ResizeObserver(() => {
      if (!ready || !resize()) return;
      if (still) frozen();
    });
    ro.observe(el);

    return () => {
      pause();
      io.disconnect();
      ro.disconnect();
      // Free GPU objects but keep the context: a remount reuses this canvas.
      gl.deleteTexture(gridTex);
      gl.deleteTexture(glyphTex);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
    };
  }, []);

  return (
    <div className="footer-field" ref={root} aria-hidden="true">
      <canvas ref={glRef} />
      <canvas ref={hudRef} />
    </div>
  );
}
