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
  window.OE = {
    frames: Math.round(cfg.duration * FPS),
    async renderFrame(i) {
      const t = i / FPS;
      const { scene, camera } = film.frame(t);
      post.render(scene, camera, t);
      renderer.getContext().finish();
      return true;
    },
  };
  // compile everything once so the first frame is not special
  await window.OE.renderFrame(0);
  window.__ready = true;
}
