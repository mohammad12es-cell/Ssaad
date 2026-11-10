// THE LAST TWO v2 — the whole film's timing in one place (seconds). audio.py mirrors these numbers.
import { V, track, clamp, lerp, smooth, easeOut, easeInOut } from "./util.js";

export const DUR = 15, FPS = 24;
export const CUTS = [6.0, 8.6, 11.9]; // hard cuts (no motion blur across them)

// ---------------------------------------------------------------- orc siege fire (catapult volleys)
export const FIREBALLS = [
  // volley 1: arcs over the opening shot and lands in front of the camera, framing the pair
  { tI: 2.2, to: [-13, 17] }, { tI: 2.42, to: [10.5, 12] }, { tI: 2.66, to: [-26, -6] }, { tI: 2.9, to: [19, 24] },
  // volley 2: lands behind the pair during the orbit -> the burning backdrop of the hero shot
  { tI: 5.0, to: [-8, 24] }, { tI: 5.22, to: [13, 31] }, { tI: 5.45, to: [3.5, 40] }, { tI: 5.7, to: [-21, 15] },
].map((f, i) => ({ ...f, tL: f.tI - 2.6, from: [(i % 4 - 1.5) * 45, 30, -300 - (i % 3) * 18], id: i }));
export function fireballPos(f, t) {
  const u = clamp((t - f.tL) / (f.tI - f.tL));
  const [x0, y0, z0] = f.from, [x1, z1] = f.to;
  return V(lerp(x0, x1, u), lerp(y0, 0.3, u) + 4 * 115 * u * (1 - u), lerp(z0, z1, u));
}

// ---------------------------------------------------------------- lightning
export const LIGHTNING = [
  { t: 1.15, pos: [-220, -520], strokes: [0, 0.07, 0.17], amp: 0.6 },
  { t: 4.85, pos: [55, -300], strokes: [0, 0.06, 0.14, 0.33], amp: 1.1 },
  { t: 7.05, pos: [-35, 230], strokes: [0, 0.05, 0.12, 0.26], amp: 1.05 }, // behind the pair in the hero shot
  { t: 11.9, pos: [15, -190], strokes: [0, 0.05, 0.11, 0.2, 0.38], amp: 1.8 },
  { t: 14.42, pos: [140, -330], strokes: [0, 0.06, 0.15], amp: 1.2 },
];

// ---------------------------------------------------------------- the samurai's fire
export const WAVE = { t0: 8.92, speed: 44, dirX: -0.02, len: 125 };           // his kesa-giri fire wave
export const RING = { t0: 10.55, rMax: 48 };                                    // her spinning ring of fire
export const WALL = { t0: 12.45, z: -40, spread: 420, surge: 14.42 };           // the wall of fire
export const waveFront = (t) => (t < WAVE.t0 ? -1 : Math.min(WAVE.len, 1.4 + WAVE.speed * (t - WAVE.t0) * (1 - 0.12 * clamp((t - WAVE.t0) / 3))));
export const waveHalfWidth = (d) => 1.6 + 0.47 * d;
export const waveHeight = (t, d) => (t < WAVE.t0 ? 0 : (7.5 - 3.5 * clamp(d / 110)) * smooth(WAVE.t0, WAVE.t0 + 0.12, t) * (1 - smooth(10.9, 12.2, t)));
export const ringRadius = (t) => (t < RING.t0 ? 0 : 1.6 + (RING.rMax - 1.6) * (1 - Math.exp(-(t - RING.t0) * 2.7)));
export const ringHeight = (t) => (t < RING.t0 ? 0 : 6.5 * smooth(RING.t0, RING.t0 + 0.1, t) * (1 - 0.55 * smooth(11.2, 12.4, t)));
export const wallHeight = (t, x) => {
  const t0 = WALL.t0 + Math.abs(x) / WALL.spread; if (t < t0) return 0;
  const rise = easeOut((t - t0) / 0.75, 3) * 30, surge = 12 * Math.exp(-Math.pow((t - WALL.surge - 0.12) / 0.35, 2)) + 9 * smooth(WALL.surge, WALL.surge + 0.4, t);
  return rise + surge;
};

// ---------------------------------------------------------------- choreography
// pose vector (root-local, forward = -z):
// 0 px 1 pz 2 yaw | 3 pelvisY 4 pelvisZ 5 torsoYaw 6 torsoPitch 7 torsoRoll | 8-10 grip xyz 11-13 blade dir
// 14 edge roll | 15-17 left foot 18-20 right foot | 21 headYaw 22 headPitch | 23 blade heat
const M0 = [-0.55, 0.05, 0, 0.93, 0, 0, 0, 0, 0.03, 1.12, -0.36, 0.02, 0.5, -1, 0, -0.16, 0, -0.2, 0.18, 0, 0.17, 0.0, -0.03, 0];
const F0 = [0.52, -0.08, 0.06, 0.9, 0, 0, 0, 0, 0.06, 1.04, -0.3, 0.16, -0.42, -1, 0.3, -0.15, 0, -0.18, 0.17, 0, 0.15, 0.0, -0.05, 0];
const P = (base, o) => { const v = base.slice(); for (const k in o) { const val = o[k]; if (Array.isArray(val)) val.forEach((x, j) => (v[+k + j] = x)); else v[+k] = val; } return v; };

