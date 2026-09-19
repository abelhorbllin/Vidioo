import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { seededRandom } from "./random";
import { getTrackingBoxAtFrame } from "./tracking";
import type { EffectComponentProps } from "./EffectProps";
import type { LightningEffect as LightningConfig } from "./types";

/**
 * REAL, working effect: flickering procedural bolts radiating from the
 * tracked box - a stylized, deterministic-pseudo-random visual (NOT a
 * physically simulated lightning strike or a licensed VFX asset). Uses mock
 * tracking (see tracking.ts). Deterministic (seeded by frame) so re-renders
 * of the same frame always look identical, as Remotion requires. Overlay-
 * kind.
 */
export const Lightning: React.FC<EffectComponentProps<LightningConfig>> = ({ effect, tracking }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const localFrame = frame - effect.startFrame;
  if (localFrame < 0 || localFrame >= effect.durationInFrames) return null;

  const box = getTrackingBoxAtFrame(tracking, frame);
  const centerX = box.x * width;
  const centerY = box.y * height;
  const intensity = Math.max(0, Math.min(1, effect.intensity ?? 1));
  const color = effect.color ?? "#bfe9ff";

  // Deterministic flicker: on for roughly 65% of frames, off otherwise.
  const flickerOn = seededRandom(localFrame * 13.37 + effect.startFrame) > 0.35;
  if (!flickerOn) return null;

  const boltCount = 3;
  const bolts = Array.from({ length: boltCount }, (_, i) => {
    const angle = seededRandom(localFrame + i * 97 + effect.startFrame) * Math.PI * 2;
    const length = Math.min(width, height) * 0.25 * (0.6 + seededRandom(localFrame + i * 53 + effect.startFrame) * 0.4);
    return {
      key: i,
      x1: centerX,
      y1: centerY,
      x2: centerX + Math.cos(angle) * length,
      y2: centerY + Math.sin(angle) * length,
    };
  });

  return (
    <svg width={width} height={height} style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}>
      {bolts.map((bolt) => (
        <line
          key={bolt.key}
          x1={bolt.x1}
          y1={bolt.y1}
          x2={bolt.x2}
          y2={bolt.y2}
          stroke={color}
          strokeWidth={3 + intensity * 3}
          strokeLinecap="round"
          opacity={0.8 * intensity}
        />
      ))}
    </svg>
  );
};
