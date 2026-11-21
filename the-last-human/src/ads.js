// Original holographic advertisement artwork for Neo-Eden, drawn on 2D canvases.
// No real brands. E.V.E. is represented only by an abstract eye glyph.
import * as THREE from "three";
import { rng } from "./util.js";

function canvasTex(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d"); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}
const glowText = (g, txt, x, y, font, col, blur = 30) => {
  g.font = font; g.textAlign = "center"; g.textBaseline = "middle";
  g.shadowColor = col; g.shadowBlur = blur; g.fillStyle = col; g.fillText(txt, x, y);
  g.shadowBlur = 0; g.fillStyle = "#ffffff"; g.globalAlpha = 0.85; g.fillText(txt, x, y); g.globalAlpha = 1;
};
const frame = (g, w, h, col) => {
  g.strokeStyle = col; g.lineWidth = 6; g.shadowColor = col; g.shadowBlur = 20; g.strokeRect(14, 14, w - 28, h - 28); g.shadowBlur = 0;
};
export function eveGlyph(g, cx, cy, r, col) {
  g.save(); g.shadowColor = col; g.shadowBlur = 40; g.strokeStyle = col; g.lineWidth = r * 0.07;
  g.beginPath(); g.moveTo(cx - r * 1.6, cy); g.quadraticCurveTo(cx, cy - r * 1.25, cx + r * 1.6, cy); g.quadraticCurveTo(cx, cy + r * 1.25, cx - r * 1.6, cy); g.stroke();
  g.beginPath(); g.arc(cx, cy, r * 0.55, 0, Math.PI * 2); g.stroke();
  g.fillStyle = "#ffffff"; g.beginPath(); g.arc(cx, cy, r * 0.2, 0, Math.PI * 2); g.fill();
  g.restore();
}

export function makeAdTextures() {
  const R = rng(77);
  const T = {};
  T.eve = canvasTex(512, 860, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#03131f"); gr.addColorStop(1, "#0a0630"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 14; i++) { g.strokeStyle = `rgba(60,220,255,${0.05 + i * 0.012})`; g.lineWidth = 2; g.beginPath(); g.arc(w / 2, 330, 40 + i * 16, 0, Math.PI * 2); g.stroke(); }
    eveGlyph(g, w / 2, 330, 120, "#39e6ff");
    glowText(g, "E.V.E.", w / 2, 600, "900 96px Orbitron", "#39e6ff", 40);
    glowText(g, "ALWAYS WITH YOU", w / 2, 690, "700 40px Rajdhani", "#9b7bff", 18);
    frame(g, w, h, "#39e6ff");
  });
  T.onecity = canvasTex(512, 768, (g, w, h) => {
    g.fillStyle = "#0c0424"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9; i++) for (let j = 0; j < 5; j++) { // rows of identical silhouettes
      const x = 60 + j * 98, y = 120 + i * 40; g.fillStyle = `rgba(150,110,255,${0.15 + 0.06 * i})`;
      g.beginPath(); g.arc(x, y - 14, 9, 0, 7); g.fill(); g.fillRect(x - 10, y - 4, 20, 22);
    }
    glowText(g, "ONE CITY", w / 2, 540, "900 70px Orbitron", "#a07bff", 36);
    glowText(g, "ONE MIND", w / 2, 625, "900 70px Orbitron", "#39e6ff", 36);
    frame(g, w, h, "#a07bff");
  });
  T.link9 = canvasTex(1024, 576, (g, w, h) => {
    g.fillStyle = "#020c18"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#39e6ff"; g.lineWidth = 4; g.shadowColor = "#39e6ff"; g.shadowBlur = 20; g.beginPath();
    for (let x = 0; x < w; x += 4) { const y = 380 + Math.sin(x * 0.03) * 40 * Math.sin(x * 0.004) + Math.sin(x * 0.11) * 10; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); g.shadowBlur = 0;
    glowText(g, "LINK-9", w / 2, 170, "900 150px Orbitron", "#39e6ff", 40);
    glowText(g, "STAY CONNECTED  ·  UPGRADE TODAY", w / 2, 490, "600 48px Rajdhani", "#ffffff", 14);
    frame(g, w, h, "#39e6ff");
  });
  T.serenity = canvasTex(512, 800, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#1a0838"); gr.addColorStop(1, "#05102a"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 7; k++) { g.strokeStyle = `rgba(${120 + k * 15},${90 + k * 20},255,0.6)`; g.lineWidth = 3; g.beginPath(); for (let x = 0; x <= w; x += 6) { const y = 260 + k * 34 + Math.sin(x * 0.02 + k) * 22; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
    glowText(g, "SERENITY", w / 2, 610, "900 64px Orbitron", "#b48bff", 34);
    glowText(g, "NO THOUGHT UNSHARED", w / 2, 690, "600 38px Rajdhani", "#7fefff", 14);
    frame(g, w, h, "#b48bff");
  });
  T.unity = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = "rgba(0,0,0,0)"; g.clearRect(0, 0, w, h);
    eveGlyph(g, w / 2, 220, 110, "#39e6ff");
    glowText(g, "SYNC", w / 2, 420, "900 90px Orbitron", "#39e6ff", 30);
  });
  T.nosignal = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = "#050505"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 3000; i++) { const v = Math.floor(R() * 255); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(R() * w, R() * h, 3, 2); }
    g.fillStyle = "rgba(0,0,0,0.55)"; g.fillRect(0, h / 2 - 60, w, 120);
    glowText(g, "NO SIGNAL", w / 2, h / 2, "900 72px Orbitron", "#ff2a44", 30);
  });
  const bladeCols = ["#39e6ff", "#a07bff", "#4f7dff", "#ff2a55", "#39e6ff", "#b48bff"];
  T.blade = (word, i) => canvasTex(128, 600, (g, w, h) => {
    const col = bladeCols[i % bladeCols.length];
    g.fillStyle = "#04040c"; g.fillRect(0, 0, w, h);
    g.strokeStyle = col; g.lineWidth = 5; g.shadowColor = col; g.shadowBlur = 16; g.strokeRect(8, 8, w - 16, h - 16); g.shadowBlur = 0;
    const letters = word.replace(" ", "").split("");
    const step = Math.min(90, (h - 60) / letters.length);
    letters.forEach((L, k) => glowText(g, L, w / 2, 40 + step * (k + 0.5) + (h - 60 - step * letters.length) / 2, `900 ${Math.floor(step * 0.8)}px Orbitron`, col, 22));
  });
  return T;
}
