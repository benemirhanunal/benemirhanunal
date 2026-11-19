// A character grid: every cell has a glyph and a color. Line art helpers draw straight into it.
export class Grid {
  constructor(cols, rows) {
    this.cols = cols; this.rows = rows;
    this.ch = new Array(cols * rows).fill(" ");
    this.rgb = new Array(cols * rows).fill(null);
    this.w = new Uint8Array(cols * rows); // weight class: 0 normal, 1 bold accent
  }
  inside(c, r) { return c >= 0 && r >= 0 && c < this.cols && r < this.rows; }
  put(c, r, ch, rgb, w = 0) {
    c = Math.round(c); r = Math.round(r);
    if (!this.inside(c, r)) return;
    if (this.clipR && (c < this.clipR[0] || r < this.clipR[1] || c > this.clipR[2] || r > this.clipR[3])) return;
    const i = r * this.cols + c;
    this.ch[i] = ch; this.rgb[i] = rgb; this.w[i] = w;
  }
  get(c, r) { return this.inside(c, r) ? this.ch[r * this.cols + c] : " "; }
  text(c, r, s, rgb, w = 0) { [...s].forEach((ch, i) => ch !== " " && this.put(c + i, r, ch, rgb, w)); }
  clear(c0, r0, c1, r1) { for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) this.put(c, r, " ", null); }
  /** line with slope glyphs; cells are tall, so slope is judged in screen space (x * 0.6) */
  line(c0, r0, c1, r1, rgb, opt = {}) {
    const dx = c1 - c0, dy = r1 - r0, n = Math.max(Math.abs(dx), Math.abs(dy), 1);
    const sx = dx * 0.6, a = Math.atan2(dy, sx) * 180 / Math.PI, aa = ((a % 180) + 180) % 180;
    const glyph = opt.ch ?? (aa < 22 || aa > 158 ? "-" : aa < 68 ? "\\" : aa < 112 ? "|" : "/");
    for (let i = 0; i <= n; i++) {
      const c = Math.round(c0 + (dx * i) / n), r = Math.round(r0 + (dy * i) / n);
      if (opt.dash && i % 2) continue;
      this.put(c, r, glyph, rgb, opt.w ?? 0);
    }
  }
  box(c0, r0, c1, r1, rgb, { h = "-", v = "|", k = "+" } = {}) {
    for (let c = c0 + 1; c < c1; c++) { this.put(c, r0, h, rgb); this.put(c, r1, h, rgb); }
    for (let r = r0 + 1; r < r1; r++) { this.put(c0, r, v, rgb); this.put(c1, r, v, rgb); }
    for (const [c, r] of [[c0, r0], [c1, r0], [c0, r1], [c1, r1]]) this.put(c, r, k, rgb);
  }
  copy() { const g = new Grid(this.cols, this.rows); g.ch = this.ch.slice(); g.rgb = this.rgb.slice(); g.w = this.w.slice(); return g; }
}

export const hexrgb = (h) => { h = h.replace("#", ""); if (h.length === 3) h = [...h].map((c) => c + c).join(""); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255); };
