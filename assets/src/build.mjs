// Build the whole profile card as one animated ASCII SVG: node assets/src/build.mjs [--out path]
// Writes assets/profile.svg by default. Plain Node, no dependencies.
import { writeFileSync } from "node:fs";
import { Doc } from "./svg.mjs";
import { sceneFrames, MON, MW, MH, SW, SH, rng } from "./scene.mjs";
import { neonTitle, branch, netFrames, mobileFrames, engineFrames, ICONS, iconGrid, textGrid } from "./parts.mjs";

const W = 1040;
const ART = { cw: 4.2, rh: 7.7, size: 7 };        // the room
const DIA = { cw: 5.7, rh: 10.5, size: 9.5 };        // topic diagrams
const BODY = { cw: 8.4, rh: 22, size: 14 };       // readable text
const HEAD = { cw: 10.2, rh: 26, size: 17 };
const SMALL = { cw: 7.8, rh: 19, size: 13 };
const C = { text: "#e4dcf0", dim: "#9a90b4", mute: "#6c6488", pink: "#ff7ab6", gold: "#fff3a6", cyan: "#7fd6ff", green: "#a8e6a3", violet: "#c29bff" };

let y = 0;
const parts = []; // deferred so the height is known before the svg starts
const doc = new Doc(W, 10);

// ---- header: corner branches, neon name, subtitle

const T = neonTitle("EMİRHAN ÜNAL");
const TT = { cw: 6.6, rh: 12, size: 11 };
const tx = (W - T.cols * TT.cw) / 2, ty = 40;
doc.layer({ x: tx, y: ty, ...TT, grid: T.shade, cls: "tsh" });
doc.layer({ x: tx, y: ty, ...TT, grid: T.core, cls: "neon", attr: 'filter="url(#glow)"' });
doc.layer({ x: tx, y: ty, ...TT, grid: T.uCore, cls: "neon2", attr: 'filter="url(#glow)"' });
doc.defs.push(`<filter id="glow" x="-10%" y="-40%" width="120%" height="180%"><feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="a"/><feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="a"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`);
doc.css.push(
  `@keyframes neon{0%,17%,19.5%,23%,61%,63.5%,100%{opacity:1}18%{opacity:.25}22%{opacity:.45}62%{opacity:.3}}`,
  `@keyframes neon2{0%,40%,47%,100%{opacity:1}41%{opacity:.2}42%{opacity:.9}43%,45%{opacity:.15}46%{opacity:.7}}`,
  `.neon{animation:neon 6s infinite}.neon2{animation:neon2 4.3s infinite}`,
  `@keyframes blink{0%,49%{opacity:1}50%,100%{opacity:0}}.cur{animation:blink 1.1s step-end infinite}`,
);
y = ty + T.rows * TT.rh + 14;
const sub = [["game developer", C.text], ["  ·  ", C.pink], ["multiplayer", C.text], ["  ·  ", C.pink], ["mobile", C.text], ["  ·  ", C.pink], ["building a game engine in Rust", C.text]];
const subLen = sub.reduce((n, s) => n + [...s[0]].length, 0);
doc.layer({ x: (W - subLen * 9) / 2, y, cw: 9, rh: 24, size: 15, grid: textGrid([sub], subLen) });
doc.raw(`<text class="cur s15 k_cur" x="${((W + subLen * 9) / 2 + 4).toFixed(1)}" y="${(y + 19).toFixed(1)}">▌</text>`);
y += 44;

// ---- the room
const sx = (W - (SW / 2) * ART.cw) / 2, sy = y;
for (const m of MON) doc.raw(`<rect x="${sx + m.c0 * ART.cw}" y="${sy + m.r0 * ART.rh}" width="${MW * ART.cw}" height="${MH * ART.rh}" fill="#08111f"/>`);
doc.layer({ x: sx, y: sy, ...ART, frames: sceneFrames(), dt: 0.15 });
y = sy + (SH / 4) * ART.rh + 6;
const cap = "// 02:14 · one more build · the cat approves";
doc.layer({ x: W - 40 - cap.length * 7.8, y, ...SMALL, grid: textGrid([[[cap, C.mute]]], cap.length), cls: "r" });
y += 52;

