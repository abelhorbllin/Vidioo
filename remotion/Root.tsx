import React from "react";
import { Composition, type AnyZodObject } from "remotion";
import { MainVideo, type MainVideoProps } from "./compositions/MainVideo";
import { MAIN_COMPOSITION_ID } from "./constants";

const DEFAULT_PROPS: MainVideoProps = {
  fps: 30,
  width: 1080,
  height: 1920,
  durationInFrames: 150,
  backgroundColor: "#0a0a0f",
  clips: [],
  captions: [],
  effects: [],
  tracking: [],
};

/**
 * Remotion's root component. This file is only ever consumed by
 * @remotion/bundler's bundle() (called server-side from
 * lib/video/remotion.ts) - it is never imported by the Next.js app and is
 * not reachable as a page or route, so Remotion Studio / the composition
 * list is never exposed to end users.
 *
 * `calculateMetadata` lets a single composition adapt its duration and
 * frame size to whatever EditPlan produced the `inputProps` for this
 * particular render, instead of requiring a fixed-size composition per
 * video - this is what keeps the EditPlan JSON the single source of truth
 * for timing, with no separate Remotion-side timeline to keep in sync.
 */
export const RemotionRoot: React.FC = () => {
  return (
    <Composition<AnyZodObject, MainVideoProps>
      id={MAIN_COMPOSITION_ID}
      component={MainVideo}
      durationInFrames={DEFAULT_PROPS.durationInFrames}
      fps={DEFAULT_PROPS.fps}
      width={DEFAULT_PROPS.width}
      height={DEFAULT_PROPS.height}
      defaultProps={DEFAULT_PROPS}
      calculateMetadata={async ({ props }) => ({
        durationInFrames: props.durationInFrames,
        fps: props.fps,
        width: props.width,
        height: props.height,
      })}
    />
  );
};
