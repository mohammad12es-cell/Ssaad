import React from 'react';
import {AbsoluteFill, Easing, useCurrentFrame} from 'remotion';
import {DISPLAY, MONO} from '../fonts';
import {Skeleton} from '../components/Skeleton';
import {Dust, Fog} from '../components/Overlays';
import {C, lerpT} from '../utils';

/** Scene 6 — skeleton pull-back, fade to dark, ODDLY EXPLAINED logo. */
export const Ending: React.FC<{dur: number; logoAt: number}> = ({dur, logoAt}) => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const pull = lerpT(t, 0, logoAt, 0, 1, Easing.out(Easing.sin));
  const darken = lerpT(t, logoAt - 1.0, logoAt + 0.2);
  const logo = lerpT(t, logoAt, logoAt + 1.0, 0, 1, Easing.out(Easing.cubic));
  const tag = lerpT(t, logoAt + 0.5, logoAt + 1.2, 0, 1, Easing.out(Easing.cubic));
  const fadeOut = lerpT(t, dur - 0.35, dur);
  return (
    <AbsoluteFill style={{background: '#050404'}}>
      <AbsoluteFill style={{opacity: 1 - darken}}>
        <AbsoluteFill style={{background: 'radial-gradient(ellipse 70% 40% at 50% 52%, rgba(107,84,64,0.45) 0%, rgba(26,23,20,0.6) 45%, rgba(5,4,4,1) 80%)'}} />
        <Fog seed={61} count={9} opacity={0.22} y={[700, 1400]} blur={70} speed={0.5} />
        <div
          style={{
            position: 'absolute',
            left: -60,
            top: 640,
            width: 1200,
            height: 720,
            transform: `scale(${1.45 - pull * 0.6}) translateY(${-pull * 30}px)`,
            transformOrigin: '60% 40%',
          }}
        >
          <Skeleton draw={1} glow={0.8} />
        </div>
        <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0) 60%, rgba(5,4,4,0.9) 78%)'}} />
        <Dust seed={66} count={60} drift={0.4} opacity={0.6} />
      </AbsoluteFill>
      {/* logo */}
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', opacity: logo * (1 - fadeOut), transform: `translateY(-80px) scale(${0.94 + logo * 0.06})`, filter: `blur(${(1 - logo) * 12}px)`}}>
        <div style={{position: 'relative', textAlign: 'center'}}>
          <div style={{width: 120, height: 120, margin: '0 auto 34px', borderRadius: 60, border: `3px solid ${C.ivory}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 40px rgba(224,102,47,${0.5 * logo})`}}>
            <div style={{width: 46, height: 46, borderRadius: 23, background: C.ember, boxShadow: `0 0 30px ${C.ember}`}} />
          </div>
          <div style={{fontFamily: DISPLAY, fontWeight: 900, fontSize: 120, letterSpacing: `${0.34 - logo * 0.12}em`, color: C.ivory, lineHeight: 1, marginRight: '-0.22em'}}>ODDLY</div>
          <div style={{fontFamily: MONO, fontSize: 46, letterSpacing: '0.5em', color: C.ember, marginTop: 18, marginRight: '-0.5em'}}>EXPLAINED</div>
          <div style={{height: 3, width: 560 * logo, margin: '34px auto 0', background: `linear-gradient(90deg, rgba(232,220,196,0), ${C.ivory}, rgba(232,220,196,0))`}} />
          <div style={{fontFamily: DISPLAY, fontWeight: 700, fontSize: 40, color: C.ivory, marginTop: 34, opacity: tag, letterSpacing: '0.04em'}}>SCIENCE IS STRANGER</div>
          <div style={{fontFamily: DISPLAY, fontWeight: 700, fontSize: 40, color: C.ivory, opacity: tag, letterSpacing: '0.04em'}}>THAN YOU THINK.</div>
        </div>
      </AbsoluteFill>
      <div style={{position: 'absolute', top: 1560, left: 90, width: 840, textAlign: 'center', fontFamily: MONO, fontSize: 21, color: C.ivoryDim, opacity: tag * 0.8 * (1 - fadeOut), lineHeight: 1.5}}>
        Source: Grice et al., PNAS (2026) · doi.org/10.1073/pnas.2614248123
        <br />
        Reconstructions are artistic visualizations.
      </div>
    </AbsoluteFill>
  );
};
