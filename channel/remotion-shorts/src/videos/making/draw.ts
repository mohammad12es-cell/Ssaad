// Pip & Pebble drawn with the skill's Pen API (toon.ts): plum ink, flat fills, a painted shade crescent.
// Body cards use the 600 x 1000 design canvas with soles at y = 975 (same contract as cast.ts BODY geometry).
import { Pen, INK } from "../bridge/toon";

type P2 = [number, number];
const ell = (cx: number, cy: number, rx: number, ry: number, n = 72): P2[] =>
  Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)] as P2; });
const shaded = (p: Pen, pts: P2[], base: string, dark: string, R: number, ol = 12) => {
  p.shadedFill(pts, base, dark, Math.PI * 1.2, R);
  p.poly(pts, null, ol);
};

export type PipPose = { expr?: "smile" | "laugh" | "shock" | "blink" | "grin"; hop?: number; lean?: number; wave?: number };
const GREEN = "#62c95f", GREEN_D = "#3f9a48", BELLY = "#d6f2b0";

/** Pip the frog, 600 x 1000 design canvas, soles at y = 975 */
export const drawPip = (p: Pen, o: PipPose = {}) => {
  const e = o.expr ?? "smile", lean = o.lean ?? 0;
  p.rot = lean ? [lean, 300, 975] : null;
  // feet
  for (const x of [175, 425]) p.ell(x, 958, 78, 24, GREEN_D, 10);
  // waving arm
  if (o.wave !== undefined) {
    const a = -1.2 + 0.5 * Math.sin(o.wave);
    p.line([[470, 760], [470 + 120 * Math.cos(a), 760 + 120 * Math.sin(a)]], GREEN, 34);
  }
  shaded(p, ell(300, 765, 250, 205), GREEN, GREEN_D, 250);
  p.ell(300, 845, 165, 95, BELLY, 0);
  // eyes on top
  for (const x of [182, 418]) {
    shaded(p, ell(x, 575, 98, 92), GREEN, GREEN_D, 98);
    if (e === "blink") p.arc(x, 585, 52, 26, 10, 170, 14);
    else {
      const big = e === "shock" ? 1.12 : 1;
      p.ell(x, 580, 72 * big, 70 * big, "#ffffff", 9);
      p.dot(x + 6, 590, e === "shock" ? 22 : 32);
    }
  }
  // mouth
  if (e === "laugh") p.poly([...ell(300, 770, 95, 70, 36).filter(([, y]) => y >= 770)], "#7b2b3a", 10);
  else if (e === "shock") p.ell(300, 790, 34, 44, "#7b2b3a", 10);
  else if (e === "grin") p.arc(300, 735, 125, 90, 25, 155, 15);
  else p.arc(300, 740, 105, 70, 25, 155, 14);
  p.rot = null;
};

/** Pebble the snail, 600 x 1000 canvas, foot on y = 975, head to the right */
export const drawPebble = (p: Pen, o: { shades?: boolean; nod?: number } = {}) => {
  const YEL = "#ffd166", YEL_D = "#e0a73c", nod = o.nod ?? 0;
  // foot + neck
  const foot: P2[] = [[40, 975], [40, 925], [90, 900], [500, 900], [560, 930], [560, 975]];
  p.shadedFill(foot, YEL, YEL_D, Math.PI * 1.3, 300); p.poly(foot, null, 12);
  const neck: P2[] = [[455, 935], [455, 735], [480, 700 + nod], [535, 700 + nod], [560, 735], [560, 935]];
  p.shadedFill(neck, YEL, YEL_D, Math.PI * 1.3, 120); p.poly(neck, null, 12);
  // eye stalks + eyes
  for (const [bx, tx] of [[485, 450], [530, 565]]) {
    p.line([[bx, 712 + nod], [tx, 575 + nod]], YEL, 22);
    p.ell(tx, 560 + nod, 36, 36, "#ffffff", 8); p.dot(tx + 8, 563 + nod, 15);
  }
  if (o.shades) {
    for (const tx of [450, 565]) p.poly([[tx - 46, 540 + nod], [tx + 46, 540 + nod], [tx + 40, 585 + nod], [tx - 40, 585 + nod]], "#141218", 6);
    p.stroke([[496, 552 + nod], [519, 552 + nod]], 10, "#141218");
  }
  p.arc(512, 800 + nod * 0.5, 26, 18, 20, 160, 9);
  // shell with spiral
  shaded(p, ell(250, 755, 195, 185), "#ff7b6b", "#c9505a", 195);
  const sp: P2[] = [];
  for (let i = 0; i <= 140; i++) { const a = i * 0.12, r = 160 - i * 1.08; sp.push([250 + r * Math.cos(a), 755 + r * Math.sin(a)]); }
  p.stroke(sp, 12, "#a83c4c");
};

