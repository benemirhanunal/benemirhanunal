// A tiny float raster painter: base color, emission and a light map, composited as col * (ambient + light) + emit.
// Shapes take a color or a function (x, y) => rgb in local units. Transform is translate + uniform scale.
import { Grid } from "./grid.mjs";

export const C = (h) => { h = h.replace("#", ""); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255); };
export const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

export class Raster {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.col = new Float32Array(w * h * 3);
    this.emi = new Float32Array(w * h * 3);
    this.lit = new Float32Array(w * h * 3);
    this.mask = new Uint8Array(w * h);
    this.mat = new Uint8Array(w * h); // material id per pixel, picks a glyph set
    this.s = 1; this.tx = 0; this.ty = 0; this.stack = [];
    this.clipR = null;
    this.amb = [0.35, 0.33, 0.45];
  }
  save() { this.stack.push([this.s, this.tx, this.ty, this.clipR]); }
  restore() { [this.s, this.tx, this.ty, this.clipR] = this.stack.pop(); }
  translate(x, y) { this.tx += x * this.s; this.ty += y * this.s; }
  scale(k) { this.s *= k; }
  clip(x0, y0, x1, y1) { this.clipR = [x0 * this.s + this.tx, y0 * this.s + this.ty, x1 * this.s + this.tx, y1 * this.s + this.ty]; }

  /** generic fill over a local-space bbox with an inside test */
  shape(bx0, by0, bx1, by1, inside, color, o = {}) {
    const s = this.s;
    let X0 = Math.floor(bx0 * s + this.tx), Y0 = Math.floor(by0 * s + this.ty), X1 = Math.ceil(bx1 * s + this.tx), Y1 = Math.ceil(by1 * s + this.ty);
    if (this.clipR) { X0 = Math.max(X0, Math.floor(this.clipR[0])); Y0 = Math.max(Y0, Math.floor(this.clipR[1])); X1 = Math.min(X1, Math.ceil(this.clipR[2])); Y1 = Math.min(Y1, Math.ceil(this.clipR[3])); }
    X0 = Math.max(0, X0); Y0 = Math.max(0, Y0); X1 = Math.min(this.w, X1); Y1 = Math.min(this.h, Y1);
    const fn = typeof color === "function";
    const a = o.a ?? 1;
    for (let Y = Y0; Y < Y1; Y++) for (let X = X0; X < X1; X++) {
      const x = (X + 0.5 - this.tx) / s, y = (Y + 0.5 - this.ty) / s;
      if (!inside(x, y)) continue;
      const c = fn ? color(x, y) : color;
      if (!c) continue;
      const i = (Y * this.w + X) * 3;
      if (o.emit) { // additive light-emitting paint; also counts as base so it hides what is behind
        if (!o.add) { this.col[i] = this.col[i] * (1 - a); this.col[i + 1] *= 1 - a; this.col[i + 2] *= 1 - a; this.emi[i] *= 1 - a; this.emi[i + 1] *= 1 - a; this.emi[i + 2] *= 1 - a; }
        this.emi[i] += c[0] * a; this.emi[i + 1] += c[1] * a; this.emi[i + 2] += c[2] * a;
      } else {
        this.col[i] += (c[0] - this.col[i]) * a; this.col[i + 1] += (c[1] - this.col[i + 1]) * a; this.col[i + 2] += (c[2] - this.col[i + 2]) * a;
        this.emi[i] *= 1 - a; this.emi[i + 1] *= 1 - a; this.emi[i + 2] *= 1 - a;
      }
      if (o.mask !== undefined) this.mask[Y * this.w + X] = o.mask;
      if (!o.add) this.mat[Y * this.w + X] = o.mat ?? 0;
    }
  }
  rect(x0, y0, x1, y1, c, o) { this.shape(x0, y0, x1, y1, (x, y) => x >= x0 && x < x1 && y >= y0 && y < y1, c, o); }
  rrect(x0, y0, x1, y1, r, c, o) {
    this.shape(x0, y0, x1, y1, (x, y) => {
      if (x < x0 || x >= x1 || y < y0 || y >= y1) return false;
      const qx = Math.max(x0 + r - x, 0, x - (x1 - r)), qy = Math.max(y0 + r - y, 0, y - (y1 - r));
      return qx * qx + qy * qy <= r * r;
    }, c, o);
  }
  ellipse(cx, cy, rx, ry, c, o) { this.shape(cx - rx, cy - ry, cx + rx, cy + ry, (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1, c, o); }
  circle(cx, cy, r, c, o) { this.ellipse(cx, cy, r, r, c, o); }
  capsule(ax, ay, bx, by, r, c, o) {
    const [ra, rb] = Array.isArray(r) ? r : [r, r], R = Math.max(ra, rb);
    const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1;
    this.shape(Math.min(ax, bx) - R, Math.min(ay, by) - R, Math.max(ax, bx) + R, Math.max(ay, by) + R, (x, y) => {
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2));
      const px = ax + dx * t - x, py = ay + dy * t - y, rr = ra + (rb - ra) * t;
      return px * px + py * py <= rr * rr;
    }, c, o);
  }
  poly(pts, c, o) {
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    this.shape(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), (x, y) => {
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
      return inside;
    }, c, o);
  }
  /** soft light: radial falloff added to the light map (local coords) */
  light(cx, cy, r, rgb, k = 1, o = {}) {
    const s = this.s, X = cx * s + this.tx, Y = cy * s + this.ty, R = r * s, sy = o.sy ?? 1;
    for (let y = Math.max(0, Math.floor(Y - R / sy)); y < Math.min(this.h, Math.ceil(Y + R / sy)); y++)
      for (let x = Math.max(0, Math.floor(X - R)); x < Math.min(this.w, Math.ceil(X + R)); x++) {
        const d = Math.hypot(x + 0.5 - X, (y + 0.5 - Y) * sy) / R;
        if (d >= 1) continue;
        let f = (1 - d) * (1 - d) * k;
        if (o.down && y < Y) f *= Math.max(0, 1 - (Y - y) / (o.down * s));
        const i = (y * this.w + x) * 3;
        this.lit[i] += rgb[0] * f; this.lit[i + 1] += rgb[1] * f; this.lit[i + 2] += rgb[2] * f;
      }
  }
  /** additive glow straight into emission (for halos around lamps, moon) */
  glow(cx, cy, r, rgb, k = 1) {
    const s = this.s, X = cx * s + this.tx, Y = cy * s + this.ty, R = r * s;
    for (let y = Math.max(0, Math.floor(Y - R)); y < Math.min(this.h, Math.ceil(Y + R)); y++)
      for (let x = Math.max(0, Math.floor(X - R)); x < Math.min(this.w, Math.ceil(X + R)); x++) {
        if (this.clipR && (x < this.clipR[0] || x >= this.clipR[2] || y < this.clipR[1] || y >= this.clipR[3])) continue;
        const d = Math.hypot(x + 0.5 - X, y + 0.5 - Y) / R;
        if (d >= 1) continue;
        const f = (1 - d) ** 2.2 * k, i = (y * this.w + x) * 3;
        this.emi[i] += rgb[0] * f; this.emi[i + 1] += rgb[1] * f; this.emi[i + 2] += rgb[2] * f;
      }
  }
  final(i) {
    const j = i * 3, a = this.amb;
    return [
      this.col[j] * (a[0] + this.lit[j]) + this.emi[j],
      this.col[j + 1] * (a[1] + this.lit[j + 1]) + this.emi[j + 1],
      this.col[j + 2] * (a[2] + this.lit[j + 2]) + this.emi[j + 2],
    ];
  }
}

