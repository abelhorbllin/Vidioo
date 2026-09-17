"use client";

import { EDITING_STYLES, type EditingStyleDefinition } from "@/lib/styles/editingStyles";
import type { EditingStyleId } from "@/types/edit";

interface StyleSelectorProps {
  selected: EditingStyleId | undefined;
  onSelect: (id: EditingStyleId | undefined) => void;
  /** Which styles to show. Defaults to the full list (used on the landing page). */
  styles?: EditingStyleDefinition[];
}

export function StyleSelector({ selected, onSelect, styles = EDITING_STYLES }: StyleSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {styles.map((style) => {
        const isActive = selected === style.id;
        return (
          <button
            key={style.id}
            type="button"
            onClick={() => onSelect(isActive ? undefined : style.id)}
            className={`card flex flex-col items-center gap-1.5 p-4 text-center transition-all ${
              isActive ? "border-accent bg-accent/10 ring-1 ring-accent" : "hover:border-white/25"
            }`}
          >
            <span className="text-2xl">{style.emoji}</span>
            <span className="text-sm font-medium text-white">{style.label}</span>
            <span className="text-[11px] leading-tight text-zinc-500">{style.description}</span>
          </button>
        );
      })}
    </div>
  );
}
