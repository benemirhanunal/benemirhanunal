// Stage 2, morning at the dojo: teaching. The hero cuts the straw post twice while the students watch and jump.
import * as K from "../kit.js";
import { stage, GY, IN, T, poseAt } from "./_stage.js";
import * as slash from "../pixelfx/fx/melee/sword-slash.js";

const X = 146, DUMMY = X + 46;
const CUTS = [3.5, 4.75];
const STUDENT = [
  "..kkk..",
  ".khhhk.",
  ".khhsk.",
  "..kssk.",
  ".kwwwk.",
  "kwwbwwk",
  "kwwwwwk",
  "kppppkk",
  "kkkkkk.",
];

function dojo(f) {
  const wall = K.hex("#efe2d0"), wall2 = K.hex("#d8c6b2"), wood = K.hex("#5a3a30"), wood2 = K.hex("#3e2822"), roof = K.hex("#3c4466"), roof2 = K.hex("#2a3050"), rim = K.hex("#5a6690");
  const x0 = 214, x1 = 318, top = 92;
  K.rect(f, x0, top, x1 - x0, GY - top, wall);
  for (let x = x0; x < x1; x += 13) K.rect(f, x, top, 2, GY - top, wood);
  K.rect(f, x0, top + 9, x1 - x0, 1, wood2);
  for (let x = x0 + 2; x < x1; x += 13) for (let y = top + 10; y < GY - 2; y += 4) K.rect(f, x + 1, y, 10, 1, wall2);
  K.rect(f, x0, GY - 3, x1 - x0, 3, wood2);
  // roof with upswept ends
  for (let y = 0; y < 14; y++) {
    const inset = 14 - y;
    for (let x = x0 - 8 + inset * 0; x < x1 + 8; x++) {
      const e = Math.min(x - (x0 - 8), x1 + 8 - x);
      if (y < 3 && e < 6 - y * 2) continue;
      K.put(f, x, top - 14 + y + (e < 6 ? -Math.max(0, 3 - Math.floor(e / 2)) : 0), y === 13 ? rim : y % 3 === 0 ? roof2 : roof);
    }
  }
  K.rect(f, x0 - 9, top - 1, x1 - x0 + 18, 1, K.COL.ink);
  // sign board
  K.rect(f, 254, top + 1, 22, 7, wood2); K.rect(f, 255, top + 2, 20, 5, K.hex("#e8d6b4"));
}

