import type React from "react";
import type { TrackingData } from "./tracking";
import type { VideoEffect } from "./types";

/**
 * Shared prop shape every effect component accepts, whatever their specific
 * `effect` config looks like:
 *  - overlay effects (Flash, PlayerOutline, PlayerGlow, Lightning, ...)
 *    render standalone on top of the video and ignore `children`.
 *  - transform effects (CameraShake, TrackingZoom, ...) wrap `children`
 *    (the video/clips layer) with a per-frame CSS transform.
 * Each concrete component narrows `effect` to its own specific type; the
 * registry (effectRegistry.ts) stores them against this common shape, which
 * needs a small cast at registration since TS can't verify the type<->
 * component correspondence structurally - the registry keys are the only
 * thing enforcing it.
 */
export interface EffectComponentProps<T extends VideoEffect = VideoEffect> {
  effect: T;
  tracking: TrackingData;
  children?: React.ReactNode;
}
