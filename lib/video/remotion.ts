import fs from "fs/promises";
import path from "path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { DATA_ROOT, reserveOutputPath, type StoredFile } from "@/lib/storage/fileStore";
import { MAIN_COMPOSITION_ID } from "@/remotion/constants";
import type { MainVideoProps, RemotionCaption, RemotionClip } from "@/remotion/compositions/MainVideo";
import { getResolutionDimensions, type ResolutionLabel, type SourceResolver } from "@/lib/video/render";
import type { CaptionCue, EditClip, EditPlan } from "@/types/edit";

/**
 * Remotion render engine - a second, coexisting way to turn an EditPlan into
 * an MP4, alongside the ffmpeg engine in lib/video/render.ts (see
 * lib/video/engine.ts for how a render picks one or the other).
 *
 * Pipeline, matching the brief exactly:
 *   1. receive an EditPlan (via renderWithRemotion's `plan` argument)
 *   2. build/bundle the Remotion composition   -> getBundleLocation() / bundle()
 *   3. select the composition                  -> selectComposition()
 *   4. pass the EditPlan via inputProps         -> buildRemotionInputProps()
 *   5. run renderMedia()
 *   6. produce an MP4
 *   7. return the path/URL of the final file    -> RemotionRenderResult.file
 *
 * There is no user-facing timeline anywhere in this file: the EditPlan is
 * turned into `MainVideoProps` (clips + captions, in frames) purely by the
 * pure functions below, and handed to a headless Remotion composition
 * (remotion/compositions/MainVideo.tsx) that only Node ever renders.
 *
 * Deliberately NOT ported to this engine yet (still ffmpeg-only, see
 * render.ts): silence removal, speed changes, zoom, shake, flash, color
 * grade. This first step only proves EditPlan -> Remotion -> MP4 works for
 * cuts + burned-in captions.
 */

const FPS = 30;

/**
 * By default @remotion/renderer downloads its own headless Chrome build on
 * first use. In locked-down environments (no outbound access to
 * remotion.media) that download is blocked, so this lets an already-
 * installed Chromium be reused instead - set REMOTION_BROWSER_EXECUTABLE to
 * its absolute path. Unset (the normal case) means "let Remotion manage its
 * own browser," which is the documented/default behavior.
 */
function getBrowserExecutable(): string | undefined {
  return process.env.REMOTION_BROWSER_EXECUTABLE || undefined;
}

/**
 * Video sources live under lib/storage/fileStore.ts's DATA_ROOT
 * (.data/uploads, .data/demo, .data/tmp, ...) and are created/added to
 * throughout the server's lifetime - long after the Remotion bundle is
 * built. Serving DATA_ROOT as the bundle's public dir via a *symlink*
 * (rather than a one-time copy) means OffthreadVideo can reach any file
 * that exists under it at render time, including ones created after the
 * bundle itself was built.
 */
function toPublicClipPath(absolutePath: string): string {
  const relative = path.relative(DATA_ROOT, absolutePath).split(path.sep).join("/");
  // bundle()'s publicDir is served from a "public/" symlink inside the
  // bundle output root (verified by inspecting the built bundle directory),
  // so URLs into it need that prefix - unlike staticFile()'s convention for
  // build-time-known assets, which strips it.
  return `/public/${relative}`;
}

let cachedBundleLocation: Promise<string> | null = null;

/** Bundles the Remotion project once per server process and reuses the result. */
function getBundleLocation(): Promise<string> {
  if (!cachedBundleLocation) {
    const entryPoint = path.join(process.cwd(), "remotion", "index.ts");
    cachedBundleLocation = fs
      .mkdir(DATA_ROOT, { recursive: true })
      .then(() => bundle({ entryPoint, publicDir: DATA_ROOT, symlinkPublicDir: true, onProgress: () => {} }))
      .catch((err: unknown) => {
      // Allow the next render to retry the bundle instead of caching a failure forever.
      cachedBundleLocation = null;
      throw err;
    });
  }
  return cachedBundleLocation;
}

interface FrameSegment {
  origStart: number;
  origEnd: number;
  sourceClipId?: string;
  newStartFrame: number;
  newEndFrame: number;
}

/** Lays clips back to back in frames, in the order they appear in `plan.clips`. */
function buildFrameTimeline(clips: EditClip[], fps: number): FrameSegment[] {
  let cursor = 0;
  return clips.map((clip) => {
    const durationInFrames = Math.max(1, Math.round((clip.end - clip.start) * fps));
    const segment: FrameSegment = {
      origStart: clip.start,
      origEnd: clip.end,
      sourceClipId: clip.sourceClipId,
      newStartFrame: cursor,
      newEndFrame: cursor + durationInFrames,
    };
    cursor += durationInFrames;
    return segment;
  });
}

