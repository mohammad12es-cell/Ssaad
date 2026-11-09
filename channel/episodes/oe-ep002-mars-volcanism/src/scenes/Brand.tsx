import React from 'react';
import {AbsoluteFill, Easing, useCurrentFrame} from 'remotion';
import {DISPLAY, MONO} from '../fonts';
import {C, lerpT} from '../utils';

export const Brand: React.FC<{dur: number}> = ({dur}) => {
  const t = useCurrentFrame() / 30;
  const logo = lerpT(t, 0.15, 1.0, 0, 1, Easing.out(Easing.cubic));
  const tag = lerpT(t, 0.7, 1.4, 0, 1, Easing.out(Easing.cubic));
  const out = lerpT(t, dur - 0.3, dur);
  return (
    <AbsoluteFill style={{background: '#030303', alignItems: 'center', justifyContent: 'center'}}>
      <div style={{textAlign: 'center', opacity: logo * (1 - out), transform: `translateY(-60px) scale(${0.94 + 0.06 * logo})`, filter: `blur(${(1 - logo) * 12}px)`}}>
        <div style={{width: 120, height: 120, margin: '0 auto 34px', borderRadius: 60, border: `3px solid ${C.ivory}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 44px rgba(255,122,42,${0.55 * logo})`}}>
          <div style={{width: 46, height: 46, borderRadius: 23, background: C.lava, boxShadow: `0 0 30px ${C.lava}`}} />
        </div>
        <div style={{fontFamily: DISPLAY, fontWeight: 900, fontSize: 120, letterSpacing: `${0.34 - logo * 0.12}em`, color: C.ivory, lineHeight: 1, marginRight: '-0.22em'}}>ODDLY</div>
        <div style={{fontFamily: MONO, fontSize: 46, letterSpacing: '0.5em', color: C.lava, marginTop: 18, marginRight: '-0.5em'}}>EXPLAINED</div>
        <div style={{height: 3, width: 560 * logo, margin: '34px auto 0', background: `linear-gradient(90deg, rgba(232,220,196,0), ${C.ivory}, rgba(232,220,196,0))`}} />
        <div style={{fontFamily: DISPLAY, fontWeight: 700, fontSize: 40, color: C.ivory, marginTop: 34, opacity: tag, letterSpacing: '0.04em', lineHeight: 1.25}}>
          SCIENCE IS STRANGER
          <br />
          THAN YOU THINK.
        </div>
      </div>
      <div style={{position: 'absolute', top: 1560, left: 90, width: 840, textAlign: 'center', fontFamily: MONO, fontSize: 21, color: C.ivoryDim, opacity: tag * 0.8 * (1 - out), lineHeight: 1.5}}>
        Source: Mège et al., Science Advances (2026) · ESA ExoMars TGO
        <br />
        Planet, spacecraft &amp; subsurface scenes are visualizations.
      </div>
    </AbsoluteFill>
  );
};
