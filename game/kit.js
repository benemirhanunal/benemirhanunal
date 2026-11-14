// Sakura Road scene kit: skies, mountains, pagodas, sakura trees, torii, lanterns and the hero, drawn into a pixelfx frame.
// Everything is a function of (t) over a loop of length T, so every scene loops without a seam.
import {
  hex, mix, rgb, Rng, rand, noise, noise2, fbm, clamp, lerp, TAU, seg, ease, posed, skeleton,
  createFrame, clearFrame, painterFor, composite, resolveOptions, createFx,
} from "./pixelfx/core/index.js";
import { DUMMY_PAL } from "./pixelfx/core/actor.js";

export { createFrame, clearFrame, painterFor, composite, resolveOptions, createFx, hex, mix, rand, Rng, clamp, lerp, TAU, seg, ease };

const H = (s) => hex(s);
/** seconds per frame, set by whoever drives the frames (12.5 fps GIFs, the live game) */
export const clock = { dt: 0.08 };
export const ramp = (...xs) => xs.map(H);

// ---------------------------------------------------------------- palette
export const COL = {
  ink: H("#120c1a"),
  bark: ramp("#140c16", "#26151f", "#3d2230", "#5a3442", "#7a4d57"),
  blossom: ramp("#3f1838", "#6e2752", "#a83c6e", "#d9628f", "#f390b2", "#ffc4d6", "#fff0f5"),
  torii: ramp("#3a0d18", "#6e1724", "#a8242e", "#d8463a", "#ff7a52"),
  toriiTop: ramp("#0e0a14", "#1e1626", "#2e2438"),
  stone: ramp("#1b1826", "#2b2638", "#3e3850", "#57506b", "#7a7290", "#a39bb6"),
  warm: ramp("#5a2a10", "#a8521a", "#f09a32", "#ffd27a", "#fff3c4"),
};

// 4x4 Bayer threshold
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
export const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];

// direct pixel access on a frame (opaque)
export function put(f, x, y, c) {
  x |= 0; y |= 0;
  if (x < 0 || y < 0 || x >= f.w || y >= f.h) return;
  f.color[y * f.w + x] = c;
}
export function get(f, x, y) {
  x |= 0; y |= 0;
  if (x < 0 || y < 0 || x >= f.w || y >= f.h) return 0;
  return f.color[y * f.w + x];
}
export function blendPx(f, x, y, c, a) {
  x |= 0; y |= 0;
  if (x < 0 || y < 0 || x >= f.w || y >= f.h || a <= 0) return;
  const i = y * f.w + x;
  f.color[i] = mix(f.color[i] || c, c, clamp(a));
}
export function rect(f, x, y, w, h, c) {
  for (let j = Math.max(0, y | 0); j < Math.min(f.h, (y + h) | 0); j++)
    for (let i = Math.max(0, x | 0); i < Math.min(f.w, (x + w) | 0); i++) f.color[j * f.w + i] = c;
}
export function addLight(f, x, y, c, k) {
  x |= 0; y |= 0;
  if (x < 0 || y < 0 || x >= f.w || y >= f.h || k <= 0) return;
  const i = y * f.w + x, L = f.light[i];
  const r = Math.min(255, (L & 255) + (c & 255) * k), g = Math.min(255, ((L >>> 8) & 255) + ((c >>> 8) & 255) * k), b = Math.min(255, ((L >>> 16) & 255) + ((c >>> 16) & 255) * k);
  f.light[i] = rgb(r, g, b);
}
/** soft round glow into the light buffer, quantized into rings so it stays pixel-art */
export function glow(f, x, y, r, c, k, steps = 4) {
  for (let j = Math.floor(y - r); j <= y + r; j++)
    for (let i = Math.floor(x - r); i <= x + r; i++) {
      const d = Math.hypot(i + 0.5 - x, j + 0.5 - y) / r;
      if (d >= 1) continue;
      const v = Math.ceil((1 - d) * (1 - d) * steps) / steps;
      addLight(f, i, j, c, v * k);
    }
}

