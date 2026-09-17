import { NextRequest, NextResponse } from "next/server";
import { buildEditSummary } from "@/lib/edit/summary";
import { handleApiError, UserFacingError } from "@/lib/errors";
import { getFile, getProject, updateProject } from "@/lib/storage/fileStore";
import { renderVideo } from "@/lib/video/render";
import type { EditPlan } from "@/types/edit";

export const runtime = "nodejs";
export const maxDuration = 300;

interface RenderRequestBody {
  projectId: string;
}

/** Renders a low-resolution preview of the current edit plan. */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RenderRequestBody;

    if (!body.projectId) {
      throw new UserFacingError("Missing project.");
    }

    const project = getProject(body.projectId);
    if (!project) {
      throw new UserFacingError("This project could not be found. Please upload your video again.", 404);
    }

    const plan = project.plan as EditPlan | undefined;
    if (!plan) {
      throw new UserFacingError("Generate an edit plan before rendering.");
    }

    const videoFile = getFile(project.videoFileId as string);
    if (!videoFile) {
      throw new UserFacingError("The uploaded video could not be found. Please upload it again.", 404);
    }

    let result;
    try {
      result = await renderVideo(videoFile.absolutePath, plan, "preview");
    } catch (err) {
      console.error("[render] ffmpeg pipeline failed", err);
      throw new UserFacingError(
        "We couldn't render a preview of this edit. Please try adjusting your options and try again.",
      );
    }

    const summary = buildEditSummary(plan, result.cutCount, result.finalDuration);

    updateProject(project.id, {
      previewFileId: result.file.id,
      cutCount: result.cutCount,
      finalDuration: result.finalDuration,
    });

    return NextResponse.json({
      previewUrl: `/api/files/${result.file.id}`,
      summary,
    });
  } catch (error) {
    return handleApiError(error, "render");
  }
}
