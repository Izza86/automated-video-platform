/**
 * POST /api/editor/pattern
 *
 * Accepts a video file upload, runs the full analysis pipeline,
 * then generates an Editing Blueprint (structured edit template)
 * that fuses cuts, speed ramps, beat-aligned transitions, and
 * style parameters into a single timeline.
 *
 * Body: multipart/form-data with a "video" file field.
 * Response: JSON `EditingBlueprint`
 */

import { NextRequest, NextResponse } from "next/server";
import { analyzeVideo } from "../../../../server/pipeline/orchestrator";
import { analyzeEditingPattern } from "../../../../server/editor/pattern-analyzer";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("video");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing 'video' file in form data." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = file.name || "video.mp4";

    // Step 1 — Full analysis pipeline (shot + motion + audio + colour)
    const analysis = await analyzeVideo(buffer, filename);

    // Step 2 — Generate editing blueprint from the raw metadata
    const blueprint = analyzeEditingPattern(analysis.raw, filename);

    return NextResponse.json({
      success: true,
      blueprint,
      summary: {
        totalEvents: blueprint.timeline.length,
        totalSegments: blueprint.segments.length,
        beatAlignedTransitions: blueprint.summary.totalBeatTransitions,
        speedRamps: blueprint.summary.totalSpeedRamps,
        cuts: blueprint.summary.totalCuts,
        jhatkas: blueprint.summary.totalJhatkas,
        bpm: blueprint.summary.bpm,
        dominantPace: blueprint.summary.dominantPace,
        dominantMood: blueprint.summary.dominantColorMood,
        processingMs: blueprint.processingMs,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/editor/pattern] Error:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
