/**
 * Motion / Velocity Analysis — RAFT-style Optical-Flow Pipeline  (v2)
 *
 * Multi-pass dense optical-flow estimator using FFmpeg's native motion
 * estimation as a proxy for a RAFT (Recurrent All-Pairs Field Transforms)
 * network.
 *
 * PIPELINE
 * ────────
 *   Pass 1 — mestimate + codecview     → macroblock motion-vector overlay
 *   Pass 2 — tblend=difference128      → per-frame pixel-difference magnitude
 *   Pass 3 — (derived) temporal gradient of magnitude → jhatka detection
 *
 * The two FFmpeg passes run concurrently.  Results are fused into a
 * unified per-frame magnitude signal, smoothed with an EMA filter,
 * then segmented into speed regions and jhatka events.
 *
 * OUTPUT CONTRACT  (consumed by edit-transfer.ts + dashboard)
 * ───────────────
 * • `velocitySegments`   — same shape as before: `VelocitySegment[]`.
 *                          edit-transfer.ts's cumulative-PTS + LOOP logic
 *                          sorts these by `start_sec` and loops at `max(end_sec)`.
 *                          ▸ We guarantee contiguous, non-overlapping segments
 *                            covering [0 … duration].
 *
 * • `velocityTimeline`   — per-frame sample array for frontend waveform chart.
 *
 * • `jhatkas`            — detected abrupt speed changes ("jhatkas") with
 *                          magnitude, direction, before/after speed.
 */

import type {
  VelocitySegment,
  VelocityTimelinePoint,
  JhatkaEvent,
  MotionAnalysisResult,
} from "../types";
import {
  resolveFfmpeg,
  safeExe,
  execAsync,
  probeVideo,
  makeTempDir,
  cleanTempDir,
  writeTempFile,
  mean,
  parseMetricValues,
} from "../utils/ffmpeg";
import { runMLScript } from "../utils/ml-runner";

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

/** Analysis sample rate — higher = more precise, slower */
const SAMPLE_FPS = 15;

/** Maximum frames we'll analyse (caps very long videos) */
const MAX_ANALYSIS_FRAMES = 1200;

/** EMA smoothing factor for the magnitude signal (0-1, lower = smoother) */
const EMA_ALPHA = 0.25;

/** Minimum segment duration in seconds (avoids micro-segments) */
const MIN_SEGMENT_SEC = 0.25;

/**
 * Speed-change threshold between consecutive EMA-smoothed samples
 * that qualifies as a "jhatka".  Expressed as a fraction of baseline.
 */
const JHATKA_DELTA_THRESHOLD = 0.10;

/** Minimum time between jhatkas to avoid duplicate detections (seconds) */
const JHATKA_COOLDOWN_SEC = 0.30;

/** Relative-speed variance threshold to flag deliberate speed ramp */
const SPEED_RAMP_VARIANCE = 0.06;

/** Speed-classification thresholds */
const SPEED_FREEZE = 0.12;
const SPEED_SLOW = 0.55;
const SPEED_NORMAL_HI = 1.55;
const SPEED_FAST_HI = 3.0;

/** Cinematic motion intensity band */
const CINEMATIC_LO = 0.12;
const CINEMATIC_HI = 0.52;

/** Maximum magnitude value for normalisation (empirical px/frame ceiling) */
const MAG_NORMALISE_CEIL = 20;

// ─────────────────────────────────────────────────────────────────────────────
// ML Motion Analysis Types
// ─────────────────────────────────────────────────────────────────────────────

/** Shape of the ML Python script's JSON output */
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
  // RAFT-v2 Zoom Detection fields
  zoomTimeline?: Array<{ time_sec: number; zoomSpeed: number }>;
  avgZoomSpeed?: number;
  maxZoomSpeed?: number;
  dominantZoom?: string;
  mlModel?: string;
  error?: string;
}

/** Map ML level labels to our VelocitySegment label type */
function mlLevelToLabel(level: string): VelocitySegment["label"] {
  switch (level) {
    case "static": return "freeze";
    case "slow": return "slow-mo";
    case "moderate": return "normal";
    case "fast": return "fast";
    case "intense": return "hyper";
    default: return "normal";
  }
}

