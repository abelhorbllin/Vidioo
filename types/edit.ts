/**
 * Types shared by the AI layer (lib/ai), the validation layer
 * (lib/validation/editPlan.ts) and the video engine (lib/video).
 *
 * These will eventually map to `projects` / `edits` / `exports` tables once
 * a database is introduced. For the MVP they are just plain JSON kept in the
 * in-memory project store.
 */

export type AspectRatio = "9:16" | "16:9" | "1:1";
export type CaptionStyle = "off" | "basic" | "dynamic";
export type Intensity = "low" | "medium" | "high";
export type MusicChoice = "original" | "add_later";

export type EditingStyleId =
  | "gaming"
  | "tiktok"
  | "cinematic"
  | "meme"
  | "business"
  | "music"
  | "fast-paced"
  | "youtube"
  // Football-specific styles (see lib/styles/editingStyles.ts).
  | "dark"
  | "aggressive"
  | "clean"
  | "emotional";

export interface AdvancedOptions {
  aspectRatio: AspectRatio;
  captionStyle: CaptionStyle;
  removeSilences: boolean;
  autoZoom: boolean;
  music: MusicChoice;
  intensity: Intensity;
}

export const DEFAULT_ADVANCED_OPTIONS: AdvancedOptions = {
  aspectRatio: "9:16",
  captionStyle: "basic",
  removeSilences: false,
  autoZoom: false,
  music: "original",
  intensity: "medium",
};

/** What the user asked for, before the AI turns it into a concrete plan. */
export interface EditInstructions {
  prompt: string;
  styleId?: EditingStyleId;
  options: AdvancedOptions;
  /** Optional player name for football edits, e.g. "Mbappé". Contextual only - see lib/ai/mock.ts. */
  player?: string;
  /** Parsed or explicit target duration in seconds (e.g. from "15 second edit" in the prompt). */
  targetDurationSeconds?: number;
  /**
   * Explicit narrative arc to use instead of parsing one from the prompt -
   * used by "Create Similar Edit" (Trending) to reproduce a detected
   * structure. When set, this replaces buildFootballArc()'s own arc.
   */
  sceneArcOverride?: ClipPurpose[];
}

/**
 * Football-specific semantic labels the (mock) AI can tag a clip with.
 * These are MOCK interpretations of the prompt/style - not real action
 * recognition on the footage. See lib/ai/mock.ts.
 */
export type ClipPurpose =
  | "hook"
  | "dribble"
  | "skill"
  | "goal"
  | "assist"
  | "celebration"
  | "shot"
  | "tackle"
  | "save"
  | "sprint"
  | "pass"
  | "reaction"
  | "closeup";

/** Effects the video engine can actually apply for real (see lib/video/render.ts). */
export type EffectType = "shake" | "flash" | "velocity" | "colorGrade";

export interface EffectInstruction {
  type: EffectType;
  /** 0-1 relative strength. */
  intensity: number;
  /** Timeline range (new/post-cut timeline) this effect applies to. Omitted = whole edit (e.g. colorGrade). */
  start?: number;
  end?: number;
  /** See CaptionCue.sourceClipId. */
  sourceClipId?: string;
}

/**
 * The new, frame-based advanced effect system for the Remotion engine (see
 * remotion/effects/). This is DELIBERATELY separate from EffectType /
 * EffectInstruction above (the ffmpeg engine's shake/flash/velocity/
 * colorGrade, timed in seconds) - different vocabulary, different timeline
 * unit (frames, not seconds), different engine. Both are additive and
 * coexist: the ffmpeg engine ignores EditPlan.videoEffects entirely, and the
 * Remotion engine ignores EditPlan.effects entirely.
 */
export type VideoEffectType =
  | "player_outline"
  | "player_glow"
  | "tracking_zoom"
  | "lightning"
  | "flash"
  | "camera_shake"
  | "speed_ramp"
  | "freeze_frame"
  | "motion_blur"
  | "color_grade"
  | "text_pop"
  | "impact_effect";

export interface BaseVideoEffect {
  /** Frame (at the Remotion composition's fps) on the FINAL, post-cut/concatenated timeline where this effect starts. */
  startFrame: number;
  durationInFrames: number;
}

