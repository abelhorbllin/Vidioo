import { NextRequest, NextResponse } from "next/server";
import { handleApiError, UserFacingError } from "@/lib/errors";
import { addClipToProject, createProject, getProject, saveBufferAs, updateProject } from "@/lib/storage/fileStore";
import { safeExtensionOnly, validateUpload } from "@/lib/validation/upload";
import { analyzeVideoMetadata, extractThumbnail } from "@/lib/video/metadata";

export const runtime = "nodejs";

/**
 * Uploads one video/clip file.
 *
 * - No `projectId` in the form data: creates a NEW project with this file as
 *   its first (and, for the classic single-video flow, only) clip - exactly
 *   the original behavior.
 * - An existing `projectId`: appends this file as an additional clip to that
 *   project (the football "upload your clips" step, which may be called
 *   several times). Requires the project to already exist (e.g. created via
 *   POST /api/plan for the prompt-first flow, or by a prior upload).
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("video");
    const existingProjectId = formData.get("projectId");

    if (!file || !(file instanceof File)) {
      throw new UserFacingError("No video file was received. Please choose a file and try again.");
    }

    if (existingProjectId && typeof existingProjectId === "string") {
      if (!getProject(existingProjectId)) {
        throw new UserFacingError("This project could not be found. Please start over.", 404);
      }
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

    let project;
    if (existingProjectId && typeof existingProjectId === "string") {
      project = addClipToProject(existingProjectId, stored.id);
      const clipsMeta = (project.clipsMeta as Record<string, unknown>) ?? {};
      clipsMeta[stored.id] = { filename: file.name, metadata, thumbnailFileId: thumbnail?.id ?? null };
      project = updateProject(project.id, { clipsMeta, metadata: project.metadata ?? metadata });
    } else {
      project = createProject(stored.id);
      project.originalFilename = file.name;
      project.metadata = metadata;
      project.thumbnailFileId = thumbnail?.id ?? null;
      project = updateProject(project.id, {
        clipsMeta: { [stored.id]: { filename: file.name, metadata, thumbnailFileId: thumbnail?.id ?? null } },
      });
    }

    return NextResponse.json({
      projectId: project.id,
      videoId: stored.id,
      clipId: stored.id,
      filename: file.name,
      sizeBytes: file.size,
      metadata,
      thumbnailUrl: thumbnail ? `/api/files/${thumbnail.id}` : null,
      videoUrl: `/api/files/${stored.id}`,
      clipCount: project.clipFileIds.length,
    });
  } catch (error) {
    return handleApiError(error, "upload");
  }
}
