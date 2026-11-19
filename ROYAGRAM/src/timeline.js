// Master timeline — single source of truth for picture timing (audio cues mirror these in audio/cues.json)
import { MODES } from './post.js';
import { range, track, easeOut, easeInOut, clamp } from './lib.js';

export const FPS = 24;
export const DURATION = 45;

// shot windows in global seconds; overlap = transition handled by `out` of the earlier shot
export const SHOTS = [
  { scene: 's1', start: 0.0, end: 4.3, out: { mode: MODES.REFRACT } },
  { scene: 's2', start: 3.8, end: 11.3, out: { mode: MODES.LIQUIDZOOM, center: [0.5, 0.5] } },
  { scene: 's3', start: 10.6, end: 18.3, out: { mode: MODES.SMEAR } },
  { scene: 's4', start: 17.6, end: 25.3, out: { mode: MODES.IRIS, center: [0.5, 0.5] } },
  { scene: 's5', start: 24.6, end: 31.0 },
  { scene: 's7', start: 38.0, end: 45.01 },
];

// SCENE 06 — creative showreel built from the film's own shots
const M = [
  { t: 31.00, d: 0.90, a: { scene: 's2', lt: 2.6, rate: 0.8, opt: { variant: 1 } } },
  { t: 31.90, d: 0.55, a: { scene: 's3', lt: 5.6, rate: 1.0, opt: { variant: 1 } } },
  { t: 32.45, d: 0.55, a: { scene: 's4', lt: 3.6, rate: 0.6, opt: { variant: 1 } } },
  { t: 33.00, d: 1.20, wipe: [33.2, 34.05], a: { scene: 's3', lt: 4.9, rate: 0.5, wire: true, opt: { variant: 2 } }, b: { scene: 's3', lt: 4.9, rate: 0.5, opt: { variant: 2 } } },
  { t: 34.20, d: 0.50, a: { scene: 's1', lt: 2.2, rate: 0.7, opt: { variant: 1 } } },
  { t: 34.70, d: 1.30, split: true, a: { scene: 's2', lt: 6.0, rate: 0.6, opt: { variant: 2 } }, b: { scene: 's4', lt: 4.2, rate: 0.5, opt: { variant: 2 } }, c: { scene: 's5', lt: 5.6, rate: 0.6, opt: { variant: 2 } } },
  { t: 36.00, d: 1.25, a: { scene: 's5', lt: 1.4, rate: 0.7, opt: { variant: 1 } } },
  { t: 37.25, d: 0.40, a: { scene: 's4', lt: 2.6, rate: 0.6, opt: { variant: 3 } } },
  { t: 37.65, d: 0.35, a: { scene: 's2', lt: 1.4, rate: 1.0, opt: { variant: 3 } } },
];
export const CUTS = M.map((m) => m.t).concat([38.0]);
const spec = (s, dt) => ({ scene: s.scene, lt: s.lt + dt * (s.rate ?? 1), opt: s.opt, wire: s.wire });

export const MONTAGE = {
  start: 31.0, end: 38.0,
  at(t) {
    let m = M[0];
    for (const x of M) if (t >= x.t) m = x;
    const dt = t - m.t;
    if (m.wipe) return { mode: MODES.WIPE, p: range(t, m.wipe[0], m.wipe[1]), a: spec(m.a, dt), b: spec(m.b, dt) };
    if (m.split) {
      const k = (d) => 1.0 - easeOut(range(t, m.t + d, m.t + d + 0.45));
      return { mode: MODES.SPLIT, a: spec(m.a, dt), b: spec(m.b, dt), c: spec(m.c, dt), slide: [k(0.0) * 1.0, k(0.1) * 1.0, k(0.2) * 1.0] };
    }
    return { mode: MODES.A, a: spec(m.a, dt) };
  },
};

// per-frame grade parameters
export function gradeAt(t) {
  let flash = 0;
  flash += 0.32 * Math.exp(-Math.max(0, t - 1.55) * 9) * (t >= 1.55 ? 1 : 0); // fracture flash
  for (const c of CUTS) { const d = t - c; if (d >= 0 && d < 0.25) flash += 0.12 * Math.exp(-d * 18); }
  const logo = 41.9; if (t >= logo) flash += 0.42 * Math.exp(-(t - logo) * 6);
  const fadeIn = 1 - easeOut(range(t, 0, 0.5));
  // controlled silence: near-black beat before the brand reveal
  const hush = track(t, [[41.3, 0], [41.55, 0.82], [41.88, 0.82], [41.9, 0]]);
  let bloom = 0.5;
  bloom += 0.35 * Math.exp(-Math.max(0, t - 1.55) * 3) * (t >= 1.55 ? 1 : 0);
  if (t > 38) bloom += 0.15;
  return {
    exposure: 1.0, fade: Math.max(fadeIn, hush), flash: clamp(flash, 0, 0.85), vig: 0.6, bloom,
    ca: 0.0012 + (t > 1.5 && t < 2.2 ? 0.004 * Math.exp(-(t - 1.55) * 5) : 0),
  };
}
