/**
 * Edit Transfer Engine  ─  v11 (Cinematic Soul — Dynamic Expressions)
 *
 * Applies a reference video's `FullVideoMetadata` editorial style to a
 * target video via a single FFmpeg filter graph.
 *
 * v11 — CINEMATIC SOUL TRANSFER
 * ──────────────────────────────
 * KEY CHANGES FROM v10:
 * • DYNAMIC LUMINANCE FLICKER: Expression-based brightness modulation
 *   driven by reference luma variance → sin(2π·t·flickerFreq)
 * • BEAT-TRIGGERED JITTER: rotate+scale shake on beat peaks
 * • ADAPTIVE BLUR: boxblur radius mapped from ML blur_detection (1-5)
 * • DYNAMIC CDF CURVES: 32-point per-channel interpolation
 * • SHOT DETECTION: TransNetV2 threshold lowered to 0.2
 * • LUT PRIORITY: HALD CLUT always applied for cinematic depth
 *
 * Master Logic Rules (permanent)
 * ──────────────────────────────
 * 1. **Quality First** — CRF 18, preset slow.  Bitrate flags
 *    (-b:v 5M / -minrate 3M / -maxrate 8M / -bufsize 16M)
 *    are placed LAST before the output path.
 *
 * 2. **Dynamic Color** — CDF-interpolated curves + expression-based
 *    temporal eq for luminance flicker.  No static offsets.
 *
 * 3. **Scale First** — `scale=W:H:…,crop=W:H` is the FIRST filter.
 *
 * 4. **Linear Label Path** — filter_complex uses unique labels only:
 *    `[v1]` → `[v2]` → `[vout]`.  No label reuse.
 *
 * 5. **Full HD Default** — Scale 1080×1920, pro sharpness, alimiter.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { generateFilterGraph } from "./server/editor/filter-graph-generator";
import { adaptToTargetContent } from "./server/style/style-dna-adapter";
import { extractStyleDNA } from "./server/style/style-dna-extractor";
import type {
  BeatEvent,
  ColorGradingResult,
  EditTransferResult,
  FullVideoMetadata,
  ShotBoundary,
  ShotDetectionResult,
  VelocitySegment,
  VelocityTimelinePoint,
} from "./server/types";
import type { TargetContentContext } from "./server/types/style-dna";
import {
  cleanTempDir,
  execAsync,
  makeTempDir,
  probeVideo,
  resolveFfmpeg,
  safeExe,
  writeTempFile,
} from "./server/utils/ffmpeg";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Hard clamp for the setpts speed factor (0.25× – 4×) */
const MIN_SPEED = 0.25;
const MAX_SPEED = 4.0;

/** Safety cap for loop iterations — FFmpeg's expression parser chokes on
 *  nested if(between(...)) deeper than ~60.  Keep well under that limit. */
const MAX_LOOP_ITERATIONS = 50;

// ─────────────────────────────────────────────────────────────────────────────
// Colab GPU Remote Render
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Offload the FFmpeg render to the Colab GPU server (PRIMARY path).
 *
 * Sends the filter_complex graph, video files, and temporal_color.cmd
 * as multipart/form-data to COLAB_GPU_URL/render.  The Colab server
 * runs FFmpeg with h264_nvenc GPU encoding on the Tesla T4 and streams
 * the rendered MP4 back.
 *
 * Codec flags are rewritten to force h264_nvenc before sending so
 * that the T4 GPU handles both filter processing AND encoding.
 *
 * Returns the rendered video as a Buffer, or `null` if Colab is
 * unavailable / errors out.
 */
