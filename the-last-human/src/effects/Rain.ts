// GPU rain: thousands of streaks animated entirely in the vertex shader from the global clock,
// re-centred on the camera every frame so rain is always dense in front of the lens.
import * as THREE from "three";
import type { Stage } from "../engine/Stage";
import { rng } from "../utils/math";

export function rain(stage: Stage, o: { count?: number; size?: number; height?: number; speed?: number; color?: number; opacity?: number; wind?: number } = {}) {
  const N = o.count ?? 9000, S = o.size ?? 26, Hh = o.height ?? 22, R = rng(42);
  const pos = new Float32Array(N * 2 * 3), seed = new Float32Array(N * 2), tip = new Float32Array(N * 2);
  for (let i = 0; i < N; i++) {
    const x = (R() - 0.5) * S, z = (R() - 0.5) * S, y = R() * Hh, s = R();
    for (let k = 0; k < 2; k++) { pos.set([x, y, z], (i * 2 + k) * 3); seed[i * 2 + k] = s; tip[i * 2 + k] = k; }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("seed", new THREE.BufferAttribute(seed, 1)); g.setAttribute("tip", new THREE.BufferAttribute(tip, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, H: { value: Hh }, speed: { value: o.speed ?? 14 }, color: { value: new THREE.Color(o.color ?? 0x9fb8ff) }, opacity: { value: o.opacity ?? 0.5 }, wind: { value: o.wind ?? 0.12 }, origin: { value: new THREE.Vector3() } },
    vertexShader: `uniform float time, H, speed, wind; uniform vec3 origin; attribute float seed, tip; varying float vA;
      void main(){ vec3 p = position; float sp = speed * (0.8 + seed * 0.4);
        p.y = mod(p.y - time * sp + seed * 100.0, H) - H * 0.35 + origin.y;
        p.x += origin.x - origin.x * 0.0 + wind * p.y * 0.0; p.z += origin.z;
        p.x -= floor((p.x - origin.x) / 1e9) * 0.0;
        p.y += tip * 0.28 * (0.6 + seed); p.x += tip * 0.28 * wind;
        vA = 0.35 + 0.65 * tip; gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0); }`,
    fragmentShader: `uniform vec3 color; uniform float opacity; varying float vA; void main(){ gl_FragColor = vec4(color * vA * opacity, 1.0); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  });
  const lines = new THREE.LineSegments(g, m); lines.frustumCulled = false; stage.scene.add(lines); stage.timed.push(m as any);
  stage.tickers.push(() => { const c = stage.camera.position; m.uniforms.origin.value.set(Math.round(c.x), c.y, Math.round(c.z)); });
  return { lines, mat: m };
}

/** Splash ripples on wet ground near the camera. */
export function splashes(stage: Stage, o: { count?: number; size?: number; y?: number } = {}) {
  const N = o.count ?? 900, S = o.size ?? 18, R = rng(9);
  const off = new Float32Array(N * 3); for (let i = 0; i < N; i++) off.set([(R() - 0.5) * S, R(), (R() - 0.5) * S], i * 3);
  const g = new THREE.InstancedBufferGeometry(); const base = new THREE.PlaneGeometry(1, 1); base.rotateX(-Math.PI / 2);
  g.index = base.index; g.setAttribute("position", base.attributes.position); g.setAttribute("uv", base.attributes.uv);
  g.setAttribute("off", new THREE.InstancedBufferAttribute(off, 3)); g.instanceCount = N;
  const m = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, origin: { value: new THREE.Vector3() }, y: { value: o.y ?? 0.012 } },
    vertexShader: `uniform float time, y; uniform vec3 origin; attribute vec3 off; varying vec2 vUv; varying float vK;
      void main(){ float ph = fract(time * 1.6 + off.y * 7.0); vK = ph; vUv = uv; vec3 p = position * (0.04 + ph * 0.22);
        vec3 w = vec3(off.x + origin.x, y, off.z + origin.z) + p; gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0); }`,
    fragmentShader: `varying vec2 vUv; varying float vK; void main(){ float r = length(vUv - 0.5) * 2.0; float ring = smoothstep(0.75, 0.9, r) * smoothstep(1.0, 0.9, r);
      gl_FragColor = vec4(vec3(0.55, 0.65, 1.0) * ring * (1.0 - vK) * 0.5, 1.0); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; stage.scene.add(mesh); stage.timed.push(m as any);
  stage.tickers.push(() => { const c = stage.camera.position; m.uniforms.origin.value.set(Math.round(c.x), 0, Math.round(c.z) - 6); });
  return mesh;
}

/** Floating dust / ash motes for interiors (lit by beams). */
export function motes(stage: Stage, o: { count?: number; box?: [number, number, number]; center?: [number, number, number]; color?: number; size?: number } = {}) {
  const N = o.count ?? 1500, B = o.box ?? [12, 6, 12], C = o.center ?? [0, 3, 0], R = rng(17);
  const p = new Float32Array(N * 3); for (let i = 0; i < N; i++) p.set([(R() - 0.5) * B[0], R() * B[1], (R() - 0.5) * B[2]], i * 3);
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3));
  const m = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, color: { value: new THREE.Color(o.color ?? 0x9fc8ff) }, size: { value: o.size ?? 3 }, center: { value: new THREE.Vector3(...C) }, B: { value: new THREE.Vector3(...B) } },
    vertexShader: `uniform float time, size; uniform vec3 center, B; varying float vA;
      void main(){ vec3 q = position; q.x += sin(time * 0.3 + q.y * 2.0) * 0.3; q.y = mod(q.y + time * 0.08, B.y); q.z += cos(time * 0.25 + q.x) * 0.3;
        vec4 mv = viewMatrix * vec4(q - vec3(0.0, B.y * 0.5, 0.0) + center, 1.0); vA = 0.5 + 0.5 * sin(time * 2.0 + position.x * 10.0);
        gl_PointSize = size * (6.0 / -mv.z); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 color; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(color * smoothstep(0.5, 0.0, d) * vA * 0.6, 1.0); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; stage.scene.add(pts); stage.timed.push(m as any); return pts;
}
