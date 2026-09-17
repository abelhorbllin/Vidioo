import { NextResponse } from "next/server";

/** Error carrying a message that is safe to show directly to the end user. */
export class UserFacingError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const GENERIC_MESSAGE = "Something went wrong while processing your video. Please try again.";

/**
 * Central API error handler: logs the real error server-side, and returns a
 * clean, understandable message to the client. Never leaks stack traces,
 * file paths, or raw ffmpeg output to the browser.
 */
export function handleApiError(error: unknown, context: string): NextResponse {
  console.error(`[${context}]`, error);

  if (error instanceof UserFacingError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  return NextResponse.json({ error: GENERIC_MESSAGE }, { status: 500 });
}
