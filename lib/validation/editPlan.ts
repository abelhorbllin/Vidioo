import type { EditPlan } from "@/types/edit";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const ASPECT_RATIOS = new Set(["9:16", "16:9", "1:1"]);
const CAPTION_STYLES = new Set(["off", "basic", "dynamic"]);
const INTENSITIES = new Set(["low", "medium", "high"]);
const MUSIC_CHOICES = new Set(["original", "add_later"]);
const CLIP_TYPES = new Set(["highlight", "intro", "outro", "transition"]);

/**
 * Validates a generated (or user-modified) EditPlan before it is allowed to
 * drive the rendering pipeline. This is a hard boundary: nothing produced
 * by the AI layer (mock or real) should reach lib/video/render.ts unchecked.
 */
export function validateEditPlan(plan: unknown): ValidationResult {
  const errors: string[] = [];

  if (!plan || typeof plan !== "object") {
    return { valid: false, errors: ["Edit plan must be an object."] };
  }

  const p = plan as Partial<EditPlan>;

  if (typeof p.duration !== "number" || !isFinite(p.duration) || p.duration <= 0) {
    errors.push("duration must be a positive number.");
  }

  if (typeof p.aspectRatio !== "string" || !ASPECT_RATIOS.has(p.aspectRatio)) {
    errors.push('aspectRatio must be one of "9:16", "16:9", "1:1".');
  }

  if (!Array.isArray(p.clips) || p.clips.length === 0) {
    errors.push("clips must be a non-empty array.");
  } else {
    p.clips.forEach((clip, i) => {
      if (typeof clip.start !== "number" || typeof clip.end !== "number") {
        errors.push(`clips[${i}]: start/end must be numbers.`);
        return;
      }
      if (clip.start < 0) errors.push(`clips[${i}]: start must be >= 0.`);
      if (clip.end <= clip.start) errors.push(`clips[${i}]: end must be greater than start.`);
      if (!CLIP_TYPES.has(clip.type)) errors.push(`clips[${i}]: invalid clip type "${clip.type}".`);
    });
  }

  if (typeof p.captions !== "boolean") {
    errors.push("captions must be a boolean.");
  }

  if (typeof p.captionStyle !== "string" || !CAPTION_STYLES.has(p.captionStyle)) {
    errors.push('captionStyle must be one of "off", "basic", "dynamic".');
  }

  if (!Array.isArray(p.captionCues)) {
    errors.push("captionCues must be an array.");
  } else {
    p.captionCues.forEach((cue, i) => {
      if (typeof cue.start !== "number" || typeof cue.end !== "number" || cue.end <= cue.start) {
        errors.push(`captionCues[${i}]: invalid start/end.`);
      }
      if (typeof cue.text !== "string" || cue.text.trim().length === 0) {
        errors.push(`captionCues[${i}]: text must be a non-empty string.`);
      }
    });
  }

  if (typeof p.removeSilences !== "boolean") {
    errors.push("removeSilences must be a boolean.");
  }

  if (typeof p.autoZoom !== "boolean") {
    errors.push("autoZoom must be a boolean.");
  }

  if (!Array.isArray(p.zooms)) {
    errors.push("zooms must be an array.");
  } else {
    p.zooms.forEach((zoom, i) => {
      if (typeof zoom.start !== "number" || typeof zoom.end !== "number" || zoom.end <= zoom.start) {
        errors.push(`zooms[${i}]: invalid start/end.`);
      }
      if (typeof zoom.scale !== "number" || zoom.scale <= 0.5 || zoom.scale > 3) {
        errors.push(`zooms[${i}]: scale must be a number between 0.5 and 3.`);
      }
    });
  }

  if (typeof p.music !== "string" || !MUSIC_CHOICES.has(p.music)) {
    errors.push('music must be one of "original", "add_later".');
  }

  if (typeof p.intensity !== "string" || !INTENSITIES.has(p.intensity)) {
    errors.push('intensity must be one of "low", "medium", "high".');
  }

  if (p.source !== "mock" && p.source !== "ai") {
    errors.push('source must be "mock" or "ai".');
  }

  return { valid: errors.length === 0, errors };
}

export function assertValidEditPlan(plan: unknown): asserts plan is EditPlan {
  const result = validateEditPlan(plan);
  if (!result.valid) {
    throw new Error(`Invalid edit plan: ${result.errors.join(" ")}`);
  }
}
