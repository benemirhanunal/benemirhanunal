// The cozy room: night, sakura outside the window, a blond, broad-shouldered dev at two monitors with a sleeping
// white cat on his lap. Painted as a raster, then turned into colored ASCII; monitors get real text on top.
import { Raster, C, mixc, mul, toGrid } from "./raster.mjs";
import { hexrgb } from "./grid.mjs";

export const DW = 416, DH = 256;          // design units the room is painted in
export const SW = 480, SH = 296;          // raster size; 2x4 raster px per glyph cell -> 240 x 74 cells
export const SK = SW / DW;
export const MON = [{ c0: 141, r0: 17 }, { c0: 187, r0: 17 }], MW = 42, MH = 18; // monitor screens, in cells
const dx = (c) => (c * 2) / SK, dy = (r) => (r * 4) / SK;                     // cell -> design units
export const cellOf = (x, y) => [Math.floor((x * SK) / 2), Math.floor((y * SK) / 4)];
export const NF = 24;

export function rng(seed) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const cl = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
/** soft 3-tone shading for a round form lit from the right (the monitors) */
const shade = (lo, mid, hi, cx, cy, rx, ry, bias = 0) => (x, y) => {
  const nx = (x - cx) / rx, ny = (y - cy) / ry;
  const t = cl(0.5 + 0.55 * nx - 0.25 * ny + bias);
  return t < 0.5 ? mixc(lo, mid, t * 2) : mixc(mid, hi, (t - 0.5) * 2);
};

const P = {
  wallT: C("1a1429"), wallB: C("110d1c"),
  wood: C("6e4a3c"), woodHi: C("9a6a52"), woodDk: C("3e2a24"),
  skyT: C("141b3e"), skyB: C("3a2558"),
  moon: C("fff1cf"),
  trunk: C("24141c"),
  pink: [C("ffb3cc"), C("f58fb2"), C("ffd6e4"), C("e06e9a")],
  skin: [C("b8705a"), C("e89a80"), C("ffd2c0")],
  hair: [C("d9a52a"), C("ffd84a"), C("fff6c8")],
  shirt: [C("7d8194"), C("c9ccd8"), C("fbfbff")],
  jeans: [C("26365c"), C("3d5a94"), C("6a8cc8")],
  cat: [C("8c8aa6"), C("dcdcec"), C("ffffff")],
  white: C("f2ebe4"),
  dark: C("15141c"),
  bezel: C("2b2b3a"),
  warm: C("ffc77a"), cyan: [0.35, 0.7, 1.0], moonL: [0.55, 0.62, 1.0],
};

