"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AdvancedOptions } from "@/components/AdvancedOptions";
import { AIEditChat } from "@/components/AIEditChat";
import { DashboardNav } from "@/components/DashboardNav";
import { DurationSelector } from "@/components/DurationSelector";
import { EditPrompt } from "@/components/EditPrompt";
import { EditSummary } from "@/components/EditSummary";
import { EditTimeline } from "@/components/EditTimeline";
import { ExportPanel } from "@/components/ExportPanel";
import { FormatSelector } from "@/components/FormatSelector";
import { GenerationProgress } from "@/components/GenerationProgress";
import { MusicSelector } from "@/components/MusicSelector";
import { PlayerInput } from "@/components/PlayerInput";
import { StyleSelector } from "@/components/StyleSelector";
import { VideoPreview } from "@/components/VideoPreview";
import { VideoUploader, type UploadedVideoInfo } from "@/components/VideoUploader";
import { FOOTBALL_QUICKSTART_PROMPTS, getEditingStyle, getFootballStyles } from "@/lib/styles/editingStyles";
import {
  DEFAULT_ADVANCED_OPTIONS,
  type AdvancedOptions as AdvancedOptionsType,
  type ClipPurpose,
  type EditingStyleId,
  type EditPlan,
  type EditSummary as EditSummaryType,
} from "@/types/edit";

type Step = "idea" | "generating" | "result";

const FOOTBALL_STYLES = getFootballStyles();

export default function AppPage() {
  return (
    <Suspense fallback={null}>
      <AppPageInner />
    </Suspense>
  );
}