// ---------------------------------------------------------------- sky
/** banded sky: stops top -> bottom; dithered seams between bands */
export function sky(f, stops, y0 = 0, y1 = f.h) {
  const C = stops.map(H), n = C.length - 1;
  for (let y = y0; y < y1; y++) {
    const u = ((y - y0) / Math.max(1, y1 - y0)) * n, b = Math.min(n - 1, Math.floor(u)), fr = u - b;
    const e = clamp((fr - 0.55) / 0.45);
    for (let x = 0; x < f.w; x++) put(f, x, y, e > bayer(x, y) ? C[b + 1] : C[b]);
  }
  for (let y = y1; y < f.h; y++) for (let x = 0; x < f.w; x++) put(f, x, y, C[n]);
}
export function stars(f, t, T, { n = 70, y1 = 70, seed = 3, c = "#fff6e0", dim = "#8d86b8" } = {}) {
  const R = new Rng(seed), C = H(c), D = H(dim);
  for (let i = 0; i < n; i++) {
    const x = R.int(0, f.w - 1), y = R.int(0, y1), ph = R.range(0, TAU), k = R.int(1, 3), big = R.chance(0.12);
    const tw = 0.5 + 0.5 * Math.sin(TAU * k * (t / T) + ph);
    const yfade = 1 - y / y1;
    if (tw * yfade < 0.15) continue;
    put(f, x, y, tw > 0.6 ? C : D);
    if (big && tw > 0.7) { put(f, x - 1, y, D); put(f, x + 1, y, D); put(f, x, y - 1, D); put(f, x, y + 1, D); addLight(f, x, y, C, 0.35); }
  }
}
/** a moon or sun: shaded disc + quantized halo */
export function orb(f, x, y, r, { body = ["#fff9e8", "#ffe9b8", "#e8c48c"], halo = "#ffd9a8", k = 0.35, craters = true } = {}) {
  const B = body.map(H);
  glow(f, x, y, r * 4.2, H(halo), k * 0.55, 5);
  glow(f, x, y, r * 2, H(halo), k * 0.6, 3);
  for (let j = -r; j <= r; j++)
    for (let i = -r; i <= r; i++) {
      const d = Math.hypot(i + 0.5, j + 0.5);
      if (d > r) continue;
      const lit = (-(i + 0.5) * 0.6 - (j + 0.5) * 0.5) / r;
      let c = lit > 0.25 ? B[0] : lit > -0.45 ? B[1] : B[2];
      if (craters && noise2((x + i) * 0.45, (y + j) * 0.45, 9) > 0.68) c = B[2];
      put(f, x + i, y + j, c);
    }
}
/** drifting pixel clouds, seamless over T (they travel `span` px per loop) */
export function clouds(f, t, T, { y = 30, n = 5, seed = 1, cols = ["#f7d7e4", "#d9a9c6", "#a57aa6"], span = f.w + 120, h = 7, speed = 1 } = {}) {
  const C = cols.map(H), R = new Rng(seed);
  for (let i = 0; i < n; i++) {
    const bx = R.range(0, span), by = y + R.range(-8, 8), w = R.range(24, 56), hh = h * R.range(0.7, 1.3);
    const x = ((bx + (t / T) * span * speed) % span) - 60;
    const puffs = Math.max(3, Math.round(w / 9)), pr = new Rng(seed * 31 + i);
    const P = [];
    for (let q = 0; q < puffs; q++) P.push([x + (q / (puffs - 1)) * w, by - pr.range(0, hh * 0.9), pr.range(hh * 0.55, hh)]);
    // flat base
    for (let px = Math.floor(x - 4); px < x + w + 4; px++)
      for (let py = Math.floor(by - hh * 2); py <= by + 1; py++) {
        let inside = false, lit = 0;
        for (const [cx, cy, r] of P) {
          const d = Math.hypot(px - cx, (py - cy) * 1.25);
          if (d < r) { inside = true; lit = Math.max(lit, ((cx - px) * 0.3 + (cy - py)) / r); }
        }
        if (!inside || py > by + 1) continue;
        put(f, px, py, py >= by ? C[2] : lit > 0.35 ? C[0] : C[1]);
      }
  }
}
/** mountain range layer: 1D ridge from fbm; optional snow above `snow` */
export function ridge(f, { base, amp, freq = 0.02, seed = 1, cols, snow = null, snowCols = null, peak = null, offset = 0 }) {
  const C = cols.map(H), S = snowCols?.map(H);
  for (let x = 0; x < f.w; x++) {
    let h = fbm((x + offset) * freq, 0.5, seed, 4) * amp;
    if (peak) { const d = Math.abs(x - peak.x) / peak.w; h = Math.max(h, peak.h * (1 - d) + noise((x + offset) * 0.3, seed) * 2); }
    const top = Math.round(base - h);
    for (let y = Math.max(0, top); y < f.h; y++) {
      const fromTop = y - top;
      // light from the upper left: slopes facing left are lighter
      const slope = (fbm((x + 1 + offset) * freq, 0.5, seed, 4) - fbm((x - 1 + offset) * freq, 0.5, seed, 4)) * amp;
      let c = C[fromTop < 2 && slope > 0 ? 0 : 1];
      if (C[2] && fromTop > 10 + noise(x * 0.2, seed) * 6) c = C[2];
      if (S && snow != null && y < snow + noise(x * 0.35, seed + 4) * 5 + Math.abs(x - (peak?.x ?? 0)) * 0.12) c = x < (peak?.x ?? 0) + noise(y * 0.3, 2) * 3 ? S[0] : S[1];
      put(f, x, y, c);
    }
  }
}
/** horizontal mist band, truly translucent */
export function mist(f, t, T, { y, h = 8, c = "#f3c7d8", a = 0.35, seed = 2 } = {}) {
  const C = H(c);
  for (let j = 0; j < h; j++) {
    const v = Math.sin(Math.PI * (j + 0.5) / h);
    for (let x = 0; x < f.w; x++) {
      const n = noise2(x * 0.04 + (t / T) * 4, j * 0.2, seed); // drifts 4 noise cells per loop: noise is not periodic, keep a low
      const k = a * v * clamp(0.4 + n * 0.9);
      if (k > 0.04) blendPx(f, x, y + j, C, Math.round(k * 6) / 6);
    }
  }
}

