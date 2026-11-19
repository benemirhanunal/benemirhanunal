// Everything around the room: the neon name, corner branches, the three animated topic panels and the small cards.
import { Grid, hexrgb } from "./grid.mjs";
import { Raster, C, mul, toGrid } from "./raster.mjs";
import { rng, NF } from "./scene.mjs";

const H = (s) => hexrgb(s);
const TAU = Math.PI * 2;

// ------------------------------------------------------------------ neon title
const FONT = {
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  I: [".###.", "..#..", "..#..", "..#..", "..#..", "..#..", ".###."],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  N: ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
};
const DOTS = { "İ": [2], "Ü": [1, 3] };
/** returns {core, shade, cols, rows, letters:[{c0,c1}]} ; one font pixel = 2 cells wide, 1 row tall */
export function neonTitle(text) {
  const letters = [];
  let c = 0;
  for (const ch of text) {
    if (ch === " ") { c += 6; continue; }
    const base = ch === "İ" ? "I" : ch === "Ü" ? "U" : ch;
    letters.push({ ch, base, c0: c });
    c += 12;
  }
  const cols = c - 2 + 2, rows = 10;
  const mk = () => new Grid(cols, rows);
  const core = mk(), shade = mk(), uCore = mk();
  for (const L of letters) {
    const tgt = L.ch === "Ü" ? uCore : core;
    const px = (x, y) => {
      const t = y / 9;
      const col = [1, 0.62 + 0.3 * (1 - t), 0.82 + 0.12 * (1 - t)];
      tgt.put(L.c0 + x * 2, y, "█", col); tgt.put(L.c0 + x * 2 + 1, y, "█", col);
    };
    FONT[L.base].forEach((row, y) => [...row].forEach((v, x) => v === "#" && px(x, y + 2)));
    for (const x of DOTS[L.ch] ?? []) px(x, 0);
  }
  // drop shadow one cell right and down, where there is no tube
  for (const g of [core, uCore]) for (let r = 0; r < rows; r++) for (let cc = 0; cc < cols; cc++) {
    if (g.get(cc, r) !== "█") continue;
    if (core.get(cc + 1, r + 1) !== "█" && uCore.get(cc + 1, r + 1) !== "█") shade.put(cc + 1, r + 1, "░", H("#7a2160"));
  }
  return { core, uCore, shade, cols, rows };
}

// ------------------------------------------------------------------ sakura corner branch (static raster -> ascii)
export function branch(cols, rows, flip, seed) {
  const R = new Raster(cols * 2, rows * 4);
  R.amb = [1, 1, 1];
  const w = cols * 2, h = rows * 4, X = (x) => (flip ? w - x : x);
  const segs = [[[-4, 2], [60, 11], 4, 2.6], [[60, 11], [112, 7], 2.6, 1.4], [[30, 7], [44, 24], 2, 1.1], [[60, 11], [78, 28], 1.8, 1], [[88, 9], [100, 22], 1.5, 0.9]];
  for (const [a, b, r0, r1] of segs) R.capsule(X(a[0]), a[1], X(b[0]), b[1], [r0, r1], C("3a2030"), { emit: true });
  const pr = rng(seed), pinks = [C("ffb3cc"), C("f58fb2"), C("ffd6e4"), C("e06e9a")];
  for (const [bx, by, r] of [[8, 4, 8], [24, 6, 8], [44, 20, 7], [60, 10, 9], [78, 25, 7], [96, 14, 7], [110, 7, 6], [40, 5, 6]])
    for (let i = 0; i < 26; i++) {
      const a = pr() * TAU, d = Math.sqrt(pr()) * r;
      R.circle(X(bx + Math.cos(a) * d * 1.3), by + Math.sin(a) * d, 1.4 + pr() * 2.4, mul(pinks[Math.floor(pr() * 4)], 0.5 + pr() * 0.45), { emit: true });
    }
  return toGrid(R, 2, 4, { floor: 0.06 });
}

// ------------------------------------------------------------------ helpers
const box = (g, c0, r0, c1, r1, hex, round = true) => {
  const col = H(hex);
  g.box(c0, r0, c1, r1, col, { h: "─", v: "│", k: "+" });
  g.put(c0, r0, round ? "╭" : "┌", col); g.put(c1, r0, round ? "╮" : "┐", col); g.put(c0, r1, round ? "╰" : "└", col); g.put(c1, r1, round ? "╯" : "┘", col);
};
const lerp = (a, b, t) => a + (b - a) * t;

