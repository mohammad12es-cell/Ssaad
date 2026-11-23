// The plaza for "How These Shorts Are Made": painted town houses (bridge/build.ts house()), HD grass + cobbles,
// sky shader + clouds, two-tone light rig from bridge/lights.ts, 3D props (stage, monitor, camera, flipbook, alarm
// clock, sine-wave ribbons) and the cast as lit cards (bridge/cast.ts Actor) and unlit effect cards (Fx).
import * as THREE from "three";
import { Batch, lam, house, V } from "../bridge/build";
import { ctex, rep, cobbleHD, grassHD, planksHD, cloudHD } from "../bridge/paint";
import { Pen } from "../bridge/toon";
import { LIGHTS, LOOK } from "../bridge/lights";
import { TONE, CHAR, twoTone, untone } from "../bridge/shade";
import { NOINK } from "../bridge/ink";
import { Pool, Actor, Fx } from "../bridge/cast";
import { SHOTS, Shot, STAGE, MONITOR, CAMERA_PROP, BEAT, FPS, V3, clamp01, sstep, lerp, pipRunX, kick } from "./story";
import { drawPip, drawPebble, codePanel, disc, bubble, filmFrame, counter, flash, flipbook, PipPose } from "./draw";

type Place = { key: string; draw: (p: Pen) => void; x: number; y: number; z: number; scale?: number; mirror?: boolean; size?: [number, number, number] };
type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; rot?: number; soft?: boolean; opacity?: number };

const mat = (key: string, color: string) => lam(key, () => ({ color }));
const pipCard = (o: PipPose) => ({ key: `pip|${o.expr ?? "smile"}|${(o.lean ?? 0).toFixed(2)}|${o.wave === undefined ? "-" : (o.wave % 6.283).toFixed(1)}`, draw: (p: Pen) => drawPip(p, o) });
const pebCard = (shades: boolean, nod = 0) => ({ key: `peb|${shades}|${nod.toFixed(0)}`, draw: (p: Pen) => drawPebble(p, { shades, nod }) });
const BODY: [number, number, number] = [450, 750, 0.75];

