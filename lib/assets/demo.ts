import { execFile } from "child_process";
import { promisify } from "util";
import ffmpegPath from "ffmpeg-static";
import { addCaptions } from "@/lib/video/render";
import { getFile, reserveOutputPath, type StoredFile } from "@/lib/storage/fileStore";
import { finalizeBoundPlan, hashString, seededRandom } from "@/lib/ai/football";
import type { AssetClip, AssetProvider, AssetProviderContext, AssetResolution } from "@/lib/assets/types";
import type { ClipPurpose, EditClip, EditPlan } from "@/types/edit";

const execFileAsync = promisify(execFile);

/**
 * DemoAssetProvider - the only AssetProvider implemented today.
 *
 * When the user has uploaded footage, it passes those clips straight
 * through untouched ("user_upload" mode). When they haven't, it generates
 * small, clearly-labeled SYNTHETIC placeholder video clips with ffmpeg
 * (test patterns, not real footage of any kind) so the prompt-first
 * pipeline can still produce a real rendered video end to end.
 *
 * IMPORTANT: this never fetches, scrapes, or downloads real football
 * footage from anywhere. Every "demo" clip is generated locally by ffmpeg
 * from a test-pattern source and burned with a "DEMO ASSET" caption so it
 * can never be mistaken for real content. The UI must show a
 * "Demo Asset Mode" badge whenever `resolveAssets()` returns mode "demo".
 */
export class DemoAssetProvider implements AssetProvider {
  readonly name = "demo";
  readonly isDemo = true;

  async resolveAssets(plan: EditPlan, context: AssetProviderContext): Promise<AssetResolution> {
    if (context.userClips.length > 0) {
      return { mode: "user_upload", clips: context.userClips };
    }

    const purposes = Array.from(new Set(plan.clips.map((c) => c.purpose).filter((p): p is ClipPurpose => !!p)));
    const wanted = purposes.length > 0 ? purposes : (["hook"] as ClipPurpose[]);

    const clips: AssetClip[] = await Promise.all(
      wanted.map(async (purpose) => {
        const stock = await getOrCreateDemoStockClip(purpose);
        return { id: stock.id, duration: DEMO_CLIP_DURATION_SECONDS, purpose };
      }),
    );

    return { mode: "demo", clips };
  }
}

/** Purpose-aware binder for demo/synthetic footage: matches each slot's purpose to the matching stock clip. */
export function bindPlanToDemoAssets(plan: EditPlan, resolution: AssetResolution): EditPlan {
  if (resolution.clips.length === 0) {
    throw new Error("No demo assets were resolved for this plan.");
  }

  const byPurpose = new Map<ClipPurpose, AssetClip>();
  for (const clip of resolution.clips) {
    if (clip.purpose) byPurpose.set(clip.purpose, clip);
  }
  const fallback = resolution.clips[0];

  const targetPerSlot = plan.duration / plan.clips.length;

  const boundClips: EditClip[] = plan.clips.map((slot, i) => {
    const source = (slot.purpose && byPurpose.get(slot.purpose)) || fallback;
    const slotLen = Math.min(targetPerSlot, source.duration);
    const rand = seededRandom(hashString(source.id) + i);
    const start = rand() * Math.max(0, source.duration - slotLen);
    const end = Math.min(source.duration, start + slotLen);

    return {
      ...slot,
      sourceClipId: source.id,
      start: Number(start.toFixed(2)),
      end: Number((end > start ? end : Math.min(source.duration, start + 0.5)).toFixed(2)),
    };
  });

  return { ...finalizeBoundPlan(plan, boundClips), assetMode: "demo" };
}

const DEMO_CLIP_DURATION_SECONDS = 14;
const DEMO_CLIP_DIMENSIONS = { width: 960, height: 540 };

/** Hue rotation per purpose, purely so different demo clips are visually distinguishable. */
const PURPOSE_HUES: Record<ClipPurpose, number> = {
  hook: 0,
  dribble: 40,
  skill: 80,
  goal: 130,
  assist: 170,
  celebration: 210,
  shot: 250,
  tackle: 290,
  save: 330,
  sprint: 20,
  pass: 60,
  reaction: 100,
  closeup: 150,
};

// Cached across requests for the life of the server process - regenerating
// an identical synthetic clip on every render would be wasteful.
const globalCache = globalThis as unknown as { __editaiDemoClips?: Map<ClipPurpose, StoredFile> };
const demoClipCache = (globalCache.__editaiDemoClips ??= new Map<ClipPurpose, StoredFile>());

async function getOrCreateDemoStockClip(purpose: ClipPurpose): Promise<StoredFile> {
  const cached = demoClipCache.get(purpose);
  if (cached && getFile(cached.id)) return cached;

  const clip = await generateDemoStockClip(purpose);
  demoClipCache.set(purpose, clip);
  return clip;
}

/**
 * Generates one synthetic, ffmpeg-only "demo asset" clip for a given
 * purpose - a real video file, never real footage.
 *
 * This calls the ffmpeg binary directly via child_process rather than
 * through fluent-ffmpeg: fluent-ffmpeg's capability pre-check parses
 * `ffmpeg -formats` with a regex that doesn't account for the extra
 * "device" flag column modern ffmpeg builds print for lavfi (` D d lavfi`
 * instead of the older `D  lavfi`), so it wrongly reports the lavfi
 * demuxer as unavailable and refuses to run - even though the binary
 * supports it fine. Every other ffmpeg invocation in this app uses a real
 * file input, which isn't affected, so this is the one deliberate
 * exception.
 */
async function generateDemoStockClip(purpose: ClipPurpose): Promise<StoredFile> {
  const hue = PURPOSE_HUES[purpose] ?? 0;
  const { width, height } = DEMO_CLIP_DIMENSIONS;
  const raw = await reserveOutputPath("demo", ".mp4", "video/mp4");

  if (!ffmpegPath) {
    throw new Error("ffmpeg-static binary path could not be resolved.");
  }

  await execFileAsync(ffmpegPath as unknown as string, [
    "-y",
    "-f",
    "lavfi",
    "-i",
    `testsrc2=size=${width}x${height}:rate=30:duration=${DEMO_CLIP_DURATION_SECONDS}`,
    "-f",
    "lavfi",
    "-i",
    `sine=frequency=220:duration=${DEMO_CLIP_DURATION_SECONDS}`,
    "-filter_complex",
    `[0:v]hue=h=${hue}[v]`,
    "-map",
    "[v]",
    "-map",
    "1:a",
    "-c:v",
    "libx264",
    "-c:a",
    "aac",
    raw.absolutePath,
  ]);

  const labelCue = [
    { start: 0, end: DEMO_CLIP_DURATION_SECONDS, text: `DEMO ASSET · ${purpose.toUpperCase()}` },
  ];
  return addCaptions(raw, labelCue, "basic", DEMO_CLIP_DIMENSIONS);
}
