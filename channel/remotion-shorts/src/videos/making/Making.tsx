// "How These Shorts Are Made": the cartoon-3d-short skill pipeline on a new story. Same post chain as Bridge.tsx:
// InkPass -> lens blur pre + main -> bloom (emissive) -> NEUTRAL tone map -> colour grade.
// inputProps { post: { dpr, msaa } } for the fast render (dpr 0.5 = 540 x 960 buffer, upscaled after).
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, getInputProps, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { InkPass, noInkFallback } from "../bridge/ink";
import { LensBlur } from "../bridge/lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH, gradeFor } from "../bridge/grade";
import { World } from "./world";
import { TOTAL, FLASH_AT, Shot, shotAt } from "./story";

export const MAKING_FRAMES = TOTAL;
type Post = { dpr?: number; msaa?: number; lens?: boolean };
const post = (): Post => (getInputProps() as { post?: Post }).post ?? {};

const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.5, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });
  const mip = b.mipmapBlurPass, setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};
const fwd = new THREE.Vector3();

const Inner: React.FC<{ shot: Shot }> = ({ shot }) => {
  const f = useCurrentFrame();
  const { camera, scene } = useThree();
  const world = useMemo(() => new World(), []);
  const P = useMemo(post, []);
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera),
    lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 }),
    bloom: makeBloom(),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(GRADES.day, GRADE_STRENGTH.day),
  }), [camera, scene]);
  useEffect(() => () => fx.ink.dispose(), [fx]);
  const useLens = P.lens !== false;
  const composer = useMemo(() => (
    <EffectComposer multisampling={P.msaa ?? 4}>
      <primitive object={fx.ink} dispose={null} />
      {useLens ? <primitive object={fx.lens.pre} dispose={null} /> : <></>}
      {useLens ? <primitive object={fx.lens.main} dispose={null} /> : <></>}
      <primitive object={fx.bloom} dispose={null} />
      <primitive object={fx.tone} dispose={null} />
      <primitive object={fx.grade} dispose={null} />
    </EffectComposer>
  ), [fx, P, useLens]);
  const cam = camera as THREE.PerspectiveCamera;
  const target = world.update(shot, f, cam, scene);
  noInkFallback(world.root);
  cam.getWorldDirection(fwd);
  fx.lens.focus = Math.max(0.3, target.clone().sub(cam.position).dot(fwd));
  fx.lens.cInf = shot.cInf;
  gradeFor(fx.grade, shot.light);
  return (<><primitive object={world.root} dispose={null} />{composer}</>);
};

export const MakingShort: React.FC = () => {
  const f = useCurrentFrame();
  const shot = shotAt(f);
  const P = post();
  const flash = f >= FLASH_AT && f < FLASH_AT + 4 ? [1, 0.75, 0.45, 0.2][f - FLASH_AT] : 0;
  return (
    <AbsoluteFill style={{ background: "#cfe3f2" }}>
      <ThreeCanvas key={shot.id} width={1080} height={1920} {...(P.dpr ? { dpr: P.dpr } : {})} shadows
        gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }} camera={{ fov: 40, near: 0.1, far: 1200 }}>
        <Inner shot={shot} />
      </ThreeCanvas>
      {flash > 0 && <AbsoluteFill style={{ background: "#ffffff", opacity: flash }} />}
    </AbsoluteFill>
  );
};
