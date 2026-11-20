// Live "camera feed" of a character rendered into a texture (real 3D render, not an image),
// displayed through a screen shader that can scan, pixelate, mosaic, slice and corrupt it.
import * as THREE from "three";
import type { Stage } from "../engine/Stage";

export function faceFeed(stage: Stage, res = 512) {
  const rt = new THREE.WebGLRenderTarget(res, Math.round(res * 1.25), { type: THREE.HalfFloatType, samples: 2 });
  const cam = new THREE.PerspectiveCamera(22, 0.8, 0.05, 30);
  const mat = new THREE.ShaderMaterial({
    uniforms: { tFace: { value: rt.texture }, time: { value: 0 }, glitch: { value: 0 }, mosaic: { value: 0 }, pixel: { value: 0 }, red: { value: 0 }, scan: { value: 0 }, power: { value: 1 }, invert: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D tFace; uniform float time, glitch, mosaic, pixel, red, scan, power, invert; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      vec3 tm(vec3 c){ c *= 1.6; return clamp((c * (2.51 * c + 0.03)) / (c * (2.43 * c + 0.59) + 0.14), 0.0, 1.0); }
      void main(){
        vec2 uv = vUv; float gs = floor(time * 12.0);
        if (mosaic > 0.0) { float n = 1.0 + floor(mosaic * 4.0); vec2 cell = floor(uv * n); uv = fract(uv * n); if (h(cell + gs) < mosaic * 0.5) uv.x = 1.0 - uv.x; if (h(cell * 3.1 + gs) < mosaic * 0.3) uv = uv.yx; }
        if (pixel > 0.0) { float p = mix(400.0, 14.0, pixel); uv = (floor(uv * p) + 0.5) / p; }
        float row = floor(uv.y * 40.0); float off = (h(vec2(row, gs)) - 0.5) * glitch * step(1.0 - glitch * 0.7, h(vec2(row * 1.7, gs)));
        uv.x += off;
        vec3 c = vec3(tm(texture2D(tFace, uv + vec2(glitch * 0.02, 0.0)).rgb).r, tm(texture2D(tFace, uv).rgb).g, tm(texture2D(tFace, uv - vec2(glitch * 0.02, 0.0)).rgb).b);
        c = mix(c, 1.0 - c, invert * step(0.5, h(vec2(floor(vUv.y * 9.0), gs))));
        float l = dot(c, vec3(0.3, 0.6, 0.1));
        vec3 holo = mix(vec3(0.15, 0.75, 1.0) * l * 1.6, c, 0.55);
        holo = mix(holo, vec3(1.0, 0.15, 0.2) * (l * 1.8 + 0.1), red);
        // facial-recognition grid + scan bar
        vec2 g = abs(fract(vUv * vec2(12.0, 15.0)) - 0.5); float grid = step(0.48, max(g.x, g.y)) * 0.25 * scan;
        float bar = smoothstep(0.02, 0.0, abs(vUv.y - fract(time * 0.6))) * scan;
        vec3 col = holo + vec3(0.3, 0.9, 1.0) * (grid + bar) * (1.0 - red) + vec3(1.0, 0.2, 0.2) * (grid + bar) * red;
        col *= 0.85 + 0.15 * sin(vUv.y * 900.0); col *= power;
        gl_FragColor = vec4(col * 1.6, 1.0);
      }`,
    toneMapped: false,
  });
  stage.timed.push(mat as any);
  /** render the subject (look from `from` toward `at`) into the feed texture */
  const hide: THREE.Object3D[] = []; // screens that display the feed must not be in the feed (feedback loop)
  const capture = (from: THREE.Vector3, at: THREE.Vector3) => {
    const vis = hide.map((o) => o.visible); hide.forEach((o) => (o.visible = false));
    cam.position.copy(from); cam.lookAt(at); cam.updateMatrixWorld();
    const r = stage.renderer; const prev = r.getRenderTarget(); r.setRenderTarget(rt); r.clear(); r.render(stage.scene, cam); r.setRenderTarget(prev);
    hide.forEach((o, i) => (o.visible = vis[i]));
  };
  return { rt, cam, mat, capture, hide };
}
