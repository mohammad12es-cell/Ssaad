// Surveillance drone + security hunter robot (E.V.E's hardware). Reused across episodes.
import * as THREE from "three";
import { std, beam } from "../effects/materials";
import { glow, LiveCanvas } from "../engine/textures";
import { clamp } from "../utils/math";

const metal = () => std(0x1b1d27, { metalness: 0.9, roughness: 0.28 });
const plate = () => std(0x2a2d3a, { metalness: 0.75, roughness: 0.35 });
const red = (k = 3) => new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff2a3d).multiplyScalar(k), toneMapped: false });

export class Drone {
  root = new THREE.Group(); body = new THREE.Group(); rotors: THREE.Mesh[] = []; eye: THREE.Mesh; eyeGlow: THREE.Sprite; beam: THREE.Mesh; beamMat: THREE.ShaderMaterial;
  screen: LiveCanvas; screenMesh: THREE.Mesh; iris: THREE.Group;
  constructor() {
    this.root.add(this.body);
    const hull = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 20), metal()); hull.scale.set(1, 0.55, 1.15); this.body.add(hull);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.035, 8, 40), plate()); band.rotation.x = Math.PI / 2; this.body.add(band);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.4), plate()); fin.position.set(0, 0.22, -0.25); this.body.add(fin);
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + i * Math.PI / 2;
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.05, 0.08), plate()); arm.position.set(Math.cos(a) * 0.55, 0.02, Math.sin(a) * 0.55); arm.rotation.y = -a; this.body.add(arm);
      const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.08, 24, 1, true), metal()); pod.position.set(Math.cos(a) * 0.85, 0.04, Math.sin(a) * 0.85); this.body.add(pod);
      const rot = new THREE.Mesh(new THREE.CircleGeometry(0.24, 24), new THREE.MeshBasicMaterial({ color: 0x8892aa, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false })); rot.rotation.x = -Math.PI / 2; rot.position.copy(pod.position).y += 0.03; this.body.add(rot); this.rotors.push(rot);
      const nav = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(i < 2 ? 0x38e8ff : 0xff2a3d).multiplyScalar(4), toneMapped: false })); nav.position.set(Math.cos(a) * 1.1, 0.02, Math.sin(a) * 1.1); this.body.add(nav);
    }
    // scanner eye on the front (+z) with an aperture iris
    this.iris = new THREE.Group(); this.iris.position.set(0, -0.05, 0.43); this.body.add(this.iris);
    const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.08, 32), plate()); socket.rotation.x = Math.PI / 2; this.iris.add(socket);
    this.eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 16), red(4)); this.eye.scale.z = 0.5; this.eye.position.z = 0.03; this.iris.add(this.eye);
    for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.02, 0.01), plate()); b.rotation.z = (i / 6) * Math.PI * 2; b.position.set(Math.cos((i / 6) * Math.PI * 2) * 0.12, Math.sin((i / 6) * Math.PI * 2) * 0.12, 0.05); this.iris.add(b); }
    this.eyeGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow("#ff2a3d"), color: 0xff2a3d, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); this.eyeGlow.scale.setScalar(1.1); this.eyeGlow.position.z = 0.1; this.iris.add(this.eyeGlow);
    // scan beam (cone opening forward from the eye)
    this.beamMat = beam(0xff2a3d, 0.0);
    const cg = new THREE.ConeGeometry(1.6, 7, 32, 1, true); cg.translate(0, -3.5, 0); cg.rotateX(-Math.PI / 2); // apex at origin, opening toward +z
    this.beam = new THREE.Mesh(cg, this.beamMat); this.iris.add(this.beam);
    // projected hologram display (above-front)
    this.screen = new LiveCanvas(1024, 384);
    this.screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.825), new THREE.MeshBasicMaterial({ map: this.screen.t, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide, color: new THREE.Color(1.6, 1.6, 1.6) }));
    this.screenMesh.position.set(0, 1.45, 0.4); this.screenMesh.rotation.y = 0; this.screenMesh.scale.setScalar(1.15); this.screenMesh.visible = false; this.root.add(this.screenMesh);
  }
  /** t: time, hover amplitude, beam intensity 0..1 */
  update(t: number, o: { beam?: number; eye?: number } = {}) {
    this.body.position.y = Math.sin(t * 2.1) * 0.05; this.body.rotation.z = Math.sin(t * 1.3) * 0.04;
    this.rotors.forEach((r, i) => (r.rotation.z = t * 60 + i));
    this.beamMat.uniforms.intensity.value = o.beam ?? 0;
    const e = o.eye ?? 1; (this.eye.material as THREE.MeshBasicMaterial).color.setRGB(e * 4, e * 0.66, e * 0.95); this.eyeGlow.material.opacity = clamp(e);
  }
  /** draw the hologram text panel */
  display(lines: string[], o: { color?: string; t?: number; glitch?: number } = {}) {
    const { g, c } = this.screen, col = o.color ?? "#ff2a3d";
    g.clearRect(0, 0, c.width, c.height); g.fillStyle = "#000"; g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = col; g.lineWidth = 6; g.shadowColor = col; g.shadowBlur = 24; g.strokeRect(14, 14, c.width - 28, c.height - 28);
    g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = col;
    lines.forEach((ln, i) => { g.font = (i === 0 ? "900 74px" : "600 40px") + " Orbitron, sans-serif"; const off = (o.glitch ?? 0) * (Math.sin((o.t ?? 0) * 90 + i * 7) * 30); g.fillText(ln, c.width / 2 + off, c.height / 2 + (i - (lines.length - 1) / 2) * 110); });
    for (let y = 0; y < c.height; y += 6) { g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(0, y, c.width, 2); }
    this.screen.commit(); this.screenMesh.visible = true;
  }
}