/** fireflies / warm motes: wander on closed loops, pulse, glow. Seamless over T. */
export function motes(f, t, T, { n = 14, x0 = 0, x1 = f.w, y0 = 80, y1 = 110, seed = 6, c = "#ffe48a", core = "#fffbe0" } = {}) {
  const C = H(c), W = H(core), R = new Rng(seed);
  for (let i = 0; i < n; i++) {
    const bx = R.range(x0, x1), by = R.range(y0, y1), ax = R.range(6, 16), ay = R.range(3, 8), k1 = R.int(1, 2), k2 = R.int(1, 3), ph = R.range(0, TAU), pk = R.int(1, 3);
    const u = TAU * (t / T);
    const x = bx + Math.sin(u * k1 + ph) * ax, y = by + Math.sin(u * k2 + ph * 2) * ay;
    const pulse = 0.5 + 0.5 * Math.sin(u * pk * 2 + ph * 3);
    if (pulse < 0.2) continue;
    put(f, x, y, pulse > 0.7 ? W : C);
    glow(f, x, y, 6, C, 0.45 * pulse, 3);
  }
}

// ---------------------------------------------------------------- buildings
/** a pagoda silhouette with lit windows */
export function pagoda(f, cx, gy, { tiers = 5, w = 26, th = 9, col = "#2a2140", rim = "#4a3a62", win = "#ffcf7a", t = 0, T = 10 } = {}) {
  const C = H(col), RIM = H(rim), WIN = H(win);
  let y = gy;
  for (let i = 0; i < tiers; i++) {
    const ww = w * (1 - i * 0.13), bw = ww * 0.62;
    rect(f, cx - bw / 2, y - th + 2, bw, th - 2, C); // body
    if (i < tiers) {
      const lit = 0.6 + 0.4 * Math.sin(TAU * (t / T) * (i + 1) + i);
      for (let k = -1; k <= 1; k += 2) if (lit > 0.45) { put(f, cx + k * 2, y - 4, WIN); addLight(f, cx + k * 2, y - 4, WIN, 0.5); }
    }
    // roof with upturned eaves
    const ry = y - th + 2;
    for (let x = -ww / 2 - 2; x <= ww / 2 + 2; x++) {
      const e = Math.abs(x) / (ww / 2 + 2), up = e > 0.85 ? Math.round((e - 0.85) * 14) : 0;
      put(f, cx + x, ry - up, RIM); put(f, cx + x, ry + 1 - up, C);
      if (Math.abs(x) < ww / 2 - 1) put(f, cx + x, ry - 1, C);
    }
    y -= th;
  }
  for (let j = 0; j < 9; j++) put(f, cx, y - j + 1, C); // spire
  put(f, cx - 1, y - 3, C); put(f, cx + 1, y - 3, C); put(f, cx - 1, y - 6, C); put(f, cx + 1, y - 6, C);
}

