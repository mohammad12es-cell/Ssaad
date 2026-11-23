// "How These Shorts Are Made" (60 s): shot plan timed to voice/lines.json (channel/making-short/voice).
// Line starts (s): 1 .35 | 2 4.60 | 3 7.28 | 4 15.10 | 5 21.22 | 6 24.95 | 7 30.37 | 8 35.90 | 9 38.43 | 10 41.30 | 11 45.88 | 12 50.60
export const FPS = 30;
export const TOTAL = 1800;
export type V3 = [number, number, number];
export type Light = "day" | "golden";
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
export type Shot = { id: number; a: number; b: number; light: Light; cInf: number; cam: (f: number) => Cam };

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const sstep = (x: number) => { const u = clamp01(x); return u * u * u * (u * (u * 6 - 15) + 10); }; // smootherstep
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const L3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const deg = (d: number) => (d * Math.PI) / 180;
/** glide from A to B over the whole shot (smootherstep) plus a slow creeping push toward the look point */
const glide = (a: number, b: number, A: Cam, B: Cam, creep = 0.06) => (f: number): Cam => {
  const k = sstep((f - a) / Math.max(1, b - a)), c = 1 - creep * ((f - a) / Math.max(1, b - a));
  const look = L3(A.look, B.look, k), pos0 = L3(A.pos, B.pos, k);
  const pos: V3 = [look[0] + (pos0[0] - look[0]) * c, look[1] + (pos0[1] - look[1]) * c, look[2] + (pos0[2] - look[2]) * c];
  return { pos, look, fov: lerp(A.fov, B.fov, k), roll: lerp(A.roll, B.roll, k) };
};
const C = (pos: V3, look: V3, fov = 34, roll = 0): Cam => ({ pos, look, fov, roll: deg(roll) });

export const STAGE: V3 = [0, 0.3, 0]; // top of the round stage in the plaza
export const MONITOR: V3 = [-4.6, 0, -1.2];
export const CAMERA_PROP: V3 = [3.6, 0, 3.2];

export const SHOTS: Shot[] = [
  { id: 1, a: 0, b: 138, light: "day", cInf: 14, cam: glide(0, 138, C([0.3, 1.05, 3.4], [0, 0.95, 0], 30, 0), C([0.1, 1.0, 2.5], [0, 0.95, 0], 30, -3)) },
  { id: 2, a: 138, b: 216, light: "day", cInf: 10, cam: (f) => {
      const u = sstep((f - 138) / 78), a = deg(-50 + 85 * u), r = 3.6 - 0.4 * u;
      return C([Math.sin(a) * r, 1.5, Math.cos(a) * r], [0, 1.0, 0], 38, 3 - 6 * u);
    } },
  { id: 3, a: 216, b: 450, light: "day", cInf: 0, cam: glide(216, 450, C([6.5, 3.2, 10.5], [-2, 0.7, 0.8], 40, 0), C([4.2, 2.4, 7.8], [-0.5, 0.7, 0.6], 38, 2)) },
  { id: 4, a: 450, b: 632, light: "day", cInf: 11, cam: glide(450, 632, C([0, 1.35, 4.8], [0, 1.0, 0], 32, 0), C([0.4, 1.2, 3.7], [0, 1.0, 0], 32, -2)) },
  { id: 5, a: 632, b: 745, light: "day", cInf: 0, cam: (f) => { const px = pipRunX(f); return C([px - 1.2, 1.5, 9.5], [px + 0.6, 0.7, 3], 36, 0); } },
  { id: 6, a: 745, b: 905, light: "day", cInf: 0, cam: glide(745, 905, C([0.5, 0.8, 7.5], [0, 2.0, 0], 48, 0), C([0, 0.9, 6.4], [0, 2.3, 0], 48, 3)) },
  { id: 7, a: 905, b: 1072, light: "day", cInf: 10, cam: glide(905, 1072, C([-4.6, 2.0, 6.6], [1.0, 1.3, 0.6], 40, 0), C([-3.8, 2.5, 5.6], [0.8, 1.7, 0.4], 40, -3)) },
  { id: 8, a: 1072, b: 1150, light: "day", cInf: 12, cam: glide(1072, 1150, C([-2.7, 1.9, 4.3], [-4.4, 1.9, -1.1], 34, 0), C([-3.1, 1.85, 3.6], [-4.4, 1.9, -1.1], 34, 2)) },
  { id: 9, a: 1150, b: 1235, light: "day", cInf: 7, cam: glide(1150, 1235, C([1.2, 1.8, 7.8], [-1.6, 1.4, -0.2], 42, 0), C([0.8, 1.7, 7.0], [-1.6, 1.4, -0.2], 42, -2)) },
  { id: 10, a: 1235, b: 1370, light: "day", cInf: 13, cam: glide(1235, 1370, C([0.3, 1.6, 4.4], [-0.3, 1.2, 0.3], 36, 0), C([0.0, 1.5, 3.7], [-0.3, 1.2, 0.3], 36, 3)) },
  { id: 11, a: 1370, b: 1515, light: "day", cInf: 10, cam: glide(1370, 1515, C([3.2, 1.9, 6.6], [0, 1.25, 0], 36, 0), C([2.5, 1.7, 5.6], [0, 1.3, 0], 36, -3)) },
  { id: 12, a: 1515, b: 1800, light: "golden", cInf: 5, cam: glide(1515, 1800, C([0.2, 1.4, 5.0], [0, 0.9, 0], 34, 0), C([9, 20, 30], [0, 1.0, 0], 42, 0), 0) },
];
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];

// ---- animation helpers shared by world.ts ----
/** shot 5: Pip hops left to right; x by frame */
export const pipRunX = (f: number) => lerp(-6, 6, clamp01((f - 640) / 100));
/** impact kicks: sign-flipping shake decaying over 7 frames (skill rule) */
export const KICKS = [588, 1482, 1494];
export const kick = (f: number) => {
  let s = 0;
  for (const k of KICKS) { const d = f - k; if (d >= 0 && d < 7) s += (d % 2 ? -1 : 1) * 0.06 * (1 - d / 7); }
  return s;
};
export const FLASH_AT = 138;
// beats (frames) from the word timings
export const BEAT = { body: 470, eyes: 528, smile: 588, pipDone: 616, sine: 828, snaps: [965, 985, 1005, 1025], strips: 1029, joke: 1180, flip: 1285, ring: 1482, counter: 1490 };
