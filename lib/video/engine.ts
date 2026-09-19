/**
 * Render engine switch. This is the ONLY place that decides whether a given
 * render goes through the (existing, still fully supported) ffmpeg engine
 * (lib/video/render.ts) or the new Remotion engine (lib/video/remotion.ts) -
 * mirrors lib/ai/provider.ts and lib/assets/provider.ts.
 *
 * Both engines coexist: nothing here deletes or disables the ffmpeg path.
 * To go back to ffmpeg later, set RENDER_ENGINE=ffmpeg (or change the
 * default below) - no other code needs to change.
 */
export type RenderEngine = "ffmpeg" | "remotion";

const VALID_ENGINES: RenderEngine[] = ["ffmpeg", "remotion"];

/** Defaults to "remotion" per the current migration step (first end-to-end test of the new engine). */
export function getRenderEngine(): RenderEngine {
  const requested = (process.env.RENDER_ENGINE ?? "remotion").toLowerCase();

  if (VALID_ENGINES.includes(requested as RenderEngine)) {
    return requested as RenderEngine;
  }

  throw new Error(
    `RENDER_ENGINE="${requested}" is not a valid render engine. Use "ffmpeg" or "remotion" ` +
      `(or leave RENDER_ENGINE unset to use the default, "remotion").`,
  );
}
