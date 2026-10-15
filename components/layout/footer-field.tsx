"use client";

import { useEffect, useRef } from "react";

// The closing scene: a living field of ASCII noise in kiban yellow, brightest
// along the bottom edge and rising like heat, with "kiban" carved out of it as
// negative space. Over it, a tracking overlay locks small squares onto the
// brightest patches, joins them with hairlines and tags them with engine
// readouts. The field is a WebGL shader; the tracker samples the same noise on
// the CPU. It only runs while on screen, and holds still for reduced motion.

const RAMP = " .:-=+*#%@";
const CELL_W = 7; // CSS px per character cell
const CELL_H = 12;
const YELLOW: [number, number, number] = [1, 0.886, 0.29];
const BG = 0.039; // #0a0a0a
const MAX_BOXES = 7;
const LABELS = [
  "seq {n}",
  "wal 0007",
  "fsync ok",
  "sst 0012",
  "L1 0x2a",
  "manifest v41",
  "crc 9f1c",
  "snap 41",
  "pear=green",
  "block 3/16",
];

// Same noise on the GPU and the CPU, so the tracker follows what is drawn.
const fract = (x: number) => x - Math.floor(x);
function hash(x: number, y: number, z: number) {
  let px = fract(x * 0.1031);
  let py = fract(y * 0.1031);
  let pz = fract(z * 0.1031);
  const d = px * (pz + 31.32) + py * (py + 31.32) + pz * (px + 31.32);
  px += d;
  py += d;
  pz += d;
  return fract((px + py) * pz);
}
function noise(x: number, y: number, z: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  let fx = x - ix;
  let fy = y - iy;
  let fz = z - iz;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  fz = fz * fz * (3 - 2 * fz);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  const h = (a: number, b: number, c: number) => hash(ix + a, iy + b, iz + c);
  return l(
    l(l(h(0, 0, 0), h(1, 0, 0), fx), l(h(0, 1, 0), h(1, 1, 0), fx), fy),
    l(l(h(0, 0, 1), h(1, 0, 1), fx), l(h(0, 1, 1), h(1, 1, 1), fx), fy),
    fz,
  );
}
function fbm(x: number, y: number, z: number) {
  let a = 0.5;
  let s = 0;
  for (let i = 0; i < 4; i++) {
    s += a * noise(x, y, z);
    x *= 2.03;
    y *= 2.03;
    z *= 2.03;
    a *= 0.5;
  }
  return s;
}
// u is horizontal in heights, v is 0 at the bottom edge and 1 at the top.
function field(u: number, v: number, t: number) {
  const n = fbm(u * 2.6, v * 2.6 - t * 0.09, t * 0.07);
  const rise = Math.pow(1 - v, 1.6);
  const b = Math.min(1, Math.max(0, (n - 0.34) * 3));
  return b * (0.35 + 0.85 * rise);
}

const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
const FRAG = `precision highp float;
uniform vec2 uRes;uniform vec2 uCell;uniform float uTime;uniform float uCount;
uniform sampler2D uGlyphs;uniform sampler2D uMask;uniform vec3 uColor;uniform float uBg;
float hash(vec3 p){p=fract(p*.1031);p+=dot(p,p.zyx+31.32);return fract((p.x+p.y)*p.z);}
float noise(vec3 x){vec3 i=floor(x);vec3 f=fract(x);f=f*f*(3.-2.*f);
return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*noise(p);p*=2.03;a*=.5;}return s;}
float field(vec2 uv,float t){float n=fbm(vec3(uv.x*2.6,uv.y*2.6-t*.09,t*.07));
float rise=pow(1.-uv.y,1.6);return clamp((n-.34)*3.,0.,1.)*(.35+.85*rise);}
void main(){vec2 fc=gl_FragCoord.xy;vec2 cell=floor(fc/uCell);vec2 c=(cell+.5)*uCell;
float m=texture2D(uMask,vec2(c.x/uRes.x,1.-c.y/uRes.y)).r;
if(m>.5){gl_FragColor=vec4(vec3(uBg),1.);return;}
float b=field(c/uRes.y,uTime);
float fade=smoothstep(1.,.82,c.y/uRes.y);
b=max(b,.24+.06*hash(vec3(cell,floor(uTime*1.5))));
float edge=0.;for(int k=0;k<4;k++){vec2 o=k==0?vec2(1,0):k==1?vec2(-1,0):k==2?vec2(0,1):vec2(0,-1);
vec2 q=c+o*uCell;edge=max(edge,texture2D(uMask,vec2(q.x/uRes.x,1.-q.y/uRes.y)).r);}
if(edge>.5)b=max(b,.62);
float idx=floor(b*(uCount-1.)+.5);vec2 l=fract(fc/uCell);
float a=texture2D(uGlyphs,vec2((idx+l.x)/uCount,1.-l.y)).r;
gl_FragColor=vec4(vec3(uBg)+uColor*a*mix(.16,1.,b*b)*fade,1.);}`;

