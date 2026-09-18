import { DemoAssetProvider } from "@/lib/assets/demo";
import type { AssetProvider } from "@/lib/assets/types";

/**
 * Provider factory. This is the ONLY place that decides which AssetProvider
 * implementation backs the app - mirrors lib/ai/provider.ts.
 *
 * To connect a real footage source later (a licensed stock/highlights
 * provider, or a real video-generation API):
 *   1. Implement AssetProvider in a new file, e.g. lib/assets/licensed.ts.
 *   2. Read its API key from an environment variable.
 *   3. Add a branch below that returns it when ASSET_PROVIDER=<name>.
 *
 * Nothing outside this file should import DemoAssetProvider directly -
 * always go through getAssetProvider().
 */
let cachedProvider: AssetProvider | null = null;

export function getAssetProvider(): AssetProvider {
  if (cachedProvider) return cachedProvider;

  const requested = (process.env.ASSET_PROVIDER ?? "demo").toLowerCase();

  if (requested === "demo") {
    cachedProvider = new DemoAssetProvider();
    return cachedProvider;
  }

  throw new Error(
    `ASSET_PROVIDER="${requested}" is not implemented yet. Implement lib/assets/${requested}.ts ` +
      `(see lib/assets/demo.ts and lib/assets/types.ts for the shape) and wire it up in ` +
      `lib/assets/provider.ts, or set ASSET_PROVIDER=demo / leave it unset.`,
  );
}

export function isDemoAssetMode(): boolean {
  return getAssetProvider().isDemo;
}
