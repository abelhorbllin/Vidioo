import ffmpegPath from "ffmpeg-static";
import ffprobeInstaller from "@ffprobe-installer/ffprobe";
import ffmpeg from "fluent-ffmpeg";
import path from "path";

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath as unknown as string);
}
ffmpeg.setFfprobePath(ffprobeInstaller.path);

/**
 * Directory of bundled, redistributable fonts (DejaVu, Bitstream Vera license)
 * used for burned-in captions via the `subtitles` (libass) filter's `fontsdir`
 * option - this makes caption rendering self-contained, independent of
 * whatever fonts (if any) happen to be installed on the host.
 */
export const CAPTION_FONTS_DIR = path.join(process.cwd(), "assets", "fonts");
export const CAPTION_FONT_FAMILY = "DejaVu Sans";

export function createFfmpegCommand(inputPath: string): ffmpeg.FfmpegCommand {
  return ffmpeg(inputPath);
}

/** Runs an ffmpeg command and resolves/rejects as a promise, forwarding stderr on failure. */
export function runFfmpeg(command: ffmpeg.FfmpegCommand): Promise<void> {
  return new Promise((resolve, reject) => {
    let stderr = "";
    command
      .on("stderr", (line) => {
        stderr += line + "\n";
      })
      .on("error", (err) => {
        reject(new Error(`ffmpeg failed: ${err.message}\n${stderr.slice(-2000)}`));
      })
      .on("end", () => resolve())
      .run();
  });
}

/** Escapes a filesystem path for safe use inside a single-quoted ffmpeg filter argument. */
export function escapeFilterPath(filePath: string): string {
  return filePath.replace(/\\/g, "\\\\").replace(/'/g, "'\\''");
}