let hits = [];
const S = stage({
  n: 2, X, levelUpAt: 6.0,
  paint(f) {
    K.sky(f, ["#4b7fcc", "#5f93d8", "#7eaae2", "#a6c4ec", "#cfdcf0", "#f6e2e8"], 12, 112);
    K.orb(f, 70, 34, 9, { body: ["#fffdf2", "#fff4cc", "#ffe7a8"], halo: "#fff2c0", k: 0.35, craters: false });
    K.ridge(f, { base: 106, amp: 10, freq: 0.03, seed: 8, cols: ["#9fb4e0", "#8aa0d0", "#7c92c4"], peak: { x: 150, w: 80, h: 44 }, snow: 74, snowCols: ["#ffffff", "#d6e0f4"] });
    K.mist(f, 0, T, { y: 100, h: 8, c: "#ffffff", a: 0.45, seed: 2 });
    K.ridge(f, { base: 116, amp: 7, freq: 0.04, seed: 13, cols: ["#7d78a8", "#6a6696", "#5f5a8a"] });
    for (const [x, s] of [[120, 61], [168, 62], [196, 63]]) K.distantTree(f, x, 115, s, { s: 0.36, dim: 0 });
    K.ground(f, GY, { top: ["#6a5e86", "#544a70", "#3e3658"], path: ["#8a80a6", "#706890", "#5a527a"], grass: "#8c7aa6", seed: 9 });
    dojo(f);
  },
  mid(f, p, t) { K.clouds(f, t, T, { y: 40, n: 5, seed: 8, cols: ["#ffffff", "#e2e8f6", "#b8c4e4"] }); },
  backTrees: [],
  trees: [K.growTree(4, GY + 1, { seed: 44, size: 1.05, lean: 0.35 }), K.growTree(306, GY + 1, { seed: 45, size: 0.95, lean: -0.3 })],
  props(f, p, t) {
    K.torii(f, p, 62, GY + 1, { h: 46, w: 48, label: "2", glowK: 0 });
    // the straw post
    let shake = 0;
    for (const c of CUTS) { const u = t - (c + 0.06); if (u > 0 && u < 0.5) shake = Math.round(Math.sin(u * 40) * 3 * (1 - u / 0.5)); }
    const px = DUMMY + shake;
    K.rect(f, DUMMY - 1, GY - 30, 3, 31, K.hex("#5a3a30"));
    for (let y = GY - 30; y < GY - 6; y++) for (let x = -3; x <= 3; x++) {
      const c = Math.abs(x) === 3 ? K.hex("#7a5a28") : x < 0 ? K.hex("#e8c870") : K.hex("#c8a050");
      K.put(f, px + x + Math.round((GY - 6 - y) * shake * 0.03), y, (y - GY) % 7 === 0 ? K.hex("#6a4820") : c);
    }
    // students, kneeling and watching; they hop on each cut
    const GI = K.ramp("#ffffff", "#e6e2f0", "#b9b3cd", "#8a84a2"), NAVY = K.ramp("#4b5a8a", "#36426c", "#283252", "#1c2238");
    [[86, "#2c2643", "#d23a57"], [102, "#6a3a28", "#3a8a5a"], [118, "#1e1930", "#3a5ad8"]].forEach(([sx, hair, belt], i) => {
      let hop = 0;
      for (const c of CUTS) { const u = t - (c + 0.1 + i * 0.05); if (u > 0 && u < 0.35) hop = Math.round(Math.sin((u / 0.35) * Math.PI) * 4); }
      const H = K.ramp(hair, hair, hair, "#120c1a").map((c, j) => j === 0 ? K.mix(c, K.hex("#ffffff"), 0.2) : c);
      const pose = hop ? { crouch: 10, ffx: -2, fbx: -5, fx: -4, fy: -30, bx: 8, by: -30, turn: 1, y: -hop } : { crouch: 15, ffx: -6, ffy: -2, fbx: -8, fby: -2, fx: 5, fy: -11, bx: 7, by: -11, lean: 1 };
      K.hero(f, sx, GY + 1, pose, { t, scarf: false, knot: false, pal: K.outfit({ hair: H, top: GI, belt: K.ramp(belt, belt, belt, "#120c1a"), bottom: NAVY }) });
      if (hop > 2) p.text("!", sx + 2, GY - 34 - hop, K.hex("#fff3a6"), { outline: K.COL.ink });
    });
  },
  event: {
    pose(t) {
      for (const c of CUTS) { const u = t - c; if (u > -0.55 && u < 0.86) return poseAt(slash.act.poses, u); }
      if (t > IN && t < CUTS[0] - 0.55) return { ...poseAt(slash.act.poses, -0.55) };
      return null;
    },
  },
  front(f, p, t) {
    if (t < 1) hits = [];
    for (const c of CUTS) {
      let h = hits.find((q) => q.c === c);
      if (!h && t >= c) { h = { c, fx: K.createFx(slash, { x: X, y: GY + 1, seed: c * 10 }) }; hits.push(h); }
      if (h && !h.fx.done()) { if (t > c) h.fx.update(K.clock.dt); h.fx.draw(f, "back"); h.fx.draw(f, "front"); }
    }
  },
  dialog: { title: "THE DOJO", lines: ["RAN A GAMEDEV TRAINING PROGRAM", "TAUGHT 100+ STUDENTS TO MAKE GAMES"], w: 196 },
  petals: { seed: 19 },
});
export const { w, h, delay, draw } = S;
export const game = S;
export { T };
