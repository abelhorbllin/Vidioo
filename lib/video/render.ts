import fs from "fs/promises";
import { CAPTION_FONTS_DIR, escapeFilterPath, runFfmpeg } from "@/lib/video/ffmpeg";
import { generateAssSubtitle } from "@/lib/video/captions";
import { getFile, reserveOutputPath, type ProjectState, type StoredFile } from "@/lib/storage/fileStore";
import type { AspectRatio, CaptionCue, EditClip, EditPlan, EffectInstruction } from "@/types/edit";
import ffmpeg from "fluent-ffmpeg";

/**
 * Real ffmpeg-driven video editing engine.
 *
 * Every function here actually invokes ffmpeg and produces a genuinely
 * modified video file - nothing in this module fabricates a result.
 * Honest limitations, called out explicitly rather than hidden:
 *
 *  - addCaptions() burns in whatever text is provided by the edit plan.
 *    It does NOT perform speech-to-text - caption text comes from the AI
 *    layer (mock templates unless a real transcription provider is wired
 *    up later), not from analyzing the audio track.
 *  - applyZoom()'s "dynamic" vs "basic" distinction is a static crop+scale
 *    zoom on the requested time ranges, not an animated Ken-Burns pan.
 *  - applyShake() is a time-varying crop offset, not a physically simulated
 *    camera shake.
 *  - "velocity" is a constant speed multiplier per clip (setpts/atempo),
 *    clamped to ffmpeg atempo's single-pass range [0.5, 2] - not a smooth
 *    speed ramp.
 *  - Motion blur and cross-fade transitions between clips are NOT
 *    implemented - a plan may list them in `unsupportedRequests` instead of
 *    silently ignoring the request. Cuts are always hard cuts.
 *  - Beat-synchronized cutting is NOT implemented - see lib/video/audio.ts.
 */

export type ResolutionLabel = "preview" | "720p" | "1080p";

const RESOLUTION_PRESETS: Record<AspectRatio, Record<ResolutionLabel, { width: number; height: number }>> = {
  "9:16": {
    preview: { width: 404, height: 720 },
    "720p": { width: 720, height: 1280 },
    "1080p": { width: 1080, height: 1920 },
  },
  "16:9": {
    preview: { width: 854, height: 480 },
    "720p": { width: 1280, height: 720 },
    "1080p": { width: 1920, height: 1080 },
  },
  "1:1": {
    preview: { width: 480, height: 480 },
    "720p": { width: 720, height: 720 },
    "1080p": { width: 1080, height: 1080 },
  },
};

/** Resolves which absolute source file path a given clip's footage comes from. */
export type SourceResolver = (clip: EditClip) => string;

interface Segment {
  origStart: number;
  origEnd: number;
  sourcePath: string;
  /** Opaque clip id, used only to disambiguate overlapping timestamps across different source files. Never sent to ffmpeg. */
  sourceClipId?: string;
  /** Playback speed multiplier, clamped to ffmpeg atempo's supported [0.5, 2] range. */
  speed: number;
}

interface MappedSegment extends Segment {
  newStart: number;
  newEnd: number;
}

function clampSpeed(speed: number | undefined): number {
  if (!speed || !isFinite(speed)) return 1;
  return Math.min(2, Math.max(0.5, speed));
}

function buildTimeline(segments: Segment[]): MappedSegment[] {
  let cursor = 0;
  return segments.map((seg) => {
    const newLen = (seg.origEnd - seg.origStart) / seg.speed;
    const mapped: MappedSegment = { ...seg, newStart: cursor, newEnd: cursor + newLen };
    cursor += newLen;
    return mapped;
  });
}

/**
 * Maps an [start,end) range from the ORIGINAL video timeline to the
 * post-cut (and post-speed) timeline. When `range.sourceClipId` is set,
 * only segments from that same source clip are considered - this matters
 * because two clips cut from different uploaded files can easily share the
 * same numeric timestamps (e.g. both starting near t=0).
 */
