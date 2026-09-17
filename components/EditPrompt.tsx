"use client";

import { FOOTBALL_PROMPT_SUGGESTIONS, PROMPT_SUGGESTIONS } from "@/lib/styles/editingStyles";

interface EditPromptProps {
  value: string;
  onChange: (value: string) => void;
}

const ALL_SUGGESTIONS = [...FOOTBALL_PROMPT_SUGGESTIONS, ...PROMPT_SUGGESTIONS];

export function EditPrompt({ value, onChange }: EditPromptProps) {
  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Create a 15 second dark Mbappé edit with fast cuts, velocity, zooms on his skills and a strong effect on the goal..."
        rows={5}
        className="w-full resize-none rounded-2xl border border-white/10 bg-base-900 p-4 text-sm text-white placeholder:text-zinc-600 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      />
      <p className="mt-2 text-xs text-zinc-600">
        Example: &ldquo;Make a cinematic Ronaldo edit with a slow intro and then very fast cuts.&rdquo;
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {ALL_SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            className="chip"
            onClick={() => onChange(value ? `${value.trim()} ${suggestion}.` : `${suggestion}.`)}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
