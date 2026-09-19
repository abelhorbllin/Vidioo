import React from "react";
import { AbsoluteFill, OffthreadVideo, Sequence, useVideoConfig } from "remotion";

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
};

/**
 * The one and only Remotion composition for this app. It is deliberately
 * dumb: it just lays out `clips` back to back (via <Sequence>) and overlays
 * `captions` at fixed positions. All editing intelligence (which clips, what
 * text, what timing) comes from the EditPlan -> RemotionInputProps
 * translation in lib/video/remotion.ts - nothing here reads the EditPlan
 * directly, and there is no user-facing timeline: this component only ever
 * runs headlessly inside renderMedia().
 *
 * Deliberately NOT implemented yet (see project instructions): player
 * tracking/cutout, glow/outline, flash/shake, speed ramps. Those stay on the
 * ffmpeg engine for now.
 */
export const MainVideo: React.FC<MainVideoProps> = ({ backgroundColor, clips, captions }) => {
  const { fps } = useVideoConfig();
  let cursor = 0;

  return (
    <AbsoluteFill style={{ backgroundColor }}>
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
    </AbsoluteFill>
  );
};
