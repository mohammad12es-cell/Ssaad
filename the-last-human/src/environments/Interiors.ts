// Interior sets for episodes 03–10. Built from shared parts so every lab/terminal/door looks like the same world.
import * as THREE from "three";
import type { Stage } from "../engine/Stage";
import { painted, LiveCanvas, glow, holoPanel, neon, facade } from "../engine/textures";
import { std, additive, beam, emissive } from "../effects/materials";
import { rng, clamp, hash, lerp, flicker } from "../utils/math";

const concrete = (k = "conc", base = "#24252e") => { const m = painted(k, base, ["#000000", "#3a3c48", "#14151c", "#4a4c58"], { n: 1400, len: 90, alpha: 0.28, seed: k.length }); m.repeat.set(4, 4); return std(0xffffff, { map: m, roughness: 0.8, metalness: 0.1 }); };
const steel = () => std(0x30333f, { roughness: 0.35, metalness: 0.85 });
const darkSteel = () => std(0x15161d, { roughness: 0.4, metalness: 0.8 });
const mesh = (g: THREE.BufferGeometry, m: THREE.Material, p: number[] = [0, 0, 0], r: number[] = [0, 0, 0], parent?: THREE.Object3D) => { const x = new THREE.Mesh(g, m); x.position.set(p[0], p[1], p[2]); x.rotation.set(r[0], r[1], r[2]); x.castShadow = true; x.receiveShadow = true; parent?.add(x); return x; };

/** Box room with panelled walls, pipes, cables, ceiling beams and fluorescent tubes. Origin = floor centre. */
export function industrialRoom(stage: Stage, o: { w?: number; d?: number; h?: number; seed?: number; tubes?: number; tubeColor?: number; wet?: boolean; base?: string; backHole?: [number, number]; frontHole?: [number, number] } = {}) {
  const G = new THREE.Group(); stage.scene.add(G); const W = o.w ?? 14, D = o.d ?? 20, H = o.h ?? 5, R = rng(o.seed ?? 3);
  const floorM = concrete("floor" + (o.base ?? ""), o.base ?? "#1c1d24"); if (o.wet) { floorM.roughness = 0.25; floorM.metalness = 0.4; }
  mesh(new THREE.PlaneGeometry(W, D), floorM, [0, 0, 0], [-Math.PI / 2, 0, 0], G);
  mesh(new THREE.PlaneGeometry(W, D), concrete("ceil", "#121218"), [0, H, 0], [Math.PI / 2, 0, 0], G);
  const wallM = concrete("wall" + (o.base ?? ""), o.base ?? "#22232c"); wallM.side = THREE.DoubleSide;
  for (const [p, r, w] of [[[-W / 2, H / 2, 0], [0, Math.PI / 2, 0], D], [[W / 2, H / 2, 0], [0, -Math.PI / 2, 0], D]] as const)
    mesh(new THREE.PlaneGeometry(w, H), wallM, p as any, r as any, G);
  // end walls, optionally with a door opening [width, height]
  for (const [z, ry, hole] of [[-D / 2, 0, o.backHole], [D / 2, Math.PI, o.frontHole]] as const) {
    if (!hole) { mesh(new THREE.PlaneGeometry(W, H), wallM, [0, H / 2, z], [0, ry, 0], G); continue; }
    const [hw, hh] = hole, side = (W - hw) / 2;
    for (const sx of [-1, 1]) mesh(new THREE.PlaneGeometry(side, H), wallM, [sx * (hw / 2 + side / 2), H / 2, z], [0, ry, 0], G);
    mesh(new THREE.PlaneGeometry(hw, H - hh), wallM, [0, hh + (H - hh) / 2, z], [0, ry, 0], G);
  }
  // wall ribs + pipes
  for (let z = -D / 2 + 1; z < D / 2; z += 2.5) for (const s of [-1, 1]) {
    mesh(new THREE.BoxGeometry(0.3, H, 0.4), darkSteel(), [s * (W / 2 - 0.15), H / 2, z], [0, 0, 0], G);
  }
  for (let i = 0; i < 4; i++) { const s = i % 2 ? 1 : -1; const pp = mesh(new THREE.CylinderGeometry(0.09 + i * 0.03, 0.09 + i * 0.03, D, 12), steel(), [s * (W / 2 - 0.45 - i * 0.12), H - 0.4 - i * 0.35, 0], [Math.PI / 2, 0, 0], G); pp.castShadow = false; }
  // ceiling beams
  for (let z = -D / 2 + 2; z < D / 2; z += 4) mesh(new THREE.BoxGeometry(W, 0.35, 0.3), darkSteel(), [0, H - 0.18, z], [0, 0, 0], G);
  // hanging cables
  for (let i = 0; i < 8; i++) {
    const x0 = (R() - 0.5) * W * 0.8, z0 = (R() - 0.5) * D * 0.8, sag = 0.4 + R() * 0.8;
    const c = new THREE.CatmullRomCurve3([new THREE.Vector3(x0, H - 0.3, z0), new THREE.Vector3(x0 + 0.8, H - 0.3 - sag, z0 + 0.5), new THREE.Vector3(x0 + 1.8, H - 0.3, z0 + 1.2)]);
    mesh(new THREE.TubeGeometry(c, 16, 0.02, 5), std(0x0a0a0c, { roughness: 0.6 }), [0, 0, 0], [0, 0, 0], G);
  }
  // fluorescent tubes (emissive meshes) + a few real lights
  const tubes: { m: THREE.Mesh; l?: THREE.PointLight; seed: number }[] = [];
  const n = o.tubes ?? 4, tc = o.tubeColor ?? 0xbfe6ff;
  for (let i = 0; i < n; i++) {
    const z = -D / 2 + (i + 0.5) * (D / n);
    const m = mesh(new THREE.BoxGeometry(1.6, 0.06, 0.12), new THREE.MeshBasicMaterial({ color: new THREE.Color(tc).multiplyScalar(2.5), toneMapped: false }), [0, H - 0.4, z], [0, 0, 0], G); m.castShadow = false;
    const l = i % 2 === 0 ? new THREE.PointLight(tc, 10, 9, 1.4) : undefined; if (l) { l.position.set(0, H - 0.6, z); G.add(l); }
    tubes.push({ m, l, seed: i * 7 + 1 });
  }
  /** flicker / power level 0..1 */
  const power = (t: number, p = 1, broken = 0.25) => {
    for (const tb of tubes) { const on = p * (hash(tb.seed) < broken ? flicker(t, 11, 0.55, tb.seed) : 1); (tb.m.material as THREE.MeshBasicMaterial).color.setHex(tc).multiplyScalar(0.08 + 2.4 * on); if (tb.l) tb.l.intensity = 10 * on; }
  };
  return { group: G, W, D, H, power, tubes };
}