// ------------------------------------------------------------------ 01 multiplayer: two clients, one server, packets
export function netFrames() {
  const out = [];
  const pos1 = (k) => { const a = (k / NF) * TAU; return [8.5 + 6 * Math.cos(a), 4 + 2.4 * Math.sin(a)]; };
  const pos2 = (k) => { const a = (k / NF) * TAU * 2; return [8.5 + 6.5 * Math.sin(a * 0.5 + 1.5), 4 - 2.2 * Math.cos(a * 0.5 + 1.5)]; };
  for (let f = 0; f < NF; f++) {
    const g = new Grid(80, 20);
    const pink = H("#ff7ab6"), cyan = H("#7fd6ff"), dim = "#4a4a66", txt = H("#d6d3e8"), mute = H("#8a88a8");
    g.text(5, 0, "CLIENT A", txt); g.text(35, 0, "SERVER", H("#fff3a6")); g.text(64, 0, "CLIENT B", txt);
    for (const [c0, me, other, meCol, otCol] of [[1, pos1, pos2, pink, cyan], [57, pos2, pos1, cyan, pink]]) {
      box(g, c0, 2, c0 + 21, 12, dim);
      for (let r = 3; r < 12; r++) for (let c = c0 + 1; c < c0 + 21; c++) if ((c + r) % 4 === 0) g.put(c, r, ".", H("#2c2c44"));
      for (const [px, py, s] of [[3, 2, "▓▓"], [16, 7, "▓▓"], [9, 5, "▒"], [2, 8, "▄▄▄"], [14, 2, "▀▀▀"]]) g.text(c0 + 1 + px, 3 + py, s, H("#3a3a5a"));
      for (let k = 1; k <= 3; k++) { const [tx, ty] = me((f + NF - k) % NF); if (g.get(c0 + 2 + Math.round(tx), 4 + Math.round(ty)) === " " || true) g.put(c0 + 2 + tx, 3 + ty + 1, k === 1 ? "∙" : "·", meCol.map((v) => v * (0.75 - k * 0.15))); }
      const [mx, my] = me(f), [ox, oy] = other((f + NF - 3) % NF); // own player predicted now, the other one interpolated 3 ticks back
      const [gx, gy] = other(f);
      g.put(c0 + 2 + gx, 3 + gy + 1, "·", H("#3d4a66"));
      g.put(c0 + 2 + ox, 3 + oy + 1, "o", otCol);
      g.put(c0 + 2 + mx, 3 + my + 1, "@", meCol, 1);
    }
    // server
    box(g, 30, 3, 49, 11, "#8a7a3a");
    g.text(33, 4, "authoritative", mute);
    g.text(33, 6, `tick ${String(4096 + f).padStart(5)}`, H("#fff3a6"));
    g.text(33, 7, "players    2", txt);
    const bars = "▁▂▃▅▇▅▃▂";
    for (let i = 0; i < 12; i++) g.put(33 + i, 9, bars[(i + f) % bars.length], H(i === 11 ? "#fff3a6" : "#8a7a3a"));
    // wires
    for (let c = 23; c < 30; c++) { g.put(c, 5, "─", H(dim)); g.put(c, 9, "─", H(dim)); }
    for (let c = 50; c < 57; c++) { g.put(c, 5, "─", H(dim)); g.put(c, 9, "─", H(dim)); }
    g.put(29, 5, "▶", H(dim)); g.put(23, 9, "◀", H(dim)); g.put(50, 5, "◀", H(dim)); g.put(56, 9, "▶", H(dim));
    // packets: inputs go up every 6 ticks, snapshots come back
    const pk = (phase, c0, c1, r, ch, col) => { const p = ((f + phase) % 6) / 5; g.put(Math.round(lerp(c0, c1, p)), r, ch, col, 1); };
    pk(0, 23, 29, 5, "■", pink); pk(3, 29, 23, 9, "◆", H("#fff3a6"));
    pk(2, 56, 50, 5, "■", cyan); pk(5, 50, 56, 9, "◆", H("#fff3a6"));
    g.text(24, 4, "input", mute); g.text(23, 10, "state", mute); g.text(51, 4, "input", mute); g.text(51, 10, "state", mute);
    // captions
    const r1 = [38, 37, 39, 38, 40, 38][f % 6], r2 = [41, 43, 41, 42, 41, 40][f % 6];
    g.text(2, 14, "predict + reconcile", mute); g.text(31, 14, "60 Hz, lag-compensated", mute); g.text(58, 14, "interpolate 100 ms", mute);
    g.text(6, 16, `rtt ${r1} ms`, pink); g.text(62, 16, `rtt ${r2} ms`, cyan);
    g.text(30, 16, "@ you   o them   · truth", H("#5a5878"));
    out.push(g);
  }
  return out;
}

