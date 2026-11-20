// Lighting presets: the series' recurring looks. Key from cool sodium-cyan signage, violet fill, rim from neon.
import * as THREE from "three";
import type { Stage } from "../engine/Stage";
import { neonEnv } from "../engine/env";

export type LightRig = { key: THREE.SpotLight; rim: THREE.DirectionalLight; fill: THREE.HemisphereLight; accent: THREE.PointLight; all: THREE.Object3D[] };
export function neonRig(stage: Stage, o: { key?: number; rim?: number; fill?: number; accent?: number; env?: number; fog?: number; fogDensity?: number; bg?: number } = {}): LightRig {
  const S = stage.scene;
  S.environment = neonEnv(stage.renderer); S.environmentIntensity = o.env ?? 0.35;
  S.background = new THREE.Color(o.bg ?? 0x05040d);
  S.fog = new THREE.FogExp2(o.fog ?? 0x0d0a24, o.fogDensity ?? 0.03);
  const fill = new THREE.HemisphereLight(o.fill ?? 0x5260c8, 0x0a0614, 0.55); S.add(fill);
  const key = new THREE.SpotLight(o.key ?? 0xbfd8ff, 22, 30, 0.6, 0.6, 1.6); key.position.set(3, 6, 5); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0004; S.add(key); S.add(key.target);
  const rim = new THREE.DirectionalLight(o.rim ?? 0x38e8ff, 3.2); rim.position.set(-4, 3, -6); S.add(rim);
  const accent = new THREE.PointLight(o.accent ?? 0xff3fa8, 6, 12, 1.5); accent.position.set(3, 2, -2); S.add(accent);
  return { key, rim, fill, accent, all: [fill, key, rim, accent] };
}
