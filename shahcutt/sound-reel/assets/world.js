// «بی‌صدا یا باصدا؟»: the chrome objects (Three.js). Everything is a pure function of film time t:
// no clocks, no randomness; the HyperFrames root timeline drives frame(t) through a proxy tween.
import * as THREE from "three";

const T = window.__T, W = 1080, H = 1920;
const cl = (x) => Math.max(0, Math.min(1, x));
const pr = (t, t0, d) => cl((t - t0) / d);
const eo = (k) => 1 - Math.pow(1 - k, 3);
const eio = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const ei = (k) => k * k * k;
const eback = (k) => { const a = 2.2, b = a + 1; return k <= 0 ? 0 : 1 + b * Math.pow(k - 1, 3) + a * Math.pow(k - 1, 2); };
const spring = (k, z = 0.3, w = 15) => { if (k <= 0) return 0; const wd = w * Math.sqrt(1 - z * z); return 1 - Math.exp(-z * w * k) * (Math.cos(wd * k) + (z * w / wd) * Math.sin(wd * k)); };
const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const TAU = Math.PI * 2;

// ---------------------------------------------------------------- renderer + camera (1 world unit = K px)
const canvas = document.getElementById("gl");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.setClearColor(0x000000, 0);
renderer.toneMapping = THREE.NeutralToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, W / H, 0.1, 100); camera.position.set(0, 0, 12);
const K = H / (2 * 12 * Math.tan(THREE.MathUtils.degToRad(17.5)));
const P = (x, y) => [(x - W / 2) / K, -(y - H / 2) / K];

// ---------------------------------------------------------------- studio environments for the chrome
const pmrem = new THREE.PMREMGenerator(renderer);
function studio(wall, strips) {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.SphereGeometry(30, 32, 16), new THREE.MeshBasicMaterial({ color: wall, side: THREE.BackSide })));
  strips.forEach(([c, x, y, z, w, h, ry, k]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); m.rotateZ(ry); s.add(m);
  });
  const env = pmrem.fromScene(s, 0.03).texture; return env;
}
const ENV = {
  lime: studio(0x111111, [[0xffffff, -8, 6, 6, 5, 18, 0.3, 5], [0xffffff, 9, 2, 4, 2.5, 16, -0.2, 4], [0xcaff23, 0, -9, 5, 26, 5, 0, 1.6], [0xcaff23, -9, -1, -6, 4, 14, 0.5, 1.2], [0xffffff, 3, 9, -6, 10, 2, 0, 3]]),
  dark: studio(0x070707, [[0xffffff, -8, 6, 6, 4, 18, 0.3, 5], [0xffffff, 9, 2, 4, 2, 16, -0.2, 4], [0xcaff23, 0, -9, 5, 20, 3, 0, 2], [0x404040, 6, 9, -6, 8, 8, 0, 1]]),
  light: studio(0xecebe5, [[0xffffff, -8, 6, 6, 6, 18, 0.3, 3], [0x0b0b0b, 9, 2, 4, 3, 16, -0.2, 1], [0x0b0b0b, 0, -9, 4, 30, 5, 0, 1], [0xff4f1a, -6, -2, -8, 3, 12, 0.4, 1.5]]),
};
ENV.grey = ENV.light; ENV.black = ENV.dark;

const chrome = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.05 });
const limeChrome = new THREE.MeshPhysicalMaterial({ color: 0xe4ff7a, metalness: 1, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.08 });

const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.85, 0.28, 360, 56, 2, 3), chrome); scene.add(knot);
const starShape = new THREE.Shape();
for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.5 : 1.05, a = Math.PI / 2 + (i * Math.PI) / 5; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? starShape.lineTo(x, y) : starShape.moveTo(x, y); }
starShape.closePath();
const starGeo = new THREE.ExtrudeGeometry(starShape, { depth: 0.32, bevelEnabled: true, bevelThickness: 0.2, bevelSize: 0.16, bevelSegments: 8, curveSegments: 4 });
starGeo.center();
const star = new THREE.Mesh(starGeo, limeChrome); scene.add(star);
const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.3, 64, 160), chrome); scene.add(ring);
const shardGeo = new THREE.IcosahedronGeometry(0.13, 2);
const shards = Array.from({ length: 26 }, (_, i) => { const m = new THREE.Mesh(shardGeo, i % 3 ? chrome : limeChrome); scene.add(m); return m; });

const S = {}; T.scenes.forEach((s) => (S[s.id] = s));
const sceneAt = (t) => T.scenes.find((s) => t >= s.start && t < s.end) || T.scenes[T.scenes.length - 1];

