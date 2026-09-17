/**
 * Types describing an uploaded source video and its extracted metadata.
 *
 * These are the shapes that will eventually map to a `videos` table once a
 * database is introduced. For the MVP they only ever live in the in-memory
 * project store (see lib/storage/fileStore.ts).
 */

export type SupportedVideoFormat = "mp4" | "mov" | "webm";

export interface VideoMetadata {
  /** Duration in seconds, from ffprobe. */
  duration: number;
  width: number;
  height: number;
  fps: number;
  /** Size on disk, in bytes. */
  sizeBytes: number;
  /** Original container format reported by ffprobe. */
  format: string;
  hasAudio: boolean;
}

export interface UploadedVideo {
  id: string;
  originalFilename: string;
  storedPath: string;
  mimeType: string;
  metadata: VideoMetadata;
  thumbnailFileId: string;
  createdAt: number;
}
