// Procedural canvas textures: painterly brushwork, facades, neon, skin, irises, holo UI.
// Everything is generated from seeds so the look is identical in every episode.
import * as THREE from "three";
import { rng } from "../utils/math";

const cache = new Map<string, THREE.Texture>();
export const canvas = (w: number, h: number) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
export function tex(c: HTMLCanvasElement, srgb = true, repeat = false) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}
const memo = (key: string, f: () => THREE.Texture) => { if (!cache.has(key)) cache.set(key, f()); return cache.get(key)!; };

/** Brush strokes over a base colour: gives surfaces the hand-painted look. */
export function painted(key: string, base: string, strokes: string[], o: { size?: number; n?: number; len?: number; alpha?: number; seed?: number } = {}) {
  return memo("p:" + key, () => {
    const S = o.size ?? 512, c = canvas(S, S), g = c.getContext("2d")!, R = rng(o.seed ?? 11);
    g.fillStyle = base; g.fillRect(0, 0, S, S);
    const n = o.n ?? 900, L = o.len ?? 40;
    for (let i = 0; i < n; i++) {
      const x = R() * S, y = R() * S, a = R() * Math.PI, l = L * (0.4 + R());
      g.strokeStyle = strokes[i % strokes.length]; g.globalAlpha = (o.alpha ?? 0.12) * (0.4 + R());
      g.lineWidth = 2 + R() * 7; g.lineCap = "round"; g.beginPath();
      g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + (R() - 0.5) * 8, y + Math.sin(a) * l * 0.5 + (R() - 0.5) * 8, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
      // wrap so the tile is seamless
      for (const [dx, dy] of [[S, 0], [-S, 0], [0, S], [0, -S]]) { g.beginPath(); g.moveTo(x + dx, y + dy); g.lineTo(x + dx + Math.cos(a) * l, y + dy + Math.sin(a) * l); g.stroke(); }
    }
    g.globalAlpha = 1;
    return tex(c, true, true);
  });
}

/** Skyscraper facade emissive window grid. */
export function facade(seed: number, palette = ["#ffe6c8", "#cfe6ff", "#ffffff", "#9fd8ff", "#b58cff", "#ff4f8b", "#7fe9ff"]) {
  return memo("f:" + seed, () => {
    const W = 512, H = 1024, c = canvas(W, H), g = c.getContext("2d")!, R = rng(seed);
    g.fillStyle = "#020205"; g.fillRect(0, 0, W, H);
    const cols = 18 + Math.floor(R() * 14), rows = 60 + Math.floor(R() * 40), cw = W / cols, rh = H / rows;
    const density = 0.08 + R() * 0.16;
    for (let y = 0; y < rows; y++) {
      const floorLit = R() < 0.15; // whole lit floors read as horizontal bands
      for (let x = 0; x < cols; x++) {
        const on = R() < (floorLit ? 0.75 : density);
        if (!on) continue;
        const col = palette[Math.floor(R() ** 3 * palette.length)];
        g.fillStyle = col; g.globalAlpha = 0.25 + R() * 0.6; g.fillRect(x * cw + cw * 0.18, y * rh + rh * 0.2, cw * 0.64, rh * 0.55);
      }
    }
    g.globalAlpha = 1;
    for (let k = 0; k < 2; k++) if (R() < 0.6) { g.fillStyle = ["#38e8ff", "#ff3fa8", "#8a5cff"][Math.floor(R() * 3)]; g.globalAlpha = 0.9; g.fillRect(0, Math.floor(R() * rows) * rh, W, 2); }
    g.fillStyle = "#000"; g.globalAlpha = 0.5; for (let x = 0; x < W; x += Math.floor(W / (2 + R() * 4))) g.fillRect(x, 0, 3, H); // structural mullions
    g.globalAlpha = 1;
    const t = tex(c, true, true); t.magFilter = THREE.LinearFilter; return t;
  });
}

/** Neon sign text with a glow halo (used as emissive map). */
export function neon(text: string, color: string, o: { w?: number; h?: number; font?: string; vertical?: boolean; frame?: boolean } = {}) {
  return memo("n:" + text + color + (o.vertical ? "v" : "") + (o.w ?? 0), () => {
    const W = o.w ?? 1024, H = o.h ?? 256, c = canvas(W, H), g = c.getContext("2d")!;
    g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
    g.textAlign = "center"; g.textBaseline = "middle";
    const font = o.font ?? "700 {s}px Orbitron, sans-serif";
    if (o.vertical) {
      const chars = text.split(""), step = H / (chars.length + 0.5), s = Math.min(W * 0.75, step * 0.85);
      chars.forEach((ch, i) => {
        for (const [blur, a] of [[40, 0.9], [16, 1], [0, 1]] as const) { g.shadowColor = color; g.shadowBlur = blur; g.fillStyle = blur ? color : "#fff"; g.globalAlpha = a; g.font = font.replace("{s}", String(Math.floor(s))); g.fillText(ch, W / 2, step * (i + 0.75)); }
      });
    } else {
      let s = H * 0.62; g.font = font.replace("{s}", String(Math.floor(s)));
      while (g.measureText(text).width > W * 0.9) { s *= 0.92; g.font = font.replace("{s}", String(Math.floor(s))); }
      for (const [blur, a] of [[50, 0.9], [18, 1], [0, 1]] as const) { g.shadowColor = color; g.shadowBlur = blur; g.fillStyle = blur ? color : "#ffffff"; g.globalAlpha = a; g.fillText(text, W / 2, H / 2); }
    }
    if (o.frame) { g.shadowBlur = 20; g.shadowColor = color; g.strokeStyle = color; g.lineWidth = 6; g.strokeRect(12, 12, W - 24, H - 24); }
    g.globalAlpha = 1; return tex(c);
  });
}

