import React from "react";
import type { EffectComponentProps } from "./EffectProps";
import type { SpeedRampEffect as SpeedRampConfig } from "./types";

/**
 * PLACEHOLDER - not implemented yet. A real speed ramp needs to remap which
 * source frame is shown at each composition frame (changing OffthreadVideo's
 * trimBefore/trimAfter dynamically), which is a structural change to how
 * clips are laid out in MainVideo.tsx, not just an overlay/transform - out
 * of scope for this step. Registered as a transform-kind effect (passes
 * `children` through unchanged) so EditPlan.videoEffects can already
 * reference "speed_ramp" without the render crashing.
 */
export const SpeedRamp: React.FC<EffectComponentProps<SpeedRampConfig>> = ({ children }) => {
  return <>{children}</>;
};
