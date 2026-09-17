"use client";

import { useEffect, useState } from "react";

const STEPS = [
  "Analyzing video...",
  "Finding key moments...",
  "Detecting silences...",
  "Planning cuts...",
  "Creating captions...",
  "Building your edit...",
  "Rendering...",
];

interface GenerationProgressProps {
  /** When true, the underlying work is actually finished and we can settle on the last step. */
  done: boolean;
}

export function GenerationProgress({ done }: GenerationProgressProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (done) {
      setActiveIndex(STEPS.length - 1);
      return;
    }
    const interval = setInterval(() => {
      setActiveIndex((i) => Math.min(i + 1, STEPS.length - 2));
    }, 900);
    return () => clearInterval(interval);
  }, [done]);

  return (
    <div className="card mx-auto max-w-lg p-8">
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        <h3 className="text-lg font-semibold text-white">Generating your edit</h3>
        <p className="text-sm text-zinc-500">This usually takes a moment.</p>
      </div>
      <div className="flex flex-col gap-3">
        {STEPS.map((step, i) => {
          const state = i < activeIndex ? "done" : i === activeIndex ? "active" : "pending";
          return (
            <div key={step} className="flex items-center gap-3">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${
                  state === "done"
                    ? "bg-accent text-white"
                    : state === "active"
                      ? "border border-accent text-accent"
                      : "border border-white/15 text-zinc-600"
                }`}
              >
                {state === "done" ? "✓" : i + 1}
              </span>
              <span className={`text-sm ${state === "pending" ? "text-zinc-600" : "text-zinc-200"}`}>{step}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
