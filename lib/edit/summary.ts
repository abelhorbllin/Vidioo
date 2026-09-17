import type { EditPlan, EditSummary } from "@/types/edit";

export function buildEditSummary(plan: EditPlan, cutCount: number, finalDuration: number): EditSummary {
  const distinctClips = new Set(plan.clips.map((c) => c.sourceClipId).filter(Boolean));

  return {
    durationSeconds: Number(finalDuration.toFixed(1)),
    aspectRatio: plan.aspectRatio,
    cutCount,
    captionsEnabled: plan.captions,
    silenceRemovalEnabled: plan.removeSilences,
    styleId: plan.styleId,
    player: plan.player,
    clipCount: distinctClips.size > 0 ? distinctClips.size : undefined,
    effectsCount: plan.effects.length,
    unsupportedRequests: plan.unsupportedRequests.length > 0 ? plan.unsupportedRequests : undefined,
  };
}
