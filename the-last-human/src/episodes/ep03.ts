// EPISODE 03 — FORBIDDEN MEMORY
// 0–5   Kael discovers an abandoned memory chip (macro in a puddle -> his hand picks it up)
// 5–15  He inserts it into an underground terminal (walk, insert shot, boot)
// 15–22 A childhood memory: a little boy standing beside Dr. Vex (warm, VHS-worn)
// 22–27 The boy looks directly at the camera
// 27–30 "Kael... don't trust your memories."
import * as THREE from "three";
import type { Stage } from "../engine/Stage";
import { make, KAEL, KAEL_CHILD, VEX } from "../characters/Cast";
import { industrialRoom, terminal, memoryLab } from "../environments/Interiors";
import { neonRig } from "../environments/Lighting";
import { motes } from "../effects/Rain";
import { applyShots, Shot } from "../camera/Camera";
import { glow, tex, canvas } from "../engine/textures";
import { clamp, ramp, window as win, lerp, smooth, flicker, hash } from "../utils/math";
import { titleBug, mouth } from "./common";

export const meta = { n: 3, title: "FORBIDDEN MEMORY" };

export const ep03 = (stage: Stage) => {
  const S = stage.scene;
  const L = neonRig(stage, { fogDensity: 0.06, fog: 0x070812, env: 0.3 });
  L.fill.intensity = 0.15; L.key.intensity = 0; L.rim.intensity = 0.6; L.accent.intensity = 0;
  const room = industrialRoom(stage, { w: 6, d: 26, h: 4, wet: true, tubes: 5, tubeColor: 0x9fd0ff, seed: 9, base: "#1a1b22" });
  const term = terminal(stage, { w: 1.6 }); term.group.position.set(0, 0, -9.5);
  const dust = motes(stage, { count: 900, box: [5, 3.5, 20], center: [0, 2, -2], color: 0x8fb8ff, size: 2 });
  // memory set (far away, only visible during the flashback)
  const mem = memoryLab(stage); mem.group.position.set(200, 0, 0); mem.group.visible = false;
  const child = make(KAEL_CHILD); mem.group.add(child.root); child.root.position.set(-0.6, 0, -1.4);
  const vex = make(VEX); mem.group.add(vex.root); vex.root.position.set(-1.25, 0, -1.75);
  const memDust = motes(stage, { count: 600, box: [4, 3, 6], center: [201, 1.6, -1], color: 0xffd8a0, size: 3 }); memDust.visible = false;
  // the chip: emissive circuit card + glow, lying in a puddle
  const cc = canvas(256, 128), cg = cc.getContext("2d")!; cg.fillStyle = "#081018"; cg.fillRect(0, 0, 256, 128); cg.strokeStyle = "#5ff4ff"; cg.lineWidth = 3; cg.shadowColor = "#5ff4ff"; cg.shadowBlur = 8;
  for (let i = 0; i < 14; i++) { cg.beginPath(); const y = 10 + hash(i) * 108; cg.moveTo(0, y); cg.lineTo(60 + hash(i + 1) * 80, y); cg.lineTo(90 + hash(i + 2) * 120, 10 + hash(i + 3) * 108); cg.stroke(); }
  cg.font = "700 22px Orbitron"; cg.fillStyle = "#cfffff"; cg.fillText("V-07", 170, 116);
  const chip = new THREE.Group(); S.add(chip);
  const card = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.004, 0.035), [0, 0, new THREE.MeshBasicMaterial({ map: tex(cc), toneMapped: false, color: new THREE.Color(1.5, 1.5, 1.5) }), 0, 0, 0].map((m) => m || new THREE.MeshStandardMaterial({ color: 0x223040, metalness: 0.8, roughness: 0.3 })) as any);
  chip.add(card);
  const chipGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow("#5ff4ff"), color: 0x5ff4ff, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); chipGlow.scale.setScalar(0.22); chip.add(chipGlow);
  const chipL = new THREE.PointLight(0x5ff4ff, 1.2, 1.2, 1.5); chipL.position.y = 0.05; chip.add(chipL);
  const ripples = [0, 1, 2].map(() => { const r = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48), new THREE.MeshBasicMaterial({ color: 0x8fd8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); r.rotation.x = -Math.PI / 2; S.add(r); return r; });
  const CHIP0 = new THREE.Vector3(0.55, 0.012, 2.0);
  const kael = make(KAEL); S.add(kael.root);
  const sparkL = new THREE.PointLight(0xbfe8ff, 0, 2, 1.5); S.add(sparkL);
  const screenGlow = new THREE.PointLight(0x7fd8ff, 0, 4, 1.4); S.add(screenGlow);

  // Kael blocking: walks in, crouches at the chip (2.4–5), stands, walks to the terminal (5–9.2), inserts (9.2–12)
  const kpos = (t: number) => {
    if (t < 2.6) return new THREE.Vector3(0.62, 0, lerp(3.4, 2.4, smooth(t / 2.6)));
    if (t < 5.2) return new THREE.Vector3(0.62, 0, 2.4);
    if (t < 9.2) return new THREE.Vector3(lerp(0.62, 0.25, smooth((t - 5.2) / 4)), 0, lerp(2.4, -8.65, smooth((t - 5.2) / 4)));
    return new THREE.Vector3(0.25, 0, -8.65);
  };
  const head = () => kael.headPos(new THREE.Vector3());
  const chipAt = (t: number) => {
    if (t < 3.7) return CHIP0.clone();
    const hand = kael.ha[1].getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, -0.06, 0.02));
    if (t < 9.8) return hand;
    const slot = term.slotPos.clone().add(term.group.position);
    return hand.lerp(slot, smooth((t - 9.8) / 1.2));
  };

  const shots: Shot[] = [
    { a: 0, b: 2.6, name: "Macro — a chip glowing in the water", fn: (k) => ({ p: [CHIP0.x - 0.22 + k * 0.05, 0.07, CHIP0.z + 0.28 - k * 0.06], l: [CHIP0.x, 0.01, CHIP0.z], mm: 60 }), hand: 0.002, aperture: 10, focus: 0.33 },
    { a: 2.6, b: 5.2, name: "His hand enters — picks it up", fn: (k) => ({ p: [CHIP0.x - 0.75, 0.35, CHIP0.z + 0.5], l: [CHIP0.x - 0.05, lerp(0.15, 0.55, smooth((k - 0.4) / 0.6)), CHIP0.z - 0.1], mm: 35 }), hand: 0.006, aperture: 5 },
    { a: 5.2, b: 9.2, name: "Tracking — down the dead tunnel", fn: (k, t) => { const p = kpos(t); return { p: [p.x - 0.5, 1.55, p.z + 2.3], l: [0, 1.3, -9.5], mm: 28 }; }, hand: 0.02 },
    { a: 9.2, b: 12, name: "Insert — chip into the slot", fn: (k) => { const sp = term.slotPos.clone().add(term.group.position); return { p: [sp.x + 0.35, sp.y + 0.25, sp.z + 0.45], l: [sp.x, sp.y, sp.z], mm: 50 }; }, hand: 0.004, aperture: 6 },
    { a: 12, b: 15, name: "CU — the screen wakes on his face", fn: (k) => { const h = head(); return { p: [h.x + 0.25, h.y - 0.05, h.z - 0.62 + k * 0.08], l: [h.x, h.y, h.z], mm: 50 }; }, hand: 0.006, aperture: 4 },
    { a: 15, b: 18.6, name: "MEMORY — wide, sunlit lab", from: { p: [201.6, 1.25, 1.6], l: [199.2, 1.0, -1.8], mm: 30 }, to: { p: [201.3, 1.2, 1.2], l: [199.2, 1.0, -1.8], mm: 32 }, hand: 0.012, aperture: 2 },
    { a: 18.6, b: 22, name: "MEMORY — the boy beside Dr. Vex", from: { p: [200.4, 1.05, 0.55], l: [199.15, 0.95, -1.55], mm: 40 }, to: { p: [200.25, 1.0, 0.3], l: [199.2, 0.95, -1.55], mm: 42 }, hand: 0.01, aperture: 3 },
    { a: 22, b: 27, name: "The boy looks into the lens", fn: (k) => { const c = child.headPos(new THREE.Vector3()); return { p: [c.x + 0.05, c.y + 0.02, c.z + lerp(1.3, 0.62, smooth(k))], l: [c.x, c.y, c.z], mm: 50 }; }, hand: 0.006, aperture: 4 },
    { a: 27, b: 30, name: "\"Don't trust your memories\"", fn: (k) => { const c = child.headPos(new THREE.Vector3()); return { p: [c.x + 0.03, c.y + 0.01, c.z + lerp(0.6, 0.5, k)], l: [c.x, c.y, c.z], mm: 55 }; }, hand: 0.004, aperture: 4 },
  ];

  return (t: number) => {
    const P = stage.post; const inMem = t >= 15 && t < 30;
    room.group.visible = !inMem; term.group.visible = !inMem; dust.visible = !inMem; chip.visible = !inMem; kael.root.visible = !inMem;
    mem.group.visible = inMem; memDust.visible = inMem; L.fill.visible = !inMem; L.rim.visible = !inMem;
    room.power(t, 1, 0.45);
    // --- Kael
    kael.reset(); const kp = kpos(t); kael.root.position.copy(kp); kael.root.rotation.y = Math.PI;
    if (t < 2.6) kael.walk(t / 1.1, 0.8); else if (t < 5.2) { const c = win(t, 2.7, 5.1, 0.6); kael.crouch(c); kael.reach(1, c, 1); kael.look(0, 0.4 * c); }
    else if (t < 9.2) { kael.walk((t - 5.2) / 1.1); kael.reach(1, 0.25); } else { const r = win(t, 9.4, 11.8, 0.5); kael.reach(1, r, 0.3); kael.spine.rotation.x += 0.25 * r; kael.look(0, 0.35); }
    if (t >= 12) { kael.look(0, 0.3); kael.s.squint = 0.3; kael.s.browUp = 0.4 * ramp(t, 13, 14); }
    kael.s.gy = t >= 9.2 ? -0.4 : 0.2; kael.autoBlink(t, 7); kael.applyFace();
    // --- chip + ripples
    chip.position.copy(chipAt(t)); chip.rotation.y = 0.4; chipGlow.material.opacity = 0.6 + 0.4 * Math.sin(t * 3);
    ripples.forEach((r, i) => { const ph = ((t * 0.7 + i / 3) % 1); r.position.set(CHIP0.x + (i - 1) * 0.03, 0.006, CHIP0.z + (i - 1) * 0.02); r.scale.setScalar(0.02 + ph * 0.16); (r.material as THREE.MeshBasicMaterial).opacity = (1 - ph) * 0.5 * (t < 3.7 ? 1 : 0); });
    // --- terminal: insert sparks, boot sequence, live screen
    const inserted = t >= 11.0; term.slotLight.material = term.slotLight.material as THREE.MeshBasicMaterial; (term.slotLight.material as THREE.MeshBasicMaterial).color.setHex(inserted ? 0x38e8ff : 0xff2a3d).multiplyScalar(2);
    sparkL.position.copy(term.slotPos).add(term.group.position).y += 0.05; sparkL.intensity = win(t, 11.0, 11.35, 0.05) * 8 * flicker(t, 30, 0.6);
    const boot = ramp(t, 11.2, 11.6);
    { const { g, c } = term.scr; g.fillStyle = "#020306"; g.fillRect(0, 0, c.width, c.height);
      if (boot > 0) {
        g.globalAlpha = boot; g.font = "500 30px monospace"; g.fillStyle = "#7feaff"; g.shadowColor = "#7feaff"; g.shadowBlur = 10;
        const lines = ["NEO-EDEN MAINT. TERMINAL 4C", "> mount /dev/mem_v07", "  reading fragment 0x7F ...", "  integrity: 61%  (CORRUPTED)", "> decrypt --legacy --force", "  key: VEX-ROOT ............ OK", "  MEMORY FRAGMENT RESTORED", "> play"];
        const shown = Math.floor((t - 11.2) * 3.2);
        lines.slice(0, shown).forEach((s, i) => { g.fillStyle = s.includes("CORRUPTED") ? "#ff6a7a" : s.includes("RESTORED") ? "#ffffff" : "#7feaff"; g.fillText(s, 40, 60 + i * 52); });
        if (t > 13.8) { g.globalAlpha = boot * win(t, 13.8, 15, 0.3); g.fillStyle = "#ffd8a0"; g.fillRect(0, 0, c.width, c.height); }
        for (let y = 0; y < c.height; y += 4) { g.globalAlpha = 0.2; g.fillStyle = "#000"; g.fillRect(0, y, c.width, 2); }
        g.globalAlpha = 1; g.shadowBlur = 0;
      }
      term.scr.commit(); }
    term.glowL.intensity = boot * (6 + 3 * flicker(t, 12, 0.7)) + win(t, 13.8, 15, 0.3) * 12; term.glowL.color.setHex(t > 13.8 ? 0xffd0a0 : 0x6fd8ff);
    screenGlow.position.set(0.2, 1.6, -8.4); screenGlow.intensity = boot * 2;
    // --- memory: child + Vex
    child.reset(); child.idle(t * 1.3); vex.reset(); vex.idle(t); vex.crouch(0.55); vex.look(0.5, 0.25); vex.reach(1, 0.55); vex.sh[1].rotation.z += 0.5; vex.s.smile = 0.6; vex.autoBlink(t, 4);
    const turn = ramp(t, 22.2, 23.4);
    child.root.rotation.y = lerp(-0.9, 0.25, turn); child.look(lerp(-0.4, 0.05, turn), lerp(-0.25, 0, turn)); child.s.gx = lerp(-0.4, 0.02, turn);
    child.s.mouth = mouth("e03_l1", t); child.s.browUp = t > 26.5 ? 0.6 : 0.2; child.autoBlink(t, 9);
    child.applyFace(); vex.applyFace();
    // memory degradation: Vex flickers away as the boy turns to us
    vex.root.visible = !(t > 23.5 && flicker(t, 14, 0.5 - ramp(t, 23.5, 25.5) * 0.5) === 0) && t < 25.6;
    // --- camera & post
    applyShots(stage, shots, t, win(t, 11.0, 11.3, 0.03) * 0.3);
    P.exposure = inMem ? 1.05 : 1.2; P.bloom = inMem ? 1.2 : 0.9; P.bloomThreshold = inMem ? 0.7 : 0.55;
    P.saturation = inMem ? 0.78 : 1.0; P.contrast = inMem ? 0.95 : 1.1;
    P.lift.setRGB(inMem ? 0.06 : 0.01, inMem ? 0.035 : 0.0, inMem ? 0.01 : 0.035); P.gain.setRGB(inMem ? 1.1 : 0.98, inMem ? 0.98 : 0.98, inMem ? 0.82 : 1.08);
    P.grain = inMem ? 0.09 : 0.055; P.scan = inMem ? 0.06 : 0; P.bars = inMem ? 1 : 0; P.vignette = inMem ? 0.75 : 0.6;
    P.flash = win(t, 14.75, 15.25, 0.25) * 0.9;
    P.glitch = (inMem ? 0.06 * flicker(t, 3, 0.2) : 0) + win(t, 23.5, 23.7, 0.03) * 0.5 + win(t, 25.4, 25.65, 0.03) * 0.6 + win(t, 29.0, 29.85, 0.15) * 0.9; P.glitchSeed = Math.floor(t * 24);
    P.ca = 0.0018 + P.glitch * 0.006 + (inMem ? 0.002 : 0);
    P.fade = t >= 29.85 ? 1 : 0;
    titleBug(stage, t, 3, "FORBIDDEN MEMORY", 0.3, 2.5);
    if (inMem && t < 29.8) { const g = stage.hud; g.save(); g.globalAlpha = 0.75 * flicker(t, 2, 0.85); g.font = "600 30px monospace"; g.fillStyle = "#ffe2b8"; g.fillText("▶ PLAY   FRAGMENT 0x7F", 60, 230); g.fillText(`REC  ${String(Math.floor((t - 15) / 60)).padStart(2, "0")}:${String(Math.floor(t - 15) % 60).padStart(2, "0")}:${String(Math.floor(((t - 15) % 1) * 30)).padStart(2, "0")}`, 60, 272); g.fillText("2131-04-17", stage.W - 280, 230); g.restore(); }
  };
};
