import type { AIProvider, BindableClip, VideoInput } from "@/lib/ai/types";
import {
  buildFootballArc,
  clipTypeForIndex,
  defaultEffectForPurpose,
  finalizeBoundPlan,
  generateFootballCaptionCues,
  generateFootballZooms,
  hashString,
  KNOWN_PLAYERS,
  mergeEffects,
  parseFootballPrompt,
  seededRandom,
} from "@/lib/ai/football";
import { getEditingStyle } from "@/lib/styles/editingStyles";
import type {
  EditClip,
  EditInstructions,
  EditPlan,
  EffectInstruction,
  KeyMoment,
  VideoAnalysis,
} from "@/types/edit";

/**
 * MockAIProvider - a realistic but entirely simulated stand-in for a real
 * video-understanding model, specialized for football edits.
 *
 * It never looks at actual pixels or audio content: "key moments" are
 * generated deterministically from the video's duration using a seeded
 * pseudo-random sequence, football "purposes" (goal/dribble/skill/...) are
 * assigned by cycling a narrative arc or matching keywords in the prompt,
 * and caption text is templated. This lets the whole product pipeline
 * (idea -> plan -> upload clips -> render -> export) be exercised end to
 * end without any external API key or real football action recognition.
 *
 * IMPORTANT: nothing produced here should ever be presented to the user as
 * a genuine AI analysis of their footage. The UI is expected to show a
 * "Demo AI mode" badge whenever `isMock` is true.
 */
export class MockAIProvider implements AIProvider {
  readonly name = "mock";
  readonly isMock = true;

  async analyzeVideo(input: VideoInput): Promise<VideoAnalysis> {
    await simulateLatency(400, 900);

    const keyMoments = generateKeyMoments(input.duration);

    return {
      duration: input.duration,
      width: input.width,
      height: input.height,
      keyMoments,
      silenceIntervals: input.silenceIntervals,
      source: "mock",
    };
  }

  async generateEditPlan(
    analysis: VideoAnalysis,
    instructions: EditInstructions,
  ): Promise<EditPlan> {
    await simulateLatency(600, 1200);

    const football = parseFootballPrompt(instructions.prompt);
    const styleId = instructions.styleId ?? football.styleId;
    const style = getEditingStyle(styleId);
    const options = { ...instructions.options, ...(style?.optionOverrides ?? {}) };

    const promptLower = instructions.prompt.toLowerCase();
    const wantsSilenceRemoval =
      options.removeSilences || /remove.*silen|cut.*silen|no dead air/.test(promptLower);
    const wantsCaptions = options.captionStyle !== "off" || /caption|subtitle/.test(promptLower);
    const wantsZoom = options.autoZoom || football.wantsAutoZoom;

    const clipCount = clipCountForIntensity(options.intensity, analysis.duration);
    const clips = selectClips(analysis.keyMoments, analysis.duration, clipCount);

    const arc = buildFootballArc(clips.length, football.purposeMentions);
    clips.forEach((clip, i) => {
      clip.purpose = arc[i] ?? arc[arc.length - 1];
      clip.effect = defaultEffectForPurpose(clip.purpose);
    });

    const totalDuration = clips.reduce((sum, c) => sum + (c.end - c.start), 0);

    const captionCues = wantsCaptions ? generateFootballCaptionCues(clips) : [];
    const zooms = wantsZoom ? generateFootballZooms(clips) : [];
    const effects = mergeEffects(style?.effectHints ?? [], football.effects);

    return {
      duration: Number(totalDuration.toFixed(2)),
      aspectRatio: options.aspectRatio,
      clips,
      captions: wantsCaptions,
      captionStyle: wantsCaptions ? options.captionStyle : "off",
      captionCues,
      removeSilences: wantsSilenceRemoval,
      autoZoom: wantsZoom,
      zooms,
      music: options.music,
      intensity: options.intensity,
      styleId,
      source: "mock",
      player: instructions.player ?? football.player,
      effects,
      unsupportedRequests: football.unsupportedRequests,
      status: "ready",
    };
  }

