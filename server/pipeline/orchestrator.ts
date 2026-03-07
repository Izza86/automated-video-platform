/**
 * Pipeline Orchestrator
 *
 * Coordinates all analysis modules into a single async pipeline
 * that can be invoked with one call. Supports:
 *
 *   • Full analysis  — shot + motion + audio + colour on ONE video
 *   • Full transfer  — analyse reference → apply to target
 *   • Partial runs   — cherry-pick individual modules
 *
 * All operations run concurrently where possible (Promise.all)
 * and return structured `FullVideoMetadata` + dashboard-ready JSON.
 */

import type {
  FullVideoMetadata,
  ShotDetectionResult,
  MotionAnalysisResult,
  AudioBeatResult,
  ColorGradingResult,
  EditTransferResult,
  EditingBlueprint,
  EditInstructions,
  BlueprintTransferOptions,
  DashboardAnalysisResponse,
  DepthAnalysisResult,
} from "../types";
import { buildDashboardResponse } from "../types/dashboard";
import { detectShots } from "../analysis/shot-detection";
import { analyzeMotion } from "../analysis/motion-analysis";
import { analyzeAudio } from "../analysis/audio-analysis";
import { extractColorGrading } from "../style/color-grading";
import { transferEdit, type TransferOptions } from "../editor/edit-transfer";
import { analyzeEditingPattern } from "../editor/pattern-analyzer";
import { transferBlueprint } from "../editor/blueprint-transfer";
import { probeVideo, makeTempDir, cleanTempDir, writeTempFile } from "../utils/ffmpeg";
import { analyzeDepth } from "../analysis/depth-analysis";

// ─────────────────────────────────────────────────────────────────────────────
// Full Analysis Pipeline
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run the complete analysis pipeline on a single video.
 * Shot detection, motion, audio beats, and colour grading all execute
 * concurrently and are merged into one `FullVideoMetadata` object.
 */
