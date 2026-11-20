// EPISODE 07 — NOT HUMAN
// 0–6   E.V.E appears directly in front of Kael (particles converge, hologram resolves)
// 6–15  "You were never supposed to remember."
// 15–22 Kael: "What am I?"
// 22–27 E.V.E's holographic face begins to glitch
// 27–30 "You are the only variable I cannot control."
import * as THREE from "three";
import type { Stage } from "../engine/Stage";
import { make, KAEL, EVE } from "../characters/Cast";
import { chamber } from "../environments/Interiors";
import { neonRig } from "../environments/Lighting";
import { motes } from "../effects/Rain";
import { applyShots, Shot } from "../camera/Camera";
import { glow } from "../engine/textures";
import { clamp, ramp, window as win, lerp, smooth, flicker, rng } from "../utils/math";
import { titleBug, mouth } from "./common";

export const meta = { n: 7, title: "NOT HUMAN" };

export const ep07 = (stage: Stage) => {
  const S = stage.scene;
  const L = neonRig(stage, { fogDensity: 0.02, fog: 0x05060e, env: 0.3 }); L.key.intensity = 0; L.accent.intensity = 0; L.fill.intensity = 0.1; L.rim.intensity = 0.6;
  const ch = chamber(stage, { R: 18, H: 34 }); ch.set(1);
  const wallL = new THREE.PointLight(0x5fd8ff, 22, 50, 1.0); wallL.position.set(0, 6, 0); S.add(wallL);
  motes(stage, { count: 1200, box: [24, 12, 24], center: [0, 3, 0], color: 0x7fc8ff, size: 3 });
  const kael = make(KAEL); S.add(kael.root); kael.root.position.set(0.0, 0, 1.6); kael.root.rotation.y = Math.PI;
  const eve = make(EVE); S.add(eve.root); eve.root.position.set(0, 0.04, 0.35);
  const eveL = new THREE.PointLight(0x7feaff, 0, 5, 1.3); S.add(eveL);
  // materialisation particles: converge from a sphere onto her silhouette
  const NP = 2500, R = rng(77), src = new Float32Array(NP * 3), dst = new Float32Array(NP * 3);
  for (let i = 0; i < NP; i++) { const a = R() * 6.28, b = Math.acos(2 * R() - 1), r = 3 + R() * 4; src.set([Math.sin(b) * Math.cos(a) * r, 1 + Math.cos(b) * r * 0.6 + 1.5, Math.sin(b) * Math.sin(a) * r], i * 3); dst.set([(R() - 0.5) * 0.45, R() * 1.75, (R() - 0.5) * 0.25], i * 3); }
  const pg = new THREE.BufferGeometry(); pg.setAttribute("position", new THREE.BufferAttribute(src, 3)); pg.setAttribute("dst", new THREE.BufferAttribute(dst, 3));
  const pm = new THREE.ShaderMaterial({ uniforms: { k: { value: 0 }, time: { value: 0 }, map: { value: glow("#7feaff") }, o: { value: new THREE.Vector3(0, 0.04, 0.35) } },
    vertexShader: `uniform float k, time; uniform vec3 o; attribute vec3 dst; varying float vA; void main(){ float kk = clamp(k * 1.2 - fract(position.x * 13.7) * 0.2, 0.0, 1.0); vec3 p = mix(position + o, dst + o, kk * kk * (3.0 - 2.0 * kk)); p += vec3(sin(time * 3.0 + position.y * 9.0), 0.0, cos(time * 2.0 + position.x * 7.0)) * 0.02 * (1.0 - kk);
      vec4 mv = modelViewMatrix * vec4(p, 1.0); vA = (1.0 - kk * 0.85); gl_PointSize = 14.0 / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform sampler2D map; varying float vA; void main(){ gl_FragColor = vec4(texture2D(map, gl_PointCoord).rgb * vA * 1.4, 1.0); }`, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const parts = new THREE.Points(pg, pm); parts.frustumCulled = false; S.add(parts); stage.timed.push(pm as any);

  const head = () => kael.headPos(new THREE.Vector3());
  const ehead = () => eve.headPos(new THREE.Vector3());
  const shots: Shot[] = [
    { a: 0, b: 3, name: "OTS — light gathers in front of him", fn: (k) => { const h = head(); return { p: [h.x + 0.5, h.y + 0.05, h.z + 1.0], l: [0, 1.3, 0.3], mm: 30 }; }, hand: 0.01 },
    { a: 3, b: 6, name: "MCU — E.V.E resolves, eyes open", fn: (k) => { const e = ehead(); return { p: [e.x - 0.15, e.y, e.z + 0.95 - k * 0.15], l: [e.x, e.y - 0.02, e.z], mm: 45 }; }, hand: 0.005, aperture: 3 },
    { a: 6, b: 10, name: "CU E.V.E — \"never supposed to remember\"", fn: (k) => { const e = ehead(); return { p: [e.x + 0.2, e.y + 0.02, e.z + 0.62 - k * 0.06], l: [e.x, e.y, e.z], mm: 50 }; }, hand: 0.004, aperture: 4 },
    { a: 10, b: 15, name: "Orbit two-shot — she circles him", fn: (k) => { const a = lerp(-0.4, 1.0, smooth(k)); return { p: [Math.sin(a) * 2.4, 1.55, 1.0 + Math.cos(a) * 2.4], l: [0, 1.5, 1.0], mm: 32 }; }, hand: 0.01 },
    { a: 15, b: 18, name: "CU Kael — \"What am I?\"", fn: (k) => { const h = head(); return { p: [h.x - 0.2, h.y + 0.01, h.z - 0.55], l: [h.x, h.y, h.z], mm: 55 }; }, hand: 0.004, aperture: 4 },
    { a: 18, b: 22, name: "E.V.E — silence, the chamber flickers", fn: (k) => { const e = ehead(); return { p: [e.x + 0.35, e.y - 0.05, e.z + 0.75], l: [e.x, e.y, e.z], mm: 45 }; }, hand: 0.005, aperture: 3 },
    { a: 22, b: 27, name: "ECU — her face fractures", fn: (k) => { const e = ehead(); return { p: [e.x + 0.05, e.y + 0.01, e.z + lerp(0.42, 0.32, smooth(k))], l: [e.x, e.y + 0.005, e.z], mm: 50 }; }, hand: 0.004 },
    { a: 27, b: 30, name: "Two-shot — the only variable", fn: (k) => ({ p: [2.0 - k * 0.3, 1.45, 0.95], l: [0, 1.5, 0.95], mm: 35 }), hand: 0.008 },
  ];

  return (t: number) => {
    const P = stage.post;
    const form = smooth(clamp((t - 0.4) / 3.2)); pm.uniforms.k.value = form; parts.visible = t < 5;
    // E.V.E
    eve.reset(); eve.idle(t);
    const circ = smooth(clamp((t - 10) / 5)); const ang = lerp(0, 1.25, circ) * (1 - ramp(t, 15, 17) * 0.25);
    eve.root.position.set(Math.sin(ang) * 1.25, 0.04, 1.6 - Math.cos(ang) * 1.25); eve.root.rotation.y = ang;
    if (t > 10 && t < 15) eve.walk((t - 10) / 1.6, 0.5 * win(t, 10, 15, 0.8));
    eve.look(t > 17.5 && t < 22 ? 0.12 : 0, t > 17.5 && t < 22 ? 0.05 : 0); eve.head.rotation.z = t > 17.5 && t < 22 ? 0.12 * ramp(t, 17.5, 18.5) : 0;
    eve.s.mouth = Math.max(mouth("e07_l1", t), mouth("e07_l3", t)); eve.s.squint = t > 22 ? 0.3 : 0.1; eve.s.browUp = t > 17 && t < 22 ? 0.4 : 0;
    eve.autoBlink(t, 4); if (t < 4.4) eve.s.blink = 1 - ramp(t, 3.9, 4.4);
    eve.applyFace();
    const gl = ramp(t, 22.2, 24) * (0.35 + 0.65 * flicker(t, 7, 0.5)) * (t > 29.2 ? 1.6 : 1);
    eve.setHolo(t, gl + 0.03, ramp(t, 1.2, 3.6), (1 - ramp(t, 1.6, 3.8)) + gl * 0.25 * flicker(t, 11, 0.6, 3));
    eveL.position.copy(eve.root.position).y += 1.6; eveL.position.z += 0.4; eveL.intensity = form * 4 * (1 - 0.5 * gl);
    // Kael
    kael.reset(); kael.idle(t); kael.root.rotation.y = Math.PI + (t > 10 ? -ang * 0.85 : 0);
    kael.look(0, -0.08); kael.s.mouth = mouth("e07_l2", t); kael.s.frown = t > 15 && t < 18 ? 0.7 : 0.3; kael.s.browUp = t < 6 ? 0.6 : 0; kael.s.squint = t > 22 ? 0.35 : 0;
    kael.autoBlink(t, 12); kael.applyFace();
    // chamber flickers in sympathy with her
    ch.set(1 - 0.5 * win(t, 18.5, 21.5, 0.3) * flicker(t, 6, 0.4)); wallL.intensity = 22 * (1 - 0.4 * gl);
    applyShots(stage, shots, t, gl * 0.15);
    P.exposure = 1.15; P.bloom = 1.15; P.bloomThreshold = 0.5; P.grain = 0.055; P.vignette = 0.72;
    P.lift.setRGB(0.006, 0.01, 0.04); P.gain.setRGB(0.95, 1.0, 1.1);
    P.glitch = gl * 0.35 + win(t, 29.75, 30, 0.02); P.glitchSeed = Math.floor(t * 24); P.ca = 0.0017 + gl * 0.006;
    P.fade = t >= 29.85 ? 1 : 0;
    titleBug(stage, t, 7, "NOT HUMAN", 0.3, 2.8);
  };
};
