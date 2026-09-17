import { NextRequest, NextResponse } from "next/server";
import { bindDraftPlan } from "@/lib/ai/analyze";
import { buildEditSummary } from "@/lib/edit/summary";
import { handleApiError, UserFacingError } from "@/lib/errors";
import { getFile, getProject, updateProject } from "@/lib/storage/fileStore";
import { validateEditPlan } from "@/lib/validation/editPlan";
import { buildProjectSourceResolver, renderVideo } from "@/lib/video/render";
import type { EditPlan } from "@/types/edit";
import type { VideoMetadata } from "@/types/video";

export const runtime = "nodejs";
export const maxDuration = 300;

interface RenderRequestBody {
  projectId: string;
}

/**
 * Renders a low-resolution preview of the current edit plan.
 *
 * If the plan is still a "draft" (the prompt-first flow, before footage was
 * uploaded), this first binds it to the project's uploaded clips - turning
 * abstract purpose slots into real, cut-able time ranges - persists the
 * now-"ready" plan, and then renders as usual.
 */
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

    let plan = project.plan as EditPlan | undefined;
    if (!plan) {
      throw new UserFacingError("Generate an edit plan before rendering.");
    }

    if (plan.status === "draft") {
      if (project.clipFileIds.length === 0) {
        throw new UserFacingError(
          "This edit plan is ready, but it needs footage - upload at least one clip before rendering.",
        );
      }

      const clipInfo = project.clipFileIds
        .map((id) => {
          const file = getFile(id);
          const meta = (project.clipsMeta as Record<string, { metadata?: VideoMetadata }> | undefined)?.[id];
          const duration = meta?.metadata?.duration;
          return file && duration ? { id, duration } : null;
        })
        .filter((c): c is { id: string; duration: number } => c !== null);

      if (clipInfo.length === 0) {
        throw new UserFacingError("Your uploaded clips could not be read. Please try uploading them again.");
      }

      try {
        plan = await bindDraftPlan(plan, clipInfo);
      } catch (err) {
        console.error("[render] failed to bind draft plan to uploaded clips", err);
        throw new UserFacingError("We couldn't match your uploaded clips to this edit plan. Please try again.");
      }

      const validation = validateEditPlan(plan);
      if (!validation.valid) {
        console.error("[render] bound plan failed validation", validation.errors);
        throw new UserFacingError("We couldn't finalize this edit plan. Please try again.");
      }

      updateProject(project.id, { plan });
    }

    const resolveSource = buildProjectSourceResolver(project);

    let result;
    try {
      result = await renderVideo(plan, resolveSource, "preview");
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
      plan,
    });
  } catch (error) {
    return handleApiError(error, "render");
  }
}
