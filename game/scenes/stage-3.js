// Stage 3, golden afternoon: TUSEB, healthcare VR. The hero puts on a headset and a virtual ward unfolds round him:
// a grid floor rolls out, a scan line reads him head to toe, hologram panels open with a heartbeat trace.
import * as K from "../kit.js";
import { stage, GY, IN, T } from "./_stage.js";

const X = 140;
const ON = IN + 0.5, OFF = 5.6;
const CY = K.ramp("#0a3a4a", "#137a8a", "#2cc8d8", "#8ff4ff", "#e8ffff");

function building(f) {
  // a calm white clinic on the hill: flat roof, rows of windows, a red cross
  const wl = K.hex("#f2e6e0"), wd = K.hex("#d8c4c4"), win = K.hex("#8fa8d0"), win2 = K.hex("#ffe0a0"), ink = K.hex("#5a4a62");
  const x0 = 206, x1 = 300, top = 82;
  K.rect(f, x0, top, x1 - x0, GY - top, wl);
  K.rect(f, x1 - 10, top, 10, GY - top, wd);
  K.rect(f, x0 - 2, top - 3, x1 - x0 + 4, 3, ink);
  const R = new K.Rng(4);
  for (let y = top + 6; y < GY - 10; y += 9) for (let x = x0 + 5; x < x1 - 12; x += 10) K.rect(f, x, y, 6, 5, R.chance(0.3) ? win2 : win);
  K.rect(f, 246, GY - 12, 12, 12, K.hex("#7a6a88"));
  const cx = 252, cy = top - 11;
  K.rect(f, cx - 6, cy - 6, 13, 13, K.hex("#ffffff")); K.rect(f, cx - 1, cy - 4, 3, 9, K.hex("#e0303a")); K.rect(f, cx - 4, cy - 1, 9, 3, K.hex("#e0303a"));
  K.rect(f, cx, top - 4, 1, 4, ink);
}

function panel(f, p, x, y, w, h, k, draw) {
  if (k <= 0) return;
  const hh = Math.max(1, Math.round(h * k));
  const y0 = Math.round(y + (h - hh) / 2);
  for (let j = y0; j < y0 + hh; j++) for (let i = x; i < x + w; i++) K.blendPx(f, i, j, K.hex("#06202a"), 0.78);
  for (let i = x; i < x + w; i++) { K.put(f, i, y0, CY[3]); K.put(f, i, y0 + hh - 1, CY[2]); }
  for (let j = y0; j < y0 + hh; j++) { K.put(f, x, j, CY[3]); K.put(f, x + w - 1, j, CY[2]); }
  for (let i = x; i < x + w; i++) K.addLight(f, i, y0, CY[2], 0.4);
  if (k >= 1) draw();
}

