import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useVideoConfig } from "remotion";
import storyboard from "../storyboard.json";
import { ShotClip } from "./ShotClip";
import { TextCard, ShotText } from "./TextCard";

export const Reel: React.FC = () => {
  const { fps } = useVideoConfig();
  const shots = storyboard.shots;
  const overlap = Math.round(storyboard.crossfadeSeconds * fps);
  const outro = Math.round(storyboard.outroFadeSeconds * fps);
  const intro = Math.round(storyboard.introFadeSeconds * fps);

  const shotFrames = shots.map(s => Math.round(s.duration * fps));
  const startFrame = shotFrames.reduce<number[]>((acc, f, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + shotFrames[i - 1]);
    return acc;
  }, []);

  return (
    <AbsoluteFill style={{ backgroundColor: "#07090F" }}>
      {shots.map((shot, i) => {
        const isFirst = i === 0;
        const isLast = i === shots.length - 1;
        const tail = isLast ? outro : overlap;
        return (
          <Sequence key={shot.id} from={startFrame[i]} durationInFrames={shotFrames[i] + tail} layout="none">
            <ShotClip shot={shot} shotFrames={shotFrames[i]} tail={tail} isFirst={isFirst} introFrames={intro} />
          </Sequence>
        );
      })}

      {/* Typography rides above every clip so a crossfade never dissolves the text. */}
      {shots.map((shot, i) => (
        <Sequence key={`t-${shot.id}`} from={startFrame[i]} durationInFrames={shotFrames[i]} layout="none">
          <TextCard text={shot.text as ShotText} shotFrames={shotFrames[i]} introFrames={i === 0 ? intro : undefined} />
        </Sequence>
      ))}

      {/* Music is optional — storyboard.json only has an "audio" block when a track was
          given and prep-audio.mjs has actually produced this file. Rendering <Audio>
          against a file that doesn't exist fails the whole render, so this stays
          conditional rather than assuming every project has a soundtrack. */}
      {storyboard.audio ? <Audio src={staticFile("audio/theme.mp3")} volume={1} /> : null}
    </AbsoluteFill>
  );
};
