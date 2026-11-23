import React from "react";
import { Composition } from "remotion";
import { BridgeShort, BRIDGE_FRAMES } from "./videos/bridge/Bridge";
import { MakingShort, MAKING_FRAMES } from "./videos/making/Making";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="MakingShort" component={MakingShort} durationInFrames={MAKING_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="BridgeShort" component={BridgeShort} durationInFrames={BRIDGE_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
