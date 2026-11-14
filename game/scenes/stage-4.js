// Stage 4, sunset: Negentra Games, an online shooter. A laggy "remote" copy of the hero trails him; two lag slimes
// hop in and get cut; after the second cut the copy snaps into sync.
import * as K from "../kit.js";
import { stage, GY, IN, T, poseAt } from "./_stage.js";
import * as slash from "../pixelfx/fx/melee/sword-slash.js";
import * as slime from "../pixelfx/fx/critters/slime.js";
import * as poof from "../pixelfx/fx/spawn/poof.js";
import * as combo from "../pixelfx/fx/ui/combo-counter.js";

const X = 132;
const CUTS = [3.55, 4.75], SYNC = 5.35;
const SL = K.resolveOptions(slime.meta, { palette: ["#14061a", "#3a0a2e", "#6e1446", "#b02a52", "#e8506a", "#ff9aa6", "#ffe0e4"] });
const GHOST = K.hex("#7ae8ff");
let fxs = [];

function slimeX(i, t) {
  // each slime hops in from the right and arrives at the blade's reach on its cut
  const arrive = CUTS[i], start = arrive - 2.2, x1 = X + 44, x0 = 340 + i * 30;
  return K.lerp(x0, x1, K.clamp((t - start) / 2.2));
}

const S = stage({
  n: 4, X, levelUpAt: 5.9,
  paint(f) {
    K.sky(f, ["#241638", "#4a1e54", "#86295c", "#c43e58", "#ec6a4c", "#ffa04a", "#ffd27a"], 12, 112);
    K.orb(f, 226, 104, 18, { body: ["#fff0c0", "#ffc070", "#ff8a4a"], halo: "#ff7a4a", k: 0.55, craters: false });
    K.ridge(f, { base: 108, amp: 12, freq: 0.022, seed: 41, cols: ["#6a2a5a", "#58224e", "#4a1c44"] });
    K.pagoda(f, 258, 104, { tiers: 3, w: 34, th: 9, col: "#2a1230", rim: "#4a1e48", win: "#ffb347" });
    K.mist(f, 0, T, { y: 104, h: 8, c: "#ff9a7a", a: 0.4, seed: 6 });
    K.ridge(f, { base: 117, amp: 6, freq: 0.05, seed: 42, cols: ["#3e1838", "#341430", "#2c1028"] });
    for (const [x, s] of [[40, 81], [74, 82], [180, 83]]) K.distantTree(f, x, 116, s, { s: 0.38, dim: 1 });
    K.ground(f, GY, { top: ["#4a2440", "#381c34", "#281428"], path: ["#5a3a58", "#482e48", "#36223a"], grass: "#6a3456", seed: 14 });
  },
  mid(f, p, t) { K.clouds(f, t, T, { y: 46, n: 4, seed: 41, cols: ["#ffb08a", "#e0607a", "#8a2a5a"], h: 5 }); },
  trees: [K.growTree(18, GY + 1, { seed: 91, size: 1.05, lean: 0.3 }), K.growTree(300, GY + 1, { seed: 92, size: 1.0, lean: -0.35 })],
  props(f, p, t) { K.torii(f, p, 74, GY + 1, { h: 48, w: 50, label: "4" }); },
  behind(f, p, t, H) {
    // the remote copy: same moves, a beat late, until the sync
    if (t > (H.game ? IN : 0.3) && t < SYNC) {
      const lag = 0.3, tt = t - lag;
      const pose = tt < IN ? K.walkPose(tt, 7) : (poseOf(tt) ?? K.IDLE(tt));
      const gx = tt < IN ? (H.game ? X - 2 : K.lerp(-16, X, tt / IN) - 2) : X - 2;
      K.hero(f, gx, GY + 1, pose, { t: tt, tint: GHOST, a: 0.45 + 0.1 * Math.sin(t * 20), scarf: false });
      if (t > IN) { p.reset(); p.text(`PING ${Math.round(60 - 50 * K.clamp((t - IN) / (SYNC - IN)))}MS`, X - 14, GY - 50, GHOST, { outline: K.COL.ink }); }
    }
    if (t >= SYNC && t < SYNC + 0.6) {
      const u = (t - SYNC) / 0.6;
      K.glow(f, X, GY - 18, 22 * (1 - u * 0.5), GHOST, 0.6 * (1 - u), 4);
      p.reset(); p.text("SYNCED", X, GY - 52 - u * 6, K.hex("#e8ffff"), { align: "center", outline: K.COL.ink });
    }
  },
  event: { pose: (t) => poseOf(t) },
  front(f, p, t) {
    if (t < 1) fxs = [];
    // slimes
    CUTS.forEach((c, i) => {
      if (t < c + 0.06 && t > c - 2.3) { p.reset(); p.place(Math.round(slimeX(i, t)), GY + 1, true); slime.draw(p, (t * 1.3) % slime.meta.duration, SL); }
    });
    const spawn = (key, at, mod, o) => {
      if (t >= at && !fxs.find((q) => q.key === key)) fxs.push({ key, at, fx: K.createFx(mod, o) });
    };
    CUTS.forEach((c, i) => {
      spawn("s" + i, c, slash, { x: X, y: GY + 1, seed: 3 + i, palette: ["#3a0f2a", "#7a1a46", "#d23a57", "#ff7a8a", "#ffc4d0", "#fff0f4", "#ffffff"] });
      spawn("p" + i, c + 0.06, poof, { x: X + 44, y: GY + 1, seed: 7 + i, palette: ["#3a0a2e", "#6e1446", "#b02a52", "#ff9aa6", "#ffe0e4", "#ffffff"] });
    });
    spawn("combo", CUTS[1] + 0.1, combo, { x: 214, y: GY - 64, count: 2, seed: 4 });
    for (const q of fxs) if (!q.fx.done()) { if (t > q.at) q.fx.update(K.clock.dt); q.fx.draw(f, "back"); q.fx.draw(f, "front"); }
  },
  dialog: { title: "NEGENTRA GAMES", lines: ["ONLINE THIRD-PERSON SHOOTER", "NETCODE ON PHOTON FUSION + AWS"], w: 196 },
  petals: { seed: 29 },
});
function poseOf(t) {
  for (const c of CUTS) { const u = t - c; if (u > -0.55 && u < 0.86) return poseAt(slash.act.poses, u); }
  if (t > IN && t < CUTS[0] - 0.55) return poseAt(slash.act.poses, -0.55);
  return null;
}
export const { w, h, delay, draw } = S;
export const game = S;
export { T };
