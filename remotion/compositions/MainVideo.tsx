import React from "react";
import { AbsoluteFill, OffthreadVideo, Sequence, useVideoConfig } from "remotion";
import { effectRegistry, isTransformEffect } from "../effects/effectRegistry";
import type { TrackingData } from "../effects/tracking";
import type { VideoEffect } from "../effects/types";

/**
 * A single video segment placed on the timeline. `src` is an absolute
 * filesystem path (or file:// URL) to an already-rendered/cut source file -
 * OffthreadVideo (server-side ffmpeg frame extraction) needs a local path,
 * not a browser-playable URL.
 */
export type RemotionClip = {
  src: string;
  /** Trim point within the source file, in frames of the composition's fps. */
  trimBeforeFrames: number;
  trimAfterFrames: number;
  /** How many frames this clip occupies on the composition timeline. */
  durationInFrames: number;
};

/** A burned-in text overlay, positioned in composition frames (not source-file frames). */
export type RemotionCaption = {
  text: string;
  startFrame: number;
  durationInFrames: number;
};

// Declared as `type` (not `interface`) so it satisfies Remotion's
// `Record<string, unknown>` generic constraint on <Composition> - plain
// object type literals get an implicit index signature, interfaces don't.
export type MainVideoProps = {
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  /** Shown behind/between clips, and for the "no footage" first smoke test. */
  backgroundColor: string;
  clips: RemotionClip[];
  captions: RemotionCaption[];
  /** Advanced effects (see remotion/effects/) - empty means none, exactly like before this field existed. */
  effects: VideoEffect[];
  /** Mock (or, later, real) player tracking samples for tracking-aware effects - see remotion/effects/tracking.ts. */
  tracking: TrackingData;
};

/**
 * The one and only Remotion composition for this app. Its own job stays
 * dumb: lay out `clips` back to back (via <Sequence>) and overlay
 * `captions`. All editing intelligence (which clips, what text, what
 * effects) comes from the EditPlan -> MainVideoProps translation in
 * lib/video/remotion.ts - nothing here reads the EditPlan directly, and
 * there is no user-facing timeline: this component only ever runs
 * headlessly inside renderMedia().
 *
 * `effects` are looked up in effectRegistry.ts by type and rendered
 * automatically - this component has no per-effect-type logic. Two kinds
 * (see effectRegistry.ts's isTransformEffect()):
 *  - "transform" effects (camera_shake, tracking_zoom, ...) wrap the clips
 *    layer with a per-frame CSS transform, applied in `effects` order.
 *  - "overlay" effects (flash, player_outline, player_glow, lightning, ...)
 *    render on top of everything, after captions.
 * Captions are deliberately kept OUTSIDE the transform-wrapped clips layer
 * so text stays static/readable even while the video shakes or zooms.
 */
export const MainVideo: React.FC<MainVideoProps> = ({
  backgroundColor,
  clips,
  captions,
  effects,
  tracking,
}) => {
  const { fps } = useVideoConfig();
  let cursor = 0;

  const clipsLayer = (
    <>
      {clips.map((clip, i) => {
        const from = cursor;
        cursor += clip.durationInFrames;
        return (
          <Sequence key={i} from={from} durationInFrames={clip.durationInFrames}>
            <OffthreadVideo
              src={clip.src}
              trimBefore={clip.trimBeforeFrames}
              trimAfter={clip.trimAfterFrames}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </Sequence>
        );
      })}
    </>
  );

  const transformedClipsLayer = effects
    .filter((effect) => isTransformEffect(effect.type))
    .reduce((children, effect) => {
      const EffectComponent = effectRegistry[effect.type];
      return (
        <EffectComponent effect={effect} tracking={tracking}>
          {children}
        </EffectComponent>
      );
    }, clipsLayer);

  const overlayEffects = effects.filter((effect) => !isTransformEffect(effect.type));

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      {transformedClipsLayer}

      {captions.map((caption, i) => (
        <Sequence key={`caption-${i}`} from={caption.startFrame} durationInFrames={caption.durationInFrames}>
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: "12%" }}>
            <div
              style={{
                maxWidth: "85%",
                padding: "0.4em 0.8em",
                fontFamily: "sans-serif",
                fontWeight: 700,
                fontSize: 56,
                lineHeight: 1.25,
                color: "white",
                textAlign: "center",
                textShadow: "0 2px 14px rgba(0,0,0,0.85), 0 0 4px rgba(0,0,0,0.6)",
              }}
            >
              {caption.text}
            </div>
          </AbsoluteFill>
        </Sequence>
      ))}

      {overlayEffects.map((effect, i) => {
        const EffectComponent = effectRegistry[effect.type];
        return <EffectComponent key={i} effect={effect} tracking={tracking} />;
      })}
    </AbsoluteFill>
  );
};
