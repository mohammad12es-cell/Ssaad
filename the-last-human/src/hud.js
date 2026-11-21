// Holographic interface projected by the drone (SHOT 5) and the end title card (SHOT 6).
import * as THREE from "three";
import { GLSL_NOISE, clamp } from "./util.js";

const RED = "#ff2a44";
function glow(g, txt, x, y, font, col, blur, align = "left") {
  g.font = font; g.textAlign = align; g.textBaseline = "middle";
  g.shadowColor = col; g.shadowBlur = blur; g.fillStyle = col; g.fillText(txt, x, y); g.shadowBlur = 0;
}

export function makeHud(scene) {
  const c = document.createElement("canvas"); c.width = 1024; c.height = 720;
  const g = c.getContext("2d");
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const U = { map: { value: tex }, uTime: { value: 0 }, uAmt: { value: 0 }, uGlitch: { value: 0 } };
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.2), new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `${GLSL_NOISE} uniform sampler2D map; uniform float uTime, uAmt, uGlitch; varying vec2 vUv;
      void main(){
        vec2 uv = vUv; float fr = floor(uTime * 30.0);
        float band = floor(uv.y * 24.0);
        uv.x += uGlitch * step(0.7, h11(band + fr)) * (h11(band * 3.0 + fr) - 0.5) * 0.08;
        vec4 tx = texture2D(map, uv);
        vec3 c = vec3(texture2D(map, uv + vec2(0.004 * uGlitch, 0.)).r, tx.g, texture2D(map, uv - vec2(0.004 * uGlitch, 0.)).b);
        float scan = 0.85 + 0.15 * sin(vUv.y * 520.0 - uTime * 20.0);
        float inside = 1.0 - smoothstep(0.47, 0.5, max(abs(vUv.x - 0.5), abs(vUv.y - 0.5)));
        vec3 bg = vec3(0.05, 0.004, 0.012) * (0.8 + 0.2 * scan);
        vec3 col = mix(bg, c * 2.2 * scan, tx.a);
        float a = max(inside * 0.78, tx.a);
        gl_FragColor = vec4(col, a * uAmt);
      }`,
  }));
  panel.frustumCulled = false; scene.add(panel);

  const draw = (k, t) => { // k = seconds since the panel appeared
    g.clearRect(0, 0, c.width, c.height);
    const W = c.width, H = c.height;
    g.strokeStyle = RED; g.lineWidth = 4; g.shadowColor = RED; g.shadowBlur = 14;
    const L = 46;
    for (const [x, y, sx, sy] of [[16, 16, 1, 1], [W - 16, 16, -1, 1], [16, H - 16, 1, -1], [W - 16, H - 16, -1, -1]]) {
      g.beginPath(); g.moveTo(x, y + sy * L); g.lineTo(x, y); g.lineTo(x + sx * L, y); g.stroke();
    }
    g.shadowBlur = 0; g.globalAlpha = 0.5; g.lineWidth = 2; g.strokeRect(40, 40, W - 80, H - 80); g.globalAlpha = 1;
    glow(g, "E.V.E. // SURVEILLANCE UNIT 7-31", 64, 82, "600 30px Rajdhani", "#ff8a96", 8);
    glow(g, `T+${(k * 1000).toFixed(0).padStart(5, "0")}`, W - 64, 82, "600 30px Rajdhani", "#ff8a96", 8, "right");
    g.fillStyle = RED; g.globalAlpha = 0.85; g.fillRect(64, 112, W - 128, 3); g.globalAlpha = 1;
    // warning triangle
    const blink = Math.sin(t * 12) > -0.3;
    if (blink) {
      g.strokeStyle = RED; g.lineWidth = 7; g.shadowColor = RED; g.shadowBlur = 20;
      g.beginPath(); g.moveTo(140, 165); g.lineTo(205, 280); g.lineTo(75, 280); g.closePath(); g.stroke();
      g.shadowBlur = 0; glow(g, "!", 140, 240, "900 64px Orbitron", RED, 10, "center");
    }
    // main message (types in)
    const msg1 = "UNKNOWN HUMAN", msg2 = "DETECTED";
    const n = Math.floor(clamp(k / 0.45) * (msg1.length + msg2.length));
    glow(g, msg1.slice(0, n), 236, 190, "900 64px Orbitron", RED, 26);
    glow(g, msg2.slice(0, Math.max(0, n - msg1.length)), 236, 276, "900 64px Orbitron", RED, 26);
    // data rows
    const rows = [["NEURAL LINK", "NOT FOUND"], ["CITIZEN ID", "NULL"], ["SIGNAL", "NONE"], ["THREAT CLASS", "UNDEFINED"]];
    rows.forEach(([a, b], i) => {
      const kk = k - 0.5 - i * 0.18; if (kk < 0) return;
      const y = 380 + i * 58;
      glow(g, a, 80, y, "600 36px Rajdhani", "#ff9aa6", 6);
      g.fillStyle = "rgba(255,60,80,0.45)"; for (let x = 330; x < 640; x += 14) g.fillRect(x, y + 6, 6, 3);
      glow(g, b, W - 80, y, "700 38px Orbitron", RED, 14, "right");
    });
    // flat-lined neural activity trace
    const ky = 640; g.strokeStyle = RED; g.lineWidth = 3; g.shadowColor = RED; g.shadowBlur = 10; g.beginPath();
    for (let x = 80; x < W - 80; x += 4) { const y = ky + (x < 160 ? Math.sin(x * 0.3 + t * 20) * 14 : (Math.random() < 0 ? 1 : 0)); x === 80 ? g.moveTo(x, y) : g.lineTo(x, y); }
    g.stroke(); g.shadowBlur = 0;
    glow(g, "NEURAL ACTIVITY", 80, ky - 30, "600 26px Rajdhani", "#ff9aa6", 4);
    tex.needsUpdate = true;
  };
  return { panel, U, draw };
}

