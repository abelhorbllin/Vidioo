import type { TrackingPoint } from "./types";

export type TrackingData = TrackingPoint[];

export interface TrackingBox {
  /** Center of the box, 0-1 fraction of frame width. */
  x: number;
  /** Center of the box, 0-1 fraction of frame height. */
  y: number;
  /** 0-1 fraction of frame width. */
  width: number;
  /** 0-1 fraction of frame height. */
  height: number;
}

/** Used when there is no tracking data at all, so tracking-aware effects never crash without mock data. */
const DEFAULT_BOX: TrackingBox = { x: 0.5, y: 0.5, width: 0.3, height: 0.5 };

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function toBox(point: TrackingPoint): TrackingBox {
  return { x: point.x, y: point.y, width: point.width, height: point.height };
}

/**
 * Looks up the tracked box at an arbitrary frame, linearly interpolating
 * between the two nearest samples (or holding the first/last sample outside
 * the tracked range). This is a MOCK tracking lookup - a placeholder for the
 * real player-detection/tracking system planned for a later step. `tracking`
 * is expected sorted ascending by `frame` (true for all mock data in this
 * codebase).
 */
export function getTrackingBoxAtFrame(tracking: TrackingData, frame: number): TrackingBox {
  if (!tracking || tracking.length === 0) return DEFAULT_BOX;
  if (tracking.length === 1) return toBox(tracking[0]);

  const first = tracking[0];
  const last = tracking[tracking.length - 1];
  if (frame <= first.frame) return toBox(first);
  if (frame >= last.frame) return toBox(last);

  for (let i = 0; i < tracking.length - 1; i++) {
    const a = tracking[i];
    const b = tracking[i + 1];
    if (frame >= a.frame && frame <= b.frame) {
      const span = b.frame - a.frame || 1;
      const t = (frame - a.frame) / span;
      return {
        x: lerp(a.x, b.x, t),
        y: lerp(a.y, b.y, t),
        width: lerp(a.width, b.width, t),
        height: lerp(a.height, b.height, t),
      };
    }
  }

  return toBox(last);
}
