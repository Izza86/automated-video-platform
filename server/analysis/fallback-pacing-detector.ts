/**
 * Fallback Pacing Orchestrator
 *
 * When TransNetV2 detects ≤1 hard cut:
 *   1. Extract motion spikes, histogram discontinuities, luminance deltas
 *   2. Generate synthetic cut points or micro-zooms
 *   3. Simulate reference pacing on target video
 *
 * Returns enhanced shot boundaries for StyleDNA integration.
 */

import type {
  ColorGradingResult,
  MotionAnalysisResult,
  ShotBoundary,
} from "../types";
import {
  detectFallbackPacing,
  type MotionMicroCutDetectionResult,
} from "./motion-micro-cuts";

export interface FallbackPacingResult {
  /** Synthetic shot boundaries generated from motion + color analysis */
  syntheticBoundaries: ShotBoundary[];
  /** Underlying motion micro-cut detection result */
  detectionResult: MotionMicroCutDetectionResult;
  /** Whether fallback was triggered (hardCutCount ≤ 1) */
  fallbackTriggered: boolean;
  /** Explanation of why fallback was triggered */
  reason: string;
}

/**
 * Orchestrate fallback pacing detection.
 * If hard cut count is ≤1, run motion/color detectors and generate synthetic cuts.
 *
 * @param originalBoundaries Existing shot boundaries from TransNetV2
 * @param motionAnalysis     Optical flow data
 * @param colorGrading       Color/histogram data
 * @param videoDuration      Total video duration (seconds)
 * @returns Enhanced shot boundaries + detection metadata
 */
export function orchestrateFallbackPacing(
  originalBoundaries: ShotBoundary[],
  motionAnalysis: MotionAnalysisResult,
  colorGrading: ColorGradingResult,
  videoDuration: number
): FallbackPacingResult {
  const hardCutCount = originalBoundaries.filter(
    (b) => b.type === "hard_cut"
  ).length;

  // Trigger fallback if ≤1 hard cuts detected
  const fallbackTriggered = hardCutCount <= 1;

  if (!fallbackTriggered) {
    return {
      syntheticBoundaries: originalBoundaries,
      detectionResult: {
        microCuts: [],
        hasSignificantMotion: false,
        avgMotionSpikeMagnitude: 0,
        histogramShiftCount: 0,
        luminanceDeltaCount: 0,
      },
      fallbackTriggered: false,
      reason: `Sufficient hard cuts detected (${hardCutCount}), no fallback needed`,
    };
  }

  // Run fallback detection
  const detectionResult = detectFallbackPacing(motionAnalysis, colorGrading);

  // Convert micro-cuts to synthetic shot boundaries
  const syntheticBoundaries: ShotBoundary[] = [];

  for (const microCut of detectionResult.microCuts) {
    // Skip if beyond video duration
    if (microCut.timestamp_sec >= videoDuration) continue;

    const boundary: ShotBoundary = {
      timestamp_sec: microCut.timestamp_sec,
      type: microCut.action === "hard_cut" ? "hard_cut" : "gradual_transition",
      confidence: microCut.confidence,
      reason: `Synthetic (${microCut.trigger})`,
      hist_score: 0,
      ecr_score: 0,
      td_score: 0,
      // Extra fields for editor integration
      synthetic: true,
      microCutMetadata: {
        trigger: microCut.trigger,
        zoomFactor: microCut.zoomFactor,
        luminanceDelta: microCut.luminanceDelta,
      },
    };

    syntheticBoundaries.push(boundary);
  }

  // Merge with original boundaries (synthetic first, then original)
  const merged = [...syntheticBoundaries, ...originalBoundaries];

  // Sort by timestamp and deduplicate (±50ms)
  merged.sort((a, b) => a.timestamp_sec - b.timestamp_sec);
  const deduped: ShotBoundary[] = [];
  for (const boundary of merged) {
    const existingIdx = deduped.findIndex(
      (b) => Math.abs(b.timestamp_sec - boundary.timestamp_sec) < 0.05
    );
    if (existingIdx < 0) {
      deduped.push(boundary);
    } else if (
      !deduped[existingIdx].synthetic &&
      boundary.synthetic &&
      deduped[existingIdx].confidence < boundary.confidence
    ) {
      // Replace lower-confidence original with higher-confidence synthetic
      deduped[existingIdx] = boundary;
    }
  }

  return {
    syntheticBoundaries: deduped,
    detectionResult,
    fallbackTriggered: true,
    reason:
      `Low hard cut count (${hardCutCount}). ` +
      `Generated ${detectionResult.microCuts.length} synthetic cuts from ` +
      `motion (${detectionResult.avgMotionSpikeMagnitude.toFixed(2)}) + ` +
      `histogram (${detectionResult.histogramShiftCount}) + ` +
      `luminance (${detectionResult.luminanceDeltaCount})`,
  };
}