// ---------- effect cards (unlit) ----------
export const codePanel = (p: Pen, lines: string[], w = 700, h = 420) => {
  const g = p.g;
  p.poly([[10, 10], [w - 10, 10], [w - 10, h - 10], [10, h - 10]], "#1d2033", 10);
  for (const [i, c] of ["#ff6b6b", "#ffd166", "#7ed957"].entries()) p.dot(50 + i * 40, 45, 12, c);
  g.font = "bold 40px monospace";
  const cols = ["#7ed957", "#ffd166", "#8ec5ff", "#ff9bd2", "#ffffff"];
  lines.forEach((l, i) => { g.fillStyle = cols[i % cols.length]; g.fillText(l, 40, 120 + i * 62); });
};
export const disc = (p: Pen, kind: "body" | "eye" | "smile") => {
  if (kind === "body") { shaded(p, ell(250, 220, 230, 190), GREEN, GREEN_D, 230); p.ell(250, 290, 150, 85, BELLY, 0); }
  else if (kind === "eye") { shaded(p, ell(120, 120, 100, 95), GREEN, GREEN_D, 100); p.ell(120, 125, 74, 72, "#ffffff", 9); p.dot(126, 134, 32); }
  else p.arc(150, 40, 120, 80, 25, 155, 16);
};
export const bubble = (p: Pen, text: string) => {
  const g = p.g;
  p.ell(300, 170, 270, 140, "#ffffff", 12);
  p.poly([[160, 270], [110, 380], [250, 290]], "#ffffff", 0);
  p.stroke([[160, 280], [110, 380], [240, 300]], 12);
  g.font = "bold 120px sans-serif"; g.fillStyle = INK; g.textAlign = "center"; g.fillText(text, 300, 215); g.textAlign = "start";
};
export const filmFrame = (p: Pen, k: number) => {
  p.poly([[0, 0], [400, 0], [400, 300], [0, 300]], "#1b1b22", 0);
  for (let i = 0; i < 6; i++) { p.poly([[14 + i * 66, 10], [44 + i * 66, 10], [44 + i * 66, 34], [14 + i * 66, 34]], "#f3efe6", 0); p.poly([[14 + i * 66, 266], [44 + i * 66, 266], [44 + i * 66, 290], [14 + i * 66, 290]], "#f3efe6", 0); }
  p.poly([[30, 50], [370, 50], [370, 250], [30, 250]], "#bfe3ff", 0);
  const g = p.g; g.save(); g.translate(200 - 60 + (k % 3) * 20, 70); g.scale(0.2, 0.2); drawPip(new Pen(g), { expr: k % 2 ? "grin" : "smile", lean: (k % 3 - 1) * 0.15 }); g.restore();
};
export const counter = (p: Pen, text: string) => {
  const g = p.g;
  p.poly([[10, 10], [690, 10], [690, 230], [10, 230]], "#ff3b4a", 12);
  p.poly([[50, 60], [50, 180], [150, 120]], "#ffffff", 0);
  g.font = "bold 110px sans-serif"; g.fillStyle = "#ffffff"; g.fillText(text, 190, 160);
};
export const flash = (p: Pen) => {
  const g = p.g, gr = g.createRadialGradient(256, 256, 0, 256, 256, 256);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.35, "rgba(255,250,220,0.8)"); gr.addColorStop(1, "rgba(255,240,200,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
};

/** an open flipbook (700 x 500): page k shows Pip mid-hop; curl = how far the next page is turning (0..1) */
export const flipbook = (p: Pen, k: number, curl: number) => {
  p.poly([[20, 60], [680, 60], [680, 480], [20, 480]], "#e2453c", 12);
  p.poly([[50, 40], [650, 40], [650, 455], [50, 455]], "#fbf6ea", 10);
  for (let i = 1; i < 5; i++) p.stroke([[50 + i * 2, 455 + i * 3], [650 - i * 2, 455 + i * 3]], 3, "#c9bfae");
  const g = p.g; g.save(); g.translate(240 + k * 22, 40 + Math.abs(Math.sin(k)) * -25 + 30); g.scale(0.38, 0.38);
  drawPip(new Pen(g), { expr: k % 2 ? "grin" : "smile", lean: (k % 3 - 1) * 0.12 }); g.restore();
  if (curl > 0) { const x = 650 - curl * 600; p.poly([[x, 40], [650, 40], [650, 455], [x + 40 * (1 - curl), 455]], "#f3ecdc", 8); }
  g.font = "bold 34px sans-serif"; g.fillStyle = "#9a8f7c"; g.fillText(String(k + 1), 600, 440);
};
