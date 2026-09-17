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
  | "youtube";

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
}

export interface CaptionCue {
  start: number;
  end: number;
  text: string;
}

export interface ZoomInstruction {
  start: number;
  end: number;
  /** Scale factor applied to the frame, e.g. 1.15 = 15% zoom-in. */
  scale: number;
}

/**
 * The concrete, machine-executable edit plan. This is what
 * lib/video/render.ts consumes to actually drive ffmpeg.
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
}

export interface EditSummary {
  durationSeconds: number;
  aspectRatio: AspectRatio;
  cutCount: number;
  captionsEnabled: boolean;
  silenceRemovalEnabled: boolean;
  styleId?: EditingStyleId;
}
