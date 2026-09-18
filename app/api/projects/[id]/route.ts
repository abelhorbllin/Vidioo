import { NextRequest, NextResponse } from "next/server";
import { handleApiError, UserFacingError } from "@/lib/errors";
import { buildEditSummary } from "@/lib/edit/summary";
import { deleteProject, getProject } from "@/lib/storage/fileStore";
import type { EditPlan } from "@/types/edit";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const project = getProject(id);
    if (!project) {
      throw new UserFacingError("This project could not be found.", 404);
    }

    const plan = project.plan as EditPlan | undefined;
    const summary =
      plan && project.previewFileId
        ? buildEditSummary(plan, (project.cutCount as number) ?? plan.clips.length, (project.finalDuration as number) ?? plan.duration)
        : null;

    return NextResponse.json({
      projectId: project.id,
      plan: plan ?? null,
      previewUrl: project.previewFileId ? `/api/files/${project.previewFileId}` : null,
      summary,
    });
  } catch (error) {
    return handleApiError(error, "projects/[id]");
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const deleted = deleteProject(id);
    if (!deleted) {
      throw new UserFacingError("This project could not be found.", 404);
    }
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return handleApiError(error, "projects/[id]/delete");
  }
}