  /** Prompt-first: builds an abstract plan before any footage exists. */
  async generateDraftEditPlan(instructions: EditInstructions): Promise<EditPlan> {
    await simulateLatency(500, 1000);

    const football = parseFootballPrompt(instructions.prompt);
    const styleId = instructions.styleId ?? football.styleId;
    const style = getEditingStyle(styleId);
    const options = { ...instructions.options, ...(style?.optionOverrides ?? {}) };

    const targetDuration =
      instructions.targetDurationSeconds ?? football.targetDurationSeconds ?? 15;

    const slotCount = Math.max(3, Math.min(7, Math.round(targetDuration / 3)));
    const arc = instructions.sceneArcOverride?.length
      ? instructions.sceneArcOverride
      : buildFootballArc(slotCount, football.purposeMentions);
    const perSlot = targetDuration / arc.length;

    const wantsCaptions = options.captionStyle !== "off" || /caption|subtitle/.test(instructions.prompt.toLowerCase());
    const wantsZoom = options.autoZoom || football.wantsAutoZoom;

    const clips: EditClip[] = arc.map((purpose, i) => ({
      // Placeholder timing - meaningless until bindDraftPlan() assigns real
      // footage. Duration-wise intent is tracked via the even split below;
      // validateEditPlan() does not check these for a "draft" plan.
      start: Number((i * perSlot).toFixed(2)),
      end: Number(((i + 1) * perSlot).toFixed(2)),
      type: clipTypeForIndex(i, arc.length),
      purpose,
      effect: defaultEffectForPurpose(purpose),
    }));

    const effects = mergeEffects(style?.effectHints ?? [], football.effects);

    return {
      duration: targetDuration,
      aspectRatio: options.aspectRatio,
      clips,
      captions: wantsCaptions,
      captionStyle: wantsCaptions ? options.captionStyle : "off",
      captionCues: [], // assigned once real timing exists, in bindDraftPlan()
      removeSilences: options.removeSilences,
      autoZoom: wantsZoom,
      zooms: [], // assigned in bindDraftPlan()
      music: options.music,
      intensity: options.intensity,
      styleId,
      source: "mock",
      player: instructions.player ?? football.player,
      effects,
      unsupportedRequests: football.unsupportedRequests,
      status: "draft",
    };
  }

  /** Binds a draft plan's abstract slots to real uploaded clips once footage is available. */
  async bindDraftPlan(plan: EditPlan, clips: BindableClip[]): Promise<EditPlan> {
    await simulateLatency(300, 700);

    if (clips.length === 0) {
      throw new Error("Cannot bind an edit plan with no uploaded clips.");
    }

    const targetPerSlot = plan.duration / plan.clips.length;

    // Reuse the same seeded "key moment" scoring used by the classic
    // single-video pipeline (generateKeyMoments/selectClips) so multi-clip
    // football edits pick footage with the same mock "highlight" flavor,
    // rather than a plain uniform-random slice.
    const boundClips: EditClip[] = plan.clips.map((slot, i) => {
      const source = clips[i % clips.length];
      const slotLen = Math.min(targetPerSlot, source.duration);
      const ranked = generateKeyMoments(source.duration).sort((a, b) => b.score - a.score);
      const chosen = ranked.length > 0 ? ranked[i % ranked.length] : null;

      let start: number;
      if (chosen) {
        const mid = (chosen.start + chosen.end) / 2;
        start = Math.max(0, Math.min(source.duration - slotLen, mid - slotLen / 2));
      } else {
        const rand = seededRandom(hashString(source.id) + i);
        start = rand() * Math.max(0, source.duration - slotLen);
      }
      const end = Math.min(source.duration, start + slotLen);

      return {
        ...slot,
        sourceClipId: source.id,
        start: Number(start.toFixed(2)),
        end: Number((end > start ? end : Math.min(source.duration, start + 0.5)).toFixed(2)),
      };
    });

    return { ...finalizeBoundPlan(plan, boundClips), assetMode: "user" };
  }

