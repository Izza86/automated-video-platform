/**
 * Motion-Based Micro-Cut Detection
 *
 * Fallback pacing engine for when TransNetV2 detects ≤1 shot.
 * Uses optical flow variance to detect implicit cut moments:
 * - motion spikes (sudden velocity peaks)
 * - histogram discontinuities (color palette shifts)
 * - luminance deltas (brightness changes)
 *
 * When any indicator crosses threshold, emit a synthetic cut point
 * or micro-zoom to simulate reference pacing.
 */

import type { ColorGradingResult, MotionAnalysisResult } from "../types";

export interface MotionMicroCut {
  /** Timestamp in reference video (seconds) */
  timestamp_sec: number;
  /** Indicator that triggered: "motion_spike" | "histogram_discontinuity" | "luminance_delta" */
  trigger: "motion_spike" | "histogram_discontinuity" | "luminance_delta";
  /** 0–1 confidence of the cut */
  confidence: number;
  /** Suggested action: "hard_cut" | "micro_zoom" | "brightness_pulse" */
  action: "hard_cut" | "micro_zoom" | "brightness_pulse";
  /** For micro-zoom: suggested zoom factor (1.0 = no zoom) */
  zoomFactor?: number;
  /** For brightness_pulse: luminance delta (e.g. +0.15 for brightening) */
  luminanceDelta?: number;
}

export interface MotionMicroCutDetectionResult {
  microCuts: MotionMicroCut[];
  hasSignificantMotion: boolean;
  avgMotionSpikeMagnitude: number;
  histogramShiftCount: number;
  luminanceDeltaCount: number;
}

/**
 * Detect motion spikes from optical flow variance.
 * A spike occurs when velocity changes abruptly (high jerk).
 *
 * @param motionAnalysis   Optical flow data (velocityTimeline)
 * @param threshold        Velocity percentile threshold (e.g. 0.75)
 * @returns Array of micro-cuts triggered by motion spikes
 */
export function detectMotionSpikes(
  motionAnalysis: MotionAnalysisResult,
  threshold = 0.75
): MotionMicroCut[] {
  const microCuts: MotionMicroCut[] = [];

  if (
    !motionAnalysis.velocityTimeline ||
    motionAnalysis.velocityTimeline.length < 2
  ) {
    return microCuts;
  }

  const velocities = motionAnalysis.velocityTimeline.map(
    (v) => v.relative_speed || 0
  );

  // Compute percentile threshold
  const sorted = [...velocities].sort((a, b) => a - b);
  const thresholdVal = sorted[Math.floor(sorted.length * threshold)];

  // Detect spikes as local maxima exceeding threshold
  for (let i = 1; i < velocities.length - 1; i++) {
    const prev = velocities[i - 1];
    const curr = velocities[i];
    const next = velocities[i + 1];

    // Local maximum that exceeds threshold
    if (curr > prev && curr > next && curr > thresholdVal) {
      const jerk = Math.abs(curr - prev) + Math.abs(next - curr);
      const confidence = Math.min(1.0, (curr - thresholdVal) / thresholdVal);

      microCuts.push({
        timestamp_sec: motionAnalysis.velocityTimeline[i].time_sec,
        trigger: "motion_spike",
        confidence,
        action: curr > thresholdVal * 1.5 ? "hard_cut" : "micro_zoom",
        zoomFactor: 1 + confidence * 0.15, // Subtle zoom
      });
    }
  }

  return microCuts;
}

/**
 * Detect histogram discontinuities (sudden color palette shifts).
 * Compare CDF curves frame-to-frame; large divergences indicate cuts.
 *
 * @param colorGrading Color analysis with histogram CDF data
 * @param histThreshold Threshold for CDF divergence (e.g. 0.3)
 * @returns Array of micro-cuts triggered by histogram shifts
 */