/** Old terminal: desk, slanted screen (live canvas), keyboard, chip slot. Origin on the floor, screen faces +z. */
export function terminal(stage: Stage, o: { w?: number; color?: string } = {}) {
  const G = new THREE.Group(); stage.scene.add(G); const W = o.w ?? 1.6;
  mesh(new THREE.BoxGeometry(W, 0.9, 0.7), darkSteel(), [0, 0.45, 0], [0, 0, 0], G);
  mesh(new THREE.BoxGeometry(W * 0.9, 0.04, 0.3), std(0x0b0b10, { roughness: 0.5 }), [0, 0.92, 0.18], [0.12, 0, 0], G);
  for (let i = 0; i < 40; i++) mesh(new THREE.BoxGeometry(0.05, 0.02, 0.05), std(0x22232c, { roughness: 0.5 }), [-W * 0.4 + (i % 14) * 0.065, 0.95, 0.1 + Math.floor(i / 14) * 0.065], [0.12, 0, 0], G);
  const housing = mesh(new THREE.BoxGeometry(W * 0.95, 0.85, 0.25), darkSteel(), [0, 1.42, -0.18], [-0.18, 0, 0], G);
  const scr = new LiveCanvas(1024, 576);
  const screen = mesh(new THREE.PlaneGeometry(W * 0.86, W * 0.86 * 0.5625), new THREE.MeshBasicMaterial({ map: scr.t, toneMapped: false }), [0, 1.43, -0.04], [-0.18, 0, 0], G); screen.castShadow = false;
  const slot = mesh(new THREE.BoxGeometry(0.18, 0.04, 0.08), std(0x050507), [W * 0.38, 0.93, 0.28], [0, 0, 0], G);
  const slotLight = mesh(new THREE.BoxGeometry(0.16, 0.008, 0.01), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff2a3d).multiplyScalar(2), toneMapped: false }), [W * 0.38, 0.955, 0.32], [0, 0, 0], G);
  const glowL = new THREE.PointLight(o.color === "warm" ? 0xffb36b : 0x6fd8ff, 0, 4, 1.5); glowL.position.set(0, 1.5, 0.8); G.add(glowL);
  void housing;
  return { group: G, scr, screen, slot, slotLight, glowL, slotPos: new THREE.Vector3(W * 0.38, 0.95, 0.28) };
}

/** Large wall screen with its own live canvas. */
export function wallScreen(stage: Stage, w: number, h: number, res = 1024) {
  const G = new THREE.Group(); stage.scene.add(G);
  const scr = new LiveCanvas(res, Math.round(res * h / w));
  mesh(new THREE.BoxGeometry(w + 0.3, h + 0.3, 0.2), darkSteel(), [0, 0, -0.12], [0, 0, 0], G);
  const m = mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: scr.t, toneMapped: false, color: new THREE.Color(1.3, 1.3, 1.3) }), [0, 0, 0], [0, 0, 0], G); m.castShadow = false;
  return { group: G, scr, mesh: m };
}

