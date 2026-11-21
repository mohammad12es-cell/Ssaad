// NEO-EDEN: the city. Towers, street canyon, wet reflective pavement, holographic ads,
// flying traffic, rain and fog. Everything is procedural and deterministic.
import * as THREE from "three";
import { rng, GLSL_NOISE } from "./util.js";
import { makeAdTextures } from "./ads.js";

// ---------- shared fog (custom shaders + built-in materials use matching values) ----------
export const FOG = {
  uFogLow: { value: new THREE.Color(0x0a0d26) },   // city glow trapped in the mist (violet-blue)
  uFogHigh: { value: new THREE.Color(0x05060f) },  // high altitude: near black
  uFogDensity: { value: 0.0052 },
  uCloudBase: { value: 230 },
};
export const GLSL_FOG = /* glsl */ `
uniform vec3 uFogLow; uniform vec3 uFogHigh; uniform float uFogDensity; uniform float uCloudBase;
vec3 applyFog(vec3 col, vec3 wp, vec3 cam){
  float d = length(wp - cam);
  float f = 1.0 - exp(-d * uFogDensity);
  float mist = (1.0 - smoothstep(0.0, 7.0, wp.y)) * (1.0 - exp(-d * 0.02)) * 0.35;  // ground mist
  float cloud = smoothstep(uCloudBase, uCloudBase + 260.0, wp.y);                  // tops vanish into cloud
  f = clamp(max(f + mist * (1.0 - f), cloud * 0.97), 0.0, 1.0);
  vec3 fc = mix(uFogLow, uFogHigh, smoothstep(10.0, 420.0, wp.y));
  fc += vec3(0.05, 0.03, 0.11) * cloud * (1.0 - smoothstep(uCloudBase + 200.0, uCloudBase + 500.0, wp.y));
  return mix(col, fc, f);
}`;

const STREET_HALF = 9.5;

