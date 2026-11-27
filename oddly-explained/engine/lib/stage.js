// ODDLY EXPLAINED engine — deterministic stage.
// A film module exports `create(stage)` returning `{ frame(t) -> { scene, camera } }`.
// The renderer driver calls window.OE.renderFrame(i) for each frame; time is derived only from the frame index.
import * as THREE from 'three';
import { Post } from './post.js';

export async function boot(filmModule, cfg) {
  const W = cfg.width, H = cfg.height, FPS = cfg.fps;
  const scale = Number(new URLSearchParams(location.search).get('scale') || 1); // preview renders at lower res
  const w = Math.round(W * scale), h = Math.round(H * scale);
  const canvas = document.getElementById('gl');
  canvas.width = w; canvas.height = h;
  const hud = document.getElementById('hud');
  if (hud) { hud.width = w; hud.height = h; }
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.setSize(w, h, false);
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.autoClear = true; renderer.setClearColor(0x000000, 1);
  const post = new Post(renderer, w, h, { samples: Number(new URLSearchParams(location.search).get("samples") ?? cfg.samples ?? 4) });
  const stage = { THREE, renderer, post, W: w, H: h, scale, fps: FPS, hud, hudCtx: hud ? hud.getContext('2d') : null, cfg };
  const film = await filmModule.create(stage);
  const hf = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
  const mbRT = new THREE.WebGLRenderTarget(w, h, hf), accRT = new THREE.WebGLRenderTarget(w, h, hf);
  const orth = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const mkQ = (fs, blend) => { const m = new THREE.ShaderMaterial({ uniforms: { tIn: { value: null }, w: { value: 1 } }, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }', fragmentShader: fs, depthTest: false, depthWrite: false, transparent: !!blend, blending: blend || THREE.NoBlending });
    const sc = new THREE.Scene(); const me = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m); me.frustumCulled = false; sc.add(me); return { scene: sc, material: m }; };
  const accQ = mkQ('uniform sampler2D tIn; uniform float w; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tIn, vUv).rgb * w, 1.0); }', THREE.AdditiveBlending);
  const copyQ = mkQ('uniform sampler2D tIn; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tIn, vUv).rgb, 1.0); }');
  window.OE = {
    frames: Math.round(cfg.duration * FPS),
    async renderFrame(i) {
      const t = i / FPS;
      const n = Math.max(1, Number(new URLSearchParams(location.search).get('mb') ?? cfg.motionBlur?.samples ?? 1));
      if (n === 1) { const { scene, camera } = film.frame(t); post.render(scene, camera, t); }
      else {
        // cinematic motion blur: average n sub-frames spread over the shutter interval (default 180° = half a frame)
        const shutter = (cfg.motionBlur?.shutter ?? 0.5) / FPS;
        for (let k = 0; k < n; k++) {
          const tk = t + (k / (n - 1) - 0.5) * shutter;
          const { scene, camera } = film.frame(tk);
          post.render(scene, camera, t, mbRT);
          accQ.material.uniforms.tIn.value = mbRT.texture; accQ.material.uniforms.w.value = 1 / n;
          renderer.setRenderTarget(accRT); if (k === 0) renderer.clear(); renderer.render(accQ.scene, orth);
        }
        copyQ.material.uniforms.tIn.value = accRT.texture; renderer.setRenderTarget(null); renderer.render(copyQ.scene, orth);
        if (film.hud) film.hud(t); // 2D overlays drawn once, at the frame's own time
      }
      renderer.getContext().finish();
      return true;
    },
  };
  // compile everything once so the first frame is not special
  await window.OE.renderFrame(0);
  window.__ready = true;
}
