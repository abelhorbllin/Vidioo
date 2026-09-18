import { NextRequest, NextResponse } from "next/server";
import { isDemoTrendingMode } from "@/lib/trending/provider";
import { getTrendingProvider } from "@/lib/trending/provider";
import type { TrendingFilters } from "@/lib/trending/types";
import { handleApiError } from "@/lib/errors";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const filters: TrendingFilters = {
      platform: (params.get("platform") as TrendingFilters["platform"]) ?? "all",
      timeRange: (params.get("timeRange") as TrendingFilters["timeRange"]) ?? "all",
      sortBy: (params.get("sortBy") as TrendingFilters["sortBy"]) ?? "trending",
      player: params.get("player") ?? "all",
      style: (params.get("style") as TrendingFilters["style"]) ?? "all",
    };

    const edits = await getTrendingProvider().getTrendingEdits(filters);

    return NextResponse.json({ edits, demoMode: isDemoTrendingMode() });
  } catch (error) {
    return handleApiError(error, "trending");
  }
}
