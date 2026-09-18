import type { TrendingEdit, TrendingFilters, TrendingProvider } from "@/lib/trending/types";

/**
 * DemoTrendingProvider - a fixed, hand-authored dataset standing in for a
 * real trending-edits feed.
 *
 * IMPORTANT: none of this is live data. No platform is scraped or queried.
 * Views/likes/comments below are illustrative numbers, not measurements of
 * any real video - the UI must always show a "Demo Trending Data" badge
 * alongside them. See README "API required for production" for what a real
 * TikTok/Instagram/YouTube-backed provider would actually require.
 */
export class DemoTrendingProvider implements TrendingProvider {
  readonly name = "demo";
  readonly isDemo = true;

  async getTrendingEdits(filters: TrendingFilters): Promise<TrendingEdit[]> {
    let edits = DEMO_EDITS.map(withRelativeDate);

    if (filters.platform && filters.platform !== "all") {
      edits = edits.filter((e) => e.platform === filters.platform);
    }
    if (filters.style && filters.style !== "all") {
      edits = edits.filter((e) => e.style === filters.style);
    }
    if (filters.player && filters.player !== "all") {
      edits = edits.filter((e) => e.player.toLowerCase() === filters.player!.toLowerCase());
    }
    if (filters.timeRange && filters.timeRange !== "all") {
      const maxAgeMs = TIME_RANGE_MS[filters.timeRange];
      const now = Date.now();
      edits = edits.filter((e) => now - new Date(e.publishedAt).getTime() <= maxAgeMs);
    }

    const sortBy = filters.sortBy ?? "trending";
    edits.sort((a, b) => {
      switch (sortBy) {
        case "views":
          return b.stats.views - a.stats.views;
        case "likes":
          return b.stats.likes - a.stats.likes;
        case "comments":
          return b.stats.comments - a.stats.comments;
        case "engagement":
          return (b.stats.likes + b.stats.comments) / b.stats.views - (a.stats.likes + a.stats.comments) / a.stats.views;
        case "trending":
        default:
          // "Trending" = recency-weighted views, a simple stand-in for a real trending score.
          return trendScore(b) - trendScore(a);
      }
    });

    return edits;
  }

  async getTrendingEdit(id: string): Promise<TrendingEdit | undefined> {
    const edit = DEMO_EDITS.find((e) => e.id === id);
    return edit ? withRelativeDate(edit) : undefined;
  }
}

function trendScore(edit: TrendingEdit): number {
  const ageHours = (Date.now() - new Date(edit.publishedAt).getTime()) / 3_600_000;
  return edit.stats.views / Math.max(1, ageHours);
}

const TIME_RANGE_MS: Record<string, number> = {
  "24h": 24 * 3_600_000,
  "3d": 3 * 24 * 3_600_000,
  "7d": 7 * 24 * 3_600_000,
  "30d": 30 * 24 * 3_600_000,
};

/** Stores age in hours-ago rather than a fixed date, so the demo data always looks current. */
function withRelativeDate(edit: Omit<TrendingEdit, "publishedAt"> & { hoursAgo: number }): TrendingEdit {
  const { hoursAgo, ...rest } = edit;
  return { ...rest, publishedAt: new Date(Date.now() - hoursAgo * 3_600_000).toISOString() };
}

type DemoEditSeed = Omit<TrendingEdit, "publishedAt"> & { hoursAgo: number };

