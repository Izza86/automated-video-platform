/**
 * Motion / Velocity Analysis — RAFT-style Optical-Flow Pipeline  (v2)
 *
 * Modified to enforce STRICT ML Validation. All synthetic fallbacks
 * have been removed. Relies 100% on ml_motion_analysis.py.
 */

import type {
  JhatkaEvent,
  MotionAnalysisResult,
  VelocitySegment,
  VelocityTimelinePoint,
} from "../types";
import {
  cleanTempDir,
  makeTempDir,
  mean,
  writeTempFile,
} from "../utils/ffmpeg";
import { runMLScript } from "../utils/ml-runner";

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const SPEED_RAMP_VARIANCE = 0.06;
const CINEMATIC_LO = 0.12;
const CINEMATIC_HI = 0.52;

// ─────────────────────────────────────────────────────────────────────────────
// ML Motion Analysis Types
// ─────────────────────────────────────────────────────────────────────────────

interface MLMotionResult {
  velocitySegments: Array<{
    start_sec: number;
    end_sec: number;
    level: string;
    avgMagnitude: number;
    maxMagnitude?: number;
  }>;
  motionTimeline?: Array<{
    time_sec: number;
    meanMagnitude: number;
    maxMagnitude: number;
    medianMagnitude?: number;
    motionArea?: number;
    dominantDirection?: number;
    frameDiff?: number;
    zoomSpeed?: number;
    camera?: { panX: number; panY: number; type: string; magnitude: number };
  }>;
  overallIntensity: number;
  complexity: number;
  style: string;
  dominantCameraMotion?: string;
  avgMagnitude: number;
  maxMagnitude: number;
  avgMotionArea?: number;
  avgFrameDiff?: number;
  segmentCount: number;
  frameCount: number;
  analysisFps: number;
  duration: number;
  resolution?: { width: number; height: number };
  zoomTimeline?: Array<{ time_sec: number; zoomSpeed: number }>;
  avgZoomSpeed?: number;
  maxZoomSpeed?: number;
  dominantZoom?: string;
  mlModel?: string;
  error?: string;
}

function mlLevelToLabel(level: string): VelocitySegment["label"] {
  switch (level) {
    case "static":
      return "freeze";
    case "slow":
      return "slow-mo";
    case "moderate":
      return "normal";
    case "fast":
      return "fast";
    case "intense":
      return "hyper";
    default:
      return "normal";
  }
}

