// EPISODE 09 — SYSTEM FAILURE
// 0–5   Neo-Eden begins collapsing digitally (towers derez, citizens freeze and flicker)
// 5–15  Kael reaches the central control room (bridge sprint -> arrival under the core)
// 15–23 E.V.E: "If you shut me down, you will lose everything."
// 23–27 Kael reaches toward the central console
// 27–30 The entire screen turns white
import * as THREE from "three";
import type { Stage } from "../engine/Stage";
import { make, KAEL, EVE } from "../characters/Cast";
import { streetSet } from "../scenes/street";
import { eveCore } from "../environments/Interiors";
import { std } from "../effects/materials";
import { applyShots, Shot } from "../camera/Camera";
import { clamp, ramp, window as win, lerp, smooth, flicker, hash, rng } from "../utils/math";
import { titleBug, mouth } from "./common";

export const meta = { n: 9, title: "SYSTEM FAILURE" };

export const ep09 = (stage: Stage) => {
  const S = stage.scene;
  const set = streetSet(stage, { crowd: 36, seed: 91, eveAd: false });
  const { city } = set;
  // per-building materials so each tower can derez on its own schedule
  const B = city.buildings.map((b, i) => { const m = (b.material as THREE.MeshStandardMaterial).clone(); b.material = m; return { b, m, h: b.scale.y, y0: b.position.y, H0: (b.geometry as THREE.BoxGeometry).parameters.height, tc: 0.4 + hash(i * 3.7) * 4.2 + (b.position.z < -120 ? -0.3 : 0.6) }; });
  // derez particles rising out of the city
  const NP = 5000, pp = new Float32Array(NP * 3), R = rng(9); for (let i = 0; i < NP; i++) pp.set([(R() - 0.5) * 120, R() * 80, -R() * 260], i * 3);
  const pg = new THREE.BufferGeometry(); pg.setAttribute("position", new THREE.BufferAttribute(pp, 3));
  const pm = new THREE.ShaderMaterial({ uniforms: { time: { value: 0 }, k: { value: 0 } },
    vertexShader: `uniform float time; varying float vA; void main(){ vec3 p = position; p.y = mod(p.y + time * (4.0 + fract(p.x) * 6.0), 90.0); vec4 mv = modelViewMatrix * vec4(p, 1.0); vA = fract(p.z * 3.1); gl_PointSize = clamp(240.0 / -mv.z, 1.0, 7.0); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float k; varying float vA; void main(){ vec2 d = abs(gl_PointCoord - 0.5); if (max(d.x, d.y) > 0.45) discard; gl_FragColor = vec4(mix(vec3(0.3, 0.9, 1.0), vec3(1.0, 0.25, 0.3), step(0.7, vA)) * k * 1.5, 1.0); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const derez = new THREE.Points(pg, pm); derez.frustumCulled = false; S.add(derez); stage.timed.push(pm as any);
  // control room (far from the city): dark hall, bridge, console, the core
  const CR = new THREE.Vector3(600, 0, 0);
  const hall = new THREE.Group(); hall.position.copy(CR); S.add(hall);
  const core = eveCore(stage); core.group.position.copy(CR).add(new THREE.Vector3(0, 4, -6));
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.2, 30), std(0x17181f, { metalness: 0.7, roughness: 0.4 })); bridge.position.set(0, -0.1, 12); bridge.receiveShadow = true; hall.add(bridge);
  for (const s of [-1, 1]) { const rl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 30), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x38e8ff).multiplyScalar(2), toneMapped: false })); rl.position.set(s * 1.05, 1.0, 12); hall.add(rl); }
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(4, 4.4, 0.6, 48), std(0x14151c, { metalness: 0.7, roughness: 0.35 })); plat.position.set(0, -0.3, -1); hall.add(plat);
  const console_ = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 0.7), std(0x1a1b24, { metalness: 0.8, roughness: 0.3 })); console_.position.set(0, 0.5, -0.4); console_.rotation.x = -0.25; hall.add(console_);
  const key = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff2a3d).multiplyScalar(2.5), toneMapped: false })); key.position.set(0, 1.03, -0.3); key.rotation.x = -0.25; hall.add(key);
  const keyL = new THREE.PointLight(0xff2a3d, 2, 2, 1.5); keyL.position.set(0, 1.2, -0.25); hall.add(keyL);
  const abyss = new THREE.Mesh(new THREE.CylinderGeometry(40, 40, 60, 48, 1, true), std(0x05050a, { side: THREE.BackSide })); abyss.position.set(0, 10, 0); hall.add(abyss);
  const eveBig = make(EVE); S.add(eveBig.root); eveBig.root.scale.setScalar(3.6); eveBig.root.position.copy(CR).add(new THREE.Vector3(0, -2.2, -5.0));
  const kael = make(KAEL); S.add(kael.root);
  const kpos = (t: number) => {
    if (t < 5) return new THREE.Vector3(0.4, 0, -36 - t * 3.5);
    if (t < 10.2) return CR.clone().add(new THREE.Vector3(0.1, 0, lerp(24, 1.0, smooth((t - 5) / 5.2))));
    return CR.clone().add(new THREE.Vector3(0.1, 0, lerp(1.0, 0.45, smooth((t - 10.2) / 2))));
  };
  const head = () => kael.headPos(new THREE.Vector3());
  const ehead = () => eveBig.headPos(new THREE.Vector3());
  const C = (x: number, y: number, z: number): [number, number, number] => [CR.x + x, CR.y + y, CR.z + z];
  const shots: Shot[] = [
    { a: 0, b: 2.6, name: "Aerial — Neo-Eden derezzes", from: { p: [8, 46, 10], l: [-4, 20, -110], mm: 20 }, to: { p: [6, 42, -4], l: [-4, 16, -120], mm: 20 }, hand: 0.08 },
    { a: 2.6, b: 5, name: "Street — the sky falls apart around him", fn: (k, t) => { const p = kpos(t); return { p: [p.x + 0.4, 0.8, p.z - 3.2], l: [p.x, 3.5, p.z + 4], mm: 20, roll: 0.08 }; }, hand: 0.05 },
    { a: 5, b: 9.5, name: "The bridge — sprint toward the core", fn: (k, t) => { const p = kpos(t); return { p: [p.x + 0.5, 1.4, p.z + 2.6], l: [CR.x, 5, CR.z - 6], mm: 24 }; }, hand: 0.04 },
    { a: 9.5, b: 15, name: "Low wide — the control room", from: { p: C(3.5, 0.5, 6), l: C(0, 4.5, -5), mm: 18 }, to: { p: C(3.0, 0.45, 5.2), l: C(0, 5, -5), mm: 18 }, hand: 0.015 },
    { a: 15, b: 19, name: "E.V.E rises from the core", fn: (k) => { const e = ehead(); return { p: [CR.x + 1.2, 1.0, CR.z + 3.2], l: [e.x, lerp(e.y - 2, e.y, smooth(k)), e.z], mm: 22 }; }, hand: 0.015 },
    { a: 19, b: 23, name: "CU Kael — he doesn't stop", fn: (k) => { const h = head(); return { p: [h.x - 0.35, h.y - 0.05, h.z + 0.6], l: [h.x, h.y, h.z], mm: 50 }; }, hand: 0.006, aperture: 4 },
    { a: 23, b: 27, name: "His hand — the console", fn: (k) => { const kp = new THREE.Vector3(CR.x, 1.03, CR.z - 0.3); return { p: [kp.x + 0.55, kp.y + 0.35, kp.z + lerp(0.75, 0.55, smooth(k))], l: [kp.x, kp.y, kp.z], mm: 40 }; }, hand: 0.004, aperture: 5 },
    { a: 27, b: 30, name: "WHITE", fn: () => ({ p: C(0.5, 1.4, 0.9), l: C(0, 1.0, -0.3), mm: 40 }), hand: 0 },
  ];

  return (t: number) => {
    const P = stage.post; const inCity = t < 5;
    city.group.visible = inCity; set.people.list.forEach((w) => (w.h.root.visible = inCity && flicker(t, 9, 0.7 + 0.3 * (1 - ramp(t, 2.5, 4.5)), w.x * 10) > 0)); derez.visible = inCity;
    set.rain.lines.visible = inCity; set.splash.visible = inCity; hall.visible = !inCity; core.group.visible = !inCity; eveBig.root.visible = !inCity && t > 14.6;
    city.update(t + 90); set.people.update(t + 90, 1 - ramp(t, 1.5, 2.2));
    // derez: wireframe flicker -> sink -> vanish
    for (const x of B) { const k = clamp((t - x.tc) / 1.6); x.m.wireframe = k > 0 && k < 1 && flicker(t, 14, 0.5, x.tc * 10) === 1; x.b.scale.y = Math.max(0.001, x.h * (1 - k * k)); x.b.position.y = x.y0 - x.H0 * (1 - x.b.scale.y) / 2; x.m.emissiveIntensity = 1.25 + 3 * win(k, 0, 0.8, 0.3); x.m.emissive.setHex(k > 0.1 ? 0xff6070 : 0xffffff); }
    pm.uniforms.k.value = ramp(t, 0.3, 1.5);
    // Kael
    kael.reset(); const kp = kpos(t); kael.root.position.copy(kp); kael.root.rotation.y = Math.PI;
    if (t < 10.4) kael.run(t * 1.5, 1 - ramp(t, 9.6, 10.4)); else kael.idle(t);
    if (t >= 10.4 && t < 23) kael.look(0, -0.45);
    const reach = smooth(clamp((t - 23.2) / 3.4)); if (t > 23) { kael.reach(1, 0.75 * reach, 0.4); kael.spine.rotation.x += 0.2 * reach; kael.look(0, 0.35 * reach); }
    kael.s.frown = 0.6; kael.s.squint = t > 19 ? 0.35 : 0.15; kael.autoBlink(t, 2); kael.applyFace();
    set.follow(kp);
    // core + E.V.E
    const redK = ramp(t, 19, 26); core.update(t, 1 - 0.3 * ramp(t, 25, 27) * flicker(t, 15, 0.5), redK);
    eveBig.reset(); eveBig.idle(t); eveBig.look(0, 0.35); eveBig.s.mouth = mouth("e09_l1", t); eveBig.s.frown = 0.4 + 0.4 * redK; eveBig.s.squint = 0.2 + 0.3 * redK; eveBig.autoBlink(t, 6);
    eveBig.reach(0, 0.35 * win(t, 15.5, 20, 0.8)); eveBig.reach(1, 0.35 * win(t, 15.5, 20, 0.8));
    eveBig.applyFace(); eveBig.setHolo(t, 0.05 + redK * 0.3 * flicker(t, 9, 0.5), 0.9 * ramp(t, 14.6, 15.6), 1 - ramp(t, 14.6, 16));
    (key.material as THREE.MeshBasicMaterial).color.setHex(0xff2a3d).multiplyScalar(2.5 + 2 * Math.sin(t * 6)); keyL.intensity = 2 + reach * 4;
    applyShots(stage, shots, t, (inCity ? 0.5 + 0.5 * flicker(t, 6, 0.5) : 0) * (t < 5 ? 0.6 : 0) + win(t, 26.6, 27, 0.05));
    P.exposure = 1.15; P.bloom = inCity ? 1.25 : 1.1; P.bloomThreshold = 0.5; P.grain = 0.06; P.vignette = 0.65;
    P.glitch = inCity ? 0.25 + 0.5 * flicker(t, 5, 0.5) * ramp(t, 0.5, 2) : win(t, 26.4, 26.95, 0.1) * 0.8; P.glitchSeed = Math.floor(t * 30);
    P.ca = 0.002 + P.glitch * 0.007; P.tintAmt = inCity ? 0.12 * flicker(t, 4, 0.5) : redK * 0.08; P.tint.setRGB(1, 0.25, 0.3);
    P.flash = t >= 27.0 ? 1 : win(t, 26.75, 27.0, 0.2) * 0.8;   // THE ENTIRE SCREEN TURNS WHITE
    titleBug(stage, t, 9, "SYSTEM FAILURE", 0.3, 2.6);
  };
};
