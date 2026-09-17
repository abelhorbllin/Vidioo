import { NextRequest, NextResponse } from "next/server";
import { modifyEditPlan } from "@/lib/ai/analyze";
import { isDemoAIMode } from "@/lib/ai/provider";
import { handleApiError, UserFacingError } from "@/lib/errors";
import { getProject, updateProject } from "@/lib/storage/fileStore";
import { validateEditPlan } from "@/lib/validation/editPlan";
import type { EditPlan } from "@/types/edit";

export const runtime = "nodejs";

interface EditRequestBody {
  projectId: string;
  instruction: string;
}

/** AI Chat Editor: turns a natural-language tweak into a modified EditPlan. */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as EditRequestBody;

    if (!body.projectId || !body.instruction?.trim()) {
      throw new UserFacingError("Please describe the change you'd like to make.");
    }

    const project = getProject(body.projectId);
    if (!project) {
      throw new UserFacingError("This project could not be found. Please upload your video again.", 404);
    }

    const currentPlan = project.plan as EditPlan | undefined;
    if (!currentPlan) {
      throw new UserFacingError("Generate an edit first before requesting changes.");
    }

    const updatedPlan = await modifyEditPlan(currentPlan, body.instruction);

    const validation = validateEditPlan(updatedPlan);
    if (!validation.valid) {
      console.error("[edit] AI provider produced an invalid edit plan", validation.errors);
      throw new UserFacingError("That change could not be applied. Please try rephrasing it.");
    }

    updateProject(project.id, { plan: updatedPlan });

    return NextResponse.json({ plan: updatedPlan, demoMode: isDemoAIMode() });
  } catch (error) {
    return handleApiError(error, "edit");
  }
}
