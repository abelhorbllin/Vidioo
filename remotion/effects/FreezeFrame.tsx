import React from "react";
import type { EffectComponentProps } from "./EffectProps";
import type { FreezeFrameEffect as FreezeFrameConfig } from "./types";

/**
 * PLACEHOLDER - not implemented yet. A real freeze-frame needs to hold one
 * specific source frame for the effect's duration (pausing OffthreadVideo's
 * trim position instead of letting it advance), which touches how clips are
 * laid out in MainVideo.tsx - out of scope for this step. Registered as a
 * transform-kind effect (passes `children` through unchanged) so
 * EditPlan.videoEffects can already reference "freeze_frame" without the
 * render crashing.
 */
export const FreezeFrame: React.FC<EffectComponentProps<FreezeFrameConfig>> = ({ children }) => {
  return <>{children}</>;
};