/** Maps a [start,end) caption range from source-clip time onto the concatenated frame timeline (same idea as render.ts's mapRangeToTimeline). */
function mapCueToFrames(
  cue: { start: number; end: number; sourceClipId?: string },
  timeline: FrameSegment[],
): { startFrame: number; endFrame: number } | null {
  let mappedStart: number | null = null;
  let mappedEnd: number | null = null;

  for (const segment of timeline) {
    if (cue.sourceClipId !== undefined && segment.sourceClipId !== cue.sourceClipId) continue;
    const overlapStart = Math.max(segment.origStart, cue.start);
    const overlapEnd = Math.min(segment.origEnd, cue.end);
    if (overlapEnd <= overlapStart) continue;

    const sourceDuration = segment.origEnd - segment.origStart || 1;
    const framesPerSecond = (segment.newEndFrame - segment.newStartFrame) / sourceDuration;
    const start = segment.newStartFrame + (overlapStart - segment.origStart) * framesPerSecond;
    const end = segment.newStartFrame + (overlapEnd - segment.origStart) * framesPerSecond;
    if (mappedStart === null || start < mappedStart) mappedStart = start;
    if (mappedEnd === null || end > mappedEnd) mappedEnd = end;
  }

  if (mappedStart === null || mappedEnd === null) return null;
  return { startFrame: Math.round(mappedStart), endFrame: Math.round(mappedEnd) };
}

function buildCaptions(plan: EditPlan, timeline: FrameSegment[]): RemotionCaption[] {
  if (!plan.captions || plan.captionCues.length === 0) return [];

  return plan.captionCues
    .map((cue: CaptionCue) => {
      const mapped = mapCueToFrames(cue, timeline);
      if (!mapped) return null;
      const durationInFrames = Math.max(1, mapped.endFrame - mapped.startFrame);
      return { text: cue.text, startFrame: mapped.startFrame, durationInFrames };
    })
    .filter((c): c is RemotionCaption => c !== null);
}

/** Translates a "ready" EditPlan into the plain, serializable props MainVideo.tsx renders. */
export function buildRemotionInputProps(
  plan: EditPlan,
  resolveSource: SourceResolver,
  dimensions: { width: number; height: number },
): MainVideoProps {
  if (plan.status !== "ready") {
    throw new Error("Cannot render a draft edit plan with Remotion - bind it to footage first.");
  }

  const timeline = buildFrameTimeline(plan.clips, FPS);

  const clips: RemotionClip[] = plan.clips.map((clip, i) => ({
    src: toPublicClipPath(resolveSource(clip)),
    trimBeforeFrames: Math.round(clip.start * FPS),
    trimAfterFrames: Math.round(clip.end * FPS),
    durationInFrames: timeline[i].newEndFrame - timeline[i].newStartFrame,
  }));

  const durationInFrames =
    timeline.length > 0 ? timeline[timeline.length - 1].newEndFrame : Math.max(1, Math.round(plan.duration * FPS));

  return {
    fps: FPS,
    width: dimensions.width,
    height: dimensions.height,
    durationInFrames: Math.max(1, durationInFrames),
    backgroundColor: "#000000",
    clips,
    captions: buildCaptions(plan, timeline),
  };
}

export interface RemotionRenderResult {
  file: StoredFile;
  cutCount: number;
  finalDuration: number;
}

/**
 * Renders an EditPlan through Remotion end to end and returns the resulting
 * MP4's StoredFile (saved via the existing lib/storage/fileStore.ts system,
 * under .data/exports - same place ffmpeg exports go).
 *
 * Mirrors renderVideo()'s signature (plan, resolveSource, resolution) from
 * lib/video/render.ts so call sites can pick either engine interchangeably.
 */
export async function renderWithRemotion(
  plan: EditPlan,
  resolveSource: SourceResolver,
  resolution: ResolutionLabel,
): Promise<RemotionRenderResult> {
  if (plan.status !== "ready") {
    throw new Error("Cannot render a draft edit plan - upload clips to bind it first.");
  }

  const dimensions = getResolutionDimensions(plan.aspectRatio, resolution);
  const inputProps = buildRemotionInputProps(plan, resolveSource, dimensions);

  const serveUrl = await getBundleLocation();
  const browserExecutable = getBrowserExecutable();

  const composition = await selectComposition({
    serveUrl,
    id: MAIN_COMPOSITION_ID,
    inputProps: inputProps as unknown as Record<string, unknown>,
    browserExecutable,
    chromeMode: browserExecutable ? "chrome-for-testing" : undefined,
  });

  const output = await reserveOutputPath("export", ".mp4", "video/mp4");

  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation: output.absolutePath,
    inputProps: inputProps as unknown as Record<string, unknown>,
    browserExecutable,
    chromeMode: browserExecutable ? "chrome-for-testing" : undefined,
  });

  return {
    file: output,
    cutCount: plan.clips.length,
    finalDuration: inputProps.durationInFrames / FPS,
  };
}
