// EPISODE 02 — THE GLITCH
// 0–5   Security drones surround Kael (drop-in top shot -> low orbit)
// 5–13  A massive holographic screen attempts facial recognition (live feed of his face, landmark grid)
// 13–20 E.V.E: "Citizen identification failed."
// 20–26 The screen(s) begin displaying corrupted images of Kael
// 26–30 E.V.E whispers: "Impossible. He's not connected."
import * as THREE from "three";
import type { Stage } from "../engine/Stage";
import { make, KAEL } from "../characters/Cast";
import { Drone } from "../characters/Machines";
import { streetSet } from "../scenes/street";
import { faceFeed } from "../effects/FaceFeed";
import { applyShots, Shot } from "../camera/Camera";
import { LiveCanvas } from "../engine/textures";
import { clamp, ramp, window as win, lerp, smooth, flicker, easeOut, hash } from "../utils/math";
import { HUD, titleBug, mouth } from "./common";

export const meta = { n: 2, title: "THE GLITCH" };

export const ep02 = (stage: Stage) => {
  const S = stage.scene;
  const set = streetSet(stage, { crowd: 34, seed: 21 });
  const { city, people, L } = set;
  const kael = make(KAEL); S.add(kael.root);
  const K = new THREE.Vector3(0.4, 0, -31.5);
  // four security drones
  const drones = [0, 1, 2, 3].map(() => { const d = new Drone(); S.add(d.root); return d; });
  const reds = drones.map(() => { const l = new THREE.PointLight(0xff2a3d, 0, 7, 1.6); S.add(l); return l; });
  // the giant billboard on the right-hand tower, showing the live face feed
  const feed = faceFeed(stage, 512);
  const board = new THREE.Group(); board.position.set(10.0, 17, -40); board.rotation.y = -Math.PI / 2 + 0.28; S.add(board);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(17, 21.5, 0.6), new THREE.MeshStandardMaterial({ color: 0x0c0d14, metalness: 0.8, roughness: 0.3 })); frame.position.z = -0.35; board.add(frame);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(16, 20), feed.mat); board.add(screen);
  const ui = new LiveCanvas(800, 1000);
  const uiMesh = new THREE.Mesh(new THREE.PlaneGeometry(16, 20), new THREE.MeshBasicMaterial({ map: ui.t, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); uiMesh.position.z = 0.05; board.add(uiMesh);
  const boardLight = new THREE.PointLight(0x5fd8ff, 0, 40, 1.2); boardLight.position.set(6, 12, -36); S.add(boardLight);
  feed.hide.push(board);
  // other signs that get hijacked by the corrupted face (20–26s)
  const hijack = city.signs.filter((s) => s.position.z < -20 && s.position.z > -75).slice(0, 10);
  const orig = hijack.map((s) => s.material);
  // E.V.E (the giant skyline hologram) is brought closer and turns to face Kael
  const eve = city.eveAd!, eveG = city.eveAdGroup!;
  eveG.position.set(-13, 0, -58); eveG.rotation.y = 0.5;

  const head = () => kael.headPos(new THREE.Vector3());
  const eveHead = () => eve.headPos(new THREE.Vector3());
  const dronePos = (i: number, t: number) => {
    const a = (i / 4) * Math.PI * 2 + 0.6 + t * 0.12; const drop = easeOut(clamp((t - i * 0.25) / 2.2));
    return new THREE.Vector3(K.x + Math.cos(a) * 2.6, lerp(14, 2.7 + (i % 2) * 0.5, drop), K.z + Math.sin(a) * 2.6);
  };
  const shots: Shot[] = [
    { a: 0, b: 2.3, name: "Top shot — drones drop in", fn: (k) => ({ p: [K.x + 0.6, lerp(9, 7.5, k), K.z + 0.8], l: [K.x, 0.8, K.z], mm: 22, roll: k * 0.3 }), hand: 0.02 },
    { a: 2.3, b: 5, name: "Low orbit — surrounded", fn: (k) => { const a = lerp(0.2, 1.6, k); return { p: [K.x + Math.cos(a) * 2.0, 0.6, K.z + Math.sin(a) * 2.0], l: [K.x, 1.9, K.z], mm: 20 }; }, hand: 0.015 },
    { a: 5, b: 8.5, name: "Wide OTS — the billboard wakes", from: { p: [K.x - 1.0, 1.2, K.z + 4.5], l: [8, 16, -40], mm: 22 }, to: { p: [K.x - 1.2, 1.0, K.z + 3.4], l: [8.5, 17, -40], mm: 24 }, hand: 0.02 },
    { a: 8.5, b: 10.8, name: "Billboard CU — matching", fn: (k) => ({ p: [4, lerp(15, 17, k), -36 + k], l: [10, 17.5, -40.5], mm: 40 }), hand: 0.03 },
    { a: 10.8, b: 13, name: "CU Kael lit by the scan", fn: (k) => { const h = head(); return { p: [h.x - 0.35, h.y - 0.1, h.z - 0.75 + k * 0.1], l: [h.x, h.y, h.z], mm: 55 }; }, hand: 0.006, aperture: 4 },
    { a: 13, b: 17.0, name: "Low angle — E.V.E turns to him", fn: (k) => { const e = eveHead(); return { p: [K.x + 0.9, 1.1, K.z + 2.2], l: [lerp(e.x, e.x + 2, 1 - k), lerp(e.y - 6, e.y, smooth(k)), e.z], mm: lerp(24, 30, k) }; }, hand: 0.02 },
    { a: 17.0, b: 20, name: "CU Kael — IDENTIFICATION FAILED", fn: (k) => { const h = head(); return { p: [h.x + 0.5, h.y - 0.05, h.z - 0.6], l: [h.x, h.y, h.z], mm: 50 }; }, hand: 0.006, aperture: 5 },
    { a: 20, b: 23, name: "Pull back — the city shows his corrupted face", fn: (k) => ({ p: [K.x - 1.5, lerp(1.6, 5, smooth(k)), K.z + lerp(2, 9, smooth(k))], l: [K.x + 2, lerp(2.5, 10, smooth(k)), K.z - 12], mm: 22 }), hand: 0.02 },
    { a: 23, b: 26, name: "Push in — corruption on the billboard", fn: (k) => ({ p: [lerp(3, 6, k), 16.5, lerp(-34, -37.5, k)], l: [10, 17, -40.5], mm: 35 }), hand: 0.035 },
    { a: 26, b: 28.6, name: "CU E.V.E whispers", fn: (k) => { const e = eveHead(); return { p: [e.x + 3.0 + k, e.y + 0.3, e.z + 6.5 - k * 1.2], l: [e.x, e.y + 0.2, e.z], mm: 50 }; }, hand: 0.03 },
    { a: 28.6, b: 30, name: "ECU E.V.E's eyes", fn: (k) => { const e = eve.eyePos(0, new THREE.Vector3()); return { p: [e.x + 1.4, e.y + 0.1, e.z + 2.8 - k * 0.4], l: [e.x - 0.4, e.y, e.z], mm: 50 }; }, hand: 0.02 },
  ];

  const drawUI = (t: number) => {
    const { g, c } = ui; g.clearRect(0, 0, c.width, c.height); const W = c.width, H = c.height;
    const on = ramp(t, 5.3, 5.8);
    if (t < 5.3) { ui.commit(); return; }
    const fail = t >= 15.2, corrupt = t >= 20;
    const col = fail ? "#ff2a3d" : "#5ff4ff";
    g.globalAlpha = on; g.strokeStyle = col; g.lineWidth = 8; g.shadowColor = col; g.shadowBlur = 20; g.strokeRect(20, 20, W - 40, H - 40);
    g.font = "900 46px Orbitron"; g.fillStyle = col; g.textAlign = "center";
    g.fillText(corrupt ? "ERR//ERR//ERR" : fail ? "IDENTIFICATION FAILED" : "FACIAL RECOGNITION", W / 2, 90);
    if (!corrupt) {
      // landmark points + mesh over the face
      const pts = [[0.5, 0.42], [0.38, 0.4], [0.62, 0.4], [0.5, 0.52], [0.42, 0.62], [0.58, 0.62], [0.5, 0.72], [0.3, 0.5], [0.7, 0.5], [0.5, 0.3]];
      g.lineWidth = 2; g.shadowBlur = 10; g.globalAlpha = on * 0.8;
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) if (hash(i * 13 + j) < 0.35) { g.beginPath(); g.moveTo(pts[i][0] * W, pts[i][1] * H); g.lineTo(pts[j][0] * W, pts[j][1] * H); g.stroke(); }
      for (const [x, y] of pts) { g.beginPath(); g.arc(x * W, y * H, 7, 0, 7); g.fill(); }
      const prog = clamp((t - 6) / 8.5);
      g.globalAlpha = on; g.font = "600 34px Rajdhani"; g.fillText(fail ? "NO MATCH IN 2,104,331,009 RECORDS" : `MATCHING… ${Math.floor(prog * 100)}%   ${Math.floor(prog * 2104331009).toLocaleString("en-US")} RECORDS`, W / 2, H - 120);
      g.fillStyle = "rgba(95,244,255,0.25)"; g.fillRect(80, H - 90, W - 160, 22); g.fillStyle = col; g.fillRect(80, H - 90, (W - 160) * (fail ? 1 : prog), 22);
      if (fail) { g.font = "700 40px Rajdhani"; g.fillText("NEURAL LINK: NOT FOUND", W / 2, H - 175); }
    } else {
      g.font = "700 30px monospace"; g.textAlign = "left";
      for (let i = 0; i < 16; i++) { g.globalAlpha = 0.4 + 0.6 * hash(i + Math.floor(t * 10)); let s = ""; for (let k = 0; k < 30; k++) s += "#@%&01?!/\\<>"[Math.floor(hash(i * 31 + k + Math.floor(t * 14)) * 12)]; g.fillText(s, 50, 160 + i * 52); }
    }
    g.globalAlpha = 1; g.shadowBlur = 0; ui.commit();
  };

  return (t: number) => {
    const P = stage.post;
    city.update(t + 30); people.update(t + 30);
    // Kael: frozen, looking up at the drones, then at the billboard, then at E.V.E
    kael.reset(); kael.root.position.copy(K); kael.root.rotation.y = Math.PI - 0.25 * ramp(t, 4.5, 5.5) + 0.6 * ramp(t, 12.6, 13.6) - 0.35 * ramp(t, 25.5, 26.2);
    kael.idle(t);
    const lookUp = t < 5 ? 0.35 : t < 13 ? 0.55 : 0.45;
    kael.look(t < 5 ? Math.sin(t * 1.5) * 0.5 : 0.25, -lookUp * ramp(t, 0.5, 1.2)); kael.s.gx = t < 5 ? Math.sin(t * 2.2) * 0.6 : 0; kael.s.gy = 0.5;
    kael.s.squint = t > 8.5 && t < 20 ? 0.35 : 0.1; kael.s.frown = t > 15 ? 0.5 : 0.2; kael.s.browUp = t >= 20 && t < 26 ? 0.6 : 0;
    kael.autoBlink(t, 5); kael.applyFace();
    kael.sh[0].rotation.z += 0.15 * ramp(t, 1, 2); kael.sh[1].rotation.z -= 0.15 * ramp(t, 1, 2); // guarded stance
    set.follow(K);

    // drones
    drones.forEach((d, i) => {
      const p = dronePos(i, t); d.root.position.copy(p); d.root.lookAt(K.x, 1.4, K.z); d.update(t + i, { beam: ramp(t, 2.0 + i * 0.15, 2.5 + i * 0.15) * (t < 13 ? 0.5 : 0.25), eye: 1 });
      reds[i].position.copy(p).y -= 0.5; reds[i].intensity = ramp(t, 2, 2.5) * 4;
    });

    // billboard: live face feed (real render of Kael), recognition -> failure -> corruption
    const h = head(); const fwd = new THREE.Vector3(Math.sin(kael.root.rotation.y), 0.35, Math.cos(kael.root.rotation.y)).normalize();
    feed.capture(h.clone().add(fwd.clone().multiplyScalar(1.1)), h);
    const u = feed.mat.uniforms;
    u.power.value = ramp(t, 5.2, 5.6) * (t < 5.6 ? flicker(t, 20, 0.6) : 1);
    u.scan.value = t < 15.2 ? 1 : 0.6; u.red.value = ramp(t, 15.1, 15.4);
    const cor = ramp(t, 20, 22.5);
    u.glitch.value = 0.08 + cor * (0.5 + 0.5 * flicker(t, 9, 0.5)) + win(t, 15.1, 15.4, 0.05);
    u.mosaic.value = cor * (t > 22.5 ? 0.9 : 0.3) * flicker(t, 3, 0.7, 2); u.pixel.value = cor * 0.5 * flicker(t, 5, 0.5, 4); u.invert.value = cor * 0.5;
    boardLight.intensity = u.power.value * (t < 15.2 ? 18 : 24); boardLight.color.setHex(t < 15.2 ? 0x5fd8ff : 0xff3040);
    drawUI(t);
    // hijacked signs show the corrupted feed
    hijack.forEach((s, i) => { s.material = t >= 20.6 + i * 0.25 ? feed.mat : orig[i]; });

    // E.V.E: turns toward Kael, speaks (lip-sync from the voice track)
    eve.reset(); eve.idle(t); eve.look(lerp(-0.6, 0.15, ramp(t, 12.8, 14.0)), lerp(0.05, 0.25, ramp(t, 12.8, 14))); eve.autoBlink(t, 3);
    eve.s.mouth = Math.max(mouth("e02_l1", t), mouth("e02_l2", t)) * 0.9;
    eve.s.squint = t > 26 ? 0.45 : 0; eve.s.frown = t > 26 ? 0.6 : 0; eve.s.gx = t > 13 ? 0.25 : 0;
    eve.applyFace(); eve.setHolo(t, win(t, 15.1, 15.5, 0.05) * 0.5 + (t > 28.6 ? 0.25 * flicker(t, 8, 0.4) : 0) + win(t, 20, 20.4, 0.05), t >= 13 ? 1 : 0.65);

    // camera + post
    const impact = win(t, 1.9, 2.4, 0.05) * 0.6 + win(t, 15.1, 15.5, 0.05) * 0.5 + win(t, 20, 20.5, 0.05) * 0.6;
    applyShots(stage, shots, t, impact);
    set.rain.lines.visible = !(t >= 28.6);
    P.bloom = 1.0; P.exposure = 1.1; P.grain = 0.055;
    P.glitch = win(t, 4.95, 5.12, 0.02) * 0.6 + win(t, 15.1, 15.35, 0.03) * 0.7 + win(t, 20, 20.35, 0.03) * 0.9 + win(t, 29.75, 30, 0.02); P.glitchSeed = Math.floor(t * 30);
    P.ca = 0.0016 + P.glitch * 0.006;
    P.tintAmt = t >= 15.2 && t < 20 ? 0.08 : 0; P.tint.setRGB(1, 0.25, 0.3);
    P.fade = t > 29.85 ? 1 : 0;
    titleBug(stage, t, 2, "THE GLITCH", 0.3, 2.6);
    if (t >= 0.2 && t < 5) { const g = stage.hud; HUD.text(g, `CONTAINMENT · ${Math.min(4, Math.floor(t * 1.4))}/4 UNITS`, stage.W - 70, 150, { size: 26, font: "Rajdhani", weight: 700, color: "#ff6a7a", align: "right", alpha: flicker(t, 4, 0.8) }); }
  };
};
