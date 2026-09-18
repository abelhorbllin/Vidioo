import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/errors";
import { listProjects, type ProjectState } from "@/lib/storage/fileStore";
import type { EditPlan } from "@/types/edit";
import type { ProjectSummary } from "@/types/project";

export const runtime = "nodejs";

function summarize(project: ProjectState): ProjectSummary {
  const plan = project.plan as EditPlan | undefined;
  const instructions = project.instructions as { prompt?: string; player?: string } | undefined;
  const thumbnailFileId = (project.thumbnailFileId as string | null) ?? null;

  return {
    id: project.id,
    prompt: instructions?.prompt,
    player: plan?.player ?? instructions?.player,
    styleId: plan?.styleId,
    durationSeconds: plan?.duration,
    createdAt: project.createdAt,
    status: plan ? plan.status : "not_generated",
    thumbnailUrl: thumbnailFileId ? `/api/files/${thumbnailFileId}` : null,
    previewUrl: project.previewFileId ? `/api/files/${project.previewFileId}` : null,
    exportUrl: project.exportFileId ? `/api/files/${project.exportFileId}?download=1` : null,
  };
}

/** Lists all in-memory projects for "My Edits". There is no auth yet - this lists every project on this server process. See README limitations. */
export async function GET() {
  try {
    const projects = listProjects().map(summarize);
    return NextResponse.json({ projects });
  } catch (error) {
    return handleApiError(error, "projects");
  }
}
