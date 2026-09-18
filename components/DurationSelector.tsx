"use client";

const PRESETS = [10, 15, 20, 30, 60];

interface DurationSelectorProps {
  value: number;
  onChange: (seconds: number) => void;
}

export function DurationSelector({ value, onChange }: DurationSelectorProps) {
  const isCustom = !PRESETS.includes(value);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((seconds) => (
        <button
          key={seconds}
          type="button"
          onClick={() => onChange(seconds)}
          className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
            value === seconds
              ? "border-accent bg-accent/10 text-white"
              : "border-white/10 bg-base-900 text-zinc-400 hover:text-white"
          }`}
        >
          {seconds}s
        </button>
      ))}
      <label
        className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm transition-colors ${
          isCustom ? "border-accent bg-accent/10 text-white" : "border-white/10 bg-base-900 text-zinc-400"
        }`}
      >
        <input
          type="number"
          min={3}
          max={120}
          value={isCustom ? value : ""}
          placeholder="Custom"
          onChange={(e) => {
            const n = Number(e.target.value);
            if (n > 0) onChange(n);
          }}
          className="w-14 bg-transparent text-center outline-none placeholder:text-zinc-600"
        />
        <span>sec</span>
      </label>
    </div>
  );
}
