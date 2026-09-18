import Link from "next/link";
import { PURPOSE_LABELS } from "@/lib/ai/football";
import { getEditingStyle } from "@/lib/styles/editingStyles";
import { formatCount, formatTimeAgo, PLATFORM_LABELS } from "@/lib/trending/format";
import type { TrendingEdit } from "@/lib/trending/types";

interface TrendingCardProps {
  edit: TrendingEdit;
  rank?: number;
}

export function TrendingCard({ edit, rank }: TrendingCardProps) {
  const style = getEditingStyle(edit.style);
  const structure = edit.analysis.structure.map((p) => PURPOSE_LABELS[p]).join(" → ");

  return (
    <div className="card flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-base-900 text-2xl">
            {edit.thumbnailEmoji}
          </span>
          <div>
            {rank !== undefined && (
              <span className="text-xs font-semibold uppercase tracking-wide text-accent">🔥 Trending #{rank}</span>
            )}
            <h3 className="text-sm font-semibold text-white">{edit.title}</h3>
            <p className="text-xs text-zinc-500">
              {PLATFORM_LABELS[edit.platform]} · {edit.player}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
        <span>👁 {formatCount(edit.stats.views)} views</span>
        <span>❤️ {formatCount(edit.stats.likes)} likes</span>
        <span>💬 {formatCount(edit.stats.comments)} comments</span>
      </div>
      <p className="text-[11px] text-zinc-600">Posted {formatTimeAgo(edit.publishedAt)}</p>

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-zinc-400">
        <span>
          Style: <span className="text-zinc-200">{style ? `${style.emoji} ${style.label}` : edit.style}</span>
        </span>
        <span>
          Duration: <span className="text-zinc-200">{edit.durationSeconds}s</span>
        </span>
      </div>

      <p className="text-xs text-zinc-500">
        Detected structure: <span className="text-zinc-300">{structure}</span>
      </p>

      <div className="mt-auto flex gap-2 pt-2">
        <Link href={`/trending/${edit.id}`} className="btn-secondary flex-1 !px-3 !py-2 text-xs">
          Analyze
        </Link>
        <Link href={`/trending/${edit.id}?remix=1`} className="btn-primary flex-1 !px-3 !py-2 text-xs">
          Create Similar Edit
        </Link>
      </div>
    </div>
  );
}