function mapRangeToTimeline(
  timeline: MappedSegment[],
  range: { start: number; end: number; sourceClipId?: string },
) {
  let mappedStart: number | null = null;
  let mappedEnd: number | null = null;

  for (const seg of timeline) {
    if (range.sourceClipId !== undefined && seg.sourceClipId !== range.sourceClipId) continue;
    const overlapStart = Math.max(seg.origStart, range.start);
    const overlapEnd = Math.min(seg.origEnd, range.end);
    if (overlapEnd > overlapStart) {
      const segNewStart = seg.newStart + (overlapStart - seg.origStart) / seg.speed;
      const segNewEnd = seg.newStart + (overlapEnd - seg.origStart) / seg.speed;
      if (mappedStart === null || segNewStart < mappedStart) mappedStart = segNewStart;
      if (mappedEnd === null || segNewEnd > mappedEnd) mappedEnd = segNewEnd;
    }
  }

  if (mappedStart === null || mappedEnd === null) return null;
  return { start: mappedStart, end: mappedEnd };
}

/** Detects true silence intervals using ffmpeg's silencedetect filter (real signal analysis, not AI). */
export function detectSilenceIntervals(
  inputPath: string,
  options: { noiseFloorDb?: number; minDurationSec?: number } = {},
): Promise<{ start: number; end: number }[]> {
  const noiseFloor = options.noiseFloorDb ?? -40;
  const minDuration = options.minDurationSec ?? 0.6;

  return new Promise((resolve, reject) => {
    let stderr = "";
    ffmpeg(inputPath)
      .audioFilters(`silencedetect=noise=${noiseFloor}dB:d=${minDuration}`)
      .format("null")
      .output("-")
      .on("stderr", (line) => {
        stderr += line + "\n";
      })
      .on("error", (err) => reject(new Error(`Silence detection failed: ${err.message}`)))
      .on("end", () => resolve(parseSilenceLog(stderr)))
      .run();
  });
}

/** Runs detectSilenceIntervals() once per unique source path, in parallel. */
export async function detectSilenceIntervalsForSources(
  sourcePaths: string[],
): Promise<Map<string, { start: number; end: number }[]>> {
  const unique = Array.from(new Set(sourcePaths));
  const results = await Promise.all(
    unique.map(async (path) => {
      try {
        return [path, await detectSilenceIntervals(path)] as [string, { start: number; end: number }[]];
      } catch {
        return [path, []] as [string, { start: number; end: number }[]];
      }
    }),
  );
  return new Map(results);
}

function parseSilenceLog(stderr: string): { start: number; end: number }[] {
  const starts = [...stderr.matchAll(/silence_start:\s*([\d.]+)/g)].map((m) => Number(m[1]));
  const ends = [...stderr.matchAll(/silence_end:\s*([\d.]+)/g)].map((m) => Number(m[1]));
  const intervals: { start: number; end: number }[] = [];
  for (let i = 0; i < Math.min(starts.length, ends.length); i++) {
    intervals.push({ start: starts[i], end: ends[i] });
  }
  return intervals;
}

/** Removes overlapping silence from a set of clips, returning refined (possibly split) segments. */
export function removeSilences(
  clips: EditClip[],
  resolveSource: SourceResolver,
  silenceByPath: Map<string, { start: number; end: number }[]>,
  minFragmentSec = 0.35,
): Segment[] {
  const refined: Segment[] = [];

  for (const clip of clips) {
    const sourcePath = resolveSource(clip);
    const sourceClipId = clip.sourceClipId;
    const silenceIntervals = silenceByPath.get(sourcePath) ?? [];
    const speed = clampSpeed(clip.speed);
    let cursor = clip.start;
    const overlapping = silenceIntervals
      .filter((s) => s.end > clip.start && s.start < clip.end)
      .sort((a, b) => a.start - b.start);

    for (const silence of overlapping) {
      const silStart = Math.max(silence.start, clip.start);
      const silEnd = Math.min(silence.end, clip.end);
      if (silStart > cursor + minFragmentSec) {
        refined.push({ origStart: cursor, origEnd: silStart, sourcePath, sourceClipId, speed });
      }
      cursor = Math.max(cursor, silEnd);
    }

    if (clip.end - cursor > minFragmentSec) {
      refined.push({ origStart: cursor, origEnd: clip.end, sourcePath, sourceClipId, speed });
    }
  }

  return refined.length > 0
    ? refined
    : clips.map((c) => ({
        origStart: c.start,
        origEnd: c.end,
        sourcePath: resolveSource(c),
        sourceClipId: c.sourceClipId,
        speed: clampSpeed(c.speed),
      }));
}

