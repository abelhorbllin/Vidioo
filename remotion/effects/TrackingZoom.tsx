import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { getTrackingBoxAtFrame } from "./tracking";
import type { EffectComponentProps } from "./EffectProps";
import type { TrackingZoomEffect as TrackingZoomConfig } from "./types";

/**
 * REAL, working effect: scales `children` (the video/clips layer) up toward
 * `effect.scale`, eased in and back out (a sine curve peaking mid-effect,
 * so there's no jump cut at the edges), pivoting around the tracked box's
 * center so the zoom "follows" it. Uses mock tracking (see tracking.ts) -
 * no real player detection yet. Transform-kind.
 */
export const TrackingZoom: React.FC<EffectComponentProps<TrackingZoomConfig>> = ({ effect, tracking, children }) => {
  const frame = useCurrentFrame();
  const localFrame = frame - effect.startFrame;
  const active = localFrame >= 0 && localFrame < effect.durationInFrames;

  if (!active) return <>{children}</>;

  const progress = localFrame / Math.max(1, effect.durationInFrames - 1);
  const eased = Math.sin(Math.PI * progress); // 0 -> 1 -> 0 across the effect's duration.
  const scale = 1 + (effect.scale - 1) * eased;
  const box = getTrackingBoxAtFrame(tracking, frame);

  return (
    <AbsoluteFill
      style={{
        transform: `scale(${scale})`,
        transformOrigin: `${box.x * 100}% ${box.y * 100}%`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
