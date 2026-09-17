"use client";

import { FOOTBALL_PLAYER_SUGGESTIONS } from "@/lib/styles/editingStyles";

interface PlayerInputProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Optional player-name context for a football edit. This is passed through
 * to the EditPlan as plain contextual metadata (see types/edit.ts) - it
 * never triggers fetching footage of that player. Rendering always uses
 * the clips the user uploads.
 */
export function PlayerInput({ value, onChange }: PlayerInputProps) {
  return (
    <div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Player (optional) — e.g. Mbappé"
        className="w-full rounded-xl border border-white/10 bg-base-900 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {FOOTBALL_PLAYER_SUGGESTIONS.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => onChange(value === name ? "" : name)}
            className={`chip ${value === name ? "border-accent text-white" : ""}`}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}
