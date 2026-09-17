"use client";

import { useState } from "react";
import Link from "next/link";
import { AdvancedOptions } from "@/components/AdvancedOptions";
import { AIEditChat } from "@/components/AIEditChat";
import { EditPrompt } from "@/components/EditPrompt";
import { EditSummary } from "@/components/EditSummary";
import { ExportPanel } from "@/components/ExportPanel";
import { GenerationProgress } from "@/components/GenerationProgress";
import { StyleSelector } from "@/components/StyleSelector";
import { VideoPreview } from "@/components/VideoPreview";
import { VideoUploader, type UploadedVideoInfo } from "@/components/VideoUploader";
import { getEditingStyle } from "@/lib/styles/editingStyles";
import {
  DEFAULT_ADVANCED_OPTIONS,
  type AdvancedOptions as AdvancedOptionsType,
  type EditingStyleId,
  type EditPlan,
  type EditSummary as EditSummaryType,
} from "@/types/edit";

type Step = "upload" | "describe" | "generating" | "result";

export default function AppPage() {
  const [step, setStep] = useState<Step>("upload");
  const [uploaded, setUploaded] = useState<UploadedVideoInfo | null>(null);
  const [prompt, setPrompt] = useState("");
  const [styleId, setStyleId] = useState<EditingStyleId | undefined>(undefined);
  const [options, setOptions] = useState<AdvancedOptionsType>(DEFAULT_ADVANCED_OPTIONS);

  const [plan, setPlan] = useState<EditPlan | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [summary, setSummary] = useState<EditSummaryType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reRendering, setReRendering] = useState(false);

  function onStyleSelect(id: EditingStyleId | undefined) {
    setStyleId(id);
    const style = getEditingStyle(id);
    if (style) {
      setOptions((prev) => ({ ...prev, ...style.optionOverrides }));
    }
  }

  async function generateEdit() {
    if (!uploaded) return;
    setError(null);
    setStep("generating");

    try {
      const analyzeRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: uploaded.projectId, prompt, styleId, options }),
      });
      const analyzeData = await analyzeRes.json();
      if (!analyzeRes.ok) throw new Error(analyzeData.error ?? "Could not generate an edit plan.");

      setPlan(analyzeData.plan);
      setDemoMode(analyzeData.demoMode);

      const renderRes = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: uploaded.projectId }),
      });
      const renderData = await renderRes.json();
      if (!renderRes.ok) throw new Error(renderData.error ?? "Could not render a preview.");

      setPreviewUrl(renderData.previewUrl);
      setSummary(renderData.summary);
      setStep("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStep("describe");
    }
  }

  async function applyChatInstruction(instruction: string) {
    if (!uploaded) return;

    const editRes = await fetch("/api/edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: uploaded.projectId, instruction }),
    });
    const editData = await editRes.json();
    if (!editRes.ok) throw new Error(editData.error ?? "That change could not be applied.");

    setPlan(editData.plan);
    setReRendering(true);
    try {
      const renderRes = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: uploaded.projectId }),
      });
      const renderData = await renderRes.json();
      if (!renderRes.ok) throw new Error(renderData.error ?? "Could not re-render your edit.");
      setPreviewUrl(renderData.previewUrl);
      setSummary(renderData.summary);
    } finally {
      setReRendering(false);
    }
  }

  async function exportVideo(resolution: "720p" | "1080p") {
    if (!uploaded) throw new Error("Missing project.");
    const res = await fetch("/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: uploaded.projectId, resolution }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Export failed. Please try again.");
    return data;
  }

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

        {step === "upload" && (
          <div className="animate-fade-in flex flex-col gap-6">
            <h1 className="text-2xl font-semibold text-white">Upload your video</h1>
            <VideoUploader
              onUploaded={(info) => {
                setUploaded(info);
                setStep("describe");
              }}
            />
          </div>
        )}

        {step === "describe" && uploaded && (
          <div className="animate-fade-in flex flex-col gap-8">
            <div>
              <h1 className="text-2xl font-semibold text-white">Describe your edit</h1>
              <p className="mt-1 text-sm text-zinc-500">Working with {uploaded.filename}</p>
            </div>

            <EditPrompt value={prompt} onChange={setPrompt} />

            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Editing style
              </h2>
              <StyleSelector selected={styleId} onSelect={onStyleSelect} />
            </div>

            <AdvancedOptions options={options} onChange={setOptions} />

            <div className="flex justify-between">
              <button className="btn-secondary" onClick={() => setStep("upload")}>
                Back
              </button>
              <button className="btn-primary" onClick={generateEdit} disabled={!prompt.trim()}>
                Generate my edit
              </button>
            </div>
          </div>
        )}

        {step === "generating" && (
          <div className="animate-fade-in py-8">
            <GenerationProgress done={false} />
          </div>
        )}

        {step === "result" && previewUrl && summary && (
          <div className="animate-fade-in flex flex-col gap-8">
            <h1 className="text-2xl font-semibold text-white">Your edit is ready</h1>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
              <div className="flex flex-col gap-6">
                <div className={reRendering ? "opacity-50 transition-opacity" : "transition-opacity"}>
                  <VideoPreview src={previewUrl} title="Preview — lower resolution for fast playback" />
                </div>
                <AIEditChat onApply={applyChatInstruction} />
              </div>
              <div className="flex flex-col gap-6">
                <EditSummary summary={summary} />
                <ExportPanel onExport={exportVideo} />
              </div>
            </div>

            <div>
              <button
                className="btn-secondary"
                onClick={() => {
                  setStep("describe");
                }}
              >
                Adjust prompt & options
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
    { id: "upload", label: "Upload" },
    { id: "describe", label: "Describe" },
    { id: "generating", label: "Generate" },
    { id: "result", label: "Preview & export" },
  ];
  const activeIndex = steps.findIndex((s) => s.id === step);

  return (
    <div className="mb-10 flex items-center gap-2">
      {steps.map((s, i) => (
        <div key={s.id} className="flex flex-1 items-center gap-2">
          <div
            className={`h-1.5 flex-1 rounded-full ${i <= activeIndex ? "bg-accent" : "bg-white/10"}`}
          />
          {i < steps.length - 1 && <span className="hidden text-xs text-zinc-700 sm:inline" />}
        </div>
      ))}
    </div>
  );
}
