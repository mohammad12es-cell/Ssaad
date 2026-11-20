// EPISODE 01 — NO SIGNAL
// 0–3   ECU Kael's eye, a digital reflection glitches across the pupil
// 3–10  Crane reveal of Neo-Eden at night: towers, flying traffic, rain, the network of connected citizens
// 10–20 Kael walks through the crowd: every citizen has a glowing neural link behind the ear. Kael does not.
// 20–26 A surveillance drone descends and scans him (drone POV scanner)
// 26–30 The drone displays "UNKNOWN HUMAN DETECTED". Cut to black.
import * as THREE from "three";
import type { Stage } from "../engine/Stage";
import { make, KAEL, citizen } from "../characters/Cast";
import { Human } from "../characters/Human";
import { Drone } from "../characters/Machines";
import { crowd } from "../characters/Crowd";
import { buildCity } from "../environments/City";
import { neonRig } from "../environments/Lighting";
import { rain, splashes } from "../effects/Rain";
import { applyShots, Shot } from "../camera/Camera";
import { LiveCanvas } from "../engine/textures";
import { clamp, ramp, window as win, hash, lerp, smooth, flicker, easeOut, easeIn } from "../utils/math";
import { HUD, project, titleBug } from "./common";

export const meta = { n: 1, title: "NO SIGNAL" };