/** Cuts and concatenates the given segments - possibly from several different source files - into one video. */
export async function cutVideo(segments: Segment[]): Promise<StoredFile> {
  if (segments.length === 0) throw new Error("cutVideo requires at least one segment.");

  const output = await reserveOutputPath("render", ".mp4", "video/mp4");
  const uniquePaths = Array.from(new Set(segments.map((s) => s.sourcePath)));
  const pathIndex = new Map(uniquePaths.map((p, i) => [p, i]));

  const filterParts: string[] = [];
  segments.forEach((seg, i) => {
    const inputIndex = pathIndex.get(seg.sourcePath)!;
    const speed = seg.speed;
    const vPts = speed !== 1 ? `(PTS-STARTPTS)/${speed}` : "PTS-STARTPTS";
    filterParts.push(
      `[${inputIndex}:v]trim=start=${seg.origStart}:end=${seg.origEnd},setpts=${vPts},setsar=1[v${i}]`,
    );
    const aFilter =
      speed !== 1
        ? `[${inputIndex}:a]atrim=start=${seg.origStart}:end=${seg.origEnd},asetpts=PTS-STARTPTS,atempo=${speed}[a${i}]`
        : `[${inputIndex}:a]atrim=start=${seg.origStart}:end=${seg.origEnd},asetpts=PTS-STARTPTS[a${i}]`;
    filterParts.push(aFilter);
  });
  const concatInputs = segments.map((_, i) => `[v${i}][a${i}]`).join("");
  filterParts.push(`${concatInputs}concat=n=${segments.length}:v=1:a=1[vout][aout]`);

  const command = ffmpeg();
  uniquePaths.forEach((p) => command.input(p));
  command
    .complexFilter(filterParts.join(";"), [])
    .outputOptions(["-map", "[vout]", "-map", "[aout]"])
    .videoCodec("libx264")
    .audioCodec("aac")
    .output(output.absolutePath);

  await runFfmpeg(command);
  return output;
}

/** Crops and scales the video to the target aspect ratio / resolution. */
export async function convertAspectRatio(
  inputPath: string,
  aspectRatio: AspectRatio,
  resolution: ResolutionLabel,
): Promise<StoredFile> {
  const { width, height } = RESOLUTION_PRESETS[aspectRatio][resolution];
  const output = await reserveOutputPath("render", ".mp4", "video/mp4");

  // Scale to fill the target box, then center-crop the overflow.
  const filter = `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`;

  const command = ffmpeg(inputPath)
    .videoFilters(filter)
    .videoCodec("libx264")
    .audioCodec("aac")
    .output(output.absolutePath);

  await runFfmpeg(command);
  return output;
}

/** Applies a global color grade (currently just "dark": darker, higher contrast, desaturated). */
export async function applyColorGrade(input: StoredFile, intensity: number): Promise<StoredFile> {
  if (intensity <= 0) return input;

  const output = await reserveOutputPath("render", ".mp4", "video/mp4");
  const contrast = (1 + intensity * 0.4).toFixed(2);
  const brightness = (-0.08 * intensity).toFixed(3);
  const saturation = (1 - intensity * 0.3).toFixed(2);

  const command = ffmpeg(input.absolutePath)
    .videoFilters(`eq=contrast=${contrast}:brightness=${brightness}:saturation=${saturation}`)
    .videoCodec("libx264")
    .audioCodec("aac")
    .output(output.absolutePath);

  await runFfmpeg(command);
  return output;
}

