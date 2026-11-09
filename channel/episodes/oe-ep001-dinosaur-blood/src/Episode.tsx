import React from 'react';
import {AbsoluteFill, Audio, Easing, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {DISPLAY, MONO} from './fonts';
import {Grade, Headline, Subtitles, VizTag} from './components/Overlays';
import {Hook} from './scenes/Hook';
import {Landscape} from './scenes/Landscape';
import {Debate} from './scenes/Debate';
import {Ending} from './scenes/Ending';
import {FemurShot} from './three/FemurShot';
import {CanalShot} from './three/CanalShot';
import {HemeShot} from './three/HemeShot';
import {CellInset} from './three/CellInset';
import {B, END, clips, f} from './timeline';
import {C, lerpT} from './utils';

/** A time-windowed layer with crossfade in/out (absolute seconds). */
const Layer: React.FC<{
  from: number;
  to: number;
  fi?: number;
  fo?: number;
  style?: (t: number, abs: number) => React.CSSProperties;
  children: React.ReactNode;
}> = ({from, to, fi = 0.5, fo = 0.5, style, children}) => (
  <Sequence from={f(from)} durationInFrames={f(to) - f(from)} layout="none">
    <LayerInner from={from} to={to} fi={fi} fo={fo} style={style}>
      {children}
    </LayerInner>
  </Sequence>
);
const LayerInner: React.FC<{from: number; to: number; fi: number; fo: number; style?: (t: number, abs: number) => React.CSSProperties; children: React.ReactNode}> = ({
  from,
  to,
  fi,
  fo,
  style,
  children,
}) => {
  const t = useCurrentFrame() / 30;
  const dur = to - from;
  const o = Math.min(fi > 0 ? lerpT(t, 0, fi) : 1, fo > 0 ? 1 - lerpT(t, dur - fo, dur) : 1);
  return <AbsoluteFill style={{opacity: o, ...(style ? style(t, from + t) : {})}}>{children}</AbsoluteFill>;
};

export const Episode: React.FC = () => {
  const [, b1, b2, b3, b4, b5] = B;
  const femurFrom = b1 + 2.7;
  const canalFrom = b2 + 0.9;
  const canalTo = b4 + 2.4;
  const hemeFrom = b2 + 3.3;
  const insetFrom = b3 + 4.3;
  return (
    <AbsoluteFill style={{background: C.black}}>
      {/* ── Picture layers ── */}
      <Layer from={0} to={b1 + 0.3} fi={0} fo={0.3}>
        <Hook dur={b1 + 0.3} />
      </Layer>
      <Layer from={b1} to={b1 + 3.2} fi={0.3} fo={0.5}>
        <Landscape dur={3.2} />
      </Layer>
      <Layer
        from={femurFrom}
        to={b2 + 1.35}
        fi={0.5}
        fo={0.45}
        style={(t) => {
          const dive = lerpT(t, b2 - femurFrom + 0.6, b2 - femurFrom + 1.35, 0, 1, Easing.in(Easing.cubic));
          return {transform: `scale(${1 + dive * 0.35})`, filter: `blur(${dive * 8}px) brightness(${1 + dive * 0.8})`};
        }}
      >
        <FemurShot orbitEnd={b2 - femurFrom} diveEnd={b2 - femurFrom + 1.3} />
      </Layer>
      <Layer
        from={canalFrom}
        to={canalTo}
        fi={0.5}
        fo={0.6}
        style={(t, abs) => {
          const enter = 1 - lerpT(t, 0, 0.9, 0, 1, Easing.out(Easing.cubic));
          const dofHeme = Math.min(lerpT(abs, hemeFrom, hemeFrom + 1), 1 - lerpT(abs, b3 - 0.4, b3 + 0.3));
          const dofInset = Math.min(lerpT(abs, insetFrom, insetFrom + 0.8), 1 - lerpT(abs, b4 - 0.2, b4 + 0.4));
          return {transform: `scale(${1 + enter * 0.3})`, filter: `blur(${enter * 10 + dofHeme * 7 + dofInset * 5}px) brightness(${1 - dofHeme * 0.35 - dofInset * 0.3})`};
        }}
      >
        <CanalShot cellsIn={b3 - canalFrom - 0.2} dissolveStart={b4 + 0.25 - canalFrom} dissolveEnd={b4 + 2.1 - canalFrom} />
      </Layer>
      {/* heme molecule visualization */}
      <Layer from={hemeFrom} to={b3 + 0.3} fi={0.6} fo={0.6}>
        <div style={{position: 'absolute', left: 90, top: 400, width: 900, height: 900}}>
          <HemeShot size={900} appear={0.2} exit={b3 + 0.3 - hemeFrom - 0.9} />
        </div>
        <div style={{position: 'absolute', top: 1235, left: 90, width: 840, textAlign: 'center', fontFamily: MONO, fontSize: 25, letterSpacing: '0.1em', color: C.ivoryDim}}>
          HEME B · THE IRON-HOLDING PART OF HEMOGLOBIN
        </div>
      </Layer>
      {/* modern vs fossil comparison */}
      <Layer from={insetFrom} to={b4 + 0.2} fi={0.6} fo={0.5}>
        <InsetPair />
      </Layer>
      <Layer from={b4 + 1.4} to={b5 + 0.3} fi={0.7} fo={0.3}>
        <Debate dur={b5 + 0.3 - b4 - 1.4} />
      </Layer>
      <Layer from={b5} to={END} fi={0.5} fo={0}>
        <Ending dur={END - b5} logoAt={43.0 - b5} />
      </Layer>

      <Grade />

      {/* ── Text layers (Shorts safe area) ── */}
      <Headline text="115 MILLION YEARS AGO..." from={0.9} to={6.8} y={330} />
      <Headline text="A DINOSAUR BONE FROM BRAZIL" from={b1 + 0.4} to={b2 - 0.1} y={300} />
      <SpeciesCard from={b1 + 3.3} to={b2 - 0.1} />
      <Headline text="TRACES OF HEME" from={b2 + 2.3} to={b3 - 0.15} y={300} />
      <Headline text="POSSIBLE FOSSILIZED BLOOD CELLS" from={b3 + 1.0} to={b4 - 0.1} y={300} size={72} />
      <Headline text="THE EVIDENCE IS STILL DEBATED" from={b4 + 2.0} to={b5 - 0.05} y={300} size={72} />
      <Headline text="SCIENCE IS STRANGER THAN YOU THINK." from={b5 + 0.6} to={42.6} y={320} size={70} />
      <VizTag text="ILLUSTRATIVE RECONSTRUCTION" from={0.9} to={b1 + 2.9} />
      <VizTag text="3D RECONSTRUCTION" from={b1 + 3.0} to={b2 + 1.0} />
      <VizTag text="VISUALIZATION · NOT MICROSCOPE FOOTAGE" from={b2 + 1.2} to={b4 + 2.2} />
      <Subtitles />

      {/* Audio for Studio preview; the final mix is done with FFmpeg (scripts/mix.sh). */}
      {clips.map((c) => (
        <Sequence key={c.file} from={f(c.start)} layout="none">
          <Audio src={staticFile(`audio/${c.file}`)} />
        </Sequence>
      ))}
      <Audio src={staticFile('audio/fx.wav')} volume={0.8} />
    </AbsoluteFill>
  );
};

const SpeciesCard: React.FC<{from: number; to: number}> = ({from, to}) => {
  const t = useCurrentFrame() / 30;
  const o = Math.min(lerpT(t, from, from + 0.6), 1 - lerpT(t, to - 0.4, to));
  if (o <= 0) return null;
  return (
    <div style={{position: 'absolute', top: 1150, left: 90, width: 840, textAlign: 'center', opacity: o, transform: `translateY(${(1 - o) * 12}px)`}}>
      <div style={{fontFamily: DISPLAY, fontWeight: 700, fontStyle: 'italic', fontSize: 44, color: C.ivory, textShadow: '0 2px 16px rgba(0,0,0,0.9)'}}>Aratasaurus museunacionali</div>
      <div style={{fontFamily: MONO, fontSize: 23, letterSpacing: '0.12em', color: C.ivoryDim, marginTop: 8}}>EARLY CRETACEOUS · CEARÁ, BRAZIL · ~115 MYA</div>
    </div>
  );
};

const InsetPair: React.FC = () => {
  const t = useCurrentFrame() / 30;
  const p = lerpT(t, 0, 0.9, 0, 1, Easing.out(Easing.back(1.4)));
  const ring = (fossil: boolean): React.CSSProperties => ({
    width: 380,
    height: 380,
    borderRadius: 190,
    overflow: 'hidden',
    border: `3px solid ${fossil ? C.ember : C.ivory}`,
    boxShadow: `0 0 40px ${fossil ? 'rgba(224,102,47,0.45)' : 'rgba(232,220,196,0.25)'}, inset 0 0 40px rgba(0,0,0,0.8)`,
  });
  const label: React.CSSProperties = {fontFamily: MONO, fontSize: 22, letterSpacing: '0.1em', color: C.ivory, textAlign: 'center', marginTop: 20, lineHeight: 1.35};
  return (
    <>
      <div style={{position: 'absolute', left: 80, top: 720, transform: `scale(${p})`, transformOrigin: '190px 190px'}}>
        <div style={ring(false)}>
          <CellInset fossil={false} size={380} />
        </div>
        <div style={label}>
          MODERN RED
          <br />
          BLOOD CELL
        </div>
      </div>
      <div style={{position: 'absolute', left: 510, top: 880, width: 60, textAlign: 'center', fontFamily: DISPLAY, fontWeight: 900, fontSize: 40, color: C.ivoryDim, opacity: p}}>VS</div>
      <div style={{position: 'absolute', left: 590, top: 720, transform: `scale(${p})`, transformOrigin: '190px 190px'}}>
        <div style={ring(true)}>
          <CellInset fossil size={380} />
        </div>
        <div style={{...label, color: C.ember}}>
          FOSSIL STRUCTURE
          <br />
          (MINERALIZED)
        </div>
      </div>
    </>
  );
};