export const ep01 = (stage: Stage) => {
  const S = stage.scene;
  const L = neonRig(stage, { fogDensity: 0.016, fog: 0x0e0a26, env: 0.45 });
  L.fill.intensity = 0.25; L.key.intensity = 26; L.key.angle = 0.45; L.rim.intensity = 2.6;
  const city = buildCity(stage, {});
  const people = crowd(stage, { n: 46, zMin: -62, zMax: -4, seed: 11 });
  for (const w of people.list) if (w.x > -0.5 && w.x < 1.4) w.x += w.x < 0.45 ? -1.4 : 1.4; // keep Kael's lane clear
  const R = rain(stage, { opacity: 0.55 }); const SP = splashes(stage);

  // --- cast
  const kael = make(KAEL); S.add(kael.root);
  const feat = [new Human(citizen(2)), new Human(citizen(5)), new Human(citizen(8))]; // featured citizens near the lens
  feat.forEach((h) => S.add(h.root));
  const drone = new Drone(); S.add(drone.root);
  const droneRed = new THREE.PointLight(0xff2a3d, 0, 9, 1.6); S.add(droneRed);
  const cyan = new THREE.PointLight(0x38e8ff, 7, 7, 1.8), pink = new THREE.PointLight(0xff3fa8, 6, 7, 1.8); S.add(cyan, pink);
  const neck = new THREE.PointLight(0x9fe8ff, 0, 3.5, 1.2), warm = new THREE.PointLight(0xffc2a0, 0, 1.5, 1.5); S.add(neck, warm);
  const streetA = new THREE.PointLight(0x7f9cff, 30, 16, 1.6), streetB = new THREE.PointLight(0xb98cff, 26, 16, 1.6); S.add(streetA, streetB);
  // hero car that whips past the crane camera
  const hero = new THREE.Group(); { const b = new THREE.Mesh(new THREE.CapsuleGeometry(1, 3, 4, 12).rotateZ(Math.PI / 2).scale(1, 0.5, 0.9), new THREE.MeshStandardMaterial({ color: 0x14151e, metalness: 0.9, roughness: 0.2 })); hero.add(b);
    const s = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.08, 0.1), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x38e8ff).multiplyScalar(3), toneMapped: false })); s.position.set(0, -0.2, 0.9); hero.add(s);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 1.4), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff2a3d).multiplyScalar(4), toneMapped: false })); tl.position.set(2.5, 0, 0); hero.add(tl); }
  S.add(hero);

  // --- cornea reflection (the glitch across the pupil)
  const refl = new LiveCanvas(256, 256);
  const reflMesh = new THREE.Mesh(new THREE.CircleGeometry(0.0136 * 0.98, 40), new THREE.MeshBasicMaterial({ map: refl.t, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  reflMesh.position.z = 0.0136 * 1.03; kael.eyes[0].add(reflMesh);
  const drawRefl = (t: number, g1: number) => {
    const { g, c } = refl; g.clearRect(0, 0, 256, 256);
    const sh = (hash(Math.floor(t * 30)) - 0.5) * 60 * g1;
    // curved neon skyline reflected in the cornea
    const cols = ["#ff3fa8", "#38e8ff", "#8a5cff", "#38e8ff", "#ffb36b"];
    for (let i = 0; i < 14; i++) { g.fillStyle = cols[i % 5]; g.globalAlpha = 0.35 + 0.3 * hash(i); const x = ((i * 23 + t * 18) % 256) + sh * (i % 2 ? 1 : -1); g.fillRect(x, 90 + hash(i + 3) * 60, 5 + hash(i) * 8, 30 + hash(i + 1) * 70); }
    if (g1 > 0.05) { // digital tear: data rows + red glyph
      for (let k = 0; k < 9; k++) { g.globalAlpha = g1; g.fillStyle = k % 3 ? "#38e8ff" : "#ff2a3d"; g.fillRect(0, hash(k + Math.floor(t * 20)) * 256, 256, 2 + hash(k) * 6); }
      g.globalAlpha = g1; g.fillStyle = "#ff2a3d"; g.font = "900 64px Orbitron"; g.textAlign = "center"; g.fillText("?", 128 + sh, 150);
    }
    // radial mask (cornea is a dome)
    g.globalCompositeOperation = "destination-in"; const gr = g.createRadialGradient(128, 128, 20, 128, 128, 128); gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.globalAlpha = 1; g.fillRect(0, 0, 256, 256); g.globalCompositeOperation = "source-over";
    refl.commit();
  };

  // --- blocking: Kael walks down the avenue toward the E.V.E spire (-Z)
  const X0 = 0.45, Z0 = -20, SPD = 1.15, STOP = 20.3;
  const kz = (t: number) => (t < 10 ? Z0 : Z0 - (Math.min(t, STOP) - 10) * SPD - easeOut(clamp((t - STOP) / 0.6)) * 0.25);
  const KZS = kz(30); // where he stops
  const dronePos = (t: number) => new THREE.Vector3(lerp(1.6, 0.85, smooth((t - 20) / 3)), lerp(15, 3.05, easeOut(clamp((t - 20) / 3.2))), KZS - 2.6);
  const tmp = new THREE.Vector3();

  const head = () => kael.headPos(new THREE.Vector3());
  const eye = () => kael.eyePos(0, new THREE.Vector3());
  const shots: Shot[] = [
    { a: 0, b: 3, name: "ECU eye — reflection glitch", fn: (k) => { const e = eye(); return { p: [e.x + 0.012, e.y + 0.006, e.z - lerp(0.15, 0.12, k)], l: [e.x + 0.002, e.y + 0.008, e.z], mm: 70 }; }, hand: 0.0008, aperture: 4, focus: 0.135 },
    { a: 3, b: 6.6, name: "Crane reveal over Kael's shoulder", fn: (k) => { const h = head(); const q = easeIn(k) * 0.6 + smooth(k) * 0.4; return { p: [lerp(h.x + 0.4, 3, q), lerp(h.y + 0.08, 36, q), lerp(h.z + 1.4, 6, q)], l: [lerp(0.2, 0, q), lerp(h.y - 0.1, 34, q), lerp(h.z - 30, -170, q)], mm: lerp(30, 22, q) }; }, hand: 0.02 },
    { a: 6.6, b: 10, name: "Wide — Neo-Eden, the network", from: { p: [6, 40, 2], l: [-4, 14, -75], mm: 20 }, to: { p: [5, 36, -12], l: [-5, 16, -85], mm: 20 }, hand: 0.05 },
    { a: 10, b: 13.4, name: "Low-angle frontal track — Kael in the crowd", fn: (k, t) => { const z = kz(t); return { p: [X0 + 0.3, 0.8, z - 2.0], l: [X0, 1.5, z], mm: 30 }; }, hand: 0.02, aperture: 2.5 },
    { a: 13.4, b: 16.8, name: "Past a citizen's neural link — rack focus to Kael", fn: (k, t) => { const f = feat[0].headPos(tmp.clone()); const h = head(); const r = smooth((t - 14.7) / 1.1);
        return { p: [f.x - 0.25 + k * 0.05, f.y + 0.045, f.z + 0.26], l: [lerp(f.x - 0.07, h.x, r), lerp(f.y - 0.02, h.y - 0.05, r), lerp(f.z + 0.05, h.z, r)], mm: 40 }; },
      hand: 0.006, focus: (t) => lerp(0.26, 1.75, smooth((t - 14.9) / 0.6)), aperture: 18 },
    { a: 16.8, b: 20, name: "Profile track — Kael has no link", fn: (k, t) => { const h = head(); return { p: [h.x - 0.95, h.y - 0.02, h.z + lerp(-0.12, -0.38, k)], l: [h.x, h.y - 0.06, h.z + 0.02], mm: 50 }; }, hand: 0.008, aperture: 6 },
    { a: 20, b: 23, name: "Low angle — the drone descends", fn: (k, t) => { const h = head(); const d = dronePos(t); return { p: [h.x + 0.5, 0.55, h.z + 1.5], l: [lerp(d.x, h.x, 0.3), lerp(d.y, h.y, 0.22), lerp(d.z, h.z, 0.25)], mm: 28, roll: -0.06 }; }, hand: 0.02 },
    { a: 23, b: 26, name: "Drone POV — scanning", fn: (k, t) => { const d = dronePos(t); return { p: [d.x, d.y - 0.1, d.z + 0.5], l: [lerp(-0.6, X0, smooth((t - 23.6) / 1.4)), 1.1, KZS + 1.5], mm: lerp(26, 52, smooth((t - 24.2) / 1.6)) }; }, hand: 0.015 },
    { a: 26, b: 28.6, name: "OTS — UNKNOWN HUMAN DETECTED", fn: (k) => { const h = head(); const d = dronePos(26); return { p: [h.x + 0.42, h.y + 0.08, h.z + 0.75], l: [d.x, d.y + 0.75, d.z], mm: lerp(26, 29, k) }; }, hand: 0.012 },
    { a: 28.6, b: 30, name: "ECU — his eyes, red", fn: (k) => { const e0 = kael.eyePos(0, new THREE.Vector3()), e1 = kael.eyePos(1, new THREE.Vector3()); const m = e0.add(e1).multiplyScalar(0.5); const f = m.clone().sub(head()).normalize(); const d = lerp(0.34, 0.3, k);
        return { p: [m.x + f.x * d + 0.015, m.y + f.y * d - 0.03, m.z + f.z * d], l: [m.x, m.y + 0.002, m.z], mm: 50 }; }, hand: 0.004, aperture: 3 },
  ];

  return (t: number) => {
    const P = stage.post;
    city.update(t); people.update(t);
    (city.network.material as THREE.ShaderMaterial).uniforms.opacity.value = win(t, 3.4, 10.2, 1.2);

    // --- Kael
    kael.reset(); kael.root.position.set(X0, 0, kz(t)); kael.root.rotation.y = Math.PI;
    if (t >= 10 && t < STOP) kael.walk((t - 10) / 1.05); else kael.idle(t);
    if (t < 3) { kael.look(0, -0.05); kael.s.gx = -0.15 + 0.3 * ramp(t, 1.6, 1.8); kael.s.gy = 0.1; }
    if (t >= 16.8 && t < 20) { kael.look(-0.55 * ramp(t, 18.4, 18.9), 0); kael.s.gx = -0.9 * ramp(t, 18.3, 18.6); kael.s.squint = 0.4 * ramp(t, 18.6, 19); }
    if (t >= 20) { const up = ramp(t, 20.6, 21.6); kael.look(0.05, -0.55 * up); kael.s.gy = 0.6 * up; kael.s.browUp = 0.5 * up; }
    if (t >= 26) { kael.s.squint = 0.25; kael.s.frown = 0.6 * ramp(t, 27, 27.6); kael.s.browUp = 0; }
    kael.autoBlink(t, 2); if (t > 2.35 && t < 2.6) kael.s.blink = Math.sin(((t - 2.35) / 0.25) * Math.PI);
    if (t >= 28.6) { kael.s.eyeGlow = 0; kael.s.gy = 0.55; }
    kael.applyFace();

    // featured citizens walk beside Kael (same pace) so the camera can slide past their neural links
    feat.forEach((h, i) => {
      const off = [[-0.5, 1.45], [1.25, -2.2], [-1.6, -0.9]][i];
      h.reset(); h.root.position.set(X0 + off[0], 0, kz(Math.min(t, STOP)) + off[1] - (t > STOP ? (t - STOP) * SPD : 0)); h.root.rotation.y = Math.PI;
      h.walk((t - 10) / 1.05 + i * 0.3); h.look(i === 0 ? 0.1 : -0.1, 0.05); h.applyFace();
      if (h.neuralGlow) h.neuralGlow.material.opacity = 0.75 + 0.25 * Math.sin(t * 6 + i);
    });

    // --- drone
    const dp = dronePos(Math.max(t, 20)); drone.root.position.copy(dp); drone.root.visible = t >= 20;
    drone.root.rotation.y = t < 23 ? Math.sin(t * 1.4) * 0.35 * (1 - ramp(t, 21.5, 22.5)) : 0;
    drone.root.rotation.x = 0.3 * ramp(t, 21.4, 22.2);
    const beamOn = ramp(t, 21.6, 21.9) * (1 - ramp(t, 29.3, 29.4));
    drone.update(t, { beam: beamOn * (0.55 + 0.25 * flicker(t, 20, 0.9)) * (t > 26 ? 1.6 : 1), eye: t >= 20 ? 1 : 0 });
    droneRed.position.set(dp.x, dp.y - 0.4, dp.z + 0.8); droneRed.intensity = beamOn * (t > 26 ? 14 : 6);
    if (t >= 26.3) drone.display(t < 26.9 && flicker(t, 18, 0.5) ? [""] : ["UNKNOWN HUMAN", "DETECTED"], { t, glitch: win(t, 26.3, 26.9, 0.1) + win(t, 28.4, 28.6, 0.05) });
    else drone.screenMesh.visible = false;

    // --- hero car whip-pan pass
    const hk = clamp((t - 7.0) / 1.3); hero.position.set(lerp(40, -40, hk), 41.5, -16); hero.visible = t > 6.6 && t < 8.5;

    // --- neon wash that travels with Kael
    const kp = kael.root.position; cyan.position.set(kp.x - 2.2, 2.6, kp.z - 1); pink.position.set(kp.x + 2.4, 3.2, kp.z + 1.5);
    pink.intensity = 6 * (0.85 + 0.15 * flicker(t, 9, 0.8, 3));
    streetA.position.set(-5, 6, kp.z - 5); streetB.position.set(5.5, 6, kp.z + 4);
    L.key.position.set(kp.x + 2, 7, kp.z - 4); L.key.target.position.set(kp.x, 1.5, kp.z);
    if (t < 3) { L.key.position.set(kp.x + 1.4, 2.3, kp.z - 2.2); L.key.intensity = 14; } else L.key.intensity = 26;

    // --- rain visibility (not between lens and cornea)
    R.lines.visible = t >= 3 && t < 28.6; SP.visible = t >= 3;
    if (kael.hairMesh) kael.hairMesh.visible = t >= 3; // keep the fringe out of the macro lens
    // shot-specific light: warm key on the eye macro, cyan rim on the bare neck
    if (t < 3) { cyan.intensity = 1.2; pink.intensity = 2.5; L.rim.intensity = 0.8; neck.intensity = 0; warm.intensity = 0.5; warm.position.set(kp.x + 0.25, 1.95, kp.z - 0.6); }
    else { cyan.intensity = 7; L.rim.intensity = 2.6; warm.intensity = 0; neck.intensity = t >= 16.8 && t < 20 ? 3.2 : 0; neck.position.set(kp.x - 0.8, 1.9, kp.z - 0.9); }

    // --- camera
    const stomp = 0;
    const s = applyShots(stage, shots, t, stomp + win(t, 26.25, 26.7, 0.1) * 0.6);

    // --- post: glitch bursts, grade per shot
    let gl = 0;
    for (const [a, d] of [[0.35, 0.14], [1.25, 0.1], [2.1, 0.22], [2.92, 0.12], [28.5, 0.14]] as const) gl = Math.max(gl, win(t, a, a + d, 0.03));
    gl = Math.max(gl, win(t, 26.25, 26.55, 0.05) * 0.8, win(t, 29.25, 29.42, 0.02));
    drawRefl(t, Math.max(gl, 0.15 * flicker(t, 7, 0.3)));
    reflMesh.material.opacity = 0.55;
    P.glitch = gl * (t < 3 ? 0.55 : 0.9); P.glitchSeed = Math.floor(t * 30);
    P.bloom = t >= 3 && t < 10 ? 1.15 : 0.9; P.bloomThreshold = 0.6;
    P.ca = 0.0015 + gl * 0.006;
    P.grain = 0.055; P.vignette = t < 3 ? 0.8 : 0.6;
    P.lift.setRGB(0.012, 0.0, 0.04); P.gain.setRGB(1.0, 0.97, 1.08);
    P.tintAmt = t >= 26 ? 0.12 * ramp(t, 26.2, 26.6) : 0; P.tint.setRGB(1.0, 0.2, 0.25);
    P.exposure = t < 3 ? 1.0 : t >= 10 && t < 26 ? 1.18 : 1.0;
    P.flash = win(t, 2.98, 3.08, 0.02) * 0.6;
    P.fade = t >= 29.42 ? 1 : 0;      // CUT TO BLACK
    P.scan = t >= 23 && t < 26 ? 0.08 : 0;

    // --- HUD
    const g = stage.hud, W = stage.W, H = stage.H;
    titleBug(stage, t, 1, "NO SIGNAL", 0.45, 2.9);
    if (t >= 23 && t < 26) { // drone scanner overlay
      HUD.frame(g, W, H, "#38e8ff", 0.7); HUD.scanlines(g, W, H, 0.1);
      const sweep = ((t - 23) * 0.9) % 1; g.save(); g.fillStyle = "rgba(56,232,255,0.12)"; g.fillRect(0, sweep * H, W, 26); g.restore();
      HUD.text(g, "E.V.E // SURVEILLANCE UNIT 7", 90, 120, { size: 28, font: "Rajdhani", weight: 700, color: "#9fe9ff", spacing: 4 });
      HUD.text(g, `SECTOR 09 · CITIZENS SCANNED ${Math.floor(1180 + (t - 23) * 340)}`, 90, 160, { size: 24, font: "Rajdhani", weight: 600, color: "#9fe9ff", alpha: 0.8 });
      const all = [...people.list.map((w) => w.h), ...feat];
      for (const h of all) {
        const hp = h.headPos(tmp.clone()); const pr = project(stage, hp); if (pr.behind || pr.x < 40 || pr.x > W - 40 || pr.y < 200 || pr.y > H - 300) continue;
        const d = hp.distanceTo(stage.camera.position); if (d > 16) continue;
        const id = (Math.abs(Math.floor(hp.x * 97 + h.root.id * 13)) % 9000) + 1000;
        HUD.reticle(g, pr.x, pr.y, 1100 / d / 2.4, "#38e8ff", { alpha: 0.75 });
        HUD.text(g, `C-${id} · LINKED`, pr.x + 1100 / d / 2.4 + 10, pr.y - 6, { size: 18, font: "Rajdhani", weight: 700, color: "#7feaff", glow: 6, alpha: 0.85 });
      }
      const kh = project(stage, head()); const lock = ramp(t, 24.3, 24.9);
      if (!kh.behind && t > 24.1) {
        const r = lerp(220, 70, lock); const red = t > 24.9; const col = red ? "#ff2a3d" : "#38e8ff";
        HUD.reticle(g, kh.x, kh.y, r, col, { spin: t * 4, lw: 4 });
        if (red) { HUD.glitchText(g, "NO NEURAL SIGNATURE", W / 2, H * 0.72, t, flicker(t, 14, 0.7) ? 0.2 : 1, { size: 50, weight: 900, color: "#ff2a3d", align: "center" });
          HUD.text(g, "ID: ——  ·  LINK: NONE", W / 2, H * 0.72 + 64, { size: 30, font: "Rajdhani", weight: 700, color: "#ff6a7a", align: "center", alpha: flicker(t, 6, 0.8) }); }
      }
    }
    if (t >= 26.3 && t < 29.42) { // alarm bars
      const a = 0.55 + 0.45 * flicker(t, 6, 0.5);
      g.save(); g.globalAlpha = 0.85 * a; g.fillStyle = "#ff2a3d"; g.fillRect(0, 70, W, 8); g.fillRect(0, H - 78, W, 8); g.restore();
      HUD.text(g, "⚠  ALERT · UNREGISTERED ORGANISM  ⚠", W / 2, 120, { size: 30, weight: 700, color: "#ff2a3d", align: "center", alpha: a, spacing: 3 });
    }
    void s;
  };
};