function mlStyleToMotionStyle(
  style: string
): MotionAnalysisResult["motionStyle"] {
  switch (style) {
    case "static":
      return "static";
    case "slow":
      return "smooth";
    case "moderate":
      return "smooth";
    case "dynamic":
      return "dynamic";
    case "intense":
      return "chaotic";
    default:
      return "smooth";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export async function analyzeMotion(
  videoBuffer: Buffer
): Promise<MotionAnalysisResult> {
  const t0 = performance.now();
  const tmp = makeTempDir("motion");

  try {
    const videoPath = await writeTempFile(tmp, "input.mp4", videoBuffer);

    // ── ML-first: RAFT Optical Flow at 30 FPS via Python ──────────────
    const mlResult = await runMLScript<MLMotionResult>(
      "ml_motion_analysis.py",
      videoPath,
      ["--fps", "30"],
      600_000 // 600s timeout — RAFT dense optical flow at 30 FPS
    );

    if (
      mlResult &&
      !mlResult.error &&
      mlResult.velocitySegments &&
      mlResult.velocitySegments.length > 0
    ) {
      console.log(
        `[motion] ML motion analysis succeeded: ${mlResult.segmentCount} segments, ` +
          `intensity=${mlResult.overallIntensity}, style=${mlResult.style}, model=${mlResult.mlModel}`
      );

      const mlSegments: VelocitySegment[] = mlResult.velocitySegments.map(
        (s) => ({
          start_sec: round3(s.start_sec),
          end_sec: round3(s.end_sec),
          relative_speed: round3(
            s.avgMagnitude / Math.max(mlResult.avgMagnitude, 0.1)
          ),
          label: mlLevelToLabel(s.level),
        })
      );

      const baseline = mlResult.avgMagnitude || 1;
      const mlTimeline: VelocityTimelinePoint[] = (
        mlResult.motionTimeline ?? []
      ).map((t) => ({
        time_sec: round3(t.time_sec),
        magnitude: round3(t.meanMagnitude),
        relative_speed: round3(t.meanMagnitude / Math.max(baseline, 0.1)),
      }));

      // Detect jhatkas from ML timeline
      const jhatkas = detectJhatkas(mlTimeline, baseline);

      const segmentDistribution: Record<VelocitySegment["label"], number> = {
        freeze: 0,
        "slow-mo": 0,
        normal: 0,
        fast: 0,
        hyper: 0,
      };
      for (const seg of mlSegments) {
        segmentDistribution[seg.label]++;
      }

      const motionIntensity = round3(Math.min(1, mlResult.overallIntensity));
      const speeds = mlSegments.map((s) => s.relative_speed);
      const avgSpeed = speeds.length > 0 ? mean(speeds) : 1.0;
      const speedVariance =
        speeds.length > 1 ? mean(speeds.map((s) => (s - avgSpeed) ** 2)) : 0;
      const hasSpeedRamp =
        speedVariance > SPEED_RAMP_VARIANCE || jhatkas.length >= 2;

      return {
        velocitySegments: mlSegments,
        hasSpeedRamp,
        avgRelativeSpeed: round3(avgSpeed),
        motionIntensity,
        motionStyle: mlStyleToMotionStyle(mlResult.style),
        isCinematic:
          motionIntensity >= CINEMATIC_LO &&
          motionIntensity <= CINEMATIC_HI &&
          !hasSpeedRamp,
        velocityTimeline: mlTimeline,
        jhatkas,
        jhatkaCount: jhatkas.length,
        peakMagnitude: round3(mlResult.maxMagnitude),
        segmentDistribution,
        zoomTimeline: mlResult.zoomTimeline ?? [],
        avgZoomSpeed: mlResult.avgZoomSpeed ?? 0,
        maxZoomSpeed: mlResult.maxZoomSpeed ?? 0,
        dominantZoom:
          (mlResult.dominantZoom as "zoom-in" | "zoom-out" | "none") ?? "none",
        motionTimeline: (mlResult.motionTimeline ?? []).map((t) => {
          if (!t.camera) {
            throw new Error(
              "[STRICT FAILURE] Missing camera vectors in ML motion timeline."
            );
          }
          return {
            time_sec: round3(t.time_sec),
            meanMagnitude: round3(t.meanMagnitude),
            zoomSpeed: round3(t.zoomSpeed ?? 0),
            camera: {
              panX: round3(t.camera.panX),
              panY: round3(t.camera.panY),
              type: t.camera.type,
              magnitude: round3(t.camera.magnitude),
            },
          };
        }),
        avgShakeMagnitude: (() => {
          const mags = (mlResult.motionTimeline ?? [])
            .map((t) => t.camera?.magnitude ?? 0)
            .filter((m) => m > 0);
          return mags.length > 0
            ? round3(mags.reduce((a, b) => a + b, 0) / mags.length)
            : 0;
        })(),
        hasHandheldShake: (() => {
          const mags = (mlResult.motionTimeline ?? [])
            .map((t) => t.camera?.magnitude ?? 0)
            .filter((m) => m > 0);
          const avg =
            mags.length > 0 ? mags.reduce((a, b) => a + b, 0) / mags.length : 0;
          return avg > 0.005;
        })(),
        processingMs: Math.round(performance.now() - t0),
      };
    }

    throw new Error(
      "[STRICT FAILURE] ML motion analysis failed. No synthetic fallbacks allowed."
    );
  } finally {
    cleanTempDir(tmp);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Auxiliary ML Functions
// ─────────────────────────────────────────────────────────────────────────────

const JHATKA_DELTA_THRESHOLD = 0.1;
const JHATKA_COOLDOWN_SEC = 0.3;

function detectJhatkas(
  timeline: VelocityTimelinePoint[],
  baseline: number
): JhatkaEvent[] {
  if (timeline.length < 3) return [];

  const events: JhatkaEvent[] = [];
  let lastJhatkaTime = Number.NEGATIVE_INFINITY;

  for (let i = 1; i < timeline.length; i++) {
    const prev = timeline[i - 1];
    const curr = timeline[i];
    const delta = curr.relative_speed - prev.relative_speed;
    const absDelta = Math.abs(delta);

    if (
      absDelta >= JHATKA_DELTA_THRESHOLD &&
      curr.time_sec - lastJhatkaTime >= JHATKA_COOLDOWN_SEC
    ) {
      events.push({
        timestamp_sec: round3(curr.time_sec),
        speed_before: round3(prev.relative_speed),
        speed_after: round3(curr.relative_speed),
        delta: round3(absDelta),
        direction: delta > 0 ? "accelerate" : "decelerate",
      });
      lastJhatkaTime = curr.time_sec;
    }
  }

  return events;
}

function round3(n: number): number {
  return Number.parseFloat(n.toFixed(3));
}