// ---------------------------------------------------------------- the demo clip, local time u
const KNOT_AT = P(360, 1190), STAR_AT = P(800, 1070);
function clipPose(u, withStar = true) {
  // knot: whoosh in from the right, land at 0.5, spin at 2.5, centre + grow at 3.0, hit pulse at 3.5
  const kin = eback(pr(u, 0, 0.5));
  let x = 6.5 + (KNOT_AT[0] - 6.5) * kin, y = KNOT_AT[1] + Math.sin(u * 2.2) * 0.06;
  const land = u >= 0.5 ? 1 + 0.14 * Math.exp(-(u - 0.5) * 9) * Math.cos((u - 0.5) * 30) : 1;
  let ry = (1 - eo(pr(u, 0, 0.5))) * 7 + u * 0.7 + eio(pr(u, 2.5, 0.5)) * TAU, rx = 0.45 + Math.sin(u * 1.3) * 0.12;
  const go = eio(pr(u, 3.0, 0.45)); x = x + (0 - x) * go; y = y + (P(540, 1120)[1] - y) * go;
  const hit = u >= 3.5 ? 1 + 0.12 * Math.exp(-(u - 3.5) * 10) : 1;
  knot.visible = true; knot.position.set(x, y, 0); knot.rotation.set(rx, ry, 0.2);
  knot.scale.setScalar(0.82 * land * hit * (1 + 0.18 * go));
  // star: pops at 2.0 on a spring, leaves with the knot's move
  const ps = spring(u - 2.0) * (1 - eo(pr(u, 3.0, 0.3)));
  star.visible = withStar && ps > 0.001; star.position.set(STAR_AT[0], STAR_AT[1], 0.5);
  star.scale.setScalar(Math.max(0.001, ps * 0.62)); star.rotation.set(0.35, -0.4 + Math.sin(u * 2.2) * 0.5, 0.15 + u * 0.6);
}

export function frame(t) {
  const sc = sceneAt(t);
  scene.environment = ENV[sc.bg] || ENV.lime;
  knot.visible = star.visible = ring.visible = false; shards.forEach((m) => (m.visible = false));
  knot.scale.setScalar(1); star.scale.setScalar(1); ring.scale.setScalar(1);

  if (sc.id === "hook") clipPose(Math.min(t - 0.15, 2.4), false);
  else if (sc.id === "clipA") clipPose(t - T.clipA);
  else if (sc.id === "dead") clipPose(T.clipLen);            // frozen on clip A's last frame
  else if (sc.id === "clipB") clipPose(t - T.clipB);
  else if (sc.id === "r1") {
    // «ووش»: the star crosses the frame; «بوم»: the knot slams down
    const tw = T.cue.whoosh, tb = T.cue.boom;
    const k = eio(pr(t, tw - 0.08, 0.6));
    if (t > tw - 0.08 && t < tw + 0.55) {
      star.visible = true; star.position.set(-6 + 12 * k, P(0, 1150)[1] + Math.sin(k * Math.PI) * 0.6, 0.6);
      star.rotation.set(0.3, k * 9, k * 3); star.scale.setScalar(0.85);
    }
    if (t >= tb - 0.22) {
      const d = pr(t, tb - 0.22, 0.22), [kx, ky] = P(730, 1300);
      const y = 6 + (ky - 6) * ei(d);
      const sq = t >= tb ? 1 + 0.2 * Math.exp(-(t - tb) * 8) * Math.cos((t - tb) * 28) : 1;
      knot.visible = true; knot.position.set(kx, y, 0); knot.rotation.set(0.5, 1.2 + (t - tb) * 0.8, 0.3); knot.scale.set(sq, 2 - sq, sq);
    }
  } else if (sc.id === "r2") {
    // ring floats; the world freezes in the silence; at the drop it bursts
    const tf = Math.min(t, T.silence), [rx, ry] = P(540, 1270);
    if (t < T.drop) {
      ring.visible = true; ring.position.set(rx, ry + Math.sin(tf * 2) * 0.08, 0); ring.rotation.set(0.55 + Math.sin(tf) * 0.2, Math.sin(tf * 0.9) * 0.35, tf * 0.8);
      ring.scale.setScalar(0.62 + (t >= T.silence ? 0 : 0.04 * pr(t, T.silence - 1.0, 1.0)));
    } else {
      const u = t - T.drop, b = eo(pr(u, 0, 0.35));
      ring.visible = u < 0.5; ring.position.set(rx, ry, 0); ring.rotation.set(0.55, Math.sin(tf * 0.9) * 0.35 + u * 6, tf * 0.8); ring.scale.setScalar(Math.max(0.001, 0.62 * (1 + 1.4 * b) * (1 - pr(u, 0.2, 0.3))));
      shards.forEach((m, i) => {
        const a = hash(i) * TAU, el = (hash(i + 40) - 0.5) * 1.6, sp = 4 + hash(i + 80) * 6;
        const d = sp * eo(pr(u, 0, 0.9));
        m.visible = u < 0.9; m.position.set(rx + Math.cos(a) * Math.cos(el) * d, ry + Math.sin(a) * Math.cos(el) * d - u * u * 2, Math.sin(el) * d * 0.5);
        m.scale.setScalar(Math.max(0.001, (0.6 + hash(i + 7) * 1.2) * (1 - pr(u, 0.5, 0.4))));
      });
    }
  } else if (sc.id === "r3") {
    const [rx, ry] = P(840, 1320); ring.visible = true; ring.position.set(rx, ry, 0);
    ring.rotation.set(1.0 + Math.sin(t) * 0.2, t * 0.9, 0.4); ring.scale.setScalar(0.55 * eback(pr(t, S.r3.start, 0.5)));
  } else if (sc.id === "cta") {
    const [sx, sy] = P(860, 1295), out = eio(pr(t, T.loopOut, 0.35));
    star.visible = true; star.position.set(sx, sy + Math.sin(t * 2.4) * 0.07, 0.4);
    star.rotation.set(0.35, Math.sin(t * 1.2) * 0.55, t * 0.5); star.scale.setScalar(Math.max(0.001, 0.45 * spring(t - S.cta.start - 0.3) * (1 - out)));
  }
  renderer.render(scene, camera);
}
