/**
 * POST /api/pipeline/full
 *
 * Full analysis pipeline endpoint — accepts a single video and returns
 * the complete FullVideoMetadata + dashboard card JSON.
 *
 * Optionally accepts query params to run only specific modules:
 *   ?shots=1&motion=1&audio=1&color=1
 * Omit all params (or pass none) to run everything.
 */

import { type NextRequest, NextResponse } from "next/server";
import {
  analyzePartial,
  analyzeVideo,
} from "../../../../server/pipeline/orchestrator";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("video") as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json(
        { error: 'Missing video — send a multipart field named "video"' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = file.name || "video.mp4";

    console.log(
      `[pipeline/full] Analysing "${filename}" (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`
    );

    // Check for partial-run query params
    const params = request.nextUrl.searchParams;
    const hasPartial =
      params.has("shots") ||
      params.has("motion") ||
      params.has("audio") ||
      params.has("color");

    let result;
    if (hasPartial) {
      result = await analyzePartial(
        buffer,
        {
          shotDetection: params.get("shots") === "1",
          motion: params.get("motion") === "1",
          audio: params.get("audio") === "1",
          colorGrading: params.get("color") === "1",
        },
        filename
      );
    } else {
      result = await analyzeVideo(buffer, filename);
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("[pipeline/full] error:", err);
    // Extract pipeline summary from error if the orchestrator attached one
    const pipelineSummary = (err as any)?.pipelineSummary ?? undefined;
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : String(err),
        pipelineSummary,
      },
      { status: 500 }
    );
  }
}
