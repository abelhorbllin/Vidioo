"use client";

import { PROMPT_SUGGESTIONS } from "@/lib/styles/editingStyles";

interface EditPromptProps {
  value: string;
  onChange: (value: string) => void;
}

export function EditPrompt({ value, onChange }: EditPromptProps) {
  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Describe the edit you want..."
        rows={5}
        className="w-full resize-none rounded-2xl border border-white/10 bg-base-900 p-4 text-sm text-white placeholder:text-zinc-600 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      />
      <p className="mt-2 text-xs text-zinc-600">
        Example: &ldquo;Create a fast-paced TikTok edit. Remove silences, add dynamic captions, zoom in on
        important moments and synchronize cuts with the music.&rdquo;
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {PROMPT_SUGGESTIONS.map((suggestion) => (
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
