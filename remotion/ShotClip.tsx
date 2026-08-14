import React from "react";
import { AbsoluteFill, OffthreadVideo, interpolate, staticFile, useCurrentFrame } from "remotion";

type Shot = { id: string; image: string };

export const ShotClip: React.FC<{
  shot: Shot;
  shotFrames: number;
  tail: number;
  isFirst: boolean;
  introFrames: number;
}> = ({ shot, shotFrames, tail, isFirst, introFrames }) => {
  const frame = useCurrentFrame();

  // True crossfade requires both clips to be simultaneously semi-transparent over the
  // same global frames. Shot i stays fully opaque for its nominal duration and only
  // fades during its extended tail (local frames shotFrames..shotFrames+tail); the
  // next shot fades in over that identical global range. Fading the incoming clip in
  // earlier — or not at all — makes it opaque before the outgoing clip has finished
  // dissolving, so it just sits on top and the transition reads as a hard cut.
  //
  // The first shot has no predecessor, so it gets its own slow fade-up from black.
  // The last shot has no successor to cross into, so its tail fades to the root's
  // near-black background instead of into another clip — a proper fade-to-black
  // rather than the reel just stopping on the last frame.
  const fadeIn = isFirst
    ? interpolate(frame, [0, introFrames], [0, 1], { extrapolateRight: "clamp" })
    : interpolate(frame, [0, tail], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [shotFrames, shotFrames + tail], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: fadeIn * fadeOut }}>
      <OffthreadVideo
        src={staticFile(`clips/${shot.id}.mp4`)}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
        muted
      />

      {/* Scrims. Text sits over the top and bottom sixths, and generated footage is
          bright and busy in exactly those places — without this the type is unreadable. */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(7,9,15,0.55) 0%, rgba(7,9,15,0.10) 24%, rgba(7,9,15,0) 46%, rgba(7,9,15,0.28) 72%, rgba(7,9,15,0.78) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