export async function analyzeVideo(
  videoBuffer: Buffer,
  filename = "video.mp4",
): Promise<DashboardAnalysisResponse> {
  const videoId = `vid_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const tmp = makeTempDir("pipeline");

  try {
    // Probe first for base properties (fast)
    const videoPath = await writeTempFile(tmp, "input.mp4", videoBuffer);
    const probe = await probeVideo(videoPath);

    // Run all five analysis passes concurrently
    const [shots, motion, audio, colorGrading, depth] = await Promise.all([
      detectShots(videoBuffer),
      analyzeMotion(videoBuffer),
      analyzeAudio(videoBuffer),
      extractColorGrading(videoBuffer),
      analyzeDepth(videoBuffer).catch((err: unknown) => {
        console.warn("[orchestrator] Depth analysis failed (non-fatal):", err instanceof Error ? err.message : err);
        return null;
      }),
    ]);

    const orientation = deriveOrientation(probe.aspectRatio);

    const meta: FullVideoMetadata = {
      fps: probe.fps,
      aspectRatio: probe.aspectRatio,
      duration: probe.duration,
      orientation,
      hasAudio: probe.hasAudio,
      shotDetection: shots,
      motion,
      audio,
      colorGrading,
      depth: depth ?? undefined,
    };

    return buildDashboardResponse(meta, videoId, filename);
  } finally {
    cleanTempDir(tmp);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Full Transfer Pipeline
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Analyse a reference video and transfer its style to a target video
 * in a single orchestrated pipeline.
 */
export async function analyzeAndTransfer(
  referenceBuffer: Buffer,
  targetBuffer: Buffer,
  opts: TransferOptions = {},
): Promise<{
  analysis: DashboardAnalysisResponse;
  transfer: EditTransferResult;
}> {
  // Step 1: Analyse the reference (all modules concurrent)
  const analysis = await analyzeVideo(referenceBuffer, "reference.mp4");

  // Step 2: Transfer the reference style to the target
  //         Pass referenceBuffer so FFmpeg can extract its audio track
  const transfer = await transferEdit(targetBuffer, analysis.raw, {
    ...opts,
    referenceBuffer,
  });

  return { analysis, transfer };
}

// ─────────────────────────────────────────────────────────────────────────────
// Full Analysis + Editing Blueprint Pipeline
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run the full analysis pipeline and then generate an Editing Blueprint
 * that fuses shot timeline, velocity segments, beat timing, and style
 * metadata into a structured edit template.
 */
export async function analyzeWithBlueprint(
  videoBuffer: Buffer,
  filename = "video.mp4",
): Promise<{
  analysis: DashboardAnalysisResponse;
  blueprint: EditingBlueprint;
}> {
  const analysis = await analyzeVideo(videoBuffer, filename);
  const blueprint = analyzeEditingPattern(analysis.raw, filename);
  return { analysis, blueprint };
}

// ─────────────────────────────────────────────────────────────────────────────
// Full Blueprint Transfer Pipeline
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Analyse a reference video, generate an editing blueprint, and then
 * apply that blueprint onto a target video timeline to produce
 * structured edit instructions.
 *
 * This is the highest-level "one-call" pipeline that goes:
 *   reference → analysis → blueprint → edit instructions for target
 */
export async function analyzeAndGenerateInstructions(
  referenceBuffer: Buffer,
  targetBuffer: Buffer,
  transferOpts: BlueprintTransferOptions = {},
): Promise<{
  analysis: DashboardAnalysisResponse;
  blueprint: EditingBlueprint;
  instructions: EditInstructions;
}> {
  // 1. Analyse the reference video
  const analysis = await analyzeVideo(referenceBuffer, "reference.mp4");

  // 2. Generate the editing blueprint
  const blueprint = analyzeEditingPattern(analysis.raw, "reference.mp4");

  // 3. Probe target for its duration
  const tmp = makeTempDir("bp-transfer");
  try {
    const targetPath = await writeTempFile(tmp, "target.mp4", targetBuffer);
    const probe = await probeVideo(targetPath);
    const targetDuration = probe.duration || analysis.raw.duration || 10;

    // 4. Transfer blueprint onto target timeline
    const instructions = transferBlueprint(
      blueprint,
      targetDuration,
      transferOpts,
    );

    return { analysis, blueprint, instructions };
  } finally {
    cleanTempDir(tmp);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Partial / Individual Module Runners
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Full Unified Pipeline: Analyse → Blueprint → Instructions → Render
 *
 * The highest-level single-call pipeline that:
 *   1. Analyses the reference video (shot + motion + audio + colour)
 *   2. Generates an editing blueprint
 *   3. Probes the target and transfers the blueprint onto its timeline
 *   4. Renders the target with the reference's style via FFmpeg
 *
 * Returns everything needed for dashboard display + the output video.
 */
export async function analyzeAndTransferFull(
  referenceBuffer: Buffer,
  targetBuffer: Buffer,
  transferOpts: BlueprintTransferOptions = {},
  renderOpts: TransferOptions = {},
): Promise<{
  analysis: DashboardAnalysisResponse;
  blueprint: EditingBlueprint;
  instructions: EditInstructions;
  transfer: EditTransferResult;
}> {
  // 1. Full analysis of the reference
  const analysis = await analyzeVideo(referenceBuffer, "reference.mp4");

  // 2. Generate editing blueprint from analysis
  const blueprint = analyzeEditingPattern(analysis.raw, "reference.mp4");

  // 3. Probe target for duration, transfer blueprint → instructions
  const tmp = makeTempDir("full-transfer");
  let instructions: EditInstructions;

  try {
    const targetPath = await writeTempFile(tmp, "target.mp4", targetBuffer);
    const probe = await probeVideo(targetPath);
    const targetDuration = probe.duration || analysis.raw.duration || 10;

    instructions = transferBlueprint(blueprint, targetDuration, transferOpts);
  } finally {
    cleanTempDir(tmp);
  }

  // 4. Render the target video with the reference style (FFmpeg)
  //    Pass referenceBuffer so FFmpeg can extract its audio track.
  //    Wrapped in try-catch so that analysis + blueprint data still
  //    returns even if the render step fails (e.g. FFmpeg issue).
  let transfer: EditTransferResult;
  try {
    transfer = await transferEdit(targetBuffer, analysis.raw, {
      ...renderOpts,
      referenceBuffer,
    });
  } catch (renderErr) {
    const msg = renderErr instanceof Error ? renderErr.message : String(renderErr);
    console.error("[orchestrator] Render step failed:", msg);
    transfer = {
      success: false,
      error: msg,
      processingMs: 0,
      filterGraphSummary: "",
      appliedMetadata: analysis.raw,
    };
  }

  return { analysis, blueprint, instructions, transfer };
}

export interface PartialAnalysisOptions {
  shotDetection?: boolean;
  motion?: boolean;
  audio?: boolean;
  colorGrading?: boolean;
}

/**
 * Run only the selected analysis modules.
 * Defaults to ALL if no options are provided.
 */
export async function analyzePartial(
  videoBuffer: Buffer,
  options: PartialAnalysisOptions = {},
  filename = "video.mp4",
): Promise<DashboardAnalysisResponse> {
  const all =
    !options.shotDetection &&
    !options.motion &&
    !options.audio &&
    !options.colorGrading;
  const runShot = all || !!options.shotDetection;
  const runMotion = all || !!options.motion;
  const runAudio = all || !!options.audio;
  const runColor = all || !!options.colorGrading;

  const videoId = `vid_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const tmp = makeTempDir("partial");

  try {
    const videoPath = await writeTempFile(tmp, "input.mp4", videoBuffer);
    const probe = await probeVideo(videoPath);

    const promises = [
      runShot ? detectShots(videoBuffer) : defaultShotResult(),
      runMotion ? analyzeMotion(videoBuffer) : defaultMotionResult(),
      runAudio ? analyzeAudio(videoBuffer) : defaultAudioResult(),
      runColor ? extractColorGrading(videoBuffer) : defaultColorResult(),
    ] as const;

    const [shots, motion, audio, colorGrading] = await Promise.all(promises);

    const meta: FullVideoMetadata = {
      fps: probe.fps,
      aspectRatio: probe.aspectRatio,
      duration: probe.duration,
      orientation: deriveOrientation(probe.aspectRatio),
      hasAudio: probe.hasAudio,
      shotDetection: shots,
      motion,
      audio,
      colorGrading,
    };

    return buildDashboardResponse(meta, videoId, filename);
  } finally {
    cleanTempDir(tmp);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Defaults (used when a module is skipped)
// ─────────────────────────────────────────────────────────────────────────────

function defaultShotResult(): ShotDetectionResult {
  return {
    cuts: [], shotCount: 1, avgShotDurationSec: 0, editingPace: "slow",
    hardCutCount: 0, gradualTransitionCount: 0, dominantTransitionType: "hard_cut",
    processingMs: 0,
  };
}

function defaultMotionResult(): MotionAnalysisResult {
  return {
    velocitySegments: [], hasSpeedRamp: false, avgRelativeSpeed: 1.0,
    motionIntensity: 0, motionStyle: "static", isCinematic: false,
    velocityTimeline: [], jhatkas: [], jhatkaCount: 0, peakMagnitude: 0,
    segmentDistribution: { freeze: 0, "slow-mo": 0, normal: 0, fast: 0, hyper: 0 },
    processingMs: 0,
  };
}

function defaultAudioResult(): AudioBeatResult {
  return {
    beats: [], beatEvents: [], bpm: 0, bpmConfidence: 0,
    firstBeatSec: 0, peakDb: -Infinity, meanVolume: 0, hasAudio: false,
    audioTimeline: [], rhythmRegions: [], regionCount: 0,
    avgBeatIntensity: 0, peakBeatIntensity: 0, beatDensity: 0,
    timeSignatureGuess: "unknown", processingMs: 0,
  };
}

function defaultColorResult(): ColorGradingResult {
  return {
    brightness: 0, contrast: 1, saturation: 1, sharpness: 1, vignette: 0.1,
    channelOffsets: { r: 0, g: 0, b: 0 },
    shadowsRgb: { r: 40, g: 40, b: 50 },
    midtonesRgb: { r: 128, g: 128, b: 128 },
    highlightsRgb: { r: 220, g: 220, b: 210 },
    colorProfile: "vibrant", colorMood: "neutral",
    grainDensity: 0, grainLabel: "clean",
    lensBlur: 0, lensBlurLabel: "none",
    vignetteLabel: "none",
    halationIntensity: 0,
    halationColor: { r: 255, g: 180, b: 100 },
    hasFilmTexture: false,
    filmStockLabel: "digital",
    meanLuminance: 128,
    stdLuminance: 40,
    eqParams: "brightness=0.000:contrast=1.000:saturation=1.000",
    colorbalanceParams: "rs=0.000:gs=0.000:bs=0.000:rm=0.000:gm=0.000:bm=0.000:rh=0.000:gh=0.000:bh=0.000",
    colorchannelmixerParams: "",
    unsharpParams: "5:5:1.00:5:5:0.0",
    temporalSamples: [],
    processingMs: 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function deriveOrientation(
  aspectRatio: string,
): FullVideoMetadata["orientation"] {
  const [w, h] = aspectRatio.split(":").map(Number);
  const ratio = (w || 16) / (h || 9);
  if (ratio > 1.2) return "horizontal";
  if (ratio < 0.8) return "vertical";
  return "square";
}
