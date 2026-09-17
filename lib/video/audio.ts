/**
 * Beat detection is NOT implemented in this MVP. This stub exists so the
 * architecture has a clear, single place to wire up real beat detection
 * later (e.g. via a spectral-flux/onset-detection library or an audio ML
 * model) without changing any call site.
 *
 * Nothing in the app currently calls this in a way that pretends to
 * succeed - a prompt/chat instruction asking for beat sync is surfaced to
 * the user via `EditPlan.unsupportedRequests` instead (see lib/ai/football.ts).
 */
export interface Beat {
  timeSeconds: number;
  strength: number;
}

export async function detectBeats(_audioFilePath: string): Promise<Beat[]> {
  throw new Error(
    "detectBeats() is not implemented yet. Beat-synchronized cuts require a real audio-analysis pass " +
      "(e.g. onset/tempo detection) that this MVP does not include.",
  );
}