const mHasso = P(M0, { 3: 0.86, 4: 0.05, 5: -0.5, 6: -0.06, 8: [0.22, 1.6, 0.03], 11: [0.25, 0.9, 0.42], 18: [0.2, 0, 0.22], 22: -0.06, 23: 0.9 });
export const MALE = [
  [0, M0],
  [6.9, P(M0, { 3: 0.92 }), { hold: true }],
  [7.15, P(M0, { 3: 0.9, 8: [0.03, 1.125, -0.38], 11: [0.02, 0.56, -1], 22: -0.06, 23: 0 }), { hold: true }], // tightens grip
  [8.25, P(M0, { 3: 0.9, 8: [0.03, 1.125, -0.38], 11: [0.02, 0.56, -1], 22: -0.06, 23: 0 }), { hold: true }],
  [8.72, mHasso, { hold: true }],
  [8.84, P(mHasso, { 3: 0.84, 4: -0.08, 5: -0.15, 6: 0.08, 8: [0.12, 1.42, -0.44], 11: [-0.35, 0.55, -1], 18: [0.22, 0.13, -0.12], 23: 1 })],
  [8.92, P(mHasso, { 3: 0.8, 4: -0.22, 5: 0.3, 6: 0.22, 8: [-0.12, 1.0, -0.6], 11: [-0.75, -0.35, -0.75], 14: 0.4, 18: [0.24, 0, -0.42], 23: 1 })],
  [9.04, P(mHasso, { 3: 0.78, 4: -0.26, 5: 0.55, 6: 0.28, 8: [-0.38, 0.82, -0.34], 11: [-0.85, -0.55, 0.05], 14: 0.5, 18: [0.24, 0, -0.45], 22: -0.1, 23: 1 }), { hold: true }],
  [9.9, P(mHasso, { 3: 0.8, 4: -0.2, 5: 0.45, 6: 0.18, 8: [-0.34, 0.86, -0.3], 11: [-0.8, -0.5, 0.1], 14: 0.5, 18: [0.24, 0, -0.42], 22: -0.06, 23: 1 })],
  [10.8, P(M0, { 3: 0.86, 4: -0.12, 8: [0.12, 0.98, -0.32], 11: [0.25, -0.55, -1], 18: [0.24, 0, -0.3], 23: 1 }), { hold: true }],
  [12.0, P(M0, { 3: 0.88, 4: -0.1, 8: [0.18, 0.96, -0.24], 11: [0.3, -0.6, -0.8], 18: [0.24, 0, -0.3], 23: 1 }), { hold: true }],
];
const fWind = P(F0, { 3: 0.8, 4: 0.04, 5: -0.95, 6: 0.12, 8: [0.4, 1.06, 0.14], 11: [0.6, 0.06, 0.85], 14: -1.2, 15: [-0.24, 0, -0.08], 18: [0.24, 0, 0.12], 23: 0.8 });
export const FEMALE = [
  [0, F0],
  [6.55, P(F0, { 23: 0 }), { hold: true }],
  [7.45, P(F0, { 8: [0.03, 1.2, -0.36], 11: [0.06, 0.55, -1], 14: 0.0, 22: -0.08, 23: 0 }), { hold: true }], // raises her katana
  [9.5, P(F0, { 8: [0.03, 1.2, -0.36], 11: [0.06, 0.55, -1], 14: 0.0, 22: -0.08, 23: 0 }), { hold: true }],
  [10.1, fWind, { hold: true }],
  [10.3, P(fWind, { 2: -2.7, 3: 0.74, 5: -0.2, 8: [0.44, 1.04, -0.12], 11: [0.95, -0.04, -0.3], 14: -1.57, 23: 1 })],
  [10.52, P(fWind, { 2: -6.2, 3: 0.72, 5: 0.25, 6: 0.22, 8: [0.44, 0.96, -0.02], 11: [0.95, -0.25, 0.2], 14: -1.57, 23: 1 })],
  [10.62, P(fWind, { 2: -6.28, 3: 0.7, 5: 0.35, 6: 0.28, 8: [0.42, 0.9, 0.06], 11: [0.88, -0.42, 0.32], 14: -1.57, 22: -0.12, 23: 1 }), { hold: true }],
  [11.2, P(fWind, { 2: -6.28, 3: 0.74, 5: 0.25, 6: 0.18, 8: [0.4, 0.92, 0.04], 11: [0.86, -0.42, 0.3], 14: -1.57, 22: -0.08, 23: 1 })],
  [12.0, P(F0, { 2: -6.28 + 0.06, 3: 0.88, 8: [0.2, 0.95, -0.22], 11: [0.35, -0.6, -0.75], 23: 1 }), { hold: true }],
];
// final advance: a steady, fearless walk toward the fire
export const WALK = { t0: 12.15, speed: 1.25, stride: 0.62 };
export function walkDist(t) { const d = t - WALK.t0; if (d <= 0) return 0; const ramp = 0.6; return d < ramp ? 0.5 * WALK.speed / ramp * d * d : 0.5 * WALK.speed * ramp + WALK.speed * (d - ramp); }
export function pose(keys, t, phase = 0) {
  const p = track(keys, t);
  const d = walkDist(t);
  if (d > 0) {
    p[1] -= d;
    const k = d / (2 * WALK.stride) + phase, S = WALK.stride, amt = clamp((t - WALK.t0) / 0.4);
    [[15, 0], [18, 0.5]].forEach(([j, off]) => {
      const s = (k + off) % 1; let z, y;
      if (s < 0.5) { z = lerp(-S / 2, S / 2, s / 0.5); y = 0; } else { const u = (s - 0.5) / 0.5; z = lerp(S / 2, -S / 2, easeInOut(u)); y = 0.11 * Math.sin(Math.PI * u); }
      p[j + 1] = lerp(p[j + 1], y, amt); p[j + 2] = lerp(p[j + 2], z, amt); p[j] = lerp(p[j], j === 15 ? -0.14 : 0.16, amt);
    });
    p[3] -= 0.025 * Math.abs(Math.cos(Math.PI * 2 * k)) * amt; p[4] = lerp(p[4], -0.04, amt);
    p[7] = 0.03 * Math.sin(Math.PI * 2 * k) * amt;
  }
  return p;
}

