"use client";

import { useEffect, useState } from "react";
import { DashboardNav } from "@/components/DashboardNav";
import { TrendingCard } from "@/components/TrendingCard";
import { TrendingFilters } from "@/components/TrendingFilters";
import type { TrendingEdit, TrendingFilters as TrendingFiltersType } from "@/lib/trending/types";

export default function TrendingPage() {
  const [filters, setFilters] = useState<TrendingFiltersType>({
    platform: "all",
    timeRange: "all",
    sortBy: "trending",
    player: "all",
    style: "all",
  });
  const [edits, setEdits] = useState<TrendingEdit[]>([]);
  const [demoMode, setDemoMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));

    setLoading(true);
    setError(null);
    fetch(`/api/trending?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setEdits(data.edits);
        setDemoMode(data.demoMode);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load trending edits."))
      .finally(() => setLoading(false));
  }, [filters]);

  return (
    <div className="min-h-screen bg-grid">
      <DashboardNav demoMode={demoMode ? "Demo Trending Data" : null} />

      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white">🔥 Trending football edits</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Discover what&rsquo;s performing, analyze the structure, and create an original edit inspired by it.
          </p>
        </div>

        <div className="mb-8">
          <TrendingFilters value={filters} onChange={setFilters} />
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-zinc-500">Loading...</p>
        ) : edits.length === 0 ? (
          <p className="text-sm text-zinc-500">No trending edits match these filters.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {edits.map((edit, i) => (
              <TrendingCard key={edit.id} edit={edit} rank={i + 1} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
