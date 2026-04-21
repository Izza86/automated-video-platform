/**
 * POST /api/style/extract
 *
 * Accepts a video file via multipart form-data ("video" field)
 * and returns full colour-grading DNA extraction as JSON.
 */

import { type NextRequest, NextResponse } from "next/server";
import { extractColorGrading } from "../../../../server/style/color-grading";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

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
    console.log(
      `[style/extract] Analysing ${(buffer.length / 1024 / 1024).toFixed(1)} MB`
    );

    const result = await extractColorGrading(buffer);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("[style/extract] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
