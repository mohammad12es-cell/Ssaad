// Shared material presets (series look bible). Reusing these keeps every episode consistent.
import * as THREE from "three";
import { painted } from "../engine/textures";

export const COLORS = {
  cyan: 0x38e8ff, violet: 0x8a5cff, blue: 0x2a4dff, deep: 0x070815, red: 0xff2a3d, magenta: 0xff3fa8, amber: 0xffb36b,
};

export const std = (color: THREE.ColorRepresentation, o: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.0, ...o });
export const emissive = (color: THREE.ColorRepresentation, intensity = 2) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), toneMapped: false });
export const additive = (map: THREE.Texture, color: THREE.ColorRepresentation = 0xffffff, opacity = 1, intensity = 1) =>
  new THREE.MeshBasicMaterial({ map, color: new THREE.Color(color).multiplyScalar(intensity), transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });

/** Black techwear fabric with painted brushwork. */
export const fabric = (key: string, base: string, strokes: string[], o: THREE.MeshStandardMaterialParameters = {}) => {
  const map = painted(key, base, strokes, { n: 700, len: 50, alpha: 0.18, seed: key.length * 13 });
  map.repeat.set(2, 2);
  return std(0xffffff, { map, roughness: 0.55, ...o });
};

/** Hologram: fresnel rim + scanlines + flicker + slice glitch. Used for E.V.E and Dr. Vex's recordings. */
export function holo(color: THREE.ColorRepresentation, o: { fill?: number; rim?: number; opacity?: number; sway?: boolean } = {}) {
  const m = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 }, color: { value: new THREE.Color(color) }, fill: { value: o.fill ?? 0.35 }, rim: { value: o.rim ?? 1.6 },
      opacity: { value: o.opacity ?? 1 }, glitch: { value: 0 }, gseed: { value: 0 }, dissolve: { value: 0 },
    },
    vertexShader: `
      uniform float time, glitch, gseed; attribute float sway; varying vec3 vN; varying vec3 vV; varying vec3 vW; varying float vSway;
      float h(float n){ return fract(sin(n * 91.3458) * 47453.5453); }
      void main(){
        vec3 p = position;
        #ifdef SWAY
          p.x += sin(time * 1.4 + sway * 4.0 + position.z * 18.0) * 0.025 * sway;
          p.z += cos(time * 1.1 + sway * 3.0) * 0.02 * sway;
          vSway = sway;
        #endif
        vec4 w = modelMatrix * vec4(p, 1.0);
        float band = floor(w.y * 26.0);
        float on = step(1.0 - glitch * 0.7, h(band + floor(gseed)));
        w.x += (h(band * 1.3 + gseed) - 0.5) * 0.18 * glitch * on;
        vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: `
      uniform float time, fill, rim, opacity, glitch, gseed, dissolve; uniform vec3 color; varying vec3 vN; varying vec3 vV; varying vec3 vW; varying float vSway;
      float h(float n){ return fract(sin(n * 91.3458) * 47453.5453); }
      void main(){
        float f = pow(1.0 - abs(dot(normalize(vN), vV)), 2.2);
        float scan = 0.82 + 0.18 * sin(vW.y * 260.0 - time * 6.0);
        float fl = 0.88 + 0.12 * h(floor(time * 24.0));
        float band = step(0.93, h(floor(vW.y * 40.0 + time * 3.0)));
        if (dissolve > 0.0 && h(floor(vW.y * 90.0) * 7.0 + floor(vW.x * 90.0)) < dissolve) discard;
        vec3 c = color * (fill + f * rim) * scan * fl + color * band * 0.08;
        gl_FragColor = vec4(c, opacity);
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthFunc: THREE.LessEqualDepth, side: THREE.FrontSide, toneMapped: false,
  });
  if (o.sway) m.defines = { SWAY: 1 };
  return m;
}
export type HoloMat = ReturnType<typeof holo>;

/** Volumetric light cone (spotlights, drone scan beams). */
export function beam(color: THREE.ColorRepresentation, intensity = 1) {
  return new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(color) }, intensity: { value: intensity }, time: { value: 0 } },
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vN = normalize(mat3(modelMatrix)*normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform vec3 color; uniform float intensity, time; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ float edge = pow(abs(dot(normalize(vN), vV)), 1.5); float along = pow(vUv.y, 1.6);
        float dust = 0.93 + 0.07 * sin(vUv.y * 23.0 - time * 3.0 + vUv.x * 40.0);
        gl_FragColor = vec4(color * edge * along * intensity * dust, 1.0); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
  });
}