/** torii gate: pillars, nuki, kasagi with upswept ends, and a plaque with a label */
export function torii(f, p, cx, gy, { h = 52, w = 56, label = "", glowK = 0 } = {}) {
  const R = COL.torii, K = COL.toriiTop;
  const pw = 4, top = gy - h;
  for (const s of [-1, 1]) {
    const px = Math.round(cx + s * (w / 2 - 8) - pw / 2);
    for (let y = top + 6; y < gy; y++) {
      const lean = Math.round(((y - top) / h) * 1.2) * s; // splay slightly at the base
      for (let i = 0; i < pw; i++) put(f, px + i + lean, y, i === 0 ? R[3] : i === pw - 1 ? R[1] : R[2]);
      put(f, px - 1 + lean, y, COL.ink); put(f, px + pw + lean, y, COL.ink);
    }
    // black base sleeve
    rect(f, px - 1 + Math.round(1.2 * s), gy - 5, pw + 2, 5, K[1]);
    rect(f, px - 1 + Math.round(1.2 * s), gy - 5, pw + 2, 1, K[2]);
  }
  // nuki (lower beam)
  const ny = top + 14;
  rect(f, cx - w / 2 + 3, ny, w - 6, 3, R[2]); rect(f, cx - w / 2 + 3, ny, w - 6, 1, R[3]); rect(f, cx - w / 2 + 3, ny + 3, w - 6, 1, COL.ink);
  // shimaki + kasagi (top beams), upswept
  for (let x = -w / 2 - 4; x <= w / 2 + 4; x++) {
    const e = Math.abs(x) / (w / 2 + 4), up = Math.round(Math.pow(e, 3) * 4);
    const X = Math.round(cx + x);
    put(f, X, top - up - 1, COL.ink);
    put(f, X, top - up, K[2]); put(f, X, top - up + 1, K[1]); put(f, X, top - up + 2, K[1]);
    if (Math.abs(x) <= w / 2) { put(f, X, top + 3, R[3]); put(f, X, top + 4, R[2]); put(f, X, top + 5, R[1]); put(f, X, top + 6, COL.ink); }
  }
  // gakuzuka + plaque
  rect(f, cx - 1, top + 6, 3, ny - top - 6, R[2]);
  if (label) {
    const [tw] = p.measure(label);
    const bw = Math.max(9, tw + 5), bx = Math.round(cx - bw / 2), by = top + 5;
    rect(f, bx - 1, by - 1, bw + 2, 10, COL.ink); rect(f, bx, by, bw, 8, K[1]); rect(f, bx + 1, by + 1, bw - 2, 6, K[0]);
    p.text(label, cx + 1, by + 2, H("#ffd27a"), { align: "center" });
    if (glowK) glow(f, cx, by + 4, 14, H("#ffb347"), glowK, 4);
  }
}

/** stone lantern (toro), flame flickers on a loop */
export function toro(f, x, gy, t, T, { seed = 1, k = 1 } = {}) {
  const S = COL.stone, W = COL.warm;
  const rows = [
    "...aa...",
    "..abbc..",
    ".aabbbc.",
    "abbbbbcc",
    ".dFFFFd.",
    ".dFWWFd.",
    ".dFFFFd.",
    "aabbbbcc",
    "..abc...",
    "..abc...",
    "..abc...",
    ".aabbc..",
    "aabbbccc",
  ];
  const fl = 0.75 + 0.25 * Math.sin(TAU * 3 * (t / T) + seed) * Math.sin(TAU * 5 * (t / T) + seed * 2);
  const pal = { a: S[4], b: S[3], c: S[2], d: S[1], F: fl > 0.8 ? W[3] : W[2], W: W[4] };
  const y0 = gy - rows.length;
  rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== ".") put(f, x - 4 + i, y0 + j, pal[ch]); }));
  glow(f, x, y0 + 5, 16 * k, W[2], 0.35 * fl * k, 4);
  glow(f, x, y0 + 5, 5, W[3], 0.5 * fl, 2);
}

