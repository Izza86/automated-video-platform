import { createReadStream, existsSync, statSync } from "fs";
import { type NextRequest, NextResponse } from "next/server";
import { join } from "path";

/**
 * Serve video files from public/outputs/ with proper headers.
 *
 * Next.js production mode (`next start`) only serves files from
 * public/ that existed at *build* time.  Processed videos are
 * generated AFTER the build, so they get a 404 from the default
 * static-file handler.  This API route bridges the gap by reading
 * the file from disk and streaming it with correct Content-Type
 * and Range-request support (required for <video> seek / play).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  // Sanitise: only allow alphanumeric, dash, underscore, dot
  if (!/^[\w\-.]+\.mp4$/i.test(filename)) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const filePath = join(process.cwd(), "public", "outputs", filename);

  if (!existsSync(filePath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const stat = statSync(filePath);
  const fileSize = stat.size;
  const rangeHeader = request.headers.get("range");

  // ── Range request (required for video seeking) ──────────────────
  if (rangeHeader) {
    const parts = rangeHeader.replace(/bytes=/, "").split("-");
    const start = Number.parseInt(parts[0], 10);
    const end = parts[1] ? Number.parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    // Read the requested range
    const chunks: Buffer[] = [];
    const stream = createReadStream(filePath, { start, end });

    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    const body = Buffer.concat(chunks);

    return new NextResponse(body, {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(chunkSize),
        "Content-Type": "video/mp4",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  // ── Full request ────────────────────────────────────────────────
  const chunks: Buffer[] = [];
  const stream = createReadStream(filePath);

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const body = Buffer.concat(chunks);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Accept-Ranges": "bytes",
      "Content-Length": String(fileSize),
      "Content-Type": "video/mp4",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
