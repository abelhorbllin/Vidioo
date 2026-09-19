import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import type { EffectComponentProps } from "./EffectProps";
import type { FlashVideoEffect } from "./types";

/**
 * REAL, working effect: a brief full-frame brightness spike ("hit flash") -
 * sharp attack, fast decay. Overlay-kind: renders on top of everything,
 * doesn't touch the video layer itself.
 */
export const Flash: React.FC<EffectComponentProps<FlashVideoEffect>> = ({ effect }) => {
  const frame = useCurrentFrame();
  const localFrame = frame - effect.startFrame;
  if (localFrame < 0 || localFrame >= effect.durationInFrames) return null;

  const progress = localFrame / Math.max(1, effect.durationInFrames - 1);
  const peak = Math.max(0, Math.min(1, effect.intensity));
  const opacity = interpolate(progress, [0, 0.15, 1], [peak, peak, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return <AbsoluteFill style={{ backgroundColor: effect.color ?? "#ffffff", opacity, pointerEvents: "none" }} />;
};