/** Hidden sliding blast door. open(k) 0..1. Faces +z. */
export function blastDoor(stage: Stage, w = 3, h = 3.6, color = 0xff2a3d) {
  const G = new THREE.Group(); stage.scene.add(G);
  const frame = darkSteel(); mesh(new THREE.BoxGeometry(w + 1, 0.4, 0.6), frame, [0, h + 0.2, 0], [0, 0, 0], G);
  for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.5, h, 0.6), frame, [s * (w / 2 + 0.25), h / 2, 0], [0, 0, 0], G);
  const panels: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const p = new THREE.Group(); G.add(p); panels.push(p);
    mesh(new THREE.BoxGeometry(w / 2, h, 0.25), concrete("door", "#2a2c36"), [s * w / 4, h / 2, 0], [0, 0, 0], p);
    for (let i = 0; i < 5; i++) mesh(new THREE.BoxGeometry(w / 2 * 0.8, 0.06, 0.05), std(0xc8a020, { roughness: 0.6 }), [s * w / 4, 0.4 + i * 0.7, 0.14], [0, 0, s * 0.6], p);
    const e = mesh(new THREE.BoxGeometry(0.04, h, 0.05), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(2.5), toneMapped: false }), [s * 0.02, h / 2, 0.14], [0, 0, 0], p); e.castShadow = false;
  }
  const spill = new THREE.PointLight(color, 0, 10, 1.4); spill.position.set(0, h * 0.5, -1.5); G.add(spill);
  const shaft = new THREE.Mesh(new THREE.PlaneGeometry(w, h), beam(color, 0)); shaft.position.set(0, h / 2, 0.3); G.add(shaft);
  const open = (k: number) => { panels[0].position.x = -k * (w / 2 + 0.1); panels[1].position.x = k * (w / 2 + 0.1); spill.intensity = k * 30; (shaft.material as THREE.ShaderMaterial).uniforms.intensity.value = k * 0.35; };
  return { group: G, open, spill };
}

/** Holographic projector pedestal (for Dr. Vex's recordings). */
export function projector(stage: Stage) {
  const G = new THREE.Group(); stage.scene.add(G);
  mesh(new THREE.CylinderGeometry(0.45, 0.6, 0.35, 32), darkSteel(), [0, 0.175, 0], [0, 0, 0], G);
  const lens = mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x7feaff).multiplyScalar(2), toneMapped: false }), [0, 0.36, 0], [0, 0, 0], G);
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.3, 2.2, 32, 1, true), beam(0x7feaff, 0)); cone.position.y = 1.47; G.add(cone);
  const l = new THREE.PointLight(0x7feaff, 0, 6, 1.4); l.position.y = 1.2; G.add(l);
  const set = (k: number, t: number) => { (cone.material as THREE.ShaderMaterial).uniforms.intensity.value = k * 0.25 * (0.9 + 0.1 * Math.sin(t * 40)); l.intensity = k * 6; (lens.material as THREE.MeshBasicMaterial).color.setHex(0x7feaff).multiplyScalar(0.2 + 2 * k); };
  stage.timed.push(cone.material as any);
  return { group: G, set };
}

