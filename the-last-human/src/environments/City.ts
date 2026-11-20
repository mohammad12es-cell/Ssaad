// NEO-EDEN: rain-soaked street canyon, towers, neon, wet reflective asphalt, flying traffic,
// sky bridges, the E.V.E central spire, a giant E.V.E hologram ad and a "network" of thousands of citizens.
// Street axis runs along -Z from the origin. Street width 14 m (x = -7..7).
import * as THREE from "three";
import type { Stage } from "../engine/Stage";
import { facade, neon, painted, glow, holoPanel } from "../engine/textures";
import { std, additive, beam } from "../effects/materials";
import { rng } from "../utils/math";
import { Human } from "../characters/Human";
import { EVE } from "../characters/Cast";

export const SIGNS: [string, string][] = [
  ["NEO-EDEN", "#38e8ff"], ["SYNAPSE", "#ff3fa8"], ["E.V.E LOVES YOU", "#8a5cff"], ["CONNECT", "#38e8ff"], ["STAY CALM", "#ff2a3d"],
  ["LUMEN", "#ffb36b"], ["DREAM.EXE", "#8a5cff"], ["KIRA NOODLE", "#ff3fa8"], ["AUGMENT", "#38e8ff"], ["OBEY", "#ff2a3d"], ["SLEEP WELL", "#5a7dff"], ["HAPPY DATA", "#38e8ff"],
];

export type City = {
  group: THREE.Group; cars: { m: THREE.Group; lane: number; speed: number; z0: number; x: number; y: number }[];
  eveAd?: Human; eveAdGroup?: THREE.Group; spire: THREE.Group; ground: THREE.Mesh; buildings: THREE.Mesh[]; signs: THREE.Mesh[];
  network: THREE.Points; update: (t: number) => void; dissolve: (k: number) => void; buildingMats: THREE.MeshStandardMaterial[];
};

