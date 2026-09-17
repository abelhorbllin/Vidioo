import { NextRequest, NextResponse } from "next/server";
import { handleApiError, UserFacingError } from "@/lib/errors";
import { createProject, saveBufferAs } from "@/lib/storage/fileStore";
import { safeExtensionOnly, validateUpload } from "@/lib/validation/upload";
import { analyzeVideoMetadata, extractThumbnail } from "@/lib/video/metadata";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("video");

    if (!file || !(file instanceof File)) {
      throw new UserFacingError("No video file was received. Please choose a file and try again.");
    }

    const validation = validateUpload(file.name, file.type, file.size);
    if (!validation.valid) {
      throw new UserFacingError(validation.error ?? "This file could not be uploaded.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const extension = safeExtensionOnly(file.name);
    const stored = await saveBufferAs("upload", buffer, extension, file.type || "video/mp4");

    let metadata;
    try {
      metadata = await analyzeVideoMetadata(stored.absolutePath);
    } catch (err) {
      console.error("[upload] metadata extraction failed", err);
      throw new UserFacingError(
        "This video file looks corrupted or uses an unsupported codec. Please try a different file.",
      );
    }

    if (!metadata.duration || metadata.duration <= 0) {
      throw new UserFacingError("Could not read this video's duration. The file may be corrupted.");
    }

    let thumbnail;
    try {
      thumbnail = await extractThumbnail(stored.absolutePath, Math.min(0.5, metadata.duration / 2));
    } catch (err) {
      console.error("[upload] thumbnail extraction failed", err);
      thumbnail = null;
    }

    const project = createProject(stored.id);
    project.originalFilename = file.name;
    project.metadata = metadata;
    project.thumbnailFileId = thumbnail?.id ?? null;

    return NextResponse.json({
      projectId: project.id,
      videoId: stored.id,
      filename: file.name,
      sizeBytes: file.size,
      metadata,
      thumbnailUrl: thumbnail ? `/api/files/${thumbnail.id}` : null,
      videoUrl: `/api/files/${stored.id}`,
    });
  } catch (error) {
    return handleApiError(error, "upload");
  }
}