/** paint frame f (0..NF-1) */
export function paint(f) {
  const R = new Raster(SW, SH);
  R.scale(SK);
  R.amb = [0.3, 0.27, 0.4];
  const t = f / NF, TAU = Math.PI * 2;

  // wall with faint vertical paneling
  R.rect(0, 0, DW, DH, (x, y) => mul(mixc(P.wallT, P.wallB, y / DH), 0.3), { emit: true }); // wall is self-lit: no light spill noise
  R.glow(397, 30, 120, [0.55, 0.36, 0.2], 0.32);   // lamp wash on the wall
  R.glow(320, 92, 150, [0.12, 0.26, 0.5], 0.3);    // monitor wash
  R.glow(22, 112, 50, [0.5, 0.28, 0.12], 0.25);    // candle wash
  // floor and rug
  R.rect(0, 244, DW, DH, (x, y) => mul(mixc(C("2e2236"), C("221a2a"), (y - 244) / 12), 0.35), { emit: true });
  R.ellipse(176, 250, 96, 7, C("6a3354"));
  R.ellipse(176, 250, 84, 5, C("8a4468"));

  // ---- window, moon, sakura outside
  const WX0 = 10, WY0 = 22, WX1 = 112, WY1 = 128;
  R.rect(WX0 - 4, WY0 - 4, WX1 + 4, WY1 + 2, P.wood);
  R.save(); R.clip(WX0, WY0, WX1, WY1);
  R.rect(WX0, WY0, WX1, WY1, (x, y) => mul(mixc(P.skyT, P.skyB, (y - WY0) / (WY1 - WY0)), 0.9), { emit: true });
  const sr = rng(7);
  for (let i = 0; i < 36; i++) {
    const x = WX0 + sr() * (WX1 - WX0), y = WY0 + sr() * 70, tw = 0.5 + 0.5 * Math.sin(TAU * (t * 2 + sr()));
    R.rect(x, y, x + 1, y + 1, mul(C("fff6dc"), 0.35 + 0.5 * tw * sr()), { emit: true });
  }
  R.glow(38, 46, 36, [0.45, 0.5, 0.9], 0.55);
  R.circle(38, 46, 9.5, P.moon, { emit: true });
  R.circle(35, 44, 2, mul(P.moon, 0.86), { emit: true });
  R.circle(41, 50, 1.4, mul(P.moon, 0.88), { emit: true });
  // far hills and a tiny pagoda roofline
  R.poly([[WX0, 112], [30, 100], [52, 106], [78, 96], [WX1, 104], [WX1, WY1], [WX0, WY1]], mul(C("1c1634"), 1), { emit: true });
  R.poly([[60, 98], [72, 92], [84, 98]], C("120d22"), { emit: true });
  R.rect(66, 98, 78, 104, C("120d22"), { emit: true });
  // tree: trunk from the lower right, branches reaching left across the glass
  const br = [[[116, 130], [96, 96], 6, 4.5], [[96, 96], [70, 70], 4, 3], [[96, 96], [106, 56], 3.5, 2.5], [[70, 70], [40, 78], 2.6, 1.6],
    [[78, 76], [56, 98], 2.2, 1.4], [[106, 56], [84, 36], 2.4, 1.4], [[70, 70], [62, 44], 2, 1.2], [[106, 56], [114, 30], 2, 1.2]];
  for (const [a, b, r0, r1] of br) R.capsule(a[0], a[1], b[0], b[1], [r0, r1], P.trunk, { emit: true });
  const blossoms = [[40, 78, 9], [56, 98, 8], [62, 44, 9], [84, 36, 10], [70, 70, 8], [106, 56, 9], [114, 30, 9], [92, 84, 7], [50, 60, 6], [100, 40, 7], [80, 56, 7]];
  const pr = rng(11);
  for (const [bx, by, r] of blossoms) for (let i = 0; i < 26; i++) {
    const a = pr() * TAU, d = Math.sqrt(pr()) * r, rr = 1.2 + pr() * 2.2;
    R.circle(bx + Math.cos(a) * d * 1.2, by + Math.sin(a) * d, rr, mul(P.pink[Math.floor(pr() * 4)], 0.55 + pr() * 0.35), { emit: true });
  }
  R.restore();
  R.rect(WX0 + 48, WY0, WX0 + 52, WY1, P.wood); R.rect(WX0, 74, WX1, 77, P.wood); // mullions
  R.rect(4, WY1, 118, WY1 + 6, P.woodHi);                                      // sill
  // candle on the sill
  R.rect(20, 118, 25, 128, C("efe2d0"));
  const fl = 0.85 + 0.15 * Math.sin(TAU * t * 5) * Math.sin(TAU * t * 3 + 1);
  R.ellipse(22.5, 114.5 - fl, 1.6, 3 * fl, mul(C("ffd27a"), 1.3), { emit: true });
  R.glow(22.5, 114, 14, [1, 0.6, 0.25], 0.5 * fl);
  R.light(22, 114, 80, [1, 0.62, 0.3], 0.5);
  // potted plant on the sill
  R.poly([[92, 117], [106, 117], [104, 128], [94, 128]], C("b4603e"));
  for (const [a, l] of [[-2.2, 13], [-1.6, 15], [-1.0, 12], [-2.6, 10], [-0.6, 10]]) R.capsule(99, 117, 99 + Math.cos(a) * l, 117 + Math.sin(a) * l, [2.2, 0.8], C("4f9a62"));
  R.light(40, 60, 230, P.moonL, 0.35);

  // ---- fairy lights along the top
  const sag = (x) => 5 + 9 * Math.sin(Math.PI * ((x % 104) / 104));
  for (let x = 0; x < DW; x += 1) R.rect(x, sag(x), x + 1, sag(x) + 0.8, C("1a1622"));
  const bulbs = [C("ffd27a"), C("ff9ec4"), C("ffe9a8"), C("ffb38a")];
  for (let i = 0, x = 6; x < DW; x += 13, i++) {
    const on = 0.55 + 0.45 * Math.max(0, Math.sin(TAU * (t * 2 + i * 0.37)));
    const y = sag(x) + 2.5, c = bulbs[i % 4];
    R.glow(x, y, 9, c, 0.45 * on);
    R.circle(x, y, 1.7, mul(c, 0.8 + 0.6 * on), { emit: true });
    R.light(x, y + 4, 46, c, 0.16);
  }

  // ---- shelf with books, VR headset, potato plush, little lamp
  R.rect(326, 27, 416, 30, P.woodHi); R.rect(332, 30, 335, 36, P.woodDk); R.rect(404, 30, 407, 36, P.woodDk);
  R.rrect(334, 18, 358, 27, 3, C("d6d6e2")); R.rrect(337, 20, 355, 25, 2, C("17171f")); R.rect(332, 21, 334, 24, C("8a8aa0"));
  R.ellipse(370, 22, 8, 5.5, C("c99256")); R.circle(367, 21, 0.9, P.dark); R.circle(373, 21, 0.9, P.dark); R.rect(368, 24, 372, 24.8, C("7a3a2a"));
  // lamp
  R.rect(392, 25, 402, 27, C("40404c")); R.rect(396, 14, 398, 25, C("40404c"));
  R.poly([[388, 15], [406, 15], [402, 7], [392, 7]], C("e8b45a"));
  R.ellipse(397, 16, 5, 1.6, mul(C("fff0c0"), 1.4), { emit: true });
  R.glow(397, 18, 22, [1, 0.75, 0.4], 0.35);
  R.light(397, 22, 200, [1, 0.72, 0.42], 1.05, { down: 6 });

  // ---- desk, monitors, keyboard, mug
  R.rect(226, 150, DW, 157, (x, y) => (y < 151.5 ? P.woodHi : P.wood), { mat: 6 });
  R.rect(226, 157, DW, 160, P.woodDk);
  R.rect(230, 160, 236, 244, P.woodDk); R.rect(404, 160, 410, 244, P.woodDk);
  for (const m of MON) {
    const x0 = dx(m.c0), x1 = dx(m.c0 + MW), y0 = dy(m.r0), y1 = dy(m.r0 + MH);
    R.rrect(x0 - 3, y0 - 3, x1 + 3, y1 + 3, 3, P.bezel);
    R.rect(x0, y0, x1, y1, C("0a1424"), { emit: true, mask: 1 });
    const mx = (x0 + x1) / 2;
    R.rect(mx - 3, 123, mx + 3, 141, C("252532"));
    R.rrect(mx - 15, 141, mx + 15, 150, 2, C("2a2a38"));
  }
  R.glow(280, 90, 70, [0.2, 0.4, 0.8], 0.12); R.glow(360, 90, 70, [0.2, 0.4, 0.8], 0.12);
  R.light(282, 92, 200, P.cyan, 0.95); R.light(360, 92, 170, P.cyan, 0.6);
  R.light(205, 95, 120, [1, 0.92, 0.85], 0.75); // soft key light on the figure
  R.light(215, 175, 90, [1, 0.85, 0.75], 0.7); R.light(238, 160, 50, [1, 0.6, 0.85], 0.5); // lap fill, keyboard glow
  // keyboard with a soft rgb underglow
  R.rrect(248, 145, 304, 150, 1.5, C("22222c"));
  R.rect(250, 146, 302, 149, (x) => mul(mixc(C("ff6fae"), C("6fd8ff"), (Math.sin(x * 0.12 - TAU * t) + 1) / 2), 0.45), { emit: true });
  R.rrect(309, 146, 317, 150, 2, C("2a2a36"));
  // mug + steam
  R.rrect(401, 137, 412, 150, 2, C("efe4da")); R.circle(406.5, 143, 1.6, C("f58fb2"));
  R.capsule(412, 140, 414, 146, 1.4, C("efe4da"));
  for (let k = 0; k < 2; k++) for (let y = 135; y > 104; y -= 1) {
    const age = (135 - y) / 31, x = 406 + k * 3 + 3 * Math.sin(y * 0.22 + TAU * t * 2 + k * 2);
    R.circle(x, y, 1 + age * 1.2, [0.9, 0.9, 1], { emit: true, add: true, a: 0.16 * (1 - age) });
  }

  // ---- chair
  R.rrect(108, 80, 132, 174, 9, C("3a3550"));
  R.rrect(114, 88, 126, 162, 5, C("c04f86"));
  R.rrect(118, 168, 208, 180, 4, C("3a3550"));
  R.rect(158, 180, 165, 226, C("4a4a58"));
  R.rrect(128, 224, 198, 229, 2, C("3a3a48"));
  for (const x of [131, 162, 195]) R.circle(x, 233, 4, C("1e1e26"));

  // ---- the dev. far side first (darker), then torso, near leg, cat, head, near arm
  const dk = (c) => mul(c, 0.62);
  R.capsule(150, 160, 216, 164, [12, 11], dk(P.jeans[1]), { mat: 4 });          // far thigh
  R.capsule(214, 166, 212, 228, [9, 7.5], dk(P.jeans[1]), { mat: 4 });          // far shin
  R.rrect(204, 227, 234, 237, 4, dk(P.white));
  R.capsule(176, 130, 268, 141, [8, 6.5], dk(P.skin[1]));           // far forearm
  R.ellipse(272, 142, 6, 4.5, dk(P.skin[1]));
  // torso: broad back, big chest pushing the tee forward
  const torso = [[140, 96], [164, 91], [180, 95], [191, 104], [197, 118], [193, 134], [188, 150], [186, 170], [140, 172], [131, 150], [129, 120], [132, 104]];
  R.poly(torso, shade(P.shirt[0], P.shirt[1], P.shirt[2], 168, 120, 30, 50), { mat: 3 });
  R.ellipse(186, 112, 10, 9, shade(P.shirt[1], P.shirt[1], P.shirt[2], 182, 106, 10, 10, 0.2), { mat: 3 }); // pec
  R.circle(184, 125, 1.6, C("f58fb2")); R.circle(187, 123, 1.2, C("ffd6e4")); R.circle(182, 122, 1.1, C("f58fb2")); // little sakura print
  // near leg
  R.capsule(150, 164, 224, 168, [14, 12.5], shade(P.jeans[0], P.jeans[1], P.jeans[2], 190, 160, 40, 14, -0.1), { mat: 4 });
  R.capsule(226, 170, 230, 228, [10.5, 8.5], shade(P.jeans[0], P.jeans[1], P.jeans[2], 228, 200, 10, 30), { mat: 4 });
  R.rrect(216, 226, 252, 237, 5, P.white); R.rect(216, 235, 252, 238, C("3a3a46")); R.rect(240, 229, 250, 230, C("f58fb2"));
  // cat: a white cat curled along the thigh, head up on the knee, eyes glowing in the monitor light
  const ph = Math.sin(TAU * t);
  const catSh = (cx, cy, rx, ry, bias = 0) => shade(P.cat[0], P.cat[1], P.cat[2], cx, cy, rx, ry, bias);
  const tail = [[182, 162], [172, 172], [168, 184 + 2 * ph], [173 + 6 * ph, 193], [181 + 9 * ph, 192 - 3 * ph]];
  for (let i = 0; i < tail.length - 1; i++) R.capsule(tail[i][0], tail[i][1], tail[i + 1][0], tail[i + 1][1], [4.2 - i * 0.5, 3.8 - i * 0.5], catSh(172, 178, 10, 14, 0.15), { mat: 5 });
  const breathe = 0.6 * Math.sin(TAU * t * 2);
  R.ellipse(206, 160, 24, 10 + breathe, catSh(212, 154, 24, 10, 0.1), { mat: 5 });
  R.poly([[228, 160], [229, 147], [236, 156]], catSh(232, 152, 5, 6, 0.2)); R.poly([[239, 156], [245, 147], [246, 161]], catSh(243, 152, 4, 6, 0.3));
  R.poly([[230, 157], [230.5, 151], [234, 156]], C("f2a0b4")); R.poly([[240.5, 156], [244, 151], [244.5, 158]], C("f2a0b4"));
  R.circle(237, 165, 9, catSh(240, 162, 9, 9, 0.1), { mat: 5 });
  const blink = f === 17 || f === 18;
  for (const ex of [233, 241]) {
    if (blink) R.rect(ex - 2, 164, ex + 2, 165, C("8fae4a"));
    else { R.ellipse(ex, 164.2, 2.2, 1.9, mul(C("c9ff6a"), 1.15), { emit: true }); R.rect(ex - 0.4, 162.6, ex + 0.5, 165.8, C("10140a")); }
  }
  R.glow(237, 164, 10, [0.5, 0.8, 0.2], 0.25);
  R.circle(237, 168.5, 1, C("c06a7a"));
  // neck and traps, head, hair
  const sk = (cx, cy, rx, ry, bias = 0) => shade(P.skin[0], P.skin[1], P.skin[2], cx, cy, rx, ry, bias);
  R.poly([[150, 98], [160, 80], [176, 80], [186, 98]], sk(170, 90, 16, 10, 0.05));      // thick neck into the traps
  R.ellipse(171, 64, 15.5, 16, sk(174, 62, 18, 16, 0.15));
  R.poly([[161, 72], [187, 68], [189, 78], [185, 86], [175, 91], [164, 86]], sk(178, 78, 13, 10, 0.15)); // square jaw
  R.poly([[185, 76], [189, 79], [185, 86], [176, 90], [168, 86], [178, 85]], (x, y) => mixc(sk(178, 80, 12, 10, 0.1)(x, y), P.hair[0], 0.3)); // stubble
  R.poly([[185, 57], [192, 68], [186, 70]], sk(186, 64, 5, 6, 0.3));                     // nose
  R.ellipse(162.5, 67, 3, 4.5, P.skin[0]); R.ellipse(162.8, 67, 1.5, 2.6, mixc(P.skin[0], P.skin[1], 0.5));
  R.rect(178, 62, 182.5, 64, C("2a1c20")); R.rect(181.2, 62, 182.5, 63, C("bfe8ff"), { emit: true }); // eye with screen glint
  R.poly([[176, 59], [185, 58], [185, 60], [176, 61]], P.hair[0]);                        // brow
  R.rect(181, 80, 186, 81, C("8a4a3a"));                                                  // mouth
  // blond hair: short faded sides, thick swept quiff on top
  R.poly([[155, 70], [154, 56], [158, 47], [166, 42], [176, 40], [186, 42], [193, 47], [196, 53], [190, 54], [184, 52], [176, 54], [168, 56], [163, 62], [160, 72]],
    (x, y) => { const s = shade(P.hair[0], P.hair[1], P.hair[2], 178, 46, 18, 8, 0.25)(x, y); return (Math.floor(x * 0.6 - y * 0.8) % 4 === 0) ? mixc(s, P.hair[2], 0.4) : s; }, { mat: 1 });
  R.poly([[155, 70], [156, 60], [161, 58], [160, 72]], mixc(P.hair[0], P.skin[1], 0.5)); // fade over the ear
  // near arm: big shoulder, biceps, forearm to the keyboard
  R.capsule(192, 140, 222, 143.5, [12, 10], C("1a1622"));
  R.capsule(178, 108, 192, 140, [12.5, 10.5], shade(P.skin[0], P.skin[1], P.skin[2], 186, 122, 12, 18));
  R.ellipse(189, 122, 9.5, 12, shade(P.skin[0], P.skin[1], P.skin[2], 188, 118, 9, 12, 0.15)); // biceps
  R.ellipse(177, 104, 15, 11.5, shade(P.shirt[0], P.shirt[1], P.shirt[2], 177, 100, 15, 12, 0.1), { mat: 3 }); // sleeve over the delt
  R.rect(166, 114.5, 192, 116, P.shirt[0], { a: 0.6 });
  const tap = f % 2 ? 0.8 : 0;
  R.capsule(192, 140, 222, 143.5, [10.5, 8.5], shade(P.skin[0], P.skin[1], P.skin[2], 207, 140, 20, 9));
  R.capsule(222, 143.5, 250, 146 - tap, [8.5, 6.5], shade(P.skin[0], P.skin[1], P.skin[2], 236, 143, 18, 8));
  R.ellipse(254, 146 - tap, 7, 4.8, shade(P.skin[0], P.skin[1], P.skin[2], 254, 145, 7, 5));
  return R;
}

