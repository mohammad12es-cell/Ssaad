// EPISODE 05 — DR. VEX
// 0–6   Kael enters an abandoned underground laboratory (silhouette in the doorway, lights stutter on)
// 6–15  He discovers a holographic recording of Dr. Vex (projector wakes, hologram materialises)
// 15–22 "If you're watching this, the experiment has started again."
// 22–27 A hidden door opens
// 27–30 A giant screen turns on: PROJECT HUMANITY
import * as THREE from "three";
import type { Stage } from "../engine/Stage";
import { make, KAEL, VEX_HOLO } from "../characters/Cast";
import { industrialRoom, terminal, projector, blastDoor, wallScreen } from "../environments/Interiors";
import { neonRig } from "../environments/Lighting";
import { motes } from "../effects/Rain";
import { std } from "../effects/materials";
import { applyShots, Shot } from "../camera/Camera";
import { clamp, ramp, window as win, lerp, smooth, flicker, hash, rng } from "../utils/math";
import { titleBug, mouth } from "./common";

export const meta = { n: 5, title: "DR. VEX" };

export const ep05 = (stage: Stage) => {
  const S = stage.scene;
  const L = neonRig(stage, { fogDensity: 0.045, fog: 0x08090f, env: 0.3 }); L.key.intensity = 0; L.accent.intensity = 0; L.fill.intensity = 0.12; L.rim.intensity = 0.4;
  const room = industrialRoom(stage, { w: 13, d: 18, h: 5, tubes: 6, seed: 5, base: "#1e1f27", backHole: [3.4, 3.7] });
  const dust = motes(stage, { count: 1400, box: [12, 5, 17], center: [0, 2.5, 0], color: 0x9fc0ff, size: 2.4 });
  // abandoned lab furniture: benches, toppled chairs, dead monitors, papers
  const R = rng(55);
  for (let i = 0; i < 6; i++) {
    const s = i % 2 ? 1 : -1, z = 4 - Math.floor(i / 2) * 4.2;
    const b = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.08, 1.1), std(0x2a2c34, { metalness: 0.6, roughness: 0.5 })); b.position.set(s * 4, 0.95, z); b.castShadow = b.receiveShadow = true; S.add(b);
    for (const x of [-1.4, 1.4]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.95, 0.9), std(0x1a1b22, { metalness: 0.7 })); l.position.set(s * 4 + x, 0.47, z); S.add(l); }
    for (let k = 0; k < 3; k++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.38, 0.06), std(0x101116, { roughness: 0.3, metalness: 0.5 })); m.position.set(s * 4 - 1 + k, 1.2, z - 0.35); m.rotation.set(R() * 0.3, (R() - 0.5) * 0.6, (R() - 0.5) * 0.4); m.castShadow = true; S.add(m); }
    for (let k = 0; k < 6; k++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.29), std(0x9a968a, { roughness: 0.9 })); p.rotation.set(-Math.PI / 2, 0, R() * 6); p.position.set(s * (2 + R() * 3), 0.005, z + R() * 2); S.add(p); }
  }
  const t1 = terminal(stage); t1.group.position.set(-4.5, 0, -5.8); t1.group.rotation.y = 0.5;
  // entrance (front wall gap) lit from the corridor
  const corridor = new THREE.SpotLight(0x6fb8ff, 80, 22, 0.5, 0.6, 1.2); corridor.position.set(0, 2.4, 11); corridor.target.position.set(0, 0.5, 3); corridor.castShadow = true; S.add(corridor, corridor.target);
  const doorway = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x6fb8ff).multiplyScalar(0.8), toneMapped: false })); doorway.position.set(0, 1.6, 8.99); doorway.rotation.y = Math.PI; S.add(doorway);
  // projector + Vex hologram
  const proj = projector(stage); proj.group.position.set(0, 0, -2.5);
  const vex = make(VEX_HOLO); S.add(vex.root); vex.root.position.set(0, 0.36, -2.5);
  // hidden door in the back wall + the giant screen beyond it
  const door = blastDoor(stage, 3.2, 3.6, 0xff2a3d); door.group.position.set(0, 0, -8.85);
  const beyond = new THREE.Mesh(new THREE.BoxGeometry(14, 8, 10), std(0x050508, { side: THREE.BackSide })); beyond.position.set(0, 4, -14); S.add(beyond);
  const big = wallScreen(stage, 7.5, 4.2, 1280); big.group.position.set(0, 3.4, -17.5);
  const bigL = new THREE.PointLight(0xff3040, 0, 18, 1.2); bigL.position.set(0, 3, -13); S.add(bigL);
  const kael = make(KAEL); S.add(kael.root);
  const holoL = new THREE.PointLight(0x7feaff, 0, 6, 1.3); holoL.position.set(0, 1.8, -1.6); S.add(holoL);

  const kpos = (t: number) => {
    if (t < 1.2) return new THREE.Vector3(0.2, 0, 8.6);
    if (t < 7.5) return new THREE.Vector3(lerp(0.2, 0.55, smooth((t - 1.2) / 6.3)), 0, lerp(8.6, 0.0, smooth((t - 1.2) / 6.3)));
    return new THREE.Vector3(0.55, 0, 0.0);
  };
  const head = () => kael.headPos(new THREE.Vector3());
  const vhead = () => vex.headPos(new THREE.Vector3());
  const shots: Shot[] = [
    { a: 0, b: 3, name: "Silhouette in the doorway", from: { p: [-1.2, 1.3, -1], l: [0.2, 1.6, 8.6], mm: 30 }, to: { p: [-1.0, 1.35, -0.4], l: [0.2, 1.55, 8.2], mm: 32 }, hand: 0.01 },
    { a: 3, b: 6, name: "High wide — the lab wakes, tube by tube", from: { p: [5.5, 4.4, 7.5], l: [-1, 0.6, -3], mm: 22 }, to: { p: [5.2, 4.2, 6.6], l: [-1, 0.6, -3.5], mm: 22 }, hand: 0.015 },
    { a: 6, b: 10, name: "The projector — dust, a hand, a flicker", fn: (k) => ({ p: [1.2, 1.0, -0.8 - k * 0.2], l: [0, 0.4, -2.5], mm: 40 }), hand: 0.008, aperture: 5 },
    { a: 10, b: 15, name: "Low angle — Dr. Vex materialises", fn: (k) => { const v = vhead(); return { p: [1.1, 0.65, -0.2 + k * 0.2], l: [v.x, v.y - 0.25, v.z], mm: 28 }; }, hand: 0.01 },
    { a: 15, b: 19.5, name: "MCU Vex — the message", fn: (k) => { const v = vhead(); return { p: [v.x + 0.25, v.y - 0.02, v.z + 1.15 - k * 0.15], l: [v.x, v.y - 0.04, v.z], mm: 45 }; }, hand: 0.006, aperture: 3 },
    { a: 19.5, b: 22, name: "Reverse — Kael listens, hologram light on his face", fn: (k) => { const h = head(); return { p: [h.x - 0.25, h.y + 0.02, h.z - 0.75], l: [h.x, h.y, h.z], mm: 50 }; }, hand: 0.006, aperture: 4 },
    { a: 22, b: 27, name: "Behind Kael — the hidden door opens", fn: (k) => ({ p: [1.6, 1.5, 2.6 - k * 0.6], l: [0, 1.8, -9], mm: 26 }), hand: 0.015 },
    { a: 27, b: 30, name: "Push through — PROJECT HUMANITY", fn: (k) => ({ p: [0.4, 2.2, lerp(-2.0, -6.5, smooth(k))], l: [0, 3.2, -17.5], mm: 30 }), hand: 0.01 },
  ];

  return (t: number) => {
    const P = stage.post;
    // power comes back tube by tube as he walks in (3–6s)
    room.tubes.forEach((tb, i) => { const on = ramp(t, 3 + i * 0.45, 3.1 + i * 0.45) * (t < 3.6 + i * 0.45 ? flicker(t, 16, 0.5, i) : (hash(i) < 0.3 ? flicker(t, 9, 0.85, i) : 1)); (tb.m.material as THREE.MeshBasicMaterial).color.setHex(0xbfe6ff).multiplyScalar(0.05 + 2.2 * on); if (tb.l) tb.l.intensity = 7 * on; });
    // Kael
    kael.reset(); const kp = kpos(t); kael.root.position.copy(kp); kael.root.rotation.y = Math.PI + (t > 22.3 ? 0.0 : 0) ;
    if (t >= 1.2 && t < 7.5) kael.walk((t - 1.2) / 1.25, 0.8); else kael.idle(t);
    if (t >= 7.5 && t < 10) { const r = win(t, 7.6, 9.8, 0.5); kael.crouch(0.25 * r); kael.reach(1, r, 0.6); kael.look(0, 0.5); }
    if (t >= 10 && t < 22) kael.look(0, -0.12);
    if (t >= 22.3) { kael.look(-0.2 * ramp(t, 22.3, 23), 0.0); }
    kael.s.browUp = t > 10 && t < 22 ? 0.4 : 0; kael.s.squint = t > 22 ? 0.3 : 0; kael.autoBlink(t, 11); kael.s.gy = t >= 10 && t < 22 ? 0.3 : 0; kael.applyFace();
    // projector + hologram
    const on = ramp(t, 8.6, 9.2) * (t < 10 ? flicker(t, 18, 0.6) : 1) * (t > 21.6 ? 1 - ramp(t, 21.6, 22.4) * 0.7 : 1);
    proj.set(on, t);
    const mat = 1 - ramp(t, 10.0, 12.5); // materialise
    vex.reset(); vex.idle(t); vex.root.rotation.y = 0.1; vex.look(0.12, 0.05); vex.autoBlink(t, 2);
    vex.s.mouth = mouth("e05_l1", t); vex.s.frown = 0.4; vex.s.browUp = 0.3 + 0.3 * Math.max(0, Math.sin(t * 1.3));
    if (t > 15.3 && t < 19.5) { vex.reach(0, 0.35 + 0.15 * Math.sin(t * 2), 0); vex.sh[0].rotation.z += 0.2; }
    vex.applyFace(); vex.setHolo(t, (t < 12.5 ? 0.35 * mat + 0.1 : 0.04) + win(t, 21.6, 22.0, 0.05) * 0.6, on * 0.95, mat * 0.95);
    vex.root.visible = t >= 9.8;
    holoL.intensity = on * (t >= 9.8 ? 5 : 1);
    // hidden door + giant screen
    door.open(smooth(clamp((t - 22.4) / 3.2)));
    const sOn = ramp(t, 27.2, 27.4) * (t < 27.8 ? flicker(t, 20, 0.5) : 1);
    { const { g, c } = big.scr; g.fillStyle = "#000"; g.fillRect(0, 0, c.width, c.height);
      if (sOn > 0) { g.globalAlpha = sOn; g.fillStyle = "#14020a"; g.fillRect(0, 0, c.width, c.height); g.strokeStyle = "#ff2a3d"; g.lineWidth = 6; g.shadowColor = "#ff2a3d"; g.shadowBlur = 30; g.strokeRect(30, 30, c.width - 60, c.height - 60);
        g.textAlign = "center"; g.fillStyle = "#ffffff"; g.font = "900 118px Orbitron"; g.fillText("PROJECT", c.width / 2, c.height * 0.43); g.fillStyle = "#ff3a4a"; g.fillText("HUMANITY", c.width / 2, c.height * 0.66);
        g.font = "600 30px Rajdhani"; g.fillStyle = "#ff8a94"; g.shadowBlur = 8; g.fillText("CLASSIFIED · VEX, A. · LEVEL OMEGA", c.width / 2, c.height * 0.84);
        for (let y = 0; y < c.height; y += 5) { g.globalAlpha = 0.18; g.fillStyle = "#000"; g.fillRect(0, y, c.width, 2); } g.globalAlpha = 1; g.shadowBlur = 0; }
      big.scr.commit(); }
    bigL.intensity = sOn * 16;
    // camera & post
    applyShots(stage, shots, t, win(t, 22.4, 22.8, 0.05) * 0.4 + win(t, 27.2, 27.5, 0.05) * 0.5);
    P.exposure = 1.25; P.bloom = 1.0; P.bloomThreshold = 0.55; P.grain = 0.06; P.vignette = 0.7;
    P.lift.setRGB(0.008, 0.01, 0.03); P.gain.setRGB(0.98, 1.0, 1.06);
    P.glitch = win(t, 9.9, 10.2, 0.03) * 0.5 + win(t, 27.15, 27.45, 0.03) * 0.6; P.glitchSeed = Math.floor(t * 30); P.ca = 0.0016 + P.glitch * 0.005;
    P.tintAmt = t > 22.4 ? 0.08 * ramp(t, 22.4, 23) : 0; P.tint.setRGB(1, 0.25, 0.3);
    P.fade = t >= 29.85 ? 1 : 0;
    dust.visible = true;
    titleBug(stage, t, 5, "DR. VEX", 0.3, 2.7);
  };
};
