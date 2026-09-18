import type { ClipPurpose, EditingStyleId } from "@/types/edit";

export type TrendingPlatform = "tiktok" | "instagram" | "youtube";
export type TrendingSortBy = "views" | "likes" | "comments" | "engagement" | "trending";
export type TrendingTimeRange = "24h" | "3d" | "7d" | "30d";

export interface TrendingStats {
  views: number;
  likes: number;
  comments: number;
}

export interface TrendingAnalysis {
  cutCount: number;
  averageClipDurationSeconds: number;
  speedRamps: boolean;
  slowMotion: boolean;
  zooms: boolean;
  shakes: boolean;
  flashes: boolean;
  transitions: boolean;
  beatMoments: number;
  captionsDetected: boolean;
  /** The narrative arc, reusing the same ClipPurpose vocabulary as EditPlan.clips - lets "Create Similar Edit" reuse it directly as a sceneArcOverride. */
  structure: ClipPurpose[];
  energy: "low" | "medium" | "high";
  pacing: "slow" | "medium" | "fast" | "very fast";
}

export interface TrendingEdit {
  id: string;
  platform: TrendingPlatform;
  title: string;
  player: string;
  /** No real thumbnail images in demo mode - just a display emoji. */
  thumbnailEmoji: string;
  durationSeconds: number;
  publishedAt: string;
  stats: TrendingStats;
  style: EditingStyleId;
  analysis: TrendingAnalysis;
}

export interface TrendingFilters {
  platform?: TrendingPlatform | "all";
  timeRange?: TrendingTimeRange | "all";
  sortBy?: TrendingSortBy;
  player?: string;
  style?: EditingStyleId | "all";
}

/**
 * Resolves "what's trending" data. Today only DemoTrendingProvider exists -
 * see lib/trending/demo.ts and README "API required for production" for
 * what a RealTrendingProvider would need (TikTok/Instagram/YouTube do not
 * offer a public, free "trending football edits" API - see the report).
 */
export interface TrendingProvider {
  readonly name: string;
  readonly isDemo: boolean;
  getTrendingEdits(filters: TrendingFilters): Promise<TrendingEdit[]>;
  getTrendingEdit(id: string): Promise<TrendingEdit | undefined>;
}
