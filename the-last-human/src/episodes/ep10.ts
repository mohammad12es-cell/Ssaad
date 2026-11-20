// EPISODE 10 — THE LAST HUMAN
// 0–5   Silence. Kael opens his eyes in darkness.
// 5–12  A massive terminal activates (a wall of screens wakes in a wave)
// 12–20 "PROJECT: HUMANITY" / "SIMULATION #8921"
// 20–25 E.V.E: "Welcome back, Kael. You've reached the end before."
// 25–30 A real-world laboratory: a human opens his eyes inside a life-support chamber.
//       Final title: THE LAST HUMAN — SEASON 01 — END.
import * as THREE from "three";
import type { Stage } from "../engine/Stage";
import { make, KAEL, KAEL_REAL, EVE } from "../characters/Cast";
import { wallScreen, realLab } from "../environments/Interiors";
import { neonRig } from "../environments/Lighting";
import { motes } from "../effects/Rain";
import { faceFeed } from "../effects/FaceFeed";
import { std } from "../effects/materials";
import { applyShots, Shot } from "../camera/Camera";
import { clamp, ramp, window as win, lerp, smooth, flicker, hash } from "../utils/math";
import { HUD, mouth } from "./common";

export const meta = { n: 10, title: "THE LAST HUMAN" };