  async modifyEditPlan(currentPlan: EditPlan, instruction: string): Promise<EditPlan> {
    await simulateLatency(400, 800);

    const text = instruction.toLowerCase();
    const next: EditPlan = structuredClonePlan(currentPlan);

    if (/dynamic|faster|energy|intense/.test(text)) {
      next.intensity = "high";
    }
    if (/slow|calm|relax/.test(text)) {
      next.intensity = "low";
    }
    if (/bigger caption|larger caption|dynamic caption/.test(text)) {
      next.captions = true;
      next.captionStyle = "dynamic";
      if (next.captionCues.length === 0 && next.status === "ready") {
        next.captionCues = generateFootballCaptionCues(next.clips);
      }
    }
    if (/no caption|remove caption|caption off/.test(text)) {
      next.captions = false;
      next.captionStyle = "off";
      next.captionCues = [];
    }
    if (/remove silence|no silence|cut silence/.test(text)) {
      next.removeSilences = true;
    }
    if (/zoom/.test(text) && !/goal|shake|velocity/.test(text)) {
      next.autoZoom = true;
      if (next.zooms.length === 0 && next.status === "ready") {
        next.zooms = generateFootballZooms(next.clips);
      }
    }
    if (/9:16|vertical|tiktok/.test(text)) {
      next.aspectRatio = "9:16";
    }
    if (/16:9|horizontal|landscape/.test(text)) {
      next.aspectRatio = "16:9";
    }
    if (/1:1|square/.test(text)) {
      next.aspectRatio = "1:1";
    }

    // "Replace Ronaldo with Mbappé" / "remplace Ronaldo par Mbappé" -> swap the player context.
    // This only changes EditPlan.player (metadata for future asset lookups) -
    // it never re-fetches or swaps in real footage of the new player.
    const replaceMatch =
      text.match(/replace\s+\w+\s+(?:with|by)\s+([a-zà-ÿ]+)/i) ?? text.match(/remplace\s+\w+\s+par\s+([a-zà-ÿ]+)/i);
    if (replaceMatch) {
      const named = KNOWN_PLAYERS.find((p) => p.toLowerCase() === replaceMatch[1].toLowerCase());
      next.player = named ?? capitalize(replaceMatch[1]);
    }

    // "I want a 2 second intro" -> resize the hook/intro clip specifically.
    const introMatch = text.match(/intro of (\d+(?:\.\d+)?)\s*seconds?/) ?? text.match(/(\d+(?:\.\d+)?)\s*seconds?\s*intro/);
    if (introMatch) {
      const introLen = Number(introMatch[1]);
      next.clips = next.clips.map((c) => {
        if (c.type !== "intro" && c.purpose !== "hook") return c;
        if (next.status === "ready") {
          return { ...c, end: Number((c.start + introLen).toFixed(2)) };
        }
        return c; // Draft plan: no real timing to resize yet - the target length is honored once bound.
      });
      if (next.status === "ready") {
        next.duration = Number(next.clips.reduce((s, c) => s + (c.end - c.start), 0).toFixed(2));
      }
    }

    // --- Football chat heuristics ---

    // "Make the goal hit harder" -> stronger flash/shake on the goal clip(s).
    if (/goal.*hit harder|harder.*goal|make.*goal.*(stronger|bigger|hit)/.test(text)) {
      const goalClips = next.clips.filter((c) => c.purpose === "goal");
      const boosts: EffectInstruction[] = goalClips.flatMap((c) => [
        {
          type: "flash" as const,
          intensity: 0.9,
          start: c.start,
          end: Math.min(c.end, c.start + 0.6),
          sourceClipId: c.sourceClipId,
        },
        { type: "shake" as const, intensity: 0.7, start: c.start, end: c.end, sourceClipId: c.sourceClipId },
      ]);
      next.effects = mergeEffects(next.effects, boosts);
    }

    // "Add more velocity" -> add/boost a velocity effect and clip speed on highlights.
    if (/more velocity|add velocity|faster cuts|speed.*up/.test(text)) {
      next.effects = mergeEffects(next.effects, [{ type: "velocity", intensity: 0.8 }]);
      next.clips = next.clips.map((c) =>
        c.type === "highlight" ? { ...c, speed: Math.min(2, (c.speed ?? 1) + 0.3) } : c,
      );
    }

    // "Make the intro cinematic" -> strip disruptive effects from the hook/intro clip.
    if (/intro.*cinematic|cinematic.*intro|slow.*intro/.test(text)) {
      const introClip = next.clips.find((c) => c.type === "intro" || c.purpose === "hook");
      if (introClip) {
        introClip.speed = 1;
        introClip.effect = undefined;
        next.effects = next.effects.filter(
          (e) =>
            !(
              e.start !== undefined &&
              e.end !== undefined &&
              e.start >= introClip.start &&
              e.end <= introClip.end &&
              e.sourceClipId === introClip.sourceClipId
            ),
        );
      }
    }

    // "Make the edit more aggressive" -> bump/ensure shake+flash+velocity.
    if (/more aggressive|make it aggressive/.test(text)) {
      next.intensity = "high";
      next.styleId = "aggressive";
      const boosted = next.effects.map((e) => ({ ...e, intensity: Math.min(1, e.intensity + 0.2) }));
      const ensured: EffectInstruction[] = ["shake", "flash", "velocity"]
        .filter((t) => !next.effects.some((e) => e.type === t))
        .map((t) => ({ type: t as EffectInstruction["type"], intensity: 0.6 }));
      next.effects = mergeEffects(boosted, ensured);
    }

    // "Remove the shake" -> drop all shake effects.
    if (/remove.*shake|no shake|shake off/.test(text)) {
      next.effects = next.effects.filter((e) => e.type !== "shake");
      next.clips = next.clips.map((c) => (c.effect === "shake" ? { ...c, effect: undefined } : c));
    }

    // "Make it 10 seconds" / "make it 15 seconds" -> re-target total duration.
    const secondsMatch = text.match(/make it (\d+)\s*seconds?|(\d+)\s*seconds?\s*(edit|version)?$/);
    if (secondsMatch) {
      const target = Number(secondsMatch[1] ?? secondsMatch[2]);
      if (target > 0 && next.status === "ready" && next.clips.every((c) => c.end > c.start)) {
        const currentTotal = next.clips.reduce((s, c) => s + (c.end - c.start), 0);
        const scale = target / currentTotal;
        next.clips = next.clips.map((c) => {
          const len = (c.end - c.start) * scale;
          return { ...c, end: Number((c.start + Math.max(0.3, len)).toFixed(2)) };
        });
        next.duration = Number(next.clips.reduce((s, c) => s + (c.end - c.start), 0).toFixed(2));
      } else if (next.status === "draft") {
        next.duration = target;
      }
    }

    // "Make the first N seconds faster": shrink clips overlapping [0, N] by trimming their tails.
    const firstSecondsMatch = text.match(/first (\d+(?:\.\d+)?)\s*seconds?/);
    if (firstSecondsMatch && /faster|speed|quick/.test(text)) {
      const windowEnd = Number(firstSecondsMatch[1]);
      next.clips = next.clips.map((clip) => {
        if (clip.start < windowEnd) {
          const overlap = Math.min(clip.end, windowEnd) - clip.start;
          const shrink = overlap * 0.4;
          return { ...clip, end: Math.max(clip.start + 0.3, clip.end - shrink) };
        }
        return clip;
      });
      next.duration = Number(next.clips.reduce((s, c) => s + (c.end - c.start), 0).toFixed(2));
    }

    return next;
  }
}

