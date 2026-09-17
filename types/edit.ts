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
}
