// Turn glyph grids into SVG <text> rows with per-character x positions (so any monospace fallback font lines up),
// one color class per fill. Animated layers: cells that never change go in the base, the rest go in per-frame
// groups that a CSS keyframe shows one at a time.
const esc = (ch) => (ch === "&" ? "&amp;" : ch === "<" ? "&lt;" : ch === ">" ? "&gt;" : ch);
const q = (v) => Math.max(0, Math.min(15, Math.round(v * 15))).toString(16);
const n1 = (v) => { const s = (Math.round(v * 10) / 10).toString(); return s; };

export class Doc {
  constructor(w, h) { this.w = w; this.h = h; this.cls = new Map(); this.parts = []; this.css = []; this.defs = []; this.frameSets = new Map(); }
  colorClass(rgb) {
    const hex = typeof rgb === "string" ? rgb : "#" + q(rgb[0]) + q(rgb[1]) + q(rgb[2]);
    let k = this.cls.get(hex);
    if (!k) { k = "k" + this.cls.size.toString(36); this.cls.set(hex, k); }
    return k;
  }
  /** rows of text for the cells where pick(i) is true */
  rows(L, grid, pick) {
    const out = [];
    for (let r = 0; r < grid.rows; r++) {
      const byCls = new Map();
      for (let c = 0; c < grid.cols; c++) {
        const i = r * grid.cols + c;
        if (!pick(i)) continue;
        const ch = grid.ch[i];
        if (ch === " " || !grid.rgb[i]) continue;
        const k = this.colorClass(grid.rgb[i]) + (grid.w[i] ? " b" : "");
        let a = byCls.get(k);
        if (!a) byCls.set(k, (a = { xs: [], s: "" }));
        a.xs.push(n1(L.x + c * L.cw)); a.s += esc(ch);
      }
      const y = n1(L.y + r * L.rh + L.rh * 0.8);
      for (const [k, a] of byCls) out.push(`<text class="${k}" x="${a.xs.join(" ")}" y="${y}">${a.s}</text>`);
    }
    return out.join("");
  }
  /** L = {x, y, cw, rh, size, cls?, frames: Grid[] | grid, dt} */
  layer(L) {
    const frames = L.frames ?? [L.grid];
    const g0 = frames[0], N = frames.length;
    const fcls = `s${String(L.size).replace(".", "_")}`;
    if (!this.css.some((s) => s.startsWith(`.${fcls}{`))) this.css.push(`.${fcls}{font-size:${L.size}px}`);
    const same = (i) => frames.every((f) => f.ch[i] === g0.ch[i] && String(f.rgb[i]) === String(g0.rgb[i]) && f.w[i] === g0.w[i]);
    const isStatic = new Uint8Array(g0.cols * g0.rows);
    for (let i = 0; i < isStatic.length; i++) isStatic[i] = N === 1 || same(i) ? 1 : 0;
    let s = `<g class="${fcls}${L.cls ? " " + L.cls : ""}"${L.attr ? " " + L.attr : ""}>` + this.rows(L, g0, (i) => isStatic[i]);
    if (N > 1) {
      const dt = L.dt ?? 0.15, T = n1(N * dt * 100) / 100, key = `f${N}_${String(dt).replace(".", "_")}`;
      if (!this.frameSets.has(key)) {
        const p = (100 / N).toFixed(3);
        this.css.push(`@keyframes ${key}{0%{opacity:1}${p}%{opacity:0}100%{opacity:0}}.${key}{opacity:0;animation:${key} ${(N * dt).toFixed(2)}s step-end infinite}.${key}.z{opacity:1}`);
        this.frameSets.set(key, true);
      }
      frames.forEach((f, k) => {
        const delay = -(((N - k) % N) * dt);
        s += `<g class="${key}${k === 0 ? " z" : ""}" style="animation-delay:${delay.toFixed(2)}s">` + this.rows(L, f, (i) => !isStatic[i]) + "</g>";
      });
    }
    this.parts.push(s + "</g>");
  }
  raw(s) { this.parts.push(s); }
  toString(title, desc) {
    const css = [...this.cls].map(([hex, k]) => `.${k}{fill:${hex}}`).join("");
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.w} ${this.h}" width="${this.w}" height="${this.h}" role="img" aria-labelledby="t d">` +
      `<title id="t">${title}</title><desc id="d">${desc}</desc>` +
      `<defs>${this.defs.join("")}</defs>` +
      `<style>text{font-family:ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,'Liberation Mono','DejaVu Sans Mono',monospace;font-weight:700;white-space:pre}.b{font-weight:800}.r{font-weight:500}${this.css.join("")}${css}</style>` +
      this.parts.join("\n") + `</svg>`;
  }
}