/** Soft radial glow sprite. */
export function glow(color = "#ffffff") {
  return memo("g:" + color, () => {
    const S = 128, c = canvas(S, S), g = c.getContext("2d")!, gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    gr.addColorStop(0, color); gr.addColorStop(0.25, color + "aa"); gr.addColorStop(1, color + "00");
    g.fillStyle = gr; g.fillRect(0, 0, S, S); return tex(c);
  });
}

/** Iris: radial fibres, limbal ring, pupil, all hand-painted. */
export function iris(key: string, inner: string, outer: string, glowy = false) {
  return memo("i:" + key, () => {
    const S = 512, c = canvas(S, S), g = c.getContext("2d")!, R = rng(key.length * 77), C = S / 2;
    g.fillStyle = "#000"; g.fillRect(0, 0, S, S);
    const gr = g.createRadialGradient(C, C, 0, C, C, C); gr.addColorStop(0, inner); gr.addColorStop(0.75, outer); gr.addColorStop(0.92, "#050308"); gr.addColorStop(1, "#000");
    g.fillStyle = gr; g.beginPath(); g.arc(C, C, C, 0, 7); g.fill();
    for (let i = 0; i < 420; i++) { const a = R() * 7, r0 = C * 0.3, r1 = C * (0.6 + R() * 0.3); g.strokeStyle = R() < 0.5 ? (glowy ? "#d8ffff" : "#000") : inner; g.globalAlpha = 0.25; g.lineWidth = 1 + R() * 2; g.beginPath(); g.moveTo(C + Math.cos(a) * r0, C + Math.sin(a) * r0); g.lineTo(C + Math.cos(a) * r1, C + Math.sin(a) * r1); g.stroke(); }
    g.globalAlpha = 1; g.fillStyle = glowy ? "#e8ffff" : "#020203"; g.beginPath(); g.arc(C, C, C * (glowy ? 0.18 : 0.3), 0, 7); g.fill();
    return tex(c);
  });
}