export function makeTitle(W, H) {
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d");
  g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
  g.textAlign = "center"; g.textBaseline = "middle";
  const cy = H * 0.47;
  // main title, letter-spaced
  const title = "THE LAST HUMAN";
  g.font = "900 74px Orbitron";
  const sp = 6; let tw = 0; for (const ch of title) tw += g.measureText(ch).width + sp; tw -= sp;
  let x = W / 2 - tw / 2;
  g.shadowColor = "rgba(120,220,255,0.8)"; g.shadowBlur = 30; g.fillStyle = "#f2fbff";
  for (const ch of title) { const w = g.measureText(ch).width; g.fillText(ch, x + w / 2, cy); x += w + sp; }
  g.shadowBlur = 0;
  g.fillStyle = "rgba(57,230,255,0.9)"; g.fillRect(W / 2 - 260, cy + 72, 520, 3);
  g.font = "600 46px Rajdhani"; g.fillStyle = "#cfe9ff"; g.shadowColor = "rgba(57,230,255,0.6)"; g.shadowBlur = 16;
  const sub = "EPISODE 01  —  NO SIGNAL"; const sp2 = 6; tw = 0; for (const ch of sub) tw += g.measureText(ch).width + sp2; tw -= sp2; x = W / 2 - tw / 2;
  for (const ch of sub) { const w = g.measureText(ch).width; g.fillText(ch, x + w / 2, cy + 130); x += w + sp2; }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const U = { map: { value: tex }, uTime: { value: 0 }, uA: { value: 0 }, uB: { value: 0 }, uGlitch: { value: 0 }, uScale: { value: 1 } };
  const mat = new THREE.ShaderMaterial({
    uniforms: U, depthTest: false,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
    fragmentShader: `${GLSL_NOISE} uniform sampler2D map; uniform float uTime, uA, uB, uGlitch, uScale; varying vec2 vUv;
      void main(){
        vec2 uv = (vUv - 0.5) / uScale + 0.5; float fr = floor(uTime * 30.0);
        float band = floor(uv.y * 90.0);
        uv.x += uGlitch * step(0.6, h11(band + fr)) * (h11(band * 7.0 + fr) - 0.5) * 0.12;
        vec3 c = vec3(texture2D(map, uv + vec2(0.006 * uGlitch, 0.)).r, texture2D(map, uv).g, texture2D(map, uv - vec2(0.006 * uGlitch, 0.)).b);
        float isTitle = step(0.497, vUv.y);
        c *= mix(uB, uA, isTitle);
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); quad.frustumCulled = false; scene.add(quad);
  return { scene, cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), U };
}
