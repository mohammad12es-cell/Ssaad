// Crowd of Neo-Eden citizens walking the street. Deterministic paths; rigs far from camera are not re-posed.
import * as THREE from "three";
import type { Stage } from "../engine/Stage";
import { Human } from "./Human";
import { citizen } from "./Cast";
import { rng } from "../utils/math";

export type Walker = { h: Human; x: number; z0: number; speed: number; phase: number; dir: number; zMin: number; zMax: number; lookUp?: number };
export function crowd(stage: Stage, o: { n?: number; zMin?: number; zMax?: number; xMin?: number; xMax?: number; seed?: number; avoid?: (x: number, z: number) => boolean } = {}) {
  const R = rng(o.seed ?? 77), list: Walker[] = [];
  const zMin = o.zMin ?? -40, zMax = o.zMax ?? 10, xMin = o.xMin ?? -6.5, xMax = o.xMax ?? 6.5;
  for (let i = 0; i < (o.n ?? 40); i++) {
    const h = new Human(citizen(i)); stage.scene.add(h.root);
    const dir = R() < 0.5 ? 1 : -1;
    list.push({ h, x: xMin + R() * (xMax - xMin), z0: zMin + R() * (zMax - zMin), speed: 1.1 + R() * 0.5, phase: R(), dir, zMin, zMax });
  }
  const tmp = new THREE.Vector3();
  const update = (t: number, freeze = 1) => {
    const cam = stage.camera.position;
    for (const w of list) {
      const span = w.zMax - w.zMin; let z = w.z0 + w.dir * w.speed * t * freeze; z = ((z - w.zMin) % span + span) % span + w.zMin;
      w.h.root.position.set(w.x, 0.0, z); w.h.root.rotation.y = w.dir > 0 ? 0 : Math.PI;
      if (tmp.copy(w.h.root.position).distanceTo(cam) > 45) continue; // LOD: skip far re-posing
      w.h.reset(); w.h.walk(w.phase + (t * w.speed * freeze) / 1.25, freeze); w.h.look(0, w.lookUp ?? 0.06); w.h.applyFace();
      if (w.h.neuralGlow) w.h.neuralGlow.material.opacity = 0.7 + 0.3 * Math.sin(t * 5 + w.phase * 10);
    }
  };
  return { list, update };
}
