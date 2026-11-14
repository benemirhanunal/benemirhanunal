// Stage 5, festival night: TaterUp ships on Steam. Lanterns strung between the trees, fireworks, an achievement toast.
import * as K from "../kit.js";
import { stage, GY, IN, OUT, T } from "./_stage.js";
import * as burst from "../pixelfx/fx/explosions/firework-burst.js";
import * as achievement from "../pixelfx/fx/ui/achievement.js";

const X = 150;
const SHOTS = [
  { t: 2.9, x: 70, y: 70, seed: 3, palette: ["#3d0a33", "#701560", "#b0228f", "#f53cd1", "#ff86e6", "#ffd2f6", "#ffffff"] },
  { t: 3.7, x: 240, y: 62, seed: 5, palette: ["#0a2a3d", "#145a70", "#228fb0", "#3cc8f5", "#86e6ff", "#d2f6ff", "#ffffff"] },
  { t: 4.6, x: 160, y: 56, seed: 8, palette: ["#3d2a0a", "#70500f", "#b08a22", "#f5c83c", "#ffe686", "#fff6d2", "#ffffff"] },
  { t: 6.3, x: 100, y: 60, seed: 11, palette: ["#3d0a14", "#701526", "#b02238", "#f53c5a", "#ff8696", "#ffd2da", "#ffffff"] },
  { t: 6.9, x: 220, y: 66, seed: 13, palette: ["#1a0a3d", "#2e1570", "#4c22b0", "#7a3cf5", "#b086ff", "#e2d2ff", "#ffffff"] },
];
const ACH = 5.0;
let fxs = [];

function lanterns(f, p, t) {
  // a rope sagging between two posts, round red chochin swinging on it
  const xa = 0, xb = 320, ya = 30, sag = 12;
  const ropeY = (x) => ya + sag * (1 - Math.pow((x - (xa + xb) / 2) / ((xb - xa) / 2), 2));
  for (let x = xa; x < xb; x++) K.put(f, x, Math.round(ropeY(x)), K.hex("#2a1a2a"));
  for (let i = 0; i < 9; i++) {
    const x = 18 + i * 36, sw = Math.round(Math.sin(K.TAU * (t / T) * 2 + i) * 1), y = Math.round(ropeY(x)) + 1;
    const c = i % 3 === 1 ? ["#7a4a10", "#e0a030", "#ffd27a", "#fff3c4"] : ["#5a0e1a", "#c8283a", "#ff6a5a", "#ffd2a0"];
    const L = ["..k..", ".aba.", "abcba", "abdba", "abcba", ".aba.", "..k.."];
    p.reset(); p.sprite(L, { k: "#1a1020", a: c[0], b: c[1], c: c[2], d: c[3] }, x - 2 + sw, y);
    K.glow(f, x + sw, y + 4, 12, K.hex(c[2]), 0.28, 4);
  }
}

function stall(f) {
  // a yatai food stall: striped awning, a warm counter
  const x0 = 222, x1 = 292, top = 96;
  for (let x = x0 - 4; x < x1 + 4; x++) for (let y = top; y < top + 7; y++) K.put(f, x, y + (y === top + 6 && (x >> 2) % 2 ? 1 : 0), ((x - x0 + 40) >> 3) % 2 ? K.hex("#e8e0ee") : K.hex("#c8283a"));
  K.rect(f, x0, top + 7, 2, GY - top - 7, K.hex("#3a2430")); K.rect(f, x1 - 2, top + 7, 2, GY - top - 7, K.hex("#3a2430"));
  K.rect(f, x0, GY - 12, x1 - x0, 12, K.hex("#5a3a30")); K.rect(f, x0, GY - 12, x1 - x0, 2, K.hex("#8a5a40"));
  K.rect(f, x0 + 6, top + 9, x1 - x0 - 12, 12, K.hex("#ffd27a"));
  K.glow(f, (x0 + x1) / 2, top + 14, 34, K.hex("#ffb347"), 0.35, 5);
  // a noren with a potato on it, for the game
  const P = ["..aaa..", ".abbba.", "abbcbba", "abbbbca", ".abbba.", "..aaa.."];
  const pal = { a: K.hex("#6a4020"), b: K.hex("#c89050"), c: K.hex("#8a5a30") };
  P.forEach((r, j) => [...r].forEach((ch, i) => ch !== "." && K.put(f, 254 + i, top + 11 + j, pal[ch])));
}

