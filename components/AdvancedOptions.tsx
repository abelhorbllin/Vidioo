"use client";

import { useState } from "react";
import type { AdvancedOptions as AdvancedOptionsType, CaptionStyle, Intensity } from "@/types/edit";

interface AdvancedOptionsProps {
  options: AdvancedOptionsType;
  onChange: (options: AdvancedOptionsType) => void;
}

const CAPTION_STYLES: CaptionStyle[] = ["off", "basic", "dynamic"];
const INTENSITIES: Intensity[] = ["low", "medium", "high"];

export function AdvancedOptions({ options, onChange }: AdvancedOptionsProps) {
  const [open, setOpen] = useState(false);

  function set<K extends keyof AdvancedOptionsType>(key: K, value: AdvancedOptionsType[K]) {
    onChange({ ...options, [key]: value });
  }

  return (
    <div className="card p-5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-sm font-semibold text-white">Advanced options</span>
        <span className={`text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}>⌄</span>
      </button>

      {open && (
        <div className="mt-5 flex flex-col gap-5">
          <OptionGroup label="Captions">
            <SegmentedControl
              options={CAPTION_STYLES}
              value={options.captionStyle}
              onChange={(v) => set("captionStyle", v)}
              labels={{ off: "Off", basic: "Basic", dynamic: "Dynamic" }}
            />
          </OptionGroup>

          <OptionGroup label="Remove silences">
            <ToggleControl checked={options.removeSilences} onChange={(v) => set("removeSilences", v)} />
          </OptionGroup>

          <OptionGroup label="Auto zooms">
            <ToggleControl checked={options.autoZoom} onChange={(v) => set("autoZoom", v)} />
          </OptionGroup>

          <OptionGroup label="Intensity">
            <SegmentedControl
              options={INTENSITIES}
              value={options.intensity}
              onChange={(v) => set("intensity", v)}
              labels={{ low: "Low", medium: "Medium", high: "High" }}
            />
          </OptionGroup>
        </div>
      )}
    </div>
  );
}

function OptionGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-zinc-400">{label}</span>
      {children}
    </div>
  );
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  labels,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
  labels?: Partial<Record<T, string>>;
}) {
  return (
    <div className="inline-flex rounded-full border border-white/10 bg-base-900 p-1">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            value === opt ? "bg-accent text-white" : "text-zinc-400 hover:text-white"
          }`}
        >
          {labels?.[opt] ?? opt}
        </button>
      ))}
    </div>
  );
}

function ToggleControl({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-accent" : "bg-white/10"}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
