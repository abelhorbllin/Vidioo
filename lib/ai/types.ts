import type { EditInstructions, EditPlan, VideoAnalysis } from "@/types/edit";

export interface VideoInput {
  videoId: string;
  duration: number;
  width: number;
  height: number;
  /** Silence intervals from real ffmpeg signal analysis, fed into the AI layer as context. */
  silenceIntervals: { start: number; end: number }[];
}

/** A source clip already uploaded and available to bind a draft plan against. */
export interface BindableClip {
  id: string;
  duration: number;
}

/**
 * Generic AI provider contract. Every real integration (OpenAI, Claude,
 * Gemini, ...) and the built-in mock implement this same interface so the
 * rest of the app never depends on a specific vendor.
 */
export interface AIProvider {
  readonly name: string;
  /** True for providers that fabricate results instead of calling a real model. */
  readonly isMock: boolean;

  analyzeVideo(input: VideoInput): Promise<VideoAnalysis>;

  generateEditPlan(analysis: VideoAnalysis, instructions: EditInstructions): Promise<EditPlan>;

  modifyEditPlan(currentPlan: EditPlan, instruction: string): Promise<EditPlan>;

  /**
   * Prompt-first entry point: produces an abstract ("draft") EditPlan from
   * the idea alone, before any footage has been uploaded. Clips are
   * purpose-tagged slots without real start/end times yet - see
   * EditPlan["status"].
   */
  generateDraftEditPlan(instructions: EditInstructions): Promise<EditPlan>;

  /**
   * Binds a draft plan's abstract slots to real uploaded clips, producing a
   * concrete ("ready") plan the video engine can actually render.
   */
  bindDraftPlan(plan: EditPlan, clips: BindableClip[]): Promise<EditPlan>;
}
