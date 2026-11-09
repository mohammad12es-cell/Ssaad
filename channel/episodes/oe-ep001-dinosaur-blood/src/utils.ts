import {interpolate, Easing} from 'remotion';

export const C = {
  black: '#050404',
  charcoal: '#0e0c0b',
  charcoal2: '#1a1714',
  brown: '#4a3a2c',
  brown2: '#6b5440',
  ivory: '#e8dcc4',
  ivoryDim: '#b9ad97',
  ember: '#e0662f',
  blood: '#b8442c',
  deepRed: '#6e1f16',
};

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Clamped interpolation with optional easing. */
export const lerpT = (t: number, a: number, b: number, from = 0, to = 1, ease: (x: number) => number = Easing.inOut(Easing.cubic)) =>
  interpolate(t, [a, b], [from, to], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});

/** 0→1 fade in over [a,a+fi], 1→0 fade out over [b-fo,b]. */
export const window01 = (t: number, a: number, b: number, fi = 0.5, fo = 0.5) =>
  Math.min(lerpT(t, a, a + fi), 1 - lerpT(t, b - fo, b));

export const mulberry32 = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// Small deterministic value noise (2D/3D) for procedural textures and displacement.
const hash = (x: number, y: number, z: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
};
const smooth = (t: number) => t * t * (3 - 2 * t);
export const noise3 = (x: number, y: number, z: number) => {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = smooth(x - xi), yf = smooth(y - yi), zf = smooth(z - zi);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (dx: number, dy: number, dz: number) => hash(xi + dx, yi + dy, zi + dz);
  return l(
    l(l(c(0, 0, 0), c(1, 0, 0), xf), l(c(0, 1, 0), c(1, 1, 0), xf), yf),
    l(l(c(0, 0, 1), c(1, 0, 1), xf), l(c(0, 1, 1), c(1, 1, 1), xf), yf),
    zf,
  );
};
export const fbm3 = (x: number, y: number, z: number, oct = 4) => {
  let a = 0.5, s = 0, n = 0;
  for (let i = 0; i < oct; i++) {
    s += a * noise3(x, y, z);
    n += a;
    x *= 2.03; y *= 2.03; z *= 2.03; a *= 0.5;
  }
  return s / n;
};

/** Heartbeat pulse envelope matching the sound design (lub at t, dub at t+0.24). */
export const heartbeat = (t: number, start: number, period: number) => {
  if (t < start) return 0;
  const p = (t - start) % period;
  return Math.exp(-p * 9) + 0.6 * Math.exp(-Math.max(0, p - 0.24) * 9) * (p > 0.24 ? 1 : 0);
};
