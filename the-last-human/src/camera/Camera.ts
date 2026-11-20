// Shot-based virtual cinematography.
// A shot = time range + start/end camera (position, look-at, lens) + easing + handheld + focus.
// Shots may also be functions of time for tracking shots that follow a character.
import * as THREE from "three";
import type { Stage } from "../engine/Stage";
import { fbm1, inv, smoother, lerp } from "../utils/math";

export type V = [number, number, number];
export type Cam = { p: V; l: V; mm: number; roll?: number };
export type Shot = {
  a: number; b: number;
  from?: Cam; to?: Cam;
  fn?: (k: number, t: number) => Cam; // custom tracking shot (k = 0..1 progress)
  ease?: (k: number) => number;
  hand?: number;   // handheld amplitude (m)
  focus?: number | ((t: number) => number); // focus distance in metres; default = distance to look-at
  aperture?: number | ((t: number) => number);
  name?: string;   // for the shot list / contact sheet
};

const tmp = new THREE.Vector3();
export function lerpCam(A: Cam, B: Cam, k: number): Cam {
  return {
    p: [lerp(A.p[0], B.p[0], k), lerp(A.p[1], B.p[1], k), lerp(A.p[2], B.p[2], k)],
    l: [lerp(A.l[0], B.l[0], k), lerp(A.l[1], B.l[1], k), lerp(A.l[2], B.l[2], k)],
    mm: lerp(A.mm, B.mm, k), roll: lerp(A.roll ?? 0, B.roll ?? 0, k),
  };
}

export function activeShot(shots: Shot[], t: number) {
  let s = shots[0];
  for (const x of shots) if (t >= x.a) s = x;
  return s;
}

/** Apply the shot list at time t. `impact` = extra shake (0..1) from explosions, footsteps, etc. */
export function applyShots(stage: Stage, shots: Shot[], t: number, impact = 0) {
  const s = activeShot(shots, t);
  const k = (s.ease ?? smoother)(inv(s.a, s.b, t));
  const c = s.fn ? s.fn(k, t) : lerpCam(s.from!, s.to ?? s.from!, k);
  const cam = stage.camera;
  const hand = (s.hand ?? 0.012);
  const sh = impact * 0.06;
  cam.position.set(
    c.p[0] + fbm1(t * 0.7, 1) * hand + fbm1(t * 19, 11) * sh,
    c.p[1] + fbm1(t * 0.6, 2) * hand + fbm1(t * 21, 12) * sh,
    c.p[2] + fbm1(t * 0.5, 3) * hand * 0.5,
  );
  cam.lookAt(tmp.set(c.l[0] + fbm1(t * 0.4, 4) * hand * 0.6, c.l[1] + fbm1(t * 0.45, 5) * hand * 0.6, c.l[2]));
  cam.rotateZ((c.roll ?? 0) + fbm1(t * 0.3, 6) * hand * 0.4 + fbm1(t * 17, 13) * sh * 0.3);
  stage.lens(c.mm);
  cam.updateMatrixWorld(true); // HUD projection needs the current matrices this frame
  const dist = tmp.set(c.l[0] - c.p[0], c.l[1] - c.p[1], c.l[2] - c.p[2]).length();
  const P = stage.post;
  P.focus = s.focus === undefined ? dist : typeof s.focus === "function" ? s.focus(t) : s.focus;
  P.aperture = s.aperture === undefined ? 0 : typeof s.aperture === "function" ? s.aperture(t) : s.aperture;
  return s;
}