export type SkinOpts = { base: string; shade: string; blush: string; age?: number; scar?: boolean; stubble?: boolean; seed?: number };
/** Face skin painted in sphere-UV space (front of face at u=0.25). */
export function skin(key: string, o: SkinOpts) {
  return memo("s:" + key, () => {
    const W = 1024, H = 512, c = canvas(W, H), g = c.getContext("2d")!, R = rng(o.seed ?? 5);
    g.fillStyle = o.base; g.fillRect(0, 0, W, H);
    // painterly mottling
    for (let i = 0; i < 1400; i++) { g.fillStyle = R() < 0.5 ? o.shade : o.blush; g.globalAlpha = 0.035; const x = R() * W, y = R() * H, r = 6 + R() * 26; g.beginPath(); g.ellipse(x, y, r, r * 0.6, R() * 3, 0, 7); g.fill(); }
    const fx = W * 0.25; // face centre
    // cheeks / nose warmth
    for (const dx of [-70, 70]) { const gr = g.createRadialGradient(fx + dx, H * 0.56, 0, fx + dx, H * 0.56, 60); gr.addColorStop(0, o.blush); gr.addColorStop(1, o.blush + "00"); g.globalAlpha = 0.35; g.fillStyle = gr; g.fillRect(fx + dx - 60, H * 0.56 - 60, 120, 120); }
    // eye socket shadow (painted ambient occlusion)
    for (const dx of [-62, 62]) { const gr = g.createRadialGradient(fx + dx, H * 0.47, 0, fx + dx, H * 0.47, 46); gr.addColorStop(0, o.shade); gr.addColorStop(1, o.shade + "00"); g.globalAlpha = 0.5; g.fillStyle = gr; g.fillRect(fx + dx - 50, H * 0.47 - 50, 100, 100); }
    // nostrils + nasolabial shading (painted, sits under the sculpted nose)
    for (const dx of [-13, 13]) { g.globalAlpha = 0.32; g.fillStyle = "#2a1210"; g.beginPath(); g.ellipse(fx + dx, H * 0.612, 5, 2.6, dx > 0 ? -0.4 : 0.4, 0, 7); g.fill(); }
    g.globalAlpha = 0.18; g.strokeStyle = o.shade; g.lineWidth = 8; for (const s2 of [-1, 1]) { g.beginPath(); g.moveTo(fx + s2 * 30, H * 0.6); g.quadraticCurveTo(fx + s2 * 46, H * 0.66, fx + s2 * 40, H * 0.71); g.stroke(); }
    if (o.stubble) { for (let i = 0; i < 5000; i++) { const a = R() * Math.PI, rr = 40 + R() * 70; const x = fx + Math.cos(a) * rr * 1.4, y = H * 0.66 + Math.sin(a) * rr * 0.75; g.fillStyle = "#1a1416"; g.globalAlpha = 0.08; g.fillRect(x, y, 2, 2); } }
    if (o.age) {
      g.strokeStyle = o.shade; g.lineWidth = 2.2; g.globalAlpha = 0.45 * o.age;
      for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(fx - 70, H * (0.3 + i * 0.035)); g.quadraticCurveTo(fx, H * (0.29 + i * 0.035), fx + 70, H * (0.3 + i * 0.035)); g.stroke(); }
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(fx + s * 95, H * (0.45 + i * 0.03)); g.lineTo(fx + s * 120, H * (0.43 + i * 0.045)); g.stroke(); }
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(fx + s * 30, H * 0.56); g.quadraticCurveTo(fx + s * 60, H * 0.66, fx + s * 50, H * 0.72); g.stroke(); }
    }
    if (o.scar) { // above LEFT eyebrow (character's left = +x = larger u on the canvas front)
      g.lineCap = "round";
      g.globalAlpha = 0.5; g.strokeStyle = "#7a3a38"; g.lineWidth = 13; g.beginPath(); g.moveTo(fx + 44, H * 0.325); g.lineTo(fx + 66, H * 0.395); g.stroke();
      g.globalAlpha = 0.95; g.strokeStyle = "#f0c4b6"; g.lineWidth = 7; g.beginPath(); g.moveTo(fx + 44, H * 0.325); g.lineTo(fx + 66, H * 0.395); g.stroke();
      g.globalAlpha = 0.8; g.strokeStyle = "#9a5048"; g.lineWidth = 2; g.beginPath(); g.moveTo(fx + 45, H * 0.328); g.lineTo(fx + 65, H * 0.392); g.stroke();
      for (let k = 0; k < 4; k++) { const yy = H * (0.335 + k * 0.016), xx = fx + 47 + k * 5.5; g.globalAlpha = 0.6; g.strokeStyle = "#c98a80"; g.lineWidth = 2; g.beginPath(); g.moveTo(xx - 6, yy + 2); g.lineTo(xx + 6, yy - 2); g.stroke(); }
    }
    g.globalAlpha = 1; const t = tex(c); return t;
  });
}

/** Animated canvas used for holographic UIs that must change every frame. */
export class LiveCanvas {
  c: HTMLCanvasElement; g: CanvasRenderingContext2D; t: THREE.CanvasTexture;
  constructor(w: number, h: number) { this.c = canvas(w, h); this.g = this.c.getContext("2d")!; this.t = tex(this.c) as THREE.CanvasTexture; }
  commit() { this.t.needsUpdate = true; }
}

/** Static holographic panel: graphs, glyph rows, rings. */
export function holoPanel(seed: number, color = "#5ff4ff", label = "") {
  return memo("h:" + seed + color + label, () => {
    const W = 512, H = 320, c = canvas(W, H), g = c.getContext("2d")!, R = rng(seed);
    g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
    g.strokeStyle = color; g.fillStyle = color; g.shadowColor = color; g.shadowBlur = 8; g.lineWidth = 2;
    g.globalAlpha = 0.9; g.strokeRect(6, 6, W - 12, H - 12);
    g.font = "600 22px Rajdhani, monospace"; if (label) g.fillText(label, 20, 34);
    const kind = seed % 4;
    if (kind === 0) { g.beginPath(); for (let x = 0; x < W - 40; x += 4) { const y = H * 0.55 + Math.sin(x * 0.05 + seed) * 40 * R() ; x === 0 ? g.moveTo(20 + x, y) : g.lineTo(20 + x, y); } g.stroke(); }
    if (kind === 1) for (let i = 0; i < 14; i++) { g.globalAlpha = 0.3 + R() * 0.6; g.fillRect(24 + i * 34, H - 30 - R() * 200, 22, 10 + R() * 200); }
    if (kind === 2) { for (let r = 30; r < 140; r += 22) { g.globalAlpha = 0.3 + R() * 0.6; g.beginPath(); g.arc(W / 2, H / 2 + 10, r, R() * 6, R() * 6 + 3 + R() * 3); g.stroke(); } }
    if (kind === 3) { g.font = "500 16px monospace"; for (let i = 0; i < 12; i++) { g.globalAlpha = 0.3 + R() * 0.7; let s = ""; for (let k = 0; k < 34; k++) s += "0123456789ABCDEF#:/-_"[Math.floor(R() * 21)]; g.fillText(s, 20, 60 + i * 21); } }
    g.globalAlpha = 1; return tex(c);
  });
}