// ------------------------------------------------------------------ 02 mobile: Royal Block line clear + Slide & Smash
export function mobileFrames() {
  const out = [];
  const BC = ["#ff7ab6", "#7fd6ff", "#ffd479", "#a8e6a3", "#c29bff"];
  const base = [
    "...ab...", "..aab.c.", "d.eeb.cc", "ddeeabbc", "dd.abbcc", "aaeeb.cc", "abcd.eab",
  ];
  for (let f = 0; f < NF; f++) {
    const g = new Grid(80, 20);
    const dim = "#4a4a66", mute = H("#8a88a8");
    // phone 1
    const phone = (c0, title) => {
      box(g, c0, 0, c0 + 25, 19, "#6a6a8a");
      g.text(c0 + 10, 1, "‿‿‿‿", H("#3a3a52"));
      g.text(c0 + 2, 2, title, H("#fff3a6"));
      g.text(c0 + 10, 18, "────", H("#3a3a52"));
    };
    phone(1, "ROYAL BLOCK");
    const score = 1280 + (f >= 12 ? 80 : 0);
    g.text(18, 2, String(score), H("#ffffff"));
    // board 8x7, two chars per block, at cols 6..21 rows 5..11
    const board = base.map((s) => [...s]);
    const fullRow = 4;
    const done = f >= 8;
    if (done) { board[fullRow][2] = "e"; }
    const clearing = f >= 8 && f < 12, cleared = f >= 12;
    for (let r = 0; r < 7; r++) for (let c = 0; c < 8; c++) {
      let v = board[r][c];
      if (cleared && r === fullRow) v = ".";
      const x = 7 + c * 2, y = 5 + r;
      if (v === ".") { g.put(x, y, "·", H("#2c2c44")); continue; }
      const col = clearing && r === fullRow ? (f % 2 ? "#ffffff" : "#fff3a6") : BC["abcde".indexOf(v)];
      g.put(x, y, "■", H(col), 1);
    }
    box(g, 5, 4, 22, 12, "#3a3a52", false);
    // the falling piece: a single block flying from the tray into the gap
    if (!done) {
      const t = f / 8, x = Math.round(lerp(13, 11, t)), y = Math.round(lerp(15, 9, t * t));
      g.put(x, y, "■", H(BC[4]), 1);
    }
    if (cleared && f < 20) g.text(10, 9 - Math.floor((f - 12) / 3), "+80", H("#fff3a6"), 1);
    g.text(5, 15, "■ ■", H(BC[1]), 1); g.text(7, 16, "■", H(BC[1]), 1); g.text(18, 15, "■", H(BC[3]), 1); g.text(18, 16, "■ ■", H(BC[3]), 1);

    // phone 2: top-down table, a burger slides up and smashes a cup pyramid
    phone(30, "SLIDE & SMASH");
    for (let r = 4; r <= 16; r++) { g.put(33, r, "║", H("#a0704f")); g.put(52, r, "║", H("#a0704f")); for (let c = 34; c < 52; c++) if ((c * 3 + r) % 5 === 0) g.put(c, r, "-", H("#4a3428")); }
    const hit = f >= 10;
    const cups = [[42, 5], [40, 6], [44, 6], [38, 7], [42, 7], [46, 7]];
    cups.forEach(([x, y], i) => {
      if (!hit) { g.put(x, y, "u", H("#bfe8ff")); return; }
      const k = Math.min(f - 10, 6), dx = (i % 3 - 1) * k * 1.4 + (i - 2.5) * 0.4 * k, dy = -k * 0.5 + (i > 2 ? k * 0.3 : 0);
      const xx = Math.round(x + dx), yy = Math.round(y + dy);
      if (xx > 33 && xx < 52 && yy > 3) g.put(xx, yy, f > 14 ? "*" : "u", H(f > 14 ? "#fff3a6" : "#bfe8ff"));
    });
    const by = hit ? 8 + Math.min(f - 10, 3) * 0.3 : Math.round(lerp(16, 8.5, (f / 10) ** 0.8));
    g.text(41, Math.round(by), "(≡)", H("#e8a85a"), 1);
    if (!hit) for (let r = Math.round(by) + 1; r <= 16; r++) if ((r + f) % 2) g.put(42, r, "¦", H("#5a4a3a"));
    if (f >= 16) g.text(37, 12, "★ ★ ★", H("#ffd479"), 1);
    g.text(34, 17, "drag · aim · release", mute);
    // side notes
    g.text(59, 3, "Android", H("#a8e6a3")); g.text(59, 4, "Unity 6 · IL2CPP", mute);
    g.text(59, 7, "short sessions", mute); g.text(59, 8, "one-thumb input", mute);
    g.text(59, 11, "LevelPlay ads", mute); g.text(59, 12, "TR / EN", mute);
    out.push(g);
  }
  return out;
}