// ---------------------------------------------------------------- camera (5 shots)
const DEG = Math.PI / 180;
const SHOT12 = [ // polar orbit around the pair: [theta, R, h, tx, ty, tz, fov]
  [0, [-3, 44, 7.6, 0, 4.2, -60, 40]],
  [3, [4, 15.5, 3.3, 0, 2.3, -40, 38]],
  [4.6, [26, 9.5, 2.3, -0.2, 1.6, -12, 37]],
  [6, [52, 6.6, 1.6, 0, 1.55, -8, 36]],
];
const SHOT3 = [[6, [0.18, 0.86, -3.7, 0.0, 1.66, 0.4, 31]], [8.6, [0.06, 0.8, -2.75, 0.0, 1.64, 0.4, 30]]];
const SHOT4 = [
  [8.6, [-3.0, 1.1, 2.4, -0.45, 1.25, -1.6, 40]],
  [9.4, [-3.4, 1.3, 1.9, -0.2, 1.5, -12, 42]],
  [10.15, [-4.0, 2.3, 1.9, 0.4, 1.1, -6, 42]],
  [11.0, [-6.0, 5.4, 5.6, 0.5, 0.2, -10, 46]],
  [11.9, [-7.0, 6.4, 7.0, 0.5, 0.2, -14, 47]],
];
export function cameraAt(t) {
  let pos, tgt, fov, focus, aperture;
  if (t < CUTS[0]) {
    const [th, R, h, tx, ty, tz, f] = track(SHOT12, t);
    pos = V(Math.sin(th * DEG) * R, h, Math.cos(th * DEG) * R); tgt = V(tx, ty, tz); fov = f;
    focus = lerp(42, 6.5, smooth(1, 6, t)); aperture = lerp(0.15, 0.45, smooth(3, 6, t));
  } else if (t < CUTS[1]) {
    const [x, y, z, tx, ty, tz, f] = track(SHOT3, t); pos = V(x, y, z); tgt = V(tx, ty, tz); fov = f;
    focus = pos.distanceTo(V(0, 1.66, 0)) - 0.05; aperture = 1.25;
  } else if (t < CUTS[2]) {
    const [x, y, z, tx, ty, tz, f] = track(SHOT4, t); pos = V(x, y, z); tgt = V(tx, ty, tz); fov = f;
    focus = lerp(3.2, 7.5, smooth(9.8, 11.2, t)); aperture = lerp(0.6, 0.35, smooth(9.8, 11.2, t));
  } else {
    const k = easeOut((t - CUTS[2]) / (DUR - CUTS[2]), 2.2), w = walkDist(t);
    pos = V(lerp(0.55, 0.2, k), lerp(1.0, 2.1, k), lerp(3.7, 6.2, k) - w * k);
    tgt = V(lerp(0.05, 0, k), lerp(1.9, 5.0, k), lerp(-30, -60, k)); fov = lerp(34, 46, k);
    focus = pos.z + w - 0.0 + 0.4; aperture = lerp(0.8, 0.3, k);
  }
  return { pos, tgt, fov, focus, aperture };
}
