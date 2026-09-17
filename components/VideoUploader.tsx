"use client";

import { useCallback, useRef, useState } from "react";

export interface UploadedVideoInfo {
  projectId: string;
  videoId: string;
  filename: string;
  sizeBytes: number;
  metadata: { duration: number; width: number; height: number; fps: number; hasAudio: boolean };
  thumbnailUrl: string | null;
  videoUrl: string;
}

interface VideoUploaderProps {
  onUploaded: (info: UploadedVideoInfo) => void;
}

const ACCEPTED_TYPES = [".mp4", ".mov", ".webm"];

export function VideoUploader({ onUploaded }: VideoUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<UploadedVideoInfo | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("video", file);

        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error ?? "Upload failed. Please try again.");
        }

        setUploaded(data);
        onUploaded(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
      } finally {
        setUploading(false);
      }
    },
    [onUploaded],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  if (uploaded) {
    return (
      <div className="card flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-base-900">
          {uploaded.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={uploaded.thumbnailUrl} alt="Video thumbnail" className="h-full w-full object-cover" />
          ) : (
            <span className="text-2xl">🎬</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-white">{uploaded.filename}</p>
          <p className="mt-1 text-sm text-zinc-400">
            {formatBytes(uploaded.sizeBytes)} · {formatDuration(uploaded.metadata.duration)} ·{" "}
            {uploaded.metadata.width}×{uploaded.metadata.height}
          </p>
        </div>
        <button
          className="btn-secondary !px-4 !py-2 text-xs"
          onClick={() => {
            setUploaded(null);
            if (inputRef.current) inputRef.current.value = "";
          }}
        >
          Replace
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`card flex cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed px-6 py-16 text-center transition-colors ${
          dragActive ? "border-accent bg-accent/5" : "border-white/10 hover:border-white/25"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        {uploading ? (
          <>
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="text-sm text-zinc-400">Uploading and reading your video...</p>
          </>
        ) : (
          <>
            <span className="text-4xl">📼</span>
            <p className="text-lg font-medium text-white">Drop your video here</p>
            <p className="text-sm text-zinc-500">or click to browse — MP4, MOV, or WEBM</p>
          </>
        )}
      </div>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export { formatBytes, formatDuration };
export const ACCEPTED_VIDEO_EXTENSIONS = ACCEPTED_TYPES;
