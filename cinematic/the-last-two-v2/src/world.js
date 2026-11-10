// Sky, terrain, weather, lightning, battlefield debris, siege engines.
import * as THREE from "three";
import { V, clamp, lerp, smooth, rng, hash2, fbm, merge, M4, between } from "./util.js";
import { G, NOISE, FIRE_PARS, FIRE, fireLit, windy } from "./glsl.js";
import { groundH } from "./terrain.js";
import { EMBER_GLSL } from "./fire.js";
import { LIGHTNING, FIREBALLS } from "./timeline.js";

export function buildWorld(scene, renderer) {
  const W = {};
  // ---------------- environment map for reflections
  const c = document.createElement("canvas"); c.width = 512; c.height = 256; const g = c.getContext("2d");
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, "#0d121a"); gr.addColorStop(0.42, "#2c3747"); gr.addColorStop(0.5, "#56657a"); gr.addColorStop(0.56, "#1c2129"); gr.addColorStop(1, "#060606");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 256); g.fillStyle = "rgba(190,210,255,0.85)"; g.fillRect(200, 40, 140, 60);
  g.fillStyle = "rgba(255,120,40,0.25)"; g.fillRect(0, 128, 512, 6); // fire on the horizon
  const et = new THREE.CanvasTexture(c); et.mapping = THREE.EquirectangularReflectionMapping; et.colorSpace = THREE.SRGBColorSpace;
  scene.environment = new THREE.PMREMGenerator(renderer).fromEquirectangular(et).texture; scene.environmentIntensity = 0.35;

  // ---------------- sky
  const sky = new THREE.Mesh(new THREE.SphereGeometry(2000, 64, 32), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uTime: G.time, uFlash: G.flash, uBolt: { value: V(0, 0.3, -1) }, uFog: G.fogColor, uFireSky: { value: 0 } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position = p.xyww; }`,
    fragmentShader: NOISE + `varying vec3 vDir; uniform float uTime, uFlash, uFireSky; uniform vec3 uBolt, uFog;
      void main(){ vec3 d = normalize(vDir); float el = d.y; vec2 uv = d.xz / max(0.08, el + 0.12);
        float c = fbm3(vec3(uv*1.3 + vec2(uTime*0.05, uTime*0.11), uTime*0.06));
        float c2 = fbm3(vec3(uv*3.1 - vec2(uTime*0.09, 0.0), 3.0 + uTime*0.1));
        float cloud = smoothstep(0.32, 0.78, c*0.75 + c2*0.35);
        vec3 base = mix(vec3(0.075,0.095,0.125), vec3(0.012,0.016,0.024), smoothstep(-0.02, 0.45, el));
        vec3 col = base * (0.55 + 0.9*cloud);
        float near = pow(max(0.0, dot(d, normalize(uBolt))), 6.0);
        col += vec3(0.62,0.72,1.0) * uFlash * (0.12 + 1.1*near) * (0.3 + 1.1*cloud);
        // fire glow reflected on the cloud base, toward the battlefield (-z)
        float fz = (1.0 - smoothstep(-0.9, 0.1, d.z)) * (1.0 - smoothstep(0.02, 0.55, el));
        col += vec3(1.0, 0.3, 0.08) * uFireSky * fz * (0.2 + 0.8 * cloud) * 0.25;
        col = mix(col, uFog*(1.0+uFlash*2.0) + vec3(0.5,0.12,0.03)*uFireSky*0.12*fz, (1.0 - smoothstep(-0.01, 0.16, el)));
        gl_FragColor = vec4(col, 1.0); }`,
  }));
  sky.frustumCulled = false; sky.renderOrder = -10; scene.add(sky); W.sky = sky;

  // ---------------- terrain (wet mud, puddles, glowing scorch from the fire)
  {
    const N = 512, mk = (fn, srgb) => { const cv = document.createElement("canvas"); cv.width = cv.height = N; const cg = cv.getContext("2d"); const id = cg.createImageData(N, N);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const k = (y * N + x) * 4, v = fn(x, y); id.data[k] = v[0] * 255; id.data[k + 1] = v[1] * 255; id.data[k + 2] = v[2] * 255; id.data[k + 3] = 255; }
      cg.putImageData(id, 0, 0); const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(220, 220); t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
    const Hh = new Float32Array(N * N);
    const tile = (x, y, f, o) => { const a = (x / N) * Math.PI * 2, b = (y / N) * Math.PI * 2; return fbm(Math.cos(a) * f + 10, Math.sin(a) * f + Math.cos(b) * f + 20, o) * 0.5 + fbm(Math.sin(b) * f + 30, Math.cos(a + b) * f * 0.7 + 40, o) * 0.5; };
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) Hh[y * N + x] = tile(x, y, 2.2, 5) + tile(x, y, 9, 3) * 0.15;
    const pud = (k) => smooth(0.47, 0.43, Hh[k]);
    const map = mk((x, y) => { const k = y * N + x, t = 0.06 + 0.06 * Hh[k] + 0.03 * hash2(x, y), p = pud(k); return [lerp(t * 1.05, 0.03, p), lerp(t * 0.93, 0.035, p), lerp(t * 0.82, 0.045, p)]; }, true);
    const rough = mk((x, y) => { const k = y * N + x, r = lerp(0.8 - 0.15 * Hh[k], 0.12, pud(k)); return [r, r, r]; });
    const nor = mk((x, y) => { const hx = Hh[y * N + ((x + 1) % N)] - Hh[y * N + ((x + N - 1) % N)], hy = Hh[((y + 1) % N) * N + x] - Hh[((y + N - 1) % N) * N + x];
      const s = 7 * (1 - pud(y * N + x)), nx = -hx * s, ny = -hy * s, l = Math.hypot(nx, ny, 1); return [nx / l * 0.5 + 0.5, ny / l * 0.5 + 0.5, 1 / l * 0.5 + 0.5]; });
    const geo = new THREE.PlaneGeometry(1800, 1800, 320, 320); geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { let x = p.getX(i), z = p.getZ(i); const r = Math.hypot(x, z); if (r > 0) { const k = Math.pow(r / 900, 2.0) * 900 / r; x *= k; z *= k; } p.setXYZ(i, x, groundH(x, z), z); }
    geo.computeVertexNormals();
    const mat = fireLit(new THREE.MeshStandardMaterial({ map, roughnessMap: rough, normalMap: nor, roughness: 1, metalness: 0, normalScale: new THREE.Vector2(0.8, 0.8), envMapIntensity: 0.7 }),
      { extraEmissive: "emberGlow(vFireW)", extraPars: EMBER_GLSL, key: "ground" });
    // animated rain ripples in the puddles (normal perturbation)
    const prev = mat.onBeforeCompile; mat.onBeforeCompile = (sh, r) => { prev(sh, r);
      sh.fragmentShader = sh.fragmentShader.replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
        { vec2 q = vFireW.xz * 3.0; vec2 cell = floor(q); vec2 f = fract(q) - 0.5; float ph = fract(uTime * 1.3 + h13(vec3(cell, 1.0)));
          float rr = length(f); float ring = sin((rr - ph * 0.5) * 60.0) * exp(-ph * 4.0) * (1.0 - smoothstep(0.5 * ph, 0.5 * ph + 0.06, rr)) * (1.0 - roughnessFactor);
          normal = normalize(normal + vec3(f.x, f.y, 0.0) * ring * 0.8); }`); };
    const ground = new THREE.Mesh(geo, mat); ground.receiveShadow = true; scene.add(ground);
  }

  // ---------------- lights
  W.hemi = new THREE.HemisphereLight(0x3a4a62, 0x0b0906, 0.5); scene.add(W.hemi);
  W.moon = new THREE.DirectionalLight(0x7d93b3, 0.5); W.moon.position.set(-30, 40, -60); scene.add(W.moon);
  W.fill = new THREE.DirectionalLight(0x8899b8, 0.25); W.fill.position.set(40, 12, 30); scene.add(W.fill);
  W.bolt = new THREE.DirectionalLight(0xc9d8ff, 0); W.bolt.castShadow = true;
  W.bolt.shadow.mapSize.set(4096, 4096); Object.assign(W.bolt.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 140 });
  W.bolt.shadow.bias = -0.0003; W.bolt.shadow.normalBias = 0.015; scene.add(W.bolt, W.bolt.target);
  W.boltFar = new THREE.DirectionalLight(0xb9c9ff, 0); scene.add(W.boltFar, W.boltFar.target);
  // cold front key for the heroes' faces (moon through the storm, from the horde's side)
  W.heroKey = new THREE.DirectionalLight(0xa9bddb, 0); W.heroKey.position.set(-6, 9, -14); W.heroKey.target.position.set(0, 1.5, 0); scene.add(W.heroKey, W.heroKey.target);
  // fire key light with shadows: follows the dominant fire near the heroes
  W.fireKey = new THREE.SpotLight(0xff6a2a, 0, 60, 0.9, 0.6, 1.4); W.fireKey.castShadow = true; W.fireKey.shadow.mapSize.set(2048, 2048); W.fireKey.shadow.bias = -0.0005;
  scene.add(W.fireKey, W.fireKey.target);

  // ---------------- rain: three depth layers, tinted by firelight
  const rain = (count, box, alpha, seed) => {
    const r = rng(seed), gg = new THREE.BufferGeometry();
    const sd = new Float32Array(count * 6), tail = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) { const a = r(), b = r(), cc = r(); for (let k = 0; k < 2; k++) { sd.set([a, b, cc], (i * 2 + k) * 3); tail[i * 2 + k] = k; } }
    gg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 6), 3)); gg.setAttribute("seed", new THREE.BufferAttribute(sd, 3)); gg.setAttribute("tail", new THREE.BufferAttribute(tail, 1));
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: G.time, uFlash: G.flash, uCam: G.cam, uBox: { value: V(...box) }, uVel: { value: V(1.4, -13.5, 3.2) }, uA: { value: alpha }, uFirePosW: FIRE.posW, uFireCol: FIRE.col },
      vertexShader: FIRE_PARS + `attribute vec3 seed; attribute float tail; uniform float uTime; uniform vec3 uCam, uBox, uVel; varying float vA; varying float vT; varying vec3 vFire;
        void main(){ vec3 v = uVel * (0.85 + 0.3*fract(seed.x*71.3)); vec3 p = seed*uBox + v*uTime; vec3 base = uCam - uBox*0.5; p = base + mod(p - base, uBox);
          vFire = fireAtW(p); p -= v * 0.045 * tail; vec4 mv = modelViewMatrix * vec4(p,1.0); float d = -mv.z;
          vA = smoothstep(0.25, 1.4, d) * (1.0 - smoothstep(uBox.z*0.3, uBox.z*0.5, d)) * (0.5 + 0.5*fract(seed.y*53.1)); vT = tail; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float uFlash, uA; varying float vA; varying float vT; varying vec3 vFire;
        void main(){ gl_FragColor = vec4(vec3(0.62,0.7,0.82) * (0.55 + uFlash*1.4) + min(vFire, vec3(3.0)) * 0.06, vA * uA * (1.0 - 0.6*vT)); }` });
    const l = new THREE.LineSegments(gg, m); l.frustumCulled = false; scene.add(l);
  };
  rain(70000, [60, 30, 60], 0.24, 11); rain(6000, [9, 7, 9], 0.4, 12); rain(12000, [240, 60, 240], 0.08, 13);
  { // splashes
    const n = 9000, r = rng(77), gg = new THREE.BufferGeometry(), sd = new Float32Array(n * 4); for (let i = 0; i < n * 4; i++) sd[i] = r();
    gg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3)); gg.setAttribute("seed", new THREE.BufferAttribute(sd, 4));
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: G.time, uFlash: G.flash, uCam: G.cam, uH: { value: 2160 }, uFirePosW: FIRE.posW, uFireCol: FIRE.col },
      vertexShader: FIRE_PARS + `attribute vec4 seed; uniform float uTime, uH; uniform vec3 uCam; varying float vP; varying vec3 vFire;
        void main(){ float B = 36.0; vec2 base = uCam.xz - B*0.5; vec2 xz = base + mod(seed.xy*B - base, B); float ph = fract(uTime*(2.2+seed.z) + seed.w); vP = ph;
          vFire = fireAtW(vec3(xz.x, 0.1, xz.y)); vec4 mv = modelViewMatrix * vec4(xz.x, 0.02, xz.y, 1.0);
          gl_PointSize = (ph < 0.14 ? (2.0 + 40.0*ph) : 0.0) * uH / 1080.0 * 6.0 / max(1.0, -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float uFlash; varying float vP; varying vec3 vFire; void main(){ vec2 c = gl_PointCoord*2.0-1.0; float r = length(c);
        float ring = smoothstep(0.65,0.9,r)*(1.0 - smoothstep(0.9, 1.0,r)); gl_FragColor = vec4(vec3(0.6,0.68,0.8)*(0.6+uFlash*2.5) + min(vFire, vec3(3.0))*0.12, ring*(1.0-vP/0.14)*0.35); }` });
    W.splashes = m; const pts = new THREE.Points(gg, m); pts.frustumCulled = false; scene.add(pts);
  }
  { // low mist
    const cv = document.createElement("canvas"); cv.width = cv.height = 256; const cg = cv.getContext("2d"); const id = cg.createImageData(256, 256);
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) { const a = (x / 256) * Math.PI * 2, b = (y / 256) * Math.PI * 2;
      const v = fbm(Math.cos(a) * 1.5 + 5, Math.sin(a) * 1.5 + Math.cos(b) * 1.5, 5) * fbm(Math.sin(b) * 1.5 + 9, Math.cos(b) * 1.2 + 3, 4);
      const k = (y * 256 + x) * 4; id.data[k] = id.data[k + 1] = id.data[k + 2] = 255; id.data[k + 3] = 255 * smooth(0.12, 0.45, v); }
    cg.putImageData(id, 0, 0); const tex = new THREE.CanvasTexture(cv); tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    const mist = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: false, uniforms: { map: { value: tex }, uTime: G.time, uFlash: G.flash, uCam: G.cam, uFirePosW: FIRE.posW, uFireCol: FIRE.col },
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
      fragmentShader: FIRE_PARS + `uniform sampler2D map; uniform float uTime, uFlash; uniform vec3 uCam; varying vec3 vW;
        void main(){ float a = texture2D(map, vW.xz/90.0 + vec2(uTime*0.012, uTime*0.03)).a * texture2D(map, vW.xz/37.0 - vec2(uTime*0.02, -uTime*0.04)).a;
          float d = distance(vW, uCam); a *= smoothstep(4.0, 22.0, d) * (1.0 - smoothstep(380.0, 700.0, d));
          gl_FragColor = vec4(vec3(0.2,0.23,0.28)*(1.0+uFlash*0.8) + min(fireAtW(vW), vec3(3.0)) * 0.04, a*0.3); }` });
    for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600).rotateX(-Math.PI / 2), mist); m.position.y = 0.6 + i * 1.3; m.renderOrder = 2; scene.add(m); }
  }

  // ---------------- lightning: jagged branching bolts + glow sheath
  const boltCore = new THREE.MeshBasicMaterial({ color: new THREE.Color(4.2, 5.4, 9.0), fog: false, transparent: true });
  const boltGlow = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.35, 0.45, 0.9), fog: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const boltGeo = (top, bottom, r, depth, rad) => {
    let segs = [[top, bottom]], branches = [];
    for (let it = 0; it < 8; it++) { const next = []; const off = top.distanceTo(bottom) * 0.17 / Math.pow(1.72, it);
      for (const [a, b] of segs) { const m = a.clone().lerp(b, 0.5).add(V((r() - 0.5) * 2 * off, (r() - 0.5) * off * 0.4, (r() - 0.5) * 2 * off)); next.push([a, m], [m, b]);
        if (depth < 1 && it > 1 && it < 6 && r() < 0.16) { const dir = b.clone().sub(a); branches.push([m, m.clone().add(dir.multiplyScalar(2 + r() * 3)).add(V((r() - 0.5) * off * 6, -off * 2, (r() - 0.5) * off * 4))]); } }
      segs = next; }
    return { core: merge(segs.map(([a, b]) => ({ ...between(a, b, rad, rad, 5), c: 0xffffff }))), glow: merge(segs.map(([a, b]) => ({ ...between(a, b, rad * 7, rad * 7, 5), c: 0xffffff }))), branches };
  };
  LIGHTNING.forEach((e, i) => { const r = rng(900 + i), [x, z] = e.pos; const top = V(x + (r() - 0.5) * 80, 280, z + (z < 0 ? -40 : 40)), bot = V(x, groundH(x, z), z);
    const grp = new THREE.Group(); const b = boltGeo(top, bot, r, 0, 1.1); grp.add(new THREE.Mesh(b.core, boltCore), new THREE.Mesh(b.glow, boltGlow));
    b.branches.slice(0, 12).forEach((bb) => { const s = boltGeo(bb[0], bb[1], r, 1, 0.45); grp.add(new THREE.Mesh(s.core, boltCore), new THREE.Mesh(s.glow, boltGlow)); });
    grp.visible = false; scene.add(grp); e.mesh = grp; e.dir = V(x, 140, z).normalize(); });
  W.flashAt = (t) => { let total = 0, best = null, bestV = 0, on = 0;
    for (const e of LIGHTNING) { let v = 0; const dt = t - e.t;
      if (dt >= -0.01) { for (const s of e.strokes) { const d = dt - s; if (d >= 0) v += Math.exp(-d * 22) + 0.25 * Math.exp(-d * 4); } if (dt >= 0) v += 0.05 * Math.exp(-dt * 1.5); }
      v *= e.amp; total += v; if (v > bestV) { bestV = v; best = e; }
      e.mesh.visible = dt >= 0 && dt < e.strokes[e.strokes.length - 1] + 0.09;
      if (e.mesh.visible) for (const s of e.strokes) { const d = dt - s; if (d >= 0) on = Math.max(on, Math.exp(-d * 30)); } }
    boltCore.opacity = clamp(0.25 + on); boltGlow.opacity = clamp(0.1 + on) * 0.6;
    return { total, best }; };

  // ---------------- debris: broken spears, arrows, shields, torn banners, rocks
  {
    const r = rng(314), P = [], wood = 0x241a12, iron = 0x26272b;
    for (let i = 0; i < 70; i++) { const a = r() * 6.28, d = 3 + Math.pow(r(), 0.7) * 45, x = Math.cos(a) * d, z = Math.sin(a) * d + 4; if (Math.abs(x) < 2.5 && Math.abs(z) < 3) continue;
      const L = 0.8 + r() * 2.2, tilt = 0.3 + r() * 0.7, yaw = r() * 6.28, y = groundH(x, z);
      const top = V(x + Math.sin(yaw) * Math.sin(tilt) * L, y + Math.cos(tilt) * L, z + Math.cos(yaw) * Math.sin(tilt) * L);
      P.push({ ...between(V(x, y - 0.3, z), top, 0.025, 0.02, 5), c: wood }); if (r() < 0.5) P.push({ ...between(top, top.clone().add(top.clone().sub(V(x, y, z)).normalize().multiplyScalar(0.3)), 0.04, 0.0, 4), c: iron }); }
    for (let i = 0; i < 260; i++) { const a = r() * 6.28, d = 2 + Math.pow(r(), 0.6) * 35, x = Math.cos(a) * d, z = Math.sin(a) * d + 3; if (Math.abs(x) < 1.6 && Math.abs(z) < 1.6) continue;
      const y = groundH(x, z), tilt = 0.2 + r() * 0.5, yaw = r() * 6.28, top = V(x + Math.sin(yaw) * tilt * 0.7, y + 0.7, z + Math.cos(yaw) * tilt * 0.7);
      P.push({ ...between(V(x, y - 0.1, z), top, 0.007, 0.007, 4), c: wood }); P.push({ g: new THREE.BoxGeometry(0.003, 0.09, 0.05), m: M4([top.x, top.y - 0.05, top.z], [0, yaw, 0]), c: 0x6a6258 }); }
    for (let i = 0; i < 26; i++) { const a = r() * 6.28, d = 4 + r() * 30, x = Math.cos(a) * d, z = Math.sin(a) * d + 3, y = groundH(x, z);
      P.push({ g: new THREE.CylinderGeometry(0.4 + r() * 0.2, 0.4 + r() * 0.2, 0.05, 12), m: M4([x, y + 0.05 + r() * 0.2, z], [r() * 1.2 - 0.6 + (r() < 0.4 ? 1.3 : 0), r() * 6, r() * 0.8]), c: r() < 0.5 ? 0x2a1e14 : 0x2a2a2e }); }
    for (let i = 0; i < 90; i++) { const a = r() * 6.28, d = 3 + r() * 60, x = Math.cos(a) * d, z = Math.sin(a) * d, y = groundH(x, z), s = 0.1 + r() * 0.35; if (x < 1 && x > -7 && z > -2 && z < 6) continue;
      P.push({ g: new THREE.DodecahedronGeometry(1, 0), m: M4([x, y + s * 0.2, z], [r() * 3, r() * 3, r() * 3], [s, s * 0.6, s * 0.8]), c: 0x1b1a19 }); }
    const deb = new THREE.Mesh(merge(P), fireLit(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0.2 }), { key: "deb" }));
    deb.castShadow = deb.receiveShadow = true; scene.add(deb);
    // torn banners on broken poles near the heroes (wind)
    const flagMat = fireLit(windy(new THREE.MeshStandardMaterial({ color: 0x3a070b, roughness: 0.75, side: THREE.DoubleSide }), 0.4, "dflag"), { key: "dflag" });
    [[-7, 9], [8.5, 6], [-14, 20], [16, -4], [-3.5, 15]].forEach(([x, z], i) => { const y = groundH(x, z), h = 2.6 + (i % 3) * 0.6, tilt = (i % 2 ? 0.2 : -0.25);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, h, 6), fireLit(new THREE.MeshStandardMaterial({ color: 0x1d150f, roughness: 0.8 }))); pole.position.set(x, y + h / 2 - 0.2, z); pole.rotation.z = tilt; pole.castShadow = true; scene.add(pole);
      const fg = new THREE.PlaneGeometry(0.9, 1.4, 6, 10); const pp = fg.attributes.position, tip = new Float32Array(pp.count);
      for (let k = 0; k < pp.count; k++) { const xx = pp.getX(k) + 0.45; tip[k] = xx / 0.9; if (xx > 0.6 && hash2(k, i) < 0.4) pp.setY(k, pp.getY(k) - 0.3); }
      fg.translate(0.45, 0, 0); fg.rotateY(Math.PI / 2); fg.setAttribute("aTip", new THREE.BufferAttribute(tip, 1));
      const f = new THREE.Mesh(fg, flagMat); f.position.set(x - Math.sin(tilt) * h * 0.4, y + h - 0.9, z); scene.add(f); });
  }
  // ---------------- siege engines (trebuchets) behind the horde; arms swing on each launch
  W.trebs = [];
  { const wood = fireLit(new THREE.MeshStandardMaterial({ color: 0x1b140e, roughness: 0.85 }));
    const xs = [-67.5, -22.5, 22.5, 67.5, -120, 120];
    xs.forEach((x, i) => { const z = -300 - (i % 3) * 18, y = groundH(x, z), grp = new THREE.Group(); grp.position.set(x, y, z); scene.add(grp);
      [[-2.5, 0], [2.5, 0]].forEach(([dx]) => { const a = new THREE.Mesh(new THREE.BoxGeometry(0.6, 12, 0.6), wood); a.position.set(dx, 6, 0); a.rotation.z = dx * 0.04; grp.add(a); });
      const base = new THREE.Mesh(new THREE.BoxGeometry(8, 0.8, 10), wood); base.position.y = 0.4; grp.add(base);
      const armP = new THREE.Group(); armP.position.y = 11.5; grp.add(armP);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 22, 0.5), wood); arm.position.y = 5; armP.add(arm);
      const cw = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3), wood); cw.position.y = -5.5; armP.add(cw);
      W.trebs.push({ x, armP }); });
  }
  W.updateTrebs = (t) => { W.trebs.forEach((tr) => { let a = 0.9; for (const f of FIREBALLS) if (Math.abs(f.from[0] - tr.x) < 1) { const u = t - f.tL; a = u < 0 ? 0.9 : u < 0.5 ? lerp(0.9, -2.0, Math.sin(u / 0.5 * Math.PI / 2)) : lerp(-2.0, 0.9, smooth(1.5, 4, u)); } tr.armP.rotation.x = a; }); };
  return W;
}
