import type { AdvancedOptions, EditingStyleId, EffectType } from "@/types/edit";

export interface EditingStyleDefinition {
  id: EditingStyleId;
  label: string;
  emoji: string;
  description: string;
  /** Extra natural-language instructions appended to the user's prompt. */
  promptAddition: string;
  /** Advanced option overrides applied when this style is selected. */
  optionOverrides: Partial<AdvancedOptions>;
  /** Real effects (see lib/video/render.ts) this style implies for a football edit. Mock-assigned, not detected. */
  effectHints?: { type: EffectType; intensity: number }[];
  /** Shown in the football-focused style picker in /app. */
  football?: boolean;
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
    description: "Slow intro, smooth transitions, dramatic ending, cinematic zoom.",
    promptAddition:
      "Slower deliberate cuts, cinematic pacing, moody color treatment, let scenes breathe.",
    optionOverrides: {
      aspectRatio: "16:9",
      captionStyle: "off",
      removeSilences: false,
      autoZoom: false,
      intensity: "low",
    },
    effectHints: [{ type: "colorGrade", intensity: 0.4 }],
    football: true,
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
    label: "Fast",
    emoji: "⚡",
    description: "Rapid cuts, velocity, beat sync, quick zooms.",
    promptAddition: "Maximum energy, rapid-fire cuts, no dead time between moments.",
    optionOverrides: {
      removeSilences: true,
      autoZoom: true,
      intensity: "high",
    },
    effectHints: [{ type: "velocity", intensity: 0.6 }],
    football: true,
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
  // --- Football-specific styles ---
  {
    id: "dark",
    label: "Dark",
    emoji: "🥶",
    description: "Dark color grading, high contrast, flashes, shake, dramatic pacing.",
    promptAddition: "Dark moody color grade, high contrast, occasional flash and camera shake on impact.",
    optionOverrides: {
      captionStyle: "dynamic",
      intensity: "high",
    },
    effectHints: [
      { type: "colorGrade", intensity: 0.7 },
      { type: "flash", intensity: 0.5 },
      { type: "shake", intensity: 0.4 },
    ],
    football: true,
  },
  {
    id: "aggressive",
    label: "Aggressive",
    emoji: "💥",
    description: "Strong shake, rapid cuts, flashes, velocity.",
    promptAddition: "Aggressive rapid cuts, strong camera shake, flash hits, sped-up highlight moments.",
    optionOverrides: {
      removeSilences: true,
      autoZoom: true,
      intensity: "high",
    },
    effectHints: [
      { type: "shake", intensity: 0.8 },
      { type: "flash", intensity: 0.6 },
      { type: "velocity", intensity: 0.7 },
    ],
    football: true,
  },
  {
    id: "clean",
    label: "Clean",
    emoji: "✨",
    description: "Minimal effects, smooth transitions, professional appearance.",
    promptAddition: "Minimal effects, smooth professional pacing, no shake or flash.",
    optionOverrides: {
      captionStyle: "basic",
      autoZoom: false,
      intensity: "medium",
    },
    effectHints: [],
    football: true,
  },
  {
    id: "emotional",
    label: "Emotional",
    emoji: "❤️",
    description: "Slower pacing, dramatic moments, emotional ending.",
    promptAddition: "Slower emotional pacing, let key moments breathe, dramatic ending on the celebration.",
    optionOverrides: {
      captionStyle: "basic",
      autoZoom: false,
      intensity: "low",
    },
    effectHints: [{ type: "colorGrade", intensity: 0.3 }],
    football: true,
  },
];

export function getEditingStyle(id: EditingStyleId | undefined): EditingStyleDefinition | undefined {
  if (!id) return undefined;
  return EDITING_STYLES.find((s) => s.id === id);
}

/** The 6 styles shown in the football-focused style picker at the top of /app. */
export function getFootballStyles(): EditingStyleDefinition[] {
  return EDITING_STYLES.filter((s) => s.football);
}

export const PROMPT_SUGGESTIONS: string[] = [
  "Make it TikTok style",
  "Remove silences",
  "Add dynamic captions",
  "Make it cinematic",
  "Make it funny",
  "Make it fast-paced",
];

export const FOOTBALL_PROMPT_SUGGESTIONS: string[] = [
  "Make it dark",
  "Add velocity",
  "Zoom on his skills",
  "Strong effect on the goal",
  "Make it 15 seconds",
  "Add shake on impact",
];

export const FOOTBALL_PLAYER_SUGGESTIONS: string[] = [
  "Mbappé",
  "Messi",
  "Ronaldo",
  "Yamal",
  "Vinicius",
  "Bellingham",
];