const S = stage({
  n: 5, X, levelUp: false,
  paint(f) {
    K.sky(f, ["#06051a", "#0c0a28", "#161238", "#22184a", "#30205a", "#40285e"], 12, 114);
    K.orb(f, 286, 30, 8, { k: 0.35 });
    K.ridge(f, { base: 112, amp: 12, freq: 0.024, seed: 51, cols: ["#2a2050", "#221a44", "#1c163a"], peak: { x: 120, w: 70, h: 40 }, snow: 80, snowCols: ["#b8b0e0", "#8a80b8"] });
    K.pagoda(f, 190, 108, { tiers: 5, w: 22, th: 8, col: "#141030", rim: "#2a2250", win: "#ffb347" });
    K.ridge(f, { base: 118, amp: 5, freq: 0.05, seed: 52, cols: ["#1c1534", "#17112c", "#130e26"] });
    for (const [x, s] of [[40, 101], [70, 102], [150, 103]]) K.distantTree(f, x, 117, s, { s: 0.36, dim: 1 });
    K.ground(f, GY, { top: ["#2a1e3a", "#20172e", "#171024"], path: ["#3a3050", "#2e2642", "#221c34"], grass: "#3a2a4a", seed: 15 });
    stall(f);
  },
  mid(f, p, t) { K.stars(f, t, T, { n: 70, y1: 90, seed: 9 }); },
  trees: [K.growTree(10, GY + 1, { seed: 111, size: 1.1, lean: 0.3 }), K.growTree(312, GY + 1, { seed: 112, size: 1.0, lean: -0.3 })],
  props(f, p, t) {
    K.torii(f, p, 92, GY + 1, { h: 50, w: 52, label: "5", glowK: 0.3 });
    K.toro(f, 206, GY + 2, t, T, { seed: 8 });
    // fireworks go off behind the trees
    if (t < 1) fxs = [];
    for (const s of SHOTS) if (t >= s.t && !fxs.find((q) => q.s === s)) fxs.push({ s, fx: K.createFx(burst, { x: s.x, y: s.y - 6, seed: s.seed, palette: s.palette }) });
    for (const q of fxs) if (q.s && !q.fx.done()) { if (t > q.s.t) q.fx.update(K.clock.dt); q.fx.draw(f, "back"); q.fx.draw(f, "front"); }
  },
  event: {
    pose(t) {
      if (t > IN + 0.3 && t < OUT) {
        // arms up, hopping, when the toast lands
        const hop = t > ACH && t < ACH + 1.6 ? Math.round(Math.abs(Math.sin((t - ACH) * 8)) * 5) : 0;
        return { ffx: 5, fbx: -5, fx: -5, fy: -36, bx: 10, by: -36, turn: 1, y: -hop, crouch: hop ? 0 : 1 };
      }
      return null;
    },
  },
  overlay(f, p, t) {
    lanterns(f, p, t);
    if (t >= ACH && !fxs.find((q) => q.a)) fxs.push({ a: true, fx: K.createFx(achievement, { x: 160, y: 52, title: "OUT ON STEAM", text: "TATERUP", seed: 4 }) });
    const a = fxs.find((q) => q.a);
    if (a && !a.fx.done()) { if (t > ACH) a.fx.update(K.clock.dt); a.fx.draw(f, "back"); a.fx.draw(f, "front"); }
    if (t > 8.3 && t < 9.7) {
      const s = "TO BE CONTINUED...";
      p.reset(); p.text(s.slice(0, Math.floor((t - 8.3) * 24)), 160 - p.measure(s, { font: "big" })[0] / 2, 70, K.hex("#ffd6e3"), { font: "big", outline: K.COL.ink });
    }
  },
  dialog: { title: "TATERUP", lines: ["MY OWN GAME. DESIGNED, BUILT", "AND SHIPPED IT ON STEAM."], w: 180, t1: 4.8 },
  petals: { seed: 31 },
});
export const { w, h, delay, draw } = S;
export const game = S;
export { T };
