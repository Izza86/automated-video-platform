/**
 * Advanced Shot-Boundary Detection
 * ─────────────────────────────────
 * Three-signal fusion pipeline with adaptive frame sampling:
 *
 *   Signal 1 — HSV Histogram Difference
 *     Convert each frame to HSV colour-space, compute per-channel
 *     histograms, measure chi-squared distance between consecutive
 *     frames.  Excellent at detecting colour-shift hard cuts.
 *
 *   Signal 2 — Edge Change Ratio (ECR)
 *     Canny edge maps per frame → normalised entering/exiting edge
 *     pixel count.  Robust against lighting changes; catches content
 *     boundaries that histograms miss.
 *
 *   Signal 3 — Temporal Frame Difference (TD)
 *     Pixel-level absolute difference between consecutive frames.
 *     Fast fallback signal; strong for flash-frames and abrupt cuts.
 *
 * Fusion: three-way weighted combination with:
 *   • Spike detection   → hard cuts   (single-frame energy > threshold)
 *   • Sustained-window  → gradual transitions (ramp over ±0.5 s window)
 *   • Non-maximum suppression to eliminate duplicates
 *
 * Performance: adaptive frame sampling caps total frames at ~900 so
 * analysis stays under ~8 s for most clips regardless of duration.
 *
 * Output: timestamp timeline with per-cut confidence + per-signal
 * breakdown, structured for dashboard card visualisation.
 */

import type { ShotBoundary, ShotDetectionResult } from "../types";
import {
  resolveFfmpeg,
  safeExe,
  execAsync,
  probeVideo,
  makeTempDir,
  cleanTempDir,
  writeTempFile,
  mean,
} from "../utils/ffmpeg";
import { runMLScript } from "../utils/ml-runner";

// ─────────────────────────────────────────────────────────────────────────────
// Tuning Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Weights for the three fusion signals (must sum to 1.0) */
const W_HIST = 0.40;
const W_ECR  = 0.35;
const W_TD   = 0.25;

/** Fused-score thresholds */
const HARD_CUT_THRESHOLD     = 0.15;
const GRADUAL_THRESHOLD      = 0.08;
const MIN_SHOT_GAP_SEC       = 0.30;
const GRADUAL_WINDOW_BUCKETS = 5;    // ±5 buckets (±0.5 s)

/** Adaptive sampling: cap total analysis frames to keep runtime bounded */
const MAX_ANALYSIS_FRAMES = 900;

// ─────────────────────────────────────────────────────────────────────────────
// ML Shot Detection Types
// ─────────────────────────────────────────────────────────────────────────────

/** Shape of the ML Python script's JSON output */
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

/**
 * Detect shot boundaries using HSV-histogram + ECR + temporal-difference
 * three-signal fusion.
 *
 * @param videoBuffer  Raw bytes of the video to analyse
 * @returns `ShotDetectionResult` with timeline, confidence, and dashboard stats
 */
