// EPISODE 06 — THE TRUTH
// 0–5   Kael explores a massive underground chamber (extreme wide, tiny figure on the catwalk)
// 5–15  Thousands of human consciousness signatures light up on holographic displays
// 15–23 Dr. Vex's recording continues: "Neo-Eden was never built to save humanity."
// 23–27 Kael discovers thousands of identical city simulations (crane over the railing into the abyss)
// 27–30 He whispers: "How many times?"
import * as THREE from "three";
import type { Stage } from "../engine/Stage";
import { make, KAEL, VEX_HOLO } from "../characters/Cast";
import { chamber, simulationField, projector } from "../environments/Interiors";
import { neonRig } from "../environments/Lighting";
import { motes } from "../effects/Rain";
import { applyShots, Shot } from "../camera/Camera";
import { clamp, ramp, window as win, lerp, smooth, flicker } from "../utils/math";
import { titleBug, mouth } from "./common";

export const meta = { n: 6, title: "THE TRUTH" };

export const ep06 = (stage: Stage) => {
  const S = stage.scene;
  const L = neonRig(stage, { fogDensity: 0.012, fog: 0x05060e, env: 0.3 }); L.key.intensity = 0; L.accent.intensity = 0; L.fill.intensity = 0.1; L.rim.intensity = 0.8;
  const ch = chamber(stage, { R: 18, H: 34 });
  const sims = simulationField(stage, { nx: 44, nz: 64, gap: 2.5, y: -30 }); sims.group.position.set(0, 0, 70);
  const up = new THREE.PointLight(0x4a7dff, 0, 60, 1.0); up.position.set(0, -12, 0); S.add(up);
  const dust = motes(stage, { count: 1500, box: [30, 20, 30], center: [0, 4, 0], color: 0x7fc8ff, size: 3 });
  const proj = projector(stage); proj.group.position.set(0, -0.05, -1.5);
  const vex = make(VEX_HOLO); S.add(vex.root); vex.root.position.set(0, 0.3, -1.5); vex.root.scale.setScalar(2.1);
  const kael = make(KAEL); S.add(kael.root);
  const wallL = new THREE.PointLight(0x5fd8ff, 0, 50, 1.0); wallL.position.set(0, 6, 0); S.add(wallL);
  const faceL = new THREE.PointLight(0x7fc8ff, 0, 3, 1.5); S.add(faceL);

  const kpos = (t: number) => {
    if (t < 9) return new THREE.Vector3(0.1, 0, lerp(14, 6.5, smooth(t / 9)));
    if (t < 23) return new THREE.Vector3(0.1, 0, lerp(6.5, 3.6, smooth((t - 9) / 6)));
    return new THREE.Vector3(lerp(0.1, 0.55, smooth((t - 23) / 1.2)), 0, 3.6);
  };
  const head = () => kael.headPos(new THREE.Vector3());
  const shots: Shot[] = [
    { a: 0, b: 5, name: "Extreme wide — a tiny figure in the abyss", from: { p: [-10, 9, 11], l: [0, -2, 6], mm: 18 }, to: { p: [-9, 7.5, 10], l: [0, -1, 5], mm: 18 }, hand: 0.03 },
    { a: 5, b: 10, name: "Low on the catwalk — the walls ignite", fn: (k, t) => { const p = kpos(t); return { p: [p.x + 0.6, 0.35, p.z + 2.2], l: [p.x - 3, lerp(2, 14, smooth(k)), p.z - 12], mm: 20 }; }, hand: 0.015 },
    { a: 10, b: 15, name: "Signatures — thousands of minds", fn: (k) => { const a = lerp(-0.4, -0.15, k); return { p: [Math.cos(a) * 14, 3.5, Math.sin(a) * 14], l: [Math.cos(a + 0.25) * 18, 4.5 + k, Math.sin(a + 0.25) * 18], mm: 30 }; }, hand: 0.015, aperture: 4, focus: 4.5 },
    { a: 15, b: 19, name: "OTS — the recording continues", fn: (k) => { const h = head(); return { p: [h.x + 0.55, h.y + 0.1, h.z + 1.2], l: [0, 3.2, -1.5], mm: lerp(26, 28, k) }; }, hand: 0.01 },
    { a: 19, b: 23, name: "Low angle — Vex looms over the city of minds", fn: (k) => ({ p: [1.2 - k * 0.6, 0.5, 1.8], l: [0, 3.4, -1.5], mm: 22 }), hand: 0.01 },
    { a: 23, b: 27, name: "Crane over the railing — the simulations", fn: (k) => { const h = head(); const q = smooth(k); return { p: [lerp(h.x + 0.4, 2.6, q), lerp(h.y + 0.2, 3.5, q), lerp(h.z + 0.8, 4.5, q)], l: [lerp(1.5, 1.5, q), lerp(0, -28, q), lerp(h.z - 2, 60, q)], mm: lerp(26, 22, q) }; }, hand: 0.015 },
    { a: 27, b: 30, name: "CU — \"How many times?\"", fn: (k) => { const h = head(); return { p: [h.x + 0.45, h.y - 0.12, h.z - 0.35], l: [h.x, h.y - 0.02, h.z], mm: 50 }; }, hand: 0.005, aperture: 4 },
  ];

  return (t: number) => {
    const P = stage.post;
    const reveal = smooth(clamp((t - 5.2) / 8)); ch.set(reveal); wallL.intensity = reveal * 30;
    // Kael
    kael.reset(); const kp = kpos(t); kael.root.position.copy(kp); kael.root.rotation.y = Math.PI + (t > 23 ? -0.9 * ramp(t, 23, 24) : 0);
    const walking = t < 9 || (t > 9 && t < 15);
    if (walking) kael.walk(t / 1.25, t < 9 ? 0.7 : 0.4 * (1 - ramp(t, 13, 15))); else kael.idle(t);
    if (t > 5 && t < 15) kael.look(Math.sin(t * 0.6) * 0.6, -0.4);
    if (t >= 15 && t < 23) kael.look(0, -0.35);
    if (t >= 23) { kael.look(0.2, 0.75 * ramp(t, 23.2, 24)); kael.spine.rotation.x += 0.3 * ramp(t, 23.2, 24); kael.reach(0, 0.4 * ramp(t, 23, 24), 0.8); kael.reach(1, 0.4 * ramp(t, 23, 24), 0.8); }
    if (t >= 27) { kael.look(0.15, 0.45); }
    kael.s.mouth = mouth("e06_l2", t) * 0.7; kael.s.browUp = t > 23 ? 0.7 : t > 5 ? 0.4 : 0; kael.s.squint = t > 27 ? 0.25 : 0; kael.s.gy = t > 23 ? -0.5 : t > 5 ? 0.4 : 0;
    kael.autoBlink(t, 6); kael.applyFace();
    // Vex recording (resumes at ~14.5)
    const on = ramp(t, 14.2, 14.8) * (t < 15 ? flicker(t, 18, 0.6) : 1);
    proj.set(on, t); vex.root.visible = t > 14.2;
    vex.reset(); vex.idle(t); vex.look(0.0, 0.18); vex.s.mouth = mouth("e06_l1", t); vex.s.frown = 0.6; vex.autoBlink(t, 8);
    if (t > 15.5 && t < 21) { const g = win(t, 15.5, 21, 0.6); vex.reach(0, 0.5 * g, 0); vex.reach(1, 0.3 * g, 0); vex.sh[0].rotation.z += 0.5 * g; vex.sh[1].rotation.z -= 0.4 * g; }
    vex.applyFace(); vex.setHolo(t, 0.05 + win(t, 14.2, 15, 0.1) * 0.4, on * 0.85, (1 - ramp(t, 14.2, 15.4)) * 0.9);
    // simulations glow from below
    up.intensity = ramp(t, 22.6, 24) * 40; sims.group.visible = t > 20;
    faceL.position.copy(head()).add(new THREE.Vector3(0.3, -0.6, -0.4)); faceL.intensity = t > 23 ? 3 : 0; faceL.color.setHex(0x6a8cff);
    dust.visible = true;
    applyShots(stage, shots, t, 0);
    P.exposure = 1.2; P.bloom = 1.15; P.bloomThreshold = 0.5; P.grain = 0.055; P.vignette = 0.7;
    P.lift.setRGB(0.006, 0.008, 0.035); P.gain.setRGB(0.96, 1.0, 1.1);
    P.glitch = win(t, 14.2, 14.45, 0.03) * 0.4 + win(t, 29.8, 30, 0.02); P.glitchSeed = Math.floor(t * 30); P.ca = 0.0017 + P.glitch * 0.005;
    P.fade = t >= 29.85 ? 1 : 0;
    titleBug(stage, t, 6, "THE TRUTH", 0.3, 2.8);
  };
};
