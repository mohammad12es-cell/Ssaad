// Procedural stylised human: sculpted head, rotatable eyes, blinking lids, brows, lip-sync mouth,
// procedural hair, rigged skeleton (hips/spine/chest/neck/head, 2-bone arms & legs) and motion cycles.
// Every character in THE LAST HUMAN is a HumanSpec fed through this one builder, which is what keeps
// faces, hair, outfits and proportions identical from episode to episode.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { iris, skin, SkinOpts, painted, glow } from "../engine/textures";
import { std, fabric, holo, HoloMat } from "../effects/materials";
import { rng, hash, clamp, lerp } from "../utils/math";

export type HairStyle = "messy" | "long" | "receding" | "hood" | "short";
export type Outfit = "jacket" | "coat" | "labcoat" | "gown" | "tee" | "bodysuit" | "citizen";
export type HumanSpec = {
  name: string;
  scale?: number;           // overall body scale (1 = 1.8 m adult)
  headScale?: number;       // child = bigger head relative to body
  build?: number;           // shoulder width factor
  skin: SkinOpts & { key: string };
  face?: { jaw?: number; chin?: number; cheek?: number; nose?: number; lips?: number; female?: boolean; brow?: number };
  eyes: { inner: string; outer: string; glow?: boolean };
  hair: { style: HairStyle; color: number; seed: number; sheen?: number };
  beard?: { color: number };
  brows: { color: number; thick?: number };
  outfit: { kind: Outfit; color: string; accent?: number; metal?: number; hood?: boolean };
  neural?: boolean;         // citizen neural link behind the ear
  holo?: number;            // render as hologram of this colour
  detail?: "hero" | "crowd";
};

type Lid = THREE.Mesh;
export class Human {
  spec: HumanSpec; root = new THREE.Group(); private detail: "hero" | "crowd";
  hips = new THREE.Group(); spine = new THREE.Group(); chest = new THREE.Group(); neck = new THREE.Group(); head = new THREE.Group();
  sh: THREE.Group[] = []; el: THREE.Group[] = []; ha: THREE.Group[] = []; th: THREE.Group[] = []; kn: THREE.Group[] = []; ft: THREE.Group[] = [];
  eyes: THREE.Group[] = []; lidU: Lid[] = []; lidD: Lid[] = []; brows: THREE.Group[] = []; irisM: THREE.MeshBasicMaterial[] = [];
  mouthDark!: THREE.Mesh; lipU!: THREE.Mesh; lipD!: THREE.Mesh; neuralGlow?: THREE.Sprite; eyeGlow: THREE.Sprite[] = [];
  cornea: THREE.Mesh[] = []; holoMats: HoloMat[] = []; depthMeshes: THREE.Mesh[] = []; hairMesh?: THREE.Mesh; headMesh!: THREE.Mesh;
  /** animated state, reset every frame */
  s = { blink: 0, mouth: 0, browUp: 0, frown: 0, squint: 0, smile: 0, gx: 0, gy: 0, eyeGlow: 0, eyeGlowColor: new THREE.Color(0xff2030) };

