// Sakura Road: the career run, playable. Five screens, one per stage. Walk to the glowing spot by each gate and the
// stage plays out as a cutscene; slimes wander in between. Same scenes and art as the README GIFs.
import * as K from "./kit.js";
import { poseAt } from "./pixelfx/core/act.js";
import * as levelUp from "./pixelfx/fx/ui/level-up.js";
import * as slash from "./pixelfx/fx/melee/sword-slash.js";
import * as slime from "./pixelfx/fx/critters/slime.js";
import * as poof from "./pixelfx/fx/spawn/poof.js";
import * as hitSpark from "./pixelfx/fx/impacts/hit-spark.js";
import * as title from "./scenes/hero.js";
import { game as S1 } from "./scenes/stage-1.js";
import { game as S2 } from "./scenes/stage-2.js";
import { game as S3 } from "./scenes/stage-3.js";
import { game as S4 } from "./scenes/stage-4.js";
import { game as S5 } from "./scenes/stage-5.js";
import { GY, IN, OUT, T } from "./scenes/_stage.js";

const STAGES = [S1, S2, S3, S4, S5];
const W = 320, H = 144;
const canvas = document.getElementById("screen");
const ctx = canvas.getContext("2d");
canvas.width = W; canvas.height = H;
const frame = K.createFrame(W, H), titleFrame = K.createFrame(320, 128);
const img = ctx.createImageData(W, H), timg = ctx.createImageData(320, 128);

// ---------------------------------------------------------------- input
const keys = new Set(), pressed = new Set();
const MAP = { ArrowLeft: "L", KeyA: "L", ArrowRight: "R", KeyD: "R", ArrowUp: "J", KeyW: "J", Space: "J", KeyZ: "J", KeyX: "A", KeyJ: "A", KeyK: "A", Enter: "S" };
addEventListener("keydown", (e) => { const k = MAP[e.code]; if (!k) return; e.preventDefault(); if (!keys.has(k)) pressed.add(k); keys.add(k); });
addEventListener("keyup", (e) => { const k = MAP[e.code]; if (k) keys.delete(k); });
addEventListener("blur", () => keys.clear());
for (const b of document.querySelectorAll("[data-key]")) {
  const k = b.dataset.key;
  const on = (e) => { e.preventDefault(); if (!keys.has(k)) pressed.add(k); keys.add(k); b.classList.add("on"); };
  const off = (e) => { e.preventDefault(); keys.delete(k); b.classList.remove("on"); };
  b.addEventListener("pointerdown", on); b.addEventListener("pointerup", off); b.addEventListener("pointercancel", off); b.addEventListener("pointerleave", off);
}
canvas.addEventListener("pointerdown", () => pressed.add("S"));
const hit = (k) => pressed.has(k);

// ---------------------------------------------------------------- state
const SL = K.resolveOptions(slime.meta, { palette: ["#14061a", "#3a0a2e", "#6e1446", "#b02a52", "#e8506a", "#ff9aa6", "#ffe0e4"] });
const JUMP = { ffx: 5, ffy: -11, fbx: -5, fby: -7, fx: -6, fy: -27, bx: 11, by: -25, crouch: 2, lean: 2 };
const FALL = { ffx: 4, ffy: -6, fbx: -6, fby: -9, fx: -8, fy: -24, bx: 12, by: -27, crouch: 1, lean: 1 };
let mode = "title", amb = 0, modeT = 0;
let screen = 0, slide = null;
const done = [false, false, false, false, false];
const P = { x: 24, y: 0, vx: 0, vy: 0, face: 1, walkT: 0, attackT: -1, hurtT: 0, hearts: 3, faint: 0 };
let cut = null; // { s, t (event clock), walkTo }
let fxs = [];
let slimes = [];
function makeSlimes() {
  // a couple per screen, kept away from the event spot
  const spots = [[], [[262, 1]], [[86, -1], [262, 1]], [[262, -1], [296, 1]], [[60, 1], [236, -1]]];
  slimes = spots.flatMap((list, s) => list.map(([x, d], i) => ({ s, x, home: x, dir: d, alive: true, ph: i * 0.6, hurt: 0 })));
}
makeSlimes();

