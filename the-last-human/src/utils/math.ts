// Deterministic math helpers shared by every scene. No Math.random anywhere in the series:
// every frame must render identically on every render pass / concurrency tab.
export const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const inv = (a: number, b: number, x: number) => clamp((x - a) / (b - a));
export const smooth = (k: number) => { k = clamp(k); return k * k * (3 - 2 * k); };
export const smoother = (k: number) => { k = clamp(k); return k * k * k * (k * (k * 6 - 15) + 10); };
export const easeIn = (k: number) => clamp(k) ** 2;
export const easeOut = (k: number) => 1 - (1 - clamp(k)) ** 2;
export const easeInOut3 = (k: number) => { k = clamp(k); return k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2; };
export const expoOut = (k: number) => (k >= 1 ? 1 : 1 - 2 ** (-10 * clamp(k)));
/** 0→1 between a and b with smoothstep */
export const ramp = (t: number, a: number, b: number) => smooth(inv(a, b, t));
/** 1 inside [a,b] with soft edges of width f */
export const window = (t: number, a: number, b: number, f = 0.3) => ramp(t, a, a + f) * (1 - ramp(t, b - f, b));

export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
export const hash = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
/** smooth 1D value noise in [-1,1] */
export function noise1(x: number, seed = 0) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(hash(i + seed * 57.3), hash(i + 1 + seed * 57.3), u) * 2 - 1;
}
/** fractal handheld-style noise */
export const fbm1 = (x: number, seed = 0) => noise1(x, seed) * 0.6 + noise1(x * 2.1, seed + 3) * 0.28 + noise1(x * 4.3, seed + 7) * 0.12;
/** stepped flicker 0/1 used for neon & glitch */
export const flicker = (t: number, rate = 12, duty = 0.85, seed = 0) => (hash(Math.floor(t * rate) + seed * 91) < duty ? 1 : 0);
export const FPS = 30;
export const EP_FRAMES = 900;
