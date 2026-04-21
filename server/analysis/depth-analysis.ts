/**
 * Depth Analysis Module — Monocular Depth Estimation
 *
 * Uses a Python ML script (ml_depth_analysis.py) to estimate per-frame
 * depth maps via monocular depth models (Depth-Anything V2 / MiDaS).
 *
 * When the ML script is unavailable, falls back to a lightweight FFmpeg
 * heuristic that estimates depth from focus/blur variance.
 *
 * Returns a `DepthAnalysisResult` with per-frame depth timeline,
 * foreground-background separation metrics, and parallax classification.
 */

import type { DepthAnalysisResult, DepthFrameSample } from "../types/index";
import {
  cleanTempDir,
  execAsync,
  makeTempDir,
  probeVideo,
  resolveFfmpeg,
  safeExe,
  writeTempFile,
} from "../utils/ffmpeg";
import { runMLScript } from "../utils/ml-runner";

// ─────────────────────────────────────────────────────────────────────────────
// ML Script Interface
// ─────────────────────────────────────────────────────────────────────────────

interface MLDepthResult {
  error?: string;
  mlModel?: string;
  depthTimeline?: Array<{
    time_sec: number;
    meanDepth: number;
    depthVariance: number;
    fgBgSeparation: number;
  }>;
  avgFgBgSeparation?: number;
  avgMeanDepth?: number;
  hasStrongParallax?: boolean;
  depthStyle?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Analyse a video for depth/parallax characteristics.
 *
 * @param videoBuffer  Raw bytes of the video file
 * @returns `DepthAnalysisResult` with timeline and classification
 */
export async function analyzeDepth(
  videoBuffer: Buffer
): Promise<DepthAnalysisResult> {
  const t0 = performance.now();
  const tmp = makeTempDir("depth-analysis");

  try {
    const videoPath = await writeTempFile(tmp, "input.mp4", videoBuffer);

    // ── ML-first: try depth estimation via Python ──────────────────────
    const mlResult = await runMLScript<MLDepthResult>(
      "ml_depth_analysis.py",
      videoPath,
      ["--fps", "2", "--model", "depth-anything-v2"],
      600_000 // 10 min timeout
    );

    if (
      mlResult &&
      !mlResult.error &&
      mlResult.depthTimeline &&
      mlResult.depthTimeline.length > 0
    ) {
      console.log(
        `[depth-analysis] ML depth succeeded: ${mlResult.depthTimeline.length} frames, ` +
          `model=${mlResult.mlModel}, parallax=${mlResult.hasStrongParallax}`
      );

      const depthTimeline: DepthFrameSample[] = mlResult.depthTimeline.map(
        (f) => ({
          time_sec: f.time_sec,
          meanDepth: f.meanDepth,
          depthVariance: f.depthVariance,
          fgBgSeparation: f.fgBgSeparation,
        })
      );

      const depthStyle = classifyDepthStyle(
        mlResult.avgFgBgSeparation ?? 0,
        depthTimeline
      );

      return {
        depthTimeline,
        avgFgBgSeparation: mlResult.avgFgBgSeparation ?? 0,
        hasStrongParallax: mlResult.hasStrongParallax ?? false,
        depthStyle,
        avgMeanDepth: mlResult.avgMeanDepth ?? 0.5,
        processingMs: Math.round(performance.now() - t0),
      };
    }

    console.log(
      "[depth-analysis] ML depth unavailable, falling back to FFmpeg blur-variance heuristic"
    );

    // ── FFmpeg fallback: estimate depth from blur variance ─────────────
    return await ffmpegDepthFallback(videoPath, t0);
  } finally {
    cleanTempDir(tmp);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FFmpeg Fallback — Blur Variance Heuristic
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Estimate depth-of-field characteristics from FFmpeg blur detection.
 * High blur variance between frame regions → shallow DOF → strong parallax.
 */
async function ffmpegDepthFallback(
  videoPath: string,
  t0: number
): Promise<DepthAnalysisResult> {
  try {
    const ffmpeg = await resolveFfmpeg();
    const exe = safeExe(ffmpeg);
    const probe = await probeVideo(videoPath);

    // Sample at 2fps, analyze blur variance
    const cmd = [
      exe,
      `-t ${Math.min(probe.duration, 30)} -i "${videoPath}"`,
      `-vf "fps=2,blurdetect=low=0.1:high=0.3:radius=50"`,
      "-f null -",
    ].join(" ");

    const res = await execAsync(cmd, { maxBuffer: 30 * 1024 * 1024 });
    const combined = (res.stdout ?? "") + "\n" + (res.stderr ?? "");

    // Parse blur scores from blurdetect output
    const blurMatches = combined.match(/blur=([\d.]+)/g) ?? [];
    const blurScores = blurMatches.map((m) => {
      const val = m.match(/blur=([\d.]+)/);
      return val ? Number.parseFloat(val[1]) : 0;
    });

    if (blurScores.length === 0) {
      return defaultDepthResult(t0);
    }

    const avgBlur = blurScores.reduce((a, b) => a + b, 0) / blurScores.length;
    const blurVariance =
      blurScores.reduce((acc, b) => acc + (b - avgBlur) ** 2, 0) /
      blurScores.length;

    // High blur variance → shallow DOF → strong fg/bg separation
    const fgBgSeparation = Math.min(1, blurVariance * 10);
    const hasStrongParallax = fgBgSeparation > 0.4;

    const depthTimeline: DepthFrameSample[] = blurScores.map((b, i) => ({
      time_sec: i * 0.5,
      meanDepth: Math.min(1, b),
      depthVariance: Math.abs(b - avgBlur),
      fgBgSeparation: Math.min(1, Math.abs(b - avgBlur) * 5),
    }));

    return {
      depthTimeline,
      avgFgBgSeparation: fgBgSeparation,
      hasStrongParallax,
      depthStyle: classifyDepthStyle(fgBgSeparation, depthTimeline),
      avgMeanDepth: avgBlur,
      processingMs: Math.round(performance.now() - t0),
    };
  } catch (err) {
    // v7.1: Graceful fallback — log error but NEVER block the render.
    // Return a flat default so the orchestrator + edit-transfer proceed
    // with full Extreme Mode settings even without depth data.
    console.error(
      "[depth-analysis] Both ML depth and FFmpeg fallback FAILED. " +
        "Returning flat default — render will proceed without depth.",
      err instanceof Error ? err.message : err
    );
    return defaultDepthResult(t0);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function classifyDepthStyle(
  avgSeparation: number,
  timeline: DepthFrameSample[]
): DepthAnalysisResult["depthStyle"] {
  // Check for focus racking (high variance in fgBgSeparation over time)
  if (timeline.length > 4) {
    const sepValues = timeline.map((f) => f.fgBgSeparation);
    const sepMean = sepValues.reduce((a, b) => a + b, 0) / sepValues.length;
    const sepVariance =
      sepValues.reduce((acc, v) => acc + (v - sepMean) ** 2, 0) /
      sepValues.length;
    if (sepVariance > 0.04) return "racking";
  }

  if (avgSeparation > 0.6) return "shallow-dof";
  if (avgSeparation > 0.25) return "deep-focus";
  return "flat";
}

function defaultDepthResult(t0: number): DepthAnalysisResult {
  return {
    depthTimeline: [],
    avgFgBgSeparation: 0,
    hasStrongParallax: false,
    depthStyle: "flat",
    avgMeanDepth: 0.5,
    processingMs: Math.round(performance.now() - t0),
  };
}