function resetPlayer(x = 24) { Object.assign(P, { x, y: 0, vx: 0, vy: 0, face: 1, attackT: -1, hurtT: 0, faint: 0 }); }

// ---------------------------------------------------------------- update
const ATTACK_LEN = 0.86 + 0.12, HIT_AT = 0.12 + 0.06;
function update(dt) {
  amb = (amb + dt) % (T * 6);
  modeT += dt;
  if (mode === "title") { if (hit("S") || hit("J") || hit("A")) { mode = "play"; modeT = 0; resetPlayer(); } return; }
  if (slide) { slide.k += dt / 0.45; if (slide.k >= 1) slide = null; return; }
  const S = STAGES[screen];

  if (cut) {
    // walk to the spot, then let the stage script run
    if (cut.walk) {
      const d = S.X - P.x;
      P.face = 1;
      if (Math.abs(d) < 1.5) { P.x = S.X; cut.walk = false; cut.t = IN; }
      else { P.x += Math.sign(d) * Math.min(Math.abs(d), 60 * dt); P.walkT += dt; }
    } else {
      cut.t += dt;
      if (cut.t >= OUT) { done[screen] = true; cut = null; if (screen === 4) { mode = "end"; modeT = 0; } }
    }
    return;
  }

  if (P.faint > 0) { P.faint -= dt; if (P.faint <= 0) { resetPlayer(screen === 0 ? 24 : 12); P.hearts = 3; } return; }
  const ground = P.y >= 0;
  // attack
  if (P.attackT >= 0) {
    const prev = P.attackT;
    P.attackT += dt;
    if (prev < HIT_AT && P.attackT >= HIT_AT) {
      for (const m of slimes) {
        if (!m.alive || m.s !== screen) continue;
        const dx = (m.x - P.x) * P.face;
        if (dx > 2 && dx < 58) {
          m.alive = false;
          fxs.push(K.createFx(poof, { x: m.x, y: GY + 1, seed: Math.round(m.x), palette: ["#3a0a2e", "#6e1446", "#b02a52", "#ff9aa6", "#ffe0e4", "#ffffff"] }));
          fxs.push(K.createFx(hitSpark, { x: m.x, y: GY - 8, seed: 3 }));
        }
      }
    }
    if (P.attackT > ATTACK_LEN) P.attackT = -1;
  } else if (hit("A") && ground) {
    P.attackT = 0;
    fxs.push(K.createFx(slash, { x: P.x, y: GY + 1, flip: P.face < 0, seed: Math.floor(amb * 10) }));
  }
  // move
  const busy = P.attackT >= 0 && P.attackT < 0.55;
  const want = busy ? 0 : (keys.has("R") ? 1 : 0) - (keys.has("L") ? 1 : 0);
  if (P.hurtT > 0.8) { /* knocked back, no control */ } else P.vx = want * 66;
  if (want) { P.face = want; P.walkT += dt; }
  if (hit("J") && ground && !busy) P.vy = -215;
  P.vy += 620 * dt;
  P.x += P.vx * dt; P.y += P.vy * dt;
  if (P.y >= 0) { P.y = 0; P.vy = 0; }
  P.hurtT = Math.max(0, P.hurtT - dt);
  // screens
  if (P.x > W + 2) { if (screen < 4 && want === 1) go(screen + 1, 8); else P.x = W + 2; }
  if (P.x < -2) { if (screen > 0 && want === -1) go(screen - 1, W - 8); else P.x = -2; }
  if (P.x > W - 4 && screen === 4) P.x = W - 4;
  // slimes
  for (const m of slimes) {
    if (!m.alive || m.s !== screen) continue;
    const dx = P.x - m.x;
    if (Math.abs(dx) < 120) m.dir = Math.sign(dx) || 1;
    else if (Math.abs(m.x - m.home) > 30) m.dir = Math.sign(m.home - m.x);
    m.x += m.dir * 16 * dt;
    m.ph += dt;
    if (Math.abs(dx) < 9 && P.y > -12 && P.hurtT <= 0 && P.attackT < 0) {
      P.hearts--; m.x -= Math.sign(dx || 1) * 18; P.hurtT = 1.3; P.vx = -Math.sign(m.x - P.x || 1) * 130; P.vy = -150;
      fxs.push(K.createFx(hitSpark, { x: P.x, y: GY - 18, seed: 5 }));
      if (P.hearts <= 0) P.faint = 1.4;
    }
  }
  // the event spot
  if (!done[screen] && Math.abs(P.x - S.X) < 12 && ground && P.attackT < 0) { cut = { walk: true, t: 0 }; P.vx = 0; fxs = []; }
}
function go(s, x) {
  slide = { from: snapshot(), dir: s > screen ? 1 : -1, k: 0 };
  screen = s; P.x = x; P.y = 0; P.vy = 0; fxs = []; cut = null;
}
function snapshot() { return new ImageData(new Uint8ClampedArray(img.data), W, H); }

