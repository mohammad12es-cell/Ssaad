// EPISODE 08 — THE ORIGINAL
// 0–5   Kael discovers a sealed laboratory (forces the door, cold fog pours out)
// 5–15  An enormous glass chamber opens (reveal, liquid drains, glass rises)
// 15–22 Inside is an identical version of Kael
// 22–27 A computer displays: ORIGINAL SUBJECT: UNKNOWN
// 27–30 The other Kael opens his eyes
import * as THREE from "three";
import type { Stage } from "../engine/Stage";
import { make, KAEL, KAEL_CLONE } from "../characters/Cast";
import { industrialRoom, blastDoor, glassChamber, wallScreen } from "../environments/Interiors";
import { neonRig } from "../environments/Lighting";
import { motes } from "../effects/Rain";
import { applyShots, Shot } from "../camera/Camera";
import { glow } from "../engine/textures";
import { clamp, ramp, window as win, lerp, smooth, flicker, rng } from "../utils/math";
import { titleBug } from "./common";

export const meta = { n: 8, title: "THE ORIGINAL" };

export const ep08 = (stage: Stage) => {
  const S = stage.scene;
  const L = neonRig(stage, { fogDensity: 0.05, fog: 0x0a1018, env: 0.4 }); L.key.intensity = 0; L.accent.intensity = 0; L.fill.intensity = 0.15; L.rim.intensity = 0.5;
  const room = industrialRoom(stage, { w: 12, d: 14, h: 6, tubes: 4, tubeColor: 0xd8f4ff, seed: 8, base: "#2a3038", frontHole: [2.8, 3.3] });
  const corridor = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 6), new THREE.MeshStandardMaterial({ color: 0x1a1d24, side: THREE.BackSide, roughness: 0.8 })); corridor.position.set(0, 2, 10); S.add(corridor);
  const cLight = new THREE.PointLight(0x9fc8ff, 6, 8, 1.4); cLight.position.set(0, 3.2, 10.5); S.add(cLight);
  const door = blastDoor(stage, 2.6, 3.2, 0x7fd8ff); door.group.position.set(0, 0, 6.9); door.group.rotation.y = Math.PI;
  const gc = glassChamber(stage, { r: 1.15, h: 3.3 }); gc.group.position.set(0, 0, -2.5);
  const screen = wallScreen(stage, 4.6, 2.6, 1024); screen.group.position.set(-4.0, 2.6, -4.2); screen.group.rotation.y = 0.55;
  const scrL = new THREE.PointLight(0xff4050, 0, 8, 1.3); scrL.position.set(-3.2, 2.4, -3.0); S.add(scrL);
  const cold = motes(stage, { count: 1600, box: [10, 4, 12], center: [0, 1.6, 0], color: 0xbfe8ff, size: 3 });
  // fog puffs (billboard sprites) — pour out of the door and from the chamber base when it opens
  const fogs: THREE.Sprite[] = []; const R = rng(81);
  for (let i = 0; i < 40; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow("#cfe8ff"), color: 0x8fb8d8, transparent: true, opacity: 0, depthWrite: false })); S.add(s); s.userData = { a: R() * 6.28, r: R(), d: R() * 2, door: i < 16 }; fogs.push(s); }
  const kael = make(KAEL); S.add(kael.root);
  const clone = make(KAEL_CLONE); S.add(clone.root); clone.root.position.set(0, 0.5, -2.5); clone.root.rotation.y = 0;
  const cloneL = new THREE.PointLight(0x9fd0ff, 0, 3, 1.4); S.add(cloneL);

  const kpos = (t: number) => {
    if (t < 5) return new THREE.Vector3(0.1, 0, 8.2);
    if (t < 11) return new THREE.Vector3(0.1, 0, lerp(8.2, 1.5, smooth((t - 5) / 6)));
    return new THREE.Vector3(0.1, 0, lerp(1.5, 0.3, smooth((t - 11) / 6)));
  };
  const head = () => kael.headPos(new THREE.Vector3());
  const chead = () => clone.headPos(new THREE.Vector3());
  const shots: Shot[] = [
    { a: 0, b: 2.6, name: "Outside — the sealed door, frost, warning glyphs", fn: (k) => ({ p: [1.2, 1.4, 10.6 - k * 0.3], l: [0, 1.6, 7], mm: 30 }), hand: 0.01 },
    { a: 2.6, b: 5, name: "Inside — the seal breaks, fog pours", fn: (k) => ({ p: [-0.8, 0.5, 4.2], l: [0.1, 1.5, 7.5], mm: 24 }), hand: 0.015 },
    { a: 5, b: 9, name: "Wide reveal — the glass chamber", fn: (k, t) => { const h = head(); return { p: [h.x + 0.6, h.y + 0.3, h.z + 1.6], l: [0, 2.2, -2.5], mm: 26 }; }, hand: 0.012 },
    { a: 9, b: 15, name: "Low angle — the glass rises, the liquid falls", fn: (k) => ({ p: [2.4 - k * 0.6, 0.4, 1.4], l: [0, lerp(2.4, 1.8, k), -2.5], mm: 22 }), hand: 0.01 },
    { a: 15, b: 18.5, name: "His double — slow push", fn: (k) => { const c = chead(); return { p: [c.x + 0.1, c.y, c.z + lerp(1.8, 0.9, smooth(k))], l: [c.x, c.y - 0.05, c.z], mm: 40 }; }, hand: 0.006, aperture: 3 },
    { a: 18.5, b: 22, name: "Mirror two-shot — face to face", fn: (k) => ({ p: [2.3, 1.7, -1.1 + k * 0.1], l: [0.05, 1.65, -1.1], mm: 35 }), hand: 0.008, aperture: 2 },
    { a: 22, b: 27, name: "The computer — ORIGINAL SUBJECT: UNKNOWN", fn: (k) => ({ p: [-1.4 - k * 0.3, 2.3, -1.0], l: [-4.0, 2.6, -4.2], mm: lerp(30, 36, k) }), hand: 0.008 },
    { a: 27, b: 30, name: "ECU — the other Kael opens his eyes", fn: (k) => { const e = clone.eyePos(0, new THREE.Vector3()).add(clone.eyePos(1, new THREE.Vector3())).multiplyScalar(0.5); return { p: [e.x + 0.01, e.y, e.z + lerp(0.36, 0.31, k)], l: [e.x, e.y, e.z], mm: 60 }; }, hand: 0.003, aperture: 3 },
  ];

  return (t: number) => {
    const P = stage.post;
    room.power(t, 1, 0.2);
    door.open(smooth(clamp((t - 2.8) / 2.0)));
    // glass chamber opens 9.5–14
    const op = smooth(clamp((t - 9.5) / 4.5)); gc.open(op);
    // fog
    fogs.forEach((f, i) => { const u = f.userData; const ph = ((t * 0.25 + u.d) % 1);
      if (u.door) { const k = ramp(t, 3.0, 4.0); f.position.set(Math.cos(u.a) * (1 + ph * 3), 0.3 + ph * 0.6, 6.4 - ph * 4); f.scale.setScalar(1.5 + ph * 3); f.material.opacity = k * (1 - ph) * 0.18; }
      else { const k = ramp(t, 9.8, 11); f.position.set(Math.cos(u.a) * (1.3 + ph * 2.5), 0.25 + ph * 0.4, -2.5 + Math.sin(u.a) * (1.3 + ph * 2.5)); f.scale.setScalar(1.2 + ph * 2.5); f.material.opacity = k * (1 - ph) * 0.2; } });
    // Kael
    kael.reset(); kael.root.position.copy(kpos(t)); kael.root.rotation.y = Math.PI;
    if (t < 2.8) { kael.reach(0, 0.8, 0); kael.reach(1, 0.8, 0); kael.spine.rotation.x += 0.15; kael.idle(t); }
    else if (t >= 5 && t < 17) kael.walk(t / 1.3, t < 11 ? 0.75 : 0.35 * (1 - ramp(t, 15, 17))); else kael.idle(t);
    kael.look(0, t > 5 && t < 15 ? -0.25 : 0); kael.s.browUp = t > 9 ? 0.7 : 0.2; kael.s.squint = t > 22 ? 0.2 : 0; kael.s.mouth = t > 15 && t < 19 ? 0.15 : 0;
    kael.autoBlink(t, 13); kael.applyFace();
    // the Original: suspended, head bowed, hair drifting while submerged
    clone.reset(); const sub = 1 - op;
    clone.root.position.y = 0.5 + Math.sin(t * 0.8) * 0.02 * sub; clone.head.rotation.x = 0.35 * (1 - ramp(t, 26, 28.4) * 0.8);
    clone.sh[0].rotation.z = 0.35 + 0.05 * Math.sin(t * 0.7); clone.sh[1].rotation.z = -0.35 - 0.05 * Math.sin(t * 0.7);
    clone.idle(t * 0.6, 0.4);
    clone.s.blink = t < 28.2 ? 1 : 1 - ramp(t, 28.2, 28.7); clone.s.gy = 0.05; clone.applyFace();
    cloneL.position.copy(chead()).add(new THREE.Vector3(0.0, 0.3, 0.6)); cloneL.intensity = 2 + op * 2;
    // computer: scan of the clone + verdict
    const sOn = ramp(t, 21.6, 22.0);
    { const { g, c } = screen.scr; g.fillStyle = "#03050a"; g.fillRect(0, 0, c.width, c.height);
      if (sOn > 0) { g.globalAlpha = sOn; g.strokeStyle = "#7fd8ff"; g.lineWidth = 3; g.shadowColor = "#7fd8ff"; g.shadowBlur = 12;
        // body schematic
        const cx = 210, cy = 300; g.beginPath(); g.arc(cx, cy - 170, 38, 0, 7); g.stroke(); g.strokeRect(cx - 55, cy - 125, 110, 170); g.strokeRect(cx - 50, cy + 50, 40, 150); g.strokeRect(cx + 10, cy + 50, 40, 150);
        const sl = ((t * 0.7) % 1) * 420; g.fillStyle = "rgba(127,216,255,0.35)"; g.fillRect(cx - 90, cy - 220 + sl, 180, 6);
        g.textAlign = "left"; g.fillStyle = "#9fe8ff"; g.font = "600 30px Rajdhani";
        ["SUBJECT: K-0 (CONTAINED)", "GENOME MATCH: 100.00%", "NEURAL LINK: NONE", "MEMORY STATE: DORMANT"].forEach((s, i) => g.fillText(s, 400, 120 + i * 48));
        if (t > 22.6) { const f = t < 23.2 ? flicker(t, 16, 0.5) : 1; g.globalAlpha = f; g.fillStyle = "#ff3a4a"; g.shadowColor = "#ff3a4a"; g.font = "900 56px Orbitron"; g.fillText("ORIGINAL SUBJECT:", 400, 380); g.fillText("UNKNOWN", 400, 450); }
        g.globalAlpha = 1; g.shadowBlur = 0; for (let y = 0; y < c.height; y += 4) { g.fillStyle = "rgba(0,0,0,0.2)"; g.fillRect(0, y, c.width, 2); } }
      screen.scr.commit(); }
    scrL.intensity = sOn * (t > 22.6 ? 7 : 3); scrL.color.setHex(t > 22.6 ? 0xff4050 : 0x7fd8ff);
    cold.visible = true;
    applyShots(stage, shots, t, win(t, 2.8, 3.2, 0.05) * 0.5 + win(t, 9.5, 9.9, 0.05) * 0.3);
    P.exposure = 1.2; P.bloom = 1.0; P.bloomThreshold = 0.55; P.grain = 0.05; P.vignette = 0.7; P.saturation = 0.9;
    P.lift.setRGB(0.01, 0.018, 0.035); P.gain.setRGB(0.95, 1.02, 1.08);
    P.glitch = win(t, 28.15, 28.3, 0.02) * 0.3 + win(t, 29.75, 30, 0.02); P.glitchSeed = Math.floor(t * 30); P.ca = 0.0016 + P.glitch * 0.005;
    P.fade = t >= 29.85 ? 1 : 0;
    titleBug(stage, t, 8, "THE ORIGINAL", 0.3, 2.5);
  };
};
