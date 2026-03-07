import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import fs from "fs";
import path from "path";
import {
  processVideoFromBuffers,
  type VideoMetadata,
} from "@/server/video-processing";

// Modern Next.js route-segment config — replaces `export const config`
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  // Track the temp directory so we can always clean it up
  let tempDirToClean: string | null = null;

  try {
    // ── Auth ───────────────────────────────────────────────────────────────
    // Persist userId in a local variable NOW, before the long FFmpeg run.
    // After processing completes the Neon DB connection may have timed out
    // (EAI_AGAIN / ENOTFOUND), so we must not query the DB again later.
    let userId: string = 'dev-guest';

    try {
      const session = await auth.api.getSession({ headers: request.headers });
      if (session?.user?.id) {
        userId = session.user.id;
      } else if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      } else {
        console.warn('[process-video] No session user — continuing with dev-guest.');
      }
    } catch (authError: any) {
      // DB might be unreachable (EAI_AGAIN / ENOTFOUND) — gracefully degrade
      const msg = authError?.message ?? String(authError);
      console.error('[process-video] auth.api.getSession failed:', msg);

      if (process.env.NODE_ENV === 'development') {
        console.warn('[process-video] DEV MODE — using mock user so the FYP demo is not blocked.');
        userId = 'dev-mock-user';
      } else {
        return NextResponse.json({ error: 'Unauthorized — database unreachable' }, { status: 401 });
      }
    }

    // ── Video quota enforcement ──────────────────────────────────────────
    if (userId !== 'dev-guest' && userId !== 'dev-mock-user') {
      try {
        const { canCreateVideo, incrementVideoUsage } = await import("@/server/subscriptions");
        const quotaCheck = await canCreateVideo(userId);
        if (!quotaCheck.allowed) {
          return NextResponse.json(
            { error: quotaCheck.reason || "Video limit reached. Please upgrade your plan." },
            { status: 429 }
          );
        }
      } catch (quotaErr) {
        console.warn('[process-video] Quota check failed, allowing:', quotaErr);
      }
    }

    // ── Parse FormData (binary files — no base64 / JSON overhead) ─────────
    let form: FormData;
    try {
      form = await request.formData();
    } catch (e) {
      return NextResponse.json(
        { error: 'Failed to parse form data. Send multipart/form-data with "target" and "reference" file fields.' },
        { status: 400 }
      );
    }

    const targetFile    = form.get('target')    as File | null;
    const referenceFile = form.get('reference') as File | null;
    const metaField     = form.get('metadata');

    let metadata: VideoMetadata = {} as VideoMetadata;
    if (metaField) {
      try { metadata = JSON.parse(String(metaField)); } catch { /* keep empty */ }
    }

    if (!targetFile || targetFile.size === 0) {
      return NextResponse.json(
        { error: 'Missing target video — expected a FormData field named "target"' },
        { status: 400 }
      );
    }

    const targetBuffer    = Buffer.from(await targetFile.arrayBuffer());
    const referenceBuffer = referenceFile ? Buffer.from(await referenceFile.arrayBuffer()) : null;

    console.log(
      `[process-video] user=${userId}`,
      `| target ${(targetBuffer.length / 1024 / 1024).toFixed(1)} MB`,
      referenceBuffer ? `| reference ${(referenceBuffer.length / 1024 / 1024).toFixed(1)} MB` : '| no reference'
    );

    // ── Run style-transfer pipeline (Buffer → file → FFmpeg → file) ──────
    // NOTE: userId is already captured — no further DB calls from here on.
    const result = await processVideoFromBuffers(
      referenceBuffer,
      targetBuffer,
      metadata,
      { keepOutput: true }
    );

    if (!result.success) {
      console.error('[process-video] processVideoFromBuffers failed:', result.error);
      return NextResponse.json({ error: result.error || 'Processing failed' }, { status: 500 });
    }

    // ── Stream the output file directly back to the client ───────────────
    const outputPath = (result as any).outputPath as string | undefined;
    if (!outputPath) {
      return NextResponse.json({ error: 'No output file produced' }, { status: 500 });
    }

    // Remember the temp directory for cleanup in the finally block
    tempDirToClean = path.dirname(outputPath);

    // ── Increment usage counter after successful processing ─────────────
    if (userId !== 'dev-guest' && userId !== 'dev-mock-user') {
      try {
        const { incrementVideoUsage } = await import("@/server/subscriptions");
        await incrementVideoUsage(userId);
      } catch (usageErr) {
        console.warn('[process-video] Usage increment failed:', usageErr);
      }
    }

    const outputBuffer = await fs.promises.readFile(outputPath);

    return new NextResponse(outputBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': String(outputBuffer.length),
        'Content-Disposition': `attachment; filename="edited-${Date.now()}.mp4"`,
      },
    });
  } catch (error) {
    console.error('[process-video] API error', error);
    const msg = error instanceof Error ? error.message : String(error);
    const payload: any = { error: `API error: ${msg}` };
    if (process.env.NODE_ENV !== 'production') payload.stack = error instanceof Error ? error.stack : String(error);
    return NextResponse.json(payload, { status: 500 });
  } finally {
    // Always clean up temp files — even if the DB or response failed
    if (tempDirToClean) {
      try {
        if (fs.existsSync(tempDirToClean)) {
          fs.rmSync(tempDirToClean, { recursive: true, force: true });
        }
      } catch (cleanupErr) {
        console.error('[process-video] temp cleanup failed:', cleanupErr);
      }
    }
  }
}