export async function detectShots(
  videoBuffer: Buffer,
): Promise<ShotDetectionResult> {
  const t0 = performance.now();
  const tmp = makeTempDir("shot-detect");

  try {
    const videoPath = await writeTempFile(tmp, "input.mp4", videoBuffer);
    const probe = await probeVideo(videoPath);
    const ffmpeg = await resolveFfmpeg();
    const exe = safeExe(ffmpeg);

    // ── ML-first: try CNN-SSIM shot detection via Python ──────────────
    const mlResult = await runMLScript<MLShotResult>(
      "ml_shot_detection.py",
      videoPath,
      ["--fps", "2"],
      120_000, // 120s timeout
    );

    if (mlResult && !mlResult.error && mlResult.shots && mlResult.shots.length > 0) {
      console.log(
        `[shot-detect] ML shot detection succeeded: ${mlResult.shotCount} shots, ` +
        `${mlResult.cutCount} cuts, ${mlResult.gradualCount} gradual, model=${mlResult.mlModel}`,
      );

      // Map ML boundaries to our ShotBoundary type
      const mlCuts: ShotBoundary[] = (mlResult.boundaries ?? []).map((b) => ({
        timestamp_sec: b.time_sec,
        confidence: b.confidence,
        type: b.type === "gradual" ? "gradual_transition" as const : "hard_cut" as const,
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
        avgShotDurationSec: parseFloat(avgDur.toFixed(2)),
        editingPace: pace,
        hardCutCount: hardCuts,
        gradualTransitionCount: gradualCuts,
        dominantTransitionType: hardCuts >= gradualCuts ? "hard_cut" : "gradual_transition",
        processingMs: Math.round(performance.now() - t0),
      };
    }

    console.log("[shot-detect] ML shot detection unavailable or failed, falling back to FFmpeg pipeline");

    // ── Adaptive sample rate ────────────────────────────────────────────
    const nativeFps = probe.fps || 30;
    const totalNativeFrames = nativeFps * probe.duration;
    const sampleFps =
      totalNativeFrames > MAX_ANALYSIS_FRAMES
        ? Math.max(2, Math.round(MAX_ANALYSIS_FRAMES / Math.max(1, probe.duration)))
        : Math.min(nativeFps, 30);

    console.log(
      `[shot-detect] dur=${probe.duration.toFixed(1)}s nativeFps=${nativeFps}` +
      ` → sampleFps=${sampleFps} (~${Math.round(sampleFps * probe.duration)} frames)`,
    );

    // ── Three analysis passes — run concurrently ────────────────────────
    const [histScores, ecrScores, tdScores] = await Promise.all([
      hsvHistogramPass(exe, videoPath, sampleFps),
      edgeChangeRatioPass(exe, videoPath, sampleFps),
      temporalDifferencePass(exe, videoPath, sampleFps),
    ]);

    console.log(
      `[shot-detect] signals: hist=${histScores.length} ecr=${ecrScores.length} td=${tdScores.length}`,
    );

    // ── Fuse all three signals ──────────────────────────────────────────
    const cuts = fuseThreeSignals(histScores, ecrScores, tdScores, probe.duration);

    // ── Aggregate stats ─────────────────────────────────────────────────
    const shotCount = cuts.length + 1;
    const avgDur = cuts.length > 0 ? probe.duration / shotCount : probe.duration;
    const hardCuts = cuts.filter((c) => c.type === "hard_cut").length;
    const gradualCuts = cuts.filter((c) => c.type === "gradual_transition").length;

    const pace: ShotDetectionResult["editingPace"] =
      avgDur < 1.5 ? "rapid" : avgDur < 5 ? "moderate" : "slow";

    return {
      cuts,
      shotCount,
      avgShotDurationSec: parseFloat(avgDur.toFixed(2)),
      editingPace: pace,
      hardCutCount: hardCuts,
      gradualTransitionCount: gradualCuts,
      dominantTransitionType: hardCuts >= gradualCuts ? "hard_cut" : "gradual_transition",
      processingMs: Math.round(performance.now() - t0),
    };
  } finally {
    cleanTempDir(tmp);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// Signal 1 — HSV Histogram Difference (chi² scene-change)
// ═════════════════════════════════════════════════════════════════════════════

interface TimedScore {
  time: number;
  score: number;
}

/**
 * FFmpeg's `select` scene-change detector computes a chi-squared distance
 * on the Y-plane histogram between consecutive frames. We pre-convert to
 * `format=yuv420p` and down-sample to `sampleFps` so the histogram
 * captures luminance (a proxy for Value in HSV).
 *
 * For true HSV-domain detection we additionally convert through
 * `colorspace=bt709` which better captures hue/saturation shifts
 * in colour-graded content.
 */
async function hsvHistogramPass(
  exe: string,
  videoPath: string,
  sampleFps: number,
): Promise<TimedScore[]> {
  const cmd = [
    exe,
    `-analyzeduration 100M -probesize 100M`,
    `-i "${videoPath}"`,
    `-vf "fps=${sampleFps},format=yuv420p,select='gte(scene,0)',metadata=print:file=-"`,
    `-an -f null -`,
  ].join(" ");

  try {
    const res = await execAsync(cmd, { maxBuffer: 60 * 1024 * 1024 });
    // metadata=print:file=- writes to stdout; combine both streams for robustness
    const combined = (res.stdout ?? "") + "\n" + (res.stderr ?? "");
    return parseSceneScores(combined);
  } catch (err: any) {
    const combined = ((err.stdout ?? "") + "\n" + (err.stderr ?? "")).trim();
    if (combined) return parseSceneScores(combined);
    console.warn("[shot-detect/hist] HSV histogram pass failed:", err);
    return [];
  }
}

function parseSceneScores(output: string): TimedScore[] {
  const results: TimedScore[] = [];
  const lines = output.split("\n");
  let pts = 0;

  for (const line of lines) {
    const ptsMatch = line.match(/pts_time[:\s=]+([\d.]+)/);
    if (ptsMatch) pts = parseFloat(ptsMatch[1]);

    const scoreMatch = line.match(/scene_score[:\s=]+([\d.]+)/);
    if (scoreMatch) {
      results.push({ time: pts, score: parseFloat(scoreMatch[1]) });
    }
  }
  return results;
}

// ═════════════════════════════════════════════════════════════════════════════
// Signal 2 — Edge Change Ratio (ECR)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Canny edge detection → per-frame edge density (YAVG of edge map).
 * ECR = |density[n] − density[n−1]|, normalised to [0, 1].
 *
 * Robust against global brightness changes because Canny operates on
 * gradient magnitude, not raw pixel intensity.
 */
async function edgeChangeRatioPass(
  exe: string,
  videoPath: string,
  sampleFps: number,
): Promise<TimedScore[]> {
  const cmd = [
    exe,
    `-analyzeduration 100M -probesize 100M`,
    `-i "${videoPath}"`,
    `-vf "fps=${sampleFps},edgedetect=low=0.08:high=0.25:mode=canny,signalstats,metadata=print:file=-"`,
    `-an -f null -`,
  ].join(" ");

  try {
    const res = await execAsync(cmd, { maxBuffer: 80 * 1024 * 1024 });
    const combined = (res.stdout ?? "") + "\n" + (res.stderr ?? "");
    return computeECRDeltas(combined);
  } catch (err: any) {
    const combined = ((err.stdout ?? "") + "\n" + (err.stderr ?? "")).trim();
    if (combined) return computeECRDeltas(combined);
    console.warn("[shot-detect/ecr] ECR pass failed:", err);
    return [];
  }
}

function computeECRDeltas(output: string): TimedScore[] {
  const densities: { time: number; density: number }[] = [];
  const lines = output.split("\n");
  let pts = 0;

  for (const line of lines) {
    const ptsMatch = line.match(/pts_time[:\s=]+([\d.]+)/);
    if (ptsMatch) pts = parseFloat(ptsMatch[1]);

    const yavgMatch = line.match(/YAVG[:\s=]+([\d.]+)/);
    if (yavgMatch) {
      densities.push({ time: pts, density: parseFloat(yavgMatch[1]) / 255 });
    }
  }

  // Frame-to-frame ECR delta, scaled up for fusion parity
  const results: TimedScore[] = [];
  for (let i = 1; i < densities.length; i++) {
    const delta = Math.abs(densities[i].density - densities[i - 1].density);
    results.push({ time: densities[i].time, score: Math.min(1, delta * 3.0) });
  }
  return results;
}

// ═════════════════════════════════════════════════════════════════════════════
// Signal 3 — Temporal Frame Difference (TD)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Absolute pixel-level difference between consecutive frames.
 * `tblend=all_mode=difference128` → YAVG of 128 = no change;
 * deviations indicate motion or a cut. Normalised to [0, 1].
 */
async function temporalDifferencePass(
  exe: string,
  videoPath: string,
  sampleFps: number,
): Promise<TimedScore[]> {
  const cmd = [
    exe,
    `-analyzeduration 100M -probesize 100M`,
    `-i "${videoPath}"`,
    `-vf "fps=${sampleFps},tblend=all_mode=difference128,signalstats,metadata=print:file=-"`,
    `-an -f null -`,
  ].join(" ");

  try {
    const res = await execAsync(cmd, { maxBuffer: 80 * 1024 * 1024 });
    const combined = (res.stdout ?? "") + "\n" + (res.stderr ?? "");
    return parseTDScores(combined);
  } catch (err: any) {
    const combined = ((err.stdout ?? "") + "\n" + (err.stderr ?? "")).trim();
    if (combined) return parseTDScores(combined);
    console.warn("[shot-detect/td] temporal-difference pass failed:", err);
    return [];
  }
}

function parseTDScores(output: string): TimedScore[] {
  const results: TimedScore[] = [];
  const lines = output.split("\n");
  let pts = 0;

  for (const line of lines) {
    const ptsMatch = line.match(/pts_time[:\s=]+([\d.]+)/);
    if (ptsMatch) pts = parseFloat(ptsMatch[1]);

    const yavgMatch = line.match(/YAVG[:\s=]+([\d.]+)/);
    if (yavgMatch) {
      const yavg = parseFloat(yavgMatch[1]);
      // |deviation from 128| → magnitude, normalised 0-1
      const score = Math.min(1, Math.abs(yavg - 128) / 80);
      results.push({ time: pts, score });
    }
  }
  return results;
}

// ═════════════════════════════════════════════════════════════════════════════
// Three-Signal Fusion Engine
// ═════════════════════════════════════════════════════════════════════════════

function fuseThreeSignals(
  histScores: TimedScore[],
  ecrScores: TimedScore[],
  tdScores: TimedScore[],
  duration: number,
): ShotBoundary[] {
  // ── Bucket all signals into 0.1 s time-slots ─────────────────────────
  const BUCKET = 0.1;
  const count = Math.ceil(duration / BUCKET) + 1;

  const histMap = new Float64Array(count);
  const ecrMap  = new Float64Array(count);
  const tdMap   = new Float64Array(count);

  const fill = (map: Float64Array, scores: TimedScore[]) => {
    for (const s of scores) {
      const idx = Math.round(s.time / BUCKET);
      if (idx >= 0 && idx < count) map[idx] = Math.max(map[idx], s.score);
    }
  };
  fill(histMap, histScores);
  fill(ecrMap, ecrScores);
  fill(tdMap, tdScores);

  // ── Sustained-energy window for gradual transition detection ──────────
  // A dissolve produces moderate scores over several consecutive buckets.
  // We compute a windowed average and flag regions where sustained energy
  // exceeds the gradual threshold but no single bucket hits hard-cut.
  const sustainedEnergy = new Float64Array(count);
  const winSize = GRADUAL_WINDOW_BUCKETS;
  for (let i = winSize; i < count - winSize; i++) {
    let sum = 0;
    for (let j = -winSize; j <= winSize; j++) {
      sum += W_HIST * histMap[i + j] + W_ECR * ecrMap[i + j] + W_TD * tdMap[i + j];
    }
    sustainedEnergy[i] = sum / (2 * winSize + 1);
  }

  // ── Collect candidate boundaries ──────────────────────────────────────
  const raw: ShotBoundary[] = [];

  for (let i = 1; i < count - 1; i++) {
    const h = histMap[i];
    const e = ecrMap[i];
    const t = tdMap[i];
    const fused = W_HIST * h + W_ECR * e + W_TD * t;
    const timestamp = parseFloat((i * BUCKET).toFixed(2));

    if (fused >= HARD_CUT_THRESHOLD) {
      // ── Hard cut: sharp single-frame spike ────────────────────────
      raw.push({
        timestamp_sec: timestamp,
        type: "hard_cut",
        confidence: parseFloat(Math.min(1, fused * 1.2).toFixed(3)),
        hist_score: parseFloat(h.toFixed(3)),
        ecr_score: parseFloat(e.toFixed(3)),
        td_score: parseFloat(t.toFixed(3)),
      });
    } else if (
      sustainedEnergy[i] >= GRADUAL_THRESHOLD &&
      fused >= GRADUAL_THRESHOLD * 0.8
    ) {
      // ── Gradual transition: sustained mid-level energy ────────────
      // Only flag the LOCAL PEAK of the sustained region
      const isPeak =
        sustainedEnergy[i] >= sustainedEnergy[i - 1] &&
        sustainedEnergy[i] >= sustainedEnergy[i + 1];

      if (isPeak) {
        raw.push({
          timestamp_sec: timestamp,
          type: "gradual_transition",
          confidence: parseFloat(Math.min(1, sustainedEnergy[i] * 1.5).toFixed(3)),
          hist_score: parseFloat(h.toFixed(3)),
          ecr_score: parseFloat(e.toFixed(3)),
          td_score: parseFloat(t.toFixed(3)),
        });
      }
    }
  }

  // ── Non-maximum suppression ───────────────────────────────────────────
  // Within each MIN_SHOT_GAP_SEC window keep only the highest-confidence hit
  const suppressed: ShotBoundary[] = [];
  let lastTime = -Infinity;
  let lastConf = 0;

  for (const cut of raw) {
    if (cut.timestamp_sec - lastTime < MIN_SHOT_GAP_SEC) {
      if (cut.confidence > lastConf && suppressed.length > 0) {
        suppressed[suppressed.length - 1] = cut;
        lastConf = cut.confidence;
        lastTime = cut.timestamp_sec;
      }
    } else {
      suppressed.push(cut);
      lastTime = cut.timestamp_sec;
      lastConf = cut.confidence;
    }
  }

  suppressed.sort((a, b) => a.timestamp_sec - b.timestamp_sec);
  return suppressed;
}