// ------------------------------------------------------------------ 03 engine: wireframe globe + chunk streaming grid
export function engineFrames() {
  const out = [];
  for (let f = 0; f < NF; f++) {
    const g = new Grid(80, 20);
    const cx = 18, cy = 9.5, Rx = 16, Ry = 8.6;
    const rot = (f / NF) * (Math.PI / 6); // 30 degrees per loop: seamless with meridians every 30
    const plot = (lat, lon, chFront, colF, chBack, colB) => {
      const x = Math.cos(lat) * Math.sin(lon + rot), z = Math.cos(lat) * Math.cos(lon + rot), y = Math.sin(lat);
      const tilt = 0.35, y2 = y * Math.cos(tilt) - z * Math.sin(tilt), z2 = y * Math.sin(tilt) + z * Math.cos(tilt);
      const c = Math.round(cx + x * Rx), r = Math.round(cy - y2 * Ry);
      if (z2 >= 0) g.put(c, r, chFront, colF); else if (g.get(c, r) === " ") g.put(c, r, chBack, colB);
    };
    for (let k = 0; k < 12; k++) for (let i = 0; i <= 80; i++) plot(-Math.PI / 2 + (i / 80) * Math.PI, (k / 12) * TAU, "•", H("#4fa3d8"), "·", H("#22384f"));
    for (const lat of [-60, -30, 0, 30, 60]) for (let i = 0; i < 160; i++) plot((lat * Math.PI) / 180, (i / 160) * TAU, lat === 0 ? "=" : "•", H(lat === 0 ? "#8fe3ff" : "#4fa3d8"), "·", H("#22384f"));
    // players on the surface, pulsing
    [[0.35, 0.4, "#ff7ab6"], [-0.2, 1.9, "#ffd479"], [0.6, 3.6, "#a8e6a3"], [-0.45, 5.0, "#c29bff"]].forEach(([lat, lon, col], i) =>
      plot(lat, lon, (f + i * 3) % 6 < 3 ? "@" : "o", H(col), " ", null));
    g.text(cx - 5, 19, "16 km world", H("#8a88a8"));
    // chunk streaming grid, LOD rings follow a walking player
    const gx0 = 44, gy0 = 2, GW = 16, GH = 12;
    const p = [3 + (f / NF) * 9, 5 + 2.5 * Math.sin((f / NF) * TAU)];
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
      const d = Math.hypot(i - p[0], (j - p[1]) * 1.3);
      const [ch, col] = d < 1.6 ? ["█", "#7fd6ff"] : d < 3.4 ? ["▓", "#3d8fc0"] : d < 5.4 ? ["▒", "#2a5e85"] : d < 7.5 ? ["░", "#1f3f5c"] : ["·", "#2a2a40"];
      g.put(gx0 + i * 2, gy0 + j, ch, H(col)); if (ch !== "·") g.put(gx0 + i * 2 + 1, gy0 + j, ch, H(col));
    }
    g.put(gx0 + Math.round(p[0]) * 2, gy0 + Math.round(p[1]), "@", H("#ff7ab6"), 1);
    g.text(gx0, gy0 + GH + 1, "█ full  ▓ lod1  ▒ lod2  ░ far", H("#5a5878"));
    g.text(gx0, gy0 + GH + 3, "streaming chunks around players", H("#8a88a8"));
    out.push(g);
  }
  return out;
}

// ------------------------------------------------------------------ small icons for the cards
export const ICONS = {
  taterup: [["   .-~~~-.   ", "#c99256"], ["  /  o o  \\  ", "#c99256"], [" |  .___.  | ", "#e0b070"], ["  \\  ~~~  /  ", "#c99256"], ["   `-...-'   ", "#a8753e"]],
  vr: [["  _________  ", "#d6d6e2"], [" /  _   _  \\ ", "#d6d6e2"], ["|  (o) (o)  |", "#7fd6ff"], [" \\____^____/ ", "#d6d6e2"], ["   Quest     ", "#5a5878"]],
  club: [["  o   o   o  ", "#ffd479"], [" /|\\ /|\\ /|\\ ", "#ff9ec4"], [" / \\ / \\ / \\ ", "#ff9ec4"], ["  ~ jam  ~   ", "#5a5878"], ["             ", "#000000"]],
  teach: [[" .---------. ", "#a8e6a3"], [" | fn main |", "#a8e6a3"], [" |  print! |", "#a8e6a3"], [" '----+----' ", "#a8e6a3"], ["      |      ", "#6e4a3c"]],
};
export function iconGrid(lines) {
  const g = new Grid(14, lines.length);
  lines.forEach(([s, col], r) => g.text(0, r, s, H(col)));
  return g;
}

// ------------------------------------------------------------------ readable text blocks
/** lines: array of segment arrays [[text, hex], ...] */
export function textGrid(lines, cols) {
  const g = new Grid(cols, lines.length);
  lines.forEach((segs, r) => { let c = 0; for (const [s, hex] of segs) { g.text(c, r, s, H(hex)); c += [...s].length; } });
  return g;
}