export function buildCity(stage: Stage, o: { seed?: number; length?: number; eveAd?: boolean; reflections?: boolean } = {}): City {
  const S = stage.scene, R = rng(o.seed ?? 2157), G = new THREE.Group(); S.add(G);
  const L = o.length ?? 260;
  // ---------- wet asphalt (transparent so mirrored neon underneath reads as reflections) ----------
  const puddle = painted("asphalt", "#0b0b12", ["#000000", "#1b1c2a", "#05050a", "#262838"], { n: 1600, len: 70, alpha: 0.35, seed: 4 });
  puddle.repeat.set(4, 40);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, L + 60), new THREE.MeshStandardMaterial({ map: puddle, color: 0x4a4a5c, roughness: 0.2, metalness: 0.5, transparent: true, opacity: 0.82, envMapIntensity: 0.35 }));
  ground.rotation.x = -Math.PI / 2; ground.position.z = -L / 2 + 10; ground.receiveShadow = true; ground.renderOrder = 1; G.add(ground);
  // sidewalks + kerb light strips
  for (const s of [-1, 1]) {
    const sw = new THREE.Mesh(new THREE.BoxGeometry(3, 0.18, L + 60), std(0x15151f, { roughness: 0.3, metalness: 0.4 })); sw.position.set(s * 8.5, 0.09, -L / 2 + 10); sw.receiveShadow = true; G.add(sw);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, L + 60), new THREE.MeshBasicMaterial({ color: new THREE.Color(s > 0 ? 0xff3fa8 : 0x38e8ff).multiplyScalar(2), toneMapped: false })); strip.position.set(s * 7.0, 0.2, -L / 2 + 10); G.add(strip);
  }
  // ---------- towers ----------
  const buildings: THREE.Mesh[] = [], signs: THREE.Mesh[] = [], mats: THREE.MeshStandardMaterial[] = [];
  const facadeMats = Array.from({ length: 8 }, (_, i) => {
    const m = new THREE.MeshStandardMaterial({ color: 0x0c0d16, roughness: 0.35, metalness: 0.6, emissive: 0xffffff, emissiveMap: facade(100 + i), emissiveIntensity: 1.25, map: painted("concrete" + (i % 3), "#1a1b26", ["#000000", "#2c2f42", "#0a0a10"], { n: 900, len: 80, alpha: 0.3, seed: i }) });
    mats.push(m); return m;
  });
  const box = (w: number, h: number, d: number) => {
    const g = new THREE.BoxGeometry(w, h, d); const uv = g.attributes.uv as THREE.BufferAttribute; const n = g.attributes.normal as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) { const sx = Math.abs(n.getX(i)) > 0.5 ? d : w; uv.setXY(i, uv.getX(i) * sx / 22, uv.getY(i) * h / 44); }
    return g;
  };
  const tower = (x: number, z: number, w: number, d: number, h: number, mi: number) => {
    const m = new THREE.Mesh(box(w, h, d), facadeMats[mi % facadeMats.length]); m.position.set(x, h / 2, z); m.castShadow = false; m.receiveShadow = true; G.add(m); buildings.push(m);
    // stepped crown + antenna with red beacon
    if (h > 50 && R() < 0.7) {
      const c = new THREE.Mesh(box(w * 0.7, h * 0.12, d * 0.7), facadeMats[(mi + 3) % 8]); c.position.set(x, h + h * 0.06, z); G.add(c); buildings.push(c);
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.3, 14, 6), std(0x222233, { metalness: 0.9 })); ant.position.set(x, h * 1.12 + 7, z); G.add(ant);
      const bc = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow("#ff2a3d"), color: 0xff2a3d, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); bc.scale.setScalar(6); bc.position.set(x, h * 1.12 + 14, z); G.add(bc);
    }
    return m;
  };
  // street walls (two rows) + far skyline
  for (const s of [-1, 1]) {
    let z = 12;
    while (z > -L) {
      const w = 8 + R() * 10, d = 10 + R() * 14, h = 25 + R() * R() * 150;
      const x = s * (10 + w / 2 + R() * 2);
      tower(x, z - d / 2, w, d, h, Math.floor(R() * 8));
      // neon signs on the street face
      if (R() < 0.85) {
        const [txt, col] = SIGNS[Math.floor(R() * SIGNS.length)]; const vert = R() < 0.6;
        const tex = neon(txt, col, vert ? { w: 256, h: 1024, vertical: true } : { w: 1024, h: 256, frame: R() < 0.4 });
        const sw = vert ? 2.2 : 7 + R() * 4, sh = vert ? 9 + R() * 6 : sw / 4;
        const sg = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), additive(tex, 0xffffff, 1, 1.6));
        const sy = 5 + R() * Math.min(h - sh - 2, 30);
        sg.position.set(s * (10.05 + (vert ? 1.3 : 0.05)), sy + sh / 2, z - d * (0.2 + R() * 0.6));
        sg.rotation.y = vert ? (s > 0 ? -Math.PI / 2 + 0.0 : Math.PI / 2) + (s > 0 ? Math.PI / 2 : -Math.PI / 2) : (s > 0 ? -Math.PI / 2 : Math.PI / 2);
        G.add(sg); signs.push(sg);
        if (o.reflections !== false) { const rf = sg.clone(); rf.position.y = -rf.position.y; rf.scale.y = -1; rf.material = additive(tex, 0xffffff, 0.6, 0.7); G.add(rf); }
      }
      z -= d + R() * 3;
    }
    for (let i = 0; i < 70; i++) tower(s * (35 + R() * 120), 20 - R() * (L + 200), 12 + R() * 22, 12 + R() * 22, 40 + R() * R() * 260, Math.floor(R() * 8));
  }
  // ---------- sky bridges & cables ----------
  for (let i = 0; i < 9; i++) {
    const z = -20 - i * 26 - R() * 10, y = 18 + R() * 40;
    const b = new THREE.Mesh(new THREE.BoxGeometry(22, 1.6, 3.2), std(0x111320, { metalness: 0.7, roughness: 0.3 })); b.position.set(0, y, z); G.add(b);
    const lt = new THREE.Mesh(new THREE.BoxGeometry(22, 0.12, 0.12), new THREE.MeshBasicMaterial({ color: new THREE.Color(i % 2 ? 0x38e8ff : 0x8a5cff).multiplyScalar(2.5), toneMapped: false })); lt.position.set(0, y - 0.85, z + 1.6); G.add(lt);
  }
  // ---------- E.V.E spire (end of the avenue): obelisk + halo rings ----------
  const spire = new THREE.Group(); spire.position.set(0, 0, -L - 120); G.add(spire);
  const sp = new THREE.Mesh(new THREE.CylinderGeometry(6, 26, 420, 6), new THREE.MeshStandardMaterial({ color: 0x090a14, metalness: 0.9, roughness: 0.25, emissive: 0xffffff, emissiveMap: facade(999, ["#38e8ff", "#7feaff", "#8a5cff"]), emissiveIntensity: 1.2 }));
  sp.position.y = 210; spire.add(sp);
  for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(40 + i * 16, 0.6, 8, 96), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x38e8ff).multiplyScalar(2.2), toneMapped: false })); r.position.y = 300 + i * 25; r.rotation.x = Math.PI / 2 + 0.15 * i; spire.add(r); }
  const eyeG = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow("#7feaff"), color: 0x7feaff, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); eyeG.scale.setScalar(90); eyeG.position.y = 430; spire.add(eyeG);
  spire.traverse((o: any) => { if (o.material) { o.material.fog = false; } }); // a silhouette that stays visible through the haze
  // ---------- giant E.V.E hologram advertisement ----------
  let eveAd: Human | undefined, eveAdGroup: THREE.Group | undefined;
  if (o.eveAd !== false) {
    eveAdGroup = new THREE.Group(); eveAdGroup.position.set(-19, 0, -70); eveAdGroup.rotation.y = 0.55; G.add(eveAdGroup);
    eveAd = new Human(EVE); eveAd.root.scale.setScalar(26); eveAd.root.position.y = -18; eveAdGroup.add(eveAd.root);
    const frame = new THREE.Mesh(new THREE.PlaneGeometry(24, 7), additive(neon("ALWAYS WITH YOU", "#7feaff", { w: 1024, h: 256 }), 0xffffff, 0.9, 1.2)); frame.position.set(0, 9, 4); eveAdGroup.add(frame);
  }
  // ---------- flying traffic with light trails ----------
  const cars: City["cars"] = [];
  const carBody = new THREE.CapsuleGeometry(0.9, 2.6, 4, 10); carBody.rotateX(Math.PI / 2); carBody.scale(1.1, 0.55, 1);
  const bodyM = std(0x15161f, { metalness: 0.85, roughness: 0.25 });
  for (let i = 0; i < 46; i++) {
    const m = new THREE.Group(); const dir = i % 2 ? 1 : -1;
    const b = new THREE.Mesh(carBody, bodyM); m.add(b);
    const head = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.25), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xdff6ff).multiplyScalar(3), toneMapped: false, side: THREE.DoubleSide })); head.position.z = -2.25 * dir; m.add(head);
    const tail = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff2a3d).multiplyScalar(3), toneMapped: false, side: THREE.DoubleSide })); tail.position.z = 2.25 * dir; m.add(tail);
    const trail = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 14), additive(glow(dir > 0 ? "#ff2a3d" : "#bfeaff"), 0xffffff, 0.5, 1)); trail.rotation.x = -Math.PI / 2; trail.position.z = 9 * dir; m.add(trail);
    const under = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 3), new THREE.MeshBasicMaterial({ color: new THREE.Color(i % 3 ? 0x38e8ff : 0xff3fa8).multiplyScalar(2), toneMapped: false })); under.rotation.x = Math.PI / 2; under.position.y = -0.5; m.add(under);
    const lane = i % 6; const x = (lane - 2.5) * 2.6 + (R() - 0.5), y = 14 + (i % 5) * 8 + R() * 6;
    G.add(m); cars.push({ m, lane, speed: dir * (18 + R() * 16), z0: -R() * (L + 100), x, y });
  }
  // ---------- "thousands of connected citizens": the network glow seen from above ----------
  const NN = 6000, np = new Float32Array(NN * 3), nr = rng(5);
  for (let i = 0; i < NN; i++) { const street = nr() < 0.6; np.set([street ? (nr() - 0.5) * 13 : (nr() < 0.5 ? -1 : 1) * (20 + nr() * 110), 1.6, 10 - nr() * (L + 120)], i * 3); }
  const ng = new THREE.BufferGeometry(); ng.setAttribute("position", new THREE.BufferAttribute(np, 3));
  const nm = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, opacity: { value: 0 } },
    vertexShader: `uniform float time; varying float vA; void main(){ vec3 p = position; float s = sin(p.x * 13.1) > 0.0 ? 1.0 : -1.0; p.z += mod(time * 1.3 * s + p.x * 3.0, 6.0) - 3.0;
      vec4 mv = viewMatrix * vec4(p, 1.0); vA = 0.6 + 0.4 * sin(time * 3.0 + p.x * 9.0 + p.z); gl_PointSize = clamp(260.0 / -mv.z, 1.5, 9.0); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float opacity; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(0.25, 0.9, 1.0) * 2.0 * smoothstep(0.5, 0.0, d) * vA * opacity, 1.0); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  });
  const network = new THREE.Points(ng, nm); network.frustumCulled = false; G.add(network); stage.timed.push(nm as any);
  // ---------- street-level props: lamps with volumetric cones, vents, holo kiosks ----------
  for (let i = 0; i < 14; i++) {
    const s = i % 2 ? 1 : -1, z = 6 - i * 13;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 7, 8), std(0x1a1b24, { metalness: 0.8 })); pole.position.set(s * 7.6, 3.5, z); G.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.1), std(0x1a1b24, { metalness: 0.8 })); arm.position.set(s * 6.9, 7, z); G.add(arm);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.3), new THREE.MeshBasicMaterial({ color: new THREE.Color(i % 3 ? 0x9fd8ff : 0xff6ad5).multiplyScalar(3), toneMapped: false })); lamp.position.set(s * 6.3, 6.94, z); G.add(lamp);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(2.4, 7, 24, 1, true), beam(i % 3 ? 0x7fb8ff : 0xff6ad5, 0.22)); cone.position.set(s * 6.3, 3.45, z); G.add(cone); stage.timed.push(cone.material as any);
    if (i % 3 === 0) { const k = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.0), additive(holoPanel(i + 3, "#5ff4ff", "INFO//" + (100 + i)), 0xffffff, 0.8, 1.4)); k.position.set(s * 7.4, 2.2, z - 3); k.rotation.y = s > 0 ? -1.2 : 1.2; G.add(k); }
  }
  const update = (t: number) => {
    for (const c of cars) {
      const span = L + 160; let z = ((c.z0 + c.speed * t) % span + span) % span; z = 40 - z;
      c.m.position.set(c.x, c.y + Math.sin(t * 0.7 + c.lane) * 0.4, z); c.m.rotation.z = Math.sin(t + c.lane) * 0.03;
    }
    if (eveAd) { eveAd.reset(); eveAd.idle(t); eveAd.autoBlink(t, 3); eveAd.look(Math.sin(t * 0.25) * 0.3, 0.05); eveAd.s.mouth = 0; eveAd.applyFace(); eveAd.setHolo(t, 0, 0.75); }
  };
  const dissolve = (k: number) => { for (const m of mats) { (m as any).userData.dissolve = k; } };
  return { group: G, cars, eveAd, eveAdGroup, spire, ground, buildings, signs, network, update, dissolve, buildingMats: mats };
}
