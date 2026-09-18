import type {
  CaptionCue,
  ClipPurpose,
  EditClip,
  EditPlan,
  EffectInstruction,
  EffectType,
  EditingStyleId,
  ZoomInstruction,
} from "@/types/edit";

/**
 * Football-specific MOCK prompt interpretation.
 *
 * Everything here is keyword/regex matching over the prompt text - it is
 * NOT natural language understanding, and it never looks at pixels or
 * audio. It exists purely so the demo pipeline can produce a plausible,
 * football-flavored EditPlan from a sentence like "Create a 15 second dark
 * Mbappé edit with fast cuts, velocity, zooms and a strong effect on the
 * goal." A real AI provider would replace this file's logic, not the shape
 * of what it returns.
 */

export const KNOWN_PLAYERS = [
  "Mbappé",
  "Mbappe",
  "Messi",
  "Ronaldo",
  "Yamal",
  "Haaland",
  "Vinicius",
  "Vinícius",
  "Bellingham",
];

const PURPOSE_KEYWORDS: { purpose: ClipPurpose; pattern: RegExp }[] = [
  { purpose: "goal", pattern: /\bgoals?\b/ },
  { purpose: "assist", pattern: /\bassists?\b/ },
  { purpose: "dribble", pattern: /\bdribbl\w*/ },
  { purpose: "skill", pattern: /\bskills?\b/ },
  { purpose: "celebration", pattern: /\bcelebrat\w*/ },
  { purpose: "shot", pattern: /\bshots?\b/ },
  { purpose: "tackle", pattern: /\btackles?\b/ },
  { purpose: "save", pattern: /\bsaves?\b/ },
  { purpose: "sprint", pattern: /\bsprints?\b/ },
  { purpose: "pass", pattern: /\bpass(es)?\b/ },
  { purpose: "reaction", pattern: /\breactions?\b/ },
  { purpose: "closeup", pattern: /\bclose[\s-]?ups?\b/ },
];

const STYLE_KEYWORDS: { styleId: EditingStyleId; pattern: RegExp }[] = [
  { styleId: "dark", pattern: /\bdark\b/ },
  { styleId: "aggressive", pattern: /\baggressive\b/ },
  { styleId: "clean", pattern: /\bclean\b/ },
  { styleId: "emotional", pattern: /\bemotional\b/ },
  { styleId: "cinematic", pattern: /\bcinematic\b/ },
  { styleId: "fast-paced", pattern: /\bfast([\s-]paced)?\b/ },
  { styleId: "tiktok", pattern: /\btiktok\b/ },
];

export interface FootballContext {
  player?: string;
  styleId?: EditingStyleId;
  targetDurationSeconds?: number;
  effects: EffectInstruction[];
  purposeMentions: ClipPurpose[];
  wantsAutoZoom: boolean;
  unsupportedRequests: string[];
}

/** Parses a football-edit prompt into mock structured hints. Pure keyword matching - documented as such. */
export function parseFootballPrompt(prompt: string): FootballContext {
  const lower = prompt.toLowerCase();

  const player = KNOWN_PLAYERS.find((name) => lower.includes(name.toLowerCase()));

  const styleMatch = STYLE_KEYWORDS.find((s) => s.pattern.test(lower));

  const durationMatch = lower.match(/(\d+)\s*(?:-|\s)?second/);
  const targetDurationSeconds = durationMatch ? Number(durationMatch[1]) : undefined;

  const effects: EffectInstruction[] = [];
  if (/\bvelocity\b/.test(lower)) effects.push({ type: "velocity", intensity: 0.6 });
  if (/\bshake\b/.test(lower)) effects.push({ type: "shake", intensity: 0.6 });
  if (/\bflash(es)?\b/.test(lower)) effects.push({ type: "flash", intensity: 0.5 });
  if (/\bdark\b/.test(lower)) effects.push({ type: "colorGrade", intensity: 0.6 });

  const purposeMentions = PURPOSE_KEYWORDS.filter((p) => p.pattern.test(lower)).map((p) => p.purpose);

  const wantsAutoZoom = /\bzoom(s|ing)?\b/.test(lower);

  const unsupportedRequests: string[] = [];
  if (/motion\s*blur/.test(lower)) {
    unsupportedRequests.push("Motion blur is not implemented yet - the engine only applies real crop/shake/flash effects.");
  }
  if (/\btransition(s)?\b/.test(lower) && !/\bcinematic\b/.test(lower)) {
    unsupportedRequests.push("Dynamic crossfade transitions between clips are not implemented yet - cuts are hard cuts.");
  }
  if (/beat\s*sync|synchroni[sz]e.*beat|sync.*music/.test(lower)) {
    unsupportedRequests.push(
      "Beat sync is not implemented yet - detectBeats() is stubbed for a future real audio-analysis pass; cuts are not currently timed to the music.",
    );
  }

  return {
    player,
    styleId: styleMatch?.styleId,
    targetDurationSeconds,
    effects,
    purposeMentions,
    wantsAutoZoom,
    unsupportedRequests,
  };
}

export const PURPOSE_LABELS: Record<ClipPurpose, string> = {
  hook: "Hook",
  dribble: "Dribble",
  skill: "Skill",
  goal: "Goal",
  assist: "Assist",
  celebration: "Celebration",
  shot: "Shot",
  tackle: "Tackle",
  save: "Save",
  sprint: "Sprint",
  pass: "Pass",
  reaction: "Reaction",
  closeup: "Close-up",
};

const FILLER_PURPOSES: ClipPurpose[] = ["dribble", "skill", "sprint", "pass", "reaction"];

