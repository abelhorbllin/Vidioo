import type { ClipPurpose, EditPlan, EffectType } from "@/types/edit";

interface EditTimelineProps {
  plan: EditPlan;
}

const PURPOSE_LABELS: Record<ClipPurpose, string> = {
  hook: "Hook",
  dribble: "Dribble",
  skill: "Skill",
  goal: "Goal",
  assist: "Assist",
  celebration: "Celebration",
  shot: "Shot",
  tackle: "Tackle",
  save: "Save",
  sprint: "Sprint",
  pass: "Pass",
  reaction: "Reaction",
  closeup: "Close-up",
};

const EFFECT_ICONS: Record<EffectType, string> = {
  velocity: "⚡",
  flash: "✨",
  shake: "💥",
  colorGrade: "🎨",
};

/**
 * Visualizes the AI-generated narrative arc of a football edit plan - the
 * sequence of purpose-tagged clips (hook -> dribble -> skill -> goal ->
 * celebration, or whatever the plan actually contains) with icons for the
 * real effects applied to each. Purely a readout of EditPlan - purposes are
 * MOCK tags (see lib/ai/mock.ts), not detected actions.
 */
export function EditTimeline({ plan }: EditTimelineProps) {
  return (
    <div className="card p-6">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">Edit timeline</h3>
      <div className="flex flex-col items-stretch">
        {plan.clips.map((clip, i) => {
          const icons = new Set<string>();
          if (clip.effect) icons.add(EFFECT_ICONS[clip.effect]);
          if (plan.zooms.some((z) => z.sourceClipId === clip.sourceClipId && z.start === clip.start)) {
            icons.add("🔍");
          }

          return (
            <div key={i} className="flex flex-col items-center">
              <div className="flex w-full items-center justify-between gap-3 rounded-xl bg-white/5 px-4 py-3">
                <span className="text-sm font-medium text-white">
                  {clip.purpose ? PURPOSE_LABELS[clip.purpose] : `Clip ${i + 1}`}
                </span>
                <span className="flex gap-1 text-sm">
                  {Array.from(icons).map((icon) => (
                    <span key={icon}>{icon}</span>
                  ))}
                </span>
              </div>
              {i < plan.clips.length - 1 && <span className="py-1 text-zinc-600">↓</span>}
            </div>
          );
        })}
      </div>
      {plan.unsupportedRequests.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-amber-300">
          <p className="font-medium">Not yet available:</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            {plan.unsupportedRequests.map((note, i) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
