// Stage 1, dawn in Eskisehir: university years, the gamedev club. Paper lanterns rise, one for every dev who joined.
import * as K from "../kit.js";
import { stage, GY, IN, T } from "./_stage.js";

const X = 132;
const LANTERN = [".a.", "bcb", "cdc", "bcb", ".a."];

function town(f) {
  // low rooftops on the far bank, a clock tower for the campus
  const C = K.hex("#5b4a7e"), D = K.hex("#4a3b6c"), Wn = K.hex("#ffd9a0");
  const R = new K.Rng(11);
  for (let x = 170; x < 320;) {
    const w = R.int(8, 16), h = R.int(6, 13);
    K.rect(f, x, 112 - h, w, h + 2, R.chance(0.5) ? C : D);
    for (let i = -1; i <= w; i++) K.put(f, x + i, 111 - h, K.hex("#6c5a90"));
    if (R.chance(0.6)) K.put(f, x + 3, 114 - h, Wn);
    x += w + R.int(0, 3);
  }
  K.rect(f, 214, 84, 8, 28, D); K.rect(f, 213, 84, 10, 2, C); K.rect(f, 216, 78, 4, 6, D); K.put(f, 217, 76, D); K.put(f, 218, 76, D);
  K.put(f, 217, 90, Wn); K.put(f, 218, 90, Wn); K.put(f, 217, 91, Wn); K.put(f, 218, 91, Wn);
}

const S = stage({
  n: 1, X,
  paint(f) {
    K.sky(f, ["#2e2756", "#463673", "#6f4886", "#a65d8f", "#dc7f86", "#f7a98a", "#ffd2a0"], 12, 112);
    K.orb(f, 262, 92, 13, { body: ["#fff7d6", "#ffe3a0", "#ffc27a"], halo: "#ffb37a", k: 0.5, craters: false });
    K.ridge(f, { base: 104, amp: 14, freq: 0.018, seed: 21, cols: ["#8c6aa6", "#77589a", "#6a4f8c"] });
    K.mist(f, 0, T, { y: 98, h: 8, c: "#ffc7b0", a: 0.5, seed: 5 });
    town(f);
    K.ridge(f, { base: 116, amp: 6, freq: 0.05, seed: 3, cols: ["#4e3a6a", "#3f2f5a", "#35284e"] });
    for (const [x, s] of [[24, 51], [58, 52], [96, 53]]) K.distantTree(f, x, 114, s, { s: 0.38, dim: 1 });
    K.ground(f, GY, { top: ["#4a3658", "#382a48", "#271e36"], seed: 7 });
  },
  mid(f, p, t) {
    K.clouds(f, t, T, { y: 44, n: 4, seed: 3, cols: ["#ffd9d0", "#f0a6b2", "#b77898"], speed: 1 });
  },
  backTrees: [K.growTree(250, GY + 1, { seed: 33, size: 0.9, lean: -0.1 })],
  trees: [K.growTree(22, GY + 1, { seed: 5, size: 1.15, lean: 0.2 })],
  props(f, p, t) {
    K.torii(f, p, 196, GY + 1, { h: 50, w: 54, label: "1", glowK: t > IN ? 0.35 : 0 });
    K.toro(f, 168, GY + 2, t, T, { seed: 3 });
  },
  behind(f, p, t) {
    // lanterns: released from the hero's hands one after another, drifting up and away, each a member of the club
    const t0 = IN + 0.4;
    for (let i = 0; i < 26; i++) {
      const born = t0 + i * 0.11, age = t - born;
      if (age < 0) continue;
      const R = new K.Rng(100 + i), vx = R.range(-22, 28), vy = R.range(16, 26), ph = R.range(0, K.TAU);
      const x = X + 4 + vx * age * 0.9 + Math.sin(age * 2 + ph) * 4, y = GY - 22 - vy * age;
      if (y < 14) continue;
      const fl = 0.8 + 0.2 * Math.sin(age * 9 + ph);
      p.reset(); p.sprite(LANTERN, { a: "#5a2a10", b: "#e0782a", c: fl > 0.9 ? "#ffd27a" : "#ffb347", d: "#fff3c4" }, Math.round(x) - 1, Math.round(y) - 2);
      K.glow(f, x, y, 7, K.hex("#ff9a3c"), 0.2 * fl, 3);
    }
    // counter
    const n = Math.min(200, Math.floor(K.clamp((t - t0) / 2.8) * 200));
    if (t > t0 && t < 5.4) p.text(`+${n} DEVS`, X + 2, GY - 52, K.hex("#fff3a6"), { align: "center", outline: K.COL.ink });
  },
  event: {
    pose(t) {
      // arms raised as the lanterns go up
      if (t > IN + 0.2 && t < IN + 3.0) return { ffx: 5, fbx: -5, fx: -6, fy: -33, bx: 9, by: -33, turn: 1, crouch: 0, hy: -1 };
      return null;
    },
  },
  dialog: { title: "ESKISEHIR", lines: ["COMPUTER ENGINEERING @ ESOGU", "STARTED A GAMEDEV CLUB. 200+ DEVS JOINED."], w: 200 },
  petals: { seed: 12 },
});
export const { w, h, delay, draw } = S;
export const game = S;
export { T };
