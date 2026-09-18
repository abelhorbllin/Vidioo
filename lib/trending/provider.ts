import { DemoTrendingProvider } from "@/lib/trending/demo";
import type { TrendingProvider } from "@/lib/trending/types";

/**
 * Provider factory - mirrors lib/ai/provider.ts and lib/assets/provider.ts.
 *
 * To connect a real trending data source later:
 *   1. Implement TrendingProvider in a new file, e.g. lib/trending/social.ts.
 *   2. Read its API key(s) from environment variables.
 *   3. Add a branch below that returns it when TRENDING_PROVIDER=<name>.
 *
 * Nothing outside this file should import DemoTrendingProvider directly.
 */
let cachedProvider: TrendingProvider | null = null;

export function getTrendingProvider(): TrendingProvider {
  if (cachedProvider) return cachedProvider;

  const requested = (process.env.TRENDING_PROVIDER ?? "demo").toLowerCase();

  if (requested === "demo") {
    cachedProvider = new DemoTrendingProvider();
    return cachedProvider;
  }

  throw new Error(
    `TRENDING_PROVIDER="${requested}" is not implemented yet. Implement lib/trending/${requested}.ts ` +
      `(see lib/trending/demo.ts and lib/trending/types.ts for the shape) and wire it up in ` +
      `lib/trending/provider.ts, or set TRENDING_PROVIDER=demo / leave it unset.`,
  );
}

export function isDemoTrendingMode(): boolean {
  return getTrendingProvider().isDemo;
}
