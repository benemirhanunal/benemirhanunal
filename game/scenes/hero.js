// Title card: dusk over a sakura hill, a pagoda and a snow peak, the hero looking out, petals on the wind.
import * as K from "../kit.js";
import * as blossoms from "../pixelfx/fx/weather/cherry-blossoms.js";
import * as fireflies from "../pixelfx/fx/weather/fireflies.js";

export const w = 320, h = 128, T = 10, delay = 80;
const GY = 110;
const optsB = K.resolveOptions(blossoms.meta, {});
const optsF = K.resolveOptions(fireflies.meta, {});

let bg = null; // the static far layers, painted once
const bigTree = K.growTree(40, GY + 1, { seed: 21, size: 1.25, lean: 0.12, spread: 1.05 });
const rightTree = K.growTree(312, GY + 1, { seed: 8, size: 1.1, lean: -0.25 });

function paintStatic(f, t) {
  K.sky(f, ["#120e2c", "#1d1742", "#2f2158", "#4b2a6a", "#743676", "#a8497c", "#da6f84", "#f7a58e"], 0, 96);
  K.stars(f, 0, T, { n: 0 });
  K.orb(f, 276, 24, 10, { k: 0.4 });
  K.ridge(f, { base: 99, amp: 9, freq: 0.03, seed: 4, cols: ["#7c5a96", "#5f467f", "#523c70"], peak: { x: 196, w: 74, h: 50 }, snow: 60, snowCols: ["#f6e2f0", "#c9aedb"] });
  K.mist(f, 0, T, { y: 84, h: 10, c: "#f0a6b8", a: 0.45, seed: 3 });
  K.ridge(f, { base: 106, amp: 13, freq: 0.022, seed: 9, cols: ["#4a3466", "#3a2a56", "#30234a"], offset: 40 });
  K.pagoda(f, 146, 101, { tiers: 5, w: 24, th: 8, col: "#2b2046", rim: "#47376a" });
  for (const [x, s] of [[118, 41], [170, 42], [236, 43], [252, 44]]) K.distantTree(f, x, 104, s, { s: 0.36, dim: 1 });
  K.ground(f, GY, { petals: 110 });
}

export function draw(f, t) {
  const p = K.painterFor(f);
  // stars twinkle above the static layers, so redraw the sky band each frame from the cached static copy
  if (!bg) { paintStatic(f, 0); bg = { c: f.color.slice(), l: f.light.slice() }; }
  f.color.set(bg.c); f.light.set(bg.l);
  K.stars(f, t, T, { n: 60, y1: 52, seed: 5 });
  // far petals behind the trees
  p.reset(); p.place(160, GY + 1); blossoms.drawFar(p, t, { ...optsB, seed: 12 });
  K.drawTree(f, rightTree, t, T, { sway: 0.6 });
  K.toro(f, 118, GY + 2, t, T, { seed: 2 });
  K.toro(f, 262, GY + 2, t, T, { seed: 5, k: 0.8 });
  K.drawTree(f, bigTree, t, T, { sway: 0.7 });
  // the hero, three-quarters, looking out over the valley, scarf on the wind
  const breath = Math.floor(t * 1.2) % 2;
  K.hero(f, 84, GY + 1, { ffx: 5, fbx: -4, fx: 4, fy: -14, bx: 8, by: -17, crouch: breath, weapon: "sword", sa: 2.1 }, { t, wind: 0.75 });
  // title
  const fill = (gx, gy) => K.hex(gy < 2 ? "#fff6f9" : gy < 4 ? "#ffd6e3" : gy < 6 ? "#f6a3c0" : "#e07aa3");
  const shine = (t % T) / T; // a glint sweeps the letters once per loop
  const fillShine = (gx, gy) => (Math.abs(gx + gy * 0.6 - (shine * 260 - 40)) < 3 ? K.hex("#ffffff") : fill(gx, gy));
  p.reset();
  K.textTR(p, "EMI*RHAN U:NAL", 196, 30, fillShine, { font: "big", scale: 2, align: "center", outline: K.COL.ink, shadow: K.hex("#4a1838") });
  p.text("GAME DEVELOPER  .  UNITY + UNREAL  .  ISTANBUL", 196, 54, K.hex("#ffe0b0"), { align: "center", shadow: K.hex("#3a1530") });
  // small sakura seal under the title
  // near petals and fireflies in front of everything
  p.reset(); p.place(160, GY + 1); blossoms.draw(p, t, { ...optsB, seed: 12 });
  K.motes(f, t, T, { n: 12, y0: 78, y1: 108, seed: 9 });
}