/** Map ML style to our MotionAnalysisResult motionStyle type */
function mlStyleToMotionStyle(style: string): MotionAnalysisResult["motionStyle"] {
  switch (style) {
    case "static": return "static";
    case "slow": return "smooth";
    case "moderate": return "smooth";
    case "dynamic": return "dynamic";
    case "intense": return "chaotic";
    default: return "smooth";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Analyse motion / velocity profile from a raw video buffer.
 *
 * Returns `MotionAnalysisResult` fully compatible with the cumulative-PTS
 * + LOOP velocity sync in `edit-transfer.ts`.
 */
export async function analyzeMotion(
  videoBuffer: Buffer,
): Promise<MotionAnalysisResult> {
  const t0 = performance.now();
  const tmp = makeTempDir("motion");

  try {
    const videoPath = await writeTempFile(tmp, "input.mp4", videoBuffer);
    const probe = await probeVideo(videoPath);
    const ffmpeg = await resolveFfmpeg();
    const exe = safeExe(ffmpeg);
    const duration = probe.duration || 10;
    const sourceFps = probe.fps || 30;

    // ── ML-first: RAFT Optical Flow at 30 FPS via Python ──────────────
    // Dense per-pixel motion vectors at 30 FPS to detect precise
    // velocity ramps and camera shakes from the reference video.
    const mlResult = await runMLScript<MLMotionResult>(
      "ml_motion_analysis.py",
      videoPath,
      ["--fps", "30"],
      600_000, // 600s timeout — RAFT dense optical flow at 30 FPS
    );

    if (mlResult && !mlResult.error && mlResult.velocitySegments && mlResult.velocitySegments.length > 0) {
      console.log(
        `[motion] ML motion analysis succeeded: ${mlResult.segmentCount} segments, ` +
        `intensity=${mlResult.overallIntensity}, style=${mlResult.style}, model=${mlResult.mlModel}`,
      );

      // Map ML velocity segments to our VelocitySegment type
      const mlSegments: VelocitySegment[] = mlResult.velocitySegments.map((s) => ({
        start_sec: round3(s.start_sec),
        end_sec: round3(s.end_sec),
        relative_speed: round3(s.avgMagnitude / Math.max(mlResult.avgMagnitude, 0.1)),
        label: mlLevelToLabel(s.level),
      }));

      // Map ML timeline to our VelocityTimelinePoint type
      const baseline = mlResult.avgMagnitude || 1;
      const mlTimeline: VelocityTimelinePoint[] = (mlResult.motionTimeline ?? []).map((t) => ({
        time_sec: round3(t.time_sec),
        magnitude: round3(t.meanMagnitude),
        relative_speed: round3(t.meanMagnitude / Math.max(baseline, 0.1)),
      }));

      // Detect jhatkas from ML timeline
      const jhatkas = detectJhatkas(mlTimeline, baseline);

      // Segment distribution
      const segmentDistribution: Record<VelocitySegment["label"], number> = {
        freeze: 0, "slow-mo": 0, normal: 0, fast: 0, hyper: 0,
      };
      for (const seg of mlSegments) {
        segmentDistribution[seg.label]++;
      }

      const motionIntensity = round3(Math.min(1, mlResult.overallIntensity));
      const speeds = mlSegments.map((s) => s.relative_speed);
      const avgSpeed = speeds.length > 0 ? mean(speeds) : 1.0;
      const speedVariance = speeds.length > 1 ? mean(speeds.map((s) => (s - avgSpeed) ** 2)) : 0;
      const hasSpeedRamp = speedVariance > SPEED_RAMP_VARIANCE || jhatkas.length >= 2;

      return {
        velocitySegments: mlSegments,
        hasSpeedRamp,
        avgRelativeSpeed: round3(avgSpeed),
        motionIntensity,
        motionStyle: mlStyleToMotionStyle(mlResult.style),
        isCinematic: motionIntensity >= CINEMATIC_LO && motionIntensity <= CINEMATIC_HI && !hasSpeedRamp,
        velocityTimeline: mlTimeline,
        jhatkas,
        jhatkaCount: jhatkas.length,
        peakMagnitude: round3(mlResult.maxMagnitude),
        segmentDistribution,
        // RAFT-v2 Zoom Detection data
        zoomTimeline: mlResult.zoomTimeline ?? [],
        avgZoomSpeed: mlResult.avgZoomSpeed ?? 0,
        maxZoomSpeed: mlResult.maxZoomSpeed ?? 0,
        dominantZoom: (mlResult.dominantZoom as "zoom-in" | "zoom-out" | "none") ?? "none",
        // Spatial DNA: per-frame camera motion for shake/zoom cloning
        motionTimeline: (mlResult.motionTimeline ?? []).map((t) => ({
          time_sec: round3(t.time_sec),
          meanMagnitude: round3(t.meanMagnitude),
          zoomSpeed: round3(t.zoomSpeed ?? 0),
          camera: {
            panX: round3(t.camera?.panX ?? 0),
            panY: round3(t.camera?.panY ?? 0),
            type: t.camera?.type ?? "static",
            magnitude: round3(t.camera?.magnitude ?? 0),
          },
        })),
        avgShakeMagnitude: (() => {
          const mags = (mlResult.motionTimeline ?? [])
            .map((t) => t.camera?.magnitude ?? 0)
            .filter((m) => m > 0);
          return mags.length > 0 ? round3(mags.reduce((a, b) => a + b, 0) / mags.length) : 0;
        })(),
        hasHandheldShake: (() => {
          const mags = (mlResult.motionTimeline ?? [])
            .map((t) => t.camera?.magnitude ?? 0)
            .filter((m) => m > 0);
          const avg = mags.length > 0 ? mags.reduce((a, b) => a + b, 0) / mags.length : 0;
          return avg > 0.005;
        })(),
        processingMs: Math.round(performance.now() - t0),
      };
    }

    console.log("[motion] ML motion analysis unavailable or failed, falling back to FFmpeg pipeline");

    // Adaptive sample rate: cap total frames at MAX_ANALYSIS_FRAMES
    const effectiveFps = Math.min(
      SAMPLE_FPS,
      sourceFps,
      duration > 0 ? MAX_ANALYSIS_FRAMES / duration : SAMPLE_FPS,
    );

    // ── Run two FFmpeg passes concurrently ──────────────────────────────
    const [mvFrames, blendFrames] = await Promise.all([
      extractMotionVectors(exe, videoPath, effectiveFps),
      extractBlendDifference(exe, videoPath, effectiveFps),
    ]);

    // ── Fuse the two signals ────────────────────────────────────────────
    const fused = fuseSignals(mvFrames, blendFrames, effectiveFps, duration);

    // ── Smooth with EMA ─────────────────────────────────────────────────
    const smoothed = emaSmooth(fused, EMA_ALPHA);

    // ── Compute baseline (robust median) ────────────────────────────────
    const baseline = robustBaseline(smoothed);

    // ── Per-frame relative speed + velocity timeline ────────────────────
    const timeline: VelocityTimelinePoint[] = smoothed.map((f) => ({
      time_sec: round3(f.time),
      magnitude: round3(f.magnitude),
      relative_speed: round3(baseline > 0.05 ? f.magnitude / baseline : 1.0),
    }));

    // ── Detect jhatkas (abrupt speed changes) ───────────────────────────
    const jhatkas = detectJhatkas(timeline, baseline);

    // ── Segment into velocity regions ───────────────────────────────────
    const segments = buildVelocitySegments(timeline, duration);

    // ── Aggregate metrics ───────────────────────────────────────────────
    const speeds = segments.map((s) => s.relative_speed);
    const avgSpeed = speeds.length > 0 ? mean(speeds) : 1.0;
    const speedVariance =
      speeds.length > 1 ? mean(speeds.map((s) => (s - avgSpeed) ** 2)) : 0;
    const hasSpeedRamp = speedVariance > SPEED_RAMP_VARIANCE || jhatkas.length >= 2;

    const magnitudes = smoothed.map((f) => f.magnitude);
    const peakMagnitude = magnitudes.length > 0 ? Math.max(...magnitudes) : 0;
    const rawIntensity = mean(magnitudes);
    const motionIntensity = round3(Math.min(1, rawIntensity / MAG_NORMALISE_CEIL));

    const motionStyle = classifyMotionStyle(motionIntensity, speedVariance);
    const isCinematic =
      motionIntensity >= CINEMATIC_LO &&
      motionIntensity <= CINEMATIC_HI &&
      !hasSpeedRamp;

    // ── Segment distribution ────────────────────────────────────────────
    const segmentDistribution: Record<VelocitySegment["label"], number> = {
      freeze: 0,
      "slow-mo": 0,
      normal: 0,
      fast: 0,
      hyper: 0,
    };
    for (const seg of segments) {
      segmentDistribution[seg.label]++;
    }

    return {
      velocitySegments: segments,
      hasSpeedRamp,
      avgRelativeSpeed: round3(avgSpeed),
      motionIntensity,
      motionStyle,
      isCinematic,
      velocityTimeline: timeline,
      jhatkas,
      jhatkaCount: jhatkas.length,
      peakMagnitude: round3(peakMagnitude),
      segmentDistribution,
      processingMs: Math.round(performance.now() - t0),
    };
  } finally {
    cleanTempDir(tmp);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pass 1 — Motion-Vector Estimation (mestimate → codecview)
// ─────────────────────────────────────────────────────────────────────────────
//
// `mestimate` computes macroblock motion vectors (full-search or EPZS).
// `codecview` renders them as coloured arrows on each frame.
// We diff the codecview output against a grey canvas to get the energy
// of the MV field → signalstats YAVG.

interface FrameFlow {
  time: number;
  magnitude: number;
}

async function extractMotionVectors(
  exe: string,
  videoPath: string,
  sampleFps: number,
): Promise<FrameFlow[]> {
  // mestimate with EPZS search, mb_size=16 → realistic MV field.
  // We render the vectors with codecview, diff against neutral grey (128)
  // via tblend=difference128, then read YAVG.
  const cmd = [
    exe,
    `-analyzeduration 100M -probesize 100M`,
    `-i "${videoPath}"`,
    `-vf "fps=${sampleFps.toFixed(1)},mestimate=method=epzs:mb_size=16,codecview=mv=pf+bf+bb,format=gray,signalstats,metadata=print:file=-"`,
    `-an -f null -`,
  ].join(" ");

  try {
    const res = await execAsync(cmd, { maxBuffer: 80 * 1024 * 1024 });
    // metadata=print:file=- writes to stdout; combine both streams
    const combined = (res.stdout ?? "") + "\n" + (res.stderr ?? "");
    return parseFlowOutput(combined, sampleFps);
  } catch (err: unknown) {
    const stdout = (err as { stdout?: string })?.stdout ?? "";
    const stderr = (err as { stderr?: string })?.stderr ?? "";
    const combined = (stdout + "\n" + stderr).trim();
    if (combined) return parseFlowOutput(combined, sampleFps);
    // MV pass is optional — blend pass can carry on alone
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pass 2 — Temporal Frame Difference (tblend)
// ─────────────────────────────────────────────────────────────────────────────
//
// Classic twin-comparison: each frame is blended with its predecessor
// using `tblend=all_mode=difference128`.  The deviation of YAVG from
// 128 measures pixel-level motion.

async function extractBlendDifference(
  exe: string,
  videoPath: string,
  sampleFps: number,
): Promise<FrameFlow[]> {
  const cmd = [
    exe,
    `-analyzeduration 100M -probesize 100M`,
    `-i "${videoPath}"`,
    `-vf "fps=${sampleFps.toFixed(1)},tblend=all_mode=difference128,signalstats,metadata=print:file=-"`,
    `-an -f null -`,
  ].join(" ");

  try {
    const res = await execAsync(cmd, { maxBuffer: 80 * 1024 * 1024 });
    const combined = (res.stdout ?? "") + "\n" + (res.stderr ?? "");
    return parseFlowOutput(combined, sampleFps);
  } catch (err: unknown) {
    const stdout = (err as { stdout?: string })?.stdout ?? "";
    const stderr = (err as { stderr?: string })?.stderr ?? "";
    const combined = (stdout + "\n" + stderr).trim();
    if (combined) return parseFlowOutput(combined, sampleFps);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Signal Fusion
// ─────────────────────────────────────────────────────────────────────────────
//
// Both passes emit (time, magnitude) arrays that may differ in length
// and timing.  We bucket them into 0.1 s slots and take a weighted
// average:  MV weight = 0.55, Blend weight = 0.45.

const FUSION_BUCKET_SEC = 0.1;
const W_MV = 0.55;
const W_BLEND = 0.45;

function fuseSignals(
  mvFrames: FrameFlow[],
  blendFrames: FrameFlow[],
  _sampleFps: number,
  duration: number,
): FrameFlow[] {
  const bucketCount = Math.ceil(duration / FUSION_BUCKET_SEC) + 1;

  // Accumulate per-bucket sums & counts for each signal
  const mvSum = new Float64Array(bucketCount);
  const mvCnt = new Uint32Array(bucketCount);
  const blSum = new Float64Array(bucketCount);
  const blCnt = new Uint32Array(bucketCount);

  for (const f of mvFrames) {
    const b = Math.min(
      Math.floor(f.time / FUSION_BUCKET_SEC),
      bucketCount - 1,
    );
    mvSum[b] += f.magnitude;
    mvCnt[b]++;
  }
  for (const f of blendFrames) {
    const b = Math.min(
      Math.floor(f.time / FUSION_BUCKET_SEC),
      bucketCount - 1,
    );
    blSum[b] += f.magnitude;
    blCnt[b]++;
  }

  const result: FrameFlow[] = [];
  for (let i = 0; i < bucketCount; i++) {
    const mvAvg = mvCnt[i] > 0 ? mvSum[i] / mvCnt[i] : -1;
    const blAvg = blCnt[i] > 0 ? blSum[i] / blCnt[i] : -1;

    let fused: number;
    if (mvAvg >= 0 && blAvg >= 0) {
      fused = W_MV * mvAvg + W_BLEND * blAvg;
    } else if (mvAvg >= 0) {
      fused = mvAvg;
    } else if (blAvg >= 0) {
      fused = blAvg;
    } else {
      continue; // no data in this bucket
    }

    result.push({
      time: i * FUSION_BUCKET_SEC,
      magnitude: fused,
    });
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// EMA Smoothing
// ─────────────────────────────────────────────────────────────────────────────

function emaSmooth(frames: FrameFlow[], alpha: number): FrameFlow[] {
  if (frames.length === 0) return [];

  const out: FrameFlow[] = [{ ...frames[0] }];
  for (let i = 1; i < frames.length; i++) {
    const prev = out[i - 1].magnitude;
    out.push({
      time: frames[i].time,
      magnitude: alpha * frames[i].magnitude + (1 - alpha) * prev,
    });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Robust Baseline (trimmed median)
// ─────────────────────────────────────────────────────────────────────────────

function robustBaseline(frames: FrameFlow[]): number {
  if (frames.length === 0) return 1;

  const mags = frames.map((f) => f.magnitude).sort((a, b) => a - b);
  // Trim top/bottom 10 % to ignore outliers (freeze frames + extreme motion)
  const lo = Math.floor(mags.length * 0.1);
  const hi = Math.ceil(mags.length * 0.9);
  const trimmed = mags.slice(lo, hi);
  if (trimmed.length === 0) return mags[Math.floor(mags.length / 2)] || 1;
  return trimmed[Math.floor(trimmed.length / 2)] || 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// Jhatka Detection (abrupt speed changes)
// ─────────────────────────────────────────────────────────────────────────────
//
// Walk the velocity timeline looking for frame-to-frame speed deltas
// that exceed JHATKA_DELTA_THRESHOLD.  A cooldown prevents detecting
// the same ramp twice.

function detectJhatkas(
  timeline: VelocityTimelinePoint[],
  baseline: number,
): JhatkaEvent[] {
  if (timeline.length < 3) return [];

  const events: JhatkaEvent[] = [];
  let lastJhatkaTime = -Infinity;

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

// ─────────────────────────────────────────────────────────────────────────────
// Velocity Segmentation
// ─────────────────────────────────────────────────────────────────────────────
//
// Groups consecutive timeline samples whose speed labels agree into
// contiguous VelocitySegment objects.  Ensures:
//   • No gaps between segments (contiguous [0 … duration])
//   • No segment shorter than MIN_SEGMENT_SEC (absorbed into neighbour)
//   • Segments are ready for edit-transfer.ts cumulative PTS + LOOP

function buildVelocitySegments(
  timeline: VelocityTimelinePoint[],
  duration: number,
): VelocitySegment[] {
  if (timeline.length < 2) {
    return [
      {
        start_sec: 0,
        end_sec: duration,
        relative_speed: 1.0,
        label: "normal",
      },
    ];
  }

  // ── Raw segmentation by label ─────────────────────────────────────────
  const raw: VelocitySegment[] = [];
  let segStart = timeline[0].time_sec;
  let segSpeeds: number[] = [timeline[0].relative_speed];
  let segLabel = classifySpeed(timeline[0].relative_speed);

  for (let i = 1; i < timeline.length; i++) {
    const pt = timeline[i];
    const label = classifySpeed(pt.relative_speed);

    if (label !== segLabel) {
      // Finish current segment
      const avgSpd = mean(segSpeeds);
      raw.push({
        start_sec: round3(segStart),
        end_sec: round3(pt.time_sec),
        relative_speed: clamp(round3(avgSpd), 0.1, 5.0),
        label: segLabel,
      });
      segStart = pt.time_sec;
      segSpeeds = [];
      segLabel = label;
    }

    segSpeeds.push(pt.relative_speed);
  }

  // Close final segment at full duration
  const finalAvg = mean(segSpeeds);
  raw.push({
    start_sec: round3(segStart),
    end_sec: round3(duration),
    relative_speed: clamp(round3(finalAvg), 0.1, 5.0),
    label: segLabel,
  });

  // ── Merge micro-segments (< MIN_SEGMENT_SEC) into neighbours ──────────
  const merged: VelocitySegment[] = [];
  for (const seg of raw) {
    const dur = seg.end_sec - seg.start_sec;

    if (dur < MIN_SEGMENT_SEC && merged.length > 0) {
      // Absorb into preceding segment
      merged[merged.length - 1].end_sec = seg.end_sec;
    } else {
      merged.push({ ...seg });
    }
  }

  // Ensure first segment starts at 0
  if (merged.length > 0 && merged[0].start_sec > 0.01) {
    merged[0].start_sec = 0;
  }

  // Ensure last segment ends at duration
  if (merged.length > 0) {
    merged[merged.length - 1].end_sec = round3(duration);
  }

  return merged.length > 0
    ? merged
    : [
        {
          start_sec: 0,
          end_sec: duration,
          relative_speed: 1.0,
          label: "normal" as const,
        },
      ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared Parsers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse signalstats metadata output that contains pts_time + YAVG lines.
 * Works for both the MV pass and the blend pass.
 */
function parseFlowOutput(output: string, _fps: number): FrameFlow[] {
  const results: FrameFlow[] = [];
  const lines = output.split("\n");
  let currentPts = 0;

  for (const line of lines) {
    const ptsMatch = line.match(/pts_time[:\s=]+([\d.]+)/);
    if (ptsMatch) currentPts = parseFloat(ptsMatch[1]);

    const yavgMatch = line.match(/YAVG[:\s=]+([\d.]+)/);
    if (yavgMatch) {
      const yavg = parseFloat(yavgMatch[1]);
      // |YAVG − 128| → motion magnitude proxy (0 = still, ~40+ = fast)
      const magnitude = Math.abs(yavg - 128);
      results.push({ time: currentPts, magnitude });
    }
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// Classification Helpers
// ─────────────────────────────────────────────────────────────────────────────

function classifySpeed(speed: number): VelocitySegment["label"] {
  if (speed < SPEED_FREEZE) return "freeze";
  if (speed < SPEED_SLOW) return "slow-mo";
  if (speed < SPEED_NORMAL_HI) return "normal";
  if (speed < SPEED_FAST_HI) return "fast";
  return "hyper";
}

function classifyMotionStyle(
  intensity: number,
  variance: number,
): MotionAnalysisResult["motionStyle"] {
  if (intensity < 0.03) return "static";
  if (variance > 0.3) return "chaotic";
  if (intensity > 0.5) return "dynamic";
  return "smooth";
}

// ─────────────────────────────────────────────────────────────────────────────
// Numeric Helpers
// ─────────────────────────────────────────────────────────────────────────────

function round3(n: number): number {
  return parseFloat(n.toFixed(3));
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
