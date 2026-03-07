/**
 * POST /api/analyze-and-transfer
 *
 * Unified one-call pipeline endpoint:
 *
 *   1. Analyse the reference video (shot detection, motion, audio, colour)
 *   2. Generate a structured editing blueprint (cuts, speed ramps,
 *      beat-aligned transitions, style keyframes)
 *   3. Apply the blueprint onto the target video timeline →
 *      produce edit instructions JSON
 *   4. Render the target video with the reference style via FFmpeg
 *
 * Body: multipart/form-data
 *   Required fields:
 *     - "reference"  — reference (style-source) video file
 *     - "target"     — target video file to restyle
 *   Optional fields:
 *     - "strategy"       — "proportional" (default) | "loop" | "truncate"
 *     - "preserveBeats"  — "true" (default) | "false"
 *     - "includeStyle"   — "true" (default) | "false"
 *     - "outputMode"     — "json" (default) | "video" | "both"
 *
 * Response varies by outputMode:
 *   - "json"  → full JSON with dashboard cards, blueprint summary,
 *               edit instructions, transfer metadata
 *   - "video" → raw MP4 binary download
 *   - "both"  → JSON with embedded base64 video
 */

import * as fs from "node:fs";
import { NextRequest, NextResponse } from "next/server";
import { analyzeAndTransferFull } from "../../../server/pipeline/orchestrator";
import type {
  BlueprintTransferOptions,
  AdaptationStrategy,
} from "../../../server/types";

export const dynamic = "force-dynamic";
export const maxDuration = 600; // 10 min timeout for heavy pipelines

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

const VALID_STRATEGIES = new Set<AdaptationStrategy>([
  "proportional",
  "loop",
  "truncate",
]);

