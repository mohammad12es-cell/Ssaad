// Procedural neon environment map: emissive panels around a dark room, prefiltered with PMREM.
// Gives metals, wet streets and eyes believable cyan / violet / red reflections.
import * as THREE from "three";
export function neonEnv(renderer: THREE.WebGLRenderer, palette: number[] = [0x38e8ff, 0x8a5cff, 0xff3fa8, 0x2a4dff, 0xff2a3d]) {
  const sc = new THREE.Scene(); sc.background = new THREE.Color(0x020208);
  const box = new THREE.Mesh(new THREE.BoxGeometry(20, 10, 20), new THREE.MeshBasicMaterial({ color: 0x05050c, side: THREE.BackSide })); sc.add(box);
  palette.forEach((c, i) => {
    const a = (i / palette.length) * Math.PI * 2;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2 + (i % 2) * 3, 0.6 + (i % 3)), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(4) }));
    m.position.set(Math.cos(a) * 9, -1 + (i % 3) * 2, Math.sin(a) * 9); m.lookAt(0, 0, 0); sc.add(m);
  });
  const top = new THREE.Mesh(new THREE.PlaneGeometry(14, 3), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x6a7cff).multiplyScalar(0.22) }));
  top.position.y = 4.9; top.rotation.x = Math.PI / 2; sc.add(top);
  const pm = new THREE.PMREMGenerator(renderer); const rt = pm.fromScene(sc, 0.03); pm.dispose();
  return rt.texture;
}
