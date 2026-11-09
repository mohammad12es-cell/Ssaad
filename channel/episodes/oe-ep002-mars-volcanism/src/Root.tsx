import React from 'react';
import {Composition} from 'remotion';
import './fonts';
import {Episode} from './Episode';
import {FPS, H, TOTAL_FRAMES, W} from './timeline';

export const Root: React.FC = () => (
  <Composition id="Episode002" component={Episode} durationInFrames={TOTAL_FRAMES} fps={FPS} width={W} height={H} />
);