function AppPageInner() {
  const searchParams = useSearchParams();

  const [step, setStep] = useState<Step>("idea");
  const [prompt, setPrompt] = useState("");
  const [player, setPlayer] = useState("");
  const [styleId, setStyleId] = useState<EditingStyleId | undefined>(undefined);
  const [duration, setDuration] = useState(15);
  const [options, setOptions] = useState<AdvancedOptionsType>(DEFAULT_ADVANCED_OPTIONS);
  const [sceneArcOverride, setSceneArcOverride] = useState<ClipPurpose[] | undefined>(undefined);
  const [remixOf, setRemixOf] = useState<string | null>(null);

  const [useOwnClips, setUseOwnClips] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [clips, setClips] = useState<UploadedVideoInfo[]>([]);

  const [plan, setPlan] = useState<EditPlan | null>(null);
  const [demoAIMode, setDemoAIMode] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [summary, setSummary] = useState<EditSummaryType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reRendering, setReRendering] = useState(false);
  const [swappingFootage, setSwappingFootage] = useState(false);

  // Pre-fill from a "Create Similar Edit" hand-off (see /trending).
  useEffect(() => {
    const p = searchParams.get("prompt");
    if (!p) return;
    setPrompt(p);
    const sp = searchParams.get("player");
    if (sp) setPlayer(sp);
    const ss = searchParams.get("styleId") as EditingStyleId | null;
    if (ss) setStyleId(ss);
    const sd = searchParams.get("duration");
    if (sd) setDuration(Number(sd));
    const arc = searchParams.get("arc");
    if (arc) setSceneArcOverride(arc.split(",") as ClipPurpose[]);
    const title = searchParams.get("remixOf");
    if (title) setRemixOf(title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "Open" from My Edits: load a previously-generated project straight into the result step.
  useEffect(() => {
    const openId = searchParams.get("projectId");
    if (!openId) return;

    fetch(`/api/projects/${openId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error || !data.plan || !data.previewUrl) return;
        setProjectId(data.projectId);
        setPlan(data.plan);
        setPreviewUrl(data.previewUrl);
        setSummary(data.summary);
        setStep("result");
      })
      .catch(() => {
        // Silently ignore - the user just lands on a fresh Create screen instead.
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onStyleSelect(id: EditingStyleId | undefined) {
    setStyleId(id);
    const style = getEditingStyle(id);
    if (style) {
      setOptions((prev) => ({ ...prev, ...style.optionOverrides }));
    }
  }

  function applyQuickstart(q: (typeof FOOTBALL_QUICKSTART_PROMPTS)[number]) {
    setPrompt(q.prompt);
    if (q.player) setPlayer(q.player);
    if (q.styleId) onStyleSelect(q.styleId);
  }

  async function generateEdit() {
    setError(null);
    setStep("generating");

    try {
      const planRes = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          player: player || undefined,
          styleId,
          options,
          targetDurationSeconds: duration,
          sceneArcOverride,
          projectId,
        }),
      });
      const planData = await planRes.json();
      if (!planRes.ok) throw new Error(planData.error ?? "Could not generate an edit plan.");

      const activeProjectId = projectId ?? planData.projectId;
      if (!projectId) setProjectId(activeProjectId);
      setPlan(planData.plan);
      setDemoAIMode(planData.demoMode);

      // Always render immediately - the server resolves real footage from
      // the user's uploaded clips if any exist, otherwise falls back to
      // clearly-labeled synthetic Demo Asset Mode footage. Upload is never
      // required to see a real rendered result.
      const renderRes = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: activeProjectId }),
      });
      const renderData = await renderRes.json();
      if (!renderRes.ok) throw new Error(renderData.error ?? "Could not render a preview.");

      setPlan(renderData.plan);
      setPreviewUrl(renderData.previewUrl);
      setSummary(renderData.summary);
      setStep("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStep("idea");
    }
  }

  /** Re-renders after the user uploads their own clips on the result page, swapping out demo footage. */
  async function rerenderWithOwnFootage() {
    if (!projectId) return;
    setSwappingFootage(true);
    setError(null);
    try {
      const renderRes = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const renderData = await renderRes.json();
      if (!renderRes.ok) throw new Error(renderData.error ?? "Could not render this edit.");

      setPlan(renderData.plan);
      setPreviewUrl(renderData.previewUrl);
      setSummary(renderData.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not render this edit.");
    } finally {
      setSwappingFootage(false);
    }
  }

  async function applyChatInstruction(instruction: string) {
    if (!projectId) return;

    const editRes = await fetch("/api/edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, instruction }),
    });
    const editData = await editRes.json();
    if (!editRes.ok) throw new Error(editData.error ?? "That change could not be applied.");

    setPlan(editData.plan);
    setReRendering(true);
    try {
      const renderRes = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const renderData = await renderRes.json();
      if (!renderRes.ok) throw new Error(renderData.error ?? "Could not re-render your edit.");
      setPlan(renderData.plan);
      setPreviewUrl(renderData.previewUrl);
      setSummary(renderData.summary);
    } finally {
      setReRendering(false);
    }
  }

  async function exportVideo(resolution: "720p" | "1080p") {
    if (!projectId) throw new Error("Missing project.");
    const res = await fetch("/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, resolution }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Export failed. Please try again.");
    return data;
  }

  return (
    <div className="min-h-screen bg-grid">
      <DashboardNav demoMode={demoAIMode ? "Demo AI mode" : null} />

      <main className="mx-auto max-w-4xl px-6 py-12">
        <StepIndicator step={step} />

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {step === "idea" && (
          <div className="animate-fade-in flex flex-col gap-8">
            <div>
              <h1 className="text-2xl font-semibold text-white">Create your edit</h1>
              <p className="mt-1 text-sm text-zinc-500">
                Describe the edit you want to create. No clips required to get started.
              </p>
            </div>

            {remixOf && (
              <div className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-zinc-300">
                Remixing the structure of <span className="font-medium text-white">{remixOf}</span> - not copying
                the video, just its pacing and beats.
              </div>
            )}

            <EditPrompt value={prompt} onChange={setPrompt} />

            <div className="flex flex-wrap gap-2">
              {FOOTBALL_QUICKSTART_PROMPTS.map((q) => (
                <button key={q.label} type="button" className="chip" onClick={() => applyQuickstart(q)}>
                  {q.emoji} {q.label}
                </button>
              ))}
            </div>

            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Player <span className="normal-case text-zinc-600">(optional - leave blank if it&rsquo;s in your prompt)</span>
              </h2>
              <PlayerInput value={player} onChange={setPlayer} />
            </div>

            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Style <span className="normal-case text-zinc-600">(optional)</span>
              </h2>
              <StyleSelector selected={styleId} onSelect={onStyleSelect} styles={FOOTBALL_STYLES} />
            </div>

            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">Format</h2>
              <FormatSelector
                value={options.aspectRatio}
                onChange={(v) => setOptions((prev) => ({ ...prev, aspectRatio: v }))}
              />
            </div>

            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">Duration</h2>
              <DurationSelector value={duration} onChange={setDuration} />
            </div>

            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">Music</h2>
              <MusicSelector
                value={options.music}
                onChange={(v) => setOptions((prev) => ({ ...prev, music: v }))}
              />
            </div>

            <div className="card p-5">
              <button
                type="button"
                onClick={() => setUseOwnClips((v) => !v)}
                className="flex w-full items-center justify-between text-left"
              >
                <div>
                  <span className="text-sm font-semibold text-white">Use my own clips</span>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Optional. You don&rsquo;t need to provide clips - describe the edit and the AI will build it.
                  </p>
                </div>
                <span className={`text-zinc-500 transition-transform ${useOwnClips ? "rotate-180" : ""}`}>⌄</span>
              </button>
              {useOwnClips && (
                <div className="mt-4">
                  <VideoUploader
                    projectId={projectId}
                    clips={clips}
                    onProjectId={setProjectId}
                    onClipAdded={(clip) => setClips((prev) => [...prev, clip])}
                    label="Upload the clips you want the AI to use"
                  />
                </div>
              )}
            </div>

            <AdvancedOptions options={options} onChange={setOptions} />

            <div className="flex justify-end">
              <button className="btn-primary" onClick={generateEdit} disabled={!prompt.trim()}>
                ✨ Generate edit
              </button>
            </div>
          </div>
        )}

        {step === "generating" && (
          <div className="animate-fade-in py-8">
            <GenerationProgress done={false} />
          </div>
        )}

        {step === "result" && plan && previewUrl && summary && (
          <div className="animate-fade-in flex flex-col gap-8">
            <h1 className="text-2xl font-semibold text-white">Your edit is ready ⚽</h1>

            {plan.assetMode === "demo" && (
              <div className="card border-amber-400/20 bg-amber-400/5 p-6">
                <h3 className="text-sm font-semibold text-amber-300">Demo Asset Mode</h3>
                <p className="mt-1 text-sm text-zinc-400">
                  This preview uses synthetic placeholder clips generated locally (visibly labeled &ldquo;DEMO
                  ASSET&rdquo;) - not real football footage. Upload your own clips to use them instead.
                </p>
                <div className="mt-4">
                  <VideoUploader
                    projectId={projectId}
                    clips={clips}
                    onProjectId={setProjectId}
                    onClipAdded={(clip) => setClips((prev) => [...prev, clip])}
                    label="Upload your own clips"
                  />
                </div>
                {clips.length > 0 && (
                  <button className="btn-primary mt-4" onClick={rerenderWithOwnFootage} disabled={swappingFootage}>
                    {swappingFootage ? "Rendering..." : "Re-render with my clips"}
                  </button>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
              <div className="flex flex-col gap-6">
                <div className={reRendering || swappingFootage ? "opacity-50 transition-opacity" : "transition-opacity"}>
                  <VideoPreview src={previewUrl} title="Preview — lower resolution for fast playback" />
                </div>
                <EditTimeline plan={plan} />
                <AIEditChat onApply={applyChatInstruction} />
              </div>
              <div className="flex flex-col gap-6">
                <EditSummary summary={summary} />
                <ExportPanel onExport={exportVideo} />
              </div>
            </div>

            <div className="flex gap-3">
              <button className="btn-secondary" onClick={() => setStep("idea")}>
                Adjust prompt & options
              </button>
              <button className="btn-secondary" onClick={generateEdit}>
                🔄 Regenerate
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: "idea", label: "Describe" },
    { id: "generating", label: "Generate" },
    { id: "result", label: "Preview & export" },
  ];
  const activeIndex = steps.findIndex((s) => s.id === step);

  return (
    <div className="mb-10 flex items-center gap-2">
      {steps.map((s, i) => (
        <div key={s.id} className="flex flex-1 items-center gap-2">
          <div className={`h-1.5 flex-1 rounded-full ${i <= activeIndex ? "bg-accent" : "bg-white/10"}`} />
        </div>
      ))}
    </div>
  );
}
