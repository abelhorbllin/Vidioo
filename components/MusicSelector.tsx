"use client";

import type { MusicChoice } from "@/types/edit";

interface MusicSelectorProps {
  value: MusicChoice;
  onChange: (value: MusicChoice) => void;
}

/**
 * Music mode picker. Maps onto the existing MusicChoice type:
 *   - "AI selection" -> "original" (keeps whichever audio the resolved
 *     footage already has - there is no real music-recommendation engine
 *     connected yet, which is why this is flagged as demo below).
 *   - "No music" -> "add_later" (existing "silence the track" semantics).
 *   - "Upload your own" is shown for completeness (per the product brief)
 *     but disabled: wiring a user's audio file into the render pipeline
 *     isn't implemented yet, and this button deliberately does NOT accept
 *     a file it would then silently ignore.
 *
 * IMPORTANT: this never claims to detect beats or sync cuts to music - see
 * lib/video/audio.ts.
 */
export function MusicSelector({ value, onChange }: MusicSelectorProps) {
  const selected: "ai" | "none" = value === "add_later" ? "none" : "ai";

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => onChange("original")}
          className={`card flex flex-col gap-1 p-4 text-left transition-all ${
            selected === "ai" ? "border-accent bg-accent/10 ring-1 ring-accent" : "hover:border-white/25"
          }`}
        >
          <span className="text-sm font-medium text-white">🤖 AI selection</span>
          <span className="text-[11px] text-zinc-500">Demo mode - keeps the clip&rsquo;s own audio for now</span>
        </button>
        <button
          type="button"
          disabled
          title="Custom music upload isn't wired into rendering yet."
          className="card flex cursor-not-allowed flex-col gap-1 p-4 text-left opacity-40"
        >
          <span className="text-sm font-medium text-white">⬆ Upload music</span>
          <span className="text-[11px] text-zinc-500">Coming soon</span>
        </button>
        <button
          type="button"
          onClick={() => onChange("add_later")}
          className={`card flex flex-col gap-1 p-4 text-left transition-all ${
            selected === "none" ? "border-accent bg-accent/10 ring-1 ring-accent" : "hover:border-white/25"
          }`}
        >
          <span className="text-sm font-medium text-white">🔇 No music</span>
          <span className="text-[11px] text-zinc-500">Mutes the track</span>
        </button>
      </div>
    </div>
  );
}