// ---------------------------------------------------------------- sakura tree
/** grow a tree: branches + blossom clumps, deterministic from seed. Base at (x, gy). */
export function growTree(x, gy, { seed = 1, size = 1, lean = 0, spread = 1 } = {}) {
  const R = new Rng(seed), segs = [], blobs = [];
  function branch(x0, y0, a, len, w, depth) {
    const pts = [[x0, y0]];
    let cx = x0, cy = y0, ca = a;
    const n = Math.max(2, Math.round(len / 5));
    for (let i = 0; i < n; i++) {
      ca += R.range(-0.22, 0.22);
      cx += Math.cos(ca) * (len / n); cy += Math.sin(ca) * (len / n);
      pts.push([cx, cy]);
    }
    segs.push({ pts, w0: w, w1: Math.max(1, w * 0.62), depth });
    if (depth >= 4 || len < 7) {
      const cnt = R.int(2, 4);
      for (let i = 0; i < cnt; i++) blobs.push({ x: cx + R.range(-6, 6) * size, y: cy + R.range(-5, 3) * size, r: R.range(5, 9) * size, ph: R.range(0, TAU), depth });
      return;
    }
    if (depth >= 2) blobs.push({ x: cx + R.range(-4, 4), y: cy + R.range(-3, 2), r: R.range(5, 8) * size, ph: R.range(0, TAU), depth });
    const kids = depth === 0 ? 3 : R.int(2, 3);
    for (let k = 0; k < kids; k++) {
      const da = (k - (kids - 1) / 2) * R.range(0.45, 0.8) * spread + R.range(-0.15, 0.15);
      branch(cx, cy, ca + da, len * R.range(0.62, 0.8), w * 0.62, depth + 1);
    }
  }
  branch(x, gy, -Math.PI / 2 + lean, 26 * size, 6 * size, 0);
  blobs.sort((a, b) => a.y - b.y);
  return { segs, blobs, x, gy };
}

function thickLine(f, x0, y0, x1, y1, w0, w1, shade) {
  const L = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(L * 2) + 1;
  for (let i = 0; i <= n; i++) {
    const u = i / n, x = lerp(x0, x1, u), y = lerp(y0, y1, u), w = lerp(w0, w1, u), r = w / 2;
    for (let j = Math.floor(y - r); j <= y + r; j++)
      for (let k = Math.floor(x - r); k <= x + r; k++) {
        const dx = k + 0.5 - x, dy = j + 0.5 - y, d = Math.hypot(dx, dy);
        if (d > r) continue;
        shade(k, j, dx / Math.max(r, 0.5), d / Math.max(r, 0.5));
      }
  }
}
export function drawTrunk(f, tree, { maxDepth = 9 } = {}) {
  const B = COL.bark;
  for (const s of tree.segs) {
    if (s.depth > maxDepth) continue;
    for (let i = 0; i < s.pts.length - 1; i++) {
      const u0 = i / (s.pts.length - 1), u1 = (i + 1) / (s.pts.length - 1);
      const [x0, y0] = s.pts[i], [x1, y1] = s.pts[i + 1];
      thickLine(f, x0, y0, x1, y1, lerp(s.w0, s.w1, u0), lerp(s.w0, s.w1, u1), (k, j, nx, d) => {
        let c = d > 0.8 ? B[0] : nx < -0.25 ? B[3] : nx < 0.3 ? B[2] : B[1];
        if (nx < -0.55 && d < 0.85 && s.w0 > 3) c = B[4];
        if (noise2(k * 0.7, j * 0.25, 5) > 0.72 && d < 0.8) c = B[1]; // bark grain
        put(f, k, j, c);
      });
    }
  }
}
/** blossom clumps, each a lit sphere with a ragged edge; sway is 1 px steps */
const CANOPY = new WeakMap();
function blobPixels(b, dx, dim) {
  let m = CANOPY.get(b);
  if (!m) CANOPY.set(b, (m = new Map()));
  const key = dx * 2 + dim;
  let px = m.get(key);
  if (px) return px;
  const P = COL.blossom, o = dim ? 1 : 0, out = [];
  const bx = b.x + dx, by = b.y, r = b.r;
  for (let j = Math.floor(by - r - 1); j <= by + r + 1; j++)
    for (let i = Math.floor(bx - r - 1); i <= bx + r + 1; i++) {
      const ex = i + 0.5 - bx, ey = (j + 0.5 - by) * 1.15;
      const ang = Math.atan2(ey, ex);
      const rr = r * (0.82 + 0.25 * noise2(Math.cos(ang) * 2 + b.ph, Math.sin(ang) * 2, 11)); // ragged rim
      const d = Math.hypot(ex, ey);
      if (d > rr) continue;
      const nx = ex / rr, ny = ey / rr;
      const lit = -nx * 0.55 - ny * 0.8 + (noise2(i * 0.5, j * 0.5, 3) - 0.5) * 0.7;
      const edge = d > rr - 1;
      let c;
      if (edge && lit < 0.1) c = P[1 + o];
      else if (lit > 0.75) c = P[Math.min(6, 6 - o)];
      else if (lit > 0.42) c = P[5 - o];
      else if (lit > 0.05) c = P[4 - o];
      else if (lit > -0.4) c = P[3 - o];
      else c = P[2 - o];
      out.push(i, j, c);
    }
  // a few white sparkle-blossoms on the lit side
  const R = new Rng(Math.floor(b.ph * 1000));
  for (let q = 0; q < 3; q++) {
    const a = R.range(-2.6, -0.9), rr = R.range(0.3, 0.8) * r;
    if (!dim) out.push(Math.round(bx + Math.cos(a) * rr), Math.round(by + Math.sin(a) * rr), P[6]);
  }
  px = Float64Array.from(out);
  m.set(key, px);
  return px;
}
/** blossom clumps, each a lit sphere with a ragged edge; sway is 1 px steps (each offset baked once) */
export function drawCanopy(f, tree, t, T, { sway = 0.7, dim = 0, front = null } = {}) {
  const W = f.w, Hh = f.h, C = f.color;
  for (const b of tree.blobs) {
    if (front != null && (b.depth >= 3) !== front) continue;
    const dx = Math.round(Math.sin(TAU * (t / T) + b.ph) * sway);
    const px = blobPixels(b, dx, dim ? 1 : 0);
    for (let k = 0; k < px.length; k += 3) {
      const x = px[k], y = px[k + 1];
      if (x >= 0 && y >= 0 && x < W && y < Hh) C[y * W + x] = px[k + 2];
    }
  }
}
// trunks never move: bake the bark of each tree once
const TRUNK = new WeakMap();
export function drawTree(f, tree, t, T, opts = {}) {
  let tp = TRUNK.get(tree);
  if (!tp) {
    const g = { w: f.w, h: f.h, color: new Uint32Array(f.w * f.h) };
    drawTrunk(g, tree);
    const out = [];
    for (let i = 0; i < g.color.length; i++) if (g.color[i]) out.push(i, g.color[i]);
    TRUNK.set(tree, (tp = Uint32Array.from(out)));
  }
  for (let k = 0; k < tp.length; k += 2) f.color[tp[k]] = tp[k + 1];
  drawCanopy(f, tree, t, T, opts);
}
/** a small distant tree: just clumps, no trunk detail */
export function distantTree(f, x, gy, seed, { s = 0.5, dim = 1 } = {}) {
  const tr = growTree(x, gy, { seed, size: s, spread: 1.2 });
  const B = COL.bark;
  for (const sg of tr.segs) if (sg.depth < 2) for (let i = 0; i < sg.pts.length - 1; i++) thickLine(f, ...sg.pts[i], ...sg.pts[i + 1], Math.max(1, sg.w0), Math.max(1, sg.w1), (k, j) => put(f, k, j, B[1]));
  drawCanopy(f, tr, 0, 1, { sway: 0, dim });
}