type OutputMode = "json" | "video" | "both";
const VALID_OUTPUT_MODES = new Set<OutputMode>(["json", "video", "both"]);

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const t0 = performance.now();

  try {
    // ── Parse form data ──────────────────────────────────────────────
    const form = await req.formData();

    const referenceFile = form.get("reference");
    const targetFile = form.get("target");

    if (!referenceFile || !(referenceFile instanceof File) || referenceFile.size === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing or empty "reference" video file.' },
        { status: 400 },
      );
    }
    if (!targetFile || !(targetFile instanceof File) || targetFile.size === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing or empty "target" video file.' },
        { status: 400 },
      );
    }

    const referenceBuffer = Buffer.from(await referenceFile.arrayBuffer());
    const targetBuffer = Buffer.from(await targetFile.arrayBuffer());

    // ── Parse options ────────────────────────────────────────────────
    const transferOpts: BlueprintTransferOptions = {};

    const strategyRaw = form.get("strategy");
    if (
      typeof strategyRaw === "string" &&
      VALID_STRATEGIES.has(strategyRaw as AdaptationStrategy)
    ) {
      transferOpts.strategy = strategyRaw as AdaptationStrategy;
    }

    const preserveBeatsRaw = form.get("preserveBeats");
    if (typeof preserveBeatsRaw === "string") {
      transferOpts.preserveBeats = preserveBeatsRaw !== "false";
    }

    const includeStyleRaw = form.get("includeStyle");
    if (typeof includeStyleRaw === "string") {
      transferOpts.includeStyle = includeStyleRaw !== "false";
    }

    const outputModeRaw = form.get("outputMode");
    const outputMode: OutputMode =
      typeof outputModeRaw === "string" &&
      VALID_OUTPUT_MODES.has(outputModeRaw as OutputMode)
        ? (outputModeRaw as OutputMode)
        : "json";

    // Render options: keep file on disk for "video" / "both" modes
    const keepOutput = outputMode === "video" || outputMode === "both";

    console.log(
      `[analyze-and-transfer] ref=${fmtMB(referenceBuffer.length)} ` +
        `tgt=${fmtMB(targetBuffer.length)} ` +
        `strategy=${transferOpts.strategy ?? "proportional"} ` +
        `output=${outputMode}`,
    );

    // ── Run the full pipeline ────────────────────────────────────────
    const { analysis, blueprint, instructions, transfer } =
      await analyzeAndTransferFull(
        referenceBuffer,
        targetBuffer,
        transferOpts,
        { keepOutput },
      );

    const totalMs = Math.round(performance.now() - t0);

    // ── Output: raw video binary ─────────────────────────────────────
    if (outputMode === "video") {
      if (!transfer.success || !transfer.outputPath) {
        return NextResponse.json(
          {
            success: false,
            error: transfer.error || "Render failed — no output file produced.",
          },
          { status: 500 },
        );
      }

      const outputBuffer = await fs.promises.readFile(transfer.outputPath);
      try { fs.unlinkSync(transfer.outputPath); } catch { /* ignore */ }

      return new NextResponse(outputBuffer, {
        status: 200,
        headers: {
          "Content-Type": "video/mp4",
          "Content-Length": String(outputBuffer.length),
          "Content-Disposition": `attachment; filename="transfer-${Date.now()}.mp4"`,
          "X-Processing-Ms": String(totalMs),
          "X-Blueprint-Id": blueprint.blueprintId,
          "X-Instruction-Id": instructions.instructionId,
        },
      });
    }

    // ── Output: JSON (optionally with embedded base64 video) ─────────
    let videoBase64: string | undefined;
    let videoUrl: string | undefined;
    let videoSizeBytes: number | undefined;

    // Prefer serving via URL (file stays in public/outputs/) — much faster
    // than embedding base64 in JSON.
    if (transfer.success && transfer.videoUrl) {
      videoUrl = transfer.videoUrl;
    }

    if (outputMode === "both" && transfer.success && transfer.outputPath) {
      try {
        const stat = await fs.promises.stat(transfer.outputPath);
        videoSizeBytes = stat.size;
      } catch { /* ignore */ }
      // Do NOT delete the file — browser needs to fetch it via videoUrl
    } else if (transfer.videoBase64) {
      videoBase64 = transfer.videoBase64;
      videoSizeBytes = Math.round((transfer.videoBase64.length * 3) / 4);
    }

    // Analysis + blueprint data was collected — always report success.
    // The output.rendered field tells the frontend whether the video
    // actually rendered.  This avoids killing the whole pipeline when
    // only the FFmpeg render step fails.
    const overallSuccess = true;

    return NextResponse.json({
      success: overallSuccess,

      // ── Dashboard cards (ready for frontend rendering) ─────────────
      dashboard: {
        videoId: analysis.videoId,
        filename: analysis.filename,
        processedAt: analysis.processedAt,
        cards: analysis.cards,
      },

      // ── Blueprint summary ──────────────────────────────────────────
      blueprint: {
        blueprintId: blueprint.blueprintId,
        sourceFilename: blueprint.sourceFilename,
        generatedAt: blueprint.generatedAt,
        totalTimelineEvents: blueprint.timeline.length,
        totalSegments: blueprint.segments.length,
        summary: blueprint.summary,
        // Include the full timeline for clients that need it
        timeline: blueprint.timeline,
        segments: blueprint.segments,
      },

      // ── Edit instructions (structured JSON) ────────────────────────
      instructions,

      // ── Rendered output video info ─────────────────────────────────
      output: {
        rendered: transfer.success,
        filterGraphSummary: transfer.filterGraphSummary,
        renderMs: transfer.processingMs,
        ...(videoUrl && { videoUrl }),
        ...(videoBase64 && { videoBase64 }),
        ...(videoSizeBytes && { videoSizeBytes }),
        ...(transfer.error && { error: transfer.error }),
      },

      // ── Pipeline timing ────────────────────────────────────────────
      timing: {
        totalMs,
        analysisMs: sumProcessingMs(analysis.raw),
        blueprintMs: blueprint.processingMs,
        instructionsMs: instructions.summary.processingMs,
        renderMs: transfer.processingMs,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[analyze-and-transfer] Pipeline error:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmtMB(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

/**
 * Sum up individual module processing times from raw metadata
 * to show a breakdown of where time was spent.
 */
function sumProcessingMs(
  raw: import("../../../server/types").FullVideoMetadata,
): number {
  return (
    raw.shotDetection.processingMs +
    raw.motion.processingMs +
    raw.audio.processingMs +
    raw.colorGrading.processingMs
  );
}
