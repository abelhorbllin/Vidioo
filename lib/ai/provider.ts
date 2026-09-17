import { MockAIProvider } from "@/lib/ai/mock";
import type { AIProvider } from "@/lib/ai/types";

/**
 * Provider factory. This is the ONLY place that decides which AIProvider
 * implementation backs the app.
 *
 * To connect a real vendor later:
 *   1. Implement AIProvider in a new file, e.g. lib/ai/openai.ts
 *      (class OpenAIProvider implements AIProvider { ... }).
 *   2. Read its API key from an environment variable (never hardcode it,
 *      never send it to the client).
 *   3. Add a branch below that returns `new OpenAIProvider()` when
 *      AI_PROVIDER=openai.
 *
 * Nothing outside this file should import MockAIProvider (or any future
 * concrete provider) directly - always go through getAIProvider().
 */
let cachedProvider: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (cachedProvider) return cachedProvider;

  const requested = (process.env.AI_PROVIDER ?? "mock").toLowerCase();
  const mockForced = process.env.MOCK_AI === "true";

  if (requested === "mock" || mockForced) {
    cachedProvider = new MockAIProvider();
    return cachedProvider;
  }

  // Placeholder for future real providers. We intentionally refuse to
  // silently fall back to a fake "real" provider - if AI_PROVIDER names a
  // vendor that isn't wired up yet, fail loudly rather than pretend.
  switch (requested) {
    case "openai":
    case "claude":
    case "gemini":
      throw new Error(
        `AI_PROVIDER="${requested}" is not implemented yet. Implement lib/ai/${requested}.ts ` +
          `(see lib/ai/mock.ts for the shape) and wire it up in lib/ai/provider.ts, or set ` +
          `AI_PROVIDER=mock / MOCK_AI=true to use the demo AI.`,
      );
    default:
      throw new Error(
        `Unknown AI_PROVIDER="${requested}". Supported values today: "mock". ` +
          `Set AI_PROVIDER=mock or leave it unset.`,
      );
  }
}

export function isDemoAIMode(): boolean {
  return getAIProvider().isMock;
}