// ---------------------------------------------------------------- ground
export function ground(f, gy, { top = ["#3a2a4a", "#2a2038", "#1c1628"], path = ["#4b4260", "#3a334d", "#2b2539"], petals = 90, seed = 4, grass = "#5a3f63" } = {}) {
  const T = top.map(H), Pth = path.map(H), G = H(grass), P = COL.blossom;
  for (let x = 0; x < f.w; x++) {
    const tuft = noise(x * 0.5, seed) > 0.6 ? 1 : 0;
    for (let y = gy - tuft; y < f.h; y++) {
      const d = y - gy;
      let c = d < 1 ? G : d < 4 ? T[0] : d < 9 ? T[1] : T[2];
      // stepping-stone path
      if (d >= 3 && d < 8) {
        const cell = Math.floor((x + (d % 2) * 5) / 11), inStone = ((x + (d % 2) * 5) % 11) < 9;
        if (inStone && rand(cell, 7) > 0.15) c = d === 3 ? Pth[0] : d === 7 ? Pth[2] : Pth[1];
      }
      if (d > 9 && bayer(x, y) < 0.1 * (d - 9)) c = T[2];
      put(f, x, y, c);
    }
  }
  const R = new Rng(seed);
  for (let i = 0; i < petals; i++) { const x = R.int(0, f.w), y = gy + R.int(0, f.h - gy); put(f, x, y, R.chance(0.3) ? P[5] : P[3]); }
}

