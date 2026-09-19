import type React from "react";
import { CameraShake } from "./CameraShake";
import { ColorGrade } from "./ColorGrade";
import type { EffectComponentProps } from "./EffectProps";
import { Flash } from "./Flash";
import { FreezeFrame } from "./FreezeFrame";
import { ImpactEffect } from "./ImpactEffect";
import { Lightning } from "./Lightning";
import { MotionBlur } from "./MotionBlur";
import { PlayerGlow } from "./PlayerGlow";
import { PlayerOutline } from "./PlayerOutline";
import { SpeedRamp } from "./SpeedRamp";
import { TextPop } from "./TextPop";
import { TrackingZoom } from "./TrackingZoom";
import type { VideoEffectType } from "./types";

/**
 * Effects whose component wraps `children` (the video/clips layer) with a
 * per-frame transform - MainVideo.tsx nests these around the clips instead
 * of rendering them as standalone overlays. Everything else is an "overlay"
 * effect: rendered on top, ignoring `children`.
 */
export const TRANSFORM_EFFECT_TYPES: VideoEffectType[] = [
  "camera_shake",
  "tracking_zoom",
  "speed_ramp",
  "freeze_frame",
  "motion_blur",
  "color_grade",
];

export function isTransformEffect(type: VideoEffectType): boolean {
  return TRANSFORM_EFFECT_TYPES.includes(type);
}

/**
 * Maps every EditPlan.videoEffects[].type to the Remotion component that
 * renders it. This is the ONLY place that needs to change to register a new
 * effect type - MainVideo.tsx just looks it up here and doesn't know about
 * individual effect types at all.
 *
 * The cast on each entry is necessary (not just decoration): every component
 * declares a narrower `effect` prop type (e.g. `EffectComponentProps<FlashVideoEffect>`)
 * than the registry's `EffectComponentProps` (the full VideoEffect union),
 * and TS can't verify that "flash" always pairs with a component expecting
 * FlashVideoEffect - that correspondence is only guaranteed by us keeping
 * this map's keys and values aligned by hand.
 */
export const effectRegistry: Record<VideoEffectType, React.ComponentType<EffectComponentProps>> = {
  player_outline: PlayerOutline as React.ComponentType<EffectComponentProps>,
  player_glow: PlayerGlow as React.ComponentType<EffectComponentProps>,
  tracking_zoom: TrackingZoom as React.ComponentType<EffectComponentProps>,
  lightning: Lightning as React.ComponentType<EffectComponentProps>,
  flash: Flash as React.ComponentType<EffectComponentProps>,
  camera_shake: CameraShake as React.ComponentType<EffectComponentProps>,
  speed_ramp: SpeedRamp as React.ComponentType<EffectComponentProps>,
  freeze_frame: FreezeFrame as React.ComponentType<EffectComponentProps>,
  motion_blur: MotionBlur as React.ComponentType<EffectComponentProps>,
  color_grade: ColorGrade as React.ComponentType<EffectComponentProps>,
  text_pop: TextPop as React.ComponentType<EffectComponentProps>,
  impact_effect: ImpactEffect as React.ComponentType<EffectComponentProps>,
};
