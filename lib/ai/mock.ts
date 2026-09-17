import type { AIProvider, VideoInput } from "@/lib/ai/types";
import { getEditingStyle } from "@/lib/styles/editingStyles";
import type {
  CaptionCue,
  EditClip,
  EditInstructions,
  EditPlan,
  KeyMoment,
  VideoAnalysis,
  ZoomInstruction,
} from "@/types/edit";

/**
 * MockAIProvider - a realistic but entirely simulated stand-in for a real
 * video-understanding model.
 *
 * It never looks at actual pixels or audio content: "key moments" are
 * generated deterministically from the video's duration using a seeded
 * pseudo-random sequence, and caption text is templated. This lets the
 * whole product pipeline (upload -> analyze -> plan -> render -> export) be
 * exercised end to end without any external API key.
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

    const style = getEditingStyle(instructions.styleId);
    const options = { ...instructions.options, ...(style?.optionOverrides ?? {}) };

    const promptLower = instructions.prompt.toLowerCase();
    const wantsSilenceRemoval =
      options.removeSilences || /remove.*silen|cut.*silen|no dead air/.test(promptLower);
    const wantsCaptions =
      options.captionStyle !== "off" || /caption|subtitle/.test(promptLower);
    const wantsZoom = options.autoZoom || /zoom/.test(promptLower);

    const clipCount = clipCountForIntensity(options.intensity, analysis.duration);
    const clips = selectClips(analysis.keyMoments, analysis.duration, clipCount);
    const totalDuration = clips.reduce((sum, c) => sum + (c.end - c.start), 0);

    const captionCues = wantsCaptions ? generateCaptionCues(clips, instructions.prompt) : [];
    const zooms = wantsZoom ? generateZooms(clips) : [];

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
      styleId: instructions.styleId,
      source: "mock",
    };
  }

  async modifyEditPlan(currentPlan: EditPlan, instruction: string): Promise<EditPlan> {
    await simulateLatency(400, 800);

    const text = instruction.toLowerCase();
    const next: EditPlan = structuredClonePlan(currentPlan);

    if (/dynamic|faster|energy|intense/.test(text)) {
      next.intensity = "high";
    }
    if (/slow|calm|relax|cinematic/.test(text)) {
      next.intensity = "low";
    }
    if (/bigger caption|larger caption|dynamic caption/.test(text)) {
      next.captions = true;
      next.captionStyle = "dynamic";
      if (next.captionCues.length === 0) {
        next.captionCues = generateCaptionCues(next.clips, instruction);
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
    if (/zoom/.test(text)) {
      next.autoZoom = true;
      if (next.zooms.length === 0) {
        next.zooms = generateZooms(next.clips);
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
  };
}

function simulateLatency(minMs: number, maxMs: number): Promise<void> {
  const ms = minMs + Math.random() * (maxMs - minMs);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Simple seeded PRNG (mulberry32) so mock output is stable across calls for the same duration. */
function seededRandom(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
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
    type: idx === 0 ? "intro" : idx === byStart.length - 1 ? "outro" : "highlight",
  }));
}

function generateCaptionCues(clips: EditClip[], prompt: string): CaptionCue[] {
  const templates = [
    "This is the moment 🔥",
    "Watch this",
    "No way this just happened",
    "Here we go",
    "Wait for it...",
    "This is huge",
  ];
  return clips.map((clip, i) => ({
    start: clip.start,
    end: Math.min(clip.end, clip.start + Math.min(2.5, clip.end - clip.start)),
    text: templates[i % templates.length],
  }));
}

function generateZooms(clips: EditClip[]): ZoomInstruction[] {
  return clips
    .filter((_, idx) => idx % 2 === 0)
    .map((clip) => ({
      start: clip.start,
      end: clip.end,
      scale: 1.12,
    }));
}