async function renderOnColab(opts: {
  targetPath: string;
  referencePath: string | null;
  haldPath: string | null;
  filterGraph: string;
  temporalColorCmd: string | null;
  beatPulseCmd: string | null;
  blurCmd: string | null;
  transitionCmd: string | null;
  impactCmd: string | null;
  codecFlags: string;
  bitrateFlags: string;
  audioFlags: string;
  mappingFlags: string;
  duration: number;
  loopAudio: boolean;
}): Promise<Buffer | null> {
  const colabUrl = process.env.COLAB_GPU_URL;
  if (!colabUrl) return null;

  const url = `${colabUrl.replace(/\/+$/, "")}/render`;
  console.log(`[edit-transfer] 🚀 Offloading render to Colab GPU: ${url}`);

  try {
    const formData = new FormData();

    // Target video (required)
    const targetBuf = await fs.promises.readFile(opts.targetPath);
    formData.append(
      "target",
      new Blob([targetBuf], { type: "video/mp4" }),
      "target.mp4"
    );

    // Reference video (optional — for audio)
    if (opts.referencePath && fs.existsSync(opts.referencePath)) {
      const refBuf = await fs.promises.readFile(opts.referencePath);
      formData.append(
        "reference",
        new Blob([refBuf], { type: "video/mp4" }),
        "reference.mp4"
      );
    }

    // HALD CLUT (optional)
    if (opts.haldPath && fs.existsSync(opts.haldPath)) {
      const haldBuf = await fs.promises.readFile(opts.haldPath);
      formData.append(
        "hald_clut",
        new Blob([haldBuf], { type: "image/png" }),
        "hald_clut.png"
      );
    }

    // Filter graph — the __SENDCMD_PATH__ placeholder in the graph
    // is replaced by the Colab /render endpoint with its own temp path
    formData.append("filter_graph", opts.filterGraph);
    formData.append("temporal_color_cmd", opts.temporalColorCmd ?? "");
    formData.append("beat_pulse_cmd", opts.beatPulseCmd ?? "");
    formData.append("blur_cmd", opts.blurCmd ?? "");
    formData.append("transition_cmd", opts.transitionCmd ?? "");
    formData.append("impact_cmd", opts.impactCmd ?? "");

    // Force h264_nvenc for Tesla T4 GPU encoding on Colab.
    // The Colab server auto-detects nvenc availability and falls back
    // to libx264 if needed, but we request GPU encoding explicitly.
    // -bf 0 disables B-frames — critical for browser playback.
    // h264_nvenc defaults to B-frames which produce negative DTS
    // timestamps that Chrome/Safari/Firefox cannot decode.
    const colabCodecFlags = opts.codecFlags
      .replace("-c:v libx264", "-c:v h264_nvenc")
      .replace("-preset slow", "-preset p4")
      .replace("-crf 18", "-cq 18 -rc vbr -bf 0");
    formData.append("codec_flags", colabCodecFlags);
    formData.append("bitrate_flags", opts.bitrateFlags);
    formData.append("audio_flags", opts.audioFlags);
    formData.append("mapping_flags", opts.mappingFlags);
    formData.append("duration", opts.duration.toFixed(3));
    formData.append("loop_audio", opts.loopAudio ? "true" : "false");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 300_000); // 5 min

    const response = await fetch(url, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      const errText = await response.text().catch(() => "unknown");
      console.warn(
        `[edit-transfer] Colab render returned ${response.status}: ${errText.slice(0, 500)}`
      );
      return null;
    }

    const renderMs = response.headers.get("X-Render-Ms") ?? "?";
    const arrayBuf = await response.arrayBuffer();
    const buf = Buffer.from(arrayBuf);

    console.log(
      `[edit-transfer] ✅ Colab render succeeded: ${(buf.length / 1024).toFixed(0)}KB in ${renderMs}ms`
    );
    return buf;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.warn("[edit-transfer] Colab render timed out (>10 min)");
    } else {
      console.warn(
        `[edit-transfer] Colab render failed, falling back to local FFmpeg: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export interface TransferOptions {
  /** Keep the output file on disk instead of converting to base64 */
  keepOutput?: boolean;
  /** Override output dimensions (default: 1080×1920 Full HD vertical) */
  outputWidth?: number;
  outputHeight?: number;
  /** Raw bytes of the reference video (used to extract audio) */
  referenceBuffer?: Buffer;
}

/**
 * Apply the reference metadata style to the target video.
 *
 * @param targetBuffer  Raw bytes of the target video
 * @param refMeta       Full metadata extracted from the reference video
 * @param opts          Optional overrides (include referenceBuffer for audio)
 */
export async function transferEdit(
  targetBuffer: Buffer,
  refMeta: FullVideoMetadata,
  opts: TransferOptions = {}
): Promise<EditTransferResult> {
  const t0 = performance.now();
  const tmp = makeTempDir("edit-transfer");

  try {
    const targetPath = await writeTempFile(tmp, "target.mp4", targetBuffer);

    // ── Write reference video to disk for audio extraction ────────────
    let referencePath: string | null = null;
    if (opts.referenceBuffer) {
      referencePath = await writeTempFile(
        tmp,
        "reference.mp4",
        opts.referenceBuffer
      );
    }

    const outputDir = path.join(process.cwd(), "public", "outputs");
    fs.mkdirSync(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, `transfer-${Date.now()}.mp4`);
    const probe = await probeVideo(targetPath);
    const ffmpeg = await resolveFfmpeg();
    const exe = safeExe(ffmpeg);

    // Probe reference for audio duration if available
    let refDuration = refMeta.duration || 10;
    if (referencePath) {
      try {
        const refProbe = await probeVideo(referencePath);
        refDuration = refProbe.duration || refDuration;
      } catch {
        /* use metadata duration */
      }
    }

    const cg = refMeta.colorGrading;
    const mo = refMeta.motion;
    const sd = refMeta.shotDetection;
    const ab = refMeta.audio;
    const targetDuration = probe.duration || refMeta.duration || 10;

    // ── Build HALD CLUT for deep colour matching ──────────────────────
    const haldPath = path.join(tmp, "hald_clut.png");
    const useHald = await generateHaldClut(exe, haldPath, cg);

    // ══════════════════════════════════════════════════════════════════
    //  STYLEDNA PIPELINE  (v11 — Semantic Style Mapping)
    //
    //  Stage 1: extractStyleDNA  — distils FullVideoMetadata into 6
    //           perceptual domains (pacing, motion, color, lighting,
    //           rhythm, texture)
    //
    //  Stage 2: adaptToTargetContent  — maps the reference StyleDNA
    //           onto the TARGET's content SEMANTICALLY:
    //           • Cuts placed at target's beat onsets (by intensity rank)
    //           • Blur placed at target's motion peaks (by velocity rank)
    //           • Drop zones mapped to target's K hardest beats
    //           • Color evolution matched by energy level, not time
    //
    //  Stage 3: generateFilterGraph  — translates AdaptedStyleDNA into
    //           concrete FFmpeg filters + sendcmd files
    //
    //  ✗ Proportional: "blur at ref_time × ratio"
    //  ✓ Semantic:     "blur at target's highest-motion timestamp"
    // ══════════════════════════════════════════════════════════════════

    const w = opts.outputWidth ?? 1080;
    const h = opts.outputHeight ?? 1920;

    // ── Stage 1: Extract StyleDNA from reference metadata ─────────────
    console.log(
      "[edit-transfer] Stage 1: Extracting StyleDNA from reference..."
    );
    const refDNA = extractStyleDNA(refMeta);
    console.log(
      "[edit-transfer] StyleDNA extracted: " +
        `pacing=${refDNA.pacing.editingPace}(${refDNA.pacing.cutDensity.toFixed(2)}cuts/s), ` +
        `motion=${refDNA.motion.velocityProfile}(energy=${refDNA.motion.cameraEnergy.toFixed(2)}), ` +
        `rhythm=${refDNA.rhythm.bpm.toFixed(0)}bpm(${refDNA.rhythm.dropZones.length}drops), ` +
        `lighting=flicker${refDNA.lighting.flickerFreq.toFixed(1)}Hz, ` +
        `texture=${refDNA.texture.filmStockLabel}(grain=${refDNA.texture.grainProfile.strength})`
    );

    // ── Stage 2: Build target context + semantic adaptation ───────────
    console.log(
      "[edit-transfer] Stage 2: Semantic adaptation to target content..."
    );

    const targetCtx: TargetContentContext = {
      duration: targetDuration,
      beatEvents: (ab.beatEvents ?? []).map((b) => ({
        ...b,
        timestamp_sec:
          refDuration > 0
            ? (b.timestamp_sec / refDuration) * targetDuration
            : b.timestamp_sec,
      })),
      shotBoundaries: sd.cuts.map((c) => ({
        ...c,
        timestamp_sec:
          refDuration > 0
            ? (c.timestamp_sec / refDuration) * targetDuration
            : c.timestamp_sec,
      })),
      motionData: mo,
      depthData: refMeta.depth,
      width: w,
      height: h,
    };

    const adaptedDNA = adaptToTargetContent(refDNA, targetCtx);
    console.log(
      "[edit-transfer] Adaptation complete: " +
        `${adaptedDNA.pacing.cutTimestamps.length} semantic cuts, ` +
        `${adaptedDNA.motion.jitterEvents.length} jitter events, ` +
        `${adaptedDNA.color.temporalSendcmd.length} color events, ` +
        `${adaptedDNA.rhythm.beatPulseEvents.length} beat pulses, ` +
        `${adaptedDNA.texture.blurEvents.length} blur events`
    );

    // ── Shot-only segmentation (unchanged — TransNetV2 boundaries) ────
    const hardCuts = sd.cuts.filter(
      (c) => c.type === "hard_cut" && c.confidence > 0.2
    );
    const shotOnlyCutTimes = buildShotOnlyCutPoints(
      hardCuts,
      targetDuration,
      refDuration
    );
    let useHardCutSegmentation = false;
    let hardCutGraph = "";

    const hasRefAudio = referencePath && refMeta.hasAudio;
    const vidIdx = hasRefAudio ? 1 : 0;
    const haldIdx = hasRefAudio ? 2 : 1;

    if (shotOnlyCutTimes.length >= 1 && targetDuration > 1) {
      const segments: { start: number; end: number }[] = [];
      let prev = 0;
      for (const cutTime of shotOnlyCutTimes) {
        if (cutTime > prev + 0.5 && cutTime < targetDuration) {
          segments.push({ start: prev, end: cutTime });
          prev = cutTime;
        }
      }
      if (prev < targetDuration - 0.1) {
        segments.push({ start: prev, end: targetDuration });
      }

      if (segments.length >= 2) {
        const trimParts: string[] = [];
        const concatInputs: string[] = [];
        for (let i = 0; i < segments.length; i++) {
          const seg = segments[i];
          const label = `seg${i}`;
          const segFilters = `trim=start=${seg.start.toFixed(3)}:end=${seg.end.toFixed(3)},setpts=PTS-STARTPTS`;
          trimParts.push(`[${vidIdx}:v]${segFilters}[${label}]`);
          concatInputs.push(`[${label}]`);
        }
        hardCutGraph =
          trimParts.join(";") +
          ";" +
          concatInputs.join("") +
          `concat=n=${segments.length}:v=1:a=0[segmented]`;
        useHardCutSegmentation = true;
        console.log(
          `[edit-transfer] Shot segmentation: ${segments.length} segments from ` +
            `${shotOnlyCutTimes.length} TransNetV2 boundaries`
        );
      }
    }

    // ── Stage 3: Generate filter graph ────────────────────────────────
    console.log("[edit-transfer] Stage 3: Generating filter graph...");

    const {
      videoFilterChain,
      hardCutGraph: generatedHardCutGraph,
      useHald: useHaldFromDNA,
      filterLog,
      cmdFiles,
    } = await generateFilterGraph(adaptedDNA, tmp, {
      vidIdx,
      haldIdx,
      useHardCutSegmentation,
      hardCutGraph,
      useColab: !!process.env.COLAB_GPU_URL,
      targetDuration,
      width: w,
      height: h,
      refVelocityTimeline: mo.velocityTimeline ?? [],
      refZoomTimeline: mo.zoomTimeline ?? [],
      refDuration,
    });

    void generatedHardCutGraph;

    const applyHald = useHald && useHaldFromDNA;

    // ── Build the filter_complex graph string ─────────────────────────
    let filterGraph: string;
    const videoSrcLabel = useHardCutSegmentation
      ? "[segmented]"
      : `[${vidIdx}:v]`;
    const loopAudio = refDuration > 0 && targetDuration > refDuration * 1.05;

    // ── Temporal Smoothing — DISABLED (v10.1) ─────────────────────────
    const temporalSmoothFilter = "";

    if (applyHald) {
      const graphParts: string[] = [];

      if (useHardCutSegmentation) {
        graphParts.push(hardCutGraph);
      }

      graphParts.push(
        `${videoSrcLabel}${videoFilterChain}[v1]`,
        `[v1][${haldIdx}:v]haldclut[v2]`,
        `[v2]pad=ceil(iw/2)*2:ceil(ih/2)*2${temporalSmoothFilter},format=yuv420p[vout]`
      );
      filterGraph = graphParts.join(";");
    } else {
      const graphParts: string[] = [];

      if (useHardCutSegmentation) {
        graphParts.push(hardCutGraph);
      }

      graphParts.push(
        `${videoSrcLabel}${videoFilterChain},pad=ceil(iw/2)*2:ceil(ih/2)*2${temporalSmoothFilter},format=yuv420p[vout]`
      );
      filterGraph = graphParts.join(";");
    }

    const filterScriptPath = path.join(tmp, "filter_complex.txt");
    fs.writeFileSync(filterScriptPath, filterGraph, "utf-8");

    console.log("[edit-transfer] filter_complex content (from file):");
    console.log(filterGraph);

    // ── Assemble inputs ───────────────────────────────────────────────
    const inputs: string[] = [];
    if (hasRefAudio) {
      if (loopAudio) {
        inputs.push(`-stream_loop -1 -i "${referencePath}"`);
        filterLog.push("audio-loop:seamless");
      } else {
        inputs.push(`-i "${referencePath}"`);
      }
    }
    inputs.push(`-i "${targetPath}"`);
    if (applyHald) {
      inputs.push(`-i "${haldPath}"`);
    }

    const mapping: string[] = [`-map "[vout]"`];
    const audioFlags: string[] = [];

    if (hasRefAudio) {
      mapping.push("-map 0:a:0");
      audioFlags.push(
        `-af "aloop=loop=-1:size=2e9,atrim=0:${targetDuration.toFixed(3)},asetpts=PTS-STARTPTS,alimiter=limit=0.9"`,
        "-c:a aac -b:a 192k"
      );
      filterLog.push(`audio:aloop+atrim(${targetDuration.toFixed(1)}s)`);
    } else {
      mapping.push(`-map ${vidIdx}:a?`);
      audioFlags.push("-c:a aac -b:a 192k");
    }

    const codecFlags =
      "-c:v libx264 -profile:v high -pix_fmt yuv420p -preset slow -crf 18 -threads 0";

    const bitrateFlags = "-b:v 5M -minrate 3M -maxrate 8M -bufsize 16M";

    const filterGraphInline = fs.readFileSync(filterScriptPath, "utf-8");
    const ffmpegCmd = [
      exe,
      "-y",
      "-analyzeduration 100M -probesize 100M",
      ...inputs,
      "-filter_complex",
      `"${filterGraphInline}"`,
      ...mapping,
      codecFlags,
      ...audioFlags,
      "-movflags +faststart",
      bitrateFlags,
      `-t ${targetDuration.toFixed(3)}`,
      `"${outputPath}"`,
    ].join(" ");

    console.log("[edit-transfer] Filter graph:", filterLog.join(" → "));

    const temporalColorCmdContent =
      cmdFiles.temporalColor && fs.existsSync(cmdFiles.temporalColor)
        ? fs.readFileSync(cmdFiles.temporalColor, "utf-8")
        : null;

    const blurCmdContent =
      cmdFiles.blur && fs.existsSync(cmdFiles.blur)
        ? fs.readFileSync(cmdFiles.blur, "utf-8")
        : null;

    const transitionCmdContent =
      cmdFiles.transition && fs.existsSync(cmdFiles.transition)
        ? fs.readFileSync(cmdFiles.transition, "utf-8")
        : null;

    const beatPulseContent: string | null =
      cmdFiles.beatPulse && fs.existsSync(cmdFiles.beatPulse)
        ? fs.readFileSync(cmdFiles.beatPulse, "utf-8")
        : null;

    const impactCmdContent: string | null =
      cmdFiles.impact && fs.existsSync(cmdFiles.impact)
        ? fs.readFileSync(cmdFiles.impact, "utf-8")
        : null;

    const colabConfigured = !!process.env.COLAB_GPU_URL;

    if (colabConfigured) {
      console.log(
        "[edit-transfer] 🚀 COLAB_GPU_URL is set — using Colab as primary render"
      );

      const colabResult = await renderOnColab({
        targetPath,
        referencePath,
        haldPath: applyHald ? haldPath : null,
        filterGraph,
        temporalColorCmd: temporalColorCmdContent,
        beatPulseCmd: beatPulseContent,
        blurCmd: blurCmdContent,
        transitionCmd: transitionCmdContent,
        impactCmd: impactCmdContent,
        codecFlags,
        bitrateFlags,
        audioFlags: audioFlags.join(" "),
        mappingFlags: mapping.join(" "),
        duration: targetDuration,
        loopAudio,
      });

      if (colabResult) {
        await fs.promises.writeFile(outputPath, colabResult);
        filterLog.push("render:colab-gpu(h264_nvenc)");
        console.log(
          `[edit-transfer] ✅ Colab GPU render saved to ${outputPath}`
        );
      } else {
        console.error(
          "═══════════════════════════════════════════════════════════"
        );
        console.error("[edit-transfer] COLAB GPU RENDER FAILED");
        console.error(
          "[edit-transfer] COLAB_GPU_URL was set but the render did not succeed."
        );
        console.error(
          "[edit-transfer] Check that the Colab notebook is running and the"
        );
        console.error("[edit-transfer] ngrok tunnel URL in .env is current.");
        console.error(
          "═══════════════════════════════════════════════════════════"
        );

        return {
          success: false,
          appliedMetadata: refMeta,
          filterGraphSummary: filterLog.join(" → "),
          processingMs: Math.round(performance.now() - t0),
          error:
            "Colab GPU render failed. Ensure the Colab notebook is running " +
            "and COLAB_GPU_URL in .env points to the active ngrok tunnel.",
        };
      }
    } else {
      console.warn(
        "[edit-transfer] ⚠ COLAB_GPU_URL not set — using local FFmpeg (slower, CPU-only)"
      );
      filterLog.push("render:local-ffmpeg(emergency)");
      console.log("[edit-transfer] FFmpeg command:", ffmpegCmd);

      try {
        const { stderr } = await execAsync(ffmpegCmd, {
          maxBuffer: 200 * 1024 * 1024,
        });
        if (stderr) {
          const lastLines = stderr.split("\n").slice(-15).join("\n");
          console.log(
            "[edit-transfer] FFmpeg stderr (last 15 lines):\n",
            lastLines
          );
        }
      } catch (ffErr: unknown) {
        const errObj = ffErr as {
          stderr?: string;
          stdout?: string;
          message?: string;
        };
        const fullStderr = errObj.stderr || "";
        const fullMsg = errObj.message || String(ffErr);

        console.error(
          "═══════════════════════════════════════════════════════════"
        );
        console.error(
          "[edit-transfer] LOCAL FFMPEG FAILED (emergency fallback)"
        );
        console.error(
          "═══════════════════════════════════════════════════════════"
        );
        console.error("[edit-transfer] Command:\n", ffmpegCmd);
        console.error("[edit-transfer] Full stderr:\n", fullStderr);
        console.error("[edit-transfer] Error message:\n", fullMsg);
        console.error(
          "═══════════════════════════════════════════════════════════"
        );

        return {
          success: false,
          appliedMetadata: refMeta,
          filterGraphSummary: filterLog.join(" → "),
          processingMs: Math.round(performance.now() - t0),
          error: `Local FFmpeg FAILED. Set COLAB_GPU_URL for GPU rendering.\n${fullStderr}\n\n${fullMsg}`,
        };
      }
    }

    // Verify output file was actually created and has meaningful content
    if (!fs.existsSync(outputPath)) {
      return {
        success: false,
        appliedMetadata: refMeta,
        filterGraphSummary: filterLog.join(" → "),
        processingMs: Math.round(performance.now() - t0),
        error: "FFmpeg completed but failed to create output file.",
      };
    }

    // Reject suspiciously small outputs (< 50KB for a video = likely black/corrupt)
    const outputStat = fs.statSync(outputPath);
    const outputSizeKB = outputStat.size / 1024;
    if (outputSizeKB < 50) {
      console.error(
        `[edit-transfer] ⚠ Output file suspiciously small: ${outputSizeKB.toFixed(1)}KB. ` +
          `Likely bitrate collapse / black video. Filter chain: ${filterLog.join(" → ")}`
      );
      // Don't fail — user might still want the file — but log prominently
    }

    // ── Derive a browser-accessible URL ───────────────────────────────
    // outputPath is absolute: <cwd>/public/outputs/transfer-xxx.mp4
    // The browser needs:         /outputs/transfer-xxx.mp4
    const filename = path.basename(outputPath);
    const videoUrl = `/outputs/${filename}`;

    // ── Return result ─────────────────────────────────────────────────
    if (opts.keepOutput) {
      return {
        success: true,
        outputPath,
        videoUrl,
        appliedMetadata: refMeta,
        filterGraphSummary: filterLog.join(" → "),
        processingMs: Math.round(performance.now() - t0),
      };
    }

    // Non-keepOutput: also return the URL (file stays in public/outputs)
    // plus a base64 version for backward compat
    const outputBuffer = await fs.promises.readFile(outputPath);
    const videoBase64 =
      "data:video/mp4;base64," + outputBuffer.toString("base64");

    return {
      success: true,
      videoBase64,
      videoUrl,
      appliedMetadata: refMeta,
      filterGraphSummary: filterLog.join(" → "),
      processingMs: Math.round(performance.now() - t0),
    };
  } finally {
    cleanTempDir(tmp);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HALD CLUT generation  (uses pre-computed params from ColorGradingResult)
// ─────────────────────────────────────────────────────────────────────────────

async function generateHaldClut(
  exe: string,
  outputPath: string,
  cg: ColorGradingResult
): Promise<boolean> {
  try {
    const filters: string[] = [];

    // ── IMPORTANT: Do NOT include `eq` here. ──────────────────────────
    //    The main filter chain already applies:
    //      • curves=preset=strong_contrast
    //      • eq=saturation=1.3:contrast=1.1  (cinematic base)
    //      • Signal-driven eq refinement
    //    Including eq in the CLUT causes DOUBLE-APPLICATION of
    //    brightness / contrast / saturation → near-black output.
    //    The CLUT encodes ONLY colour-channel mixing & balance.
    // ──────────────────────────────────────────────────────────────────
    if (cg.colorchannelmixerParams) {
      filters.push(`colorchannelmixer=${cg.colorchannelmixerParams}`);
    }
    filters.push(`colorbalance=${cg.colorbalanceParams}`);

    // Write filter graph to a script file — same strategy as the main
    // render command, avoids all Windows quoting issues.
    const scriptDir = path.dirname(outputPath);
    const scriptPath = path.join(scriptDir, "hald_filter.txt");
    const graphContent = `[0:v]${filters.join(",")}[vout]`;
    fs.writeFileSync(scriptPath, graphContent, "utf-8");

    const cmd = [
      exe,
      "-y",
      "-analyzeduration 100M -probesize 100M",
      `-f lavfi -i "haldclutsrc=level=8"`,
      `-filter_complex_script "${scriptPath}"`,
      `-map "[vout]"`,
      "-frames:v 1",
      `"${outputPath}"`,
    ].join(" ");

    await execAsync(cmd, { maxBuffer: 30 * 1024 * 1024 });

    // Validate CLUT was generated with reasonable size (identity CLUT ≈ 600-800KB)
    const stat = fs.statSync(outputPath);
    if (stat.size < 1000) {
      console.warn(
        `[edit-transfer] HALD CLUT suspiciously small (${stat.size}B) — skipping CLUT`
      );
      return false;
    }
    return true;
  } catch (err) {
    console.warn(
      "[edit-transfer] HALD CLUT generation failed:",
      err instanceof Error ? err.message : err
    );
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Velocity setpts expression builder  ─  cumulative PTS + LOOP
// ─────────────────────────────────────────────────────────────────────────────
//
// ALGORITHM
// ---------
// 1. **LOOP** — If the reference velocity pattern ends before the target
//    duration, the pattern is tiled cyclically.  Each loop iteration
//    picks up exactly where the previous one left off so the output
//    timeline is seamless.
//
// 2. **Cumulative PTS** — Each segment `i` has:
//        inputStart[i]   = sum of prior segment input-durations
//        outputStart[i]  = sum of prior segment output-durations
//    where output-duration = input-duration / speed.
//
//    The setpts expression for frame time T inside segment i is:
//        STARTPTS + (outputStart[i] + (T - inputStart[i]) / speed[i]) * TB
//
//    We normalise into PTS timebase units (T = PTS/TB after STARTPTS
//    subtraction), so the expression becomes:
//        (outStart + (T - inStart) / speed) / TB
//    FFmpeg's `setpts` already works in PTS units; T is wall-clock via
//    the `T` variable (seconds), so the final expression per segment is:
//        outStart + (T - inStart) / speed
//
// 3. The segments are merged if adjacent ones have near-equal speed,
//    then wrapped in a nested `if(between(T,…),…,…)` chain.

/**
 * A segment in the output timeline after looping + cumulative offsets.
 * All times are in **input-time** seconds (i.e. the T variable of
 * setpts, which counts the *original* wall-clock position of each frame).
 */
interface ResolvedSegment {
  /** Input-time start of this segment (seconds) */
  inStart: number;
  /** Input-time end of this segment (seconds) */
  inEnd: number;
  /** Clamped speed factor */
  speed: number;
  /** Output-time start of this segment (seconds) */
  outStart: number;
}

function buildSetptsExpr(
  velocitySegments: VelocitySegment[],
  targetDuration: number
): string | null {
  if (!velocitySegments || velocitySegments.length === 0) return null;

  // ── Step 1: derive canonical single-loop pattern ────────────────────
  // Sort by start_sec and ensure contiguous coverage
  const canonical = [...velocitySegments].sort(
    (a, b) => a.start_sec - b.start_sec
  );
  const refEnd = Math.max(...canonical.map((s) => s.end_sec));
  if (refEnd <= 0) return null;

  // ── Step 2: PROPORTIONAL SCALING ────────────────────────────────────
  //    Map each reference velocity segment to the target timeline
  //    proportionally: ref timestamp × (targetDuration / refEnd).
  //    NO cyclic looping — the editing rhythm stretches perfectly.
  const resolved: ResolvedSegment[] = [];
  let outCursor = 0;
  const scale = targetDuration / refEnd;

  for (const seg of canonical) {
    const speed = clampSpeed(seg.relative_speed);
    const inStart = seg.start_sec * scale;
    const inEnd = seg.end_sec * scale;
    const inDuration = inEnd - inStart;
    const outDuration = inDuration / speed;

    resolved.push({
      inStart,
      inEnd,
      speed,
      outStart: outCursor,
    });

    outCursor += outDuration;
  }

  if (resolved.length === 0) return null;

  // ── Step 3: merge adjacent segments with same speed ─────────────────
  const merged: ResolvedSegment[] = [resolved[0]];
  for (let i = 1; i < resolved.length; i++) {
    const prev = merged[merged.length - 1];
    const cur = resolved[i];
    if (Math.abs(prev.speed - cur.speed) < 0.02) {
      // Extend prev to cover cur (recalculate nothing, just widen the
      // input-time window — outStart stays the same for the merged block)
      prev.inEnd = cur.inEnd;
    } else {
      merged.push({ ...cur });
    }
  }

  // ── Step 4: build nested if(between(T,…)) expression ───────────────
  //
  // QUOTING RULES FOR -filter_complex_script FILES:
  //   • Use 2 decimal places — some Gyan.dev FFmpeg builds choke on 6.
  //   • The filter graph is written to a SCRIPT FILE on disk and passed
  //     via -filter_complex_script — there is no SHELL quoting layer,
  //     but FFmpeg's own filter-graph parser STILL uses commas as
  //     option separators within a filter.  So the setpts value MUST
  //     be wrapped in SINGLE QUOTES inside the script file:
  //         setpts='if(between(T,0.00,5.50),(0.00+(T-0.00)/1.00)/TB,PTS)'
  //     The single quotes tell FFmpeg's parser: treat everything inside
  //     as one literal option value — do NOT split on commas/parens.
  //
  // For each segment the output PTS (in seconds) for input-time T is:
  //     outStart + (T - inStart) / speed
  //
  // setpts expects an expression that evaluates to PTS-units.  The `T`
  // variable in setpts is the wall-clock time of the *input* frame in
  // seconds.  Using the T-based form: (outStart + (T - inStart) / speed) / TB

  let expr = "PTS"; // fallback: identity
  for (let i = merged.length - 1; i >= 0; i--) {
    const s = merged[i];
    const oS = s.outStart.toFixed(2);
    const iS = s.inStart.toFixed(2);
    const iE = s.inEnd.toFixed(2);
    const spd = s.speed.toFixed(2);

    // (outStart + (T - inStart) / speed) / TB
    const segExpr = `(${oS}+(T-${iS})/${spd})/TB`;

    // Plain commas — safe because the caller wraps in single quotes:
    //   setpts='if(between(T,0.00,5.50),(0.00+(T-0.00)/1.00)/TB,PTS)'
    expr = `if(between(T,${iS},${iE}),${segExpr},${expr})`;
  }

  return expr;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function clampSpeed(speed: number): number {
  return Math.max(MIN_SPEED, Math.min(MAX_SPEED, speed || 1.0));
}

// ─────────────────────────────────────────────────────────────────────────────
// Direct Keyframe Velocity (setpts)  ─  per-point RAFT speed mapping
// ─────────────────────────────────────────────────────────────────────────────
//
// STRICT KEYFRAME MODE: Uses the per-frame velocityTimeline
// (VelocityTimelinePoint[]) instead of averaged segments.
//
// ALGORITHM
// ---------
// 1. Each VelocityTimelinePoint has (time_sec, relative_speed).
// 2. Proportional time mapping: ref timestamp × (targetDur / refDur).
// 3. Build piecewise setpts with cumulative output-time tracking.
// 4. Each keyframe pair [i, i+1] defines a speed zone where the
//    reference's exact relative_speed is applied to the target.
// 5. NO averaging, NO segment merging, NO fallbacks.
//
// For a point with relative_speed = 1.5, the target frames in that
// zone play at 1.5× speed — exactly mirroring the reference.
// ─────────────────────────────────────────────────────────────────────────────

function buildDirectKeyframeSetpts(
  timeline: VelocityTimelinePoint[],
  targetDuration: number,
  refDuration: number
): string | null {
  if (!timeline || timeline.length < 2) return null;

  const refEnd = Math.max(
    refDuration,
    timeline[timeline.length - 1].time_sec + 0.01
  );
  const scale = targetDuration / refEnd;

  // Build resolved segments from consecutive keyframe pairs.
  // Each pair [i, i+1] defines a speed zone using point i's speed.
  const resolved: ResolvedSegment[] = [];
  let outCursor = 0;

  for (let i = 0; i < timeline.length - 1; i++) {
    const speed = clampSpeed(timeline[i].relative_speed);
    const inStart = timeline[i].time_sec * scale;
    const inEnd = timeline[i + 1].time_sec * scale;
    const inDuration = inEnd - inStart;

    if (inDuration <= 0) continue;

    const outDuration = inDuration / speed;
    resolved.push({ inStart, inEnd, speed, outStart: outCursor });
    outCursor += outDuration;
  }

  // Final point → end of target: use last point's speed
  if (resolved.length > 0) {
    const lastPoint = timeline[timeline.length - 1];
    const lastSpeed = clampSpeed(lastPoint.relative_speed);
    const lastInStart = lastPoint.time_sec * scale;
    if (lastInStart < targetDuration) {
      const inDuration = targetDuration - lastInStart;
      resolved.push({
        inStart: lastInStart,
        inEnd: targetDuration,
        speed: lastSpeed,
        outStart: outCursor,
      });
    }
  }

  if (resolved.length === 0) return null;

  // Cap to MAX_LOOP_ITERATIONS keyframes to prevent expression explosion
  let keyframes = resolved;
  if (keyframes.length > MAX_LOOP_ITERATIONS) {
    const step = Math.ceil(keyframes.length / MAX_LOOP_ITERATIONS);
    const decimated: ResolvedSegment[] = [];
    let cursor = 0;
    for (let i = 0; i < keyframes.length; i += step) {
      const kf = keyframes[i];
      const end =
        i + step < keyframes.length
          ? keyframes[i + step].inStart
          : targetDuration;
      const dur = end - kf.inStart;
      decimated.push({
        inStart: kf.inStart,
        inEnd: end,
        speed: kf.speed,
        outStart: cursor,
      });
      cursor += dur / kf.speed;
    }
    keyframes = decimated;
  }

  // Build nested if(between(T,...)) expression — same format as buildSetptsExpr
  let expr = "PTS";
  for (let i = keyframes.length - 1; i >= 0; i--) {
    const s = keyframes[i];
    const oS = s.outStart.toFixed(2);
    const iS = s.inStart.toFixed(2);
    const iE = s.inEnd.toFixed(2);
    const spd = s.speed.toFixed(2);
    const segExpr = `(${oS}+(T-${iS})/${spd})/TB`;
    expr = `if(between(T,${iS},${iE}),${segExpr},${expr})`;
  }

  return expr;
}

// ─────────────────────────────────────────────────────────────────────────────
// Direct Keyframe Zoom Expression Builder  ─  per-point RAFT zoompan
// ─────────────────────────────────────────────────────────────────────────────
//
// STRICT KEYFRAME MODE: Maps EVERY zoom sample directly — no region
// averaging, no direction grouping, no filtering by significance.
//
// Each zoomTimeline point's exact zoomSpeed is converted to a zoompan
// z-rate at the proportionally-mapped frame position.  The z-expression
// accumulates from 1.0 using each point's rate × frameDelta.
//
// If the reference zooms at speed 0.5 at 2.3s and speed -0.3 at 3.1s,
// the target gets exactly those zoom rates at the proportional timestamps.
// ─────────────────────────────────────────────────────────────────────────────

function buildDirectKeyframeZoomExpr(
  zoomTimeline: Array<{ time_sec: number; zoomSpeed: number }>,
  targetDuration: number,
  w: number,
  h: number
): string | null {
  if (zoomTimeline.length < 2) return null;

  const refEnd = Math.max(...zoomTimeline.map((z) => z.time_sec));
  if (refEnd <= 0) return null;

  const scale = targetDuration / refEnd;
  const ZOOM_SCALE = 0.0008; // RAFT optical-flow units → zoompan z-units

  // Build per-point zoom keyframes — NO averaging, NO direction grouping
  interface ZoomKeyframe {
    startFrame: number;
    endFrame: number;
    rate: number; // zoom rate per frame
  }

  const keyframes: ZoomKeyframe[] = [];
  for (let i = 0; i < zoomTimeline.length - 1; i++) {
    const curr = zoomTimeline[i];
    const next = zoomTimeline[i + 1];
    const startFrame = Math.round(curr.time_sec * scale * 30);
    const endFrame = Math.round(next.time_sec * scale * 30);

    if (endFrame <= startFrame) continue;

    // Direct 1:1 mapping: reference zoomSpeed → target zoom rate
    const rate = curr.zoomSpeed * ZOOM_SCALE;
    keyframes.push({ startFrame, endFrame, rate });
  }

  // Last point → end
  if (keyframes.length > 0) {
    const last = zoomTimeline[zoomTimeline.length - 1];
    const lastFrame = Math.round(last.time_sec * scale * 30);
    const endFrame = Math.round(targetDuration * 30);
    if (endFrame > lastFrame) {
      keyframes.push({
        startFrame: lastFrame,
        endFrame,
        rate: last.zoomSpeed * ZOOM_SCALE,
      });
    }
  }

  if (keyframes.length === 0) return null;

  // Cap keyframes to prevent expression explosion
  let kfs = keyframes;
  if (kfs.length > MAX_LOOP_ITERATIONS) {
    const step = Math.ceil(kfs.length / MAX_LOOP_ITERATIONS);
    kfs = kfs.filter((_, i) => i % step === 0);
  }

  // Build nested if(between(on,...)) z-expression
  // Each segment: z = 1 + rate * (on - startFrame)
  // This accumulates zoom from 1.0 based on the reference's exact speed
  let zExpr = "1.0";
  for (let i = kfs.length - 1; i >= 0; i--) {
    const kf = kfs[i];
    const rate = kf.rate.toFixed(6);
    const segExpr = `(1+${rate}*(on-${kf.startFrame}))`;
    zExpr = `if(between(on,${kf.startFrame},${kf.endFrame}),${segExpr},${zExpr})`;
  }

  return `zoompan=z='${zExpr}':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${w}x${h}:fps=30`;
}

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY: Dynamic Zoom Expression Builder  ─  region-averaged RAFT zoompan
// ─────────────────────────────────────────────────────────────────────────────
//
// DEPRECATED: Kept only for backwards compatibility when called explicitly.
// The direct keyframe zoom builder (buildDirectKeyframeZoomExpr) is now
// the primary path.  This function groups zoom samples into regions and
// averages them — losing per-frame accuracy.
//
// changes zoom at exact reference timestamps.
//
// STRATEGY:
//   1. Group consecutive zoom samples into segments of similar direction.
//   2. For each segment, compute a zoom rate from the mean zoomSpeed.
//   3. Build a nested `if(between(on/fps, start, end), zoomExpr, ...)`
//      expression where `on` is the zoompan frame counter and fps=30.
//   4. Clamp zoom between 0.92 (max zoom-out) and 1.12 (max zoom-in)
//      to keep the effect cinematic, not jarring.
// ─────────────────────────────────────────────────────────────────────────────

function buildDynamicZoomExpr(
  zoomTimeline: Array<{ time_sec: number; zoomSpeed: number }>,
  targetDuration: number,
  w: number,
  h: number
): string | null {
  if (zoomTimeline.length < 2) return null;

  // ── Segment the timeline into zoom regions ──────────────────────────
  // Each region has consistent zoom direction (in/out/none).
  interface ZoomRegion {
    start: number;
    end: number;
    avgSpeed: number;
  }

  const regions: ZoomRegion[] = [];
  let regStart = zoomTimeline[0].time_sec;
  let regSpeeds = [zoomTimeline[0].zoomSpeed];

  for (let i = 1; i < zoomTimeline.length; i++) {
    const prev = zoomTimeline[i - 1];
    const curr = zoomTimeline[i];
    const sameDirection =
      (prev.zoomSpeed >= 0 && curr.zoomSpeed >= 0) ||
      (prev.zoomSpeed < 0 && curr.zoomSpeed < 0);

    if (!sameDirection || curr.time_sec - prev.time_sec > 1.0) {
      // End current region
      const avg = regSpeeds.reduce((a, b) => a + b, 0) / regSpeeds.length;
      regions.push({
        start: regStart,
        end: prev.time_sec,
        avgSpeed: avg,
      });
      regStart = curr.time_sec;
      regSpeeds = [curr.zoomSpeed];
    } else {
      regSpeeds.push(curr.zoomSpeed);
    }
  }
  // Final region
  const lastSample = zoomTimeline[zoomTimeline.length - 1];
  const avgFinal = regSpeeds.reduce((a, b) => a + b, 0) / regSpeeds.length;
  regions.push({
    start: regStart,
    end: lastSample.time_sec,
    avgSpeed: avgFinal,
  });

  // Filter out very short or very weak zoom regions
  const significant = regions.filter(
    (r) => r.end - r.start > 0.15 && Math.abs(r.avgSpeed) > 0.05
  );

  if (significant.length === 0) return null;

  // ── Proportional zoom scaling ───────────────────────────────────────
  //    Scale zoom regions to cover the full target duration proportionally.
  //    NO cyclic looping — zoom rhythm is stretched, not repeated.
  const refEnd = Math.max(...significant.map((r) => r.end));
  let allRegions: ZoomRegion[];
  if (refEnd > 0 && Math.abs(targetDuration - refEnd) > 0.1) {
    const scale = targetDuration / refEnd;
    allRegions = significant.map((r) => ({
      start: r.start * scale,
      end: r.end * scale,
      avgSpeed: r.avgSpeed,
    }));
  } else {
    allRegions = [...significant];
  }

  // Cap to 60 regions to prevent expression explosion
  if (allRegions.length > 60) {
    const step = Math.ceil(allRegions.length / 60);
    allRegions = allRegions.filter((_, i) => i % step === 0);
  }

  // ── Build the z-expression ──────────────────────────────────────────
  // `on` = zoompan frame counter, `on/30` ≈ time in seconds at 30fps
  // v7.1: Exact zoom_velocity from RAFT — no HF noise, no artificial
  // amplification.  Pure mathematical mapping of reference zoom speed.
  // Scale factor converts RAFT optical-flow units to zoompan z-units.
  const ZOOM_SCALE = 0.0008;

  let zExpr = "1.0"; // default: no zoom
  for (let i = allRegions.length - 1; i >= 0; i--) {
    const r = allRegions[i];
    const rate = (r.avgSpeed * ZOOM_SCALE).toFixed(6);
    const startFrame = Math.round(r.start * 30);
    const endFrame = Math.round(r.end * 30);
    // NO-CAPS: raw accumulation — no min/max bounds
    //   1 + rate * (on - startFrame)  — follows reference exactly
    const segExpr = `(1+${rate}*(on-${startFrame}))`;
    zExpr = `if(between(on,${startFrame},${endFrame}),${segExpr},${zExpr})`;
  }

  return `zoompan=z='${zExpr}':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${w}x${h}:fps=30`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Signal-Driven Color DNA  (eq-only — v4 Black-Video Fix)
// ─────────────────────────────────────────────────────────────────────────────
//
// PERMANENT RULE: This function must NEVER emit a `curves=…` filter.
//   The main chain already has ONE curves=preset=strong_contrast.
//   Stacking additional curves presets (increase_contrast, lighter,
//   cross_process) compresses the luma range further each time →
//   near-black or total-black output.
//
// What this function CAN emit:
//   • A single `eq=…` tweak (safe additive adjustment to contrast,
//     brightness, saturation) based on the reference's shot signals.
//   • NO hue-rotation — hue shifts were causing muddy tints on
//     footage with different white-balance than the reference.
// ─────────────────────────────────────────────────────────────────────────────

function buildSignalColorDNA(
  sd: ShotDetectionResult,
  cg: ColorGradingResult,
  _targetDuration: number
): string[] {
  const cuts = sd.cuts;
  if (!cuts || cuts.length === 0) return [];

  const filters: string[] = [];

  // ── Aggregate signal statistics ────────────────────────────────────
  const histScores = cuts.map((c) => c.hist_score);
  const ecrScores = cuts.map((c) => c.ecr_score);

  const histMean = histScores.reduce((a, b) => a + b, 0) / histScores.length;
  const ecrMean = ecrScores.reduce((a, b) => a + b, 0) / ecrScores.length;

  // ── ECR-driven eq refinement — EXTREME: wider deltas, no safety ────
  //    EXTREME MODE: multiplied ECR/hist coefficients, wider clamps.
  const contrastDelta = clampRange(ecrMean * 0.35, 0, 0.25);
  const brightnessDelta = clampRange((ecrMean - 0.5) * 0.06, -0.04, 0.04);
  const saturationDelta = clampRange(histMean * 0.2, 0, 0.18);

  if (
    contrastDelta > 0.02 ||
    Math.abs(brightnessDelta) > 0.005 ||
    saturationDelta > 0.02
  ) {
    const c = (1.0 + contrastDelta).toFixed(3);
    const b = brightnessDelta.toFixed(4);
    const s = (1.0 + saturationDelta).toFixed(3);
    filters.push(`eq=contrast=${c}:brightness=${b}:saturation=${s}`);
  }

  // NO curves preset here — permanently removed to prevent black video

  return filters;
}

/** Clamp a number to [min, max] */
function clampRange(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ─────────────────────────────────────────────────────────────────────────────
// DTW Frame-Perfect Transition Alignment
// ─────────────────────────────────────────────────────────────────────────────
//
// Dynamic Time Warping (DTW) — aligns reference edit points to the target
// timeline using beat intensity as a weighting signal.
//
// ALGORITHM
// ---------
// 1. High-intensity beats (≥ 1.2× average) are LOCKED to their exact
//    proportional position — these are the rhythmic anchor points.
//
// 2. Low-intensity beats DRIFT toward the nearest high-intensity anchor,
//    creating tighter rhythmic groupings that mirror the reference's
//    editing DNA more accurately than simple linear scaling.
//
// 3. The drift amount is proportional to how far below average the
//    beat's intensity is, capped at 8% of the mean inter-cut gap.
//
// This replaces naive `refTime × (targetDur / refDur)` with an
// intensity-aware warping that preserves the FEEL of the original
// edit rhythm.
// ─────────────────────────────────────────────────────────────────────────────

function applyDTWAlignment(
  cutTimes: number[],
  beatEvents: BeatEvent[],
  targetDuration: number
): number[] {
  if (cutTimes.length < 3 || beatEvents.length === 0) return cutTimes;

  // Map each cut time to the nearest beat's intensity
  const intensities = cutTimes.map((t) => {
    let nearest = beatEvents[0];
    let minDist = Number.POSITIVE_INFINITY;
    for (const b of beatEvents) {
      // Use modulo to handle tiled beats
      const dist = Math.abs((b.timestamp_sec % targetDuration) - t);
      if (dist < minDist) {
        minDist = dist;
        nearest = b;
      }
    }
    // Only assign beat intensity if the nearest beat is within 1 second
    return minDist < 1.0 ? nearest.intensity : 0.5;
  });

  const avgIntensity =
    intensities.reduce((a, b) => a + b, 0) / intensities.length;
  const strongThreshold = avgIntensity * 1.2;

  // Warp: high-intensity cuts stay locked, low-intensity flex toward anchors
  const warped = cutTimes.map((t, i) => {
    const intensity = intensities[i];
    if (intensity >= strongThreshold) return t; // Strong: locked

    // Drift toward nearest strong beat
    const maxDrift = 0.08 * (targetDuration / Math.max(1, cutTimes.length));
    const driftFactor =
      Math.max(0, 1 - intensity / Math.max(avgIntensity, 0.01)) * maxDrift;

    let nearestStrongTime = t;
    let nearestDist = Number.POSITIVE_INFINITY;
    for (let j = 0; j < cutTimes.length; j++) {
      if (
        intensities[j] >= strongThreshold &&
        Math.abs(cutTimes[j] - t) < nearestDist &&
        j !== i
      ) {
        nearestDist = Math.abs(cutTimes[j] - t);
        nearestStrongTime = cutTimes[j];
      }
    }

    const direction = Math.sign(nearestStrongTime - t);
    return t + direction * driftFactor;
  });

  // Re-sort and de-duplicate (no two cuts within MIN_CUT_GAP)
  return warped
    .filter((t) => t > 0.05 && t < targetDuration - 0.05)
    .sort((a, b) => a - b)
    .filter((t, i, arr) => i === 0 || t - arr[i - 1] >= MIN_CUT_GAP);
}

// ─────────────────────────────────────────────────────────────────────────────
// Beat-Synced Cut Point Builder
// ─────────────────────────────────────────────────────────────────────────────
//
// Merges audio beat onsets and shot-detection hard-cuts into a single
// de-duplicated, sorted timeline of cut points.
//
// PRIORITY ORDER:
//   1. Beat onsets (from audio analysis) — these are the rhythmic
//      anchor points that make the output feel music-driven.
//   2. Shot boundaries (from shot detection) — these fill visual gaps
//      where no beat was detected, preventing long static holds.
//
// DE-DUPLICATION:
//   Any two cut points within MIN_CUT_GAP seconds of each other are
//   merged (the earlier one wins).  This prevents micro-stutter from
//   near-simultaneous beat + shot triggers.
//
// GAP FILLING:
//   If any gap between consecutive cuts exceeds MAX_GAP_SEC, synthetic
//   mid-point cuts are inserted to keep the energy high.
// ─────────────────────────────────────────────────────────────────────────────

/** Minimum gap between two cut points (seconds) — v10.3: 0.08s for short-segment beat syncing */
const MIN_CUT_GAP = 0.08;

/**
 * Build a unified, beat-synced cut point list from audio beats + shot cuts.
 *
 * @param beatEvents    BeatEvent[] from audio analysis
 * @param hardCuts      ShotBoundary[] (pre-filtered for hard_cut type)
 * @param targetDuration Total duration of the target video
 * @param refDuration   Duration of the reference video
 * @returns Sorted array of cut-point timestamps (seconds)
 */
function buildShotOnlyCutPoints(
  hardCuts: ShotBoundary[],
  targetDuration: number,
  refDuration: number
): number[] {
  // Only use TransNetV2 shot boundaries — NO beat events, NO gap filling.
  // This produces clean cuts at actual scene changes only.
  const rawCuts: number[] = [];
  const scale = targetDuration / Math.max(refDuration, 0.1);

  for (const cut of hardCuts) {
    const mapped = cut.timestamp_sec * scale;
    if (mapped > 0.1 && mapped < targetDuration - 0.1) {
      rawCuts.push(mapped);
    }
  }

  if (rawCuts.length === 0) return [];

  // Sort and de-duplicate with MIN_CUT_GAP = 0.5s
  const sorted = [
    ...new Set(rawCuts.map((t) => Number.parseFloat(t.toFixed(3)))),
  ].sort((a, b) => a - b);

  const deduped: number[] = [];
  let lastCut = Number.NEGATIVE_INFINITY;
  for (const t of sorted) {
    if (t - lastCut >= MIN_CUT_GAP) {
      deduped.push(t);
      lastCut = t;
    }
  }

  return deduped;
}

// ─────────────────────────────────────────────────────────────────────────────
// Transition Preset Assignment & FFmpeg Filter Rendering
// ─────────────────────────────────────────────────────────────────────────────
//
// Each transition preset is mapped to a real FFmpeg filter expression
// that modifies the first few frames of an incoming segment, creating
// the visual transition effect at the cut point.
//
// PRESETS RENDERED:
//   zoom_hit       — zoompan with scale 1→1.15 over ~3 frames
//   zoom_out_hit   — zoompan with scale 1.15→1.0 over ~3 frames
//   flash          — eq brightness spike (×3) fading to normal over ~2-3 frames
//   whip_pan       — boxblur horizontal spike fading to 0 over ~4 frames
//   luma_fade      — eq brightness×1.5 fading to normal over ~4 frames
//   glitch         — rgbashift with offset decaying over ~2 frames
//   cross_blur     — boxblur 0→sigma→0 over ~4 frames
//   motion_blur_swipe — directional avgblur spike over ~3 frames
//   rgb_split      — rgbashift with larger offset, decaying
//   wipe / slide   — rendered as flash (FFmpeg wipe requires 2 inputs)
// ─────────────────────────────────────────────────────────────────────────────

/** Transition preset definition for FFmpeg rendering */
interface TransitionAssignment {
  kind: string;
  effectDurationSec: number;
  intensity: number;
  blurSigma?: number;
  brightnessSpikeMultiplier?: number;
  glitchOffsetPx?: number;
  scaleFrom?: number;
  scaleTo?: number;
}

/**
 * Assign a transition preset to each segment based on beat intensity
 * at the cut point.  Returns an array parallel to `segments` — null
 * for the first segment (no transition) or when no beat matches.
 */
function assignTransitionPresets(
  cutTimes: number[],
  beatEvents: BeatEvent[],
  segments: Array<{ start: number; end: number }>
): Array<TransitionAssignment | null> {
  // High-energy presets (intensity ≥ 0.7)
  const highPresets: TransitionAssignment[] = [
    {
      kind: "zoom_hit",
      effectDurationSec: 0.1,
      intensity: 1,
      scaleFrom: 1.0,
      scaleTo: 1.15,
    },
    {
      kind: "flash",
      effectDurationSec: 0.08,
      intensity: 1,
      brightnessSpikeMultiplier: 3.0,
    },
    {
      kind: "rgb_split",
      effectDurationSec: 0.08,
      intensity: 1,
      glitchOffsetPx: 12,
    },
  ];

  // Medium-energy presets (intensity 0.4–0.7)
  const medPresets: TransitionAssignment[] = [
    {
      kind: "whip_pan",
      effectDurationSec: 0.12,
      intensity: 0.7,
      blurSigma: 25,
    },
    {
      kind: "glitch",
      effectDurationSec: 0.06,
      intensity: 0.7,
      glitchOffsetPx: 8,
    },
    {
      kind: "motion_blur_swipe",
      effectDurationSec: 0.1,
      intensity: 0.7,
      blurSigma: 30,
    },
    {
      kind: "zoom_out_hit",
      effectDurationSec: 0.1,
      intensity: 0.7,
      scaleFrom: 1.15,
      scaleTo: 1.0,
    },
  ];

  // Low-energy presets (intensity < 0.4)
  const lowPresets: TransitionAssignment[] = [
    {
      kind: "cross_blur",
      effectDurationSec: 0.14,
      intensity: 0.4,
      blurSigma: 8,
    },
    {
      kind: "luma_fade",
      effectDurationSec: 0.15,
      intensity: 0.4,
      brightnessSpikeMultiplier: 1.5,
    },
  ];

  const assignments: Array<TransitionAssignment | null> = [];

  for (let i = 0; i < segments.length; i++) {
    if (i === 0) {
      assignments.push(null);
      continue;
    }

    const cutTime = segments[i].start;

    // Find nearest beat to this cut point
    let nearestBeat: BeatEvent | null = null;
    let nearestDist = Number.POSITIVE_INFINITY;
    for (const b of beatEvents) {
      const dist = Math.abs(b.timestamp_sec - cutTime);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestBeat = b;
      }
    }

    const beatIntensity =
      nearestBeat && nearestDist < 0.5 ? nearestBeat.intensity : 0.3;

    // Select preset based on intensity
    let pool: TransitionAssignment[];
    if (beatIntensity >= 0.7) {
      pool = highPresets;
    } else if (beatIntensity >= 0.4) {
      pool = medPresets;
    } else {
      pool = lowPresets;
    }

    // Cycle through the pool to avoid repetitive transitions
    const preset = { ...pool[i % pool.length], intensity: beatIntensity };
    assignments.push(preset);
  }

  return assignments;
}

/**
 * Build an FFmpeg filter expression for a transition effect applied
 * to the HEAD of a segment (first few frames after a cut).
 *
 * Uses the `enable` option with `between(t,0,dur)` to limit the
 * effect to only the first `effectDurationSec` seconds of the segment.
 *
 * @param transition  The transition preset to render
 * @param segDuration Duration of the segment in seconds
 * @returns FFmpeg filter string or null if unsupported
 */
function buildTransitionFilter(
  transition: TransitionAssignment,
  segDuration: number
): string | null {
  const dur = Math.min(transition.effectDurationSec, segDuration * 0.3);
  if (dur < 0.02) return null;

  const enableExpr = `enable='between(t,0,${dur.toFixed(3)})'`;

  switch (transition.kind) {
    // ── Zoom Hit: scale spike 1→1.15 ────────────────────────────────
    case "zoom_hit": {
      // Use a brief scale>1 with zoompan to create a "punch" effect
      // Limit to the first few frames via enable
      const scale = (transition.scaleTo ?? 1.15).toFixed(2);
      return `zoompan=z='if(between(on,0,${Math.round(dur * 30)}),${scale},1)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=iw:ih:fps=30`;
    }

    // ── Zoom Out Hit: scale 1.15→1.0 ────────────────────────────────
    case "zoom_out_hit": {
      const scaleStart = (transition.scaleFrom ?? 1.15).toFixed(2);
      const frames = Math.round(dur * 30);
      // Linear interpolation from scaleStart to 1.0
      return `zoompan=z='if(between(on,0,${frames}),${scaleStart}-${((Number.parseFloat(scaleStart) - 1.0) / frames).toFixed(5)}*on,1)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=iw:ih:fps=30`;
    }

    // ── Flash: brightness + contrast spike ──────────────────────────
    case "flash": {
      // v9: Synchronized flash using brightness + contrast for a more
      // dynamic visual punch on every detected beat.  The contrast
      // boost (1.4) adds depth so the flash isn't just a flat white-out.
      const spike = transition.brightnessSpikeMultiplier ?? 3.0;
      // Scale brightness proportionally to spike intensity, capped at 0.35
      const brightVal = Math.min(0.35, 0.25 * (spike / 3.0)).toFixed(2);
      // Contrast boost scales with intensity but floor at 1.4
      const contrastVal = Math.max(1.4, 1.4 * (spike / 3.0)).toFixed(2);
      return `eq=brightness=${brightVal}:contrast=${contrastVal}:${enableExpr}`;
    }

    // ── Whip Pan: horizontal blur spike ─────────────────────────────
    case "whip_pan": {
      const sigma = Math.min(30, transition.blurSigma ?? 25);
      // Horizontal blur (luma X = sigma, luma Y = 1) with enable
      return `boxblur=luma_radius=${sigma}:luma_power=1:${enableExpr}`;
    }

    // ── Luma Fade: gentle brightness lift ───────────────────────────
    case "luma_fade": {
      const mult = transition.brightnessSpikeMultiplier ?? 1.5;
      const brightVal = Math.min(0.5, (mult - 1.0) * 0.4).toFixed(2);
      return `eq=brightness=${brightVal}:${enableExpr}`;
    }

    // ── Glitch: RGB channel offset ──────────────────────────────────
    case "glitch": {
      const offset = Math.min(15, transition.glitchOffsetPx ?? 8);
      // rgbashift creates chromatic aberration by shifting R and B channels
      return `rgbashift=rh=${offset}:bh=${-offset}:${enableExpr}`;
    }

    // ── Cross Blur: gaussian blur spike ─────────────────────────────
    case "cross_blur": {
      const sigma = Math.min(12, transition.blurSigma ?? 8);
      return `boxblur=luma_radius=${sigma}:luma_power=1:${enableExpr}`;
    }

    // ── Motion Blur Swipe: directional blur ─────────────────────────
    case "motion_blur_swipe": {
      const sigma = Math.min(35, transition.blurSigma ?? 30);
      // Horizontal-dominant blur to simulate a swipe
      return `boxblur=luma_radius=${sigma}:luma_power=1:${enableExpr}`;
    }

    // ── RGB Split: chromatic aberration ──────────────────────────────
    case "rgb_split": {
      const offset = Math.min(18, transition.glitchOffsetPx ?? 12);
      return `rgbashift=rh=${offset}:rv=${Math.round(offset / 3)}:bh=${-offset}:bv=${-Math.round(offset / 3)}:${enableExpr}`;
    }

    // ── Wipe / Slide: rendered as flash (requires 2-input xfade, too complex for concat) ──
    case "wipe":
    case "slide": {
      return `eq=brightness=0.25:${enableExpr}`;
    }

    default:
      return null;
  }
}
