/**
 * Effect config types, re-exported here so every file under remotion/effects/
 * imports from one local module instead of reaching into the app's
 * types/edit.ts individually. types/edit.ts (EditPlan) stays the canonical
 * schema/source of truth - these are type-only re-exports, erased at build
 * time, so they add no runtime coupling between the Remotion bundle and the
 * Next.js app bundle.
 */
export type {
  VideoEffect,
  VideoEffectType,
  BaseVideoEffect,
  PlayerOutlineEffect,
  PlayerGlowEffect,
  TrackingZoomEffect,
  LightningEffect,
  FlashVideoEffect,
  CameraShakeEffect,
  SpeedRampEffect,
  FreezeFrameEffect,
  MotionBlurEffect,
  ColorGradeVideoEffect,
  TextPopEffect,
  ImpactEffect,
  TrackingPoint,
} from "@/types/edit";
