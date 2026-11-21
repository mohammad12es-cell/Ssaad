// ODDLY EXPLAINED engine — procedural neuron field (microscopic environment).
// Each cell: irregular soma, tapering branching dendrites, one long axon with terminal branches ending in
// synaptic boutons. All cells are merged into one mesh; a shader animates signalling.
// Activity modes (uniforms, blendable):
//   uFire   — individual action-potential-like pulses travelling outward along branches (generic activity)
//   uSync   — slow, large-scale synchronised up/down waves across the field (stylised NREM slow oscillation)
//   uDesync — fast, irregular, local flicker (stylised wake-like / REM activity)
import * as THREE from 'three';
import { RNG, Simplex3, GLSL_NOISE } from './noise.js';
import { taperedTube, mergeGeometries, mergeVertices } from './geom.js';

let AVOID = null; // optional constraint: keeps branches out of the camera corridor
function walk(rng, start, dir, steps, stepLen, wiggle) {
  const pts = [start.clone()]; const d = dir.clone().normalize(); const p = start.clone();
  for (let i = 0; i < steps; i++) {
    d.x += rng.gauss() * wiggle; d.y += rng.gauss() * wiggle; d.z += rng.gauss() * wiggle; d.normalize();
    p.addScaledVector(d, stepLen * (0.8 + 0.4 * rng.next()));
    if (AVOID && AVOID(p, d)) d.normalize();
    pts.push(p.clone());
  }
  return { pts, dir: d };
}

function addAttr(g, name, val, size = 1) {
  const n = g.attributes.position.count; const a = new Float32Array(n * size);
  for (let i = 0; i < n; i++) for (let k = 0; k < size; k++) a[i * size + k] = Array.isArray(val) ? val[k] : val;
  g.setAttribute(name, new THREE.BufferAttribute(a, size));
}

function soma(rng, noise, c, r, cellSeed) {
  const g = mergeVertices(new THREE.IcosahedronGeometry(1, 9));
  const p = g.attributes.position; const elong = 1.1 + rng.next() * 0.5; const ax = new THREE.Vector3(...rng.dir());
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.set(p.getX(i), p.getY(i), p.getZ(i));
    const along = v.dot(ax); v.addScaledVector(ax, along * (elong - 1) * (along > 0 ? 1.4 : 0.6)); // pyramidal-ish teardrop
    const k = 1 + 0.12 * noise.noise(v.x * 2 + cellSeed * 10, v.y * 2, v.z * 2);
    v.multiplyScalar(r * k); p.setXYZ(i, c.x + v.x, c.y + v.y, c.z + v.z);
  }
  g.computeVertexNormals();
  addAttr(g, 'aU', 0); addAttr(g, 'aSeed', cellSeed);
  return { g, axis: ax };
}

export function buildNeuronField(opts = {}) {
  const rng = new RNG(opts.seed ?? 99); const noise = new Simplex3(opts.seed ?? 99);
  const cells = opts.cells; // [{pos:Vector3, scale}]
  AVOID = opts.avoid || null;
  const geos = []; const boutons = []; const somas = [];
  cells.forEach((cell, ci) => {
    const s = cell.scale ?? 1; const c = cell.pos; const cs = rng.next();
    const so = soma(rng, noise, c, 0.3 * s, cs); somas.push({ pos: c.clone(), r: 0.3 * s });
    const parts = [so.g];
    // dendrites
    const nd = rng.int(5, 7);
    const branch = (start, dir, r0, level, u0) => {
      const steps = level === 0 ? rng.int(5, 8) : rng.int(4, 7);
      const w = walk(rng, start, dir, steps, (0.17 + 0.05 * level) * s, 0.28);
      const r1 = Math.max(0.006 * s, r0 * 0.45);
      const t = taperedTube(w.pts, r0, r1, 6, u0, cs);
      parts.push(t.geometry);
      if (level < 2) {
        const nb = level === 0 ? 2 : rng.int(1, 2);
        for (let b = 0; b < nb; b++) {
          const k = 0.45 + 0.5 * rng.next(); const idx = Math.floor(k * (w.pts.length - 1));
          const d2 = w.dir.clone().add(new THREE.Vector3(...rng.dir()).multiplyScalar(0.9)).normalize();
          branch(w.pts[idx], d2, Math.max(0.007 * s, r0 * (1 - k) * 0.75 + r1 * 0.3), level + 1, u0 + t.length * k);
        }
      }
    };
    for (let i = 0; i < nd; i++) {
      let d = new THREE.Vector3(...rng.dir());
      if (i === 0) d = so.axis.clone(); // apical dendrite follows the soma's long axis
      const start = c.clone().addScaledVector(d, 0.22 * s);
      branch(start, d, (i === 0 ? 0.085 : 0.06) * s, 0, 0);
    }
    // axon: leaves opposite the apical dendrite, long and thin, ends in terminal arbour with boutons
    const ad = so.axis.clone().negate().add(new THREE.Vector3(...rng.dir()).multiplyScalar(0.4)).normalize();
    const aw = walk(rng, c.clone().addScaledVector(ad, 0.24 * s), ad, rng.int(10, 16), 0.3 * s, 0.12);
    const at = taperedTube(aw.pts, 0.032 * s, 0.016 * s, 6, 0, cs);
    parts.push(at.geometry);
    const tip = aw.pts[aw.pts.length - 1];
    for (let b = 0; b < rng.int(3, 5); b++) {
      const d2 = aw.dir.clone().add(new THREE.Vector3(...rng.dir()).multiplyScalar(1.1)).normalize();
      const tw = walk(rng, tip, d2, rng.int(3, 5), 0.16 * s, 0.35);
      const tt = taperedTube(tw.pts, 0.012 * s, 0.008 * s, 5, at.length, cs);
      parts.push(tt.geometry);
      boutons.push({ pos: tw.pts[tw.pts.length - 1], u: at.length + tt.length, seed: cs, r: 0.035 * s });
    }
    for (const g of parts) addAttr(g, 'aCell', [c.x, c.y, c.z], 3);
    geos.push(...parts);
  });
  // synaptic boutons
  for (const b of boutons) {
    const g = new THREE.IcosahedronGeometry(b.r, 2); g.deleteAttribute('uv');
    const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + b.pos.x, p.getY(i) + b.pos.y, p.getZ(i) + b.pos.z);
    const I = []; for (let i = 0; i < p.count; i++) I.push(i); g.setIndex(I);
    addAttr(g, 'aU', b.u); addAttr(g, 'aSeed', b.seed); addAttr(g, 'aCell', [b.pos.x, b.pos.y, b.pos.z], 3);
    geos.push(g);
  }
  const geo = mergeGeometries(geos.map((g) => { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'aU', 'aSeed', 'aCell'].includes(k)) g.deleteAttribute(k); return g; }));
  const mat = makeNeuralMaterial();
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false;
  return { mesh, material: mat, boutons, somas };
}

