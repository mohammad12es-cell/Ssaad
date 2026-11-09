import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {DinoSilhouette} from '../components/Dino';
import {Dust, Fog} from '../components/Overlays';
import {heartbeat, lerpT} from '../utils';
import {Easing} from 'remotion';

/** Scene 1 — the impossible question: silhouette emerges from fog, slow dolly to the chest. */
export const Hook: React.FC<{dur: number}> = ({dur}) => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const dolly = lerpT(t, 0, dur, 0, 1, Easing.inOut(Easing.sin));
  const scale = 0.6 + dolly * 0.72;
  const emerge = lerpT(t, 0.3, 3.0, 0, 1, Easing.out(Easing.quad));
  const glow = lerpT(t, 1.6, 4.0);
  const pulse = heartbeat(t, 1.4, 1.05);
  const fx = 1320, fy = 530; // chest focal point in container px
  return (
    <AbsoluteFill style={{background: '#030303'}}>
      {/* back light through the fog */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 60% 35% at 52% 45%, rgba(107,84,64,${0.55 * emerge}) 0%, rgba(40,30,24,${0.4 * emerge}) 40%, rgba(0,0,0,0) 75%)`,
        }}
      />
      <Fog seed={11} count={10} opacity={0.3 * emerge} y={[500, 1500]} blur={70} speed={0.6} />
      <div
        style={{
          position: 'absolute',
          left: 540 - fx,
          top: 900 - fy,
          width: 2000,
          height: 1200,
          transformOrigin: `${fx}px ${fy}px`,
          transform: `scale(${scale}) translateY(${Math.sin(t * 1.1) * 3}px)`,
          opacity: emerge,
          filter: `blur(${(1 - emerge) * 14}px)`,
        }}
      >
        <DinoSilhouette glow={glow} pulse={pulse} rim={emerge} />
      </div>
      {/* foreground fog (out of focus) */}
      <Fog seed={23} count={7} opacity={0.34 * (1.2 - emerge * 0.6)} y={[900, 1900]} blur={90} speed={1.2} />
      <Dust seed={4} count={55} opacity={emerge * 0.7} drift={0.5} />
    </AbsoluteFill>
  );
};