export interface PlayerOutlineEffect extends BaseVideoEffect {
  type: "player_outline";
  color: string;
  thickness: number;
}

export interface PlayerGlowEffect extends BaseVideoEffect {
  type: "player_glow";
  /** 0-1 relative strength. */
  intensity: number;
  color?: string;
}

export interface TrackingZoomEffect extends BaseVideoEffect {
  type: "tracking_zoom";
  /** Peak scale factor reached mid-effect, e.g. 1.3 = 30% zoomed in. */
  scale: number;
}

export interface LightningEffect extends BaseVideoEffect {
  type: "lightning";
  /** 0-1 relative strength. */
  intensity?: number;
  color?: string;
}

export interface FlashVideoEffect extends BaseVideoEffect {
  type: "flash";
  /** 0-1 relative strength (peak overlay opacity). */
  intensity: number;
  color?: string;
}

export interface CameraShakeEffect extends BaseVideoEffect {
  type: "camera_shake";
  /** 0-1 relative strength. */
  intensity: number;
}

/** PLACEHOLDER - registered but not yet rendered for real. See remotion/effects/SpeedRamp.tsx. */
export interface SpeedRampEffect extends BaseVideoEffect {
  type: "speed_ramp";
  fromSpeed?: number;
  toSpeed?: number;
}

/** PLACEHOLDER - registered but not yet rendered for real. See remotion/effects/FreezeFrame.tsx. */
export interface FreezeFrameEffect extends BaseVideoEffect {
  type: "freeze_frame";
}

/** PLACEHOLDER - registered but not yet rendered for real. See remotion/effects/MotionBlur.tsx. */
export interface MotionBlurEffect extends BaseVideoEffect {
  type: "motion_blur";
  intensity?: number;
}

/** PLACEHOLDER - registered but not yet rendered for real. See remotion/effects/ColorGrade.tsx. */
export interface ColorGradeVideoEffect extends BaseVideoEffect {
  type: "color_grade";
  intensity?: number;
}

/** PLACEHOLDER - registered but not yet rendered for real. See remotion/effects/TextPop.tsx. */
export interface TextPopEffect extends BaseVideoEffect {
  type: "text_pop";
  text: string;
}

/** PLACEHOLDER - registered but not yet rendered for real. See remotion/effects/ImpactEffect.tsx. */
export interface ImpactEffect extends BaseVideoEffect {
  type: "impact_effect";
  intensity?: number;
}

export type VideoEffect =
  | PlayerOutlineEffect
  | PlayerGlowEffect
  | TrackingZoomEffect
  | LightningEffect
  | FlashVideoEffect
  | CameraShakeEffect
  | SpeedRampEffect
  | FreezeFrameEffect
  | MotionBlurEffect
  | ColorGradeVideoEffect
  | TextPopEffect
  | ImpactEffect;

/**
 * Mock (or, later, real) player-position samples consumed by tracking-aware
 * videoEffects (player_outline, player_glow, tracking_zoom, lightning). `x`/
 * `y` are the tracked box's CENTER as a 0-1 fraction of frame width/height;
 * `width`/`height` are also 0-1 fractions. See remotion/effects/tracking.ts
 * for how these are looked up (and interpolated) per frame. No real
 * detection/tracking model is used yet - see project instructions.
 */