/** The consciousness chamber: a cylindrical shaft lined with thousands of signature tiles + catwalk. */
export function chamber(stage: Stage, o: { R?: number; H?: number } = {}) {
  const G = new THREE.Group(); stage.scene.add(G); const Rr = o.R ?? 18, Hh = o.H ?? 34, R = rng(66);
  mesh(new THREE.CylinderGeometry(Rr + 1, Rr + 1, Hh, 64, 1, true), concrete("chamberwall", "#14151c"), [0, Hh / 2 - 8, 0], [0, 0, 0], G).material = (() => { const m = concrete("chamberwall", "#14151c"); m.side = THREE.BackSide; return m; })();
  // catwalk across the void + central platform
  const walk = darkSteel();
  mesh(new THREE.BoxGeometry(1.6, 0.12, Rr * 2), walk, [0, 0, 0], [0, 0, 0], G);
  for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.05, 0.05, Rr * 2), steel(), [s * 0.8, 1.0, 0], [0, 0, 0], G);
  for (let z = -Rr; z < Rr; z += 1.5) for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.04, 1, 0.04), steel(), [s * 0.8, 0.5, z], [0, 0, 0], G);
  const plat = mesh(new THREE.CylinderGeometry(4, 4, 0.3, 48), darkSteel(), [0, -0.1, 0], [0, 0, 0], G);
  const ringL = mesh(new THREE.TorusGeometry(4, 0.05, 8, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x38e8ff).multiplyScalar(2), toneMapped: false }), [0, 0.06, 0], [Math.PI / 2, 0, 0], G);
  void plat; void ringL;
  // signature tiles: instanced emissive panels on the walls, revealed by `reveal` (0..1) sweeping upward
  const NT = 4200, tile = new THREE.PlaneGeometry(0.9, 0.55);
  const tm = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, reveal: { value: 0 }, tex: { value: holoPanel(7, "#7feaff") } },
    vertexShader: `attribute vec3 seed; varying vec2 vUv; varying vec3 vS; varying float vY; void main(){ vUv = uv; vS = seed; vec4 w = instanceMatrix * vec4(position, 1.0); vY = w.y; gl_Position = projectionMatrix * viewMatrix * modelMatrix * w; }`,
    fragmentShader: `uniform float time, reveal; uniform sampler2D tex; varying vec2 vUv; varying vec3 vS; varying float vY;
      void main(){ float on = step(vS.x, reveal * 1.15 - (vY + 8.0) / 60.0 * 0.4); if (on < 0.5) discard;
        float wave = 0.5 + 0.5 * sin(vUv.x * 18.0 + time * (2.0 + vS.y * 4.0) + vS.z * 30.0);
        float line = smoothstep(0.06, 0.0, abs(vUv.y - 0.5 - 0.3 * sin(vUv.x * 12.0 + time * 3.0 + vS.z * 9.0) * wave));
        vec3 base = mix(vec3(0.2, 0.85, 1.0), vec3(0.6, 0.4, 1.0), vS.y);
        float frame = step(vUv.x, 0.03) + step(0.97, vUv.x) + step(vUv.y, 0.05) + step(0.95, vUv.y);
        gl_FragColor = vec4(base * (line * 2.2 + frame * 0.8 + 0.08) * (0.8 + 0.2 * sin(time * 5.0 + vS.z * 50.0)), 1.0); }`,
    side: THREE.DoubleSide, toneMapped: false,
  });
  const inst = new THREE.InstancedMesh(tile, tm, NT); const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1), pos = new THREE.Vector3();
  const seeds = new Float32Array(NT * 3);
  const cols = 120;
  for (let i = 0; i < NT; i++) {
    const c = i % cols, r = Math.floor(i / cols), a = (c / cols) * Math.PI * 2, y = -6 + r * 0.72;
    pos.set(Math.cos(a) * Rr, y, Math.sin(a) * Rr); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a - Math.PI / 2);
    mtx.compose(pos, q, sc); inst.setMatrixAt(i, mtx); seeds.set([R(), R(), R()], i * 3);
  }
  tile.setAttribute("seed", new THREE.InstancedBufferAttribute(seeds, 3)); inst.frustumCulled = false; G.add(inst); stage.timed.push(tm as any);
  const set = (reveal: number) => { tm.uniforms.reveal.value = reveal; };
  return { group: G, set, R: Rr };
}

/** Thousands of identical miniature Neo-Edens, each in a glass cube, in a grid that recedes into the dark. */
export function simulationField(stage: Stage, o: { nx?: number; nz?: number; gap?: number; y?: number } = {}) {
  const G = new THREE.Group(); stage.scene.add(G); const nx = o.nx ?? 40, nz = o.nz ?? 60, gap = o.gap ?? 2.4;
  // one mini-city (towers + spire) merged, then instanced
  const R = rng(8921); const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 26; i++) { const h = 0.1 + R() * R() * 0.9; const b = new THREE.BoxGeometry(0.1 + R() * 0.08, h, 0.1 + R() * 0.08); b.translate((R() - 0.5) * 1.3, h / 2, (R() - 0.5) * 1.3); parts.push(b); }
  const sp = new THREE.CylinderGeometry(0.02, 0.07, 1.4, 6); sp.translate(0, 0.7, -0.5); parts.push(sp);
  const mini = (BufferGeometryMerge(parts));
  const cityM = new THREE.MeshStandardMaterial({ color: 0x0a0b14, emissive: 0xffffff, emissiveMap: facade(4242), emissiveIntensity: 2.2, roughness: 0.4, metalness: 0.5 });
  const cube = new THREE.BoxGeometry(1.6, 1.6, 1.6); const glassM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x38e8ff).multiplyScalar(0.5), wireframe: true, transparent: true, opacity: 0.35, toneMapped: false });
  const N = nx * nz; const ic = new THREE.InstancedMesh(mini, cityM, N), ig = new THREE.InstancedMesh(cube, glassM, N);
  const m = new THREE.Matrix4();
  for (let i = 0; i < N; i++) { const x = (i % nx - nx / 2) * gap, z = -Math.floor(i / nx) * gap; m.makeTranslation(x, o.y ?? 0, z); ic.setMatrixAt(i, m); m.makeTranslation(x, (o.y ?? 0) + 0.8, z); ig.setMatrixAt(i, m); }
  ic.frustumCulled = ig.frustumCulled = false; G.add(ic, ig);
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(nx * gap, nz * gap), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x2a4dff).multiplyScalar(0.25), transparent: true, opacity: 0.6, toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.rotation.x = -Math.PI / 2; halo.position.set(-gap / 2, (o.y ?? 0) - 0.02, -nz * gap / 2); G.add(halo);
  return { group: G, city: ic, glass: ig, cityM };
}
function BufferGeometryMerge(geos: THREE.BufferGeometry[]) {
  const pos: number[] = [], nor: number[] = [], uv: number[] = [];
  for (const g0 of geos) { const g = g0.index ? g0.toNonIndexed() : g0; pos.push(...(g.attributes.position.array as any)); nor.push(...(g.attributes.normal.array as any)); uv.push(...(g.attributes.uv.array as any)); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); return g;
}

