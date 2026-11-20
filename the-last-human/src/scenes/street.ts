// Reusable Neo-Eden street set (city + crowd + rain + travelling neon wash). Used by Ep01/02/04/09.
import * as THREE from "three";
import type { Stage } from "../engine/Stage";
import { buildCity } from "../environments/City";
import { neonRig } from "../environments/Lighting";
import { crowd } from "../characters/Crowd";
import { rain, splashes } from "../effects/Rain";

export function streetSet(stage: Stage, o: { crowd?: number; seed?: number; laneX?: [number, number]; eveAd?: boolean } = {}) {
  const L = neonRig(stage, { fogDensity: 0.016, fog: 0x0e0a26, env: 0.45 });
  L.fill.intensity = 0.25; L.key.intensity = 26; L.key.angle = 0.45; L.rim.intensity = 2.6;
  const city = buildCity(stage, { eveAd: o.eveAd });
  const people = crowd(stage, { n: o.crowd ?? 40, zMin: -62, zMax: -4, seed: o.seed ?? 11 });
  const [a, b] = o.laneX ?? [-0.5, 1.4];
  for (const w of people.list) if (w.x > a && w.x < b) w.x += w.x < (a + b) / 2 ? -(b - a) : b - a;
  const R = rain(stage, { opacity: 0.55 }); const SP = splashes(stage);
  const cyan = new THREE.PointLight(0x38e8ff, 7, 7, 1.8), pink = new THREE.PointLight(0xff3fa8, 6, 7, 1.8);
  const streetA = new THREE.PointLight(0x7f9cff, 30, 16, 1.6), streetB = new THREE.PointLight(0xb98cff, 26, 16, 1.6);
  stage.scene.add(cyan, pink, streetA, streetB);
  /** keep the neon wash + key light around a focus point */
  const follow = (p: THREE.Vector3) => {
    cyan.position.set(p.x - 2.2, 2.6, p.z - 1); pink.position.set(p.x + 2.4, 3.2, p.z + 1.5);
    streetA.position.set(-5, 6, p.z - 5); streetB.position.set(5.5, 6, p.z + 4);
    L.key.position.set(p.x + 2, 7, p.z - 4); L.key.target.position.set(p.x, 1.5, p.z);
  };
  return { L, city, people, rain: R, splash: SP, cyan, pink, streetA, streetB, follow };
}
