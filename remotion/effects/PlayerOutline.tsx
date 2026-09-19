import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { getTrackingBoxAtFrame } from "./tracking";
import type { EffectComponentProps } from "./EffectProps";
import type { PlayerOutlineEffect as PlayerOutlineConfig } from "./types";

/**
 * REAL, working effect: draws a rounded-rectangle border at the tracked
 * box's position/size. Uses mock tracking (see tracking.ts) - no real
 * player detection/segmentation yet, so this outlines whatever box the mock
 * data says, not an actually-detected player. Overlay-kind.
 */
export const PlayerOutline: React.FC<EffectComponentProps<PlayerOutlineConfig>> = ({ effect, tracking }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const localFrame = frame - effect.startFrame;
  if (localFrame < 0 || localFrame >= effect.durationInFrames) return null;

  const box = getTrackingBoxAtFrame(tracking, frame);
  const boxWidth = box.width * width;
  const boxHeight = box.height * height;
  const left = box.x * width - boxWidth / 2;
  const top = box.y * height - boxHeight / 2;

  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width: boxWidth,
        height: boxHeight,
        border: `${effect.thickness}px solid ${effect.color}`,
        borderRadius: 12,
        boxSizing: "border-box",
        pointerEvents: "none",
      }}
    />
  );
};
