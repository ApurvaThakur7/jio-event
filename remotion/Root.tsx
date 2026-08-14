import React from "react";
import { Composition } from "remotion";
import storyboard from "../storyboard.json";
import { Reel } from "./Reel";

const { width, height, fps } = storyboard.format;
const totalSeconds =
  storyboard.shots.reduce((sum, s) => sum + s.duration, 0) + storyboard.outroFadeSeconds;
const durationInFrames = Math.round(totalSeconds * fps);

export const RemotionRoot: React.FC = () => (
  <Composition
    id="JWCCReel"
    component={Reel}
    durationInFrames={durationInFrames}
    fps={fps}
    width={width}
    height={height}
  />
);
