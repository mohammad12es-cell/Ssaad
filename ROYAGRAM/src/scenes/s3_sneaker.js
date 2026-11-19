// SCENE 03 — SNEAKER: emerges from a portal; desert becomes monumental architecture
import * as THREE from 'three';
import { track, easeInOut, easeOut, easeIn, easeInOutQuint, sstep, range, dust, backdrop, setCam, orbitPos, canvasTex, makeNoise2, rng, radialDisc, GLSL_NOISE, lerp } from '../lib.js';
import { buildSneaker } from './sneaker.js';

export function build(ctx) {
  const scene = new THREE.Scene();
  scene.environment = ctx.envProduct;
  const fogCol = new THREE.Color(0.11, 0.055, 0.02);
  scene.fog = new THREE.FogExp2(fogCol, 0.009);
  const sky = backdrop([0.01, 0.012, 0.03], [0.3, 0.12, 0.035], [0.05, 0.025, 0.01], [0, 0.02], [0.6, 0.25, 0.05]);
  scene.add(sky);
  const camera = new THREE.PerspectiveCamera(34, ctx.W / ctx.H, 0.05, 400);

  // dunes
  const n2 = makeNoise2(17);
  const dg = new THREE.PlaneGeometry(320, 320, 320, 320).rotateX(-Math.PI / 2);
  const P = dg.attributes.position;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), z = P.getZ(i);
    let h = 0, a = 1, f = 0.012;
    for (let o = 0; o < 5; o++) { h += a * (1 - Math.abs(n2(x * f + 10, z * f * 1.6 - 5))); a *= 0.5; f *= 2.1; }
    h = h * 4.2 - 2.4;
    const r = Math.hypot(x, z + 4);
    h *= sstep(7, 26, r);
    P.setY(i, h + 0.04 * n2(x * 2.3, z * 2.3));
  }
  dg.computeVertexNormals();
  const sandTex = canvasTex(512, 512, (g, w, h) => { const R = rng(3); g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); for (let i = 0; i < 26000; i++) { const v = 100 + R() * 110; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(R() * w, R() * h, 1.5, 1.5); } }, false);
  sandTex.wrapS = sandTex.wrapT = THREE.RepeatWrapping; sandTex.repeat.set(120, 120);
  const sandMat = new THREE.MeshStandardMaterial({ color: 0xb07a45, roughness: 0.95, bumpMap: sandTex, bumpScale: 0.6, envMapIntensity: 0.25 });
  const sand = new THREE.Mesh(dg, sandMat); scene.add(sand);

  // portal
  const portal = new THREE.Group(); portal.position.set(0, 2.5, -2.6); scene.add(portal);
  const goldM = new THREE.MeshPhysicalMaterial({ color: 0xe6b964, metalness: 1, roughness: 0.18, envMapIntensity: 1.8, clearcoat: 1 });
  portal.add(new THREE.Mesh(new THREE.TorusGeometry(2.35, 0.1, 32, 220), goldM));
  const innerRing = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.018, 12, 220), new THREE.MeshBasicMaterial({ color: new THREE.Color(8, 5, 2) })); portal.add(innerRing);
  const PU = { uTime: { value: 0 }, uI: { value: 0.5 } };
  const disc = new THREE.Mesh(new THREE.CircleGeometry(2.22, 128), new THREE.ShaderMaterial({
    uniforms: PU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform float uTime, uI; varying vec2 vUv; ${GLSL_NOISE}
      void main(){ vec2 p = vUv*2.0-1.0; float r = length(p); float a = atan(p.y,p.x);
        float sw = snoise(vec3(cos(a+r*3.0-uTime*0.8)*2.0, sin(a+r*3.0-uTime*0.8)*2.0, r*3.0 - uTime*0.6));
        float rings = 0.5+0.5*sin(r*28.0 - uTime*6.0 + sw*3.0);
        float edge = smoothstep(1.0, 0.82, r);
        float core = exp(-r*r*5.0);
        vec3 c = vec3(1.6,0.95,0.38)*(0.04+0.7*pow(rings,3.0)*(0.5+0.5*sw))*edge + vec3(3.0,2.4,1.6)*core*0.25 + vec3(2.0,1.2,0.5)*pow(smoothstep(0.75,1.0,r)*edge,2.0)*2.0;
        gl_FragColor = vec4(c*uI*edge, 1.0); }`,
  }));
  portal.add(disc);
  const pLight = new THREE.PointLight(0xffb15a, 10, 14, 1.6); pLight.position.set(0, 2.5, -2.0); scene.add(pLight);

  // monumental architecture
  const arch = new THREE.Group(); scene.add(arch);
  const slabMat = new THREE.MeshPhysicalMaterial({ color: 0x060607, metalness: 0.7, roughness: 0.16, clearcoat: 1, envMapIntensity: 1.2 });
  const lineMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(5.0, 3.0, 1.1) });
  const slabs = []; const r = rng(31);
  for (let side of [-1, 1]) for (let i = 0; i < 11; i++) {
    const h = 9 + r() * 16 + i * 0.8, w = 1.3 + r() * 1.6, d = 1.4 + r() * 1.2;
    const grp = new THREE.Group();
    const slab = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), slabMat); slab.position.y = h / 2; grp.add(slab);
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.06, h * 0.92, 0.06), lineMat); line.position.set(-side * (w / 2 + 0.01), h * 0.5, d / 2 + 0.01); grp.add(line);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(w * 1.02, 0.08, d * 1.02), lineMat); cap.position.y = h * (0.55 + r() * 0.3); grp.add(cap);
    grp.position.set(side * (8.4 + i * 0.55 + r() * 0.6), 0, -5 - i * 5.2);
    grp.rotation.y = side * 0.08;
    arch.add(grp); slabs.push({ grp, h, delay: i * 0.07 + (side > 0 ? 0.04 : 0) });
  }
  const megaRing = new THREE.Mesh(new THREE.TorusGeometry(16, 0.35, 24, 200), goldM); megaRing.position.set(0, 0, -62); arch.add(megaRing);
  const megaLine = new THREE.Mesh(new THREE.TorusGeometry(15.4, 0.06, 8, 200), lineMat); megaRing.add(megaLine);

  // sneaker
  const shoe = buildSneaker(ctx.envProduct);
  const shoeRig = new THREE.Group(); shoeRig.add(shoe); scene.add(shoeRig);
  const shadow = radialDisc(1.5, 0x000000, 0.0); shadow.scale.set(1.3, 0.6, 1); scene.add(shadow);
  const shoeKey = new THREE.SpotLight(0xffffff, 28, 18, 0.55, 0.7, 1.4); shoeKey.position.set(3, 6, 5); shoeKey.target = shoeRig; scene.add(shoeKey);
  const sun = new THREE.DirectionalLight(0xffa860, 2.2); sun.position.set(-2, 3, -20); scene.add(sun);
  const hemi = new THREE.HemisphereLight(0x6a4a30, 0x1a0e06, 0.6); scene.add(hemi);
  const sandDust = dust(1600, [30, 6, 40], { seed: 41, size: 6, color: [1.0, 0.7, 0.4], opacity: 0.45, y: 2, drift: [0.5, 0.05, 0] }); scene.add(sandDust);

  const skyU = sky.material.uniforms;
  const midA = new THREE.Color(0.3, 0.12, 0.035), midB = new THREE.Color(0.05, 0.03, 0.015);
  const glowA = new THREE.Color(0.6, 0.25, 0.05), glowB = new THREE.Color(0.25, 0.12, 0.03);
  const sandA = new THREE.Color(0xb07a45), sandB = new THREE.Color(0x3a2616);
  const fogB = new THREE.Color(0.025, 0.014, 0.008);

  function update(lt, opt = {}) {
    PU.uTime.value = lt; sandDust.material.uniforms.uTime.value = lt;
    // world transformation: dusk desert -> night architecture
    const night = sstep(2.6, 5.2, lt);
    skyU.mid.value.copy(midA).lerp(midB, night); skyU.glow.value.copy(glowA).lerp(glowB, night);
    sandMat.color.copy(sandA).lerp(sandB, night);
    scene.fog.color.copy(fogCol).lerp(fogB, night);
    for (const s of slabs) { const k = easeInOutQuint(range(lt, 2.8 + s.delay, 4.6 + s.delay)); s.grp.position.y = -s.h * (1 - k) - 0.3; s.grp.visible = k > 0.001; }
    megaRing.position.y = lerp(-17, 2, easeInOut(range(lt, 3.3, 5.6)));
    lineMat.color.setRGB(5.0, 3.0, 1.1).multiplyScalar(0.4 + 0.6 * night);
    const close = 1 - easeInOut(range(lt, 2.4, 3.1));
    portal.scale.setScalar(Math.max(1e-3, close)); portal.visible = close > 0.002; pLight.intensity = 10 * close;
    PU.uI.value = lerp(0.5, 0.28, sstep(3.0, 5.0, lt)) * (lt < 0.7 ? lerp(0.75, 1.0, lt / 0.7) : 1);

    // shoe choreography
    const zEm = track(lt, [[0.6, -3.6], [2.4, 0.4, easeOut]]);
    const dart = easeIn(range(lt, 7.0, 7.7));
    const hover = 1.25 + 0.05 * Math.sin(lt * 1.6);
    shoeRig.position.set(dart * 9, hover + dart * 0.3, zEm);
    shoeRig.rotation.set(0.08 * Math.sin(lt * 0.9), track(lt, [[0.6, -1.35], [2.4, -0.55, easeOut], [5.0, 0.35], [7.0, 0.55], [7.7, 0.1]]), 0.05 * Math.sin(lt * 1.2) - dart * 0.25);
    shoe.visible = lt > 0.85;
    shadow.position.set(shoeRig.position.x, 0.02, zEm); shadow.material.opacity = 0.55 * sstep(1.2, 2.4, lt) * (1 - dart);

    if (opt.variant === 1) { const a = -0.5 + lt * 0.05; setCam(camera, orbitPos([0, 1.4, 0.4], 9.5, a, 0.04), [0, 3.2, -6]); return; }
    if (opt.variant === 2) { const a = 1.45 + (lt - 4.9) * 0.25; setCam(camera, orbitPos([shoeRig.position.x, 1.4, zEm], 4.4, a, 0.12), [shoeRig.position.x, 1.35, zEm]); return; }
    // camera: through portal -> pull back -> orbit with speed ramp -> low hero
    const tgt = track(lt, [[0, [0, 2.5, -2.6]], [0.7, [0, 2.4, -2.6]], [2.4, [0, 1.6, 0.0]], [5.0, [0, 1.45, 0.4]], [7.0, [0, 1.6, 0.4]], [7.7, [1.5, 1.6, 0.4]]]);
    // speed ramp: slow -> fast -> slow orbit
    const ramp = (x) => { const k = range(x, 2.4, 5.0); return k < 0.5 ? 0.5 * Math.pow(2 * k, 3.2) : 1 - 0.5 * Math.pow(2 - 2 * k, 3.2); };
    let pos;
    if (lt < 2.4) pos = track(lt, [[0, [0, 2.45, 3.6]], [0.7, [0, 2.3, 5.4], easeOut], [2.4, [1.2, 1.9, 7.2], easeInOut]]);
    else if (lt < 5.0) { const a = lerp(0.17, Math.PI * 2 - 0.55, ramp(lt)); pos = orbitPos([0, 1.4, 0.4], lerp(7.0, 5.2, range(lt, 2.4, 5.0)), a, lerp(0.07, 0.1, Math.sin(a) * 0.5 + 0.5)); }
    else pos = track(lt, [[5.0, orbitPos([0, 1.4, 0.4], 5.2, Math.PI * 2 - 0.55, 0.1)], [5.9, [-3.3, 0.4, 6.3], easeInOut], [7.7, [-2.6, 0.35, 5.8]]]);
    setCam(camera, pos, tgt, lt > 5.0 ? -0.04 : 0);
  }
  return { scene, camera, update };
}