export function detectHistogramDiscontinuities(
  colorGrading: ColorGradingResult,
  histThreshold = 0.3
): MotionMicroCut[] {
  const microCuts: MotionMicroCut[] = [];

  // If we have temporal color samples, check for jumps between adjacent samples
  if (
    !colorGrading.temporalSamples ||
    colorGrading.temporalSamples.length < 2
  ) {
    return microCuts;
  }

  const samples = colorGrading.temporalSamples;

  for (let i = 1; i < samples.length; i++) {
    const prevSample = samples[i - 1];
    const currSample = samples[i];

    // Compute CDF divergence (simple L1 distance on quantiles)
    let divergence = 0;
    // Use contrast + saturation shift as histogram discontinuity proxy
    const contrastDiff = Math.abs(prevSample.contrast - currSample.contrast);
    const saturationDiff = Math.abs(
      prevSample.saturation - currSample.saturation
    );
    divergence = (contrastDiff + saturationDiff) / 2;

    // If divergence exceeds threshold, flag as discontinuity
    if (divergence > histThreshold) {
      microCuts.push({
        timestamp_sec: currSample.time_sec,
        trigger: "histogram_discontinuity",
        confidence: Math.min(1.0, divergence / (histThreshold * 2)),
        action: "hard_cut",
      });
    }
  }

  return microCuts;
}

/**
 * Detect luminance deltas (brightness changes).
 * Large frame-to-frame changes can indicate cuts or exposure shifts.
 *
 * @param colorGrading Color analysis with luminance data
 * @param lumaThreshold Threshold for luma jump (e.g. 0.25)
 * @returns Array of micro-cuts triggered by luminance changes
 */
export function detectLuminanceDeltas(
  colorGrading: ColorGradingResult,
  lumaThreshold = 0.25
): MotionMicroCut[] {
  const microCuts: MotionMicroCut[] = [];

  if (
    !colorGrading.temporalSamples ||
    colorGrading.temporalSamples.length < 2
  ) {
    return microCuts;
  }

  const samples = colorGrading.temporalSamples;

  for (let i = 1; i < samples.length; i++) {
    const prevSample = samples[i - 1];
    const currSample = samples[i];

    // Extract luminance (Y in YCbCr, or compute from RGB)
    const prevLuma = prevSample.brightness ?? 0.5;
    const currLuma = currSample.brightness ?? 0.5;
    const lumaDelta = Math.abs(currLuma - prevLuma);

    if (lumaDelta > lumaThreshold) {
      const confidence = Math.min(1.0, lumaDelta / (lumaThreshold * 2));

      microCuts.push({
        timestamp_sec: currSample.time_sec,
        trigger: "luminance_delta",
        confidence,
        action:
          lumaDelta > lumaThreshold * 1.5 ? "hard_cut" : "brightness_pulse",
        luminanceDelta: currLuma - prevLuma,
      });
    }
  }

  return microCuts;
}

/**
 * Unified fallback pacing detection.
 * Runs all three detectors and merges results, filtering by confidence.
 *
 * @param motionAnalysis Motion/optical flow data
 * @param colorGrading   Color/histogram data
 * @param minConfidence  Only include cuts above this confidence (default 0.5)
 * @returns Merged set of micro-cuts with duplicate deduplication (±100ms)
 */
export function detectFallbackPacing(
  motionAnalysis: MotionAnalysisResult,
  colorGrading: ColorGradingResult,
  minConfidence = 0.5
): MotionMicroCutDetectionResult {
  const motionSpikes = detectMotionSpikes(motionAnalysis);
  const histDisc = detectHistogramDiscontinuities(colorGrading);
  const lumaDeltas = detectLuminanceDeltas(colorGrading);

  // Merge all micro-cuts
  let allCuts = [...motionSpikes, ...histDisc, ...lumaDeltas];

  // Filter by confidence
  allCuts = allCuts.filter((cut) => cut.confidence >= minConfidence);

  // Sort by timestamp
  allCuts.sort((a, b) => a.timestamp_sec - b.timestamp_sec);

  // Deduplicate: if two cuts are within ±100ms, keep the highest confidence
  const deduped: MotionMicroCut[] = [];
  for (const cut of allCuts) {
    const existingIdx = deduped.findIndex(
      (c) => Math.abs(c.timestamp_sec - cut.timestamp_sec) < 0.1
    );
    if (existingIdx >= 0) {
      if (cut.confidence > deduped[existingIdx].confidence) {
        deduped[existingIdx] = cut;
      }
    } else {
      deduped.push(cut);
    }
  }

  const hasSignificantMotion = motionAnalysis.motionIntensity > 0.3;
  const avgMotionSpikeMagnitude =
    motionSpikes.length > 0
      ? motionSpikes.reduce((sum, c) => sum + c.confidence, 0) /
        motionSpikes.length
      : 0;

  return {
    microCuts: deduped,
    hasSignificantMotion,
    avgMotionSpikeMagnitude,
    histogramShiftCount: histDisc.length,
    luminanceDeltaCount: lumaDeltas.length,
  };
}