export function makeNeuralMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uFire: { value: 1 }, uSync: { value: 0 }, uDesync: { value: 0 }, uBase: { value: 0.5 },
      uColA: { value: new THREE.Color(0xffa24a) }, uColB: { value: new THREE.Color(0x3cc8ff) }, uMix: { value: 0 },
      uFogColor: { value: new THREE.Color(0x02040b) }, uFogDensity: { value: 0.06 }, uSyncDir: { value: new THREE.Vector3(0.2, 0.1, 1).normalize() },
      uSyncFreq: { value: 0.55 }, uSyncK: { value: 0.25 },
    },
    vertexShader: /* glsl */`
      attribute float aU, aSeed; attribute vec3 aCell;
      varying vec3 vN, vW, vCell; varying float vU, vSeed, vDepth;
      void main(){ vU = aU; vSeed = aSeed; vCell = aCell;
        vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal);
        vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */`
      ${GLSL_NOISE}
      uniform float uTime, uFire, uSync, uDesync, uBase, uMix, uFogDensity, uSyncFreq, uSyncK;
      uniform vec3 uColA, uColB, uFogColor, uSyncDir;
      varying vec3 vN, vW, vCell; varying float vU, vSeed, vDepth;
      float h11(float p){ p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
      void main(){
        vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vW);
        float ndv = abs(dot(N, V)); float fres = pow(1.0 - ndv, 2.2);
        // colour change cascades cell by cell (keeps colours saturated instead of blending through grey)
        float cm = smoothstep(0.0, 1.0, uMix * 2.6 - 0.8 + 0.8 * snoise(vCell * 0.35));
        vec3 col = mix(uColA, uColB, cm);
        float tex = snoise(vW * 18.0) * 0.5 + 0.5;
        // membrane: dark translucent body, bright rim, faint inner scattering
        vec3 c = col * (0.03 + 0.06 * tex) + col * fres * (0.45 + 0.25 * tex) * uBase * 1.4;
        c += vec3(0.6, 0.75, 1.0) * pow(max(dot(N, normalize(vec3(-0.3, 0.8, 0.4))), 0.0), 16.0) * 0.12;
        // (1) propagating spikes: travel outward from the soma along branches
        float rate = 0.9 + 0.8 * h11(vSeed * 91.0);
        float ph = fract(vSeed * 13.0 + uTime * rate * 0.45);
        float front = ph * 6.0 - 0.6;
        float spike = exp(-pow((vU - front) / 0.18, 2.0)) * smoothstep(-0.6, 0.0, front);
        float fire = spike * uFire;
        // (2) synchronised slow waves: whole regions brighten (up-state) and dim (down-state) together
        float sw = 0.5 + 0.5 * sin(6.28318 * (uSyncFreq * uTime - uSyncK * dot(vCell, uSyncDir)));
        sw = smoothstep(0.35, 1.0, sw);
        float syncGlow = uSync * sw * (0.16 + 0.34 * exp(-vU * 0.5));
        // (3) desynchronised fast activity: each cell flickers independently, fast spikes along branches
        float cellId = dot(vCell, vec3(12.9898, 78.233, 37.719));
        float fl = h11(cellId + floor(uTime * 9.0)); fl = step(0.72, fl);
        float ph2 = fract(h11(cellId) + uTime * (1.6 + h11(cellId * 3.0)));
        float sp2 = exp(-pow((vU - (ph2 * 4.0 - 0.3)) / 0.12, 2.0));
        float desync = uDesync * (0.35 * fl * exp(-vU * 0.6) + 0.9 * sp2);
        float act = fire + syncGlow + desync;
        c += mix(col, vec3(1.0), 0.18) * act * (0.5 + 1.0 * fres);
        c += col * act * 0.3;
        // atmospheric depth
        float fog = 1.0 - exp(-uFogDensity * vDepth);
        c = mix(c, uFogColor, clamp(fog, 0.0, 1.0));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
}