const DEMO_EDITS: DemoEditSeed[] = [
  {
    id: "demo-1",
    platform: "tiktok",
    title: "Mbappé Football Edit",
    player: "Mbappé",
    thumbnailEmoji: "⚡",
    durationSeconds: 17,
    hoursAgo: 8,
    stats: { views: 2_400_000, likes: 312_000, comments: 4_800 },
    style: "fast-paced",
    analysis: {
      cutCount: 22,
      averageClipDurationSeconds: 0.8,
      speedRamps: true,
      slowMotion: false,
      zooms: true,
      shakes: true,
      flashes: true,
      transitions: false,
      beatMoments: 3,
      captionsDetected: true,
      structure: ["hook", "dribble", "skill", "goal", "celebration"],
      energy: "high",
      pacing: "very fast",
    },
  },
  {
    id: "demo-2",
    platform: "instagram",
    title: "Ronaldo Dark Mode",
    player: "Ronaldo",
    thumbnailEmoji: "🌑",
    durationSeconds: 21,
    hoursAgo: 20,
    stats: { views: 1_150_000, likes: 187_000, comments: 2_900 },
    style: "dark",
    analysis: {
      cutCount: 14,
      averageClipDurationSeconds: 1.5,
      speedRamps: false,
      slowMotion: true,
      zooms: false,
      shakes: true,
      flashes: true,
      transitions: false,
      beatMoments: 1,
      captionsDetected: false,
      structure: ["hook", "sprint", "shot", "goal", "celebration"],
      energy: "high",
      pacing: "fast",
    },
  },
  {
    id: "demo-3",
    platform: "youtube",
    title: "Messi - The Movie",
    player: "Messi",
    thumbnailEmoji: "❤️",
    durationSeconds: 42,
    hoursAgo: 30,
    stats: { views: 890_000, likes: 96_000, comments: 3_200 },
    style: "emotional",
    analysis: {
      cutCount: 9,
      averageClipDurationSeconds: 4.2,
      speedRamps: false,
      slowMotion: true,
      zooms: false,
      shakes: false,
      flashes: false,
      transitions: true,
      beatMoments: 0,
      captionsDetected: true,
      structure: ["hook", "dribble", "assist", "goal", "celebration"],
      energy: "low",
      pacing: "slow",
    },
  },
  {
    id: "demo-4",
    platform: "tiktok",
    title: "Yamal Is Different",
    player: "Yamal",
    thumbnailEmoji: "🔥",
    durationSeconds: 15,
    hoursAgo: 5,
    stats: { views: 3_100_000, likes: 455_000, comments: 6_700 },
    style: "aggressive",
    analysis: {
      cutCount: 26,
      averageClipDurationSeconds: 0.6,
      speedRamps: true,
      slowMotion: false,
      zooms: true,
      shakes: true,
      flashes: true,
      transitions: false,
      beatMoments: 4,
      captionsDetected: true,
      structure: ["hook", "skill", "dribble", "goal", "celebration"],
      energy: "high",
      pacing: "very fast",
    },
  },
  {
    id: "demo-5",
    platform: "tiktok",
    title: "Haaland Beast Mode",
    player: "Haaland",
    thumbnailEmoji: "💪",
    durationSeconds: 18,
    hoursAgo: 50,
    stats: { views: 1_780_000, likes: 220_000, comments: 3_100 },
    style: "fast-paced",
    analysis: {
      cutCount: 18,
      averageClipDurationSeconds: 1.0,
      speedRamps: true,
      slowMotion: false,
      zooms: true,
      shakes: false,
      flashes: true,
      transitions: false,
      beatMoments: 2,
      captionsDetected: true,
      structure: ["hook", "sprint", "shot", "goal", "celebration"],
      energy: "high",
      pacing: "fast",
    },
  },
  {
    id: "demo-6",
    platform: "instagram",
    title: "Vinicius Skills Compilation",
    player: "Vinicius",
    thumbnailEmoji: "✨",
    durationSeconds: 25,
    hoursAgo: 65,
    stats: { views: 640_000, likes: 71_000, comments: 1_400 },
    style: "clean",
    analysis: {
      cutCount: 11,
      averageClipDurationSeconds: 2.3,
      speedRamps: false,
      slowMotion: false,
      zooms: false,
      shakes: false,
      flashes: false,
      transitions: true,
      beatMoments: 0,
      captionsDetected: false,
      structure: ["hook", "dribble", "skill", "closeup"],
      energy: "medium",
      pacing: "medium",
    },
  },
  {
    id: "demo-7",
    platform: "youtube",
    title: "Bellingham Cinematic",
    player: "Bellingham",
    thumbnailEmoji: "🎬",
    durationSeconds: 35,
    hoursAgo: 90,
    stats: { views: 512_000, likes: 44_000, comments: 980 },
    style: "cinematic",
    analysis: {
      cutCount: 8,
      averageClipDurationSeconds: 4.4,
      speedRamps: false,
      slowMotion: true,
      zooms: true,
      shakes: false,
      flashes: false,
      transitions: true,
      beatMoments: 0,
      captionsDetected: false,
      structure: ["hook", "pass", "assist", "goal", "celebration"],
      energy: "medium",
      pacing: "slow",
    },
  },
  {
    id: "demo-8",
    platform: "tiktok",
    title: "Mbappé Phonk Edit",
    player: "Mbappé",
    thumbnailEmoji: "🎧",
    durationSeconds: 16,
    hoursAgo: 12,
    stats: { views: 4_200_000, likes: 612_000, comments: 9_100 },
    style: "aggressive",
    analysis: {
      cutCount: 24,
      averageClipDurationSeconds: 0.65,
      speedRamps: true,
      slowMotion: false,
      zooms: true,
      shakes: true,
      flashes: true,
      transitions: false,
      beatMoments: 5,
      captionsDetected: true,
      structure: ["hook", "sprint", "dribble", "goal", "celebration"],
      energy: "high",
      pacing: "very fast",
    },
  },
  {
    id: "demo-9",
    platform: "instagram",
    title: "Ronaldo Reaction Pack",
    player: "Ronaldo",
    thumbnailEmoji: "😤",
    durationSeconds: 12,
    hoursAgo: 3,
    stats: { views: 980_000, likes: 133_000, comments: 2_200 },
    style: "aggressive",
    analysis: {
      cutCount: 10,
      averageClipDurationSeconds: 1.2,
      speedRamps: false,
      slowMotion: false,
      zooms: true,
      shakes: true,
      flashes: false,
      transitions: false,
      beatMoments: 1,
      captionsDetected: true,
      structure: ["hook", "reaction", "celebration"],
      energy: "high",
      pacing: "fast",
    },
  },
  {
    id: "demo-10",
    platform: "youtube",
    title: "Messi Free Kick Masterclass",
    player: "Messi",
    thumbnailEmoji: "🎯",
    durationSeconds: 28,
    hoursAgo: 120,
    stats: { views: 725_000, likes: 88_000, comments: 1_900 },
    style: "cinematic",
    analysis: {
      cutCount: 7,
      averageClipDurationSeconds: 4.0,
      speedRamps: false,
      slowMotion: true,
      zooms: true,
      shakes: false,
      flashes: false,
      transitions: true,
      beatMoments: 0,
      captionsDetected: true,
      structure: ["hook", "closeup", "shot", "goal", "celebration"],
      energy: "medium",
      pacing: "slow",
    },
  },
  {
    id: "demo-11",
    platform: "tiktok",
    title: "Yamal x Lamine Speed Edit",
    player: "Yamal",
    thumbnailEmoji: "🏃",
    durationSeconds: 14,
    hoursAgo: 40,
    stats: { views: 2_050_000, likes: 298_000, comments: 5_300 },
    style: "fast-paced",
    analysis: {
      cutCount: 20,
      averageClipDurationSeconds: 0.7,
      speedRamps: true,
      slowMotion: false,
      zooms: true,
      shakes: false,
      flashes: true,
      transitions: false,
      beatMoments: 3,
      captionsDetected: true,
      structure: ["hook", "sprint", "dribble", "skill", "celebration"],
      energy: "high",
      pacing: "very fast",
    },
  },
  {
    id: "demo-12",
    platform: "instagram",
    title: "Haaland Emotional Journey",
    player: "Haaland",
    thumbnailEmoji: "🥹",
    durationSeconds: 38,
    hoursAgo: 150,
    stats: { views: 430_000, likes: 51_000, comments: 1_100 },
    style: "emotional",
    analysis: {
      cutCount: 9,
      averageClipDurationSeconds: 4.1,
      speedRamps: false,
      slowMotion: true,
      zooms: false,
      shakes: false,
      flashes: false,
      transitions: true,
      beatMoments: 0,
      captionsDetected: true,
      structure: ["hook", "sprint", "shot", "goal", "celebration"],
      energy: "low",
      pacing: "slow",
    },
  },
];