// ---------------------------------------------------------------- overlays: real text on the screens
const COL = { kw: "#ff7ab6", ty: "#7fd6ff", fn: "#ffd479", cm: "#7a7f9e", tx: "#d6d3e8", num: "#50567a", str: "#a8e6a3" };
const KW = new Set(["use", "fn", "let", "for", "in", "mut", "pub", "struct", "impl", "if"]);
const TY = new Set(["World", "Peers", "Input", "Unreliable", "Player", "Entity", "Snapshot"]);
function codeLine(g, c, r, s, maxc) {
  const toks = s.match(/\/\/.*|[A-Za-z_][A-Za-z0-9_]*|\s+|./g) || [];
  let x = c;
  for (let i = 0; i < toks.length; i++) {
    const tk = toks[i];
    let col = COL.tx;
    if (tk.startsWith("//")) col = COL.cm;
    else if (KW.has(tk)) col = COL.kw;
    else if (TY.has(tk)) col = COL.ty;
    else if (/^[a-z_]\w*$/.test(tk) && toks[i + 1] === "(") col = COL.fn;
    for (const ch of tk) { if (x < c + maxc && ch !== " ") g.put(x, r, ch, hexrgb(col)); x++; }
  }
}

const CODE = [
  "use engine::{ecs, net};",
  "",
  "// the server is the truth",
  "fn replicate(w: &World,",
  "             peers: &mut Peers) {",
  "  for e in w.changed() {",
  "    let snap = w.snapshot(e);",
  "    peers.send(snap, Unreliable);",
  "  }",
  "}",
  "",
  "fn predict(p: &mut Player,",
];
const TYPED = "            input: &Input) {";