// Bokeh-like floating particles (motes in the extracellular space). Size grows with defocus.
export function buildMotes(opts = {}) {
  const rng = new RNG(opts.seed ?? 5); const n = opts.count ?? 2500;
  const P = [], S = [], C = [];
  const [bx, by, bz0, bz1] = opts.box ?? [6, 9, 8, -50];
  for (let i = 0; i < n; i++) {
    P.push(rng.range(-bx, bx), rng.range(-by, by), rng.range(bz1, bz0)); S.push(rng.next()); C.push(rng.next());
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('aSeed', new THREE.Float32BufferAttribute(S, 1));
  g.setAttribute('aCol', new THREE.Float32BufferAttribute(C, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uFocus: { value: 4 }, uRange: { value: 3 }, uSize: { value: 60 }, uAmp: { value: 1 }, uH: { value: 1920 },
      uColA: { value: new THREE.Color(0xffb16a) }, uColB: { value: new THREE.Color(0x4fd2ff) }, uMix: { value: 0.5 }, uStreak: { value: 0 } },
    vertexShader: /* glsl */`
      attribute float aSeed, aCol; uniform float uTime, uFocus, uRange, uSize, uH, uStreak; varying float vA, vC, vCoc;
      void main(){
        vec3 p = position;
        p += vec3(sin(uTime * 0.3 + aSeed * 40.0), cos(uTime * 0.25 + aSeed * 23.0), sin(uTime * 0.2 + aSeed * 11.0)) * 0.25;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float z = -mv.z;
        float coc = clamp(abs(z - uFocus) / uRange, 0.0, 1.0);
        float base = uSize * (0.25 + 0.75 * aSeed * aSeed) / max(z, 0.2);
        float sz = base * (1.0 + 7.0 * coc);
        gl_PointSize = min(sz * uH / 1920.0, 90.0 * uH / 1920.0);
        vA = (1.0 / (1.0 + 14.0 * coc * coc)) * smoothstep(1.2, 3.0, z) * (1.0 - smoothstep(30.0, 45.0, z));
        vC = aCol; vCoc = coc;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform float uAmp, uMix; uniform vec3 uColA, uColB; varying float vA, vC, vCoc;
      void main(){
        float r = length(gl_PointCoord - 0.5) * 2.0; if (r > 1.0) discard;
        float sharp = exp(-r * r * 9.0);
        float disk = smoothstep(1.0, 0.82, r) * (0.55 + 0.45 * smoothstep(0.5, 0.95, r)); // bokeh disk with brighter rim
        float a = mix(sharp, disk * 0.6, smoothstep(0.1, 0.5, vCoc));
        vec3 c = mix(uColA, uColB, step(1.0 - uMix, vC)) ;
        if (vC > 0.93) c = vec3(1.0);
        gl_FragColor = vec4(c * a * vA * uAmp * 0.55, 1.0);
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false;
  return { points: pts, material: mat };
}

// Soft volumetric light shafts: additive planes with an animated noise-modulated gradient.
export function buildShafts(opts = {}) {
  const rng = new RNG(opts.seed ?? 3); const group = new THREE.Group(); const mats = [];
  for (let i = 0; i < (opts.count ?? 5); i++) {
    const m = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uAmp: { value: 1 }, uCol: { value: new THREE.Color(opts.color ?? 0x4fb8ff) }, uSeed: { value: rng.next() * 10 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `${GLSL_NOISE} uniform float uTime, uAmp, uSeed; uniform vec3 uCol; varying vec2 vUv;
        void main(){ float x = abs(vUv.x - 0.5) * 2.0; float core = pow(1.0 - x, 3.0);
          float n = snoise(vec3(vUv.x * 3.0, vUv.y * 1.2 - uTime * 0.08, uSeed)) * 0.5 + 0.5;
          float a = core * smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.55, vUv.y) * (0.45 + 0.55 * n);
          gl_FragColor = vec4(uCol * a * uAmp * 0.12, 1.0); }`,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    const w = rng.range(1.2, 3.0), h = rng.range(14, 22);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
    const [x0, x1, z0, z1] = opts.area ?? [-6, 6, 0, -40];
    mesh.position.set(rng.range(x0, x1), rng.range(-1, 3), rng.range(z1, z0));
    mesh.rotation.set(0, rng.range(-0.6, 0.6), rng.range(-0.5, -0.2));
    group.add(mesh); mats.push(m);
  }
  return { group, mats };
}
