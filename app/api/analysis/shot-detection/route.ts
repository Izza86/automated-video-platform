/**
 * POST /api/analysis/shot-detection
 *
 * Accepts a video file via multipart form-data ("video" field)
 * and returns histogram + edge-fusion shot-boundary analysis as JSON.
 */

import { NextRequest, NextResponse } from "next/server";
import { detectShots } from "../../../../server/analysis/shot-detection";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("video") as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json(
        { error: 'Missing video — send a multipart field named "video"' },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    console.log(`[shot-detection] Analysing ${(buffer.length / 1024 / 1024).toFixed(1)} MB`);

    const result = await detectShots(buffer);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("[shot-detection] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
