/**
 * POST /api/editor/blueprint-transfer
 *
 * Accepts a reference video and a target video, analyses the reference,
 * generates an editing blueprint, and transfers it onto the target
 * timeline — returning structured edit instructions JSON.
 *
 * Body: multipart/form-data with fields:
 *   - "reference" — reference video file
 *   - "target"    — target video file
 *   - "strategy"  — (optional) "proportional" | "loop" | "truncate"
 *   - "preserveBeats" — (optional) "true" | "false"
 *   - "includeStyle"  — (optional) "true" | "false"
 *
 * Response: JSON with analysis, blueprint, and edit instructions.
 */

import { NextRequest, NextResponse } from "next/server";
import { analyzeAndGenerateInstructions } from "../../../../server/pipeline/orchestrator";
import type { BlueprintTransferOptions, AdaptationStrategy } from "../../../../server/types";

const VALID_STRATEGIES = new Set<AdaptationStrategy>([
  "proportional",
  "loop",
  "truncate",
]);

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();

    const referenceFile = form.get("reference");
    const targetFile = form.get("target");

    if (!referenceFile || !(referenceFile instanceof File)) {
      return NextResponse.json(
        { error: "Missing 'reference' file in form data." },
        { status: 400 },
      );
    }
    if (!targetFile || !(targetFile instanceof File)) {
      return NextResponse.json(
        { error: "Missing 'target' file in form data." },
        { status: 400 },
      );
    }

    const referenceBuffer = Buffer.from(await referenceFile.arrayBuffer());
    const targetBuffer = Buffer.from(await targetFile.arrayBuffer());

    // Parse optional transfer options from form fields
    const opts: BlueprintTransferOptions = {};

    const strategyField = form.get("strategy");
    if (typeof strategyField === "string" && VALID_STRATEGIES.has(strategyField as AdaptationStrategy)) {
      opts.strategy = strategyField as AdaptationStrategy;
    }

    const preserveBeatsField = form.get("preserveBeats");
    if (typeof preserveBeatsField === "string") {
      opts.preserveBeats = preserveBeatsField !== "false";
    }

    const includeStyleField = form.get("includeStyle");
    if (typeof includeStyleField === "string") {
      opts.includeStyle = includeStyleField !== "false";
    }

    // Run the full pipeline: analysis → blueprint → transfer
    const { analysis, blueprint, instructions } =
      await analyzeAndGenerateInstructions(
        referenceBuffer,
        targetBuffer,
        opts,
      );

    // ── Payload-size guard ──────────────────────────────────────────
    // Strip any fields that could push the JSON past the ~1 MB
    // response threshold and cause "Unterminated string in JSON".
    // The filter_complex_script lives on disk — never inside JSON.
    const safeInstructions = {
      ...instructions,
      // Remove templateOverlays if excessively large
      templateOverlays: instructions.templateOverlays?.slice(0, 120),
      // Compact style blocks: drop per-block overlays (already in top-level)
      styleBlocks: instructions.styleBlocks.map((sb) => ({
        ...sb,
        templateOverlays: undefined,
      })),
    };

    return NextResponse.json({
      success: true,
      analysis: {
        videoId: analysis.videoId,
        filename: analysis.filename,
        processedAt: analysis.processedAt,
      },
      blueprint: {
        blueprintId: blueprint.blueprintId,
        sourceFilename: blueprint.sourceFilename,
        totalEvents: blueprint.timeline.length,
        totalSegments: blueprint.segments.length,
        summary: blueprint.summary,
      },
      instructions: safeInstructions,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/editor/blueprint-transfer] Error:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