// density ramp, light on dark. Index by perceived brightness.
const RAMP = " .,:;~!=+*cixo#%&@";
// glyph sets per material (index = mat id): hair, skin, tee, denim, fur, wood
export const MATS = [null, ",~~≈≈%", null, ":;=+*#@", ".:|||H#", ".:oO%@@", "-==≡≡"];
/**
 * Convert to a glyph grid. Each cell covers cw x ch raster pixels. Brightness picks the glyph, the cell's own color
 * (pushed toward full brightness, since the glyph already carries the darkness) is the fill.
 */
export function toGrid(R, cw = 2, ch = 4, o = {}) {
  const cols = Math.floor(R.w / cw), rows = Math.floor(R.h / ch), g = new Grid(cols, rows);
  const gamma = o.gamma ?? 0.8, lo0 = o.lo ?? 0.01, span0 = o.span ?? 0.58, floor = o.floor ?? 0.05;
  const lum = new Float32Array(cw * ch);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    let sr = 0, sg = 0, sb = 0, masked = 0, k = 0; const mc = new Map();
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const i = (r * ch + y) * R.w + c * cw + x;
      if (R.mask[i]) masked++;
      mc.set(R.mat[i], (mc.get(R.mat[i]) || 0) + 1);
      const f = R.final(i);
      sr += f[0]; sg += f[1]; sb += f[2];
      lum[k++] = 0.3 * f[0] + 0.59 * f[1] + 0.11 * f[2];
    }
    if (masked * 2 >= cw * ch) continue;
    const n = cw * ch; sr /= n; sg /= n; sb /= n;
    const L = 0.3 * sr + 0.59 * sg + 0.11 * sb;
    if (L < floor) continue;
    let v = Math.pow(clamp01((L - lo0) / span0), gamma);
    let glyph = RAMP[Math.min(RAMP.length - 1, Math.round(v * (RAMP.length - 1)))];
    let best = 0, bn = 0; for (const [m, n] of mc) if (n > bn) { bn = n; best = m; }
    const set = MATS[best];
    if (set && bn * 2 > cw * ch && glyph !== " ") { const gs = [...set]; glyph = gs[Math.min(gs.length - 1, Math.floor(v * gs.length))]; }
    if (glyph === " ") continue;
    // edges: a cell split into a bright and a dark half reads better as a line glyph
    if (o.edges && cw === 2 && ch === 4) {
      const left = (lum[0] + lum[2] + lum[4] + lum[6]) / 4, right = (lum[1] + lum[3] + lum[5] + lum[7]) / 4;
      const top = (lum[0] + lum[1] + lum[2] + lum[3]) / 4, bot = (lum[4] + lum[5] + lum[6] + lum[7]) / 4;
      const tl = (lum[0] + lum[2]) / 2, br = (lum[5] + lum[7]) / 2, tr = (lum[1] + lum[3]) / 2, bl = (lum[4] + lum[6]) / 2;
      const hi = Math.max(...lum), lo = Math.min(...lum), span = hi - lo;
      if (span > 0.22 && span > L * 0.9) {
        const gx = right - left, gy = bot - top, d1 = tl + br - tr - bl;
        if (Math.abs(gy) > Math.abs(gx) * 1.6 && Math.abs(gy) > Math.abs(d1) * 0.8) glyph = gy > 0 ? "_" : "\"";
        else if (Math.abs(gx) > Math.abs(gy) * 1.6 && Math.abs(gx) > Math.abs(d1) * 0.8) glyph = gx > 0 ? "[" : "]";
        else if (Math.abs(d1) > 0.18) glyph = d1 > 0 ? "\\" : "/";
      }
    }
    // color: keep hue, lift brightness
    const Ld = Math.min(0.95, 0.09 + 1.0 * Math.pow(L, 0.8)), kk = Ld / Math.max(L, 1e-4);
    let cr = sr * kk, cg = sg * kk, cb = sb * kk; const mx = Math.max(cr, cg, cb);
    if (mx > 1) { cr /= mx; cg /= mx; cb /= mx; }
    g.put(c, r, glyph, [cr, cg, cb]);
  }
  return g;
}
