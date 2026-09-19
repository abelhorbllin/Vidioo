import React from "react";
import type { EffectComponentProps } from "./EffectProps";
import type { ImpactEffect as ImpactEffectConfig } from "./types";

/**
 * PLACEHOLDER - not implemented yet. Not part of this step's "first 6"
 * effects. Registered as an overlay-kind effect (renders nothing) so
 * EditPlan.videoEffects can already reference "impact_effect" without the
 * render crashing.
 */
export const ImpactEffect: React.FC<EffectComponentProps<ImpactEffectConfig>> = () => {
  return null;
};
