// One level of the career run. The hero walks in, something happens at the gate, a level-up, and he dashes off.
// Same frame for every stage: 320 x 144, a HUD on top, the ground at GY, 10 s seamless loop.
import * as K from "../kit.js";
import { poseAt } from "../pixelfx/core/act.js";
import * as blossoms from "../pixelfx/fx/weather/cherry-blossoms.js";
import * as levelUp from "../pixelfx/fx/ui/level-up.js";

export const W = 320, HH = 144, GY = 126, T = 10;
export const IN = 2.4, OUT = 7.4;
const RUN = [
  { ffx: 9, ffy: -4, fbx: -8, fby: -8, fx: -6, fy: -18, bx: 12, by: -21, crouch: 2, lean: 6 },
  { ffx: 2, ffy: -6, fbx: 1, fby: -12, fx: 1, fy: -17, bx: 7, by: -19, crouch: 0, lean: 6, y: -2 },
  { ffx: -8, ffy: -8, fbx: 9, fby: -4, fx: 11, fy: -21, bx: -3, by: -18, crouch: 2, lean: 6 },
  { ffx: 1, ffy: -12, fbx: 2, fby: -6, fx: 4, fy: -18, bx: 4, by: -17, crouch: 0, lean: 6, y: -2 },
];
export { poseAt };

const optsB = K.resolveOptions(blossoms.meta, {});

// ---- HUD
const HEART = [".k.k.", "krkrk", "krrrk", ".krk.", "..k.."];
export function hud(f, p, { label, lv, xp, hearts = 3 }) {
  for (let y = 0; y < 11; y++) for (let x = 0; x < W; x++) K.blendPx(f, x, y, K.hex("#0b0814"), y < 10 ? 0.72 : 0.9);
  for (let x = 0; x < W; x++) K.put(f, x, 11, K.hex("#3a2a4a"));
  p.reset();
  p.text("EMIRHAN", 5, 3, K.hex("#ffd6e3"));
  for (let i = 0; i < 3; i++) p.sprite(HEART, { k: "#120c1a", r: i < hearts ? "#ff5a7a" : "#3a2a4a" }, 37 + i * 7, 3);
  p.text(label, 160, 3, K.hex("#ffe0b0"), { align: "center" });
  // level and xp bar
  p.text(`LV ${lv}`, 246, 3, K.hex(xp >= 1 ? "#fff3a6" : "#ffd6e3"));
  const bx = 266, bw = 48;
  K.rect(f, bx - 1, 3, bw + 2, 5, K.hex("#120c1a"));
  K.rect(f, bx, 4, bw, 3, K.hex("#2b2038"));
  const fill = Math.round(bw * K.clamp(xp));
  K.rect(f, bx, 4, fill, 3, K.hex("#f390b2"));
  K.rect(f, bx, 4, fill, 1, K.hex("#ffd6e3"));
  if (xp > 0 && xp < 1) K.put(f, bx + fill, 5, K.hex("#ffffff"));
}

// ---- dialog: a box that types itself out
function dialog(f, p, cfg, t) {
  const d = cfg.dialog;
  if (!d) return;
  const t0 = d.t0 ?? IN + 0.15, t1 = d.t1 ?? OUT - 0.2;
  if (t < t0 || t > t1 + 0.25) return;
  const open = K.ease.outBack ? K.clamp((t - t0) / 0.18) : 1, close = K.clamp((t1 + 0.25 - t) / 0.25);
  const bw = d.w ?? 196, bh = 27, cx = d.x ?? 160, x0 = Math.round(cx - (bw / 2) * Math.min(open, close)), x1 = Math.round(cx + (bw / 2) * Math.min(open, close)), y0 = 15;
  for (let y = y0; y < y0 + bh; y++) for (let x = x0; x < x1; x++) K.blendPx(f, x, y, K.hex("#120c1e"), 0.86);
  for (let x = x0; x < x1; x++) { K.put(f, x, y0, K.hex("#f390b2")); K.put(f, x, y0 + bh - 1, K.hex("#a83c6e")); }
  for (let y = y0; y < y0 + bh; y++) { K.put(f, x0, y, K.hex("#f390b2")); K.put(f, x1 - 1, y, K.hex("#a83c6e")); }
  if (open < 1 || close < 1) return;
  const chars = Math.floor((t - t0 - 0.18) * 38);
  let used = 0;
  const type = (s) => { const n = K.clamp(chars - used, 0, s.length); used += s.length; return s.slice(0, n); };
  p.reset();
  p.text(type(d.title), x0 + 6, y0 + 4, K.hex("#fff3a6"), { font: "big", shadow: K.hex("#4a1838") });
  d.lines.forEach((ln, i) => p.text(type(ln), x0 + 6, y0 + 13 + i * 6, K.hex("#ffd6e3")));
  // blinking cursor
  if (chars > used && Math.floor(t * 3) % 2 === 0) p.text(">", x1 - 8, y0 + bh - 8, K.hex("#f390b2"));
}