/** Applies a static crop-in zoom over the given (new-timeline) ranges. */
export async function applyZoom(
  input: StoredFile,
  zooms: { start: number; end: number; scale: number }[],
  dimensions: { width: number; height: number },
  totalDuration: number,
): Promise<StoredFile> {
  if (zooms.length === 0) {
    return input;
  }

  let current = input;
  const currentDuration = totalDuration;

  for (const zoom of zooms) {
    const output = await reserveOutputPath("render", ".mp4", "video/mp4");
    const { width, height } = dimensions;
    const cropW = Math.round(width / zoom.scale / 2) * 2;
    const cropH = Math.round(height / zoom.scale / 2) * 2;

    const zStart = Math.max(0, zoom.start);
    const zEnd = Math.min(currentDuration, zoom.end);
    if (zEnd <= zStart) continue;

    const segments: string[] = [];
    const videoLabels: string[] = [];

    if (zStart > 0.05) {
      segments.push(`[0:v]trim=start=0:end=${zStart},setpts=PTS-STARTPTS,setsar=1[vpre]`);
      videoLabels.push("[vpre]");
    }

    segments.push(
      `[0:v]trim=start=${zStart}:end=${zEnd},setpts=PTS-STARTPTS,` +
        `crop=${cropW}:${cropH}:(iw-${cropW})/2:(ih-${cropH})/2,scale=${width}:${height},setsar=1[vzoom]`,
    );
    videoLabels.push("[vzoom]");

    if (zEnd < currentDuration - 0.05) {
      segments.push(`[0:v]trim=start=${zEnd}:end=${currentDuration},setpts=PTS-STARTPTS,setsar=1[vpost]`);
      videoLabels.push("[vpost]");
    }

    const filterGraph = `${segments.join(";")};${videoLabels.join("")}concat=n=${videoLabels.length}:v=1:a=0[vout]`;

    const command = ffmpeg(current.absolutePath)
      .complexFilter(filterGraph, [])
      .outputOptions(["-map", "[vout]", "-map", "0:a"])
      .videoCodec("libx264")
      .audioCodec("aac")
      .output(output.absolutePath);

    await runFfmpeg(command);
    current = output;
  }

  return current;
}

/** Applies a time-varying crop offset ("camera shake") over the given (new-timeline) ranges. */
export async function applyShake(
  input: StoredFile,
  ranges: { start: number; end: number; intensity: number }[],
  dimensions: { width: number; height: number },
  totalDuration: number,
): Promise<StoredFile> {
  if (ranges.length === 0) return input;

  let current = input;
  const { width, height } = dimensions;
  // Shake by cropping a slightly smaller box that jitters within the frame.
  const shakeW = Math.round(width * 0.92 / 2) * 2;
  const shakeH = Math.round(height * 0.92 / 2) * 2;
  const maxOffsetX = Math.max(2, Math.floor((width - shakeW) / 2));
  const maxOffsetY = Math.max(2, Math.floor((height - shakeH) / 2));

  for (const range of ranges) {
    const output = await reserveOutputPath("render", ".mp4", "video/mp4");
    const rStart = Math.max(0, range.start);
    const rEnd = Math.min(totalDuration, range.end);
    if (rEnd <= rStart) continue;

    const amp = Math.max(0.1, Math.min(1, range.intensity));
    const freq = 14; // Hz-ish jitter rate
    const xExpr = `${maxOffsetX}+${maxOffsetX * amp}*sin(2*PI*${freq}*t)`;
    const yExpr = `${maxOffsetY}+${maxOffsetY * amp}*cos(2*PI*${freq * 1.3}*t)`;

    const segments: string[] = [];
    const labels: string[] = [];

    if (rStart > 0.05) {
      segments.push(`[0:v]trim=start=0:end=${rStart},setpts=PTS-STARTPTS,setsar=1[vpre]`);
      labels.push("[vpre]");
    }

    segments.push(
      `[0:v]trim=start=${rStart}:end=${rEnd},setpts=PTS-STARTPTS,` +
        `crop=${shakeW}:${shakeH}:${xExpr}:${yExpr},scale=${width}:${height},setsar=1[vshake]`,
    );
    labels.push("[vshake]");

    if (rEnd < totalDuration - 0.05) {
      segments.push(`[0:v]trim=start=${rEnd}:end=${totalDuration},setpts=PTS-STARTPTS,setsar=1[vpost]`);
      labels.push("[vpost]");
    }

    const filterGraph = `${segments.join(";")};${labels.join("")}concat=n=${labels.length}:v=1:a=0[vout]`;

    const command = ffmpeg(current.absolutePath)
      .complexFilter(filterGraph, [])
      .outputOptions(["-map", "[vout]", "-map", "0:a"])
      .videoCodec("libx264")
      .audioCodec("aac")
      .output(output.absolutePath);

    await runFfmpeg(command);
    current = output;
  }

  return current;
}

