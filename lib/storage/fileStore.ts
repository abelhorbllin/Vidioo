import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";

/**
 * Temporary, on-disk file storage + in-memory project state for the MVP.
 *
 * There is no database yet. Everything here is deliberately shaped so that
 * swapping in a real one later is mostly a matter of replacing the Maps
 * below with real queries:
 *   - `projects` map  -> `projects` table
 *   - `files` map     -> could stay as-is (local disk) or point at rows
 *                        tracking objects in cloud storage (S3, etc.)
 * The uploaded video, the AI analysis, the edit plan and any renders/exports
 * for a given session are grouped under one `ProjectState`, mirroring the
 * eventual `projects` / `videos` / `edits` / `exports` split described in
 * the project brief - just not persisted anywhere yet.
 *
 * File paths are NEVER sent to the browser. Every file is referenced by an
 * opaque id and served through /api/files/[id].
 */

export type StoredKind = "upload" | "thumbnail" | "render" | "export" | "demo";

export interface StoredFile {
  id: string;
  kind: StoredKind;
  absolutePath: string;
  mimeType: string;
  createdAt: number;
}

/** Exported so lib/video/remotion.ts can serve this same tree as its Remotion bundle's public dir. */
export const DATA_ROOT = path.join(process.cwd(), ".data");
const DIRS: Record<StoredKind, string> = {
  upload: path.join(DATA_ROOT, "uploads"),
  thumbnail: path.join(DATA_ROOT, "tmp"),
  render: path.join(DATA_ROOT, "tmp"),
  export: path.join(DATA_ROOT, "exports"),
  /** Synthetic, ffmpeg-generated placeholder clips used by DemoAssetProvider - see lib/assets/demo.ts. */
  demo: path.join(DATA_ROOT, "demo"),
};

// Survive Next.js dev-server hot reloads by stashing state on globalThis.
const globalStore = globalThis as unknown as {
  __editaiFiles?: Map<string, StoredFile>;
  __editaiProjects?: Map<string, ProjectState>;
  __editaiCleanupTimer?: NodeJS.Timeout;
};

const files = (globalStore.__editaiFiles ??= new Map<string, StoredFile>());
const projects = (globalStore.__editaiProjects ??= new Map<string, ProjectState>());

export interface ProjectState {
  id: string;
  /** Primary/first uploaded clip - kept for backward compatibility with the original single-video flow. */
  videoFileId?: string;
  /** All uploaded source clips for this project, in upload order. Football edits may have several. */
  clipFileIds: string[];
  createdAt: number;
  updatedAt: number;
  [key: string]: unknown;
}

async function ensureDirs(): Promise<void> {
  await Promise.all(Object.values(DIRS).map((dir) => fs.mkdir(dir, { recursive: true })));
}

export async function saveBufferAs(
  kind: StoredKind,
  buffer: Buffer,
  extension: string,
  mimeType: string,
): Promise<StoredFile> {
  await ensureDirs();
  const id = randomUUID();
  const absolutePath = path.join(DIRS[kind], `${id}${extension}`);
  await fs.writeFile(absolutePath, buffer);
  const record: StoredFile = { id, kind, absolutePath, mimeType, createdAt: Date.now() };
  files.set(id, record);
  return record;
}

export async function reserveOutputPath(
  kind: StoredKind,
  extension: string,
  mimeType: string,
): Promise<StoredFile> {
  await ensureDirs();
  const id = randomUUID();
  const absolutePath = path.join(DIRS[kind], `${id}${extension}`);
  const record: StoredFile = { id, kind, absolutePath, mimeType, createdAt: Date.now() };
  files.set(id, record);
  return record;
}

export function getFile(id: string): StoredFile | undefined {
  return files.get(id);
}

export function createProject(videoFileId: string): ProjectState {
  const id = randomUUID();
  const state: ProjectState = {
    id,
    videoFileId,
    clipFileIds: [videoFileId],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  projects.set(id, state);
  return state;
}

/** Creates a project with no footage yet - the entry point for the prompt-first football flow. */
export function createDraftProject(): ProjectState {
  const id = randomUUID();
  const state: ProjectState = { id, clipFileIds: [], createdAt: Date.now(), updatedAt: Date.now() };
  projects.set(id, state);
  return state;
}

export function getProject(id: string): ProjectState | undefined {
  return projects.get(id);
}

/** Lists all in-memory projects, newest first. There's no auth/multi-tenancy yet - see README limitations. */
export function listProjects(): ProjectState[] {
  return Array.from(projects.values()).sort((a, b) => b.createdAt - a.createdAt);
}

export function deleteProject(id: string): boolean {
  return projects.delete(id);
}

/** Appends an uploaded clip file to a project, setting it as the primary video if it's the first one. */
export function addClipToProject(projectId: string, fileId: string): ProjectState {
  const existing = projects.get(projectId);
  if (!existing) throw new Error(`Project ${projectId} not found`);
  const clipFileIds = [...existing.clipFileIds, fileId];
  const updated: ProjectState = {
    ...existing,
    clipFileIds,
    videoFileId: existing.videoFileId ?? fileId,
    updatedAt: Date.now(),
  };
  projects.set(projectId, updated);
  return updated;
}

export function updateProject(id: string, patch: Record<string, unknown>): ProjectState {
  const existing = projects.get(id);
  if (!existing) throw new Error(`Project ${id} not found`);
  const updated = { ...existing, ...patch, updatedAt: Date.now() };
  projects.set(id, updated);
  return updated;
}

const MAX_FILE_AGE_MS = 60 * 60 * 1000; // 1 hour

async function cleanupExpiredFiles(): Promise<void> {
  const now = Date.now();
  for (const [id, file] of files) {
    if (now - file.createdAt > MAX_FILE_AGE_MS) {
      try {
        await fs.unlink(file.absolutePath);
      } catch {
        // Already gone - fine.
      }
      files.delete(id);
    }
  }
  for (const [id, project] of projects) {
    if (now - project.updatedAt > MAX_FILE_AGE_MS) {
      projects.delete(id);
    }
  }
}

// Run cleanup periodically. Guarded against duplicate timers on hot reload.
if (!globalStore.__editaiCleanupTimer) {
  globalStore.__editaiCleanupTimer = setInterval(cleanupExpiredFiles, 10 * 60 * 1000);
  if (typeof globalStore.__editaiCleanupTimer.unref === "function") {
    globalStore.__editaiCleanupTimer.unref();
  }
}
