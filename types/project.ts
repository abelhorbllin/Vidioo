/** Lightweight projection of a ProjectState for listing in "My Edits". See app/api/projects/route.ts. */
export interface ProjectSummary {
  id: string;
  prompt?: string;
  player?: string;
  styleId?: string;
  durationSeconds?: number;
  createdAt: number;
  status: "draft" | "ready" | "not_generated";
  thumbnailUrl: string | null;
  previewUrl: string | null;
  exportUrl: string | null;
}
