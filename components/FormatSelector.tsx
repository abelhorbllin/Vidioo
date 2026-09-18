"use client";

import type { AspectRatio } from "@/types/edit";

const FORMATS: { value: AspectRatio; label: string; hint: string }[] = [
  { value: "9:16", label: "9:16", hint: "TikTok / Reels / Shorts" },
  { value: "16:9", label: "16:9", hint: "YouTube / Landscape" },
  { value: "1:1", label: "1:1", hint: "Square" },
];

interface FormatSelectorProps {
  value: AspectRatio;
  onChange: (value: AspectRatio) => void;
}

export function FormatSelector({ value, onChange }: FormatSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {FORMATS.map((format) => (
        <button
          key={format.value}
          type="button"
          onClick={() => onChange(format.value)}
          className={`card flex flex-col items-center gap-1 p-4 text-center transition-all ${
            value === format.value ? "border-accent bg-accent/10 ring-1 ring-accent" : "hover:border-white/25"
          }`}
        >
          <span className="text-lg font-semibold text-white">{format.label}</span>
          <span className="text-[11px] text-zinc-500">{format.hint}</span>
        </button>
      ))}
    </div>
  );
}
