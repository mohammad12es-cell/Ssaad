// EPISODE 04 — THE HUNTER
// 0–5   A giant security robot emerges from the rain (stomp -> tilt up -> visor ignites -> robot POV: TARGET ACQUIRED)
// 5–15  Kael runs through a crowded neon market (front / side / rear tracking)
// 15–23 Chase: close calls, stalls smashed, camera shake
// 23–27 The robot catches his jacket
// 27–30 Kael turns around. His eyes briefly glow red.
import * as THREE from "three";
import type { Stage } from "../engine/Stage";
import { make, KAEL } from "../characters/Cast";
import { Robot } from "../characters/Machines";
import { streetSet } from "../scenes/street";
import { market } from "../environments/Interiors";
import { crowd } from "../characters/Crowd";
import { applyShots, Shot } from "../camera/Camera";
import { clamp, ramp, window as win, lerp, smooth, flicker, easeIn, easeOut } from "../utils/math";
import { HUD, titleBug, project } from "./common";

export const meta = { n: 4, title: "THE HUNTER" };

export const ep04 = (stage: Stage) => {
  const S = stage.scene;
  const set = streetSet(stage, { crowd: 30, seed: 41, eveAd: false });
  const { city, L } = set;
  const M = market(stage); const MZ = -78; M.group.position.z = MZ;
  M.lights.forEach((l, i) => l.position.set(i % 2 ? 2.5 : -2.5, 2.6, 0));
  const kael = make(KAEL); S.add(kael.root);
  const bot = new Robot(); S.add(bot.root); bot.root.scale.setScalar(1.12);
  const visorL = new THREE.PointLight(0xff2a3d, 0, 9, 1.4); S.add(visorL);
  // extra market crowd (they dodge out of the way)
  const mk = crowd(stage, { n: 26, zMin: MZ - 72, zMax: MZ + 4, xMin: -2.3, xMax: 2.3, seed: 44 });

  // --- blocking (world z)
  const RUN0 = 4.4, SPD = 3.7, CATCH = 24.4;
  const kz = (t: number) => { const z0 = MZ + 2; if (t < RUN0) return z0; const tt = Math.min(t, CATCH) - RUN0; const after = t > CATCH ? easeOut(clamp((t - CATCH) / 0.5)) * 0.35 : 0; return z0 - tt * SPD + after; };
  const kx = (t: number) => 0.3 * Math.sin(t * 1.3) + (t > 15.8 && t < 16.8 ? -0.6 * Math.sin(((t - 15.8) / 1) * Math.PI) : 0);
  const gap = (t: number) => t < RUN0 ? 22 - t * 1.0 : lerp(17.6, 1.05, smooth(clamp((t - RUN0) / (CATCH - RUN0))));
  const rz = (t: number) => kz(t) + gap(t);
  const rx = (t: number) => 1.3 * Math.sin((t - 12) * 0.9) * ramp(t, 11, 12) * (1 - ramp(t, 22, 23));
  // stalls smashed when the robot passes them
  const smashT: number[] = M.stalls.map((st) => { const z = st.z + MZ; for (let t = 4; t < 24; t += 0.01) if (rz(t) < z + 0.5 && Math.sign(st.x) === Math.sign(rx(t) || 1) && Math.abs(st.x - rx(t)) < 2.6) return t; return 99; });
  const head = () => kael.headPos(new THREE.Vector3());
  const botHead = () => bot.head.getWorldPosition(new THREE.Vector3());

  const shots: Shot[] = [
    { a: 0, b: 1.3, name: "Ground level — a foot stomps into the puddle", fn: (k) => ({ p: [rx(0) + 1.4, 0.12, rz(0) + 3.4], l: [rx(0) + 0.3, 0.3, rz(0)], mm: 24 }), hand: 0.01 },
    { a: 1.3, b: 2.7, name: "Tilt up — the Hunter, visor ignites", fn: (k) => { const b = botHead(); return { p: [rx(1.3) + 1.6, 0.35, rz(1.3) + 4.0], l: [b.x, lerp(1.0, b.y, smooth(k)), b.z], mm: 22 }; }, hand: 0.015 },
    { a: 2.7, b: 5, name: "Robot POV — TARGET ACQUIRED", fn: (k, t) => { const b = botHead(); const h = head(); return { p: [b.x, b.y, b.z - 0.4], l: [h.x, h.y - 0.2, h.z], mm: lerp(30, 60, smooth(k)) }; }, hand: 0.01 },
    { a: 5, b: 8.5, name: "Front track — Kael runs at us", fn: (k, t) => ({ p: [kx(t) + 0.4, 1.0, kz(t) - 3.0], l: [kx(t), 1.5, kz(t)], mm: 26 }), hand: 0.04 },
    { a: 8.5, b: 11.5, name: "Side track — stalls whip past", fn: (k, t) => ({ p: [kx(t) - 2.0, 1.2, kz(t) + 0.2], l: [kx(t), 1.3, kz(t) - 0.4], mm: 32 }), hand: 0.035 },
    { a: 11.5, b: 15, name: "Rear high — the Hunter in pursuit", fn: (k, t) => ({ p: [rx(t) + 1.8, 4.3, rz(t) + 4.2], l: [kx(t), 1.2, kz(t)], mm: 26 }), hand: 0.04 },
    { a: 15, b: 17.5, name: "Close call — claw swipe", fn: (k, t) => ({ p: [kx(t) + 1.0, 1.1, kz(t) - 1.4], l: [kx(t) + 0.2, 1.6, kz(t) + 1.0], mm: 20, roll: 0.12 }), hand: 0.05 },
    { a: 17.5, b: 20, name: "Low angle — the Hunter crashes through", fn: (k, t) => ({ p: [rx(t) - 1.8, 0.4, rz(t) - 4.5], l: [rx(t), 2.4, rz(t)], mm: 20, roll: -0.1 }), hand: 0.04 },
    { a: 20, b: 23, name: "Front long lens — it closes in", fn: (k, t) => ({ p: [kx(t) + 0.2, 1.4, kz(t) - 9], l: [kx(t), 1.8, kz(t) + 1.5], mm: 70 }), hand: 0.02, aperture: 3, focus: 9 },
    { a: 23, b: 25.2, name: "CU — the claw catches the jacket", fn: (k, t) => { const h = head(); return { p: [h.x + 0.9, h.y - 0.1, h.z - 0.5], l: [h.x, h.y - 0.25, h.z + 0.35], mm: 35 }; }, hand: 0.03 },
    { a: 25.2, b: 27, name: "MS — yanked back", fn: (k, t) => { const h = head(); return { p: [h.x - 1.4, h.y - 0.3, h.z - 1.8], l: [h.x, h.y - 0.2, h.z + 0.4], mm: 30 }; }, hand: 0.03 },
    { a: 27, b: 30, name: "CU — he turns. Red eyes.", fn: (k) => { const h = head(); const e = kael.eyePos(0, new THREE.Vector3()).add(kael.eyePos(1, new THREE.Vector3())).multiplyScalar(0.5); const f = e.clone().sub(h).normalize(); return { p: [e.x + f.x * 0.5, e.y + 0.02, e.z + f.z * 0.5], l: [e.x, e.y - 0.02, e.z], mm: lerp(45, 60, smooth(k)) }; }, hand: 0.006, aperture: 4 },
  ];

  return (t: number) => {
    const P = stage.post;
    city.update(t + 60); set.people.update(t + 60);
    // --- crowd dodge
    mk.update(t);
    for (const w of mk.list) { const dz = w.h.root.position.z - kz(t); const near = Math.exp(-(dz * dz) / 6); w.h.root.position.x += Math.sign(w.h.root.position.x - kx(t) || 1) * near * 1.6; const dr = w.h.root.position.z - rz(t); w.h.root.position.x += Math.sign(w.h.root.position.x - rx(t) || 1) * Math.exp(-(dr * dr) / 10) * 2.2; }
    // --- Kael
    const K = new THREE.Vector3(kx(t), 0, kz(t));
    kael.reset(); kael.root.position.copy(K);
    kael.root.rotation.y = Math.PI + (t < RUN0 ? lerp(Math.PI, 0, ramp(t, 3.8, 4.4)) : 0) + (t > 27 ? lerp(0, Math.PI * 0.85, smooth((t - 27) / 1.0)) : 0);
    if (t < 3.8) { kael.idle(t); kael.look(0, -0.05); }
    else if (t < CATCH) { kael.run((t - RUN0) * 1.55, ramp(t, 3.9, 4.6)); if (t > 15.8 && t < 16.8) kael.crouch(0.35 * Math.sin(((t - 15.8) / 1) * Math.PI)); kael.look(t > 19 && t < 20 ? 0.9 : 0, 0); }
    else { const y = ramp(t, CATCH, CATCH + 0.3); kael.run((CATCH - RUN0) * 1.55, 1 - y); kael.spine.rotation.x -= 0.5 * y * (1 - ramp(t, 26, 27)); kael.chest.rotation.x -= 0.2 * y; kael.sh[0].rotation.x -= 1.2 * y * (1 - ramp(t, 26.5, 27.5)); kael.sh[1].rotation.x -= 0.6 * y; kael.look(t > 27 ? 0 : -0.5, -0.1); }
    kael.s.squint = t > 4 ? 0.3 : 0; kael.s.frown = t > 4 ? 0.7 : 0.2; kael.s.mouth = t > 4.5 && t < CATCH ? 0.25 + 0.15 * Math.sin(t * 9) : 0;
    // RED EYES (27.9–29.3)
    const red = win(t, 28.1, 29.3, 0.15); kael.s.eyeGlow = red; kael.s.eyeGlowColor.setHex(0xff2030);
    kael.autoBlink(t, 3); if (t > 27.4 && t < 27.6) kael.s.blink = 1; kael.applyFace();
    // --- Robot
    bot.reset(); bot.root.position.set(rx(t), 0, rz(t)); bot.root.rotation.y = Math.PI + (t > CATCH ? 0 : Math.atan2(kx(t) - rx(t), -(kz(t) - rz(t))) * 0.5);
    const ph = t < RUN0 ? t * 0.55 : RUN0 * 0.55 + (t - RUN0) * 1.25;
    bot.stride(ph, t < 23 ? 1 : 1 - ramp(t, 24.4, 25), t < RUN0 ? 0 : 1);
    const visor = t < 1.3 ? 0 : ramp(t, 1.45, 1.6) * (t < 1.9 ? flicker(t, 14, 0.6) : 1);
    (bot.visor.material as THREE.MeshBasicMaterial).color.setRGB(5 * visor + 0.05, 0.6 * visor, 0.7 * visor); bot.visorGlow.material.opacity = visor;
    visorL.position.copy(botHead()).add(new THREE.Vector3(0, 0, -0.8)); visorL.intensity = visor * 10;
    // claw: swipe at 15.9–16.5, reach + grab from 22.6
    const sw = win(t, 15.6, 16.6, 0.25), grab = ramp(t, 22.6, CATCH);
    bot.sh[1].rotation.x -= 1.6 * sw + 1.55 * grab; bot.sh[1].rotation.z -= 0.6 * sw; bot.el[1].rotation.x += 0.4 * grab;
    bot.claw[1].scale.setScalar(1 + 0.2 * grab); bot.claw[1].rotation.x = -0.6 * ramp(t, CATCH - 0.1, CATCH + 0.1);
    bot.head.rotation.y = Math.sin(t * 0.7) * 0.15 * (t < RUN0 ? 1 : 0);
    // --- market destruction
    M.stalls.forEach((st, i) => M.smash(i, t, smashT[i], new THREE.Vector3(Math.sign(st.x) * 0.6, 0, -0.8)));
    set.follow(K);
    M.lights.forEach((l, i) => { l.position.z = kz(t) - MZ + (i - 1.5) * 4; l.intensity = 14 * (0.8 + 0.2 * flicker(t, 7, 0.8, i)); });
    // --- camera & post
    const stomp = Robot.stomp(ph) * clamp(1.2 - Math.abs(rz(t) - stage.camera.position.z) / 14);
    const smashImp = Math.max(0, ...smashT.map((s) => win(t, s, s + 0.35, 0.05)));
    applyShots(stage, shots, t, Math.max(stomp * 0.8, smashImp, win(t, 15.9, 16.3, 0.05) * 0.6, win(t, CATCH, CATCH + 0.4, 0.05) * 0.9));
    P.exposure = 1.15; P.bloom = 1.05; P.grain = 0.06; P.vignette = 0.65;
    P.glitch = win(t, 28.1, 28.25, 0.02) * 0.4 + win(t, 29.75, 30, 0.02); P.glitchSeed = Math.floor(t * 30);
    P.ca = 0.0016 + (t > 2.7 && t < 5 ? 0.004 : 0) + red * 0.003;
    P.tintAmt = t > 2.7 && t < 5 ? 0.35 : red * 0.15; P.tint.setRGB(1, 0.18, 0.22);
    P.scan = t > 2.7 && t < 5 ? 0.12 : 0;
    P.fade = t >= 29.85 ? 1 : 0;
    titleBug(stage, t, 4, "THE HUNTER", 0.3, 2.6);
    // robot-vision HUD
    if (t >= 2.7 && t < 5) {
      const g = stage.hud, W = stage.W, H = stage.H; HUD.frame(g, W, H, "#ff2a3d", 0.8); HUD.scanlines(g, W, H, 0.12);
      const kp = project(stage, head()); const lock = ramp(t, 2.9, 3.6);
      HUD.reticle(g, kp.x, kp.y + 60, lerp(260, 90, lock), "#ff2a3d", { spin: t * 5, lw: 5 });
      HUD.text(g, "HUNTER-09 // OPTICS", 90, 120, { size: 28, font: "Rajdhani", weight: 700, color: "#ff8a94" });
      HUD.text(g, `RANGE ${(gap(t)).toFixed(1)} M`, 90, 160, { size: 26, font: "Rajdhani", weight: 600, color: "#ff8a94" });
      if (t > 3.6) { HUD.glitchText(g, "TARGET ACQUIRED", W / 2, H * 0.63, t, flicker(t, 12, 0.75) ? 0.15 : 1, { size: 70, weight: 900, color: "#ff2a3d", align: "center" });
        HUD.text(g, "UNREGISTERED ORGANISM · PURSUE", W / 2, H * 0.63 + 70, { size: 30, font: "Rajdhani", weight: 700, color: "#ff8a94", align: "center" }); }
    }
  };
};