export function buildWorld(scene, fontsReady) {
  const R = rng(20250101);
  const world = { update: [], ads: [], reflectHide: [], vehicles: [] };
  scene.fog = new THREE.FogExp2(0x0d1030, 0.0105);
  scene.background = new THREE.Color(0x020309);

  // ---------- sky dome ----------
  const sky = new THREE.Mesh(new THREE.SphereGeometry(3500, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); gl_Position.z = gl_Position.w*0.99999; }`,
    fragmentShader: `${GLSL_NOISE} uniform float uTime; varying vec3 vD;
      void main(){
        float y = vD.y;
        vec3 top = vec3(0.004,0.006,0.018), hor = vec3(0.10,0.07,0.22);
        vec3 c = mix(hor, top, smoothstep(-0.02, 0.45, y));
        vec2 p = vD.xz / max(0.15, y + 0.25) * 2.0 + vec2(uTime*0.01, 0.);
        float cl = fbm(p*1.3) ; cl = smoothstep(0.35, 0.85, cl);
        c += vec3(0.09,0.05,0.18) * cl * (1.0 - smoothstep(0.0,0.6,y)) * 0.8;
        gl_FragColor = vec4(c, 1.); }`,
  }));
  sky.renderOrder = -10; scene.add(sky);
  world.update.push((t) => { sky.material.uniforms.uTime.value = t; });

  // ---------- towers (instanced, procedural windows) ----------
  const towerMat = new THREE.ShaderMaterial({
    uniforms: { ...FOG, uCam: { value: new THREE.Vector3() }, uWinBoost: { value: 0.8 }, uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      attribute float aSeed; attribute float aKind;
      varying vec3 vW; varying vec3 vN; varying vec3 vL; varying float vSeed; varying float vKind; varying vec3 vSize;
      void main(){
        vec3 s = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
        vec4 w = modelMatrix * instanceMatrix * vec4(position,1.0);
        vW = w.xyz; vN = normalize(mat3(instanceMatrix) * normal); vL = (position + vec3(0.5,0.,0.5)) * s; vSize = s;
        vSeed = aSeed; vKind = aKind;
        gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      ${GLSL_NOISE} ${GLSL_FOG}
      uniform vec3 uCam; uniform float uWinBoost; uniform float uTime;
      varying vec3 vW; varying vec3 vN; varying vec3 vL; varying float vSeed; varying float vKind; varying vec3 vSize;
      vec3 pal(float h){
        if (h < 0.55) return vec3(0.62,0.78,1.0);
        if (h < 0.77) return vec3(0.25,0.85,1.0);
        if (h < 0.95) return vec3(0.55,0.35,1.0);
        return vec3(1.0,0.18,0.25);
      }
      void main(){
        vec3 n = normalize(vN);
        float u = abs(n.x) > 0.5 ? vL.z : vL.x;
        float y = vL.y;
        float style = floor(h11(vSeed*3.7) * 4.0);
        float colW = mix(2.4, 3.6, h11(vSeed*1.3));
        float flH = 3.6;
        vec3 wall = vec3(0.010,0.012,0.022) + vec3(0.035,0.02,0.08) * exp(-vW.y/22.0);
        vec3 col = wall;
        if (n.y > 0.5) { col = vec3(0.012,0.012,0.02); }
        else {
          vec2 g = vec2(u/colW, y/flH);
          vec2 fw = fwidth(g);
          vec2 f = fract(g); vec2 cell = floor(g);
          float x0 = style == 1.0 ? 0.0 : 0.16, x1 = style == 1.0 ? 1.0 : 0.84;
          float wx = smoothstep(x0 - fw.x, x0 + fw.x, f.x) - smoothstep(x1 - fw.x, x1 + fw.x, f.x);
          if (style == 1.0) wx = 1.0;
          float wy = smoothstep(0.28 - fw.y, 0.28 + fw.y, f.y) - smoothstep(0.82 - fw.y, 0.82 + fw.y, f.y);
          float win = wx * wy;
          float thr = mix(0.38, 0.78, h11(vSeed*5.1));
          float lit = step(thr, h21(cell + vSeed*13.17));
          if (style == 1.0) lit = step(thr, h21(vec2(0.0, cell.y) + vSeed*13.17));
          vec3 wc = pal(h21(cell*1.73 + vSeed)) * (0.5 + 1.5*h21(cell*2.9 + vSeed*0.7));
          if (h11(vSeed*9.3) > 0.7) wc = pal(h11(vSeed*2.2)) * (0.6 + h21(cell*2.9)*1.2); // building-wide tint
          float far = smoothstep(0.25, 0.9, max(fw.x, fw.y));
          float avgLit = (1.0 - thr) * 0.4;
          vec3 glass = vec3(0.012,0.016,0.035);
          vec3 wcol = mix(glass, wc * 1.6 * uWinBoost, lit);
          vec3 near = mix(wall, wcol, win);
          vec3 farc = mix(wall, pal(h11(vSeed*2.2)) * 1.6 * uWinBoost, avgLit);
          col = mix(near, farc, far);
          if (style == 3.0) { // vertical LED stripes
            float st = smoothstep(0.9, 0.97, fract(u / 6.0));
            col += pal(h11(vSeed*7.7)) * st * 1.4 * (0.6 + 0.4*sin(y*0.1 - uTime*2.0 + vSeed*10.0));
          }
          // street-level storefronts on canyon buildings
          if (vKind > 0.5 && y < 5.0) {
            float sc = floor(u / 6.5); float sf = fract(u / 6.5);
            vec3 sh = pal(h21(vec2(sc, vSeed))) ;
            float frame = step(0.06, sf) * step(sf, 0.94);
            float glassZ = step(0.25, y) * step(y, 3.1) * frame;
            vec3 interior = sh * (0.25 + 0.35 * smoothstep(0.3, 3.0, y)) * (0.7 + 0.3*h21(vec2(sc,3.)));
            float band = step(3.35, y) * step(y, 4.35) * frame;
            col = mix(wall*0.6, interior, glassZ);
            col += sh * band * (1.2 + 1.4*h21(vec2(sc, vSeed+1.)));
          }
          // edge rim from the sky glow
          float edge = min(min(vL.x, vSize.x - vL.x), min(vL.z, vSize.z - vL.z));
          col += vec3(0.04,0.05,0.12) * (1.0 - smoothstep(0.0, 0.6, edge)) * 0.5;
        }
        col = applyFog(col, vW, uCam);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const box = new THREE.BoxGeometry(1, 1, 1); box.translate(0, 0.5, 0);
  const towers = [];
  // distant megacity grid
  for (let gx = -14; gx <= 14; gx++) for (let gz = -22; gz <= 8; gz++) {
    const cx = gx * 34 + (R() - 0.5) * 8, cz = gz * 34 + (R() - 0.5) * 8;
    if (Math.abs(cx) < 42 && cz > -330) continue; // keep the street canyon + camera path clear
    if (Math.hypot(cx, cz + 520) < 60) continue;   // spire plaza
    const dist = Math.hypot(cx, cz + 150);
    let h = 40 + Math.pow(R(), 2.2) * 260 + (dist < 260 ? R() * 120 : 0);
    if (R() < 0.05) h += 250;
    const w = 14 + R() * 14, d = 14 + R() * 14;
    towers.push([cx, cz, w, h, d, 0]);
    if (R() < 0.35 && h > 100) towers.push([cx, cz, w * 0.6, h + 40 + R() * 90, d * 0.6, 0]); // setback crown
  }
  // street canyon facades (two sides)
  for (const side of [-1, 1]) {
    let z = 90;
    while (z > -330) {
      const len = 9 + R() * 14, depth = 16 + R() * 8, h = 16 + Math.pow(R(), 1.5) * 62;
      const cx = side * (STREET_HALF + depth / 2), cz = z - len / 2;
      towers.push([cx, cz, depth, h, len - 0.4, 1]);
      if (R() < 0.6) towers.push([cx + side * 3, cz, depth - 6, h + 10 + R() * 40, len * 0.7, 0]);
      z -= len;
    }
  }
  const towerMesh = new THREE.InstancedMesh(box, towerMat, towers.length);
  const aSeed = new Float32Array(towers.length), aKind = new Float32Array(towers.length);
  const m4 = new THREE.Matrix4();
  towers.forEach(([x, z, w, h, d, k], i) => { m4.makeScale(w, h, d).setPosition(x, 0, z); towerMesh.setMatrixAt(i, m4); aSeed[i] = R() * 100; aKind[i] = k; });
  towerMesh.geometry = box.clone();
  towerMesh.geometry.setAttribute("aSeed", new THREE.InstancedBufferAttribute(aSeed, 1));
  towerMesh.geometry.setAttribute("aKind", new THREE.InstancedBufferAttribute(aKind, 1));
  towerMesh.frustumCulled = false;
  scene.add(towerMesh);
  world.towers = towers;
  world.update.push((t, cam) => { towerMat.uniforms.uCam.value.copy(cam.position); towerMat.uniforms.uTime.value = t; });

  // ---------- neon accent strips (HDR basic material -> bloom) ----------
  const neonCols = [new THREE.Color(0.2, 2.6, 3.2), new THREE.Color(1.6, 0.7, 3.4), new THREE.Color(0.5, 1.1, 3.4), new THREE.Color(3.4, 0.3, 0.6)];
  const strips = [];
  towers.forEach(([x, z, w, h, d, k]) => {
    if (k === 1) {
      // horizontal facade strips facing the street + vertical edge tubes
      const fx = Math.sign(x) * STREET_HALF + Math.sign(x) * -0.05;
      if (R() < 0.75) strips.push([fx, 4.6 + R() * 0.2, z, 0.12, 0.12, d * 0.96, R() < 0.85 ? (R() < 0.5 ? 0 : 1) : 3]);
      if (R() < 0.5) strips.push([fx, 8 + R() * h * 0.6, z, 0.1, 0.1, d * 0.9, Math.floor(R() * 3)]);
      if (R() < 0.6) strips.push([fx, h / 2, z + d / 2 - 0.2, 0.15, h, 0.15, Math.floor(R() * 3)]);
    } else if (h > 150 && R() < 0.5) {
      const c = Math.floor(R() * 3);
      for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) strips.push([x + ox * w / 2, h / 2, z + oz * d / 2, 0.6, h, 0.6, c]);
    } else if (R() < 0.25) strips.push([x, h + 0.3, z, w * 1.002, 0.6, d * 1.002, Math.floor(R() * 3)]);
  });
  const stripMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: true }), strips.length);
  strips.forEach(([x, y, z, sx, sy, sz, c], i) => { m4.makeScale(sx, sy, sz).setPosition(x, y, z); stripMesh.setMatrixAt(i, m4); stripMesh.setColorAt(i, neonCols[c]); });
  stripMesh.frustumCulled = false; scene.add(stripMesh);

  // rooftop beacons (red, blinking)
  const beacons = [];
  towers.forEach(([x, z, w, h, d]) => { if (h > 160) beacons.push([x, h + 2, z, R()]); });
  const beaconMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1.4, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: true }), beacons.length);
  beacons.forEach(([x, y, z], i) => { m4.makeTranslation(x, y, z); beaconMesh.setMatrixAt(i, m4); });
  beaconMesh.frustumCulled = false; scene.add(beaconMesh);
  const bc = new THREE.Color();
  world.update.push((t) => {
    beacons.forEach(([, , , p], i) => { const on = (Math.sin(t * 2.2 + p * 20) > 0.6) ? 6 : 0.25; beaconMesh.setColorAt(i, bc.setRGB(on, on * 0.06, on * 0.08)); });
    beaconMesh.instanceColor.needsUpdate = true;
  });

  // ---------- E.V.E. spire at the end of the avenue ----------
  const spire = new THREE.Group(); spire.position.set(0, 0, -560); scene.add(spire);
  const spireMat = towerMat.clone(); spireMat.uniforms = towerMat.uniforms;
  const sBody = new THREE.InstancedMesh(box, towerMat, 3);
  [[0, 0, 70, 760, 70], [0, 0, 46, 980, 46], [0, 0, 110, 180, 110]].forEach(([x, z, w, h, d], i) => { m4.makeScale(w, h, d).setPosition(x, 0, z); sBody.setMatrixAt(i, m4); });
  sBody.geometry = box.clone();
  sBody.geometry.setAttribute("aSeed", new THREE.InstancedBufferAttribute(new Float32Array([42.1, 17.3, 61.7]), 1));
  sBody.geometry.setAttribute("aKind", new THREE.InstancedBufferAttribute(new Float32Array([0, 0, 0]), 1));
  sBody.frustumCulled = false; spire.add(sBody);
  for (let i = 0; i < 6; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(62 - i * 2, 1.2, 8, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 2.2, 3.2), fog: true }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 220 + i * 95; spire.add(ring);
  }
  const eyeRing = new THREE.Mesh(new THREE.TorusGeometry(40, 3, 10, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 2.6, 3.6), fog: true }));
  eyeRing.position.set(0, 640, 36); spire.add(eyeRing);
  const eyeCore = new THREE.Mesh(new THREE.CircleGeometry(14, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 3.5, 4.0), fog: true }));
  eyeCore.position.set(0, 640, 36.5); spire.add(eyeCore);
  world.spireEye = [eyeRing, eyeCore];

  // ---------- holographic ads ----------
  const tex = makeAdTextures();
  world.adTex = tex;
  const adUniforms = { uTime: { value: 0 }, uGlitch: { value: 0 }, tNoSig: { value: tex.nosignal } };
  const adMat = (map, opts = {}) => new THREE.ShaderMaterial({
    uniforms: { ...FOG, ...adUniforms, map: { value: map }, uCam: towerMat.uniforms.uCam, uSeed: { value: R() * 10 }, uGain: { value: opts.gain ?? 1.6 }, uHolo: { value: opts.holo ? 1 : 0 } },
    transparent: !!opts.holo, depthWrite: !opts.holo, blending: opts.holo ? THREE.AdditiveBlending : THREE.NormalBlending, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */ `${GLSL_NOISE} ${GLSL_FOG}
      uniform sampler2D map; uniform sampler2D tNoSig; uniform float uTime, uGlitch, uSeed, uGain, uHolo; uniform vec3 uCam;
      varying vec2 vUv; varying vec3 vW;
      void main(){
        vec2 uv = vUv;
        float g = uGlitch * step(0.25, h11(floor(uTime*24.0) + uSeed));            // per-ad stutter
        float band = floor(uv.y * 18.0 + h11(floor(uTime*30.0)+uSeed)*7.0);
        uv.x += g * (h11(band + floor(uTime*30.0)) - 0.5) * 0.35;
        vec3 c;
        c.r = texture2D(map, uv + vec2(0.012*g, 0.)).r; c.g = texture2D(map, uv).g; c.b = texture2D(map, uv - vec2(0.012*g, 0.)).b;
        float a = texture2D(map, uv).a;
        float ns = step(0.55, h11(floor(uTime*12.0) + uSeed*3.1)) * step(0.4, uGlitch);
        vec4 nsC = texture2D(tNoSig, vUv);
        c = mix(c, nsC.rgb, ns); a = mix(a, nsC.a, ns);
        float black = step(0.8, h11(floor(uTime*20.0)+uSeed*7.)) * uGlitch;
        c *= 1.0 - black;
        float scan = 0.82 + 0.18 * sin(vUv.y * 900.0 - uTime * 30.0);
        float flick = 0.93 + 0.07 * sin(uTime * 37.0 + uSeed * 9.0);
        c *= uGain * scan * flick;
        if (uHolo > 0.5) { c *= 0.85 + 0.3 * vnoise(vec2(vUv.y*40.0 - uTime*6.0, uSeed)); }
        c = applyFog(c, vW, uCam);
        if (uHolo > 0.5) { float fade = 1.0 - smoothstep(30.0, 600.0, length(vW-uCam)); gl_FragColor = vec4(c * a * fade, 1.0); }
        else gl_FragColor = vec4(mix(vec3(0.01,0.012,0.02), c, a), 1.0);
      }`,
  });
  world.update.push((t) => { adUniforms.uTime.value = t; });
  world.adUniforms = adUniforms;
  const addAd = (map, w, h, pos, rotY, opts) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), adMat(map, opts));
    m.position.set(...pos); m.rotation.y = rotY; scene.add(m); world.ads.push(m); return m;
  };
  // big facade screens along the avenue
  addAd(tex.eve, 9, 15, [STREET_HALF - 0.1, 15, -34], -Math.PI / 2, { gain: 1.5 });
  addAd(tex.onecity, 8, 12, [-STREET_HALF + 0.1, 17, -62], Math.PI / 2, { gain: 1.5 });
  addAd(tex.link9, 10, 5.6, [STREET_HALF - 0.1, 9.5, -88], -Math.PI / 2, { gain: 1.4 });
  addAd(tex.serenity, 7, 11, [-STREET_HALF + 0.1, 12, -14], Math.PI / 2, { gain: 1.4 });
  addAd(tex.eve, 8, 13, [-STREET_HALF + 0.1, 20, -120], Math.PI / 2, { gain: 1.4 });
  addAd(tex.onecity, 8, 12, [STREET_HALF - 0.1, 22, -150], -Math.PI / 2, { gain: 1.4 });
  addAd(tex.serenity, 7, 11, [STREET_HALF - 0.1, 13, 6], -Math.PI / 2, { gain: 1.4 });
  addAd(tex.link9, 10, 5.6, [-STREET_HALF + 0.1, 9, 18], Math.PI / 2, { gain: 1.4 });
  // floating holograms over the street
  addAd(tex.link9, 9, 5, [0, 13, -78], 0, { holo: true, gain: 1.8 });
  addAd(tex.unity, 7, 7, [-3.5, 10.5, -40], 0.35, { holo: true, gain: 1.7 });
  // vertical blade signs, perpendicular to facades
  const blades = ["SYNC", "OPEN", "HOTEL", "LINK-9", "CLINIC", "EDEN", "RAMEN", "NEON", "BAR 77", "SLEEP"];
  for (let i = 0; i < 22; i++) {
    const side = i % 2 ? 1 : -1, z = 40 - i * 13 - R() * 6;
    addAd(tex.blade(blades[i % blades.length], i), 1.5, 7, [side * (STREET_HALF - 1.0), 7 + R() * 9, z], 0, { gain: 1.9 });
  }
  // giant tower screens for the aerial shot
  addAd(tex.eve, 50, 86, [-48, 150, -170], 0.45, { gain: 1.3 });
  addAd(tex.onecity, 44, 70, [70, 120, -90], -0.6, { gain: 1.3 });
  addAd(tex.serenity, 40, 64, [-80, 95, 20], 0.9, { gain: 1.3 });
  addAd(tex.link9, 70, 40, [45, 175, -260], -0.2, { gain: 1.3 });

  // ---------- flying vehicles ----------
  const vehBody = new THREE.CapsuleGeometry(0.9, 3.0, 4, 12); vehBody.rotateX(Math.PI / 2); vehBody.scale(1.1, 0.55, 1);
  const vehMat = new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.3, metalness: 0.8 });
  const head = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.5, 3.2, 3.6) });
  const tail = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.5, 0.25, 0.5) });
  const under = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 1.6, 2.6) });
  const trailMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uCol: { value: new THREE.Color(3.0, 0.3, 0.5) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform vec3 uCol; varying vec2 vUv; void main(){ float a = pow(vUv.y, 2.0) * (1.0 - abs(vUv.x-0.5)*2.0); gl_FragColor = vec4(uCol*a*0.6, 1.0); }`,
  });
  const makeVehicle = () => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(vehBody, vehMat));
    const hl = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.1), head); hl.position.set(0, 0.05, 2.45); g.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.14, 0.1), tail); tl.position.set(0, 0.1, -2.45); g.add(tl);
    const ul = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 3.2), under); ul.position.set(0, -0.48, 0); g.add(ul);
    const tr = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 14), trailMat); tr.rotation.x = -Math.PI / 2; tr.position.set(0, 0.1, -9.5); g.add(tr);
    scene.add(g); return g;
  };
  const lanes = [];
  for (let i = 0; i < 16; i++) { // cross-city lanes
    const alongX = i % 2 === 0, h = 35 + (i % 5) * 28 + R() * 10, off = -320 + R() * 380;
    lanes.push({ a: alongX ? new THREE.Vector3(-700, h, off) : new THREE.Vector3(off * 0.9 + 40 * Math.sign(off || 1), h, 300), dir: alongX ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, -1), len: 1000, speed: (22 + R() * 18) * (R() < 0.5 ? 1 : -1), n: 4 });
  }
  for (let i = 0; i < 4; i++) { // avenue lanes over the street
    lanes.push({ a: new THREE.Vector3(i % 2 ? 3.5 : -3.5, 22 + i * 7, 120), dir: new THREE.Vector3(0, 0, -1), len: 700, speed: (i % 2 ? 1 : -1) * (16 + i * 4), n: 5 });
  }
  for (const L of lanes) for (let k = 0; k < L.n; k++) {
    const v = makeVehicle(); world.vehicles.push({ v, L, off: (k / L.n) * L.len + R() * 30 });
  }
  const tmp = new THREE.Vector3();
  world.update.push((t) => {
    for (const { v, L, off } of world.vehicles) {
      let s = ((L.speed * t + off) % L.len + L.len) % L.len;
      v.position.copy(L.a).addScaledVector(L.dir, s);
      tmp.copy(v.position).addScaledVector(L.dir, Math.sign(L.speed));
      v.lookAt(tmp);
      v.position.y += Math.sin(t * 1.3 + off) * 0.4;
    }
  });
  // hero vehicles: scripted paths that pass close to the camera in the aerial descent
  world.hero = [makeVehicle(), makeVehicle(), makeVehicle()];

  // ---------- wet reflective ground ----------
  const reflRT = new THREE.WebGLRenderTarget(540, 960, { type: THREE.HalfFloatType });
  world.reflRT = reflRT;
  const groundU = {
    ...FOG, uCam: towerMat.uniforms.uCam, tRefl: { value: reflRT.texture }, uReflVP: { value: new THREE.Matrix4() }, uTime: { value: 0 },
    uScanPos: { value: new THREE.Vector3(0, -100, 0) }, uScanR: { value: 1.2 }, uScanCol: { value: new THREE.Color(0, 1, 1) }, uScanAmt: { value: 0 },
    uShadow: { value: Array.from({ length: 16 }, () => new THREE.Vector3(0, 0, -9999)) },
  };
  world.groundU = groundU;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000, 1, 1), new THREE.ShaderMaterial({
    uniforms: groundU,
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */ `${GLSL_NOISE} ${GLSL_FOG}
      uniform sampler2D tRefl; uniform mat4 uReflVP; uniform vec3 uCam; uniform float uTime;
      uniform vec3 uScanPos; uniform float uScanR; uniform vec3 uScanCol; uniform float uScanAmt; uniform vec3 uShadow[16];
      varying vec3 vW;
      vec2 ripple(vec2 p, float t){
        vec2 acc = vec2(0.);
        for (int k = 0; k < 2; k++) {
          vec2 q = p * (k == 0 ? 2.2 : 3.1) + float(k) * 7.3;
          vec2 id = floor(q), f = fract(q) - 0.5;
          float h = h21(id + float(k));
          vec2 c = (vec2(h21(id+3.1), h21(id+5.7)) - 0.5) * 0.5;
          float ph = fract(t * (0.9 + h) + h * 10.0);
          vec2 d = f - c; float r = length(d);
          float ring = exp(-pow((r - ph * 0.45) / 0.03, 2.0)) * (1.0 - ph);
          acc += normalize(d + 1e-4) * ring;
        }
        return acc;
      }
      void main(){
        vec2 p = vW.xz;
        float street = 1.0 - step(${STREET_HALF.toFixed(1)}, abs(p.x));
        float dcam = length(vW - uCam);
        vec2 tile = fract(p / vec2(1.2, 1.2)); float grout = (1.0 - smoothstep(0.0, 0.03, min(min(tile.x,1.-tile.x), min(tile.y,1.-tile.y)))) * street;
        float puddle = smoothstep(0.52, 0.62, fbm(p * 0.18 + 3.0));
        float rough = mix(0.012, 0.002, puddle);
        vec2 rp = ripple(p, uTime) * (1.0 - smoothstep(8.0, 30.0, dcam));
        vec4 clip = uReflVP * vec4(vW, 1.0);
        vec2 ruv = clip.xy / clip.w * 0.5 + 0.5;
        vec2 jit = (vec2(vnoise(p*3.0), vnoise(p*3.0+9.)) - 0.5) * 0.03 * (1.0 - puddle) + rp * 0.02;
        ruv += jit;
        vec3 refl = texture2D(tRefl, ruv).rgb * 0.5;
        refl += texture2D(tRefl, ruv + vec2(rough, rough*1.7)).rgb * 0.25;
        refl += texture2D(tRefl, ruv - vec2(rough*1.3, rough)).rgb * 0.25;
        vec3 V = normalize(uCam - vW);
        float fres = pow(1.0 - max(V.y, 0.0), 4.0);
        float refAmt = mix(mix(0.22, 0.55, street), 0.9, puddle);
        refAmt = mix(refAmt, 1.0, fres * 0.6) * (1.0 - grout * 0.7);
        vec3 base = vec3(0.008, 0.009, 0.015) * (0.7 + 0.6 * vnoise(p * 2.0));
        vec3 col = base + refl * refAmt;
        // embedded guide lights
        float lane = (1.0 - smoothstep(0.03, 0.06, abs(abs(p.x) - 6.4))) * step(0.5, fract(p.y / 3.0)) * street;
        col += vec3(0.1, 1.2, 1.6) * lane * 0.9;
        // contact shadows under walkers
        float sh = 0.0;
        for (int i = 0; i < 16; i++) { vec3 s = uShadow[i]; sh = max(sh, exp(-pow(length(p - s.xz) / (0.42 * s.y), 2.0))); }
        col *= 1.0 - sh * 0.75;
        // drone scan disc
        float dd = length(p - uScanPos.xz);
        float disc = 1.0 - smoothstep(uScanR * 0.97, uScanR, dd);
        float rings = 0.5 + 0.5 * sin(dd * 18.0 - uTime * 12.0);
        float rim = exp(-pow((dd - uScanR) / 0.05, 2.0));
        col += uScanCol * uScanAmt * (disc * (0.12 + 0.18 * rings) + rim * 1.4);
        col = applyFog(col, vW, uCam);
        gl_FragColor = vec4(col, 1.0);
      }`,
  }));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);
  world.ground = ground; world.reflectHide.push(ground);
  world.update.push((t) => { groundU.uTime.value = t; });

  // ---------- street furniture: lamps, cables, bollards, pipes ----------
  const metal = new THREE.MeshStandardMaterial({ color: 0x15171f, roughness: 0.35, metalness: 0.85 });
  const lampLight = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 2.8, 3.4) });
  for (let z = 70; z > -260; z -= 17) for (const s of [-1, 1]) {
    const g = new THREE.Group(); g.position.set(s * 8.2, 0, z + (s > 0 ? 8 : 0)); scene.add(g);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 6.5, 8), metal); pole.position.y = 3.25; g.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.1), metal); arm.position.set(-s * 0.75, 6.4, 0); g.add(arm);
    const lh = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.22), lampLight); lh.position.set(-s * 1.25, 6.33, 0); g.add(lh);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 6, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 2.4, 3) })); ring.position.y = 1.2; ring.rotation.x = Math.PI / 2; g.add(ring);
  }
  // overhead cables
  const cableMat = new THREE.LineBasicMaterial({ color: 0x0a0b10 });
  for (let i = 0; i < 26; i++) {
    const z = 60 - i * 12 - R() * 6, y0 = 9 + R() * 14, sag = 1 + R() * 2.5;
    const pts = []; for (let k = 0; k <= 20; k++) { const u = k / 20; pts.push(new THREE.Vector3(-STREET_HALF + u * 2 * STREET_HALF, y0 - sag * 4 * u * (1 - u), z + (R() - 0.5) * 0.2)); }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), cableMat));
  }
  // light strands between buildings (tiny cyan/violet bulbs)
  for (let i = 0; i < 8; i++) {
    const z = 30 - i * 31, y0 = 11 + R() * 6, pts = [];
    for (let k = 0; k <= 30; k++) { const u = k / 30; pts.push(new THREE.Vector3(-STREET_HALF + u * 2 * STREET_HALF, y0 - 2 * 4 * u * (1 - u), z)); }
    const bulbs = new THREE.Points(new THREE.BufferGeometry().setFromPoints(pts), new THREE.PointsMaterial({ color: i % 2 ? new THREE.Color(1.6, 0.8, 3) : new THREE.Color(0.4, 2.6, 3), size: 0.12, sizeAttenuation: true }));
    scene.add(bulbs);
  }
  // facade detail: AC units / ledges / vents
  const detail = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x0d0f16, roughness: 0.6, metalness: 0.5 }), 260);
  for (let i = 0; i < 260; i++) {
    const s = i % 2 ? 1 : -1; const big = R() < 0.3;
    m4.makeScale(big ? 0.4 : 0.7, big ? 0.25 : 0.55, big ? 14 * R() + 2 : 0.9).setPosition(s * (STREET_HALF - 0.3), 5.5 + R() * 30, 70 - R() * 330);
    detail.setMatrixAt(i, m4);
  }
  scene.add(detail);

  // ---------- fog cards (layered mist for depth) ----------
  const fogMat = (seed, strength) => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uCamP: { value: new THREE.Vector3() }, uTime: { value: 0 }, uSeed: { value: seed }, uStr: { value: strength }, uCol: { value: new THREE.Color(0.11, 0.09, 0.26) } },
    vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `${GLSL_NOISE} uniform float uTime,uSeed,uStr; uniform vec3 uCol; varying vec2 vUv; varying vec3 vW;
      uniform vec3 uCamP;
      void main(){ float n = fbm(vUv*vec2(3.,1.5) + vec2(uTime*0.03 + uSeed, uSeed*0.3));
        float near = smoothstep(6.0, 22.0, length(vW - uCamP));
        float edge = smoothstep(0.,0.25,vUv.y)*smoothstep(1.,0.6,vUv.y)*smoothstep(0.,0.2,vUv.x)*smoothstep(1.,0.8,vUv.x);
        gl_FragColor = vec4(uCol * n * n * edge * uStr * near, 1.); }`,
  });
  const fogCards = [];
  for (let i = 0; i < 12; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(26, 10), fogMat(R() * 10, 1.0));
    m.position.set((R() - 0.5) * 4, 2.5 + R() * 4, 30 - i * 22); scene.add(m); fogCards.push(m);
  }
  for (let i = 0; i < 26; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(400, 90), fogMat(R() * 10, 1.4));
    m.position.set((R() - 0.5) * 500, 60 + R() * 160, -40 - R() * 500); m.rotation.y = (R() - 0.5) * 0.6; scene.add(m); fogCards.push(m);
  }
  world.fogCards = fogCards;
  world.update.push((t, cam) => { for (const m of fogCards) { m.material.uniforms.uTime.value = t; m.material.uniforms.uCamP.value.copy(cam.position); m.quaternion.copy(cam.quaternion); } });

  // ---------- rain ----------
  const RAIN_N = 9000;
  const rg = new THREE.InstancedBufferGeometry();
  rg.setAttribute("position", new THREE.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0], 3));
  rg.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  rg.setIndex([0, 1, 2, 0, 2, 3]);
  const off = new Float32Array(RAIN_N * 4);
  for (let i = 0; i < RAIN_N; i++) { off[i * 4] = R(); off[i * 4 + 1] = R(); off[i * 4 + 2] = R(); off[i * 4 + 3] = R(); }
  rg.setAttribute("aOff", new THREE.InstancedBufferAttribute(off, 4));
  rg.instanceCount = RAIN_N;
  const rainU = { uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uBox: { value: new THREE.Vector3(36, 26, 36) }, uAmt: { value: 1 }, uLen: { value: 0.55 } };
  const rain = new THREE.Mesh(rg, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: rainU,
    vertexShader: /* glsl */ `attribute vec4 aOff; uniform float uTime; uniform vec3 uCam; uniform vec3 uBox; uniform float uLen; varying float vA; varying vec2 vUv;
      void main(){
        float sp = 9.0 + aOff.w * 4.0;
        vec3 base = aOff.xyz * uBox;
        base.y -= uTime * sp; base.x += uTime * 1.2;
        vec3 rel = mod(base - uCam, uBox) - uBox * 0.5;
        vec3 wp = uCam + rel;
        vec3 toCam = normalize(uCam - wp);
        vec3 right = normalize(cross(vec3(0.,1.,0.), toCam));
        vec3 dir = normalize(vec3(0.12, -1.0, 0.0));
        float len = uLen * (0.7 + aOff.w * 0.6);
        wp += right * position.x * 0.018 + -dir * position.y * len;
        float d = length(rel);
        vA = smoothstep(0.4, 2.5, d) * (1.0 - smoothstep(10.0, 18.0, d));
        vUv = uv;
        gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
      }`,
    fragmentShader: `uniform float uAmt; varying float vA; varying vec2 vUv;
      void main(){ float a = vA * (1.0 - abs(vUv.x - 0.5) * 2.0) * sin(vUv.y * 3.14159); gl_FragColor = vec4(vec3(0.55,0.7,1.0) * a * 0.55 * uAmt, 1.0); }`,
  }));
  rain.frustumCulled = false; rain.renderOrder = 5; scene.add(rain);
  world.rain = rain; world.rainU = rainU; world.reflectHide.push(rain);
  world.update.push((t, cam) => { rainU.uTime.value = t; rainU.uCam.value.copy(cam.position); });

  // ---------- lighting ----------
  scene.add(new THREE.HemisphereLight(0x3a3d8a, 0x0a0614, 0.55));
  const moon = new THREE.DirectionalLight(0x6d7cff, 0.7); moon.position.set(-30, 80, -60); scene.add(moon);
  world.lights = {};
  const mk = (name, col, I, dist) => { const l = new THREE.PointLight(col, I, dist, 1.6); scene.add(l); world.lights[name] = l; return l; };
  mk("cyan", 0x22e6ff, 40, 16);
  mk("violet", 0x6a5cff, 30, 16);
  mk("top", 0x9fc8ff, 18, 14);
  mk("fill", 0x3050ff, 10, 12);

  world.tick = (t, cam) => { for (const f of world.update) f(t, cam); };
  return world;
}

// Mirror camera for the planar ground reflection
const _reflCam = new THREE.PerspectiveCamera();
export function renderReflection(renderer, scene, cam, world) {
  _reflCam.copy(cam);
  _reflCam.position.set(cam.position.x, -cam.position.y, cam.position.z);
  const dir = new THREE.Vector3(); cam.getWorldDirection(dir); dir.y = -dir.y;
  _reflCam.up.set(0, -1, 0);
  _reflCam.lookAt(_reflCam.position.clone().add(dir));
  _reflCam.updateMatrixWorld(); _reflCam.updateProjectionMatrix();
  world.groundU.uReflVP.value.multiplyMatrices(_reflCam.projectionMatrix, _reflCam.matrixWorldInverse);
  for (const o of world.reflectHide) o.visible = false;
  const prev = renderer.getRenderTarget();
  renderer.setRenderTarget(world.reflRT); renderer.clear(); renderer.render(scene, _reflCam);
  renderer.setRenderTarget(prev);
  for (const o of world.reflectHide) o.visible = true;
}