/** hand placed glyphs for features too small to survive the downsample */
function stamps(g, f) {
  const st = (x, y, ch, hex) => { const [c, r] = cellOf(x, y); g.put(c, r, ch, hexrgb(hex)); };
  st(180, 62.5, "-", "#24161a"); st(182, 62.5, f === 17 ? "-" : "o", f === 17 ? "#24161a" : "#3a2a30"); // eye
  st(178, 58.5, "~", "#a8781e"); st(181, 58.5, "~", "#a8781e");                                           // brow
  st(162, 66, ")", "#8a5236");                                                                            // ear
  st(184, 80.5, "-", "#6a2a22");                                                                          // mouth
  st(190, 67, ">", "#e8a882");                                                                            // nose tip
}

export function overlay(g, f) {
  stamps(g, f);
  // monitor 1: editor
  const c0 = MON[0].c0, r0 = MON[0].r0, W = MW, H = MH;
  g.clear(c0, r0, c0 + W - 1, r0 + H - 1);
  const tabs = [[" net.rs ", "#ffffff", true], [" ecs.rs ", "#7a7f9e"], [" world.rs", "#7a7f9e"]];
  let x = c0;
  for (const [s, col, act] of tabs) { g.text(x, r0, s, hexrgb(col)); if (act) g.put(x + s.length - 1, r0, "*", hexrgb("#ff7ab6")); x += s.length; }
  CODE.forEach((s, i) => {
    const r = r0 + 1 + i;
    g.text(c0, r, String(i + 1).padStart(2), hexrgb(COL.num));
    codeLine(g, c0 + 3, r, s, W - 3);
  });
  const n = Math.min(TYPED.length, Math.max(0, Math.round(((f - 2) / 14) * TYPED.length)));
  const rT = r0 + 1 + CODE.length;
  g.text(c0, rT, String(CODE.length + 1).padStart(2), hexrgb(COL.num));
  codeLine(g, c0 + 3, rT, TYPED.slice(0, n), W - 3);
  if (f % 4 < 2 || n < TYPED.length) g.put(c0 + 3 + n, rT, "▌", hexrgb("#ffd479"));
  g.text(c0, r0 + H - 1, " rust   main   0 errors   Ln 13", hexrgb("#9aa0c8"));

  // monitor 2: engine viewport with a grid floor and a spinning cube
  const d0 = MON[1].c0;
  g.clear(d0, r0, d0 + W - 1, r0 + H - 1);
  g.text(d0, r0, " viewport", hexrgb("#ffffff")); g.text(d0 + 10, r0, "       wgpu · vulkan   144 fps", hexrgb("#7a7f9e"));
  const hz = r0 + 9; // horizon
  g.clipR = [d0, r0 + 1, d0 + W - 1, r0 + H - 2];
  for (const rr of [hz + 1, hz + 3, hz + 7]) for (let cc = d0; cc < d0 + W; cc++) g.put(cc, rr, "-", hexrgb(rr === hz + 7 ? "#2f6b8f" : "#244e6a"));
  for (let k = -4; k <= 4; k++) g.line(d0 + 21 + k * 1.4, hz + 1, d0 + 21 + k * 7.5, hz + 7, hexrgb("#2f6b8f"));
  // cube
  const a = (f / NF) * (Math.PI / 2) + 0.4, tilt = 0.45, S = 1.75;
  const V = [];
  for (const X of [-1, 1]) for (const Y of [-1, 1]) for (const Z of [-1, 1]) {
    const x1 = X * Math.cos(a) - Z * Math.sin(a), z1 = X * Math.sin(a) + Z * Math.cos(a);
    const y1 = Y * Math.cos(tilt) - z1 * Math.sin(tilt), z2 = Y * Math.sin(tilt) + z1 * Math.cos(tilt);
    const p = 3.2 / (z2 + 4.4);
    V.push([d0 + 21 + x1 * S * 2.5 * p * 1.6, hz - 2 + y1 * S * p * 1.7, z2]);
  }
  const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const ez = (e) => V[e[0]][2] + V[e[1]][2];
  for (const e of [...E].sort((p, q) => ez(q) - ez(p))) {
    const back = ez(e) > 0.4;
    g.line(V[e[0]][0], V[e[0]][1], V[e[1]][0], V[e[1]][1], hexrgb(back ? "#3d7fb0" : "#8fe3ff"));
  }
  for (const v of V) g.put(v[0], v[1], v[2] > 0.2 ? "." : "o", hexrgb(v[2] > 0.2 ? "#3d7fb0" : "#ff9ec4"));
  g.clipR = null;
  const rtt = [31, 30, 32, 31, 29, 31, 33, 31][f % 8];
  g.text(d0, r0 + H - 1, ` entities 12,408   tick 60 Hz   rtt ${rtt} ms`, hexrgb("#9aa0c8"));

  // bezels with clean box lines
  for (const bx of MON.map((m) => m.c0 - 1)) {
    const dim = hexrgb("#4a4a66");
    g.box(bx, r0 - 1, bx + W + 1, r0 + H, dim, { h: "─", v: "│", k: "+" });
    g.put(bx, r0 - 1, "╭", dim); g.put(bx + W + 1, r0 - 1, "╮", dim); g.put(bx, r0 + H, "╰", dim); g.put(bx + W + 1, r0 + H, "╯", dim);
  }
  return g;
}

export function sceneFrames() {
  const out = [];
  for (let f = 0; f < NF; f++) out.push(overlay(toGrid(paint(f)), f));
  return out;
}