/**
 * Builds an ordered football narrative arc (purpose per slot) sized to the
 * desired clip count. Mock, not detected: it always opens on "hook" and
 * closes on "goal" + "celebration" (unless the count is too tight for
 * both), filling the middle with whatever purposes were mentioned in the
 * prompt, then generic filler. Explicitly-requested purposes (e.g. "goal")
 * are never dropped by truncation - only filler slots shrink.
 */
export function buildFootballArc(slotCount: number, mentioned: ClipPurpose[]): ClipPurpose[] {
  const count = Math.max(2, slotCount);

  const wantsGoal = mentioned.includes("goal") || !mentioned.includes("celebration");
  const endSlots: ClipPurpose[] = wantsGoal ? ["goal", "celebration"] : ["celebration"];

  if (count === 2) return ["hook", wantsGoal ? "goal" : "celebration"];

  const middleWanted = Math.max(0, count - 1 - endSlots.length);
  const mentionedMiddle = mentioned.filter((p) => p !== "hook" && p !== "celebration" && p !== "goal");
  const middle: ClipPurpose[] = [];

  for (let i = 0; i < middleWanted; i++) {
    middle.push(i < mentionedMiddle.length ? mentionedMiddle[i] : FILLER_PURPOSES[i % FILLER_PURPOSES.length]);
  }

  return ["hook", ...middle, ...endSlots];
}

export function defaultEffectForPurpose(purpose: ClipPurpose): EffectType | undefined {
  switch (purpose) {
    case "skill":
    case "dribble":
    case "closeup":
      return "velocity";
    case "goal":
      return "flash";
    case "celebration":
      return "shake";
    default:
      return undefined;
  }
}

export function clipTypeForIndex(index: number, length: number): EditClip["type"] {
  if (index === 0) return "intro";
  if (index === length - 1) return "outro";
  return "highlight";
}

const FOOTBALL_CAPTION_TEMPLATES: Partial<Record<ClipPurpose, string[]>> = {
  hook: ["Watch this", "Here we go"],
  dribble: ["Silky skills", "Too easy"],
  skill: ["🔥 Skills", "Unreal touch"],
  goal: ["GOAL! ⚽", "He scores!"],
  assist: ["What a pass", "Assist 🎯"],
  celebration: ["🎉 Celebration", "He's done it again"],
  shot: ["Off target... or is it?", "Shot!"],
  tackle: ["Clean tackle", "Won it back"],
  save: ["What a save!", "Denied"],
  sprint: ["Pure pace", "Nobody's catching him"],
  pass: ["Perfect pass", "Vision 🎯"],
  reaction: ["Reaction", "Priceless"],
  closeup: ["Focus", "Locked in"],
};

/** Templated football captions per clip purpose. Still MOCK text, not transcribed speech. */
export function generateFootballCaptionCues(clips: EditClip[]): CaptionCue[] {
  return clips.map((clip, i) => {
    const options = (clip.purpose && FOOTBALL_CAPTION_TEMPLATES[clip.purpose]) || ["This is the moment 🔥"];
    return {
      start: clip.start,
      end: Math.min(clip.end, clip.start + Math.min(2.2, clip.end - clip.start)),
      text: options[i % options.length],
      sourceClipId: clip.sourceClipId,
    };
  });
}

export function generateFootballZooms(clips: EditClip[]): ZoomInstruction[] {
  return clips
    .filter((c) => c.effect === "velocity" || c.purpose === "skill" || c.purpose === "dribble" || c.purpose === "closeup")
    .map((c) => ({ start: c.start, end: c.end, scale: 1.15, sourceClipId: c.sourceClipId }));
}

/** Merges effect instructions by type, keeping the strongest intensity for each. */
export function mergeEffects(...groups: EffectInstruction[][]): EffectInstruction[] {
  const byType = new Map<string, EffectInstruction>();
  for (const group of groups) {
    for (const effect of group) {
      const key = `${effect.type}:${effect.start ?? "g"}:${effect.end ?? "g"}`;
      const existing = byType.get(key);
      if (!existing || effect.intensity > existing.intensity) {
        byType.set(key, effect);
      }
    }
  }
  return Array.from(byType.values());
}

/** Simple seeded PRNG (mulberry32) so mock output is stable across calls for the same seed. */
export function seededRandom(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) {
    h = (Math.imul(31, h) + value.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

/** Per-clip short "headline effect" windows (flash on the goal, shake on the celebration, ...), scoped to each clip's own real timing. */
export function computeClipScopedEffects(clips: EditClip[]): EffectInstruction[] {
  return clips
    .filter((c) => c.effect)
    .map((c) => ({
      type: c.effect!,
      intensity: 0.6,
      start: c.start,
      end: Math.min(c.end, c.start + Math.min(0.6, c.end - c.start)),
      sourceClipId: c.sourceClipId,
    }));
}

/**
 * Finishes turning a draft plan "ready" once its clips have real start/end
 * times bound to source footage: computes captions/zooms/clip-scoped
 * effects from the now-real timeline and the final total duration. Shared
 * by both the AIProvider's bindDraftPlan (user-uploaded footage) and
 * DemoAssetProvider's binder (synthetic placeholder footage).
 */
export function finalizeBoundPlan(plan: EditPlan, boundClips: EditClip[]): EditPlan {
  const finalDuration = boundClips.reduce((sum, c) => sum + (c.end - c.start), 0);
  const captionCues = plan.captions ? generateFootballCaptionCues(boundClips) : [];
  const zooms = plan.autoZoom ? generateFootballZooms(boundClips) : [];
  const clipScopedEffects = computeClipScopedEffects(boundClips);

  return {
    ...plan,
    clips: boundClips,
    duration: Number(finalDuration.toFixed(2)),
    captionCues,
    zooms,
    effects: mergeEffects(plan.effects, clipScopedEffects),
    status: "ready",
  };
}
