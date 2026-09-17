"use client";

import { useState } from "react";
import Link from "next/link";
import { AdvancedOptions } from "@/components/AdvancedOptions";
import { AIEditChat } from "@/components/AIEditChat";
import { EditPrompt } from "@/components/EditPrompt";
import { EditSummary } from "@/components/EditSummary";
import { EditTimeline } from "@/components/EditTimeline";
import { ExportPanel } from "@/components/ExportPanel";
import { GenerationProgress } from "@/components/GenerationProgress";
import { PlayerInput } from "@/components/PlayerInput";
import { StyleSelector } from "@/components/StyleSelector";
import { VideoPreview } from "@/components/VideoPreview";
import { VideoUploader, type UploadedVideoInfo } from "@/components/VideoUploader";
import { getEditingStyle, getFootballStyles } from "@/lib/styles/editingStyles";
import {
  DEFAULT_ADVANCED_OPTIONS,
  type AdvancedOptions as AdvancedOptionsType,
  type EditingStyleId,
  type EditPlan,
  type EditSummary as EditSummaryType,
} from "@/types/edit";

type Step = "idea" | "generating" | "result";

const FOOTBALL_STYLES = getFootballStyles();

function draftSummary(plan: EditPlan): EditSummaryType {
  return {
    durationSeconds: plan.duration,
    aspectRatio: plan.aspectRatio,
    cutCount: plan.clips.length,
    captionsEnabled: plan.captions,
    silenceRemovalEnabled: plan.removeSilences,
    styleId: plan.styleId,
    player: plan.player,
    clipCount: 0,
    effectsCount: plan.effects.length,
    unsupportedRequests: plan.unsupportedRequests.length > 0 ? plan.unsupportedRequests : undefined,
  };
}

export default function AppPage() {
  const [step, setStep] = useState<Step>("idea");
  const [prompt, setPrompt] = useState("");
  const [player, setPlayer] = useState("");
  const [styleId, setStyleId] = useState<EditingStyleId | undefined>(undefined);
  const [options, setOptions] = useState<AdvancedOptionsType>(DEFAULT_ADVANCED_OPTIONS);

  const [projectId, setProjectId] = useState<string | null>(null);
  const [clips, setClips] = useState<UploadedVideoInfo[]>([]);

  const [plan, setPlan] = useState<EditPlan | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [summary, setSummary] = useState<EditSummaryType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reRendering, setReRendering] = useState(false);
  const [binding, setBinding] = useState(false);

  function onStyleSelect(id: EditingStyleId | undefined) {
    setStyleId(id);
    const style = getEditingStyle(id);
    if (style) {
      setOptions((prev) => ({ ...prev, ...style.optionOverrides }));
    }
  }

  async function generateEdit() {
    setError(null);
    setStep("generating");

    try {
      const planRes = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, player: player || undefined, styleId, options, projectId }),
      });
      const planData = await planRes.json();
      if (!planRes.ok) throw new Error(planData.error ?? "Could not generate an edit plan.");

      if (!projectId) setProjectId(planData.projectId);
      setPlan(planData.plan);
      setDemoMode(planData.demoMode);

      if (clips.length > 0) {
        const renderRes = await fetch("/api/render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: planData.projectId }),
        });
        const renderData = await renderRes.json();
        if (!renderRes.ok) throw new Error(renderData.error ?? "Could not render a preview.");

        setPlan(renderData.plan);
        setPreviewUrl(renderData.previewUrl);
        setSummary(renderData.summary);
      } else {
        setPreviewUrl(null);
        setSummary(draftSummary(planData.plan));
      }

      setStep("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStep("idea");
    }
  }

  async function renderNow() {
    if (!projectId) return;
    setBinding(true);
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
      setBinding(false);
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

    if (editData.plan.status !== "ready" || clips.length === 0) {
      setSummary(draftSummary(editData.plan));
      return;
    }

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

  const needsFootage = plan?.status === "draft" || !previewUrl;

  return (
    <div className="min-h-screen bg-grid">
      <header className="border-b border-white/5 px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-white">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-white">E</span>
            EditAI
          </Link>
          {demoMode && (
            <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-300">
              Demo AI mode
            </span>
          )}
        </div>
      </header>

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
              <h1 className="text-2xl font-semibold text-white">⚽ Create your football edit</h1>
              <p className="mt-1 text-sm text-zinc-500">Describe the edit you want.</p>
            </div>

            <EditPrompt value={prompt} onChange={setPrompt} />

            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Player <span className="normal-case text-zinc-600">(optional)</span>
              </h2>
              <PlayerInput value={player} onChange={setPlayer} />
            </div>

            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">Style</h2>
              <StyleSelector selected={styleId} onSelect={onStyleSelect} styles={FOOTBALL_STYLES} />
            </div>

            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">Your clips</h2>
              <VideoUploader
                projectId={projectId}
                clips={clips}
                onProjectId={setProjectId}
                onClipAdded={(clip) => setClips((prev) => [...prev, clip])}
                label="Upload the clips you want the AI to use"
              />
              <p className="mt-2 text-xs text-zinc-600">
                No clips yet? You can still generate the edit plan - you&rsquo;ll just need to upload footage
                before it can be rendered.
              </p>
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

        {step === "result" && plan && (
          <div className="animate-fade-in flex flex-col gap-8">
            <h1 className="text-2xl font-semibold text-white">
              {previewUrl ? "Your football edit is ready ⚽" : "Your edit plan is ready ⚽"}
            </h1>

            {needsFootage && (
              <div className="card border-amber-400/20 bg-amber-400/5 p-6">
                <h3 className="text-sm font-semibold text-amber-300">This edit needs footage to render</h3>
                <p className="mt-1 text-sm text-zinc-400">
                  The AI has planned the edit below, but actual rendering uses the clips you upload - nothing is
                  downloaded automatically.
                </p>
                <div className="mt-4">
                  <VideoUploader
                    projectId={projectId}
                    clips={clips}
                    onProjectId={setProjectId}
                    onClipAdded={(clip) => setClips((prev) => [...prev, clip])}
                    label="Upload the clips you want the AI to use"
                  />
                </div>
                <button
                  className="btn-primary mt-4"
                  onClick={renderNow}
                  disabled={clips.length === 0 || binding}
                >
                  {binding ? "Rendering..." : "Render this edit"}
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
              <div className="flex flex-col gap-6">
                {previewUrl && (
                  <div className={reRendering ? "opacity-50 transition-opacity" : "transition-opacity"}>
                    <VideoPreview src={previewUrl} title="Preview — lower resolution for fast playback" />
                  </div>
                )}
                <EditTimeline plan={plan} />
                {previewUrl && <AIEditChat onApply={applyChatInstruction} />}
              </div>
              <div className="flex flex-col gap-6">
                {summary && <EditSummary summary={summary} />}
                {previewUrl && <ExportPanel onExport={exportVideo} />}
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
    { id: "idea", label: "Describe & upload" },
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