const CODE = [
  ["<circle r=\"60\" />", "tl.to(pip, { x: 900 })", "fps: 30", "pip.blink()"],
  ["const frog = circle()", "eyes.push(circle())", "smile = curve(25,155)", "render()"],
  ["sin(2*PI*f*t)", "notes = [G, B, D]", "music.mix()", "// no instruments"],
];

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
  private sun = new THREE.DirectionalLight("#fff0d6", 2.6);
  private skyMat: THREE.ShaderMaterial; private sky: THREE.Mesh;
  private fog = new THREE.Fog("#bccbec", 25, 300);
  private clouds: THREE.Mesh[] = [];
  private sunCache = new Map<number, THREE.Vector3>();
  private screen: THREE.Mesh; private screens: Record<string, THREE.Texture>;
  private monitor = new THREE.Group(); private camProp = new THREE.Group(); private camFlash: THREE.Sprite;
  private book = new THREE.Group(); private pages: THREE.Group[] = [];
  private clock = new THREE.Group(); private ribbons: THREE.Mesh[] = [];
  private v = new THREE.Vector3();

  constructor() {
    const R = this.root;
    // ---- sky (5 stops by elevation, tone-map-inverted), sun, hemisphere ----
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() }, c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el)); c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el)); c = mix(c, c4, smoothstep(e.z, e.w, el)); gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK); R.add(this.sky);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048);
    R.add(this.hemi, this.sun, this.sun.target);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.4, d = 420 + (i % 3) * 50, w = 110 + (i % 4) * 25;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: cloudHD(i % 4, LOOK.day.cloud), transparent: true, depthWrite: false, fog: false }));
      m.position.set(Math.cos(a) * d, 90 + (i % 3) * 30, Math.sin(a) * d); m.scale.set(w, w / 2, 1); m.layers.set(NOINK);
      this.clouds.push(m); R.add(m);
    }
    // ---- ground + plaza + houses (merged batch) ----
    const b = new Batch();
    const grass = new THREE.PlaneGeometry(400, 400); grass.rotateX(-Math.PI / 2);
    b.add(grass, lam("grassHD", () => ({ map: rep(grassHD(), 100, 100) })));
    const plaza = new THREE.CircleGeometry(13, 64); plaza.rotateX(-Math.PI / 2); plaza.translate(0, 0.01, 0);
    b.add(plaza, lam("cobbleHD", () => ({ map: rep(cobbleHD(), 4, 4) })));
    const st = new THREE.CylinderGeometry(2.3, 2.45, STAGE[1], 48);
    b.add(st, lam("planksHD", () => ({ map: rep(planksHD(), 2, 2) })), new THREE.Matrix4().makeTranslation(0, STAGE[1] / 2, 0));
    const H = [7, 8.4, 9.8];
    [-12.5, -5.5, 1.5, 8.5].forEach((x, i) => house(b, x, -14.5, 0, 6.6, 7, H[i % 3], i, 0));
    [-6, 1].forEach((z, i) => house(b, -15, z, Math.PI / 2, 6.6, 7, H[(i + 1) % 3], 4 + i, 0));
    [-6, 1].forEach((z, i) => house(b, 15, z, -Math.PI / 2, 6.6, 7, H[(i + 2) % 3], 6 + i, 0));
    // round trees around the plaza
    for (const [x, z] of [[-10, 9], [10, 10], [-17, 14], [17, -12], [-18, -11]]) {
      b.add(new THREE.CylinderGeometry(0.22, 0.3, 2.4, 10), mat("trunk", "#7a5236"), new THREE.Matrix4().makeTranslation(x, 1.2, z));
      b.add(new THREE.IcosahedronGeometry(1.9, 1), mat("leaf", "#4e9a45"), new THREE.Matrix4().makeTranslation(x, 3.4, z));
    }
    b.build(R);
    // ---- monitor (the computer) ----
    const M = this.monitor;
    M.add(new THREE.Mesh(new THREE.BoxGeometry(3.0, 2.0, 0.22), mat("monFrame", "#2b2f3d")).translateY(2.0));
    M.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.0, 0.3), mat("monFrame", "#2b2f3d")).translateY(0.5));
    M.add(new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 0.8), mat("monFrame", "#2b2f3d")).translateY(0.05));
    this.screens = {
      code: ctex("scrCode", 800, 520, (g) => codePanel(new Pen(g), CODE[0], 800, 520)),
      smile: ctex("scrSmile", 800, 520, (g) => { g.fillStyle = "#1d2033"; g.fillRect(0, 0, 800, 520); const p = new Pen(g); p.dot(300, 200, 34, "#7ed957"); p.dot(500, 200, 34, "#7ed957"); p.arc(400, 260, 150, 110, 25, 155, 26, "#7ed957"); }),
      what: ctex("scrWhat", 800, 520, (g) => { g.fillStyle = "#1d2033"; g.fillRect(0, 0, 800, 520); const p = new Pen(g); p.dot(300, 200, 34, "#7ed957"); p.dot(500, 200, 34, "#7ed957"); p.stroke([[290, 360], [510, 360]], 24, "#7ed957"); g.font = "bold 160px sans-serif"; g.fillStyle = "#7ed957"; g.fillText("?", 600, 170); }),
    };
    this.screen = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 1.72), new THREE.MeshBasicMaterial({ map: this.screens.smile, toneMapped: true }));
    this.screen.position.set(0, 2.0, 0.115); this.screen.layers.set(NOINK); M.add(this.screen);
    M.position.set(...MONITOR); M.rotation.y = 0.45; R.add(M);
    // ---- the camera prop (the browser taking a picture of every frame) ----
    const P = this.camProp;
    P.add(new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.75, 0.7), mat("camBody", "#3a3f52")));
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.45, 32), mat("camLens", "#1e2130")); lens.rotation.x = Math.PI / 2; lens.position.z = 0.55; P.add(lens);
    P.add(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.2), mat("camTop", "#e2453c")).translateY(0.46).translateX(-0.25));
    for (const s of [-1, 1]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 8), mat("tripod", "#2b2f3d")); leg.position.set(s * 0.35, -0.95, 0); leg.rotation.z = s * 0.25; P.add(leg); }
    this.camFlash = new THREE.Sprite(new THREE.SpriteMaterial({ map: ctex("flashTex", 512, 512, (g) => flash(new Pen(g))), color: new THREE.Color(4, 4, 3.6), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.camFlash.position.set(0, 0, 0.9); this.camFlash.layers.set(NOINK); P.add(this.camFlash);
    P.position.set(CAMERA_PROP[0], 1.75, CAMERA_PROP[2]); P.lookAt(0, 1.0, 0); R.add(P);
    // ---- flipbook: spine at the back edge, pages flip toward the camera ----
    const Bk = this.book;
    Bk.add(new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.12, 1.2), mat("bookCover", "#e2453c")).translateY(0.06));
    for (let i = 0; i < 6; i++) {
      const pivot = new THREE.Group(); pivot.position.set(0, 0.13 + i * 0.008, -0.6);
      const tex = ctex(`page${i}`, 512, 360, (g) => { g.fillStyle = "#fbf6ea"; g.fillRect(0, 0, 512, 360); g.save(); g.translate(150 + i * 28, 30); g.scale(0.3, 0.3); drawPip(new Pen(g), { expr: i % 2 ? "grin" : "smile", lean: (i % 3 - 1) * 0.12 }); g.restore(); });
      const page = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.1), new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide }));
      page.rotation.x = -Math.PI / 2; page.position.z = 0.56; pivot.add(page); Bk.add(pivot); this.pages.push(pivot);
    }
    Bk.position.set(0, STAGE[1], 0.55); Bk.rotation.y = 0; R.add(Bk);
    // ---- alarm clock ----
    const K = this.clock;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.32, 48), mat("clockBody", "#e2453c")); body.rotation.x = Math.PI / 2; body.position.y = 0.95; K.add(body);
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.52, 48), new THREE.MeshBasicMaterial({ map: ctex("clockFace", 512, 512, (g) => {
      g.fillStyle = "#fffaf0"; g.beginPath(); g.arc(256, 256, 250, 0, Math.PI * 2); g.fill(); const p = new Pen(g);
      for (let h = 0; h < 12; h++) { const a = (h / 12) * Math.PI * 2; p.dot(256 + 200 * Math.sin(a), 256 - 200 * Math.cos(a), 12); }
      p.stroke([[256, 256], [256, 110]], 18); p.stroke([[256, 256], [350, 300]], 14); p.dot(256, 256, 18);
    }) }));
    face.position.set(0, 0.95, 0.165); K.add(face);
    for (const s of [-1, 1]) {
      const bell = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat("bell", "#ffd166")); bell.position.set(s * 0.42, 1.48, 0); bell.rotation.z = -s * 0.45; K.add(bell);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.42, 8), mat("clockLeg", "#2b2f3d")); leg.position.set(s * 0.36, 0.25, 0); leg.rotation.z = s * 0.4; K.add(leg);
    }
    K.position.set(0.9, STAGE[1], 0); R.add(K);
    // ---- sine-wave ribbons (emissive HDR: they bloom) ----
    [["#7ed957", 3.0], ["#ffd166", 4.2], ["#8ec5ff", 5.4]].forEach(([c, y], i) => {
      const m = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: new THREE.Color(c as string).multiplyScalar(1.6), fog: false }));
      m.userData.y = y; m.userData.i = i; m.layers.set(NOINK); this.ribbons.push(m); R.add(m);
    });
    R.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && !(m.material as THREE.Material).transparent) { m.castShadow = true; m.receiveShadow = true; } });
  }

  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  private shotSun(s: Shot) {
    let v = this.sunCache.get(s.id);
    if (v) return v;
    const c = s.cam(Math.floor((s.a + s.b) / 2)), L = LIGHTS[s.light];
    let fx = c.look[0] - c.pos[0], fz = c.look[2] - c.pos[2]; const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(L.az), el = THREE.MathUtils.degToRad(L.el);
    v = new THREE.Vector3((fx * Math.cos(az) - fz * Math.sin(az)) * Math.cos(el), Math.sin(el), (fz * Math.cos(az) + fx * Math.sin(az)) * Math.cos(el)).normalize();
    this.sunCache.set(s.id, v);
    return v;
  }

  /** pose the world for frame f of shot s; returns the lens focus point */
  update(s: Shot, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene): THREE.Vector3 {
    const c = s.cam(f), L = LIGHTS[s.light], K = LOOK[s.light], t = f / FPS, kk = kick(f);
    cam.position.set(c.pos[0], c.pos[1] + kk, c.pos[2]); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll + kk * 0.5);
    cam.fov = c.fov; cam.near = 0.1; cam.far = 1200; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); cam.layers.enable(NOINK);
    const focus = V(...c.look), dist = cam.position.distanceTo(focus), sunDir = this.shotSun(s);
    // light rig (same uniforms as bridge/world.ts)
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const Rr = THREE.MathUtils.clamp(dist * 1.2 + 8, 14, 60);
    this.sun.position.copy(focus).addScaledVector(sunDir, 200); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera; sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 420; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad; CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((d) => THREE.MathUtils.degToRad(d)); su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar; scene.fog = this.fog; scene.background = null;
    for (const m of this.clouds) m.lookAt(cam.position.x, m.position.y, cam.position.z);

    // ---- props visibility + animation ----
    const id = s.id;
    this.monitor.visible = id === 8 || id === 9 || id === 12;
    (this.screen.material as THREE.MeshBasicMaterial).map = id === 9 && f > BEAT.joke + 20 ? this.screens.what : this.screens.smile;
    this.camProp.visible = id === 7 || id === 12;
    const snap = BEAT.snaps.map((a) => f - a).filter((d) => d >= 0 && d < 6)[0];
    this.camFlash.visible = id === 7 && snap !== undefined;
    if (this.camFlash.visible) this.camFlash.scale.setScalar(2.2 * (1 - snap! / 6) + 0.4);
    this.book.visible = false;
    this.pages.forEach((pg, i) => { const k = sstep((f - BEAT.flip - i * 9) / 8); pg.rotation.x = -k * Math.PI * 0.98; });
    this.clock.visible = id === 11;
    const ring = f >= BEAT.ring && f < BEAT.ring + 30;
    this.clock.rotation.z = ring ? 0.12 * Math.sin(f * 2.4) : 0;
    this.clock.position.y = STAGE[1] + (ring ? 0.05 * Math.abs(Math.sin(f * 1.7)) : 0);
    const showRib = id === 6;
    this.ribbons.forEach((m) => {
      const i = m.userData.i as number, grow = clamp01((f - BEAT.sine - i * 14) / 20);
      m.visible = showRib && grow > 0;
      if (!m.visible) return;
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 80; k++) { const u = k / 80, x = -9 + 18 * u * grow; pts.push(V(x, m.userData.y + 0.6 * Math.sin(u * 14 * (1 + i * 0.4) - t * 3), -2 - i * 0.6)); }
      m.geometry.dispose(); m.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.09, 8);
    });

    // ---- cast + effect cards ----
    const places: Place[] = [], fxs: FxPlace[] = [];
    const on = STAGE[1], blink = (Math.floor(t * 10) % 23) === 0;
    const pip = (x: number, z: number, o: PipPose, y = on, scale = 0.62) => places.push({ ...pipCard({ expr: blink && !o.expr ? "blink" : o.expr, ...o }), x, y, z, scale, size: BODY });
    const peb = (x: number, z: number, shades = true, nod = 0, y = on, scale = 0.55, mirror = false) => places.push({ ...pebCard(shades, nod), x, y, z, scale, mirror, size: BODY });
    const hop = (f0: number, period = 12, h = 0.35) => Math.abs(Math.sin(((f - f0) / period) * Math.PI)) * h;

    if (id === 1) pip(0, 0, { expr: f > 70 ? "grin" : "smile" });
    if (id === 2) {
      pip(0, 0, { expr: "smile" });
      CODE.forEach((lines, i) => {
        const a = (i / 3) * Math.PI * 2 + t * 0.4, appear = clamp01((f - 140 - i * 10) / 12);
        if (appear > 0) fxs.push({ key: `code${i}`, cw: 700, ch: 420, draw: (p) => codePanel(p, lines), x: Math.cos(a) * 1.5, y: 1.25 + i * 0.25, z: Math.sin(a) * 1.5, w: 1.1 * appear, h: 0.66 * appear });
      });
    }
    if (id === 3) {
      const k = clamp01((f - 230) / 190);
      pip(lerp(-6.5, 0.9, k), 1.2, { lean: k < 1 ? 0.15 : 0, expr: k < 1 ? "smile" : "grin" }, (k < 1 ? hop(230, 9, 0.45) : 0) + (k >= 0.93 ? on : 0), 0.6);
      peb(lerp(-9, 0, clamp01((f - 230) / 200)), 0.2, f > 400, 0, f > 425 ? on : 0, 0.55);
    }
    if (id === 4) {
      const bx = 0, by = 0.95, z = 0.05;
      const a1 = sstep((f - BEAT.body) / 16), a2 = sstep((f - BEAT.eyes) / 12), a3 = sstep((f - BEAT.smile) / 10);
      if (f < BEAT.pipDone) {
        if (a1 > 0) fxs.push({ key: "discBody", cw: 500, ch: 420, draw: (p) => disc(p, "body"), x: bx, y: lerp(3.5, by, a1), z, w: 1.25, h: 1.05 });
        for (const s2 of [-1, 1]) if (a2 > 0) fxs.push({ key: "discEye", cw: 240, ch: 240, draw: (p) => disc(p, "eye"), x: bx + s2 * lerp(1.6, 0.36, a2), y: lerp(2.6, 1.42, a2), z: z + 0.02, w: 0.5, h: 0.5 });
        if (a3 > 0) fxs.push({ key: "discSmile", cw: 300, ch: 140, draw: (p) => disc(p, "smile"), x: bx, y: by + 0.05, z: z + 0.03, w: 0.62 * a3, h: 0.3 * a3 });
      } else pip(0, 0, { expr: "grin" }, on + hop(BEAT.pipDone, 8, 0.2) * (f < BEAT.pipDone + 8 ? 1 : 0));
    }
    if (id === 5) {
      const px = pipRunX(f);
      for (let g = 1; g <= 6; g++) {
        const gx = pipRunX(f - g * 4);
        if (Math.abs(gx - px) > 0.05) fxs.push({ key: "ghost", cw: 300, ch: 500, draw: (p) => { p.g.scale(0.5, 0.5); drawPip(p, { lean: 0.15 }); }, x: gx, y: 0.75, z: 3 - 0.01 * g, w: 0.8, h: 1.34, soft: true, opacity: 0.35 - g * 0.045 });
      }
      pip(px, 3, { lean: 0.15 }, hop(640, 8, 0.4), 0.62);
    }
    if (id === 6) {
      peb(-0.75, 0.8, true, Math.sin(t * 7) * 18, on, 0.55);
      pip(0.75, 0.6, { expr: "grin" }, on + hop(745, 15, 0.12));
    }
    if (id === 7) {
      const snapping = snap !== undefined;
      pip(0, 0, { expr: snapping ? "grin" : "smile", lean: snapping ? 0.12 : 0 });
      if (f >= BEAT.strips) for (let k = 0; k < 5; k++) {
        const u = clamp01((f - BEAT.strips - k * 6) / 22);
        if (u > 0) fxs.push({ key: `film${k}`, cw: 400, ch: 300, draw: (p) => filmFrame(p, k), x: lerp(CAMERA_PROP[0], -1.2 + k * 0.62, u), y: lerp(1.75, 2.7, u), z: lerp(CAMERA_PROP[2], -0.6, u), w: 0.62, h: 0.47 });
      }
    }
    if (id === 8) pip(-2.6, 0.4, { expr: "smile" }, 0, 0.55);
    if (id === 9) {
      pip(-0.6, 0.6, { expr: f > BEAT.joke ? "laugh" : "smile" }, 0 + hop(BEAT.joke, 7, 0.12) * (f > BEAT.joke ? 1 : 0), 0.6);
      if (f > BEAT.joke) fxs.push({ key: "haha", cw: 600, ch: 400, draw: (p) => bubble(p, "HA HA!"), x: -0.2, y: 2.15, z: 0.7, w: 1.2, h: 0.8 });
    }
    if (id === 10) {
      pip(-1.35, 0.1, { expr: f > BEAT.flip ? "grin" : "smile" }, on, 0.5);
      const k = f < BEAT.flip ? 0 : Math.floor((f - BEAT.flip) / 3) % 6, curl = f < BEAT.flip ? 0 : ((f - BEAT.flip) % 3) / 3;
      fxs.push({ key: `book${k}|${curl.toFixed(2)}`, cw: 700, ch: 500, draw: (p) => flipbook(p, k, curl), x: 0.35, y: 1.2, z: 0.35, w: 1.5, h: 1.07 });
    }
    if (id === 11) {
      pip(-0.9, 0.2, { expr: f >= BEAT.ring ? "shock" : "smile" }, on + (f >= BEAT.ring && f < BEAT.ring + 20 ? hop(BEAT.ring, 6, 0.35) : 0));
      if (f >= BEAT.counter) { const u = sstep((f - BEAT.counter) / 10); fxs.push({ key: "counter", cw: 700, ch: 240, draw: (p) => counter(p, "1,371"), x: 0.3, y: 2.35, z: 0, w: 1.4 * u, h: 0.48 * u }); }
    }
    if (id === 12) {
      pip(-0.8, 0.2, { expr: "grin", wave: t * 6 });
      peb(0.8, 0.3, true, Math.sin(t * 4) * 10, on, 0.55);
    }

    // ---- bind cards (same pooling as bridge/world.ts) ----
    let ai = 0;
    const used: Actor[] = [];
    for (const p of places) {
      const a = this.actor(ai++), sc2 = p.scale ?? 1, [w, h, k] = p.size ?? BODY;
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true; a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, Math.atan2(cam.position.x - p.x, cam.position.z - p.z), 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2); a.mesh.castShadow = L.actorShadow;
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0;
    const fused: { e: Fx; p: FxPlace }[] = [];
    for (const p of fxs) {
      const e = this.fx(fi++);
      e.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e.use(!!p.soft); e.mesh.visible = true; e.mesh.position.set(p.x, p.y, p.z);
      e.mesh.quaternion.copy(cam.quaternion); e.mesh.rotateZ(p.rot ?? 0); e.mesh.scale.set(Math.max(1e-3, p.w), Math.max(1e-3, p.h), 1);
      fused.push({ e, p });
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const { e, p } of fused) { e.bind(); e.soft.opacity = p.opacity ?? 1; }
    // focus: on the main character's eyes for close shots
    return focus;
  }
}
