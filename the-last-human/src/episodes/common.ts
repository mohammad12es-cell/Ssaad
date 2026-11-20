// Shared episode helpers: dialogue/lip-sync lookup, HUD drawing kit, projection, series title bug.
import * as THREE from "three";
import type { Stage } from "../engine/Stage";
import VOICE from "../data/voice.json";
import DIALOGUE from "../data/dialogue.json";
import { clamp, hash, ramp } from "../utils/math";

type VoiceLine = { ep: number; who: string; start: number; dur: number; speech: number; env: number[] };
export const voice = VOICE as unknown as Record<string, VoiceLine>;
export const lines = (DIALOGUE as any).lines as { id: string; ep: number; kind: string; who: string; start: number; end?: number; en: string; fa: string }[];
/** lip-sync: mouth openness for line `id` at time t (0 when not speaking) */
export function mouth(id: string, t: number) {
  const v = voice[id]; if (!v) return 0;
  const f = Math.floor((t - v.start) * 30); if (f < 0 || f >= v.env.length) return 0;
  const k = (t - v.start) * 30 - f; const a = v.env[f], b = v.env[Math.min(f + 1, v.env.length - 1)];
  return a + (b - a) * k;
}
export const speaking = (id: string, t: number) => { const v = voice[id]; return !!v && t >= v.start && t <= v.start + v.speech; };

/** project a world point to HUD pixels */
const P = new THREE.Vector3();
export function project(stage: Stage, p: THREE.Vector3) {
  P.copy(p).project(stage.camera); return { x: (P.x * 0.5 + 0.5) * stage.W, y: (-P.y * 0.5 + 0.5) * stage.H, behind: P.z > 1 };
}

// ---------------------------------------------------------------- HUD kit
export type TextOpts = { size?: number; weight?: number; color?: string; align?: CanvasTextAlign; glow?: number; font?: string; alpha?: number; spacing?: number };
export const HUD = {
  text(g: CanvasRenderingContext2D, s: string, x: number, y: number, o: TextOpts = {}) {
    g.save(); g.globalAlpha = o.alpha ?? 1; g.font = `${o.weight ?? 700} ${o.size ?? 40}px ${o.font ?? "Orbitron"}, sans-serif`;
    g.textAlign = o.align ?? "left"; g.textBaseline = "middle"; g.fillStyle = o.color ?? "#e8f6ff";
    (g as any).letterSpacing = `${o.spacing ?? 0}px`;
    g.shadowColor = o.color ?? "#38e8ff"; g.shadowBlur = o.glow ?? 18; g.fillText(s, x, y); g.shadowBlur = 0; g.fillText(s, x, y); g.restore();
  },
  /** RGB-split glitch text */
  glitchText(g: CanvasRenderingContext2D, s: string, x: number, y: number, t: number, amt: number, o: TextOpts = {}) {
    const j = amt * 14, seed = Math.floor(t * 24);
    if (amt > 0.01) {
      HUD.text(g, s, x - j * (hash(seed) - 0.3), y, { ...o, color: "#ff2a3d", glow: 0, alpha: 0.7 * (o.alpha ?? 1) });
      HUD.text(g, s, x + j * (hash(seed + 1) - 0.3), y + (hash(seed + 2) - 0.5) * j * 0.4, { ...o, color: "#38e8ff", glow: 0, alpha: 0.7 * (o.alpha ?? 1) });
    }
    HUD.text(g, s, x, y, o);
  },
  reticle(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, o: { alpha?: number; spin?: number; lw?: number } = {}) {
    g.save(); g.globalAlpha = o.alpha ?? 1; g.strokeStyle = color; g.lineWidth = o.lw ?? 3; g.shadowColor = color; g.shadowBlur = 12;
    const L = r * 0.45;
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { g.beginPath(); g.moveTo(x + sx * r, y + sy * (r - L)); g.lineTo(x + sx * r, y + sy * r); g.lineTo(x + sx * (r - L), y + sy * r); g.stroke(); }
    if (o.spin !== undefined) { g.beginPath(); g.arc(x, y, r * 0.55, o.spin, o.spin + 1.4); g.stroke(); g.beginPath(); g.arc(x, y, r * 0.55, o.spin + Math.PI, o.spin + Math.PI + 1.4); g.stroke(); }
    g.restore();
  },
  scanlines(g: CanvasRenderingContext2D, W: number, H: number, a = 0.12) { g.save(); g.fillStyle = `rgba(0,0,0,${a})`; for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 2); g.restore(); },
  frame(g: CanvasRenderingContext2D, W: number, H: number, color: string, alpha = 0.8) {
    g.save(); g.globalAlpha = alpha; g.strokeStyle = color; g.lineWidth = 3; g.shadowColor = color; g.shadowBlur = 10; const m = 60, L = 90;
    for (const [x, y, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [W - m, H - m, -1, -1], [m, H - m, 1, -1]]) { g.beginPath(); g.moveTo(x, y + sy * L); g.lineTo(x, y); g.lineTo(x + sx * L, y); g.stroke(); }
    g.restore();
  },
};

/** Series title bug shown over the cold-open hook (never blocks the first shot). */
export function titleBug(stage: Stage, t: number, ep: number, title: string, a = 0.5, b = 3.2) {
  const k = ramp(t, a, a + 0.4) * (1 - ramp(t, b - 0.4, b)); if (k <= 0) return;
  const g = stage.hud, fl = hash(Math.floor(t * 20)) < 0.08 ? 0.4 : 1;
  HUD.text(g, "THE LAST HUMAN", 70, 150, { size: 34, weight: 900, spacing: 10, alpha: k * fl, color: "#e8f6ff", glow: 14 });
  g.save(); g.globalAlpha = k * 0.8; g.fillStyle = "#38e8ff"; g.fillRect(70, 182, 120 * clamp((t - a) * 2), 3); g.restore();
  HUD.text(g, `EP.${String(ep).padStart(2, "0")}  ${title}`, 70, 218, { size: 30, weight: 600, font: "Rajdhani", spacing: 6, alpha: k * fl, color: "#9fe9ff", glow: 10 });
}
