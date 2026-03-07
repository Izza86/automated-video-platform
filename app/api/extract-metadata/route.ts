import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { extractVideoMetadata, extractVideoMetadataFromBuffer } from "@/server/video-processing";

// Allow up to 5 minutes for large video analysis
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    // Check authentication.
    let session = null as any;
    try {
      session = await auth.api.getSession({ headers: request.headers });
    } catch (e) {
      console.error('auth.api.getSession error', e);
    }

    if (!session || !session.user) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      console.warn('No session found for /api/extract-metadata; continuing in dev mode.');
    }

    const contentType = request.headers.get('content-type') || '';

    let metadata;

    if (contentType.includes('multipart/form-data')) {
      // ── FormData path (preferred — avoids base64 overhead) ──────────────
      const form = await request.formData();
      const videoFile = form.get('video') as File | null;
      if (!videoFile || videoFile.size === 0) {
        return NextResponse.json({ error: 'Missing video file in form data' }, { status: 400 });
      }
      const buffer = Buffer.from(await videoFile.arrayBuffer());
      console.log(`Extracting metadata for user: ${session?.user?.id ?? 'dev-guest'} | ${(buffer.length / 1024 / 1024).toFixed(1)} MB`);
      metadata = await extractVideoMetadataFromBuffer(buffer);
    } else {
      // ── Legacy JSON/base64 path ─────────────────────────────────────────
      // Guard: Next.js truncates JSON bodies at ~10 MB, which corrupts the
      // base64 string and causes "Unterminated string in JSON".  Read as
      // raw text first so we can detect the truncation before parsing.
      let body: any;
      try {
        const raw = await request.text();
        body = JSON.parse(raw);
      } catch (parseErr) {
        console.error('JSON body parse failed (likely >10 MB truncation):', parseErr);
        return NextResponse.json(
          {
            error:
              'JSON body too large or malformed. Please upload the video using ' +
              'FormData (multipart/form-data) instead of base64 JSON.',
          },
          { status: 413 },
        );
      }
      const { videoBase64 } = body;
      if (!videoBase64) {
        return NextResponse.json({ error: "Missing video data" }, { status: 400 });
      }
      console.log("Extracting metadata for user:", session?.user?.id ?? 'dev-guest');
      metadata = await extractVideoMetadata(videoBase64);
    }

    return NextResponse.json({ success: true, metadata }, { status: 200 });
  } catch (error) {
    console.error("API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const payload: any = { error: `API error: ${errorMessage}` };
    if (process.env.NODE_ENV !== "production") {
      payload.stack = error instanceof Error ? error.stack : String(error);
    }
    return NextResponse.json(payload, { status: 500 });
  }
}