// ---------------------------------------------------------------- the hero
// recolor the rig's dummy shell per body part
const PART = { pelvis: 1, waist: 2, chest: 3, neck: 4, head: 5, face: 6, upperN: 7, elbowN: 8, foreN: 9, handN: 10, upperF: 11, elbowF: 12, foreF: 13, handF: 14, thighN: 15, kneeN: 16, shinN: 17, footN: 18, thighF: 19, kneeF: 20, shinF: 21, footF: 22, weapon: 23 };
const SKIN = ramp("#ffdcbc", "#f2b48c", "#c98263", "#8f5646");
const HAIR = ramp("#5a4f80", "#40375f", "#2c2645", "#1c1730");
const HAORI = ramp("#6f7fd0", "#4b58a8", "#333c7a", "#222852");
const OBI = ramp("#ff6f86", "#d23a57", "#94253f", "#5e1a2e");
const HAKAMA = ramp("#5c4b70", "#443758", "#312740", "#221b2e");
const TABI = ramp("#f4f1fa", "#cbc6da", "#8f8aa4", "#5d5872");
const PART_RAMP = {};
for (const k of [5]) PART_RAMP[k] = HAIR;
for (const k of [4, 6, 10, 14]) PART_RAMP[k] = SKIN;
for (const k of [3, 7, 8, 9, 11, 12, 13]) PART_RAMP[k] = HAORI;
PART_RAMP[2] = OBI;
for (const k of [1, 15, 16, 17, 19, 20, 21]) PART_RAMP[k] = HAKAMA;
for (const k of [18, 22]) PART_RAMP[k] = TABI;
const D_INK = hex(DUMMY_PAL.k), D_SEAM = hex(DUMMY_PAL.J), D_MARK = hex(DUMMY_PAL.m);
const SCARF = ramp("#ff9db4", "#ef4f73", "#a82a4c", "#5e1730");

/**
 * Draw the hero with pose `pose` (rig pose fields), feet at (x, gy). Adds a topknot and a scarf that streams in the wind.
 * opts: { flip, t, wind (0..1), a (alpha 0..1 via dither), tint }
 */
export function hero(f, x, gy, pose, { flip = false, t = 0, wind = 0.6, a = 1, tint = null, scarf = true, pal = null, knot = true } = {}) {
  const PR = pal ? { ...PART_RAMP, ...pal } : PART_RAMP;
  const r = posed(pose), sk = skeleton(pose).joints, X = Math.round(x + (flip ? -1 : 1) * (pose.x ?? 0)), Y = Math.round(gy + (pose.y ?? 0));
  const sx = (v) => X + (flip ? -v : v);
  const plot = (px, py, c) => { if (tint != null && a < 1) blendPx(f, px, py, tint, a); else if (a >= 1 || bayer(px, py) < a) put(f, px, py, tint ?? c); };
  // scarf behind the body
  const neck = sk.neck, crown = sk.crown, head = sk.head;
  const drawScarf = () => {
    if (!scarf) return;
    const ax = neck[0] - 1, ay = neck[1] + 1, n = 15;
    let px = ax, py = ay;
    for (let i = 1; i <= n; i++) {
      const u = i / n;
      const nx = ax - i * 1.2 * (0.6 + wind * 0.5), ny = ay + i * 0.35 * (1.2 - wind) + Math.sin(TAU * 1.6 * t - i * 0.7) * u * 2.2 * (0.4 + wind);
      const c = SCARF[i < 3 ? 1 : i < 8 ? 2 : 1];
      for (const [qx, qy] of (i < 9 ? [[nx, ny - 1], [nx, ny], [nx, ny + 1]] : [[nx, ny], [nx, ny + 1]])) plot(sx(Math.round(qx)), Y + Math.round(qy), qy < ny ? SCARF[0] : qy === ny ? c : SCARF[2]);
      px = nx; py = ny;
    }
    // tail split
    plot(sx(Math.round(px - 1)), Y + Math.round(py + 2), SCARF[3]);
  };
  drawScarf();
  // topknot behind the crown
  const tk = [[crown[0] - 2, crown[1] - 1], [crown[0] - 3, crown[1] - 1], [crown[0] - 3, crown[1]], [crown[0] - 4, crown[1] + 1], [crown[0] - 2, crown[1] - 2]];
  if (knot) for (const [qx, qy] of tk) plot(sx(Math.round(qx)), Y + Math.round(qy), HAIR[2]);
  if (knot) for (const [qx, qy] of [[crown[0] - 1, crown[1] - 3], [crown[0] - 2, crown[1] - 3], [crown[0] - 1, crown[1] - 2], [crown[0] - 5, crown[1] + 1], [crown[0] - 4, crown[1] + 2]]) plot(sx(Math.round(qx)), Y + Math.round(qy), COL.ink);
  for (let i = 0; i < r.n; i++) {
    const part = r.part[i], tone = r.tone[i], c0 = r.color[i];
    let c;
    if (c0 === D_INK) c = COL.ink;
    else if (part === PART.weapon) c = c0;
    else if (c0 === D_MARK) c = H("#ffb3c8");
    else if (part === PART.face && c0 !== D_INK) c = SKIN[tone >= 3 ? 1 : 0];
    else if (c0 === D_SEAM) c = (PR[part] ?? HAORI)[3];
    else if (part === PART.head && tone >= 0 && r.ys[i] - head[1] >= -1.5 && r.xs[i] - head[0] >= 0.5) c = SKIN[1];
    else if (tone >= 0 && PR[part]) c = PR[part][tone];
    else c = c0;
    plot(sx(r.xs[i]), Y + r.ys[i], c);
  }
  plot(sx(Math.round(head[0] + 2)), Y + Math.round(head[1] + 0), COL.ink);
  if (!knot) return;
  plot(sx(Math.round(head[0] + 1)), Y + Math.round(head[1] - 2), OBI[1]);
  plot(sx(Math.round(head[0] + 2)), Y + Math.round(head[1] - 2), OBI[0]);
}