/** E.V.E "Hunter" security robot: 3 m tall armoured biped with red visor slit. Rigged like the Human class. */
export class Robot {
  root = new THREE.Group(); hips = new THREE.Group(); torso = new THREE.Group(); head = new THREE.Group();
  sh: THREE.Group[] = []; el: THREE.Group[] = []; claw: THREE.Group[] = []; th: THREE.Group[] = []; kn: THREE.Group[] = []; visor: THREE.Mesh; visorGlow: THREE.Sprite;
  constructor() {
    const M = metal(), P = plate(), add = (p: THREE.Object3D, g: THREE.BufferGeometry, m: THREE.Material, pos: number[], rot: number[] = [0, 0, 0], scl: number[] = [1, 1, 1]) => { const x = new THREE.Mesh(g, m); x.position.set(pos[0], pos[1], pos[2]); x.rotation.set(rot[0], rot[1], rot[2]); x.scale.set(scl[0], scl[1], scl[2]); x.castShadow = true; x.receiveShadow = true; p.add(x); return x; };
    this.root.add(this.hips); this.hips.position.y = 1.55;
    add(this.hips, new THREE.BoxGeometry(0.7, 0.35, 0.45), M, [0, 0, 0]);
    this.hips.add(this.torso); this.torso.position.y = 0.25;
    add(this.torso, new THREE.BoxGeometry(1.15, 0.85, 0.7), P, [0, 0.55, 0]);
    add(this.torso, new THREE.BoxGeometry(0.75, 0.55, 0.2), M, [0, 0.6, 0.4]);
    for (let i = 0; i < 4; i++) add(this.torso, new THREE.BoxGeometry(0.6, 0.04, 0.05), red(1.6), [0, 0.35 + i * 0.12, 0.51]);
    add(this.torso, new THREE.CylinderGeometry(0.25, 0.32, 0.3, 8), M, [0, 0.12, 0]);
    this.torso.add(this.head); this.head.position.set(0, 1.05, 0.12);
    add(this.head, new THREE.BoxGeometry(0.42, 0.3, 0.42), P, [0, 0.1, 0]);
    add(this.head, new THREE.BoxGeometry(0.5, 0.12, 0.3), M, [0, 0.24, -0.04], [0.2, 0, 0]);
    this.visor = add(this.head, new THREE.BoxGeometry(0.36, 0.045, 0.02), red(5), [0, 0.1, 0.215]);
    this.visorGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow("#ff2a3d"), color: 0xff2a3d, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); this.visorGlow.scale.set(1.4, 0.5, 1); this.visorGlow.position.set(0, 0.1, 0.3); this.head.add(this.visorGlow);
    for (const s of [1, -1]) {
      const sh = new THREE.Group(); sh.position.set(s * 0.75, 0.8, 0); this.torso.add(sh); this.sh.push(sh);
      add(sh, new THREE.SphereGeometry(0.3, 16, 12), P, [0, 0, 0], [0, 0, 0], [1.1, 0.9, 1]);
      add(sh, new THREE.BoxGeometry(0.28, 0.75, 0.28), M, [0, -0.45, 0]);
      const el = new THREE.Group(); el.position.y = -0.85; sh.add(el); this.el.push(el);
      add(el, new THREE.BoxGeometry(0.34, 0.8, 0.34), P, [0, -0.4, 0]);
      add(el, new THREE.BoxGeometry(0.06, 0.5, 0.06), red(1.5), [s * 0.18, -0.4, 0.1]);
      const cl = new THREE.Group(); cl.position.y = -0.85; el.add(cl); this.claw.push(cl);
      for (let k = 0; k < 3; k++) add(cl, new THREE.ConeGeometry(0.05, 0.38, 6), M, [(k - 1) * 0.1, -0.18, 0.05], [Math.PI - 0.25, 0, 0]);
    }
    for (const s of [1, -1]) {
      const th = new THREE.Group(); th.position.set(s * 0.32, -0.1, 0); this.hips.add(th); this.th.push(th);
      add(th, new THREE.BoxGeometry(0.34, 0.75, 0.38), P, [0, -0.38, 0]);
      const kn = new THREE.Group(); kn.position.y = -0.78; th.add(kn); this.kn.push(kn);
      add(kn, new THREE.BoxGeometry(0.28, 0.75, 0.3), M, [0, -0.36, 0]);
      add(kn, new THREE.BoxGeometry(0.42, 0.14, 0.6), P, [0, -0.72, 0.1]);
    }
  }
  reset() { for (const g of [this.hips, this.torso, this.head, ...this.sh, ...this.el, ...this.claw, ...this.th, ...this.kn]) g.rotation.set(0, 0, 0); this.hips.position.y = 1.55; }
  /** heavy stomp walk / run */
  stride(phase: number, amt = 1, run = 0) {
    const a = phase * Math.PI * 2, A = 0.4 + run * 0.35;
    for (const i of [0, 1]) { const p = a + (i ? Math.PI : 0); this.th[i].rotation.x = -Math.sin(p) * A * amt - run * 0.2; this.kn[i].rotation.x = Math.max(0, Math.cos(p + 0.7)) * (0.7 + run * 0.6) * amt; this.sh[i].rotation.x = Math.sin(p) * (0.35 + run * 0.4) * amt; this.el[i].rotation.x = -0.3 - run * 0.6; }
    this.hips.position.y = 1.55 - Math.abs(Math.cos(a)) * 0.08 * amt; this.torso.rotation.y = Math.sin(a) * 0.08 * amt; this.torso.rotation.x = 0.1 + run * 0.25;
  }
  /** footstep impact strength at this phase (for camera shake + sound) */
  static stomp(phase: number) { const f = (phase * 2) % 1; return f < 0.08 ? 1 - f / 0.08 : 0; }
}
