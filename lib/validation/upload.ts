export const ALLOWED_VIDEO_EXTENSIONS = [".mp4", ".mov", ".webm"] as const;

export const ALLOWED_VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-m4v",
]);

export const MAX_UPLOAD_SIZE_BYTES = Number(process.env.MAX_UPLOAD_MB ?? "300") * 1024 * 1024;

export interface UploadValidationResult {
  valid: boolean;
  error?: string;
  extension?: string;
}

/** Validates a user-facing upload before it ever touches ffmpeg. */
export function validateUpload(filename: string, mimeType: string, sizeBytes: number): UploadValidationResult {
  const extension = extractExtension(filename);

  if (!extension || !ALLOWED_VIDEO_EXTENSIONS.includes(extension as (typeof ALLOWED_VIDEO_EXTENSIONS)[number])) {
    return {
      valid: false,
      error: "Unsupported file format. Please upload an MP4, MOV, or WEBM video.",
    };
  }

  if (mimeType && !ALLOWED_VIDEO_MIME_TYPES.has(mimeType)) {
    return {
      valid: false,
      error: "Unsupported file format. Please upload an MP4, MOV, or WEBM video.",
    };
  }

  if (sizeBytes <= 0) {
    return { valid: false, error: "The uploaded file appears to be empty or corrupted." };
  }

  if (sizeBytes > MAX_UPLOAD_SIZE_BYTES) {
    const maxMb = Math.round(MAX_UPLOAD_SIZE_BYTES / (1024 * 1024));
    return {
      valid: false,
      error: `This video is too large. The maximum allowed size is ${maxMb}MB.`,
    };
  }

  return { valid: true, extension };
}

function extractExtension(filename: string): string | null {
  const match = /\.[a-zA-Z0-9]+$/.exec(filename);
  return match ? match[0].toLowerCase() : null;
}

/** Generates a safe, collision-free filename fragment - never trusts the client's original name for paths. */
export function safeExtensionOnly(filename: string): string {
  return extractExtension(filename) ?? ".mp4";
}