// ---- topic sections
function section({ frames, artCols = 80, artRows = 20, artLeft, head, lines, accent }) {
  const artW = artCols * DIA.cw, textX = artLeft ? 40 + artW + 30 : 40, artX = artLeft ? 30 : W - 30 - artW;
  doc.layer({ x: artX, y, ...DIA, frames, dt: 0.15 });
  let ly = y + 6;
  doc.layer({ x: textX, y: ly, ...HEAD, grid: textGrid([head.map(([s, c]) => [s, c ?? accent])], 60), cls: "b" });
  ly += HEAD.rh + 8;
  doc.layer({ x: textX, y: ly, ...BODY, grid: textGrid(lines, 64), cls: "r" });
  y += Math.max(artRows * DIA.rh, ly - y + lines.length * BODY.rh) + 46;
}
section({
  frames: netFrames(), artLeft: true, accent: C.pink,
  head: [["01  ", C.mute], ["MULTIPLAYER & NETCODE"]],
  lines: [
    [["Online games are where I feel most at home.", C.text]],
    [["Server-authoritative state, client prediction and", C.dim]],
    [["reconciliation, lag compensation, interpolation.", C.dim]],
    [["Built with ", C.dim], ["Photon Fusion", C.pink], [", ", C.dim], ["Netcode for GameObjects", C.pink], [",", C.dim]],
    [["FishNet", C.pink], [" and ", C.dim], ["Steam P2P", C.pink], [", backends on ", C.dim], ["AWS", C.pink], [",", C.dim]],
    [["voice chat with ", C.dim], ["Dissonance", C.pink], [".", C.dim]],
  ],
});
section({
  frames: mobileFrames(), artLeft: false, accent: C.green,
  head: [["02  ", C.mute], ["MOBILE GAMES"]],
  lines: [
    [["Royal Block", C.green], [": a block puzzle for Android.", C.text]],
    [["Slide & Smash", C.green], [": drag, aim, release, and break", C.text]],
    [["everything on the table. Physics puzzles, eight", C.dim]],
    [["boards and a wedding-table boss.", C.dim]],
    [["Unity 6", C.green], [", IL2CPP/ARM64, ", C.dim], ["LevelPlay", C.green], [" ads, EN/TR.", C.dim]],
  ],
});
section({
  frames: engineFrames(), artLeft: true, accent: C.cyan,
  head: [["03  ", C.mute], ["GAME ENGINE", C.cyan], ["  · building now", C.gold]],
  lines: [
    [["An open source game engine in ", C.text], ["Rust", C.cyan], [".", C.text]],
    [["bevy_ecs", C.cyan], [", ", C.dim], ["wgpu", C.cyan], [" and ", C.dim], ["WGSL", C.cyan], [". Multiplayer-first: server-", C.dim]],
    [["authoritative replication, prediction, lag", C.dim]],
    [["compensation, dedicated servers.", C.dim]],
    [["16 km+ worlds", C.cyan], [" with streaming, terrain and weather.", C.dim]],
    [["An open-world survival game and an MMO RPG", C.dim]],
    [["grow on top of it. Made in Türkiye.", C.dim]],
  ],
});

// ---- also: four small cards
y -= 6;
doc.layer({ x: 40, y, ...HEAD, grid: textGrid([[["04  ", C.mute], ["ALSO", C.gold]]], 20), cls: "b" });
y += 40;
const cards = [
  ["taterup", "TaterUp", "my own game,", "out on Steam", C.gold],
  ["vr", "VR @ TÜSEB", "clinical sims", "on Meta Quest", C.cyan],
  ["club", "Game dev club", "200+ devs,", "ESOGÜ, Eskişehir", C.pink],
  ["teach", "Teaching", "100+ students", "first games shipped", C.green],
];
const cw = (W - 80 - 3 * 20) / 4;
cards.forEach(([icon, t1, t2, t3, col], i) => {
  const x = 40 + i * (cw + 20);
  doc.raw(`<rect x="${x}" y="${y}" width="${cw}" height="150" rx="10" fill="#140f22" stroke="#2a2142"/>`);
  doc.layer({ x: x + (cw - 13 * 6.6) / 2, y: y + 10, cw: 6.6, rh: 11.5, size: 11, grid: iconGrid(ICONS[icon]) });
  doc.layer({ x: x + 16, y: y + 70, ...BODY, grid: textGrid([[[t1, col]]], 24), cls: "b" });
  doc.layer({ x: x + 16, y: y + 96, ...SMALL, grid: textGrid([[[t2, C.dim]], [[t3, C.dim]]], 26), cls: "r" });
});
y += 150 + 34;