// walking: four held drawings, feet swapping, arms counter-swinging
export const WALK = [
  { ffx: 7, ffy: -4, fbx: -6, fby: -4, fx: -5, fy: -15, bx: 10, by: -16, crouch: 1, lean: 1 },
  { ffx: 1, ffy: -4, fbx: 1, fby: -9, fx: -1, fy: -15, bx: 6, by: -15, crouch: 0, lean: 1, y: -1 },
  { ffx: -6, ffy: -4, fbx: 7, fby: -4, fx: 6, fy: -16, bx: 0, by: -15, crouch: 1, lean: 1 },
  { ffx: 1, ffy: -9, fbx: 1, fby: -4, fx: 2, fy: -15, bx: 4, by: -15, crouch: 0, lean: 1, y: -1 },
];
export const walkPose = (t, fps = 7) => WALK[Math.floor(t * fps) % 4];
/** a body-part palette for other characters: { hair, top, belt, bottom } ramps */
export function outfit({ hair = HAIR, top = HAORI, belt = OBI, bottom = HAKAMA }) {
  const o = { 5: hair };
  for (const k of [3, 7, 8, 9, 11, 12, 13]) o[k] = top;
  o[2] = belt;
  for (const k of [1, 15, 16, 17, 19, 20, 21]) o[k] = bottom;
  return o;
}
export const IDLE = (t) => ({ ffx: 4, fbx: -4, fx: -3, fy: -15, bx: 6, by: -15, crouch: Math.floor(t * 2) % 2 ? 1 : 0 });

// ---------------------------------------------------------------- text helpers
/** Turkish-friendly big text: draws the string then adds dots for İ and Ü/Ö (pass ASCII with markers: I* U: O:) */
export function textTR(p, str, x, y, c, opts = {}) {
  const clean = str.replace(/\*|:/g, "");
  const k = opts.scale ?? 1, font = opts.font ?? "big";
  const [w] = p.measure(clean, { font, scale: k });
  const left = Math.round(opts.align === "center" ? x - w / 2 : x);
  p.text(clean, left, y, c, { ...opts, align: "left" });
  // marks
  let out = "";
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === "*" || ch === ":") {
      const [pw] = p.measure(out, { font, scale: k }), [gw] = p.measure(out.slice(-1), { font, scale: k });
      const gx = left + pw - gw + (out ? 0 : 0);
      const dots = ch === "*" ? [gx + Math.floor(gw / 2 / k) * k] : [gx + k, gx + gw - 2 * k];
      for (const dx of dots) {
        if (opts.outline !== undefined) p.rect(dx - 1, y - 3 * k - 1, k + 2, k + 2, opts.outline);
        if (opts.shadow !== undefined) p.rect(dx + 1, y - 2 * k + 1 - k, k, k, opts.shadow);
        p.rect(dx, y - 2 * k - k, k, k, typeof c === "function" ? c(0, 0) : c);
      }
      continue;
    }
    out += ch;
  }
}

/** finish a frame into RGBA */
export function toRGBA(f, out = new Uint8ClampedArray(f.w * f.h * 4), lightK = 1) {
  composite(f, out, null, lightK);
  for (let i = 3; i < out.length; i += 4) out[i] = 255;
  return out;
}