/** Glass containment chamber (Ep08): liquid column, bubbles, clamps. open(k) slides the glass up. */
export function glassChamber(stage: Stage, o: { r?: number; h?: number } = {}) {
  const G = new THREE.Group(); stage.scene.add(G); const r = o.r ?? 1.1, h = o.h ?? 3.2;
  mesh(new THREE.CylinderGeometry(r + 0.35, r + 0.5, 0.5, 48), darkSteel(), [0, 0.25, 0], [0, 0, 0], G);
  mesh(new THREE.CylinderGeometry(r + 0.35, r + 0.25, 0.6, 48), darkSteel(), [0, h + 0.8, 0], [0, 0, 0], G);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; mesh(new THREE.BoxGeometry(0.12, h + 0.6, 0.12), steel(), [Math.cos(a) * (r + 0.3), h / 2 + 0.5, Math.sin(a) * (r + 0.3)], [0, 0, 0], G); }
  const glassG = new THREE.Group(); G.add(glassG);
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 48, 1, true), new THREE.MeshStandardMaterial({ color: 0x9fd8ff, roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 2 }));
  glass.position.y = h / 2 + 0.5; glassG.add(glass);
  const liquid = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.98, r * 0.98, h, 48, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x1a6aff).multiplyScalar(0.35), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
  liquid.position.y = h / 2 + 0.5; G.add(liquid);
  const rimL = mesh(new THREE.TorusGeometry(r + 0.36, 0.04, 8, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x38e8ff).multiplyScalar(2.5), toneMapped: false }), [0, 0.52, 0], [Math.PI / 2, 0, 0], G);
  const inner = new THREE.PointLight(0x5fa8ff, 8, 5, 1.5); inner.position.y = h * 0.8; G.add(inner);
  const up = new THREE.SpotLight(0x8fd0ff, 40, 8, 0.5, 0.5, 1.2); up.position.set(0, 0.6, 0); up.target.position.set(0, h, 0); G.add(up, up.target);
  // bubbles (shader points rising)
  const NB = 400, bp = new Float32Array(NB * 3), Rb = rng(5); for (let i = 0; i < NB; i++) { const a = Rb() * 6.28, rr = Math.sqrt(Rb()) * r * 0.9; bp.set([Math.cos(a) * rr, Rb() * h, Math.sin(a) * rr], i * 3); }
  const bg = new THREE.BufferGeometry(); bg.setAttribute("position", new THREE.BufferAttribute(bp, 3));
  const bm = new THREE.ShaderMaterial({ uniforms: { time: { value: 0 }, H: { value: h }, k: { value: 1 } },
    vertexShader: `uniform float time, H; void main(){ vec3 p = position; p.y = mod(p.y + time * (0.4 + fract(p.x * 7.0) * 0.6), H) + 0.5; p.x += sin(time * 3.0 + p.y * 4.0) * 0.03; vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = 30.0 / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float k; void main(){ float d = length(gl_PointCoord - 0.5); float ring = smoothstep(0.5, 0.35, d) * smoothstep(0.2, 0.4, d); gl_FragColor = vec4(vec3(0.6, 0.85, 1.0) * ring * k, 1.0); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const bubbles = new THREE.Points(bg, bm); bubbles.frustumCulled = false; G.add(bubbles); stage.timed.push(bm as any);
  const open = (k: number) => { glassG.position.y = k * (h + 0.4); (liquid.material as THREE.MeshBasicMaterial).opacity = 0.35 * (1 - k); liquid.scale.y = Math.max(0.001, 1 - k); liquid.position.y = (h * (1 - k)) / 2 + 0.5; bm.uniforms.k.value = 1 - k; };
  void rimL;
  return { group: G, open, inner, up, h, r };
}

/** E.V.E's core: luminous sphere with orbiting rings and rising data streams. */
export function eveCore(stage: Stage) {
  const G = new THREE.Group(); stage.scene.add(G);
  const core = new THREE.Mesh(new THREE.SphereGeometry(2.2, 48, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x7feaff).multiplyScalar(1.6), toneMapped: false })); core.position.y = 6; G.add(core);
  const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(3.0, 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x38e8ff).multiplyScalar(1.2), wireframe: true, toneMapped: false, transparent: true, opacity: 0.6 })); shell.position.y = 6; G.add(shell);
  const rings: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(3.8 + i * 0.9, 0.05 + i * 0.01, 8, 128), new THREE.MeshBasicMaterial({ color: new THREE.Color(i % 2 ? 0x8a5cff : 0x38e8ff).multiplyScalar(2.2), toneMapped: false })); r.position.y = 6; G.add(r); rings.push(r); }
  const sg = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow("#7feaff"), color: 0x7feaff, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); sg.scale.setScalar(16); sg.position.y = 6; G.add(sg);
  // data streams: vertical lines
  const NS = 300, sp = new Float32Array(NS * 6), R = rng(12);
  for (let i = 0; i < NS; i++) { const a = R() * 6.28, rr = 6 + R() * 14, h = 2 + R() * 6, y = R() * 20 - 4; sp.set([Math.cos(a) * rr, y, Math.sin(a) * rr, Math.cos(a) * rr, y + h, Math.sin(a) * rr], i * 6); }
  const sgeo = new THREE.BufferGeometry(); sgeo.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  const smat = new THREE.ShaderMaterial({ uniforms: { time: { value: 0 }, k: { value: 1 } }, vertexShader: `uniform float time; varying float vA; void main(){ vec3 p = position; p.y = mod(p.y + time * 3.0 + p.x, 26.0) - 4.0; vA = 0.5 + 0.5 * sin(p.x * 3.0 + time); gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
    fragmentShader: `uniform float k; varying float vA; void main(){ gl_FragColor = vec4(vec3(0.3, 0.9, 1.0) * vA * k, 1.0); }`, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const streams = new THREE.LineSegments(sgeo, smat); streams.frustumCulled = false; G.add(streams); stage.timed.push(smat as any);
  const light = new THREE.PointLight(0x7feaff, 60, 40, 1.3); light.position.y = 6; G.add(light);
  const update = (t: number, power = 1, red = 0) => {
    rings.forEach((r, i) => { r.rotation.set(Math.PI / 2 + Math.sin(t * 0.3 + i) * 0.6, t * (0.2 + i * 0.13) * (i % 2 ? -1 : 1), Math.cos(t * 0.2 + i) * 0.4); });
    shell.rotation.set(t * 0.1, t * 0.17, 0); const s = 1 + 0.03 * Math.sin(t * 2.4); core.scale.setScalar(s * (0.4 + 0.6 * power));
    const c = new THREE.Color(0x7feaff).lerp(new THREE.Color(0xff2a3d), red);
    (core.material as THREE.MeshBasicMaterial).color.copy(c).multiplyScalar(1.6 * power); sg.material.color.copy(c); sg.material.opacity = power; light.color.copy(c); light.intensity = 60 * power; smat.uniforms.k.value = power;
  };
  return { group: G, update, core };
}

/** Warm memory lab: sunlit, dusty, wooden — the only warm place in the series. */
export function memoryLab(stage: Stage) {
  const G = new THREE.Group(); stage.scene.add(G);
  const wood = painted("wood", "#5a3a26", ["#2a1a10", "#7a5034", "#3a2416"], { n: 800, len: 140, alpha: 0.35 }); wood.repeat.set(3, 3);
  mesh(new THREE.PlaneGeometry(14, 14), std(0xffffff, { map: wood, roughness: 0.7 }), [0, 0, 0], [-Math.PI / 2, 0, 0], G);
  const wallM = std(0xb8a48a, { roughness: 0.9, map: painted("plaster", "#b8a48a", ["#d8c8b0", "#8a7a64"], { n: 900, len: 80, alpha: 0.25 }) });
  mesh(new THREE.PlaneGeometry(14, 5), wallM, [0, 2.5, -4], [0, 0, 0], G); mesh(new THREE.PlaneGeometry(14, 5), wallM, [-4.5, 2.5, 0], [0, Math.PI / 2, 0], G);
  // window with sun shafts
  mesh(new THREE.PlaneGeometry(2.6, 2.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.85, 0.6).multiplyScalar(3), toneMapped: false }), [1.2, 2.6, -3.98], [0, 0, 0], G);
  for (let i = 0; i < 3; i++) mesh(new THREE.BoxGeometry(0.08, 2.2, 0.1), std(0x3a2a1a), [0.3 + i * 0.9, 2.6, -3.95], [0, 0, 0], G);
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.0, 9), beam(0xffd8a0, 0.22)); shaft.position.set(1.2, 1.6, 0); shaft.rotation.x = 0.35; G.add(shaft); stage.timed.push(shaft.material as any);
  const sun = new THREE.DirectionalLight(0xffd9a8, 4); sun.position.set(2, 6, -8); sun.target.position.set(0, 0, 0); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); G.add(sun, sun.target);
  const fill = new THREE.HemisphereLight(0xffe2c0, 0x3a2a1a, 0.9); G.add(fill);
  // workbench, books, globe, old monitors (the lab before the city)
  mesh(new THREE.BoxGeometry(2.6, 0.08, 1), std(0x6a4a30), [-1.8, 0.9, -2.8], [0, 0, 0], G);
  for (const x of [-2.9, -0.7]) mesh(new THREE.BoxGeometry(0.08, 0.9, 0.9), std(0x4a3420), [x, 0.45, -2.8], [0, 0, 0], G);
  for (let i = 0; i < 9; i++) mesh(new THREE.BoxGeometry(0.06 + (i % 3) * 0.02, 0.3, 0.22), std([0x8a3a2a, 0x2a4a6a, 0x6a6a3a][i % 3]), [-2.9 + i * 0.09, 1.09, -3.1], [0, 0, (i % 4 === 0 ? 0.2 : 0)], G);
  mesh(new THREE.SphereGeometry(0.18, 24, 16), std(0x3a6a8a, { roughness: 0.5 }), [-1.2, 1.12, -2.7], [0, 0, 0], G);
  const crt = mesh(new THREE.BoxGeometry(0.6, 0.45, 0.45), std(0xcfc6b4), [-2.1, 1.17, -2.9], [0, 0.2, 0], G); void crt;
  mesh(new THREE.PlaneGeometry(0.48, 0.34), new THREE.MeshBasicMaterial({ map: holoPanel(3, "#7fff9a", "SUBJECT 0"), toneMapped: false }), [-2.04, 1.18, -2.67], [0, 0.2, 0], G);
  return { group: G, sun };
}

