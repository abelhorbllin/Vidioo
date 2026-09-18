import { NextRequest, NextResponse } from "next/server";
import { generateDraftEditPlan } from "@/lib/ai/analyze";
import { isDemoAIMode } from "@/lib/ai/provider";
import { handleApiError, UserFacingError } from "@/lib/errors";
import { createDraftProject, getProject, updateProject } from "@/lib/storage/fileStore";
import { validateEditPlan } from "@/lib/validation/editPlan";
import { DEFAULT_ADVANCED_OPTIONS, type AdvancedOptions, type ClipPurpose, type EditingStyleId } from "@/types/edit";

export const runtime = "nodejs";
export const maxDuration = 60;

interface PlanRequestBody {
  prompt: string;
  player?: string;
  styleId?: EditingStyleId;
  options?: Partial<AdvancedOptions>;
  targetDurationSeconds?: number;
  /** Attach the draft plan to a project that already has clips uploaded, instead of creating a fresh empty one. */
  projectId?: string;
  /** Explicit narrative arc (from "Create Similar Edit" on Trending) instead of one parsed from the prompt. */
  sceneArcOverride?: ClipPurpose[];
}

/**
 * Prompt-first entry point: generates an abstract EditPlan from the idea
 * alone. The returned plan has status "draft" and cannot be rendered until
 * clips are uploaded against the returned projectId (POST /api/upload with
 * that projectId) - POST /api/render then binds the draft automatically.
 *
 * If `projectId` names a project that already has clips (the user uploaded
 * footage before describing the edit), the plan is attached to it directly
 * so those clips are used once rendered.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PlanRequestBody;

    if (typeof body.prompt !== "string" || !body.prompt.trim()) {
      throw new UserFacingError("Please describe the edit you want.");
    }

    let project = body.projectId ? getProject(body.projectId) : undefined;
    if (body.projectId && !project) {
      throw new UserFacingError("This project could not be found. Please start over.", 404);
    }

    const options: AdvancedOptions = { ...DEFAULT_ADVANCED_OPTIONS, ...(body.options ?? {}) };

    const plan = await generateDraftEditPlan({
      prompt: body.prompt,
      styleId: body.styleId,
      options,
      player: body.player,
      targetDurationSeconds: body.targetDurationSeconds,
      sceneArcOverride: body.sceneArcOverride,
    });

    const validation = validateEditPlan(plan);
    if (!validation.valid) {
      console.error("[plan] AI provider produced an invalid draft plan", validation.errors);
      throw new UserFacingError("We couldn't generate an edit plan from that description. Please try again.");
    }

    project = project ?? createDraftProject();
    updateProject(project.id, {
      instructions: { prompt: body.prompt, styleId: body.styleId, options, player: body.player },
      plan,
    });

    return NextResponse.json({
      projectId: project.id,
      plan,
      demoMode: isDemoAIMode(),
    });
  } catch (error) {
    return handleApiError(error, "plan");
  }
}
