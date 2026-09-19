import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { getTrackingBoxAtFrame } from "./tracking";
import type { EffectComponentProps } from "./EffectProps";
import type { PlayerGlowEffect as PlayerGlowConfig } from "./types";

/**
 * REAL, working effect: a soft glowing halo (box-shadow) around the tracked
 * box. Uses mock tracking (see tracking.ts) - no real player detection yet.
 * Overlay-kind.
 */
export const PlayerGlow: React.FC<EffectComponentProps<PlayerGlowConfig>> = ({ effect, tracking }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const localFrame = frame - effect.startFrame;
  if (localFrame < 0 || localFrame >= effect.durationInFrames) return null;

  const box = getTrackingBoxAtFrame(tracking, frame);
  const boxWidth = box.width * width;
  const boxHeight = box.height * height;
  const left = box.x * width - boxWidth / 2;
  const top = box.y * height - boxHeight / 2;

  const intensity = Math.max(0, Math.min(1, effect.intensity));
  const color = effect.color ?? "#ffe066";
  const blur = 20 + intensity * 40;
  const spread = 4 + intensity * 12;

  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width: boxWidth,
        height: boxHeight,
        borderRadius: 16,
        boxShadow: `0 0 ${blur}px ${spread}px ${color}`,
        opacity: 0.55 + intensity * 0.35,
        pointerEvents: "none",
      }}
    />
  );
};