export interface TrackingPoint {
  frame: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A detected "interesting" moment in the source footage. */
export interface KeyMoment {
  start: number;
  end: number;
  /** 0-1, how confident/strong this moment is. Drives clip selection order. */
  score: number;
  label: string;
}

/**
 * Result of analyzeVideo(). NOTE: when running in mock mode this is a
 * simulated analysis, not a real understanding of the footage content -
 * see lib/ai/mock.ts.
 */
export interface VideoAnalysis {
  duration: number;
  width: number;
  height: number;
  keyMoments: KeyMoment[];
  /** True silence intervals detected via ffmpeg's silencedetect (real signal analysis, not AI). */
  silenceIntervals: { start: number; end: number }[];
  source: "mock" | "ai";
}

export type ClipType = "highlight" | "intro" | "outro" | "transition";

export interface EditClip {
  start: number;
  end: number;
  type: ClipType;
  /**
   * Which uploaded source clip file this segment is cut from (a StoredFile
   * id). Undefined means the legacy single-video mode: the project's one
   * uploaded video. Football multi-clip edits always set this.
   */
  sourceClipId?: string;
  /** Mock football semantic tag - see ClipPurpose. */
  purpose?: ClipPurpose;
  /** Single "headline" effect for this clip, if any (also may appear in EditPlan.effects). */
  effect?: EffectType;
  /** Playback speed multiplier for this segment, e.g. 1.5 = 50% faster. 1 = unchanged. Clamped to [0.5, 2] (ffmpeg atempo's single-pass range). */
  speed?: number;
}

export interface CaptionCue {
  start: number;
  end: number;
  text: string;
  /** Which uploaded source clip this cue's start/end refer to (disambiguates overlapping timestamps across clips). Undefined = legacy single-video plan. */
  sourceClipId?: string;
}

export interface ZoomInstruction {
  start: number;
  end: number;
  /** Scale factor applied to the frame, e.g. 1.15 = 15% zoom-in. */
  scale: number;
  /** See CaptionCue.sourceClipId. */
  sourceClipId?: string;
}

/**
 * The concrete, machine-executable edit plan. This is what
 * lib/video/render.ts consumes to actually drive ffmpeg.
 *
 * `status` distinguishes two lifecycle stages, added for the prompt-first
 * football workflow:
 *   - "draft": generated from the idea/prompt alone, before any footage was
 *     uploaded. `clips` are abstract slots (purpose + targetDuration only -
 *     start/end/sourceClipId are not meaningful yet). Cannot be rendered.
 *   - "ready": every clip is bound to a real uploaded source file with real
 *     start/end times. This is the only state lib/video/render.ts accepts.
 * Every plan produced by the original (pre-football) upload-first flow is
 * "ready" immediately, exactly as before - this is purely additive.
 */
export interface EditPlan {
  duration: number;
  aspectRatio: AspectRatio;
  clips: EditClip[];
  captions: boolean;
  captionStyle: CaptionStyle;
  captionCues: CaptionCue[];
  removeSilences: boolean;
  autoZoom: boolean;
  zooms: ZoomInstruction[];
  music: MusicChoice;
  intensity: Intensity;
  styleId?: EditingStyleId;
  /** Where this plan came from - surfaced in the UI as "Demo AI mode" when mock. */
  source: "mock" | "ai";
  /** Optional football player context, e.g. "Mbappé". Never used to fetch footage - see lib/ai/mock.ts. */
  player?: string;
  /** Real, engine-applied effects (shake/flash/velocity/colorGrade) - see lib/video/render.ts. */
  effects: EffectInstruction[];
  /** Plain-language notes for requests the engine can't do yet (e.g. "motion blur", "beat sync"). Never silently dropped. */
  unsupportedRequests: string[];
  status: "draft" | "ready";
  /**
   * Where the bound footage came from, once "ready": "user" means the
   * clips the user uploaded; "demo" means synthetic, ffmpeg-generated
   * placeholder footage from DemoAssetProvider (see lib/assets/demo.ts) -
   * never real football footage. Undefined while still "draft".
   */
  assetMode?: "user" | "demo";
  /**
   * Advanced, frame-based effects for the Remotion engine (see
   * remotion/effects/ and lib/video/remotion.ts). Optional and additive -
   * absent/empty means no advanced effects, exactly like before this field
   * existed. The ffmpeg engine never reads this field.
   */
  videoEffects?: VideoEffect[];
  /**
   * Mock (or, later, real) player tracking samples for tracking-aware
   * videoEffects. Optional/additive - see TrackingPoint.
   */
  tracking?: TrackingPoint[];
}

export interface SourceClipRef {
  id: string;
  filename: string;
  duration: number;
}

export interface EditSummary {
  durationSeconds: number;
  aspectRatio: AspectRatio;
  cutCount: number;
  captionsEnabled: boolean;
  silenceRemovalEnabled: boolean;
  styleId?: EditingStyleId;
  player?: string;
  clipCount?: number;
  effectsCount?: number;
  unsupportedRequests?: string[];
  assetMode?: "user" | "demo";
}