/** cfg: { n, X, paint(f) static backdrop, mid(f,p,t) animated back, trees:[tree], props(f,p,t,heroX), event(f,p,t) -> {pose, front(f,p)}, dialog, levelUp:true, petals:{seed}, wind } */
export function stage(cfg) {
  const X = cfg.X ?? 140;
  const LU_T = cfg.levelUpAt ?? 5.5;
  function heroAt(t) {
    if (t < IN) return { x: K.lerp(-16, X, t / IN), pose: K.walkPose(t, 7), walking: true };
    if (t < OUT) {
      const ev = cfg.event?.pose?.(t);
      if (ev) return { x: X, pose: ev };
      if (cfg.levelUp !== false && t >= LU_T && t < LU_T + 1.6) return { x: X, pose: poseAt(levelUp.act.poses, t - LU_T) };
      return { x: X, pose: K.IDLE(t) };
    }
    const u = t - OUT;
    return { x: X + u * u * 26 + u * 70, pose: RUN[Math.floor(u * 12) % 4], running: true };
  }
  const st = { lu: null, bg: null };
  /**
   * Draw the stage: amb drives the ambient world (petals, trees, clouds), ev drives the event script (props, dialog,
   * effects, level-up). H: { x, y, pose, flip, tint, a, running, game }. o: { hud: {label, lv, xp, hearts}, extra(f, p) }
   */
  function scene(f, amb, ev, H, o = {}) {
    const p = K.painterFor(f);
    if (!st.bg) { cfg.paint(f); st.bg = { c: f.color.slice(), l: f.light.slice() }; }
    f.color.set(st.bg.c); f.light.set(st.bg.l);
    if (ev < LU_T) st.lu = null;
    cfg.mid?.(f, p, amb);
    if (cfg.petals !== false) { p.reset(); p.place(160, GY + 1); blossoms.drawFar(p, amb, { ...optsB, seed: cfg.petals?.seed ?? 12 }); }
    for (const tr of cfg.backTrees ?? []) K.drawTree(f, tr, amb, T, { sway: 0.6 });
    cfg.props?.(f, p, ev, H);
    if (cfg.levelUp !== false && ev >= LU_T && !st.lu) st.lu = K.createFx(levelUp, { x: X, y: GY + 1, text: cfg.levelText ?? "LEVEL UP!", seed: 5 + cfg.n });
    if (st.lu) { if (ev > LU_T) st.lu.update(K.clock.dt); st.lu.draw(f, "back"); }
    cfg.behind?.(f, p, ev, H);
    if (H.dust) for (const d of H.dust) { p.reset(); p.disc(d.x, d.y, d.r, K.hex("#d8c0d8"), d.a); }
    if (H.visible !== false) K.hero(f, H.x, GY + 1 + Math.round(H.y ?? 0), H.pose, { t: amb, wind: H.running ? 1 : 0.55, flip: H.flip, tint: H.tint, a: H.a ?? 1 });
    o.extra?.(f, p);
    cfg.front?.(f, p, ev, H);
    if (st.lu) st.lu.draw(f, "front");
    for (const tr of cfg.trees ?? []) K.drawTree(f, tr, amb, T, { sway: 0.7 });
    if (cfg.petals !== false) { p.reset(); p.place(160, GY + 1); blossoms.draw(p, amb, { ...optsB, seed: cfg.petals?.seed ?? 12 }); }
    cfg.overlay?.(f, p, ev, H);
    o.top?.(f, p);
    if (o.hud) hud(f, p, o.hud);
    dialog(f, p, cfg, ev);
  }
  function draw(f, t) {
    const H = heroAt(t);
    if (H.running) {
      const u = t - OUT;
      H.dust = [];
      for (let i = 0; i < 4; i++) {
        const age = u - i * 0.12; if (age < 0 || age > 0.6) continue;
        H.dust.push({ x: X + (age > 0 ? (u - age) * 70 : 0) - 6 - age * 10, y: GY - 1 - age * 6, r: 2 + age * 6, a: 0.5 * (1 - age / 0.6) });
      }
    }
    const xp = t < IN ? 0.12 : t < LU_T ? K.lerp(0.12, 0.92, (t - IN) / (LU_T - IN)) : 1;
    const X2 = t > 9.6 ? 0.12 : xp;
    scene(f, t, t, H, { hud: { label: `STAGE ${cfg.n}`, lv: cfg.n + (X2 >= 1 ? 1 : 0), xp: X2 } });
  }
  return { w: W, h: HH, T, delay: 80, draw, scene, cfg, X, LU_T };
}
