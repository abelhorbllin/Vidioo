import React from "react";
import type { EffectComponentProps } from "./EffectProps";
import type { MotionBlurEffect as MotionBlurConfig } from "./types";

/**
 * PLACEHOLDER - not implemented yet. A real motion blur needs to blend
 * several neighboring frames per output frame, which OffthreadVideo doesn't
 * expose directly - out of scope for this step. Registered as a transform-
 * kind effect (passes `children` through unchanged) so EditPlan.videoEffects
 * can already reference "motion_blur" without the render crashing.
 */
export const MotionBlur: React.FC<EffectComponentProps<MotionBlurConfig>> = ({ children }) => {
  return <>{children}</>;
};
