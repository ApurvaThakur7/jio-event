import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont();

export type ShotText = {
  kicker?: string;
  line?: string;
  sub?: string;
  style?: "lower" | "center" | "endcard";
};

const GOLD = "#E8B14C";

// A background plate behind the text guarantees contrast, but it also guarantees a
// visible box — exactly the "hiding the footage" complaint a plate draws. The fix that
// keeps the shot fully visible is the one subtitle text has used for decades: a tight,
// hard-edged dark outline hugging each letter, not a soft glow behind the whole word.
// A soft shadow blurs into a bright background and does nothing; a crisp outline creates
// its own contrast ring at the exact edge of every glyph, independent of what color or
// brightness the footage behind it happens to be. This is what makes gold text hold up
// over a gold ceiling — the boundary is drawn by the outline, not by the fill color.
const outline = (px: number, alpha = 0.92) => {
  const layers = [
    [-px, -px], [px, -px], [-px, px], [px, px],
    [0, -px], [0, px], [-px, 0], [px, 0],
  ].map(([x, y]) => `${x}px ${y}px 0 rgba(0,0,0,${alpha})`);
  // One extra soft, wider shadow underneath for depth — atmosphere, not the legibility
  // mechanism itself, so it stays weak enough to never blur into a box.
  return [...layers, `0 6px 18px rgba(0,0,0,0.55)`].join(", ");
};

export const TextCard: React.FC<{ text: ShotText; shotFrames: number; introFrames?: number }> = ({
  text,
  shotFrames,
  introFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const endcard = text.style === "endcard";
  const centered = text.style === "center" || endcard;

  // The opening shot holds on black a beat longer before its title lifts in — "slow
  // start" means the text arrives deliberately, not the instant the frame does.
  const startDelay = introFrames ? Math.round(introFrames * 0.35) : 0;

  // Each line lifts in on its own slightly delayed spring — the stagger is what makes
  // it read as designed motion rather than a title card being switched on.
  const rise = (delay: number) =>
    spring({
      frame: frame - startDelay - delay,
      fps,
      config: { damping: 200, mass: 0.6 },
      durationInFrames: Math.round(fps * 0.9),
    });

  const out = interpolate(frame, [shotFrames - Math.round(fps * 0.4), shotFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const lift = (p: number) => ({
    opacity: p * out,
    transform: `translateY(${interpolate(p, [0, 1], [26, 0])}px)`,
  });

  const k = rise(0);
  const l = rise(Math.round(fps * 0.12));
  const s = rise(Math.round(fps * 0.24));

  return (
    <AbsoluteFill
      style={{
        fontFamily,
        justifyContent: centered ? "center" : "flex-end",
        alignItems: centered ? "center" : "flex-start",
        padding: centered ? "0 140px" : "0 120px 110px",
        textAlign: centered ? "center" : "left",
      }}
    >
      <div style={{ maxWidth: 1100 }}>
        {text.kicker ? (
          <div
            style={{
              ...lift(k),
              color: endcard ? "#FFFFFF" : GOLD,
              fontSize: endcard ? 58 : 40,
              fontWeight: 700,
              letterSpacing: endcard ? "0.10em" : "0.26em",
              lineHeight: 1.18,
              textTransform: "uppercase",
              textShadow: outline(endcard ? 2.5 : 2),
            }}
          >
            {text.kicker}
          </div>
        ) : null}

        {text.line ? (
          <div
            style={{
              ...lift(l),
              color: "#FFFFFF",
              fontSize: endcard ? 34 : 76,
              fontWeight: endcard ? 400 : 300,
              letterSpacing: endcard ? "0.22em" : "-0.015em",
              lineHeight: 1.1,
              marginTop: endcard ? 26 : 18,
              textTransform: endcard ? "uppercase" : "none",
              textShadow: outline(endcard ? 1.5 : 3),
            }}
          >
            {text.line}
          </div>
        ) : null}

        {text.sub ? (
          <div
            style={{
              ...lift(s),
              color: "rgba(255,255,255,0.88)",
              fontSize: 30,
              fontWeight: 400,
              letterSpacing: "0.02em",
              lineHeight: 1.35,
              marginTop: 20,
              textShadow: outline(1.5),
            }}
          >
            {text.sub}
          </div>
        ) : null}

        {endcard ? (
          <div
            style={{
              ...lift(s),
              width: 132,
              height: 3,
              backgroundColor: GOLD,
              margin: "40px auto 0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.8)",
            }}
          />
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