/** Applies a brief brightness spike ("flash") at the given (new-timeline) ranges. Single pass. */
export async function applyFlash(
  input: StoredFile,
  ranges: { start: number; end: number; intensity: number }[],
): Promise<StoredFile> {
  if (ranges.length === 0) return input;

  const output = await reserveOutputPath("render", ".mp4", "video/mp4");
  const filters = ranges.map((r) => {
    const amp = Math.max(0.1, Math.min(1, r.intensity));
    return `eq=brightness=${(amp * 0.6).toFixed(2)}:enable='between(t,${r.start},${r.end})'`;
  });

  const command = ffmpeg(input.absolutePath)
    .videoFilters(filters)
    .videoCodec("libx264")
    .audioCodec("aac")
    .output(output.absolutePath);

  await runFfmpeg(command);
  return output;
}

/** Burns in caption text at the given (new-timeline) cue ranges, via an .ass subtitle track. */
export async function addCaptions(
  input: StoredFile,
  cues: CaptionCue[],
  style: "basic" | "dynamic",
  dimensions: { width: number; height: number },
): Promise<StoredFile> {
  if (cues.length === 0) {
    return input;
  }

  const output = await reserveOutputPath("render", ".mp4", "video/mp4");
  const assContent = generateAssSubtitle(cues, style, dimensions);
  const assFile = await reserveOutputPath("render", ".ass", "text/plain");
  await fs.writeFile(assFile.absolutePath, assContent, "utf-8");

  const subtitlesFilter =
    `subtitles=filename='${escapeFilterPath(assFile.absolutePath)}':` +
    `fontsdir='${escapeFilterPath(CAPTION_FONTS_DIR)}'`;

  const command = ffmpeg(input.absolutePath)
    .videoFilters(subtitlesFilter)
    .videoCodec("libx264")
    .audioCodec("aac")
    .output(output.absolutePath);

  await runFfmpeg(command);
  return output;
}

export interface RenderResult {
  file: StoredFile;
  cutCount: number;
  finalDuration: number;
}

function effectsOfType(effects: EffectInstruction[], type: EffectInstruction["type"]) {
  return effects.filter((e) => e.type === type);
}

/**
 * Orchestrates the full pipeline for a given EditPlan:
 * cut -> (optional) silence removal -> aspect ratio -> color grade -> zoom
 * -> shake -> flash -> captions.
 *
 * `resolveSource` maps each clip to the absolute path of the uploaded
 * footage it should be cut from - this is what makes multi-clip football
 * edits (each clip.sourceClipId pointing at a different upload) work, while
 * the legacy single-video flow just resolves every clip to the same path.
 *
 * The plan MUST be "ready" (see EditPlan["status"]) - a "draft" plan has no
 * real clip timing yet and cannot be rendered.
 */
