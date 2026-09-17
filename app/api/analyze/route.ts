import { NextRequest, NextResponse } from "next/server";
import { analyzeVideo, generateEditPlan } from "@/lib/ai/analyze";
import { isDemoAIMode } from "@/lib/ai/provider";
import { handleApiError, UserFacingError } from "@/lib/errors";
import { getFile, getProject, updateProject } from "@/lib/storage/fileStore";
import { validateEditPlan } from "@/lib/validation/editPlan";
import { detectSilenceIntervals } from "@/lib/video/render";
import { DEFAULT_ADVANCED_OPTIONS, type AdvancedOptions, type EditingStyleId } from "@/types/edit";

export const runtime = "nodejs";
export const maxDuration = 60;

interface AnalyzeRequestBody {
  projectId: string;
  prompt: string;
  styleId?: EditingStyleId;
  options?: Partial<AdvancedOptions>;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AnalyzeRequestBody;

    if (!body.projectId || typeof body.prompt !== "string") {
      throw new UserFacingError("Missing project or edit description.");
    }

    const project = getProject(body.projectId);
    if (!project) {
      throw new UserFacingError("This project could not be found. Please upload your video again.", 404);
    }

    const videoFile = getFile(project.videoFileId as string);
    if (!videoFile) {
      throw new UserFacingError("The uploaded video could not be found. Please upload it again.", 404);
    }

    const metadata = project.metadata as { duration: number; width: number; height: number };

    let silenceIntervals: { start: number; end: number }[] = [];
    try {
      silenceIntervals = await detectSilenceIntervals(videoFile.absolutePath);
    } catch (err) {
      console.error("[analyze] silence detection failed, continuing without it", err);
    }

    const analysis = await analyzeVideo({
      videoId: videoFile.id,
      duration: metadata.duration,
      width: metadata.width,
      height: metadata.height,
      silenceIntervals,
    });

    const options: AdvancedOptions = { ...DEFAULT_ADVANCED_OPTIONS, ...(body.options ?? {}) };

    const plan = await generateEditPlan(analysis, {
      prompt: body.prompt,
      styleId: body.styleId,
      options,
    });

    const validation = validateEditPlan(plan);
    if (!validation.valid) {
      console.error("[analyze] AI provider produced an invalid edit plan", validation.errors);
      throw new UserFacingError("We couldn't generate a valid edit plan for this video. Please try again.");
    }

    updateProject(project.id, {
      instructions: { prompt: body.prompt, styleId: body.styleId, options },
      analysis,
      plan,
    });

    return NextResponse.json({
      projectId: project.id,
      analysis,
      plan,
      demoMode: isDemoAIMode(),
    });
  } catch (error) {
    return handleApiError(error, "analyze");
  }
}