// ---------------------------------------------------------------- draw
function heroState() {
  const S = STAGES[screen];
  if (cut && !cut.walk) {
    const t = cut.t;
    const ev = S.cfg.event?.pose?.(t);
    let pose = ev;
    if (!pose && S.cfg.levelUp !== false && t >= S.LU_T && t < S.LU_T + 1.6) pose = poseAt(levelUp.act.poses, t - S.LU_T);
    return { x: S.X, y: 0, pose: pose ?? K.IDLE(amb), game: true };
  }
  if (cut && cut.walk) return { x: P.x, y: 0, pose: K.walkPose(P.walkT, 9), game: true };
  let pose;
  if (P.faint > 0) pose = { crouch: 12, ffx: 4, fbx: -6, fx: 6, fy: -8, bx: 8, by: -9, lean: 6 };
  else if (P.attackT >= 0) pose = poseAt(slash.act.poses, P.attackT - 0.12);
  else if (P.y < -0.5) pose = P.vy < 0 ? JUMP : FALL;
  else if (Math.abs(P.vx) > 1) pose = K.walkPose(P.walkT, 9);
  else pose = K.IDLE(amb);
  const blink = P.hurtT > 0 && Math.floor(P.hurtT * 14) % 2 === 0;
  return { x: P.x, y: P.y, pose, flip: P.face < 0, game: true, tint: blink ? K.hex("#ffffff") : null, a: P.faint > 0 ? Math.max(0.2, P.faint / 1.4) : 1, visible: true };
}

const ARROW = ["kkkkkkk", "kyyyyyk", ".kyyyk.", "..kyk..", "...k..."];
function drawExtras(f, p) {
  const S = STAGES[screen];
  // slimes
  for (const m of slimes) {
    if (!m.alive || m.s !== screen || cut) continue;
    p.reset(); p.place(Math.round(m.x), GY + 1, m.dir < 0);
    slime.draw(p, (m.ph * 1.2) % slime.meta.duration, SL);
  }
  // the player's own effects
  for (const q of fxs) if (!q.done()) { q.update(K.clock.dt); q.draw(f, "back"); q.draw(f, "front"); }
  fxs = fxs.filter((q) => !q.done());
  // a bouncing marker over the event spot
  if (!done[screen] && !cut) {
    const b = Math.round(Math.abs(Math.sin(amb * 4)) * 4);
    p.reset(); p.sprite(ARROW, { k: "#120c1a", y: "#fff3a6" }, S.X - 3, GY - 54 - b);
    K.glow(f, S.X, GY - 52 - b, 6, K.hex("#fff3a6"), 0.35, 2);
    K.glow(f, S.X, GY, 14, K.hex("#ffd27a"), 0.25 + 0.1 * Math.sin(amb * 6), 3);
    for (let i = 0; i < 3; i++) { const a = amb * 2 + (i * K.TAU) / 3; K.put(f, S.X + Math.cos(a) * 9, GY - 2 + Math.sin(a) * 2, K.hex("#fff3a6")); }
  }
}