  constructor(spec: HumanSpec) {
    this.spec = spec; this.detail = spec.detail ?? "hero";
    const S = spec.scale ?? 1; this.root.scale.setScalar(S); this.root.name = spec.name;
    const M = this.materials();
    // ---------- skeleton ----------
    const b = spec.build ?? 1;
    this.root.add(this.hips); this.hips.position.y = 0.98;
    this.hips.add(this.spine); this.spine.position.y = 0.08;
    this.spine.add(this.chest); this.chest.position.y = 0.12;
    this.chest.add(this.neck); this.neck.position.set(0, 0.33, 0);
    this.neck.add(this.head); this.head.position.set(0, 0.058, 0.01);
    const hs = spec.headScale ?? 1; this.head.scale.setScalar(hs);
    const seg = this.detail === "hero" ? 1 : 0.5;
    const cap = (r: number, l: number) => new THREE.CapsuleGeometry(r, l, Math.max(3, Math.round(6 * seg)), Math.max(6, Math.round(14 * seg)));
    const add = (parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, p: number[] = [0, 0, 0], s: number[] = [1, 1, 1], r: number[] = [0, 0, 0]) => {
      const m = new THREE.Mesh(geo, mat); m.position.set(p[0], p[1], p[2]); m.scale.set(s[0], s[1], s[2]); m.rotation.set(r[0], r[1], r[2]);
      m.castShadow = !spec.holo; m.receiveShadow = !spec.holo; parent.add(m); return m;
    };
    const lathe = (pts: number[][], segs = 28) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), Math.round(segs * seg));

    // pelvis / trousers
    add(this.hips, lathe([[0.05, -0.12], [0.15, -0.1], [0.16, 0.0], [0.155, 0.1], [0.05, 0.12]]), M.pants, [0, 0, 0], [b, 1, 0.72]);
    // torso shell (jacket / coat / gown...)
    const torso = spec.face?.female
      ? [[0.12, -0.24], [0.125, -0.12], [0.15, 0.04], [0.165, 0.14], [0.17, 0.24], [0.13, 0.3], [0.07, 0.33], [0.045, 0.34]]
      : [[0.155, -0.24], [0.16, -0.1], [0.178, 0.05], [0.195, 0.17], [0.19, 0.25], [0.155, 0.3], [0.09, 0.335], [0.05, 0.345]];
    add(this.chest, lathe(torso), M.top, [0, 0, 0], [b, 1, 0.62]);
    const kind = spec.outfit.kind;
    if (kind === "jacket" || kind === "coat" || kind === "labcoat" || kind === "citizen") {
      // hem / coat tail flares over the hips
      const len = kind === "jacket" ? 0.24 : kind === "citizen" ? 0.38 : 0.62;
      add(this.chest, lathe([[0.158, -0.2], [0.17, -0.2 - len * 0.5], [0.19, -0.2 - len], [0.185, -0.2 - len - 0.005]], 24), M.top, [0, 0, 0], [b, 1, 0.7]).material = M.topDouble;
      // high collar (open at the front)
      add(this.chest, new THREE.CylinderGeometry(0.1, 0.09, 0.16, 22, 1, true, 0.62, Math.PI * 2 - 1.24), M.topDouble, [0, 0.385, -0.01], [b, 1, 0.9]);
    }
    if (kind === "jacket") {
      // metallic details: shoulder plates, zipper seam, cuff rings, chest node
      for (const s of [-1, 1]) {
        add(this.chest, new THREE.BoxGeometry(0.12, 0.018, 0.13), M.metal, [s * 0.15 * b, 0.285, 0], [1, 1, 1], [0, 0, -s * 0.32]);
        add(this.chest, new THREE.BoxGeometry(0.003, 0.16, 0.003), M.accent, [s * 0.07, 0.06, 0.112], [1, 1, 1], [0, 0, s * 0.18]);
      }
      add(this.chest, new THREE.BoxGeometry(0.008, 0.48, 0.01), M.metal, [0.018, 0.05, 0.118], [1, 1, 1], [0, 0, -0.03]);
      add(this.chest, new THREE.CylinderGeometry(0.012, 0.012, 0.006, 16), M.accent, [-0.09, 0.17, 0.112], [1, 1, 1], [Math.PI / 2, 0, 0]);
    }
    if (kind === "labcoat") for (const s of [-1, 1]) add(this.chest, new THREE.BoxGeometry(0.07, 0.07, 0.01), M.metal, [s * 0.1, 0.0, 0.11]);
    if (kind === "gown") add(this.hips, lathe([[0.12, 0.05], [0.2, -0.3], [0.3, -0.75], [0.36, -0.97], [0.0, -0.98]], 32), M.top, [0, 0, 0], [1, 1, 0.8]);
    if (kind === "bodysuit") for (const y of [-0.15, 0, 0.15]) add(this.chest, new THREE.TorusGeometry(0.17, 0.004, 6, 32), M.accent, [0, y, 0], [b, 0.62, 1], [Math.PI / 2, 0, 0]);
    if (spec.outfit.hood) add(this.chest, new THREE.SphereGeometry(0.15, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), M.topDouble, [0, 0.47, -0.03], [1.0, 1.15, 1.08], [-0.25, 0, 0]);

    // neck
    add(this.neck, new THREE.CylinderGeometry(0.05, 0.056, 0.1, 16), M.skinBody, [0, 0.035, -0.006]);
    // tapered limbs (lathe profiles with rounded ends, pivot at the top joint)
    const limb = (r0: number, r1: number, len: number) => lathe([[0.0001, r0 * 0.85], [r0 * 0.75, r0 * 0.62], [r0, 0], [lerp(r0, r1, 0.4) * 1.05, -len * 0.35], [r1, -len], [r1 * 0.7, -len - r1 * 0.65], [0.0001, -len - r1 * 0.85]], 16);
    // arms
    for (const s of [1, -1]) {
      const sh = new THREE.Group(); sh.position.set(s * 0.198 * b, 0.25, 0); this.chest.add(sh); this.sh.push(sh);
      add(sh, new THREE.SphereGeometry(0.068, 16, 12), M.sleeve, [s * -0.008, 0.012, 0], [1.05, 0.95, 1]); // deltoid
      add(sh, limb(0.06, 0.046, 0.28), M.sleeve, [0, 0, 0], [1, 1, 0.92]);
      const el = new THREE.Group(); el.position.y = -0.29; sh.add(el); this.el.push(el);
      add(el, limb(0.049, 0.036, 0.24), M.sleeve, [0, 0, 0], [1, 1, 0.9]);
      if (kind === "jacket") add(el, new THREE.CylinderGeometry(0.041, 0.041, 0.022, 16), M.metal, [0, -0.225, 0]);
      const ha = new THREE.Group(); ha.position.y = -0.255; el.add(ha); this.ha.push(ha);
      add(ha, cap(0.028, 0.045), M.skinBody, [0, -0.045, 0.004], [1.05, 1, 0.55]);
      for (let k = 0; k < 4; k++) add(ha, cap(0.0085, 0.038), M.skinBody, [(k - 1.5) * 0.0165 * s, -0.098 + Math.abs(k - 1.5) * 0.004, 0.006], [1, 1, 1], [-0.35, 0, 0]);
      add(ha, cap(0.0095, 0.03), M.skinBody, [-s * 0.03, -0.04, 0.02], [1, 1, 1], [0.4, 0, s * 0.6]);
    }
    // legs
    for (const s of [1, -1]) {
      const th = new THREE.Group(); th.position.set(s * 0.092 * b, -0.03, 0); this.hips.add(th); this.th.push(th);
      add(th, limb(0.088, 0.06, 0.43), M.pants, [0, 0, 0], [1, 1, 0.95]);
      const kn = new THREE.Group(); kn.position.y = -0.45; th.add(kn); this.kn.push(kn);
      add(kn, limb(0.063, 0.045, 0.41), M.pants, [0, 0, 0]);
      const ft = new THREE.Group(); ft.position.y = -0.44; kn.add(ft); this.ft.push(ft);
      add(ft, cap(0.05, 0.14), M.boots, [0, -0.02, 0.05], [1, 0.75, 1], [Math.PI / 2, 0, 0]);
      add(ft, new THREE.BoxGeometry(0.1, 0.012, 0.25), M.metal, [0, -0.06, 0.05]);
    }
    this.buildHead(M);
    if (spec.holo) {
      // depth pre-pass: an invisible opaque copy writes depth first, so the additive hologram only shows its front surface
      const pre = new THREE.MeshBasicMaterial({ colorWrite: false, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 8 });
      const meshes: THREE.Mesh[] = []; this.root.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh); });
      for (const m of meshes) { m.castShadow = false; m.receiveShadow = false; const d = new THREE.Mesh(m.geometry, pre); d.renderOrder = -1; m.add(d); this.depthMeshes.push(d); }
    }
  }

  private materials() {
    const sp = this.spec;
    if (sp.holo) {
      const H = (c: number, o: any = {}) => { const m = holo(c, o); this.holoMats.push(m); return m; };
      const base = H(sp.holo, { fill: 0.08, rim: 0.9 });
      return {
        skin: H(sp.holo, { fill: 0.16, rim: 0.85 }), skinBody: base, top: base, topDouble: base, sleeve: base, pants: base, boots: base,
        metal: H(0xffffff, { fill: 0.25, rim: 0.6 }), accent: H(sp.holo, { fill: 0.9, rim: 0.5 }),
        hair: H(sp.hair.color, { fill: 0.22, rim: 0.7, sway: sp.hair.style === "long" }), brow: H(sp.brows.color, { fill: 0.6, rim: 0.4 }),
        lip: H(sp.holo, { fill: 0.4, rim: 0.5 }), lash: H(0xffffff, { fill: 0.9, rim: 0.3 }), mouth: H(0x000000, { fill: 0, rim: 0 }), white: H(0xffffff, { fill: 0.3, rim: 0.3 }),
      };
    }
    const skinTex = skin(sp.skin.key, sp.skin);
    const hero = this.detail === "hero";
    const skinM = hero
      ? new THREE.MeshPhysicalMaterial({ map: skinTex, roughness: 0.62, sheen: 0.25, sheenRoughness: 0.6, sheenColor: new THREE.Color(sp.skin.blush), envMapIntensity: 0.25 })
      : std(0xffffff, { map: skinTex, roughness: 0.6 });
    const o = sp.outfit, accent = o.accent ?? 0x38e8ff;
    const top = fabric(o.kind + o.color, o.color, ["#000000", "#ffffff", "#30344a", "#1a1c26"], { roughness: o.kind === "jacket" ? 0.42 : 0.7, metalness: o.kind === "jacket" ? 0.25 : 0 });
    const topDouble = top.clone(); topDouble.side = THREE.DoubleSide;
    return {
      skin: skinM, skinBody: std(new THREE.Color(sp.skin.base), { roughness: 0.6 }), top, topDouble,
      sleeve: top,
      pants: fabric("pants" + o.kind, o.kind === "tee" ? "#2a2f3c" : o.kind === "bodysuit" ? o.color : "#14151b", ["#000", "#3a3e50"], { roughness: 0.75 }),
      boots: std(o.kind === "bodysuit" ? 0x9aa0aa : 0x0a0a0e, { roughness: 0.35, metalness: 0.2 }),
      metal: std(0xa9b3c7, { roughness: 0.25, metalness: 1.0, envMapIntensity: 1.5 }),
      accent: new THREE.MeshBasicMaterial({ color: new THREE.Color(accent).multiplyScalar(1.1), toneMapped: false }),
      hair: std(sp.hair.color, { roughness: 0.78, metalness: 0.0, envMapIntensity: 0.35, map: painted("hairstrands" + sp.hair.color, "#" + new THREE.Color(sp.hair.color).getHexString(), ["#000000", "#ffffff"], { n: 1200, len: 60, alpha: 0.1 }) }),
      brow: std(sp.brows.color, { roughness: 0.7 }),
      lip: std(new THREE.Color(sp.skin.base).lerp(new THREE.Color(sp.skin.blush), 0.5).lerp(new THREE.Color(sp.skin.shade), 0.25), { roughness: 0.5, envMapIntensity: 0.2 }),
      mouth: std(0x1c0709, { roughness: 1 }), white: std(0xd9d2cb, { roughness: 0.22 }), lash: std(0x07060a, { roughness: 0.8 }),
    };
  }

  /** Sculpt the head from a sphere: cranium, jaw-angle profile, face plane, sockets, cheekbones, muzzle, chin. */
  private headGeometry(seg: number) {
    const f = this.spec.face ?? {}, fem = f.female ? 1 : 0;
    const g = new THREE.SphereGeometry(1, Math.round(128 * seg), Math.round(96 * seg));
    const p = g.attributes.position as THREE.BufferAttribute, v = new THREE.Vector3();
    const bump = (d: THREE.Vector3, c: number[], r: number) => { const dx = d.x - c[0], dy = d.y - c[1], dz = d.z - c[2]; return Math.exp(-(dx * dx + dy * dy + dz * dz) / (r * r)); };
    const jaw = f.jaw ?? (fem ? 0.84 : 0.98), chin = f.chin ?? (fem ? 0.9 : 1), cheek = f.cheek ?? 1;
    // width profile from crown (y=1) to chin (y=-1)
    const prof = (y: number) => y > 0 ? 1 : y > -0.42 ? lerp(1, 0.94 * (0.6 + 0.4 * jaw), -y / 0.42) : y > -0.82 ? lerp(0.94 * (0.6 + 0.4 * jaw), 0.6 * jaw, (-y - 0.42) / 0.4) : lerp(0.6 * jaw, 0.4, (-y - 0.82) / 0.18);
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i); const d = v.clone();
      let x = d.x * 0.081, y = d.y * 0.113, z = d.z * 0.099;
      const front = clamp(d.z * 1.5 + 0.3);
      x *= lerp(prof(d.y) * 0.97, prof(d.y), front);
      if (d.y < -0.3 && d.z < 0.2) z *= lerp(1, 0.78, clamp((-d.y - 0.3) / 0.7) * clamp((0.2 - d.z) / 0.8)); // lower back = neck
      if (d.z < 0) { z *= 1.07; y += 0.006 * clamp(-d.z) * clamp(d.y + 0.2); }                           // occipital
      if (d.z > 0.55) z = lerp(z, Math.min(z, 0.093), 0.45);                                               // flatten face plane
      x *= 1 + 0.07 * cheek * (bump(d, [0.72, -0.08, 0.62], 0.3) + bump(d, [-0.72, -0.08, 0.62], 0.3));
      x *= 1 - 0.035 * (bump(d, [0.92, 0.32, 0.25], 0.3) + bump(d, [-0.92, 0.32, 0.25], 0.3));             // temples
      z += 0.007 * bump(d, [0, 0.3, 0.95], 0.32) * (fem ? 0.35 : 1) * (f.brow ?? 1);                      // brow ridge
      for (const s2 of [-1, 1]) z -= 0.017 * bump(d, [s2 * 0.38, 0.1, 0.92], 0.2);                         // eye sockets
      z += 0.007 * bump(d, [0, -0.52, 0.85], 0.3);                                                          // muzzle
      z += 0.012 * chin * bump(d, [0, -0.88, 0.45], 0.26); y -= 0.01 * chin * bump(d, [0, -0.9, 0.42], 0.3); // chin
      z -= 0.003 * bump(d, [0, -0.7, 0.75], 0.12);                                                          // chin cleft / mentolabial
      if (d.z > 0.3) {
        const fz = clamp((d.z - 0.3) / 0.4), nz = f.nose ?? (fem ? 0.78 : 1);
        // nose sculpted into the skull: bridge between the eyes grows to a tip, alae either side, quick fall to the philtrum
        const yy = d.y; let A = 0;
        if (yy <= 0.16 && yy >= -0.3) A = 0.003 + 0.017 * Math.pow((0.16 - yy) / 0.46, 1.5);
        else if (yy < -0.3 && yy > -0.42) A = 0.02 * Math.pow(1 - (-0.3 - yy) / 0.12, 1.6);
        const w = lerp(0.075, 0.13, clamp((0.16 - yy) / 0.46)) * (fem ? 0.85 : 1);
        z += nz * A * Math.exp(-((d.x / w) ** 2)) * fz;
        y -= nz * 0.004 * Math.exp(-((d.x / w) ** 2)) * fz * clamp((0.0 - yy) / 0.3) * (yy > -0.42 ? 1 : 0);   // tip droops slightly
        for (const s2 of [-1, 1]) z += nz * 0.0065 * Math.exp(-(((d.x - s2 * 0.15) / 0.07) ** 2 + ((yy + 0.32) / 0.07) ** 2)) * fz; // alae
        // lips: soft bulges above / below the mouth line
        const lf = f.lips ?? (fem ? 1.25 : 1);
        z += lf * 0.0042 * Math.exp(-((d.x / 0.24) ** 2 + ((yy + 0.465) / 0.045) ** 2)) * fz;
        z += lf * 0.0052 * Math.exp(-((d.x / 0.21) ** 2 + ((yy + 0.565) / 0.05) ** 2)) * fz;
        z -= 0.0025 * Math.exp(-((d.x / 0.26) ** 2 + ((yy + 0.515) / 0.016) ** 2)) * fz;                     // mouth crease
      }
      p.setXYZ(i, x, y, z);
    }
    g.computeVertexNormals(); return g;
  }

  private buildHead(M: ReturnType<Human["materials"]>) {
    const sp = this.spec, hero = this.detail === "hero", seg = hero ? 1 : 0.45, H = this.head, fem = sp.face?.female;
    const add = (parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, p: number[], s: number[] = [1, 1, 1], r: number[] = [0, 0, 0]) => {
      const m = new THREE.Mesh(geo, mat); m.position.set(p[0], p[1], p[2]); m.scale.set(s[0], s[1], s[2]); m.rotation.set(r[0], r[1], r[2]); m.castShadow = !sp.holo; m.receiveShadow = !sp.holo; parent.add(m); return m;
    };
    const C = new THREE.Group(); C.position.y = 0.105; H.add(C); // head centre
    this.headMesh = add(C, this.headGeometry(seg), M.skin, [0, 0, 0]);
    // nose
    const nz = sp.face?.nose ?? (fem ? 0.8 : 1);
    void nz; // nose is sculpted into the head mesh (headGeometry)
    // ears
    for (const s of [-1, 1]) add(C, new THREE.SphereGeometry(1, 14, 10), M.skin, [s * 0.082, -0.005, -0.008], [0.011, 0.027, 0.019], [0, s * 0.3, 0]);
    // eyes (white + iris disc + catchlight), lids, brows
    const irisT = iris(sp.name + sp.eyes.inner, sp.eyes.inner, sp.eyes.outer, sp.eyes.glow);
    const ER = 0.0136;
    for (const s of [1, -1]) {
      const eg = new THREE.Group(); eg.position.set(s * 0.034, 0.011, 0.0675); C.add(eg); this.eyes.push(eg);
      add(eg, new THREE.SphereGeometry(ER, Math.round(24 * seg) + 6, Math.round(16 * seg) + 6), M.white, [0, 0, 0]);
      const im = new THREE.MeshBasicMaterial({ map: irisT, transparent: true, toneMapped: !sp.eyes.glow, color: sp.eyes.glow ? new THREE.Color(1.8, 1.8, 1.8) : new THREE.Color(1, 1, 1) });
      this.irisM.push(im);
      // iris = domed cap sitting ON the eyeball surface (planar UVs so the painted iris maps radially)
      const capA = 0.62, icap = new THREE.SphereGeometry(ER * 1.004, 40, 12, 0, Math.PI * 2, 0, capA); icap.rotateX(Math.PI / 2);
      { const ip = icap.attributes.position as THREE.BufferAttribute, iu = icap.attributes.uv as THREE.BufferAttribute, rr = ER * 1.004 * Math.sin(capA);
        for (let k = 0; k < ip.count; k++) iu.setXY(k, ip.getX(k) / (2 * rr) + 0.5, ip.getY(k) / (2 * rr) + 0.5); }
      const ir = add(eg, icap, im, [0, 0, 0]);
      ir.castShadow = false;
      if (hero && !sp.holo) { const co = add(eg, new THREE.SphereGeometry(ER * 1.015, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.42), new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.03, metalness: 1, transparent: true, opacity: 0.2, envMapIntensity: 1.2, depthWrite: false }), [0, 0, 0], [1, 1, 1], [Math.PI / 2, 0, 0]); co.castShadow = false; this.cornea.push(co); }
      if (hero) { const cl = add(eg, new THREE.SphereGeometry(ER * 0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xbfc8d8 }), [ER * 0.25, ER * 0.3, ER * 0.995]); cl.castShadow = false; }
      const gs = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow("#ff2a3d"), color: 0xff2a3d, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0, toneMapped: false }));
      gs.scale.setScalar(0.07); gs.position.set(s * 0.034, 0.011, 0.092); C.add(gs); this.eyeGlow.push(gs);
      if (hero || sp.holo) {
        const lid = new THREE.SphereGeometry(ER * 1.07, hero ? 48 : 20, hero ? 20 : 10, 0, Math.PI * 2, 0, Math.PI / 2);
        const u = add(eg, lid, M.skin, [0, 0, 0]); this.lidU.push(u);
        const d = add(eg, lid, M.skin, [0, 0, 0], [1, 1, 1], [Math.PI, 0, 0]); this.lidD.push(d);
        const lashPts = (r: number, a0: number, a1: number) => new THREE.CatmullRomCurve3(Array.from({ length: 9 }, (_, k) => { const a = lerp(a0, a1, k / 8); return new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r); }));
        add(u, new THREE.TubeGeometry(lashPts(ER * 1.085, 0.1 * Math.PI, 0.9 * Math.PI), 24, ER * (fem ? 0.12 : 0.075), 6), M.lash, [0, 0, 0]);
        if (fem) add(d, new THREE.TubeGeometry(lashPts(ER * 1.08, 0.25 * Math.PI, 0.75 * Math.PI), 16, ER * 0.03, 4), M.lash, [0, 0, 0]);
        // brow: arched tube
        const bg = new THREE.Group(); bg.position.set(s * 0.034, 0.034, 0.083); C.add(bg); this.brows.push(bg);
        const th = (sp.brows.thick ?? 1) * (fem ? 0.6 : 1);
        const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-s * 0.02, -0.003, 0.004), new THREE.Vector3(s * 0.0, 0.003, 0.003), new THREE.Vector3(s * 0.024, 0.0, -0.006)]);
        // brow built from fine tapered hair strokes along the arch (reads as hair, not a bar, in macro shots)
        const bgeo: THREE.BufferGeometry[] = []; const BR = rng(sp.hair.seed * 3 + (s > 0 ? 1 : 2)); const nb = hero || sp.holo ? 34 : 10;
        for (let k = 0; k < nb; k++) {
          const u = k / (nb - 1), pnt = curve.getPoint(u), tan = curve.getTangent(u);
          const len = 0.007 + 0.006 * Math.sin(u * Math.PI) * th + BR() * 0.003, wid = 0.0022 * th * (1.2 - u * 0.5);
          const cg = new THREE.ConeGeometry(wid, len, 4, 1); cg.translate(0, len / 2, 0); cg.scale(1, 1, 0.35);
          const dir = tan.clone().multiplyScalar(0.85).add(new THREE.Vector3(0, 0.35 + (BR() - 0.5) * 0.4, 0)).normalize();
          cg.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir));
          cg.translate(pnt.x, pnt.y + (BR() - 0.5) * 0.003 * th, pnt.z + 0.001); bgeo.push(cg.toNonIndexed());
        }
        const bm = new THREE.Mesh(mergeGeometries(bgeo)!, M.brow); bm.castShadow = false; bg.add(bm);
      }
    }
    // mouth: dark interior + lips
    const mz = sp.face?.lips ?? (fem ? 1.25 : 1);
    this.mouthDark = add(C, new THREE.SphereGeometry(1, 16, 10), M.mouth, [0, -0.0585, 0.0855], [0.019, 0.003, 0.01]);
    this.lipU = add(C, new THREE.CapsuleGeometry(0.0022 * mz, 0.022, 4, 10), M.lip, [0, -0.0545, 0.0905], [1, 1, 0.5], [0, 0, Math.PI / 2]);
    this.lipD = add(C, new THREE.CapsuleGeometry(0.0026 * mz, 0.018, 4, 10), M.lip, [0, -0.0625, 0.0898], [1, 1, 0.5], [0, 0, Math.PI / 2]);
    // neural link (citizens only)
    if (sp.neural) {
      add(C, new THREE.TorusGeometry(0.009, 0.0025, 8, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x38e8ff).multiplyScalar(3), toneMapped: false }), [0.072, -0.02, -0.05], [1, 1, 1], [0, Math.PI / 2 + 0.6, 0]);
      add(C, new THREE.CylinderGeometry(0.002, 0.002, 0.09, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x38e8ff).multiplyScalar(2), toneMapped: false }), [0.064, -0.075, -0.052], [1, 1, 1], [0.15, 0, 0.1]);
      this.neuralGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow("#38e8ff"), color: 0x38e8ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }));
      this.neuralGlow.scale.setScalar(0.09); this.neuralGlow.position.set(0.078, -0.02, -0.05); C.add(this.neuralGlow);
    }
    this.buildHair(C, M.hair, seg);
  }

  private buildHair(C: THREE.Group, mat: THREE.Material, seg: number) {
    const sp = this.spec, st = sp.hair.style, R = rng(sp.hair.seed);
    const geos: THREE.BufferGeometry[] = [];
    const head = this.headMesh.geometry as THREE.BufferGeometry;
    const dirOf = (i: number, pa: THREE.BufferAttribute, v: THREE.Vector3) => v.fromBufferAttribute(pa, i).multiply(new THREE.Vector3(1 / 0.083, 1 / 0.115, 1 / 0.098)).normalize();
    // scalp mask per style (direction on unit head sphere)
    const mask = (d: THREE.Vector3) => {
      if (st === "messy" || st === "short") return d.y > 0.36 * Math.max(d.z, 0) + 0.12 * Math.abs(d.x) - 0.62 * Math.max(-d.z, 0) + (Math.abs(d.x) > 0.8 && d.z > -0.3 ? 0.12 : 0) - 0.02;
      if (st === "long") return d.y > 0.42 * Math.max(d.z, 0) - 0.95 * Math.max(-d.z, 0) + 0.04 * Math.abs(d.x);
      if (st === "receding") return d.z < 0.15 && d.y > -0.45 + 0.2 * Math.max(d.z, 0) && d.y < 0.55;
      if (st === "hood") return false;
      return false;
    };
    // cap: copy of head surface over the scalp, slightly inflated
    if (st !== "hood") {
      const capG = head.clone(); const pa = capG.attributes.position as THREE.BufferAttribute; const v = new THREE.Vector3();
      const keep: number[] = []; const idx = capG.index!;
      const ok = new Array(pa.count).fill(false).map((_, i) => mask(dirOf(i, pa, v)));
      for (let i = 0; i < idx.count; i += 3) { const a = idx.getX(i), b = idx.getX(i + 1), c = idx.getX(i + 2); if (ok[a] && ok[b] && ok[c]) keep.push(a, b, c); }
      capG.setIndex(keep);
      // sculpt chunky locks: random gaussian lumps over the scalp (painted-animation hair masses)
      const lumps = Array.from({ length: 70 }, () => { const q = new THREE.Vector3(R() * 2 - 1, R() * 1.4 - 0.2, R() * 2 - 1).normalize(); return { q, a: 0.01 + R() * 0.022, r: 0.18 + R() * 0.2 }; });
      const vol = st === "receding" ? 0.6 : st === "long" ? 0.5 : 1;
      for (let i = 0; i < pa.count; i++) {
        const d = dirOf(i, pa, v).clone(); let k = 1.05 + 0.02 * vol * Math.max(d.y, 0);
        for (const L of lumps) { const dd = d.distanceToSquared(L.q); k += vol * L.a * Math.exp(-dd / (L.r * L.r)) * 3.2; }
        const fr = d.z > 0.3 && d.y > 0.25 && st !== "long" ? 1 : 0; // fringe: pull the front edge down over the brow
        const pp = new THREE.Vector3().fromBufferAttribute(pa, i).multiplyScalar(k); if (fr) pp.y -= 0.012 * clamp((0.7 - d.y) * 2); pa.setXYZ(i, pp.x, pp.y, pp.z);
      }
      capG.computeVertexNormals(); geos.push(capG);
    }
    // flat tufts lying along the scalp (basis: Y = growth dir, Z = surface normal) — reads as painted hair locks
    const up = new THREE.Vector3(0, 1, 0);
    const tuft = (base: THREE.Vector3, normal: THREE.Vector3, dir: THREE.Vector3, len: number, wid: number, curl = 0.35) => {
      const cg = new THREE.ConeGeometry(wid, len, 6, 4); cg.translate(0, len / 2, 0); cg.scale(1, 1, 0.42);
      const cp = cg.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < cp.count; i++) { const y = cp.getY(i) / len; cp.setZ(i, cp.getZ(i) + y * y * len * curl); } // curl tips down onto the head
      const Y = dir.clone().normalize(); const Z = normal.clone().sub(Y.clone().multiplyScalar(normal.dot(Y))).normalize(); const X = new THREE.Vector3().crossVectors(Y, Z);
      cg.applyMatrix4(new THREE.Matrix4().makeBasis(X, Y, Z.negate())); cg.translate(base.x, base.y, base.z); return cg;
    };
    const N = st === "long" ? 56 : st === "receding" ? 70 : st === "hood" ? 0 : 260;
    let made = 0, tries = 0;
    const hero = this.detail === "hero";
    while (made < Math.round(N * (hero ? 1 : 0.35)) && tries++ < 12000) {
      const d = new THREE.Vector3(R() * 2 - 1, R() * 2 - 1, R() * 2 - 1).normalize();
      if (!mask(d)) continue;
      const base = new THREE.Vector3(d.x * 0.081, d.y * 0.113, d.z * 0.1).multiplyScalar(1.035);
      if (st === "long") {
        // long silver strands: start on the scalp, sweep back, fall behind the shoulders (tapered, sway in shader)
        const side = Math.sign(d.x) || 1;
        const pts = [base, base.clone().multiplyScalar(1.06).add(new THREE.Vector3(side * 0.012, -0.012, -0.018)),
          new THREE.Vector3(side * (0.088 + R() * 0.02), -0.05, -0.03 - R() * 0.05 + Math.max(d.z, 0) * 0.06),
          new THREE.Vector3(side * (0.1 + R() * 0.05), -0.2 - R() * 0.06, -0.06 - R() * 0.05),
          new THREE.Vector3(side * (0.11 + R() * 0.07), -0.34 - R() * 0.12, -0.09 - R() * 0.06)];
        const curve = new THREE.CatmullRomCurve3(pts); const TS = 24, RS = 5;
        const tg = new THREE.TubeGeometry(curve, TS, 0.012 + R() * 0.006, RS, false);
        const tp = tg.attributes.position as THREE.BufferAttribute; const sway = new Float32Array(tp.count);
        for (let i = 0; i < tp.count; i++) { const u = Math.floor(i / (RS + 1)) / TS; const c = curve.getPoint(u); const q = new THREE.Vector3().fromBufferAttribute(tp, i); q.sub(c).multiplyScalar(1 - 0.75 * u).add(c); tp.setXYZ(i, q.x, q.y, q.z); sway[i] = u; }
        tg.setAttribute("sway", new THREE.BufferAttribute(sway, 1)); geos.push(tg); made++; continue;
      }
      const n = d.clone();
      let flow: THREE.Vector3;
      if (st === "receding") flow = new THREE.Vector3(d.x * 0.6, -0.5, -0.8);
      else if (d.z > 0.25 && d.y > 0.2) flow = new THREE.Vector3(d.x * 0.9 + (R() < 0.5 ? -0.6 : 0.6), -0.35, 0.35);  // fringe swept to the sides   // fringe falls forward over the brow
      else if (d.z < -0.2) flow = new THREE.Vector3(d.x * 0.4, -0.8, -0.6);
      else flow = new THREE.Vector3(Math.sign(d.x) * 0.5, -0.7, d.z * 0.5);
      const dir = flow.normalize().multiplyScalar(0.85).add(n.clone().multiplyScalar(st === "receding" ? 0.35 : 0.1)).add(new THREE.Vector3(R() - 0.5, R() - 0.5, R() - 0.5).multiplyScalar(st === "receding" ? 0.8 : 0.5));
      const fringe = d.z > 0.35 && d.y > 0.25 ? 1.05 : 1;
      const len = (st === "short" ? 0.03 + R() * 0.015 : st === "receding" ? 0.028 + R() * 0.022 : 0.04 + R() * 0.03) * fringe;
      const L2 = d.z > 0.45 && d.y < 0.62 && st !== "receding" ? Math.min(len, 0.03) : len; // never let the fringe cover the eyes
      geos.push(tuft(base, n, dir, L2, (st === "messy" ? 0.009 : 0.016) + R() * 0.009, st === "receding" ? 0.15 : 0.45)); made++;
    }
    if (sp.beard) {
      for (let k = 0, m = 0; m < (hero ? 170 : 50) && k < 5000; k++) {
        const d = new THREE.Vector3(R() * 2 - 1, -R(), R() * 1.4 - 0.2).normalize();
        if (d.y > -0.28 || d.z < 0.05) continue;
        if (d.y > -0.64 && d.y < -0.38 && Math.abs(d.x) < 0.32 && d.z > 0.6) continue; // keep the mouth free
        const base = new THREE.Vector3(d.x * 0.081 * 0.92, d.y * 0.113, d.z * 0.099).multiplyScalar(1.02);
        const dir = new THREE.Vector3(d.x * 0.25, -1, 0.25).normalize().add(d.clone().multiplyScalar(0.3)).add(new THREE.Vector3(R() - 0.5, 0, R() - 0.5).multiplyScalar(0.4));
        geos.push(tuft(base, d, dir, 0.02 + R() * 0.022, 0.016 + R() * 0.008, 0.25)); m++;
      }
      for (const s2 of [-1, 1]) { const g = new THREE.CapsuleGeometry(0.0042, 0.026, 3, 8); g.rotateZ(Math.PI / 2 + s2 * 0.32); g.scale(1, 1, 0.6); g.translate(s2 * 0.015, -0.0475, 0.0975); geos.push(g); }
    }
    if (!geos.length) return;
    const merged = mergeGeometries(geos.map((g) => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (k !== "position" && k !== "normal" && k !== "uv" && k !== "sway") n.deleteAttribute(k); if (!n.attributes.sway) n.setAttribute("sway", new THREE.BufferAttribute(new Float32Array(n.attributes.position.count), 1)); if (!n.attributes.uv) n.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2)); return n; }), false)!;
    merged.computeVertexNormals();
    const m = new THREE.Mesh(merged, sp.beard && sp.hair.color !== sp.beard.color ? mat : mat); m.castShadow = !sp.holo; C.add(m); this.hairMesh = m;
  }

  // ------------------------------------------------------------------ animation API
  /** Return to rest pose; call at the start of every frame before posing. */
  reset() {
    for (const g of [this.hips, this.spine, this.chest, this.neck, this.head, ...this.sh, ...this.el, ...this.ha, ...this.th, ...this.kn, ...this.ft]) g.rotation.set(0, 0, 0);
    this.hips.position.set(0, 0.98, 0); this.chest.scale.set(1, 1, 1);
    this.sh[0].rotation.z = 0.08; this.sh[1].rotation.z = -0.08; // arms relaxed at sides
    this.el[0].rotation.x = -0.12; this.el[1].rotation.x = -0.12;
    Object.assign(this.s, { blink: 0, mouth: 0, browUp: 0, frown: 0, squint: 0, smile: 0, gx: 0, gy: 0, eyeGlow: 0 });
  }
  /** idle breathing + weight shift */
  idle(t: number, amt = 1) {
    const br = Math.sin(t * 1.6) * 0.012 * amt;
    this.chest.rotation.x += br; this.chest.scale.set(1, 1 + br * 0.4, 1 + br * 0.6);
    this.hips.rotation.z += Math.sin(t * 0.4) * 0.015 * amt; this.spine.rotation.z -= Math.sin(t * 0.4) * 0.012 * amt;
    this.sh[0].rotation.z += Math.sin(t * 1.6) * 0.01 * amt; this.sh[1].rotation.z -= Math.sin(t * 1.6) * 0.01 * amt;
  }
  /** walk cycle; phase in cycles (1 = two steps) */
  walk(phase: number, amt = 1, stride = 1) {
    const a = phase * Math.PI * 2, sw = 0.45 * stride * amt;
    for (const [i, s] of [[0, 1], [1, -1]] as const) {
      const p = a + (i ? Math.PI : 0);
      this.th[i].rotation.x += -Math.sin(p) * sw;
      this.kn[i].rotation.x += Math.max(0, Math.cos(p + 0.6)) * 0.85 * amt * stride;
      this.ft[i].rotation.x += -Math.sin(p) * 0.18 * amt;
      this.sh[i].rotation.x += Math.sin(p) * 0.38 * amt * stride;
      this.el[i].rotation.x += -0.2 * amt - Math.max(0, Math.sin(p)) * 0.25 * amt;
      void s;
    }
    this.hips.position.y -= Math.abs(Math.cos(a)) * 0.025 * amt - 0.012 * amt;
    this.hips.rotation.y += Math.sin(a) * 0.07 * amt; this.chest.rotation.y -= Math.sin(a) * 0.1 * amt;
    this.chest.rotation.x += 0.04 * amt;
  }
  /** run cycle: bigger strides, forward lean, pumping arms */
  run(phase: number, amt = 1) {
    const a = phase * Math.PI * 2;
    for (const i of [0, 1]) {
      const p = a + (i ? Math.PI : 0);
      this.th[i].rotation.x += -Math.sin(p) * 0.85 * amt - 0.15 * amt;
      this.kn[i].rotation.x += (0.5 + Math.max(0, Math.cos(p + 0.9)) * 1.4) * amt;
      this.ft[i].rotation.x += -Math.sin(p) * 0.3 * amt;
      this.sh[i].rotation.x += Math.sin(p) * 0.9 * amt;
      this.el[i].rotation.x += -1.35 * amt;
    }
    this.hips.position.y += (Math.abs(Math.sin(a)) * 0.07 - 0.05) * amt;
    this.spine.rotation.x += 0.22 * amt; this.chest.rotation.x += 0.08 * amt; this.head.rotation.x -= 0.18 * amt;
    this.chest.rotation.y -= Math.sin(a) * 0.16 * amt;
  }
  /** crouch / kneel (k 0..1) */
  crouch(k: number) {
    this.hips.position.y -= 0.43 * k; this.hips.position.z -= 0.08 * k;
    for (const i of [0, 1]) { this.th[i].rotation.x -= 1.45 * k; this.kn[i].rotation.x += 2.25 * k; this.ft[i].rotation.x -= 0.75 * k; }
    this.spine.rotation.x += 0.45 * k; this.chest.rotation.x += 0.15 * k;
  }
  /** reach forward/down with arm i (0 = left, 1 = right); k 0..1, low = reach toward the ground */
  reach(i: number, k: number, low = 0) {
    this.sh[i].rotation.x -= (1.25 - 0.5 * low) * k; this.sh[i].rotation.z += (i === 0 ? -1 : 1) * 0.12 * k; this.el[i].rotation.x -= (0.35 - 0.3 * low) * k;
  }
  /** turn head (yaw right = +), pitch up = - */
  look(yaw: number, pitch = 0) {
    this.neck.rotation.y += yaw * 0.4; this.head.rotation.y += yaw * 0.6;
    this.neck.rotation.x += pitch * 0.4; this.head.rotation.x += pitch * 0.6;
  }
  /** automatic blinking driven by time (deterministic) */
  autoBlink(t: number, seed = 0) {
    const period = 3.1 + hash(seed) * 1.6; const ph = ((t + seed * 1.37) % period) / period;
    const k = ph < 0.035 ? Math.sin((ph / 0.035) * Math.PI) : 0; this.s.blink = Math.max(this.s.blink, k);
  }
  /** apply face state to the meshes (call after setting this.s) */
  applyFace() {
    const s = this.s, open = clamp(s.mouth);
    for (let i = 0; i < this.eyes.length; i++) {
      this.eyes[i].rotation.set(-s.gy * 0.35, s.gx * 0.45, 0);
      if (this.lidU[i]) {
        const lidOpen = lerp(-0.4, 1.62, Math.max(s.blink, s.squint * 0.45));
        this.lidU[i].rotation.set(lidOpen + s.gy * 0.25, 0, 0);
        this.lidD[i].rotation.set(Math.PI + 0.48 - s.squint * 0.3 - s.blink * 0.25, 0, 0);
      }
      if (this.brows[i]) {
        const side = i === 0 ? 1 : -1;
        this.brows[i].position.y = 0.034 + s.browUp * 0.006 - s.frown * 0.003;
        this.brows[i].rotation.z = side * (s.frown * 0.28 - s.browUp * 0.12);
      }
      const g = this.eyeGlow[i]; g.visible = s.eyeGlow > 0.01; (g.material as THREE.SpriteMaterial).opacity = s.eyeGlow; (g.material as THREE.SpriteMaterial).color.copy(s.eyeGlowColor);
      if (!this.spec.eyes.glow) this.irisM[i].color.setRGB(1, 1, 1).lerp(s.eyeGlowColor.clone().multiplyScalar(6), s.eyeGlow);
    }
    this.mouthDark.scale.set(0.0135 - open * 0.002 + s.smile * 0.003, 0.001 + open * 0.014, 0.008);
    this.mouthDark.position.y = -0.0585 - open * 0.004;
    this.lipD.position.y = -0.0625 - open * 0.011;
    this.lipU.position.y = -0.0545 + open * 0.0015;
    this.lipU.rotation.z = this.lipD.rotation.z = Math.PI / 2;
  }
  setHolo(t: number, glitch = 0, opacity = 1, dissolve = 0) {
    for (const m of this.holoMats) { m.uniforms.time.value = t; m.uniforms.glitch.value = glitch; m.uniforms.gseed.value = Math.floor(t * 15); m.uniforms.opacity.value = opacity; m.uniforms.dissolve.value = dissolve; }
  }
  /** world position of the head centre (for camera targeting) */
  headPos(out = new THREE.Vector3()) { this.root.updateMatrixWorld(true); return this.headMesh.getWorldPosition(out); }
  eyePos(i = 0, out = new THREE.Vector3()) { this.root.updateMatrixWorld(true); return this.eyes[i].getWorldPosition(out); }
}
