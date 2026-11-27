import * as THREE from 'three';
import { buildBody, hologramOf, sleepPose, runPose } from '/engine/lib/body.js';
export async function create(stage) {
  const q = new URLSearchParams(location.search);
  const scene = new THREE.Scene(); const cam = new THREE.PerspectiveCamera(30, stage.W / stage.H, 0.05, 50);
  const body = buildBody(); console.warn('body', JSON.stringify(body.stats));
  scene.add(body.group);
  const holo = hologramOf(body); holo.mesh.position.x = 0; scene.add(holo.mesh);
  const view = q.get('view') || 'front';
  return { frame(t) {
    body.glass.uniforms.uTone.value = [0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8];
    body.nerveMat.uniforms.uTime.value = t;
    if (view === 'run') { body.group.visible = false; holo.setPose(runPose(t * 9)); holo.material.uniforms.uTime.value = t; cam.position.set(3.2, 1.0, 0.6); cam.lookAt(0, 0.95, 0); }
    else { holo.mesh.visible = false; body.setPose(view === 'sleep' ? sleepPose(t) : {});
      if (view === 'face') { cam.position.set(0.35, 1.75, 0.6); cam.lookAt(0, 1.7, 0); }
      else { cam.position.set(1.8, 1.1, 3.6); cam.lookAt(0, 0.95, 0); } }
    Object.assign(stage.post.params, { maxCoc: 0, bloom: 0.8, bloomThreshold: 0.6, exposure: 1.1 });
    return { scene, camera: cam };
  } };
}