function structuredClonePlan(plan: EditPlan): EditPlan {
  return {
    ...plan,
    clips: plan.clips.map((c) => ({ ...c })),
    captionCues: plan.captionCues.map((c) => ({ ...c })),
    zooms: plan.zooms.map((z) => ({ ...z })),
    effects: plan.effects.map((e) => ({ ...e })),
    unsupportedRequests: [...plan.unsupportedRequests],
  };
}

function capitalize(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function simulateLatency(minMs: number, maxMs: number): Promise<void> {
  const ms = minMs + Math.random() * (maxMs - minMs);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generateKeyMoments(duration: number): KeyMoment[] {
  const rand = seededRandom(Math.floor(duration * 1000));
  const targetCount = Math.max(3, Math.min(20, Math.round(duration / 4)));
  const moments: KeyMoment[] = [];

  for (let i = 0; i < targetCount; i++) {
    const start = (duration / targetCount) * i + rand() * (duration / targetCount) * 0.3;
    const length = 1.5 + rand() * 3.5;
    const end = Math.min(duration, start + length);
    if (end - start < 0.5) continue;
    moments.push({
      start: Number(start.toFixed(2)),
      end: Number(end.toFixed(2)),
      score: Number((0.4 + rand() * 0.6).toFixed(2)),
      label: pickLabel(rand),
    });
  }

  return moments.sort((a, b) => a.start - b.start);
}

function pickLabel(rand: () => number): string {
  const labels = [
    "energy spike",
    "motion peak",
    "scene change",
    "loud moment",
    "visual highlight",
    "action beat",
  ];
  return labels[Math.floor(rand() * labels.length)];
}

function clipCountForIntensity(intensity: EditPlan["intensity"], duration: number): number {
  const base = Math.max(2, Math.round(duration / 6));
  if (intensity === "high") return Math.min(base + 3, 24);
  if (intensity === "low") return Math.max(2, base - 2);
  return base;
}

function selectClips(moments: KeyMoment[], duration: number, count: number): EditClip[] {
  const sorted = [...moments].sort((a, b) => b.score - a.score).slice(0, count);
  const byStart = sorted.sort((a, b) => a.start - b.start);

  if (byStart.length === 0) {
    // Fallback: evenly spaced clips covering the whole video.
    const segments = Math.max(2, Math.min(6, Math.round(duration / 5)));
    const clips: EditClip[] = [];
    for (let i = 0; i < segments; i++) {
      const start = (duration / segments) * i;
      const end = Math.min(duration, start + duration / segments - 0.2);
      clips.push({ start: Number(start.toFixed(2)), end: Number(end.toFixed(2)), type: "highlight" });
    }
    return clips;
  }

  return byStart.map((m, idx) => ({
    start: m.start,
    end: m.end,
    type: clipTypeForIndex(idx, byStart.length),
  }));
}
