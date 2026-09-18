import type { ClipPurpose, EditPlan } from "@/types/edit";

/** A usable source clip an AssetProvider can point the render engine at. */
export interface AssetClip {
  /** A StoredFile id (see lib/storage/fileStore.ts) - never a raw filesystem path. */
  id: string;
  duration: number;
  /** Set when the clip is purpose-specific (demo stock footage) - drives purpose-matched binding instead of round-robin. */
  purpose?: ClipPurpose;
}

export type AssetMode = "user_upload" | "demo" | "video_generation" | "licensed_footage";

export interface AssetProviderContext {
  /** Clips the user has actually uploaded for this project, if any. */
  userClips: AssetClip[];
}

export interface AssetResolution {
  mode: AssetMode;
  clips: AssetClip[];
}

/**
 * Resolves the footage an EditPlan needs into real, usable video files.
 *
 * This is the layer between "the AI understood the prompt" (AIProvider) and
 * "ffmpeg can cut something" (lib/video/render.ts). Today only two modes are
 * real:
 *   - "user_upload": the clips the user provided - always preferred when present.
 *   - "demo": synthetic, ffmpeg-generated placeholder footage (see demo.ts),
 *     used only when the user hasn't uploaded anything, so the prompt-first
 *     workflow can still produce a real rendered preview end to end.
 * "video_generation" (a real AI video-gen API) and "licensed_footage" (a
 * licensed stock/footage provider) are modeled here so they can be wired up
 * later without touching the render pipeline or the rest of the app - see
 * README "API required for production".
 */
export interface AssetProvider {
  readonly name: string;
  readonly isDemo: boolean;
  resolveAssets(plan: EditPlan, context: AssetProviderContext): Promise<AssetResolution>;
}
