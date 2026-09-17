"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface UploadedVideoInfo {
  projectId: string;
  videoId: string;
  clipId: string;
  filename: string;
  sizeBytes: number;
  metadata: { duration: number; width: number; height: number; fps: number; hasAudio: boolean };
  thumbnailUrl: string | null;
  videoUrl: string;
}

interface VideoUploaderProps {
  /** Existing project to attach this clip to (football multi-clip flow). Null creates a new project on first upload. */
  projectId: string | null;
  /** Already-uploaded clips for this project, in upload order. */
  clips: UploadedVideoInfo[];
  onProjectId: (projectId: string) => void;
  onClipAdded: (clip: UploadedVideoInfo) => void;
  /** Label shown on the empty drop zone. Defaults to the classic single-video wording. */
  label?: string;
}

const ACCEPTED_TYPES = [".mp4", ".mov", ".webm"];

/**
 * Upload one or more video clips.
 *
 * This is the same upload mechanism the original single-video MVP used
 * (POST /api/upload, ffprobe metadata, real thumbnail) - generalized to
 * accumulate a list of clips against one project instead of assuming
 * exactly one video. Uploading a single clip still works exactly as
 * before; it's simply clip #1 of what can become a multi-clip project.
 */
export function VideoUploader({ projectId, clips, onProjectId, onClipAdded, label }: VideoUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Tracks the effective project id across a single multi-file upload batch.
  // Using the `projectId` prop directly inside the loop below would read a
  // stale (pre-upload) value for every file after the first, since React
  // state updates from onProjectId() don't land until the next render -
  // that would silently create a separate project per extra clip.
  const projectIdRef = useRef(projectId);
  useEffect(() => {
    projectIdRef.current = projectId;
  }, [projectId]);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      setError(null);
      setUploading(true);
      try {
        for (const file of Array.from(files)) {
          const formData = new FormData();
          formData.append("video", file);
          if (projectIdRef.current) formData.append("projectId", projectIdRef.current);

          const res = await fetch("/api/upload", { method: "POST", body: formData });
          const data = await res.json();

          if (!res.ok) {
            throw new Error(data.error ?? "Upload failed. Please try again.");
          }

          if (!projectIdRef.current) {
            projectIdRef.current = data.projectId;
            onProjectId(data.projectId);
          }
          onClipAdded(data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
      } finally {
        setUploading(false);
      }
    },
    [onProjectId, onClipAdded],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  return (
    <div className="flex flex-col gap-3">
      {clips.map((clip) => (
        <div key={clip.clipId} className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-base-900">
            {clip.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={clip.thumbnailUrl} alt="Clip thumbnail" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xl">🎬</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{clip.filename}</p>
            <p className="mt-0.5 text-xs text-zinc-400">
              {formatBytes(clip.sizeBytes)} · {formatDuration(clip.metadata.duration)} · {clip.metadata.width}×
              {clip.metadata.height}
            </p>
          </div>
        </div>
      ))}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`card flex cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed text-center transition-colors ${
          clips.length > 0 ? "px-6 py-8" : "px-6 py-16"
        } ${dragActive ? "border-accent bg-accent/5" : "border-white/10 hover:border-white/25"}`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        {uploading ? (
          <>
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="text-sm text-zinc-400">Uploading and reading your clip...</p>
          </>
        ) : clips.length > 0 ? (
          <>
            <span className="text-2xl">➕</span>
            <p className="text-sm font-medium text-white">Add another clip</p>
          </>
        ) : (
          <>
            <span className="text-4xl">📼</span>
            <p className="text-lg font-medium text-white">{label ?? "Drop your video here"}</p>
            <p className="text-sm text-zinc-500">or click to browse — MP4, MOV, or WEBM</p>
          </>
        )}
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
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