// ---- toolbox
const tools = ["Unity", "C#", "Unreal", "C++", "Rust", "wgpu", "Photon Fusion", "NGO", "FishNet", "Steamworks", "AWS", "Meta Quest", "Blender"];
const segs = [];
tools.forEach((t, i) => { if (i) segs.push(["  ", C.mute]); segs.push([t, i % 2 ? C.dim : C.text]); });
const tlen = segs.reduce((n, s) => n + s[0].length, 0);
doc.layer({ x: (W - tlen * SMALL.cw) / 2, y, ...SMALL, grid: textGrid([segs], tlen), cls: "r" });
y += 40;
const foot = "links below  ↓";
doc.layer({ x: (W - foot.length * SMALL.cw) / 2, y, ...SMALL, grid: textGrid([[[foot, C.mute]]], foot.length), cls: "r" });
y += 40;
const HGT = Math.ceil(y);

// ---- falling petals over everything
const pr = rng(99);
const petals = [];
for (let i = 0; i < 46; i++) {
  const x = pr() * W, dur = 16 + pr() * 18, delay = -pr() * dur, sway = 3 + pr() * 3, size = 9 + Math.round(pr() * 7);
  const ch = pr() < 0.22 ? "✿" : pr() < 0.6 ? "*" : "❀";
  const col = ["#ffb3cc", "#f58fb2", "#ffd6e4", "#e06e9a"][Math.floor(pr() * 4)];
  petals.push(`<g class="pf" style="animation-duration:${dur.toFixed(1)}s;animation-delay:${delay.toFixed(1)}s"><text class="ps" x="${x.toFixed(0)}" y="-12" style="font-size:${size}px;fill:${col};animation-duration:${sway.toFixed(1)}s">${ch}</text></g>`);
}
doc.css.push(
  `@keyframes fall{from{transform:translate(0,0)}to{transform:translate(-140px,${HGT + 40}px)}}`,
  `@keyframes sway{from{transform:translateX(-12px) rotate(-25deg)}to{transform:translateX(12px) rotate(25deg)}}`,
  `.pf{animation:fall linear infinite}.ps{opacity:.85;transform-box:fill-box;transform-origin:center;animation:sway ease-in-out infinite alternate}`,
  `.k_cur{fill:${C.pink}}.s15{font-size:15px}`,
);
doc.raw(petals.join(""));

// ---- frame
doc.h = HGT;
doc.parts.unshift(`<rect width="${W}" height="${HGT}" rx="14" fill="#0e0a17"/>`);
doc.raw(`<rect x=".5" y=".5" width="${W - 1}" height="${HGT - 1}" rx="14" fill="none" stroke="#2a2142"/>`);

const out = process.argv.includes("--out") ? process.argv[process.argv.indexOf("--out") + 1] : new URL("../profile.svg", import.meta.url);
const svg = doc.toString("Emirhan Ünal · game developer", "ASCII art profile card. A glowing neon sign reads EMİRHAN ÜNAL. Below, a blond, broad-shouldered developer sits at two monitors at night with a white cat on his lap and cherry blossoms outside the window. Then three animated panels: multiplayer netcode, mobile games, and the Rust game engine he is building, plus cards for TaterUp on Steam, VR at TÜSEB, a 200+ member game dev club and teaching 100+ students.");
writeFileSync(out, svg);
console.log(String(out).replace("file:///", ""), (svg.length / 1024).toFixed(0) + " KB", doc.cls.size, "colors", HGT + "px tall");