const S = stage({
  n: 3, X, levelUpAt: 5.9,
  paint(f) {
    K.sky(f, ["#3a4f96", "#5a63a8", "#8c74ae", "#c888a6", "#f0a896", "#ffcf8e"], 12, 114);
    K.orb(f, 92, 78, 12, { body: ["#fffbe0", "#ffe9a8", "#ffd27a"], halo: "#ffc070", k: 0.5, craters: false });
    K.ridge(f, { base: 110, amp: 12, freq: 0.026, seed: 31, cols: ["#a07ab0", "#8a68a2", "#7a5c96"] });
    K.mist(f, 0, T, { y: 102, h: 9, c: "#ffd0a8", a: 0.5, seed: 8 });
    K.ridge(f, { base: 118, amp: 6, freq: 0.05, seed: 32, cols: ["#6a4e82", "#5a4274", "#4e3a68"] });
    building(f);
    for (const [x, s] of [[30, 71], [62, 72], [176, 73]]) K.distantTree(f, x, 117, s, { s: 0.38, dim: 1 });
    K.ground(f, GY, { top: ["#5a4466", "#463554", "#33283f"], seed: 12 });
  },
  mid(f, p, t) {
    K.clouds(f, t, T, { y: 36, n: 4, seed: 21, cols: ["#ffe6d0", "#f4b6b0", "#c48aa6"] });
    // shafts of late light
    for (let i = 0; i < 3; i++) {
      const bx = 70 + i * 60 + Math.sin(K.TAU * (t / T) + i) * 4;
      for (let y = 14; y < GY; y++) for (let x = 0; x < 10; x++) {
        const xx = Math.round(bx + x + (y - 14) * 0.55);
        if ((x === 0 || x === 9) && K.bayer(xx, y) > 0.5) continue;
        K.addLight(f, xx, y, K.hex("#ffc890"), 0.05 + 0.02 * Math.sin(K.TAU * 2 * (t / T) + i));
      }
    }
  },
  trees: [K.growTree(314, GY + 1, { seed: 77, size: 1.1, lean: -0.3 }), K.growTree(8, GY + 1, { seed: 78, size: 0.95, lean: 0.25 })],
  props(f, p, t) { K.torii(f, p, 70, GY + 1, { h: 48, w: 50, label: "3" }); },
  behind(f, p, t) {
    const k = K.clamp((t - ON) / 0.6) * K.clamp((OFF - t) / 0.4);
    if (k <= 0) return;
    // grid floor: concentric ellipses and spokes on the ground, rolling out from his feet
    const R = 70 * K.ease.outCubic(K.clamp((t - ON) / 0.8)) * (t > OFF - 0.4 ? k : 1);
    for (let r = 10; r < R; r += 10) {
      for (let a = 0; a < K.TAU; a += 0.02) {
        const x = Math.round(X + Math.cos(a) * r), y = Math.round(GY + 1 + Math.sin(a) * r * 0.16);
        if (Math.sin(a) < 0 && K.bayer(x, y) > 0.6) continue;
        K.put(f, x, y, r + 10 >= R ? CY[3] : CY[2]); K.addLight(f, x, y, CY[2], 0.25);
      }
    }
    for (let s = 0; s < 12; s++) {
      const a = (s / 12) * K.TAU;
      for (let r = 6; r < R; r += 1.5) { const x = Math.round(X + Math.cos(a) * r), y = Math.round(GY + 1 + Math.sin(a) * r * 0.16); if (K.bayer(x, y) < 0.5) K.put(f, x, y, CY[1]); }
    }
  },
  event: {
    pose(t) {
      if (t > IN && t < ON) return { ffx: 4, fbx: -4, fx: 3, fy: -32, bx: 6, by: -32, crouch: 0 }; // putting the headset on
      if (t >= ON && t < OFF) return { ffx: 5, fbx: -5, fx: 14, fy: -24 + Math.round(Math.sin(t * 3)), bx: 12, by: -22, crouch: 1, turn: 0.6 }; // hands out in the virtual space
      return null;
    },
  },
  front(f, p, t, H) {
    // headset visor
    if (t > IN + 0.3 && t < OFF + 0.2 && !H.running) {
      for (let i = 0; i < 4; i++) K.put(f, H.x + i, GY + 1 - 33, i === 3 ? CY[4] : CY[3]);
      for (let i = 0; i < 4; i++) K.put(f, H.x + i, GY + 1 - 32, CY[2]);
      K.put(f, H.x - 2, GY - 33, K.COL.ink); K.put(f, H.x - 1, GY - 33, K.COL.ink);
      K.glow(f, H.x + 2, GY - 32, 6, CY[2], 0.5, 3);
    }
    const k = K.clamp((t - ON) / 0.3) * K.clamp((OFF - t) / 0.3);
    if (k <= 0) return;
    // scan line, head to toe, twice
    const u = ((t - ON) / 1.4) % 1, sy = Math.round(GY - 40 + u * 42);
    for (let x = X - 14; x <= X + 16; x++) { K.put(f, x, sy, CY[3]); K.addLight(f, x, sy, CY[3], 0.6); K.addLight(f, x, sy - 1, CY[2], 0.3); }
    // panels: a heartbeat monitor and a body chart
    const k1 = K.clamp((t - ON - 0.3) / 0.25), k2 = K.clamp((t - ON - 0.6) / 0.25);
    const fade = K.clamp((OFF - t) / 0.25);
    panel(f, p, X + 24, GY - 58, 46, 22, k1 * fade, () => {
      p.reset(); p.text("BPM 72", X + 28, GY - 55, CY[3]);
      for (let i = 0; i < 38; i++) {
        const ph = (i + Math.floor(t * 30)) % 19, y = ph === 8 ? -6 : ph === 9 ? 4 : ph === 10 ? -2 : 0;
        K.put(f, X + 28 + i, GY - 44 + y, CY[4]); K.addLight(f, X + 28 + i, GY - 44 + y, CY[3], 0.3);
      }
    });
    panel(f, p, X - 62, GY - 64, 34, 30, k2 * fade, () => {
      // a little body outline with a pulsing heart
      const bx = X - 45, by = GY - 60;
      const body = ["..###..", "..###..", "...#...", ".#####.", "#.###.#", "#.###.#", "..#.#..", "..#.#..", "..#.#.."];
      body.forEach((r, j) => [...r].forEach((c, i) => c === "#" && K.put(f, bx - 3 + i, by + 4 + j * 2, CY[3])));
      if (Math.floor(t * 4) % 2) { K.put(f, bx, by + 11, K.hex("#ff6b8b")); K.glow(f, bx, by + 11, 4, K.hex("#ff6b8b"), 0.5, 2); }
      p.reset(); p.text("OK", bx + 8, by + 22, CY[3]);
    });
  },
  dialog: { title: "TUSEB", lines: ["VR SIMULATIONS FOR MEDICAL TRAINING", "UNITY, META QUEST, LOTS OF PROFILING"], w: 200 },
  petals: { seed: 23 },
});
export const { w, h, delay, draw } = S;
export const game = S;
export { T };