export async function renderVideo(
  plan: EditPlan,
  resolveSource: SourceResolver,
  resolution: ResolutionLabel,
): Promise<RenderResult> {
  if (plan.status !== "ready") {
    throw new Error("Cannot render a draft edit plan - upload clips to bind it first.");
  }

  let baseSegments: Segment[] = plan.clips
    .map((c) => ({
      origStart: c.start,
      origEnd: c.end,
      sourcePath: resolveSource(c),
      sourceClipId: c.sourceClipId,
      speed: clampSpeed(c.speed),
    }))
    .sort((a, b) => a.origStart - b.origStart);

  if (plan.removeSilences) {
    const silenceByPath = await detectSilenceIntervalsForSources(baseSegments.map((s) => s.sourcePath));
    baseSegments = removeSilences(plan.clips, resolveSource, silenceByPath).sort((a, b) => a.origStart - b.origStart);
  }

  const timeline = buildTimeline(baseSegments);
  const finalDuration = timeline.length > 0 ? timeline[timeline.length - 1].newEnd : 0;

  let current = await cutVideo(baseSegments);

  const colorGradeEffect = effectsOfType(plan.effects, "colorGrade")[0];
  if (colorGradeEffect) {
    current = await applyColorGrade(current, colorGradeEffect.intensity);
  }

  current = await convertAspectRatio(current.absolutePath, plan.aspectRatio, resolution);
  const dims = RESOLUTION_PRESETS[plan.aspectRatio][resolution];

  if (plan.autoZoom && plan.zooms.length > 0) {
    const mappedZooms = plan.zooms
      .map((z) => {
        const mapped = mapRangeToTimeline(timeline, z);
        return mapped ? { ...mapped, scale: z.scale } : null;
      })
      .filter((z): z is { start: number; end: number; scale: number } => z !== null);

    current = await applyZoom(current, mappedZooms, dims, finalDuration);
  }

  const shakeRanges = mapEffectRanges(effectsOfType(plan.effects, "shake"), timeline, finalDuration);
  if (shakeRanges.length > 0) {
    current = await applyShake(current, shakeRanges, dims, finalDuration);
  }

  const flashRanges = mapEffectRanges(effectsOfType(plan.effects, "flash"), timeline, finalDuration);
  if (flashRanges.length > 0) {
    current = await applyFlash(current, flashRanges);
  }

  if (plan.captions && plan.captionCues.length > 0) {
    const mappedCues = plan.captionCues
      .map((cue) => {
        const mapped = mapRangeToTimeline(timeline, cue);
        return mapped ? { ...mapped, text: cue.text } : null;
      })
      .filter((c): c is CaptionCue => c !== null);

    current = await addCaptions(current, mappedCues, plan.captionStyle === "dynamic" ? "dynamic" : "basic", dims);
  }

  return { file: current, cutCount: baseSegments.length, finalDuration };
}

/** Maps a set of clip-scoped or global effect ranges onto the post-cut timeline. A missing start/end covers the whole edit. */
function mapEffectRanges(
  effects: EffectInstruction[],
  timeline: MappedSegment[],
  finalDuration: number,
): { start: number; end: number; intensity: number }[] {
  return effects
    .map((e) => {
      if (e.start === undefined || e.end === undefined) {
        return { start: 0, end: finalDuration, intensity: e.intensity };
      }
      const mapped = mapRangeToTimeline(timeline, { start: e.start, end: e.end, sourceClipId: e.sourceClipId });
      return mapped ? { ...mapped, intensity: e.intensity } : null;
    })
    .filter((r): r is { start: number; end: number; intensity: number } => r !== null);
}

export function getResolutionDimensions(aspectRatio: AspectRatio, resolution: ResolutionLabel) {
  return RESOLUTION_PRESETS[aspectRatio][resolution];
}

/**
 * Builds a SourceResolver for a project: clips with a `sourceClipId` resolve
 * to that specific uploaded file (the multi-clip football flow); clips
 * without one (the legacy single-video flow) all resolve to the project's
 * primary video.
 */
export function buildProjectSourceResolver(project: ProjectState): SourceResolver {
  return (clip: EditClip) => {
    const fileId = clip.sourceClipId ?? (project.videoFileId as string | undefined);
    if (!fileId) {
      throw new Error("This clip has no bound source footage.");
    }
    const file = getFile(fileId);
    if (!file) {
      throw new Error(`Source clip ${fileId} could not be found - it may have expired.`);
    }
    return file.absolutePath;
  };
}