/** The real-world lab (Ep10 final reveal): sterile, cold, a single life-support pod. */
export function realLab(stage: Stage) {
  const G = new THREE.Group(); stage.scene.add(G);
  const tile = painted("tile", "#9aa4a8", ["#c8d0d4", "#6a7478", "#aab4b8"], { n: 500, len: 40, alpha: 0.2 }); tile.repeat.set(6, 6);
  mesh(new THREE.PlaneGeometry(16, 16), std(0xffffff, { map: tile, roughness: 0.3, metalness: 0.2 }), [0, 0, 0], [-Math.PI / 2, 0, 0], G);
  const wall = std(0x6e7a80, { roughness: 0.6 });
  mesh(new THREE.PlaneGeometry(16, 6), wall, [0, 3, -5], [0, 0, 0], G); mesh(new THREE.PlaneGeometry(16, 6), wall, [-6, 3, 0], [0, Math.PI / 2, 0], G); mesh(new THREE.PlaneGeometry(16, 6), wall, [6, 3, 0], [0, -Math.PI / 2, 0], G);
  mesh(new THREE.PlaneGeometry(16, 16), std(0x4a5458), [0, 5, 0], [Math.PI / 2, 0, 0], G);
  for (let i = 0; i < 3; i++) mesh(new THREE.BoxGeometry(3, 0.06, 0.4), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xe8fff4).multiplyScalar(2), toneMapped: false }), [0, 4.95, -3 + i * 3], [0, 0, 0], G);
  const key = new THREE.RectAreaLight ? null : null; void key;
  const top = new THREE.SpotLight(0xe0fff0, 60, 12, 0.7, 0.6, 1.2); top.position.set(0, 4.8, 0); top.target.position.set(0, 0.8, 0); top.castShadow = true; G.add(top, top.target);
  G.add(new THREE.HemisphereLight(0xcfe8e0, 0x2a3034, 0.6));
  // pod: reclined capsule with glass lid, tubes and vitals monitor
  const pod = new THREE.Group(); G.add(pod); pod.position.set(0, 0, 0);
  mesh(new THREE.BoxGeometry(1.1, 0.7, 2.4), std(0xd8dde0, { roughness: 0.35, metalness: 0.3 }), [0, 0.35, 0], [0, 0, 0], pod);
  const bed = mesh(new THREE.BoxGeometry(0.85, 0.1, 2.1), std(0x2a3034), [0, 0.75, 0], [0, 0, 0], pod); void bed;
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 2.2, 32, 1, true, -Math.PI / 2, Math.PI), new THREE.MeshStandardMaterial({ color: 0xbfe8ff, roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false })); lid.rotation.x = Math.PI / 2; lid.rotation.z = Math.PI / 2; lid.position.set(0, 0.8, 0); lid.rotation.set(Math.PI / 2, 0, 0); pod.add(lid);
  for (let i = 0; i < 6; i++) { const c = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.5 + i * 0.2, 0.8, -1.1), new THREE.Vector3(-0.6 + i * 0.25, 1.6, -2.0), new THREE.Vector3(-1 + i * 0.4, 4.9, -3.5)]); mesh(new THREE.TubeGeometry(c, 20, 0.025, 6), std(i % 2 ? 0x2a2e33 : 0x8a3a2a, { roughness: 0.5 }), [0, 0, 0], [0, 0, 0], pod); }
  const mon = new LiveCanvas(512, 320); const monM = mesh(new THREE.PlaneGeometry(0.8, 0.5), new THREE.MeshBasicMaterial({ map: mon.t, toneMapped: false }), [1.05, 1.5, -0.8], [0, -0.6, 0], G);
  mesh(new THREE.BoxGeometry(0.9, 0.6, 0.08), std(0x1a1d20), [1.07, 1.5, -0.84], [0, -0.6, 0], G); void monM;
  // other pods receding into the dark (rows of the last humans? or empty)
  for (let i = 1; i < 6; i++) for (const s of [-1, 1]) { mesh(new THREE.BoxGeometry(1.1, 0.7, 2.4), std(0x9aa2a6, { roughness: 0.4 }), [s * 3.2, 0.35, -i * 3.2 + 2], [0, 0, 0], G); }
  return { group: G, pod, mon, top };
}

