import fs from "fs";
import { Readable } from "stream";
import { NextRequest, NextResponse } from "next/server";
import { getFile } from "@/lib/storage/fileStore";

export const runtime = "nodejs";

/**
 * Serves a temporary file by its opaque id. The real filesystem path is
 * never exposed to the client - only this id is.
 *
 * Supports HTTP Range requests so <video> elements can seek/scrub, and an
 * optional ?download=1 to force a "Save As" download for exports.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const file = getFile(id);

  if (!file) {
    return NextResponse.json({ error: "File not found or has expired." }, { status: 404 });
  }

  let stat: fs.Stats;
  try {
    stat = await fs.promises.stat(file.absolutePath);
  } catch {
    return NextResponse.json({ error: "File not found or has expired." }, { status: 404 });
  }

  const forceDownload = request.nextUrl.searchParams.get("download") === "1";
  const headers = new Headers();
  headers.set("Content-Type", file.mimeType);
  headers.set("Accept-Ranges", "bytes");
  if (forceDownload) {
    headers.set("Content-Disposition", `attachment; filename="${file.id}.mp4"`);
  }

  const range = request.headers.get("range");

  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    const start = match && match[1] ? parseInt(match[1], 10) : 0;
    const end = match && match[2] ? parseInt(match[2], 10) : stat.size - 1;
    const chunkSize = end - start + 1;

    headers.set("Content-Range", `bytes ${start}-${end}/${stat.size}`);
    headers.set("Content-Length", String(chunkSize));

    const nodeStream = fs.createReadStream(file.absolutePath, { start, end });
    const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream;

    return new NextResponse(webStream, { status: 206, headers });
  }

  headers.set("Content-Length", String(stat.size));
  const nodeStream = fs.createReadStream(file.absolutePath);
  const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream;

  return new NextResponse(webStream, { status: 200, headers });
}
