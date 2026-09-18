import { NextRequest, NextResponse } from "next/server";
import { handleApiError, UserFacingError } from "@/lib/errors";
import { getTrendingProvider, isDemoTrendingMode } from "@/lib/trending/provider";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const edit = await getTrendingProvider().getTrendingEdit(id);
    if (!edit) {
      throw new UserFacingError("This trending edit could not be found.", 404);
    }
    return NextResponse.json({ edit, demoMode: isDemoTrendingMode() });
  } catch (error) {
    return handleApiError(error, "trending/[id]");
  }
}
