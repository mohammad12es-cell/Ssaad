// Look-development scenes used to validate characters and lighting before episodes are built.
import * as THREE from "three";
import type { Stage } from "../engine/Stage";
import { make, KAEL, EVE, VEX, VEX_HOLO, KAEL_CHILD, citizen } from "../characters/Cast";
import { neonRig } from "../environments/Lighting";

export const lineup = (stage: Stage) => {
  const L = neonRig(stage, { fogDensity: 0.02 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: 0x0a0a12, roughness: 0.25, metalness: 0.5 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; stage.scene.add(floor);
  const cast = [make(KAEL_CHILD), make(KAEL), make(EVE), make(VEX), make(VEX_HOLO), make(citizen(1)), make(citizen(3))];
  cast.forEach((h, i) => { h.root.position.set((i - 3) * 0.75, 0, 0); stage.scene.add(h.root); });
  L.key.target.position.set(0, 1, 0);
  return (t: number) => {
    cast.forEach((h, i) => { h.reset(); h.idle(t + i); h.autoBlink(t, i); h.s.gx = Math.sin(t) * 0.3; h.applyFace(); h.setHolo(t); });
    stage.camera.position.set(0, 1.3, 7.2); stage.camera.lookAt(0, 0.95, 0); stage.lens(30);
  };
};

export const face = (who: number) => (stage: Stage) => {
  const L = neonRig(stage, { fogDensity: 0.0 });
  const h = make([KAEL, EVE, VEX, KAEL_CHILD][who]); stage.scene.add(h.root);
  L.key.position.set(1.2, 2.4, 2.6); L.key.target.position.set(0, 1.7, 0); L.key.intensity = 9; L.accent.intensity = 2;
  return (t: number) => {
    h.reset(); h.idle(t); h.autoBlink(t, 1); h.s.mouth = 0.1 + 0.1 * Math.sin(t * 9); h.s.gx = 0.1; h.applyFace(); h.setHolo(t);
    const hp = h.headPos(); const yaw = 0.45 * Math.sin(t * 0.5) + 0.35;
    stage.camera.position.set(hp.x + Math.sin(yaw) * 0.55, hp.y + 0.01, hp.z + Math.cos(yaw) * 0.55); stage.camera.lookAt(hp.x, hp.y - 0.02, hp.z); stage.lens(50);
  };
};

import { buildCity } from "../environments/City";
import { crowd } from "../characters/Crowd";
import { Drone } from "../characters/Machines";
import { rain, splashes } from "../effects/Rain";
export const street = (view: number) => (stage: Stage) => {
  const L = neonRig(stage, { fogDensity: 0.022, fog: 0x120c2c, env: 0.5 });
  L.key.position.set(4, 9, 6); L.key.intensity = 30; L.key.angle = 0.5;
  const city = buildCity(stage, {}); const cr = crowd(stage, { n: 36, zMin: -30, zMax: 12 });
  const kael = make(KAEL); stage.scene.add(kael.root); const drone = new Drone(); stage.scene.add(drone.root);
  rain(stage); splashes(stage);
  return (t: number) => {
    city.update(t); cr.update(t);
    kael.reset(); kael.root.position.set(0.4, 0, -t * 1.2); kael.root.rotation.y = Math.PI; kael.walk(t / 1.2); kael.autoBlink(t); kael.applyFace();
    drone.root.position.set(0.6, 3.2, -t * 1.2 - 2.5); drone.root.rotation.y = 0; drone.update(t, { beam: 0.8 });
    L.key.target.position.copy(kael.root.position);
    if (view === 0) { stage.camera.position.set(0.2, 1.6, -t * 1.2 - 3.4); stage.camera.lookAt(0.4, 1.55, -t * 1.2); stage.lens(40); }
    else { stage.camera.position.set(2, 22, 18); stage.camera.lookAt(0, 30, -90); stage.lens(24); (city.network.material as any).uniforms.opacity.value = 1; }
  };
};
