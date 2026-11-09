import React from 'react';
import {AbsoluteFill, Audio, Easing, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {MONO} from './fonts';
import {Captions, Grade, Headline, Tag} from './components/Overlays';
import {SpaceShot} from './three/SpaceShot';
import {SurfaceShot} from './three/SurfaceShot';
import {CutawayShot} from './three/CutawayShot';
import {UndergroundShot} from './three/UndergroundShot';
import {Diagram} from './scenes/Diagram';
import {Brand} from './scenes/Brand';
import {B, END, clips, f} from './timeline';
import {C, lerpT} from './utils';

type StyleFn = (t: number, dur: number) => React.CSSProperties;
/** Time-windowed layer; `style` drives the transition (zoom-through, whip, iris, push…). */
const Layer: React.FC<{from: number; to: number; style?: StyleFn; children: React.ReactNode}> = ({from, to, style, children}) => (
  <Sequence from={f(from)} durationInFrames={f(to) - f(from)} layout="none">
    <Inner dur={to - from} style={style}>
      {children}
    </Inner>
  </Sequence>
);
const Inner: React.FC<{dur: number; style?: StyleFn; children: React.ReactNode}> = ({dur, style, children}) => {
  const t = useCurrentFrame() / 30;
  return <AbsoluteFill style={style ? style(t, dur) : undefined}>{children}</AbsoluteFill>;
};

const io = Easing.inOut(Easing.cubic);
const wordAt = (clip: number, word: string) => {
  const c = clips[clip];
  const w = c.words.find((x) => x.w.toLowerCase().replace(/[^a-z]/g, '') === word);
  return c.start + (w ? w.start : 0);
};

export const Episode: React.FC = () => {
  const [, b1, b2, b3, b4, b5, b6] = B;
  const detectAt = wordAt(1, 'detected');
  const hclAt = wordAt(2, 'hydrogen');
  const butAt = wordAt(4, 'but');
  const surfFrom = b2 - 0.3;
  const cutFrom = b3 + 0.1;
  const topFrom = b4 - 0.1;
  const diaFrom = b4 + 3.0;
  const undFrom = b5 - 0.3;

  return (
    <AbsoluteFill style={{background: '#020203'}}>
      {/* S1–S2: one continuous camera: approach → follow orbiter → orbital view of Alba Mons; ends in a zoom-through */}
      <Layer
        from={0}
        to={b2 + 0.7}
        style={(t, d) => {
          const z = lerpT(t, d - 1.0, d, 0, 1, Easing.in(Easing.cubic));
          return {transform: `scale(${1 + z * 0.6})`, filter: `blur(${z * 14}px) brightness(${1 + z * 0.6})`, opacity: 1 - lerpT(t, d - 0.35, d)};
        }}
      >
        <SpaceShot b1={b1} b2={b2} detectAt={detectAt} />
      </Layer>

      {/* S3: dive to the fissure (continues the zoom), exits with a whip pan */}
      <Layer
        from={surfFrom}
        to={b3 + 0.6}
        style={(t, d) => {
          const e = 1 - lerpT(t, 0, 1.0, 0, 1, Easing.out(Easing.cubic));
          const w = lerpT(t, d - 0.55, d, 0, 1, Easing.in(Easing.cubic));
          return {
            opacity: Math.min(lerpT(t, 0, 0.35), 1 - lerpT(t, d - 0.15, d)),
            transform: `translateX(${-w * 700}px) scale(${1 + e * 0.35}, ${1 + e * 0.35}) scaleX(${1 + w * 0.25})`,
            filter: `blur(${e * 12 + w * 16}px)`,
          };
        }}
      >
        <SurfaceShot mode="dive" dur={b3 + 0.6 - surfFrom} heroAt={hclAt - surfFrom + 0.2} />
      </Layer>

      {/* S4: cutaway, whips in from the right, pushes into the hypothetical chamber */}
      <Layer
        from={cutFrom}
        to={b4 + 0.7}
        style={(t) => {
          const w = 1 - lerpT(t, 0, 0.6, 0, 1, Easing.out(Easing.cubic));
          return {transform: `translateX(${w * 700}px) scaleX(${1 + w * 0.25})`, filter: `blur(${w * 16}px)`, opacity: lerpT(t, 0, 0.2)};
        }}
      >
        <CutawayShot revealAt={b3 + 3.2 - cutFrom} pushAt={b3 + 2.6 - cutFrom} dur={b4 + 0.7 - cutFrom} />
      </Layer>

      {/* S5a: top-down surface with plume, opens with an iris from the fissure */}
      <Layer
        from={topFrom}
        to={diaFrom + 0.8}
        style={(t) => {
          const r = lerpT(t, 0, 0.9, 0, 1, io);
          return {clipPath: `circle(${r * 80}% at 50% 50%)`};
        }}
      >
        <SurfaceShot mode="top" dur={diaFrom + 0.8 - topFrom} />
      </Layer>

      {/* S5b: observed vs inferred diagram, ground-line wipe up; exits pushed upward by the descent */}
      <Layer
        from={diaFrom}
        to={b5 + 0.9}
        style={(t, d) => {
          const w = lerpT(t, 0, 0.8, 0, 1, io);
          const up = lerpT(t, d - 1.2, d, 0, 1, io);
          return {clipPath: `inset(${(1 - w) * 100}% 0 0 0)`, transform: `translateY(${-up * 1920}px)`};
        }}
      >
        <Diagram dur={b5 + 0.9 - diaFrom} noEruptAt={butAt - diaFrom + 0.4} />
      </Layer>
      <WipeLine at={diaFrom} />

      {/* S6: continuous descent beneath the surface (rises in under the diagram) */}
      <Layer
        from={undFrom}
        to={b6 + 0.3}
        style={(t, d) => {
          const up = 1 - lerpT(t, 0, 1.2, 0, 1, io);
          return {transform: `translateY(${up * 1920}px)`, opacity: 1 - lerpT(t, d - 0.6, d)};
        }}
      >
        <UndergroundShot dur={b6 + 0.3 - undFrom} />
      </Layer>

      {/* S7: brand */}
      <Layer from={b6 - 0.1} to={END} style={(t) => ({opacity: lerpT(t, 0, 0.4)})}>
        <Brand dur={END - b6 + 0.1} />
      </Layer>

      <Grade />

      {/* Headlines never repeat the narration verbatim; captions carry the narration. */}
      <Headline text="MARS ISN'T DEAD?" from={0.35} to={b1 - 0.1} y={300} size={96} />
      <Headline text="A MYSTERIOUS GAS DETECTED" from={b1 + 0.5} to={b2 - 0.2} />
      <Headline text="HYDROGEN CHLORIDE (HCl)" from={b2 + 0.9} to={b3 - 0.05} />
      <Legend from={b2 + 1.6} to={b3 - 0.05} />
      <Headline text="POSSIBLE MAGMA BELOW" from={b3 + 3.3} to={b4 - 0.05} />
      <Headline text="NO ERUPTION OBSERVED" from={butAt - 0.1} to={b5 - 0.1} color={C.ivory} />
      <Headline text="COULD LIFE EXIST BELOW?" from={b5 + 0.6} to={b6 - 0.3} />

      <Tag text="EXOMARS TRACE GAS ORBITER · ARTIST'S RENDERING" kind="render" from={b1 + 0.6} to={detectAt + 1.6} />
      <Tag text="ALBA MONS REGION · HCl DETECTED" kind="observed" from={detectAt + 1.2} to={b2 + 0.2} y={1180} />
      <Tag text="MOLECULE VISUALIZATION" kind="viz" from={b2 + 0.9} to={b3 - 0.1} />
      <Tag text="SCIENTIFIC VISUALIZATION · NOT TO SCALE" kind="viz" from={b3 + 0.4} to={b4 + 0.2} />
      <Tag text="GAS ABOVE FISSURES · OBSERVED" kind="observed" from={b4 + 0.5} to={diaFrom + 0.3} />
      <Tag text="HYPOTHETICAL ILLUSTRATION" kind="viz" from={b5 + 0.4} to={b6 - 0.3} />
      <Captions />

      {/* Audio for Studio preview; final mix is done with FFmpeg (scripts/mix.sh). */}
      {clips.map((c) => (
        <Sequence key={c.file} from={f(c.start)} layout="none">
          <Audio src={staticFile(`audio/${c.file}`)} />
        </Sequence>
      ))}
      <Audio src={staticFile('audio/fx.wav')} volume={0.8} />
    </AbsoluteFill>
  );
};

const Legend: React.FC<{from: number; to: number}> = ({from, to}) => {
  const t = useCurrentFrame() / 30;
  const o = Math.min(lerpT(t, from, from + 0.5), 1 - lerpT(t, to - 0.4, to));
  if (o <= 0) return null;
  const dot = (c: string, s: number) => <span style={{display: 'inline-block', width: s, height: s, borderRadius: s, background: c, marginRight: 10, verticalAlign: 'middle'}} />;
  return (
    <div style={{position: 'absolute', top: 500, left: 90, width: 860, textAlign: 'center', opacity: o, fontFamily: MONO, fontSize: 26, color: C.ivory, letterSpacing: '0.08em'}}>
      {dot('#f2efe8', 16)}H · HYDROGEN&nbsp;&nbsp;&nbsp;{dot('#9fd18a', 24)}Cl · CHLORINE
    </div>
  );
};

/** Glowing horizon line that leads the ground-line wipe. */
const WipeLine: React.FC<{at: number}> = ({at}) => {
  const t = useCurrentFrame() / 30;
  const p = lerpT(t, at, at + 0.8, 0, 1, io);
  const o = Math.min(lerpT(t, at, at + 0.1), 1 - lerpT(t, at + 0.7, at + 0.9));
  if (o <= 0) return null;
  return <div style={{position: 'absolute', left: 0, width: 1080, top: 1920 * (1 - p) - 2, height: 4, background: C.lava, boxShadow: `0 0 24px 6px rgba(255,122,42,0.7)`, opacity: o}} />;
};
