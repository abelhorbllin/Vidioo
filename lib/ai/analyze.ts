import { getAIProvider } from "@/lib/ai/provider";
import type { BindableClip, VideoInput } from "@/lib/ai/types";
import type { EditInstructions, EditPlan, VideoAnalysis } from "@/types/edit";

/**
 * Thin, stable entry points into the AI layer. Route handlers and other
 * server-side code should call these instead of touching the provider
 * directly, so the rest of the app never has to know whether it's talking
 * to the mock or a real model.
 */

export async function analyzeVideo(input: VideoInput): Promise<VideoAnalysis> {
  const provider = getAIProvider();
  return provider.analyzeVideo(input);
}

export async function generateEditPlan(
  analysis: VideoAnalysis,
  instructions: EditInstructions,
): Promise<EditPlan> {
  const provider = getAIProvider();
  const plan = await provider.generateEditPlan(analysis, instructions);
  return { ...plan, source: provider.isMock ? "mock" : "ai" };
}

export async function modifyEditPlan(currentPlan: EditPlan, instruction: string): Promise<EditPlan> {
  const provider = getAIProvider();
  const plan = await provider.modifyEditPlan(currentPlan, instruction);
  return { ...plan, source: provider.isMock ? "mock" : "ai" };
}

export async function generateDraftEditPlan(instructions: EditInstructions): Promise<EditPlan> {
  const provider = getAIProvider();
  const plan = await provider.generateDraftEditPlan(instructions);
  return { ...plan, source: provider.isMock ? "mock" : "ai" };
}

export async function bindDraftPlan(plan: EditPlan, clips: BindableClip[]): Promise<EditPlan> {
  const provider = getAIProvider();
  const bound = await provider.bindDraftPlan(plan, clips);
  return { ...bound, source: provider.isMock ? "mock" : "ai" };
}
