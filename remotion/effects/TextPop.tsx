import React from "react";
import type { EffectComponentProps } from "./EffectProps";
import type { TextPopEffect as TextPopConfig } from "./types";

/**
 * PLACEHOLDER - not implemented yet. Not part of this step's "first 6"
 * effects. Registered as an overlay-kind effect (renders nothing) so
 * EditPlan.videoEffects can already reference "text_pop" without the render
 * crashing.
 */
export const TextPop: React.FC<EffectComponentProps<TextPopConfig>> = () => {
  return null;
};