type Box = {
  x: number;
  y: number;
  tx: number;
  ty: number;
  size: number;
  tsize: number;
  alpha: number;
  talpha: number;
  label: string;
};

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
    const u = (n: string) => gl.getUniformLocation(prog, n);

    const texture = (unit: number, source: HTMLCanvasElement) => {
      const tex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        source,
      );
      return tex;
    };

    const css = getComputedStyle(el);
    const mono = css.getPropertyValue("--font-mono") || "monospace";
    const sans = css.getPropertyValue("--font-sans") || "sans-serif";

    let w = 0;
    let h = 0;
    let dpr = 1;
    let narrow = false;
    let mask: Uint8ClampedArray | null = null;
    let glyphTex: WebGLTexture | null = null;
    let maskTex: WebGLTexture | null = null;
    const boxes: Box[] = [];
    let seq = 4120;
    let nextLabel = 0;
    let lastTarget = -Infinity;

    const layout = () => {
      const r = el.getBoundingClientRect();
      dpr = Math.min(2, devicePixelRatio || 1);
      w = Math.round(r.width * dpr);
      h = Math.round(r.height * dpr);
      if (!w || !h) return;
      for (const c of [canvas, hudCanvas]) {
        c.width = w;
        c.height = h;
      }
      gl.viewport(0, 0, w, h);
      narrow = r.width < 700;
      const k = narrow ? 0.62 : 1;
      const cw = Math.round(CELL_W * k * dpr);
      const ch = Math.round(CELL_H * k * dpr);

      // Glyph atlas: one cell per ramp character, white on black.
      const atlas = document.createElement("canvas");
      atlas.width = cw * RAMP.length;
      atlas.height = ch;
      const a = atlas.getContext("2d")!;
      a.fillStyle = "#000";
      a.fillRect(0, 0, atlas.width, ch);
      a.fillStyle = "#fff";
      a.font = `${Math.round(ch * 0.82)}px ${mono}`;
      a.textAlign = "center";
      a.textBaseline = "middle";
      [...RAMP].forEach((g, i) => a.fillText(g, i * cw + cw / 2, ch / 2 + dpr));

      // Mask: the wordmark, fitted to the width, sitting low in the frame.
      const m = document.createElement("canvas");
      m.width = w;
      m.height = h;
      const mc = m.getContext("2d")!;
      mc.fillStyle = "#000";
      mc.fillRect(0, 0, w, h);
      mc.fillStyle = "#fff";
      mc.font = `800 100px ${sans}`;
      const probe = mc.measureText("kiban");
      const fit = Math.min(
        (w * 0.9) / probe.width,
        (h * 0.62) /
          (probe.actualBoundingBoxAscent + probe.actualBoundingBoxDescent),
      );
      const size = 100 * fit;
      mc.font = `800 ${size}px ${sans}`;
      if ("letterSpacing" in mc) mc.letterSpacing = `${-0.05 * size}px`;
      const met = mc.measureText("kiban");
      const textH = met.actualBoundingBoxAscent + met.actualBoundingBoxDescent;
      mc.textAlign = "center";
      mc.textBaseline = "alphabetic";
      mc.fillText(
        "kiban",
        w / 2,
        h * 0.52 + textH / 2 - met.actualBoundingBoxDescent,
      );
      mask = mc.getImageData(0, 0, w, h).data;

      if (glyphTex) gl.deleteTexture(glyphTex);
      if (maskTex) gl.deleteTexture(maskTex);
      glyphTex = texture(0, atlas);
      maskTex = texture(1, m);
      gl.uniform1i(u("uGlyphs"), 0);
      gl.uniform1i(u("uMask"), 1);
      gl.uniform2f(u("uRes"), w, h);
      gl.uniform2f(u("uCell"), cw, ch);
      gl.uniform1f(u("uCount"), RAMP.length);
      gl.uniform3f(u("uColor"), ...YELLOW);
      gl.uniform1f(u("uBg"), BG);
      boxes.length = 0;
      lastTarget = -Infinity;
    };

    const inMask = (x: number, y: number) => {
      if (!mask) return false;
      const px = Math.min(w - 1, Math.max(0, Math.round(x)));
      const py = Math.min(h - 1, Math.max(0, Math.round(y)));
      return mask[(py * w + px) * 4] > 127;
    };

    // Find the brightest local peaks of the field, away from the letters.
    const retarget = (t: number) => {
      const cols = 40;
      const rows = Math.max(8, Math.round((cols * h) / w));
      const grid: number[] = [];
      for (let j = 0; j < rows; j++)
        for (let i = 0; i < cols; i++) {
          const x = ((i + 0.5) / cols) * w;
          const y = ((j + 0.5) / rows) * h; // from the top
          grid.push(inMask(x, y) ? -1 : field(x / h, 1 - y / h, t));
        }
      const peaks: { x: number; y: number; b: number }[] = [];
      for (let j = 1; j < rows - 1; j++)
        for (let i = 1; i < cols - 1; i++) {
          const b = grid[j * cols + i];
          if (b < 0.42) continue;
          let top = true;
          for (let dj = -1; dj <= 1 && top; dj++)
            for (let di = -1; di <= 1; di++)
              if ((di || dj) && grid[(j + dj) * cols + i + di] > b) {
                top = false;
                break;
              }
          if (top)
            peaks.push({
              x: ((i + 0.5) / cols) * w,
              y: ((j + 0.5) / rows) * h,
              b,
            });
        }
      peaks.sort((p, q) => q.b - p.b);
      const chosen = peaks.slice(0, narrow ? 3 : MAX_BOXES);
      seq += 1 + Math.floor(Math.random() * 9);
      const free = new Set(boxes);
      for (const p of chosen) {
        let best: Box | null = null;
        let dist = w * 0.18;
        for (const bx of free) {
          const d = Math.hypot(bx.tx - p.x, bx.ty - p.y);
          if (d < dist) {
            dist = d;
            best = bx;
          }
        }
        const tsize = (narrow ? 8 + p.b * 14 : 10 + p.b * 26) * dpr;
        if (best) {
          free.delete(best);
          Object.assign(best, { tx: p.x, ty: p.y, tsize, talpha: 1 });
        } else {
          boxes.push({
            x: p.x,
            y: p.y,
            tx: p.x,
            ty: p.y,
            size: tsize * 0.4,
            tsize,
            alpha: 0,
            talpha: 1,
            label: LABELS[nextLabel++ % LABELS.length],
          });
        }
      }
      for (const bx of free) bx.talpha = 0;
    };

    const drawHud = (ease: number) => {
      hud.clearRect(0, 0, w, h);
      for (let i = boxes.length - 1; i >= 0; i--) {
        const b = boxes[i];
        b.x += (b.tx - b.x) * ease;
        b.y += (b.ty - b.y) * ease;
        b.size += (b.tsize - b.size) * ease;
        b.alpha += (b.talpha - b.alpha) * ease;
        if (b.talpha === 0 && b.alpha < 0.02) boxes.splice(i, 1);
      }
      const [r, g, bl] = YELLOW.map((c) => Math.round(c * 255));
      const ink = (a: number) => `rgba(${r},${g},${bl},${a})`;
      const sorted = [...boxes].sort((p, q) => p.x - q.x);
      hud.lineWidth = dpr;
      for (let i = 1; i < sorted.length; i++) {
        const p = sorted[i - 1];
        const q = sorted[i];
        hud.strokeStyle = ink(Math.min(p.alpha, q.alpha) * 0.45);
        hud.beginPath();
        hud.moveTo(p.x, p.y);
        hud.lineTo(q.x, q.y);
        hud.stroke();
      }
      hud.font = `${10 * dpr}px ${mono}`;
      hud.textBaseline = "bottom";
      for (const b of boxes) {
        const s = b.size;
        hud.fillStyle = `rgba(10,10,10,${b.alpha * 0.85})`;
        hud.fillRect(b.x - s / 2, b.y - s / 2, s, s);
        hud.strokeStyle = ink(b.alpha * 0.95);
        hud.strokeRect(
          Math.round(b.x - s / 2) + 0.5,
          Math.round(b.y - s / 2) + 0.5,
          Math.round(s),
          Math.round(s),
        );
        hud.fillStyle = ink(b.alpha);
        hud.fillRect(b.x - dpr, b.y - dpr, 2 * dpr, 2 * dpr);
        hud.fillStyle = ink(b.alpha * 0.85);
        hud.fillText(
          b.label.replace("{n}", String(seq)),
          b.x + s / 2 + 5 * dpr,
          b.y - s / 2 + 2 * dpr,
        );
      }
    };

    const start = performance.now() - 20000;
    let frame = 0;
    let running = false;
    const render = (now: number) => {
      const t = (now - start) / 1000;
      gl.uniform1f(u("uTime"), t);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (t - lastTarget > 0.7) {
        retarget(t);
        lastTarget = t;
      }
      drawHud(0.08);
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
    const frozen = () => {
      // One settled frame for reduced motion.
      const t = 30;
      gl.uniform1f(u("uTime"), t);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      retarget(t);
      drawHud(1);
    };

    let ready = false;
    let visible = false;
    const boot = () =>
      document.fonts.ready.then(() => {
        layout();
        ready = true;
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
      if (!ready) return;
      layout();
      if (still) frozen();
    });
    ro.observe(el);

    return () => {
      pause();
      io.disconnect();
      ro.disconnect();
      // Free GPU objects but keep the context: a remount reuses this canvas.
      if (glyphTex) gl.deleteTexture(glyphTex);
      if (maskTex) gl.deleteTexture(maskTex);
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
