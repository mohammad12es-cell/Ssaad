// THE LAST HUMAN — EP01 "NO SIGNAL": shot list as code.
// Every value is a pure function of time t (seconds) so any frame can be rendered independently.
import * as THREE from "three";
import { FPS, TOTAL_FRAMES, clamp, lerp, smooth, smoother, easeInOut, easeOut, easeIn, range, hash, cubicBezier, rng } from "./util.js";

export const SHOTS = [
  { id: "1-eye", a: 0.0, b: 3.0 },
  { id: "2-city", a: 3.0, b: 8.0 },
  { id: "3a-track", a: 8.0, b: 11.0 },
  { id: "3b-citizen-ear", a: 11.0, b: 12.2 },
  { id: "3c-kael-ear", a: 12.2, b: 14.0 },
  { id: "4a-drone-descends", a: 14.0, b: 16.4 },
  { id: "4b-drone-cu", a: 16.4, b: 17.4 },
  { id: "4c-kael-face", a: 17.4, b: 18.9 },
  { id: "4d-red-light", a: 18.9, b: 20.0 },
  { id: "5a-hologram", a: 20.0, b: 23.2 },
  { id: "5b-head-turn", a: 23.2, b: 26.0 },
  { id: "6a-red-eye", a: 26.0, b: 28.0 },
  { id: "6b-title", a: 28.0, b: 30.0 },
];
export const shotAt = (t) => SHOTS.find((s) => t >= s.a && t < s.b) || SHOTS[SHOTS.length - 1];

// ---------------- key story times ----------------
export const T = {
  kaelStart: 6.0, detect: 16.55, freezeA: 16.55, freezeB: 17.25, kaelStop: 16.9, crowdStop: 20.8,
  holo: 20.2, adsGlitchA: 20.5, adsGlitchB: 22.6, headsTurn: 23.6, turnA: 23.7, turnB: 25.3,
  eveA: 26.35, eveB: 27.95, cut: 28.0, titleA: 28.2, subA: 28.6,
};

// ---------------- kinematics (integrated once for all frames) ----------------
const KAEL_X = 0.6, KAEL_Z0 = 27.0, SPEED = 1.3;
const kaelWalk = (t) => 1 - smooth(range(t, T.kaelStop, T.kaelStop + 1.0));
const crowdWalk = (t) => 1 - smooth(range(t, T.crowdStop, T.crowdStop + 0.3));
const DT = 1 / (FPS * 4);
const kin = { kz: [], kph: [], cz: [], cph: [] };
{
  let kz = KAEL_Z0, kph = 1.9, cz = 0, cph = 0;
  for (let i = 0; i <= (TOTAL_FRAMES + 2) * 4; i++) {
    const t = i * DT;
    if (i % 4 === 0) { kin.kz.push(kz); kin.kph.push(kph); kin.cz.push(cz); kin.cph.push(cph); }
    const kw = t < T.kaelStart ? 1 : kaelWalk(t), cw = crowdWalk(t);
    kz -= SPEED * kw * DT; kph += 2 * Math.PI * 0.82 * kw * DT;
    cz -= SPEED * cw * DT; cph += 2 * Math.PI * 0.9 * cw * DT;
  }
}
const sample = (arr, t) => { const x = t * FPS, i = Math.floor(x), k = x - i; return lerp(arr[Math.min(i, arr.length - 1)], arr[Math.min(i + 1, arr.length - 1)], k); };
export const kael = (t) => ({ x: KAEL_X, z: sample(kin.kz, t), phase: sample(kin.kph, t), walk: t < T.kaelStart ? 1 : kaelWalk(t) });

// ---------------- crowd layout ----------------
export function crowdLayout() {
  const R = rng(4242), list = [];
  // C0 walks just left of Kael (hero citizen for the ear insert)
  list.push({ x: -0.15, dz: -0.35, dir: -1, hero: true });
  for (let i = 0; i < 26; i++) { // same direction as Kael, in loose ranks
    const x = -6 + R() * 12, dz = -14 + R() * 30;
    if (Math.abs(x - KAEL_X) < 1.1 && Math.abs(dz) < 2.5) continue;
    if (Math.abs(x - 0.1) < 1.6 && dz < 0 && dz > -7) continue; // keep the tracking camera's lane clear
    list.push({ x, dz, dir: -1 });
  }
  for (let i = 0; i < 12; i++) { // oncoming walkers on the sides
    const side = i % 2 ? 1 : -1, x = side > 0 ? 3.2 + R() * 3 : -2.4 - R() * 3.5;
    list.push({ x, dz: -30 + R() * 50, dir: 1 });
  }
  return list;
}
export function citizenState(c, t, kaelZ0) {
  // same-direction walkers move with the crowd clock; oncoming walkers mirror it
  const cz = sample(kin.cz, t), ph = sample(kin.cph, t);
  const z = c.dir < 0 ? KAEL_Z0 + c.dz + cz : -2 + c.dz - cz;
  return { x: c.x, z, phase: ph + (c.dir > 0 ? Math.PI : 0), walk: crowdWalk(t) };
}

// ---------------- drone choreography ----------------
export function droneState(t, K) {
  const kz = K.z;
  // descends behind Kael (he walks toward -z, so "behind" is +z)
  const d = range(t, 14.0, 16.0);
  const base = new THREE.Vector3(KAEL_X + 1.3, lerp(11, 3.3, easeOut(d)), kz + lerp(4.5, 3.6, d));
  let targetName = "none", beamAmt = 0, red = 0;
  if (t >= 14.6) beamAmt = smooth(range(t, 14.6, 14.9));
  red = smooth(range(t, T.detect, T.detect + 0.12));
  const frozen = t > T.freezeA && t < T.freezeB;
  return { pos: base, beamAmt, red, frozen };
}
