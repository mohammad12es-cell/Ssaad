import React from "react";
import { Composition, AbsoluteFill } from "remotion";
import { SceneCanvas, Builder } from "./components/SceneCanvas";
import { lineup, face, street } from "./scenes/tests";
import { EPISODES } from "./episodes";
import { Subtitles } from "./components/Subtitles";

const Test: React.FC<{ b: Builder }> = ({ b }) => <AbsoluteFill style={{ background: "#000" }}><SceneCanvas build={b} /></AbsoluteFill>;
export const Root: React.FC = () => (
  <>
    <Composition id="LookdevLineup" component={() => <Test b={lineup} />} durationInFrames={60} fps={30} width={1080} height={1920} />
    {[0, 1, 2, 3].map((i) => <Composition key={i} id={"LookdevFace" + i} component={() => <Test b={face(i)} />} durationInFrames={60} fps={30} width={1080} height={1920} />)}
    {[0, 1].map((i) => <Composition key={'s' + i} id={"LookdevStreet" + i} component={() => <Test b={street(i)} />} durationInFrames={60} fps={30} width={1080} height={1920} />)}
    {EPISODES.map((e) => <Composition key={'ep' + e.n} id={`Ep${String(e.n).padStart(2, "0")}`} component={() => <Test b={e.build} />} durationInFrames={900} fps={30} width={1080} height={1920} />)}
    {Array.from({ length: 10 }, (_, i) => i + 1).flatMap((n) => (["fa", "en"] as const).map((lang) => (
      <Composition key={`s${n}${lang}`} id={`Subs${lang.toUpperCase()}${String(n).padStart(2, "0")}`} component={() => <Subtitles ep={n} lang={lang} />} durationInFrames={900} fps={30} width={1080} height={1920} />
    )))}
  </>
);
