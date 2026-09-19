import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { EffectComponentProps } from "./EffectProps";
import type { CameraShakeEffect as CameraShakeConfig } from "./types";

/**
 * REAL, working effect: a time-varying translate jitter on its `children`
 * (the video/clips layer) - the same sine/cosine jitter formula as the
 * ffmpeg engine's applyShake() in lib/video/render.ts, ported to a CSS
 * transform instead of a crop filter. Transform-kind: always renders
 * `children`, only offsetting them while active.
 */
export const CameraShake: React.FC<EffectComponentProps<CameraShakeConfig>> = ({ effect, children }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const localFrame = frame - effect.startFrame;
  const active = localFrame >= 0 && localFrame < effect.durationInFrames;

  if (!active) return <>{children}</>;

  const amp = Math.max(0, Math.min(1, effect.intensity));
  const maxOffsetX = width * 0.02 * amp;
  const maxOffsetY = height * 0.02 * amp;
  const freq = 14; // Hz-ish jitter rate, matches applyShake().
  const t = localFrame / fps;
  const dx = maxOffsetX * Math.sin(2 * Math.PI * freq * t);
  const dy = maxOffsetY * Math.cos(2 * Math.PI * freq * 1.3 * t);

  return <AbsoluteFill style={{ transform: `translate(${dx}px, ${dy}px)` }}>{children}</AbsoluteFill>;
};
