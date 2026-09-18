"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardNav } from "@/components/DashboardNav";
import { getEditingStyle } from "@/lib/styles/editingStyles";
import type { ProjectSummary } from "@/types/project";

export default function MyEditsPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  function loadProjects() {
    setLoading(true);
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setProjects(data.projects);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load your edits."))
      .finally(() => setLoading(false));
  }

  async function handleDelete(id: string) {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    await fetch(`/api/projects/${id}`, { method: "DELETE" }).catch(() => {
      // Reload to resync if the delete failed server-side.
      loadProjects();
    });
  }

  return (
    <div className="min-h-screen bg-grid">
      <DashboardNav />

      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">My Edits</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Everything generated on this server so far.{" "}
              <span className="text-zinc-600">There is no login yet, so this list isn&rsquo;t private - see README.</span>
            </p>
          </div>
          <Link href="/app" className="btn-primary">
            + New edit
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-zinc-500">Loading...</p>
        ) : projects.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-sm text-zinc-400">No edits yet.</p>
            <Link href="/app" className="btn-primary mt-4 inline-block">
              Create your first edit
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {projects.map((project) => (
              <ProjectRow key={project.id} project={project} onDelete={() => handleDelete(project.id)} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ProjectRow({ project, onDelete }: { project: ProjectSummary; onDelete: () => void }) {
  const style = getEditingStyle(project.styleId as never);
  const duplicateQuery = new URLSearchParams();
  if (project.prompt) duplicateQuery.set("prompt", project.prompt);
  if (project.player) duplicateQuery.set("player", project.player);
  if (project.styleId) duplicateQuery.set("styleId", project.styleId);
  if (project.durationSeconds) duplicateQuery.set("duration", String(Math.round(project.durationSeconds)));

  return (
    <div className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-base-900">
        {project.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={project.thumbnailUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-xl">🎬</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{project.prompt ?? "Untitled edit"}</p>
        <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-zinc-500">
          {project.player && <span>{project.player}</span>}
          {style && <span>{style.emoji} {style.label}</span>}
          {project.durationSeconds && <span>{Math.round(project.durationSeconds)}s</span>}
          <span>{new Date(project.createdAt).toLocaleDateString()}</span>
          <StatusBadge status={project.status} />
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap gap-2">
        {project.previewUrl && (
          <Link href={`/app?projectId=${project.id}`} className="btn-secondary !px-3 !py-1.5 text-xs">
            Open
          </Link>
        )}
        <Link href={`/app?${duplicateQuery.toString()}`} className="btn-secondary !px-3 !py-1.5 text-xs">
          Duplicate
        </Link>
        {project.exportUrl && (
          <a href={project.exportUrl} className="btn-secondary !px-3 !py-1.5 text-xs">
            Download
          </a>
        )}
        <button onClick={onDelete} className="btn-secondary !px-3 !py-1.5 text-xs !text-red-400">
          Delete
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ProjectSummary["status"] }) {
  const labels: Record<ProjectSummary["status"], string> = {
    ready: "Rendered",
    draft: "Plan only",
    not_generated: "Not generated",
  };
  return <span className="text-zinc-600">{labels[status]}</span>;
}
