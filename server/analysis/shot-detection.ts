/**
 * Advanced Shot-Boundary Detection
 * ─────────────────────────────────
 * Three-signal fusion pipeline has been REMOVED per STRICT ML Validation rules.
 * System now relies 100% on ml_shot_detection.py
 *
 * Output: timestamp timeline with per-cut confidence + per-signal breakdown.
 */

import type { ShotBoundary, ShotDetectionResult } from "../types";
import { cleanTempDir, makeTempDir, writeTempFile } from "../utils/ffmpeg";
import { runMLScript } from "../utils/ml-runner";

// ─────────────────────────────────────────────────────────────────────────────
// ML Shot Detection Types
// ─────────────────────────────────────────────────────────────────────────────

interface MLShotResult {
  shots: Array<{
    start_sec: number;
    end_sec: number;
    confidence: number;
    type: string;
  }>;
  boundaries?: Array<{
    time_sec: number;
    type: string;
    confidence: number;
    score: number;
  }>;
  shotCount: number;
  cutCount: number;
  gradualCount: number;
  avgShotDuration: number;
  minShotDuration?: number;
  maxShotDuration?: number;
  mlModel?: string;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export async function detectShots(
  videoBuffer: Buffer
): Promise<ShotDetectionResult> {
  const t0 = performance.now();
  const tmp = makeTempDir("shot-detect");

  try {
    const videoPath = await writeTempFile(tmp, "input.mp4", videoBuffer);

    // ── ML-first: try CNN-SSIM shot detection via Python ──────────────
    const mlResult = await runMLScript<MLShotResult>(
      "ml_shot_detection.py",
      videoPath,
      ["--fps", "2"],
      120_000 // 120s timeout
    );

    if (
      mlResult &&
      !mlResult.error &&
      mlResult.shots &&
      mlResult.shots.length > 0
    ) {
      console.log(
        `[shot-detect] ML shot detection succeeded: ${mlResult.shotCount} shots, ` +
          `${mlResult.cutCount} cuts, ${mlResult.gradualCount} gradual, model=${mlResult.mlModel}`
      );

      const mlCuts: ShotBoundary[] = (mlResult.boundaries ?? []).map((b) => ({
        timestamp_sec: b.time_sec,
        confidence: b.confidence,
        type:
          b.type === "gradual"
            ? ("gradual_transition" as const)
            : ("hard_cut" as const),
        hist_score: b.score,
        ecr_score: 0,
        td_score: 0,
      }));

      const shotCount = mlResult.shotCount;
      const avgDur = mlResult.avgShotDuration;
      const hardCuts = mlResult.cutCount;
      const gradualCuts = mlResult.gradualCount;

      const pace: ShotDetectionResult["editingPace"] =
        avgDur < 1.5 ? "rapid" : avgDur < 5 ? "moderate" : "slow";

      return {
        cuts: mlCuts,
        shotCount,
        avgShotDurationSec: Number.parseFloat(avgDur.toFixed(2)),
        editingPace: pace,
        hardCutCount: hardCuts,
        gradualTransitionCount: gradualCuts,
        dominantTransitionType:
          hardCuts >= gradualCuts ? "hard_cut" : "gradual_transition",
        processingMs: Math.round(performance.now() - t0),
      };
    }

    throw new Error(
      "[STRICT FAILURE] ML shot detection failed. No synthetic fallbacks allowed."
    );
  } finally {
    cleanTempDir(tmp);
  }
}
