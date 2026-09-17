import ffmpeg from "fluent-ffmpeg";
import fs from "fs/promises";
import "@/lib/video/ffmpeg"; // ensures ffmpeg/ffprobe paths are configured
import { reserveOutputPath, type StoredFile } from "@/lib/storage/fileStore";
import type { VideoMetadata } from "@/types/video";

/** Real metadata extraction via ffprobe - no simulation involved. */
export function analyzeVideoMetadata(filePath: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, async (err, data) => {
      if (err) {
        reject(new Error(`Could not read video metadata: ${err.message}`));
        return;
      }

      const videoStream = data.streams.find((s) => s.codec_type === "video");
      const audioStream = data.streams.find((s) => s.codec_type === "audio");

      if (!videoStream) {
        reject(new Error("No video stream found in the uploaded file."));
        return;
      }

      let fps = 30;
      if (videoStream.r_frame_rate) {
        const [num, den] = videoStream.r_frame_rate.split("/").map(Number);
        if (den) fps = num / den;
      }

      const stats = await fs.stat(filePath);

      resolve({
        duration: Number(data.format.duration ?? videoStream.duration ?? 0),
        width: videoStream.width ?? 0,
        height: videoStream.height ?? 0,
        fps: Number(fps.toFixed(2)),
        sizeBytes: stats.size,
        format: data.format.format_name ?? "unknown",
        hasAudio: Boolean(audioStream),
      });
    });
  });
}

/** Extracts a single JPEG frame as a thumbnail and stores it via the file store. */
export async function extractThumbnail(filePath: string, atSeconds = 0.5): Promise<StoredFile> {
  const output = await reserveOutputPath("thumbnail", ".jpg", "image/jpeg");

  await new Promise<void>((resolve, reject) => {
    ffmpeg(filePath)
      .on("error", (err) => reject(new Error(`Thumbnail extraction failed: ${err.message}`)))
      .on("end", () => resolve())
      .screenshots({
        timestamps: [atSeconds],
        filename: output.absolutePath.split("/").pop(),
        folder: output.absolutePath.split("/").slice(0, -1).join("/"),
        size: "480x?",
      });
  });

  return output;
}
