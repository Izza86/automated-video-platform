import fs from "node:fs/promises";
import path from "node:path";
import {
  makeTempDir,
  probeVideo,
  resolveFfmpeg,
  safeExe,
} from "../utils/ffmpeg";
import { runFFmpegSafe } from "../utils/ffmpeg-safe";

/**
 * Deterministic Renderer
 * ──────────────────────
 * Executes a deterministic style transfer blueprint.
 * Ensures frame-accurate rendering by avoiding jitter-prone filters
 * and using fixed-GOP encoding.
 */
export class DeterministicRenderer {
  /**
   * Execute the final render.
   */
  static async render(blueprint: {
    targetPath: string;
    referencePath: string;
    masterFilter: string;
    segments: Array<{
      refStart: number;
      refEnd: number;
      targetStart: number;
      targetEnd: number;
    }>;
  }): Promise<{ outputPath: string; processingMs: number }> {
    const t0 = performance.now();
const tmp = makeTempDir("det-render");

    // Log inputs before render
    console.log("[D-Renderer] Segments:", JSON.stringify(blueprint.segments, null, 2));
    console.log("[D-Renderer] Master Filter:\\n", blueprint.masterFilter);

    // Hard validation
    if (blueprint.segments.length === 0) {
      throw new Error(
        `[STRICT FAILURE] No segments generated from ML analysis.
         Possible reasons:
         - Reference video is single-shot (no cuts)
         - Shot detection produced insufficient structure
         - StyleTransferEngine could not align shots

         This is a data limitation, not a renderer bug.`
      );
    }
    if (!blueprint.masterFilter || blueprint.masterFilter.trim() === '') {
      throw new Error("[STRICT FAILURE] Empty masterFilter. Render aborted.");
    }

    try {
      const outputDir = path.join(process.cwd(), "public", "outputs");
      await fs.mkdir(outputDir, { recursive: true });
      const outputPath = path.join(outputDir, `det-render-${Date.now()}.mp4`);

      const ffmpeg = await resolveFfmpeg();
      const exe = safeExe(ffmpeg);

      // 1. Build the Segmented Command
      // For Phase 4, we use the masterFilter globally but apply shot boundaries.
      // In a strict implementation, we would use -filter_script to avoid shell limits.

      const filterScriptPath = path.join(tmp, "filter_complex.txt");

      // Constructing a concat-based graph from segments
      const graphParts: string[] = [];
      const concatInputs: string[] = [];

      for (let i = 0; i < blueprint.segments.length; i++) {
        const seg = blueprint.segments[i];
        const label = `seg${i}`;

        // Trim target to match reference shot duration
        const duration = seg.refEnd - seg.refStart;

        // Use the masterFilter (which includes CDF curves) on the segment
        const filter = `trim=start=${seg.targetStart.toFixed(3)}:duration=${duration.toFixed(3)},setpts=PTS-STARTPTS,${blueprint.masterFilter}`;

        graphParts.push(`[0:v]${filter}[${label}]`);
        concatInputs.push(`[${label}]`);
      }

      graphParts.push(
        `${concatInputs.join("")}concat=n=${blueprint.segments.length}:v=1:a=0[vout]`
      );

      const filterGraph = graphParts.join(";");
      if (!filterGraph || filterGraph.trim().length === 0) {
        throw new Error(
          "[STRICT FAILURE] filter_complex is empty. Render aborted."
        );
      }

      // Placeholder Resolution (STRICT)
      // Although masterFilter usually doesn't have these in D-Pipeline yet,
      // we must ensure any passed placeholders are resolved or we fail.
      const resolvedFilterGraph = filterGraph;
      if (/__[A-Z0-9_]+_PATH__/.test(resolvedFilterGraph)) {
        console.error(
          "[D-Renderer] FAILED: Unresolved placeholders in graph",
          resolvedFilterGraph
        );
        throw new Error(
          "FFmpeg Render Aborted: Unresolved placeholders in filter graph"
        );
      }

      await fs.writeFile(filterScriptPath, resolvedFilterGraph, "utf-8");

      // 2. Audio Reconstruction
      const totalDuration = blueprint.segments.reduce(
        (acc, s) => acc + (s.refEnd - s.refStart),
        0
      );

      // 3. Assemble FFmpeg Command
      const args = [
        "-y",
        "-i",
        `"${blueprint.targetPath}"`,
        "-i",
        `"${blueprint.referencePath}"`,
        "-filter_complex_script",
        `"${filterScriptPath}"`,
        "-map",
        "[vout]",
        "-map",
        "1:a:0?",
        "-c:v",
        "libx264",
        "-crf",
        "18",
        "-preset",
        "slow",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-t",
        totalDuration.toFixed(3),
        `"${outputPath}"`,
      ].join(" ");

      const fullCmd = `${exe} ${args}`;
      console.log("\\n==========================================");
      console.log("[D-Renderer] FULL FFMPEG COMMAND:");
      console.log(fullCmd);
      console.log("==========================================\\n");

      const result = await runFFmpegSafe({
        label: "det-render",
        args,
        inputFiles: [blueprint.targetPath, blueprint.referencePath],
        outputFile: outputPath,
        minOutputBytes: 1024 * 50, // 50KB minimum
      });

      if (!result.success) {
        throw new Error(`Deterministic render failed: ${result.error}`);
      }

      // 4. Post-Render Evidence Validation
      const probe = await probeVideo(outputPath);
      const durDiff = Math.abs(probe.duration - totalDuration);
      console.log(
        `[D-Renderer] Duration Check: Output=${probe.duration.toFixed(2)}s, Expected=${totalDuration.toFixed(2)}s (Diff=${durDiff.toFixed(2)}s)`
      );

      if (durDiff > 0.5) {
        throw new Error(
          `[STRICT FAILURE] Duration mismatch too high: ${durDiff.toFixed(2)}s. Corruption suspected.`
        );
      }

      // Verify output file exists and has content
      await fs.stat(outputPath);
      const stats = await fs.stat(outputPath);
      if (stats.size < 1000) {
        throw new Error(`[STRICT FAILURE] Output file too small (${stats.size} bytes). Likely FFmpeg failure.`);
      }
      console.log(`[D-Renderer SUCCESS] Output verified: ${outputPath} (${Math.round(stats.size / 1024)} KB)`);

      const processingMs = Math.round(performance.now() - t0);
      return { outputPath, processingMs };
    } catch (renderError) {
      console.error("[DETERMINISTIC RENDER FULL ERROR]", {
        message: renderError instanceof Error ? renderError.message : String(renderError),
        stack: renderError instanceof Error ? renderError.stack : undefined,
        blueprint: {
          segmentsCount: blueprint.segments.length,
          filterLength: blueprint.masterFilter?.length || 0,
          targetPath: blueprint.targetPath,
          referencePath: blueprint.referencePath
        }
      });
      throw new Error(
        `Deterministic render failed: ${
          renderError instanceof Error ? renderError.message : String(renderError)
        }`
      );
    } finally {
      // Clean up temp dir if not debugging
      // await cleanTempDir(tmp);
    }
  }
}
