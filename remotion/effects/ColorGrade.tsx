import React from "react";
import type { EffectComponentProps } from "./EffectProps";
import type { ColorGradeVideoEffect as ColorGradeConfig } from "./types";

/**
 * PLACEHOLDER - not implemented yet. Not part of this step's "first 6"
 * effects - the ffmpeg engine's colorGrade (lib/video/render.ts) already
 * covers this for now. Registered as a transform-kind effect (passes
 * `children` through unchanged) so EditPlan.videoEffects can already
 * reference "color_grade" without the render crashing.
 */
export const ColorGrade: React.FC<EffectComponentProps<ColorGradeConfig>> = ({ children }) => {
  return <>{children}</>;
};