export const ep10 = (stage: Stage) => {
  const S = stage.scene;
  const L = neonRig(stage, { fogDensity: 0.03, fog: 0x020308, env: 0.25 }); L.key.intensity = 0; L.accent.intensity = 0; L.fill.intensity = 0.05; L.rim.intensity = 0.0;
  // the void + the wall of screens
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), std(0x050508, { roughness: 0.15, metalness: 0.7 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; S.add(floor);
  const screens: ReturnType<typeof wallScreen>[] = []; const COLS = 7, ROWS = 6, SW = 3.2, SH = 1.9;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (r >= 2 && r <= 3 && c >= 2 && c <= 4) continue; // the centre is one giant screen
    const w = wallScreen(stage, SW, SH, 384); w.group.position.set((c - 3) * (SW + 0.2), 1.3 + r * (SH + 0.2), -12 + Math.abs(c - 3) * 0.9); w.group.rotation.y = -(c - 3) * 0.12; screens.push(w);
  }
  const main = wallScreen(stage, SW * 3 + 0.4, SH * 2 + 0.2, 1280); main.group.position.set(0, 1.3 + 2.5 * (SH + 0.2), -12);
  const wallL = new THREE.PointLight(0x5fd8ff, 0, 30, 1.1); wallL.position.set(0, 5, -6); S.add(wallL);
  const dust = motes(stage, { count: 900, box: [20, 8, 14], center: [0, 3, -4], color: 0x7fc8ff, size: 2.5 });
  const kael = make(KAEL); S.add(kael.root); kael.root.position.set(0.0, 0, 0);
  const rimL = new THREE.PointLight(0x5fd8ff, 0, 3, 1.5); S.add(rimL);
  // E.V.E (off-stage) is filmed live into the main screen
  const eve = make(EVE); S.add(eve.root); eve.root.position.set(300, 0, 0);
  const eveL = new THREE.PointLight(0x7feaff, 3, 4, 1.3); eveL.position.set(300, 1.7, 1.2); S.add(eveL);
  const feed = faceFeed(stage, 512); feed.hide.push(main.group);
  const eveScreen = new THREE.Mesh(new THREE.PlaneGeometry(SH * 2 * 0.8, SH * 2 + 0.2), feed.mat); eveScreen.position.set(0, 0, 0.02); main.group.add(eveScreen);
  // the real world
  const lab = realLab(stage); lab.group.position.set(-400, 0, 0);
  const real = make(KAEL_REAL); lab.pod.add(real.root); real.root.rotation.x = -Math.PI / 2 + 0.18; real.root.position.set(0, 0.86, 1.05);
  const podL = new THREE.PointLight(0xbfffe8, 2.5, 2.5, 1.5); lab.pod.add(podL); podL.position.set(0, 1.6, -0.6);

  const head = () => kael.headPos(new THREE.Vector3());
  const LB = (x: number, y: number, z: number): [number, number, number] => [-400 + x, y, z];
  const shots: Shot[] = [
    { a: 0, b: 5, name: "Darkness — an eye opens", fn: (k) => { const e = kael.eyePos(0, new THREE.Vector3()); return { p: [e.x + 0.02, e.y + 0.11, e.z + 0.05], l: [e.x, e.y, e.z], mm: 50 }; }, hand: 0.001, aperture: 4 },
    { a: 5, b: 8.5, name: "Wide from behind — the wall wakes", from: { p: [1.4, 1.3, 4.5], l: [0, 4, -12], mm: 20 }, to: { p: [1.1, 1.2, 3.8], l: [0, 4.4, -12], mm: 20 }, hand: 0.01 },
    { a: 8.5, b: 12, name: "Low angle — a cathedral of screens", from: { p: [-2.5, 0.35, 0.8], l: [0, 6, -12], mm: 18 }, to: { p: [-2.2, 0.35, 0.4], l: [0, 6.5, -12], mm: 18 }, hand: 0.01 },
    { a: 12, b: 16, name: "The main screen types", from: { p: [0.2, 5.6, -4.6], l: [0, 6.3, -12], mm: 30 }, to: { p: [0.1, 5.8, -5.6], l: [0, 6.3, -12], mm: 30 }, hand: 0.006 },
    { a: 16, b: 20, name: "CU — Kael reads the number", fn: (k) => { const h = head(); return { p: [h.x + 0.2, h.y + 0.05, h.z - 0.6 + k * 0.08], l: [h.x, h.y, h.z], mm: 55 }; }, hand: 0.004, aperture: 4 },
    { a: 20, b: 23.2, name: "E.V.E on the terminal — \"Welcome back\"", from: { p: [-1.6, 1.6, 2.6], l: [0, 5.5, -12], mm: 24 }, to: { p: [-1.3, 1.5, 1.8], l: [0, 5.8, -12], mm: 26 }, hand: 0.008 },
    { a: 23.2, b: 25, name: "CU Kael — \"the end before\"", fn: (k) => { const h = head(); return { p: [h.x - 0.25, h.y - 0.05, h.z - 0.55], l: [h.x, h.y, h.z], mm: 55 }; }, hand: 0.004, aperture: 4 },
    { a: 25, b: 27.2, name: "The real world — a sterile lab, a pod", from: { p: LB(2.8, 2.6, 5.5), l: LB(0, 0.8, 0), mm: 26 }, to: { p: LB(1.9, 2.0, 3.6), l: LB(0, 0.9, 0), mm: 28 }, hand: 0.006 },
    { a: 27.2, b: 28.6, name: "ECU — a human opens his eyes", fn: (k) => { const e = real.eyePos(0, new THREE.Vector3()).add(real.eyePos(1, new THREE.Vector3())).multiplyScalar(0.5); return { p: [e.x + 0.02, e.y + lerp(0.4, 0.34, k), e.z + 0.06], l: [e.x, e.y, e.z], mm: 50 }; }, hand: 0.002, aperture: 3 },
    { a: 28.6, b: 30, name: "Final title over the lab", from: { p: LB(3.8, 3.2, 6.5), l: LB(0, 0.9, 0), mm: 24 }, to: { p: LB(4.2, 3.6, 7.4), l: LB(0, 0.9, 0), mm: 24 }, hand: 0.004 },
  ];

  return (t: number) => {
    const P = stage.post; const real_ = t >= 25;
    // --- Kael wakes on the floor, rises, stands before the wall
    kael.reset(); const lie = 1 - smooth(clamp((t - 5.2) / 2.6));
    kael.root.rotation.set(Math.PI / 2 * lie, Math.PI, 0); kael.root.position.set(0, 0.12 * lie, -lie * 0.9);
    if (lie < 0.5) kael.idle(t);
    kael.s.blink = t < 2.6 ? 1 : 1 - ramp(t, 2.6, 3.1); if (t > 3.6) kael.autoBlink(t, 14);
    kael.s.gx = t < 5 ? 0.15 * Math.sin(t * 2) : 0; kael.s.gy = t > 8 && t < 20 ? 0.45 : 0.1; kael.s.browUp = t > 12 ? 0.5 : 0.2; kael.s.squint = t > 20 ? 0.25 : 0;
    if (t > 8) kael.look(0, -0.35);
    kael.applyFace();
    rimL.position.copy(head()).add(new THREE.Vector3(0.5, 0.3, -0.5)); rimL.intensity = t < 5 ? ramp(t, 1.6, 3.0) * 0.6 : 2;
    // --- screens wake in a wave from the centre outward (5.4–9)
    screens.forEach((w, i) => { const d = Math.hypot(w.group.position.x / 3.4, (w.group.position.y - 6) / 2.1); const on = ramp(t, 5.4 + d * 0.6, 5.6 + d * 0.6) * (t < 5.9 + d * 0.6 ? flicker(t, 18, 0.5, i) : 1);
      const { g, c } = w.scr; g.fillStyle = "#010205"; g.fillRect(0, 0, c.width, c.height);
      if (on > 0) { g.globalAlpha = on; g.fillStyle = "#061424"; g.fillRect(0, 0, c.width, c.height); g.strokeStyle = "#5ff4ff"; g.lineWidth = 2; g.shadowColor = "#5ff4ff"; g.shadowBlur = 8;
        const kind = i % 3; g.beginPath();
        if (kind === 0) for (let x = 0; x < c.width; x += 4) { const y = c.height / 2 + Math.sin(x * 0.05 + t * 3 + i) * 40 * Math.sin(t + i); x ? g.lineTo(x, y) : g.moveTo(x, y); }
        else if (kind === 1) { for (let k = 0; k < 10; k++) g.strokeRect(20 + k * 34, c.height - 20 - (20 + 140 * Math.abs(Math.sin(t * 2 + k + i))), 22, 20 + 140 * Math.abs(Math.sin(t * 2 + k + i))); }
        else { g.font = "500 16px monospace"; g.fillStyle = "#5ff4ff"; for (let k = 0; k < 9; k++) g.fillText(`SIM ${8000 + ((i * 97 + k * 13) % 921)}  ${hash(i + k) < 0.5 ? "TERMINATED" : "ARCHIVED"}`, 16, 30 + k * 24); }
        g.stroke(); g.globalAlpha = 1; g.shadowBlur = 0; }
      w.scr.commit(); });
    wallL.intensity = ramp(t, 5.4, 8) * 20 * (real_ ? 0 : 1);
    // --- main screen: typing, then E.V.E's face (live feed)
    { const { g, c } = main.scr; g.fillStyle = "#010205"; g.fillRect(0, 0, c.width, c.height); const on = ramp(t, 5.4, 5.8);
      if (on > 0) { g.globalAlpha = on; g.fillStyle = "#03070f"; g.fillRect(0, 0, c.width, c.height); g.strokeStyle = "#5ff4ff"; g.lineWidth = 5; g.shadowColor = "#5ff4ff"; g.shadowBlur = 20; g.strokeRect(24, 24, c.width - 48, c.height - 48);
        g.textAlign = "center"; const type = (s: string, t0: number, rate = 14) => s.slice(0, Math.max(0, Math.floor((t - t0) * rate)));
        if (t < 20) {
          g.font = "500 30px Rajdhani"; g.fillStyle = "#9fe9ff"; g.fillText(type("> RESTORING OBSERVER SESSION ...", 8.6, 26), c.width / 2, 120);
          g.font = "900 96px Orbitron"; g.fillStyle = "#ffffff"; g.fillText(type("PROJECT: HUMANITY", 12.4, 9), c.width / 2, c.height * 0.45);
          if (t > 15.2) { g.fillStyle = "#ff3a4a"; g.shadowColor = "#ff3a4a"; g.font = "900 88px Orbitron"; const s = type("SIMULATION #8921", 15.4, 8); g.fillText(s + (Math.floor(t * 3) % 2 && s.length < 16 ? "_" : ""), c.width / 2, c.height * 0.7); }
          if (t > 18.4) { g.font = "600 30px Rajdhani"; g.fillStyle = "#ff8a94"; g.shadowBlur = 6; g.fillText("PREVIOUS RUNS: 8,920 · OUTCOME: RESET", c.width / 2, c.height * 0.86); }
        }
        g.globalAlpha = 1; g.shadowBlur = 0; for (let y = 0; y < c.height; y += 5) { g.fillStyle = "rgba(0,0,0,0.18)"; g.fillRect(0, y, c.width, 2); } }
      main.scr.commit(); }
    // E.V.E face appears on the terminal at 19.8
    eveScreen.visible = t > 19.8 && !real_;
    eve.reset(); eve.idle(t); eve.look(0, 0.05); eve.s.mouth = mouth("e10_l2", t); eve.s.smile = 0.35; eve.autoBlink(t, 5); eve.applyFace(); eve.setHolo(t, 0.03 + win(t, 19.8, 20.2, 0.05) * 0.5, 1, 0);
    if (eveScreen.visible) { const eh = eve.headPos(new THREE.Vector3()); feed.capture(eh.clone().add(new THREE.Vector3(0, 0.0, 0.85)), eh); }
    const u = feed.mat.uniforms; u.scan.value = 0; u.red.value = 0; u.glitch.value = 0.05 + win(t, 19.8, 20.3, 0.05) * 0.5; u.power.value = 1;
    // --- the real world
    real.reset(); real.s.blink = t < 27.7 ? 1 : 1 - ramp(t, 27.7, 28.15); real.s.gy = 0.0; real.s.gx = t > 28.2 ? 0.25 * ramp(t, 28.2, 28.6) : 0; real.applyFace();
    { const { g, c } = lab.mon; g.fillStyle = "#020605"; g.fillRect(0, 0, c.width, c.height); g.strokeStyle = "#7fffb0"; g.lineWidth = 3; g.shadowColor = "#7fffb0"; g.shadowBlur = 8; g.beginPath();
      for (let x = 0; x < c.width; x += 3) { const ph = (x / c.width * 3 + t * 1.1) % 1; const y = 150 - (ph > 0.42 && ph < 0.46 ? 90 : ph > 0.46 && ph < 0.49 ? -40 : 0) + Math.sin(x * 0.1) * 2; x ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke(); g.font = "700 40px Rajdhani"; g.fillStyle = "#7fffb0"; g.fillText(t > 27.7 ? "BPM 74 ↑  · EEG: AWAKE" : "BPM 41  · EEG: DREAMING", 24, 270); g.shadowBlur = 0; lab.mon.commit(); }
    dust.visible = !real_;
    applyShots(stage, shots, t, 0);
    P.exposure = real_ ? 1.05 : 1.2; P.bloom = real_ ? 0.6 : 1.1; P.bloomThreshold = real_ ? 0.8 : 0.5; P.grain = real_ ? 0.045 : 0.06;
    P.saturation = real_ ? 0.72 : 1.05; P.contrast = real_ ? 1.02 : 1.1; P.vignette = 0.7;
    P.lift.setRGB(real_ ? 0.02 : 0.004, real_ ? 0.03 : 0.008, real_ ? 0.028 : 0.03); P.gain.setRGB(real_ ? 0.95 : 0.96, real_ ? 1.04 : 1.0, real_ ? 1.0 : 1.1);
    P.fade = t < 1.6 ? 1 : 1 - ramp(t, 1.6, 3.2) * 1 + (t > 24.8 && t < 25 ? 1 : 0);
    P.glitch = win(t, 24.75, 25.05, 0.03) * 0.8 + win(t, 19.8, 20.1, 0.03) * 0.4; P.glitchSeed = Math.floor(t * 30); P.ca = 0.0016 + P.glitch * 0.006;
    // final title
    const g = stage.hud, W = stage.W, H = stage.H, k = ramp(t, 27.6, 28.4);
    if (k > 0) {
      g.save(); g.globalAlpha = k * 0.55; g.fillStyle = "#000"; g.fillRect(0, H * 0.36, W, H * 0.24); g.restore();
      HUD.text(g, "THE LAST HUMAN", W / 2, H * 0.44, { size: 84, weight: 900, align: "center", spacing: 10, alpha: k, color: "#f2f8ff", glow: 26 });
      g.save(); g.globalAlpha = k; g.fillStyle = "#5ff4ff"; g.fillRect(W / 2 - 180 * k, H * 0.48, 360 * k, 3); g.restore();
      HUD.text(g, "SEASON 01 — END.", W / 2, H * 0.53, { size: 40, weight: 600, font: "Rajdhani", align: "center", spacing: 12, alpha: ramp(t, 28.2, 28.9), color: "#9fe9ff", glow: 12 });
    }
  };
};
