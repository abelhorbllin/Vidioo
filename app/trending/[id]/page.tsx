"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { DashboardNav } from "@/components/DashboardNav";
import { PURPOSE_LABELS } from "@/lib/ai/football";
import { getEditingStyle } from "@/lib/styles/editingStyles";
import { formatCount, formatTimeAgo, PLATFORM_LABELS } from "@/lib/trending/format";
import type { TrendingEdit } from "@/lib/trending/types";

export default function TrendingDetailPage() {
  return (
    <Suspense fallback={null}>
      <TrendingDetailInner />
    </Suspense>
  );
}

function TrendingDetailInner() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [edit, setEdit] = useState<TrendingEdit | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRemix, setShowRemix] = useState(searchParams.get("remix") === "1");
  const [newPlayer, setNewPlayer] = useState("");
  const [similarity, setSimilarity] = useState<"inspired" | "similar">("inspired");

  useEffect(() => {
    fetch(`/api/trending/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setEdit(data.edit);
        setDemoMode(data.demoMode);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load this edit."));
  }, [params.id]);

  function createSimilar() {
    if (!edit) return;
    const style = getEditingStyle(edit.style);
    const player = newPlayer.trim() || "the player of your choice";
    const prompt = `Create a ${edit.durationSeconds} second ${style?.label.toLowerCase() ?? edit.style} edit of ${player}, ${edit.analysis.energy} energy, ${edit.analysis.pacing} pacing - inspired by a trending edit's structure, not a copy of it.`;

    const query = new URLSearchParams({
      prompt,
      styleId: edit.style,
      duration: String(edit.durationSeconds),
      remixOf: edit.title,
    });
    if (newPlayer.trim()) query.set("player", newPlayer.trim());
    if (similarity === "similar") query.set("arc", edit.analysis.structure.join(","));

    router.push(`/app?${query.toString()}`);
  }

  if (error) {
    return (
      <div className="min-h-screen bg-grid">
        <DashboardNav />
        <main className="mx-auto max-w-3xl px-6 py-12">
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
          <Link href="/trending" className="btn-secondary mt-6 inline-block">
            Back to Trending
          </Link>
        </main>
      </div>
    );
  }

  if (!edit) {
    return (
      <div className="min-h-screen bg-grid">
        <DashboardNav />
        <main className="mx-auto max-w-3xl px-6 py-12 text-sm text-zinc-500">Loading...</main>
      </div>
    );
  }

  const style = getEditingStyle(edit.style);

  return (
    <div className="min-h-screen bg-grid">
      <DashboardNav demoMode={demoMode ? "Demo Trending Data" : null} />

      <main className="mx-auto max-w-3xl px-6 py-12">
        <Link href="/trending" className="text-sm text-zinc-500 hover:text-white">
          ← Back to Trending
        </Link>

        <div className="mt-4 flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-base-900 text-3xl">
            {edit.thumbnailEmoji}
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-white">{edit.title}</h1>
            <p className="text-sm text-zinc-500">
              {PLATFORM_LABELS[edit.platform]} · {edit.player} · Posted {formatTimeAgo(edit.publishedAt)}
            </p>
          </div>
        </div>

        <section className="card mt-8 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Edit analysis</h2>
          <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
            <Stat label="Duration" value={`${edit.durationSeconds}s`} />
            <Stat label="Platform" value={PLATFORM_LABELS[edit.platform]} />
            <Stat label="Views" value={formatCount(edit.stats.views)} />
            <Stat label="Likes" value={formatCount(edit.stats.likes)} />
            <Stat label="Comments" value={formatCount(edit.stats.comments)} />
          </dl>
        </section>

        <section className="card mt-6 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Edit structure</h2>
          <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Stat label="Hook" value={PURPOSE_LABELS[edit.analysis.structure[0]] ?? "—"} />
            <Stat label="Cuts" value={String(edit.analysis.cutCount)} />
            <Stat label="Avg. clip length" value={`${edit.analysis.averageClipDurationSeconds}s`} />
            <BoolStat label="Speed ramps" value={edit.analysis.speedRamps} />
            <BoolStat label="Slow motion" value={edit.analysis.slowMotion} />
            <BoolStat label="Zooms" value={edit.analysis.zooms} />
            <BoolStat label="Shakes" value={edit.analysis.shakes} />
            <BoolStat label="Flashes" value={edit.analysis.flashes} />
            <BoolStat label="Transitions" value={edit.analysis.transitions} />
            <Stat label="Beat moments" value={String(edit.analysis.beatMoments)} />
            <BoolStat label="Captions" value={edit.analysis.captionsDetected} />
            <Stat label="Ending" value={PURPOSE_LABELS[edit.analysis.structure[edit.analysis.structure.length - 1]] ?? "—"} />
          </dl>
        </section>

        <section className="card mt-6 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">AI style analysis</h2>
          <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Stat label="Style" value={style ? `${style.emoji} ${style.label}` : edit.style} />
            <Stat label="Energy" value={edit.analysis.energy} />
            <Stat label="Pacing" value={edit.analysis.pacing} />
          </dl>
          <p className="mt-4 text-sm text-zinc-400">
            Structure: {edit.analysis.structure.map((p) => PURPOSE_LABELS[p]).join(" → ")}
          </p>
        </section>

        <div className="mt-8 flex flex-col gap-4">
          {!showRemix ? (
            <button className="btn-primary self-start" onClick={() => setShowRemix(true)}>
              Create Similar Edit
            </button>
          ) : (
            <div className="card p-6">
              <h3 className="text-sm font-semibold text-white">Create a similar edit</h3>
              <p className="mt-1 text-xs text-zinc-500">
                This does not copy the video - only its pacing, structure and style are reused to plan a new,
                original edit from your own footage or demo assets.
              </p>

              <label className="mt-4 block text-xs text-zinc-500">
                Which player do you want to use?
                <input
                  value={newPlayer}
                  onChange={(e) => setNewPlayer(e.target.value)}
                  placeholder={`e.g. a different player than ${edit.player}`}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-base-900 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-accent focus:outline-none"
                />
              </label>

              <div className="mt-4">
                <span className="text-xs text-zinc-500">How closely should the structure match?</span>
                <div className="mt-2 inline-flex rounded-full border border-white/10 bg-base-900 p-1">
                  <button
                    type="button"
                    onClick={() => setSimilarity("inspired")}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      similarity === "inspired" ? "bg-accent text-white" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Inspired
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimilarity("similar")}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      similarity === "similar" ? "bg-accent text-white" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Very Similar Structure
                  </button>
                </div>
              </div>

              <button className="btn-primary mt-5" onClick={createSimilar}>
                Continue to Create →
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-zinc-600">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-white">{value}</dd>
    </div>
  );
}

function BoolStat({ label, value }: { label: string; value: boolean }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-zinc-600">{label}</dt>
      <dd className={`mt-0.5 text-sm font-medium ${value ? "text-accent" : "text-zinc-600"}`}>
        {value ? "Yes" : "No"}
      </dd>
    </div>
  );
}
