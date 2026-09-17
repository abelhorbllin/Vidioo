import type { EditPlan, EditSummary } from "@/types/edit";

export function buildEditSummary(plan: EditPlan, cutCount: number, finalDuration: number): EditSummary {
  return {
    durationSeconds: Number(finalDuration.toFixed(1)),
    aspectRatio: plan.aspectRatio,
    cutCount,
    captionsEnabled: plan.captions,
    silenceRemovalEnabled: plan.removeSilences,
    styleId: plan.styleId,
  };
}
