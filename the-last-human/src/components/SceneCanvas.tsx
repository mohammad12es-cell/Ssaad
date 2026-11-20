// Bridges Remotion's frame clock to an imperative Three.js Stage.
// The scene is built once per render tab, then every frame is rendered synchronously from `t`,
// so the output is fully deterministic and every episode can be rendered independently.
import React, { useLayoutEffect, useRef, useState } from "react";
import { useCurrentFrame, delayRender, continueRender, useVideoConfig, getInputProps } from "remotion";
import { Stage } from "../engine/Stage";
import "@fontsource/orbitron/500.css";
import "@fontsource/orbitron/700.css";
import "@fontsource/orbitron/900.css";
import "@fontsource/rajdhani/500.css";
import "@fontsource/rajdhani/600.css";
import "@fontsource/rajdhani/700.css";

export type Builder = (stage: Stage) => (t: number) => void;
export const fontsReady = () => Promise.all(["500 40px Orbitron", "700 40px Orbitron", "900 40px Orbitron", "500 40px Rajdhani", "600 40px Rajdhani", "700 40px Rajdhani"].map((f) => document.fonts.load(f))).then(() => document.fonts.ready);

export const SceneCanvas: React.FC<{ build: Builder; offset?: number }> = ({ build, offset = 0 }) => {
  const frame = useCurrentFrame(); const { fps, width, height } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null); const hudRef = useRef<HTMLCanvasElement>(null);
  const st = useRef<{ stage: Stage; update: (t: number) => void } | null>(null);
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender("build scene"));
  useLayoutEffect(() => {
    let dead = false;
    fontsReady().then(() => {
      if (dead) return;
      const q = (getInputProps() as any).quality ?? {}; const stage = new Stage(ref.current!, width, height, q); stage.hud = hudRef.current!.getContext("2d")!;
      st.current = { stage, update: build(stage) };
      setReady(true); continueRender(handle);
    });
    return () => { dead = true; };
  }, []);
  useLayoutEffect(() => {
    if (!ready || !st.current) return;
    const t = frame / fps + offset;
    const h = st.current.stage.hud; h.setTransform(1, 0, 0, 1, 0, 0); h.clearRect(0, 0, width, height); h.globalAlpha = 1;
    st.current.update(t); st.current.stage.render(t);
  }, [frame, ready]);
  return (<>
    <canvas ref={ref} width={width} height={height} style={{ position: "absolute", inset: 0, width, height }} />
    <canvas ref={hudRef} width={width} height={height} style={{ position: "absolute", inset: 0, width, height }} />
  </>);
};
