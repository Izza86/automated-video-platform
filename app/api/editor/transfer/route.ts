/**
 * POST /api/editor/transfer
 *
 * Accepts two video files via multipart form-data:
 *   • "reference" — the style source video
 *   • "target"    — the video to restyle
 *
 * Runs the full pipeline: analyse reference → transfer to target.
 * Returns the rendered output as a downloadable MP4 binary.
 * Include ?json=1 query param to receive JSON metadata instead.
 */

import * as fs from "node:fs";
import { type NextRequest, NextResponse } from "next/server";
import { analyzeAndTransfer } from "../../../../server/pipeline/orchestrator";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const refFile = form.get("reference") as File | null;
    const tgtFile = form.get("target") as File | null;

    if (!refFile || refFile.size === 0) {
      return NextResponse.json(
        { error: 'Missing reference video — send a field named "reference"' },
        { status: 400 }
      );
    }
    if (!tgtFile || tgtFile.size === 0) {
      return NextResponse.json(
        { error: 'Missing target video — send a field named "target"' },
        { status: 400 }
      );
    }

    const refBuffer = Buffer.from(await refFile.arrayBuffer());
    const tgtBuffer = Buffer.from(await tgtFile.arrayBuffer());

    console.log(
      `[editor/transfer] ref=${(refBuffer.length / 1024 / 1024).toFixed(1)}MB` +
        ` tgt=${(tgtBuffer.length / 1024 / 1024).toFixed(1)}MB`
    );

    const { analysis, transfer } = await analyzeAndTransfer(
      refBuffer,
      tgtBuffer,
      { keepOutput: true }
    );

    // Return JSON metadata only?
    const wantJson = request.nextUrl.searchParams.get("json") === "1";
    if (wantJson || !transfer.success) {
      return NextResponse.json(
        {
          success: transfer.success,
          analysis,
          transfer: {
            filterGraph: transfer.filterGraphSummary,
            processingMs: transfer.processingMs,
            error: transfer.error,
          },
        },
        { status: transfer.success ? 200 : 500 }
      );
    }

    // Stream binary MP4 back
    const outputPath = transfer.outputPath!;
    const outputBuffer = await fs.promises.readFile(outputPath);

    // Clean up
    try {
      fs.unlinkSync(outputPath);
    } catch {
      /* ignore */
    }

    return new NextResponse(outputBuffer, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(outputBuffer.length),
        "Content-Disposition": `attachment; filename="transferred-${Date.now()}.mp4"`,
      },
    });
  } catch (err) {
    console.error("[editor/transfer] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