function render() {
  if (mode === "title") {
    K.clearFrame(titleFrame);
    title.draw(titleFrame, amb % T);
    const p = K.painterFor(titleFrame);
    if (Math.floor(modeT * 2) % 2 === 0) p.text("PRESS ENTER OR TAP TO START", 196, 66, K.hex("#fff3a6"), { align: "center", outline: K.COL.ink });
    p.text("A SHORT GAME ABOUT MY CAREER SO FAR", 196, 76, K.hex("#ffd6e3"), { align: "center", shadow: K.COL.ink });
    K.toRGBA(titleFrame, timg.data);
    ctx.fillStyle = "#0b0814"; ctx.fillRect(0, 0, W, H);
    ctx.putImageData(timg, 0, 8);
    return;
  }
  const S = STAGES[screen];
  K.clearFrame(frame);
  const ev = cut && !cut.walk ? cut.t : (amb % IN);
  const Hs = heroState();
  const lu = cut && !cut.walk && cut.t >= S.LU_T && S.cfg.levelUp !== false;
  const doneN = done.filter(Boolean).length + (lu ? 1 : 0);
  const xp = cut && !cut.walk ? K.clamp(K.lerp(0.12, 1, (cut.t - IN) / (S.LU_T - IN))) : 0.12;
  S.scene(frame, amb % T, ev, Hs, {
    hud: { label: `STAGE ${screen + 1}`, lv: 1 + doneN, xp, hearts: P.hearts },
    extra: drawExtras,
    top(f, p) {
      if (screen === 0 && modeT < 9 && !cut) {
        p.reset();
        p.text("ARROWS MOVE   UP JUMP   X SLASH", 160, 134, K.hex("#fff3a6"), { align: "center", outline: K.COL.ink });
      }
      if (P.faint > 0) p.text("OUCH. TRY AGAIN!", 160, 64, K.hex("#ffd6e3"), { font: "big", align: "center", outline: K.COL.ink });
      if (mode === "end" && modeT > 1) {
        for (let y = 50; y < 96; y++) for (let x = 60; x < 260; x++) K.blendPx(f, x, y, K.hex("#120c1e"), 0.85);
        p.text("THANKS FOR PLAYING!", 160, 56, K.hex("#fff3a6"), { font: "big", align: "center", shadow: K.hex("#4a1838") });
        p.text("THE NEXT STAGE IS STILL BEING WRITTEN.", 160, 72, K.hex("#ffd6e3"), { align: "center" });
        p.text("SAY HI: LINKS ARE BELOW THE GAME", 160, 82, K.hex("#ffd6e3"), { align: "center" });
      }
    },
  });
  K.toRGBA(frame, img.data);
  if (slide) {
    const k = K.ease.inOutCubic ? K.ease.inOutCubic(slide.k) : slide.k, off = Math.round(k * W) * slide.dir;
    ctx.putImageData(slide.from, -off, 0);
    ctx.putImageData(img, slide.dir * W - off, 0);
  } else ctx.putImageData(img, 0, 0);
}

// ---------------------------------------------------------------- loop: fixed 60 Hz steps
let last = performance.now(), acc = 0;
function loop(now) {
  acc += Math.min(0.1, (now - last) / 1000);
  last = now;
  let steps = 0;
  while (acc >= 1 / 60 && steps < 4) { update(1 / 60); pressed.clear(); acc -= 1 / 60; steps++; }
  if (steps) { K.clock.dt = steps / 60; render(); }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
window.__sakura = { get state() { return { mode, screen, P: { ...P }, cut, done: [...done], slimes: slimes.filter((m) => m.alive).length }; } };
