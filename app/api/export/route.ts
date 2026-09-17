import { NextRequest, NextResponse } from "next/server";
import { handleApiError, UserFacingError } from "@/lib/errors";
import { getProject, updateProject } from "@/lib/storage/fileStore";
import { buildProjectSourceResolver, renderVideo, type ResolutionLabel } from "@/lib/video/render";
import type { EditPlan } from "@/types/edit";

export const runtime = "nodejs";
export const maxDuration = 300;

interface ExportRequestBody {
  projectId: string;
  resolution: "720p" | "1080p";
}

const VALID_RESOLUTIONS: ResolutionLabel[] = ["720p", "1080p"];

/** Renders the final, full-quality export at the requested resolution. */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ExportRequestBody;

    if (!body.projectId || !VALID_RESOLUTIONS.includes(body.resolution)) {
      throw new UserFacingError("Please choose a valid export resolution (720p or 1080p).");
    }

    const project = getProject(body.projectId);
    if (!project) {
      throw new UserFacingError("This project could not be found. Please upload your video again.", 404);
    }

    const plan = project.plan as EditPlan | undefined;
    if (!plan) {
      throw new UserFacingError("Generate an edit plan before exporting.");
    }

    if (plan.status === "draft") {
      throw new UserFacingError("Render a preview first - this edit plan doesn't have footage bound to it yet.");
    }

    const resolveSource = buildProjectSourceResolver(project);

    let result;
    try {
      result = await renderVideo(plan, resolveSource, body.resolution);
    } catch (err) {
      console.error("[export] ffmpeg pipeline failed", err);
      throw new UserFacingError("We couldn't render your export. Please try again.");
    }

    updateProject(project.id, { exportFileId: result.file.id, exportResolution: body.resolution });

    return NextResponse.json({
      downloadUrl: `/api/files/${result.file.id}?download=1`,
      filename: `editai-export-${body.resolution}.mp4`,
    });
  } catch (error) {
    return handleApiError(error, "export");
  }
}
