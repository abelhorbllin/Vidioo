import type { AdvancedOptions, EditingStyleId } from "@/types/edit";

export interface EditingStyleDefinition {
  id: EditingStyleId;
  label: string;
  emoji: string;
  description: string;
  /** Extra natural-language instructions appended to the user's prompt. */
  promptAddition: string;
  /** Advanced option overrides applied when this style is selected. */
  optionOverrides: Partial<AdvancedOptions>;
}

export const EDITING_STYLES: EditingStyleDefinition[] = [
  {
    id: "gaming",
    label: "Gaming",
    emoji: "🎮",
    description: "Fast cuts, reaction zooms, sound effects, captions.",
    promptAddition:
      "Fast cuts on action moments, reaction zooms, punchy sound effect timing, bold captions.",
    optionOverrides: {
      aspectRatio: "16:9",
      captionStyle: "dynamic",
      autoZoom: true,
      intensity: "high",
    },
  },
  {
    id: "tiktok",
    label: "TikTok",
    emoji: "📱",
    description: "9:16, fast cuts, captions, zooms, remove silence.",
    promptAddition:
      "Vertical fast-paced TikTok edit, jump cuts on the beat, dynamic captions, remove dead air.",
    optionOverrides: {
      aspectRatio: "9:16",
      captionStyle: "dynamic",
      removeSilences: true,
      autoZoom: true,
      intensity: "high",
    },
  },
  {
    id: "cinematic",
    label: "Cinematic",
    emoji: "🎬",
    description: "Slower cuts, cinematic transitions, color treatment, music.",
    promptAddition:
      "Slower deliberate cuts, cinematic pacing, moody color treatment, let scenes breathe.",
    optionOverrides: {
      aspectRatio: "16:9",
      captionStyle: "off",
      removeSilences: false,
      autoZoom: false,
      intensity: "low",
    },
  },
  {
    id: "meme",
    label: "Meme",
    emoji: "😂",
    description: "Punchy cuts, big captions, comedic timing.",
    promptAddition:
      "Comedic timing, punch-in zooms on punchlines, oversized captions for emphasis.",
    optionOverrides: {
      aspectRatio: "1:1",
      captionStyle: "dynamic",
      autoZoom: true,
      intensity: "high",
    },
  },
  {
    id: "business",
    label: "Business",
    emoji: "💼",
    description: "Clean cuts, minimal captions, professional pacing.",
    promptAddition:
      "Clean professional pacing, minimal distraction, clear readable captions only where needed.",
    optionOverrides: {
      aspectRatio: "16:9",
      captionStyle: "basic",
      autoZoom: false,
      intensity: "low",
    },
  },
  {
    id: "music",
    label: "Music Edit",
    emoji: "🎵",
    description: "Cuts synced to the beat, minimal captions.",
    promptAddition: "Synchronize cuts to the music's rhythm, let the beat drive the pacing.",
    optionOverrides: {
      captionStyle: "off",
      music: "original",
      intensity: "medium",
    },
  },
  {
    id: "fast-paced",
    label: "Fast-paced",
    emoji: "⚡",
    description: "Maximum energy, rapid cuts, high intensity.",
    promptAddition: "Maximum energy, rapid-fire cuts, no dead time between moments.",
    optionOverrides: {
      removeSilences: true,
      autoZoom: true,
      intensity: "high",
    },
  },
  {
    id: "youtube",
    label: "YouTube",
    emoji: "🎥",
    description: "16:9, chaptered pacing, readable captions.",
    promptAddition:
      "Standard YouTube pacing, keep context between cuts, readable captions for accessibility.",
    optionOverrides: {
      aspectRatio: "16:9",
      captionStyle: "basic",
      intensity: "medium",
    },
  },
];

export function getEditingStyle(id: EditingStyleId | undefined): EditingStyleDefinition | undefined {
  if (!id) return undefined;
  return EDITING_STYLES.find((s) => s.id === id);
}

export const PROMPT_SUGGESTIONS: string[] = [
  "Make it TikTok style",
  "Remove silences",
  "Add dynamic captions",
  "Make it cinematic",
  "Make it funny",
  "Make it fast-paced",
];
