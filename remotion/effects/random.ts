/**
 * Deterministic pseudo-random number in [0, 1) from a numeric seed. Renders
 * must be deterministic (Remotion re-renders each frame independently, and
 * may render the same frame more than once), so effects that want a
 * "random-looking" flicker/jitter use this instead of Math.random().
 */
export function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}
