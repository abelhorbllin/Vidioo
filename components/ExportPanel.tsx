"use client";

import { useState } from "react";

interface ExportPanelProps {
  onExport: (resolution: "720p" | "1080p") => Promise<{ downloadUrl: string; filename: string }>;
}

export function ExportPanel({ onExport }: ExportPanelProps) {
  const [resolution, setResolution] = useState<"720p" | "1080p">("1080p");
  const [status, setStatus] = useState<"idle" | "rendering" | "ready" | "error">("idle");
  const [result, setResult] = useState<{ downloadUrl: string; filename: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setStatus("rendering");
    setError(null);
    try {
      const res = await onExport(resolution);
      setResult(res);
      setStatus("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed. Please try again.");
      setStatus("error");
    }
  }

  return (
    <div className="card p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Export</h3>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm text-zinc-400">Resolution</span>
        <div className="inline-flex rounded-full border border-white/10 bg-base-900 p-1">
          {(["720p", "1080p"] as const).map((res) => (
            <button
              key={res}
              type="button"
              onClick={() => {
                setResolution(res);
                setStatus("idle");
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                resolution === res ? "bg-accent text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              {res}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm text-zinc-400">Format</span>
        <span className="text-sm text-zinc-300">MP4</span>
      </div>

      <div className="mt-6">
        {status === "ready" && result ? (
          <a
            href={result.downloadUrl}
            download={result.filename}
            className="btn-primary w-full"
          >
            Download
          </a>
        ) : (
          <button onClick={handleExport} disabled={status === "rendering"} className="btn-primary w-full">
            {status === "rendering" ? "Rendering your video..." : "Export video"}
          </button>
        )}
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </div>
    </div>
  );
}
