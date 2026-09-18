"use client";

import { FOOTBALL_PLAYER_SUGGESTIONS, getFootballStyles } from "@/lib/styles/editingStyles";
import type { TrendingFilters as TrendingFiltersType } from "@/lib/trending/types";

interface TrendingFiltersProps {
  value: TrendingFiltersType;
  onChange: (value: TrendingFiltersType) => void;
}

const PLATFORMS = [
  { value: "all", label: "All" },
  { value: "tiktok", label: "TikTok" },
  { value: "instagram", label: "Instagram Reels" },
  { value: "youtube", label: "YouTube Shorts" },
];

const TIME_RANGES = [
  { value: "all", label: "Any time" },
  { value: "24h", label: "Last 24 hours" },
  { value: "3d", label: "Last 3 days" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
];

const SORT_OPTIONS = [
  { value: "trending", label: "Trending" },
  { value: "views", label: "Most views" },
  { value: "likes", label: "Most likes" },
  { value: "comments", label: "Most comments" },
  { value: "engagement", label: "Engagement" },
];

const FOOTBALL_STYLES = getFootballStyles();

export function TrendingFilters({ value, onChange }: TrendingFiltersProps) {
  function set<K extends keyof TrendingFiltersType>(key: K, v: TrendingFiltersType[K]) {
    onChange({ ...value, [key]: v });
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Select label="Platform" value={value.platform ?? "all"} onChange={(v) => set("platform", v as never)} options={PLATFORMS} />
      <Select
        label="Time range"
        value={value.timeRange ?? "all"}
        onChange={(v) => set("timeRange", v as never)}
        options={TIME_RANGES}
      />
      <Select label="Sort by" value={value.sortBy ?? "trending"} onChange={(v) => set("sortBy", v as never)} options={SORT_OPTIONS} />
      <Select
        label="Player"
        value={value.player ?? "all"}
        onChange={(v) => set("player", v)}
        options={[{ value: "all", label: "All players" }, ...FOOTBALL_PLAYER_SUGGESTIONS.map((p) => ({ value: p, label: p }))]}
      />
      <Select
        label="Style"
        value={value.style ?? "all"}
        onChange={(v) => set("style", v as never)}
        options={[
          { value: "all", label: "All" },
          ...FOOTBALL_STYLES.map((s) => ({ value: s.id, label: `${s.emoji} ${s.label}` })),
        ]}
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-zinc-500">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-full border border-white/10 bg-base-900 px-3 py-1.5 text-sm text-white focus:border-accent focus:outline-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