/** Neon street market (Ep04): stalls with awnings, lanterns, crates, hanging signs. Breakable stalls for the chase. */
export function market(stage: Stage, o: { length?: number } = {}) {
  const G = new THREE.Group(); stage.scene.add(G); const L = o.length ?? 70, R = rng(404);
  const stalls: { g: THREE.Group; z: number; x: number; parts: THREE.Mesh[] }[] = [];
  const awnC = [0xff3fa8, 0x38e8ff, 0x8a5cff, 0xffb36b, 0xff2a3d];
  for (let i = 0; i < 26; i++) {
    const s = i % 2 ? 1 : -1, z = -i * (L / 13) * 0.5 - R() * 1.5, x = s * (3.2 + R() * 0.6);
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2; G.add(g);
    const parts: THREE.Mesh[] = [];
    parts.push(mesh(new THREE.BoxGeometry(2.2, 0.9, 0.9), std(0x2a2420, { roughness: 0.7 }), [0, 0.45, 0], [0, 0, 0], g));
    for (const px of [-1, 1]) parts.push(mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 6), steel(), [px * 1.05, 1.2, 0.4], [0, 0, 0], g));
    const aw = mesh(new THREE.BoxGeometry(2.6, 0.06, 1.5), new THREE.MeshStandardMaterial({ color: awnC[i % 5], emissive: awnC[i % 5], emissiveIntensity: 0.35, roughness: 0.6 }), [0, 2.35, 0.3], [0.25, 0, 0], g); parts.push(aw);
    for (let k = 0; k < 5; k++) parts.push(mesh(new THREE.BoxGeometry(0.35, 0.25, 0.3), std([0x6a4a2a, 0x2a5a3a, 0x8a2a2a, 0x3a3a6a][k % 4]), [-0.8 + k * 0.4, 1.02, 0.1], [0, R(), 0], g));
    const lan = mesh(new THREE.SphereGeometry(0.16, 12, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(awnC[(i + 2) % 5]).multiplyScalar(2.5), toneMapped: false }), [0.8, 2.0, 0.8], [0, 0, 0], g); lan.castShadow = false; parts.push(lan);
    const sign = mesh(new THREE.PlaneGeometry(1.6, 0.4), additive(neon(["NOODLES", "RAMEN", "CHIPS", "REPAIR", "SYNTH", "MEMORY", "OPTICS", "TEA"][i % 8], ["#ff3fa8", "#38e8ff", "#ffb36b", "#8a5cff"][i % 4], { w: 512, h: 128 }), 0xffffff, 1, 1.4), [0, 2.75, 0.9], [0, 0, 0], g); sign.castShadow = false; parts.push(sign);
    stalls.push({ g, z, x, parts });
  }
  // overhead string lights + hanging cloth
  for (let i = 0; i < 18; i++) { const z = -i * 4; const c = new THREE.CatmullRomCurve3([new THREE.Vector3(-4.2, 3.6, z), new THREE.Vector3(0, 3.0, z - 1), new THREE.Vector3(4.2, 3.6, z)]);
    mesh(new THREE.TubeGeometry(c, 12, 0.01, 4), std(0x111111), [0, 0, 0], [0, 0, 0], G);
    for (let k = 0; k < 7; k++) { const p = c.getPoint(k / 6); const b = mesh(new THREE.SphereGeometry(0.05, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(awnC[(i + k) % 5]).multiplyScalar(3), toneMapped: false }), [p.x, p.y - 0.05, p.z], [0, 0, 0], G); b.castShadow = false; } }
  const lights: THREE.PointLight[] = [];
  for (let i = 0; i < 4; i++) { const l = new THREE.PointLight(awnC[i], 14, 10, 1.5); G.add(l); lights.push(l); }
  /** stall i smashed at time ts: parts fly ballistically from the impact */
  const smash = (i: number, t: number, ts: number, dir: THREE.Vector3) => {
    const st = stalls[i]; const k = t - ts;
    st.parts.forEach((p, j) => {
      if (!p.userData.home) p.userData.home = { p: p.position.clone(), r: p.rotation.clone() };
      const h = p.userData.home; if (k <= 0) { p.position.copy(h.p); p.rotation.copy(h.r); return; }
      const v = new THREE.Vector3(dir.x * (2 + hash(j + i) * 3), 2 + hash(j * 3 + i) * 4, dir.z * (2 + hash(j * 7) * 3) + (hash(j * 5) - 0.5) * 3);
      const y = Math.max(0.1, h.p.y + v.y * k - 4.9 * k * k);
      p.position.set(h.p.x + v.x * k, y, h.p.z + v.z * k); p.rotation.set(h.r.x + k * (hash(j) * 8), h.r.y + k * 5, h.r.z + k * (hash(j + 2) * 6));
    });
  };
  return { group: G, stalls, lights, smash };
}
