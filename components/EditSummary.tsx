import { getEditingStyle } from "@/lib/styles/editingStyles";
import type { EditSummary as EditSummaryType } from "@/types/edit";

interface EditSummaryProps {
  summary: EditSummaryType;
}

export function EditSummary({ summary }: EditSummaryProps) {
  const style = getEditingStyle(summary.styleId);

  const rows: { label: string; value: string }[] = [
    { label: "Duration", value: `${Math.round(summary.durationSeconds)}s` },
    { label: "Format", value: summary.aspectRatio },
    { label: "Cuts", value: String(summary.cutCount) },
    { label: "Captions", value: summary.captionsEnabled ? "Enabled" : "Disabled" },
    { label: "Silence removal", value: summary.silenceRemovalEnabled ? "Enabled" : "Disabled" },
    { label: "Style", value: style ? `${style.emoji} ${style.label}` : "Custom" },
  ];

  return (
    <div className="card p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Edit summary</h3>
      <dl className="mt-4 flex flex-col gap-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0 last:pb-0">
            <dt className="text-sm text-zinc-400">{row.label}</dt>
            <dd className="text-sm font-medium text-white">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
