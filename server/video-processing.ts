"use server";

import { exec } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { promisify } from "util";
import type { VelocityTimelinePoint } from "./types/index";
import {
  assertRenderStyleDNA,
  type RenderStyleDNA,
} from "./types/render-style-dna";
import { buildCurvesFilterFromCDF } from "./utils/cdf-curves-ffmpeg";

const execAsync = promisify(exec);
const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);
const unlinkAsync = promisify(fs.unlink);
const DEBUG_MODE =
  process.env.DEBUG_MODE === "1" ||
  process.env.DEBUG_MODE === "true" ||
  process.env.NEXT_PUBLIC_DEBUG_MODE === "1" ||
  process.env.NEXT_PUBLIC_DEBUG_MODE === "true";

// Log the PATH seen by the server process to aid debugging when ffmpeg isn't found
console.log("Server process.env.PATH:", process.env.PATH);

/**
 * Resolve an ffmpeg executable path. Try the plain `ffmpeg` command first,
 * then fall back to a hardcoded Windows location if available.
 */
async function resolveFfmpeg(): Promise<string> {
  const candidates: string[] = [];
  if (process.env.FFMPEG_PATH) candidates.push(process.env.FFMPEG_PATH);
  // Try shell-resolved command first
  candidates.push("ffmpeg");
  // Removed hardcoded C: path — use PATH environment or FFMPEG_PATH instead
  // This ensures compatibility with any drive (C:, D:, E:, etc.)
  if (process.platform === "win32") {
    // Windows users should set FFMPEG_PATH env var or have ffmpeg in PATH
  } else {
    // Common Unix locations
    candidates.push("/usr/bin/ffmpeg", "/usr/local/bin/ffmpeg");
  }

  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      // Quote paths that include spaces or backslashes
      const cmd = /\\|\s/.test(candidate)
        ? `"${candidate}" -version`
        : `${candidate} -version`;
      await execAsync(cmd);
      console.log(`Using ffmpeg executable: ${candidate}`);
      return candidate;
    } catch (e) {
      // Try next candidate
    }
  }

  throw new Error("ffmpeg not found");
}

export interface VideoMetadata {
  // ── Core ────────────────────────────────────────────────────────────
  colorProfile: string;
  brightness: number;
  contrast: number;
  saturation: number;
  sharpness: number;
  vignette: number;
  aspectRatio: string;
  fps: number;
  hasAudio: boolean;
  audioVolume: number;
  duration: number;
  transitionStyle: string;

  // ── Color DNA (deep) ───────────────────────────────────────────────
  colorMood: string;
  channelOffsets: { r: number; g: number; b: number };
  shadowsRgb: { r: number; g: number; b: number };
  midtonesRgb: { r: number; g: number; b: number };
  highlightsRgb: { r: number; g: number; b: number };

  // ── Grain & Texture ────────────────────────────────────────────────
  grainDensity: number; // 0-1
  grainLabel: string; // clean / light-grain / medium-grain / heavy-grain

  // ── Vignette & Lens Blur ───────────────────────────────────────────
  vignetteLabel: string;
  lensBlur: number; // 0-1
  lensBlurLabel: string;

  // ── Velocity / Speed Ramping ───────────────────────────────────────
  velocitySegments: {
    start_sec: number;
    end_sec: number;
    relative_speed: number;
    label: string;
  }[];
  hasSpeedRamp: boolean;
  avgRelativeSpeed: number;

  // ── Motion ─────────────────────────────────────────────────────────
  motionIntensity: number;
  motionStyle: string;
  isCinematic: boolean;

  // ── Orientation ────────────────────────────────────────────────────
  orientation: string;

  // ── Audio Beats ────────────────────────────────────────────────────
  audioBeatData: { beats: number[]; firstBeatSec: number; peakDb: number };

  // ── Shot Boundary / Cut Timeline ───────────────────────────────────
  cutTimeline: {
    timestamp_sec: number;
    type: "hard_cut" | "gradual_transition";
    confidence: number;
    hist_score: number;
    ecr_score: number;
    td_score: number;
  }[];
}

/**
 * Convert base64 string to buffer
 */
export async function base64ToBuffer(base64String: string): Promise<Buffer> {
  // Remove data URL prefix if present
  const base64Data = base64String.replace(/^data:video\/[^;]+;base64,/, "");
  return Buffer.from(base64Data, "base64");
}

/**
 * Convert buffer to base64 string with data URL prefix
 */
export async function bufferToBase64(buffer: Buffer): Promise<string> {
  // kept async in case future implementations stream or offload work
  return "data:video/mp4;base64," + buffer.toString("base64");
}

// ═══════════════════════════════════════════════════════════════════════════
// VELOCITY ALIGNMENT — setpts for speed-matched segments
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Build an FFmpeg setpts expression that speeds up / slows down the target
 * video to match the reference's velocity profile segment by segment.
 *
 * ★ STRICT RULE: "Jhatkay" (velocity ramping & hard cuts) are the SOUL
 * of this project. This function NEVER skips, NEVER simplifies to a
 * global speed, and NEVER downsamples segments regardless of count or
 * video length. Every single timing beat from the reference MUST be
 * mirrored onto the target.
 *
 * Uses conditional PTS expressions:
 *   if(between(T, start, end), PTS * (1/speed), ...)
 */
function buildSetptsExpr(
  velocitySegments: {
    start_sec: number;
    end_sec: number;
    relative_speed: number;
  }[],
  avgRelativeSpeed: number,
  targetDuration?: number
): string | null {
  // Only return null when there are literally ZERO segments
  if (!velocitySegments || velocitySegments.length === 0) return null;

  // ── NEVER skip based on variance or segment count. ─────────────────
  // Even a single segment with 0.95× speed is a deliberate editorial
  // choice from the reference that must be preserved.

  // ── Loop / stretch velocity pattern to cover ENTIRE target ─────────
  // If the target video is longer than the reference's velocity map,
  // loop the pattern so every second gets the jhatkay treatment.
  const segs = [...velocitySegments];
  const refEnd = segs.length > 0 ? Math.max(...segs.map((s) => s.end_sec)) : 0;

  if (targetDuration && targetDuration > refEnd && refEnd > 0) {
    const patternLen = refEnd;
    let offset = patternLen;
    const maxIterations = 100; // generous cap for long videos
    let iter = 0;
    while (offset < targetDuration && iter < maxIterations) {
      for (const orig of velocitySegments) {
        if (offset + (orig.end_sec - orig.start_sec) > targetDuration + 1)
          break;
        segs.push({
          start_sec: offset + orig.start_sec,
          end_sec: Math.min(offset + orig.end_sec, targetDuration),
          relative_speed: orig.relative_speed,
        });
      }
      offset += patternLen;
      iter++;
    }
    console.log(
      `[VELOCITY] Looped ${velocitySegments.length} segs → ${segs.length} segs to cover ${targetDuration.toFixed(1)}s target`
    );
  }

  // ── Merge ONLY truly identical adjacent plateaus ───────────────────
  // This reduces FFmpeg expression nesting depth without losing any
  // transition. Two adjacent segments are merged ONLY if their speeds
  // are within 0.02 of each other (i.e. the same editorial plateau).
  // Every actual speed CHANGE (jhatkay) is preserved.
  const merged: typeof segs = [segs[0]];
  for (let i = 1; i < segs.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = segs[i];
    if (Math.abs(prev.relative_speed - curr.relative_speed) < 0.02) {
      // Same speed plateau — extend the previous segment
      prev.end_sec = curr.end_sec;
    } else {
      // Different speed = a hard cut / jhatkay — KEEP IT
      merged.push({ ...curr });
    }
  }

  console.log(
    `[VELOCITY] ${segs.length} raw segs → ${merged.length} after plateau merge (every transition preserved)`
  );

  // ── Quadratic velocity smoothing ─────────────────────────────────
  // Instead of hard step-function jumps between speed segments,
  // add short ease-in / ease-out ramps (quadratic curve) at each
  // boundary so Slow-Mo ↔ Fast-Motion transitions feel fluid
  // regardless of frame rate.
  //
  // For each segment pair with a speed change we insert a small
  // transition zone (RAMP_SEC) where the PTS factor is interpolated
  // via a quadratic lerp:  factor = a + (b-a) * ((T-start)/ramp)^2
  const RAMP_SEC = 0.15; // 150ms ease per transition edge

  let expr = "PTS";
  for (let i = merged.length - 1; i >= 0; i--) {
    const s = merged[i];
    const speed = Math.max(0.25, Math.min(4.0, s.relative_speed || 1.0));
    const factor = (1 / speed).toFixed(4);

    // Core plateau (constant speed)
    const plateauStart = s.start_sec;
    const plateauEnd = s.end_sec;
    expr = `if(between(T,${plateauStart.toFixed(3)},${plateauEnd.toFixed(3)}),${factor}*PTS,${expr})`;

    // Ease-in ramp from previous segment's speed into this one
    if (i > 0) {
      const prev = merged[i - 1];
      const prevSpeed = Math.max(
        0.25,
        Math.min(4.0, prev.relative_speed || 1.0)
      );
      const prevFactor = (1 / prevSpeed).toFixed(4);
      const ramp = Math.min(RAMP_SEC, (s.end_sec - s.start_sec) * 0.3);
      if (Math.abs(prevSpeed - speed) >= 0.02 && ramp > 0.01) {
        const rampStart = Math.max(0, s.start_sec - ramp);
        const rampEnd = s.start_sec;
        // Quadratic ease: prevFactor → factor over ramp zone
        // t_norm = (T - rampStart) / ramp  ∈ [0,1]
        // result = prevFactor + (factor - prevFactor) * t_norm^2
        const rampLen = (rampEnd - rampStart).toFixed(4);
        const rampExpr = `(${prevFactor}+(${factor}-${prevFactor})*pow((T-${rampStart.toFixed(3)})/${rampLen},2))*PTS`;
        expr = `if(between(T,${rampStart.toFixed(3)},${rampEnd.toFixed(3)}),${rampExpr},${expr})`;
      }
    }
  }
  return expr;
}

/**
 * Build a matching atempo chain for audio when setpts is used.
 * atempo only accepts [0.5, 100.0], so chain multiple filters for extreme values.
 */
function buildAtempoChain(speed: number): string {
  const s = Math.max(0.25, Math.min(4.0, speed));
  if (Math.abs(s - 1.0) < 0.05) return "";
  // atempo supports 0.5–100, chain for < 0.5
  if (s >= 0.5) return `atempo=${s.toFixed(4)}`;
  // Chain two atempo filters: sqrt(s) × sqrt(s) = s
  const half = Math.sqrt(s);
  return `atempo=${half.toFixed(4)},atempo=${half.toFixed(4)}`;
}

/** Resample motion timeline at shot-cut times so velocity segments respect editorial boundaries. */
function resampleTimelineWithCuts(
  timeline: VelocityTimelinePoint[],
  cuts: Array<{ time_sec: number }>,
  refDuration: number
): VelocityTimelinePoint[] {
  if (!timeline.length) return [];
  const sorted = [...timeline].sort((a, b) => a.time_sec - b.time_sec);
  const times = new Set<number>();
  for (const p of sorted) times.add(p.time_sec);
  for (const c of cuts) {
    const t = c.time_sec;
    if (t > 0.02 && t < refDuration - 0.02) times.add(t);
  }
  const ordered = [...times].sort((a, b) => a - b);
  const nearest = (t: number): VelocityTimelinePoint => {
    let best = sorted[0];
    let d = Math.abs(best.time_sec - t);
    for (const p of sorted) {
      const d2 = Math.abs(p.time_sec - t);
      if (d2 < d) {
        d = d2;
        best = p;
      }
    }
    return { ...best, time_sec: t };
  };
  return ordered.map(nearest);
}

function timelineToVelocitySegments(
  timeline: VelocityTimelinePoint[],
  refDuration: number
): { start_sec: number; end_sec: number; relative_speed: number }[] {
  if (!timeline.length) return [];
  const sorted = [...timeline].sort((a, b) => a.time_sec - b.time_sec);
  const out: {
    start_sec: number;
    end_sec: number;
    relative_speed: number;
  }[] = [];
  let i = 0;
  while (i < sorted.length) {
    const rs = sorted[i].relative_speed;
    let j = i + 1;
    while (
      j < sorted.length &&
      Math.abs(sorted[j].relative_speed - rs) < 0.025
    ) {
      j++;
    }
    const start = Math.max(0, sorted[i].time_sec);
    const end =
      j < sorted.length
        ? sorted[j].time_sec
        : Math.max(refDuration, start + 1e-3);
    out.push({
      start_sec: start,
      end_sec: Math.min(end, refDuration),
      relative_speed: Math.max(0.25, Math.min(4.0, rs || 1)),
    });
    i = j;
  }
  return out;
}

function isFilterGraphStatic(input: {
  cutCount: number;
  motionPoints: number;
  beatCount: number;
}): boolean {
  return (
    input.cutCount === 0 && input.motionPoints < 2 && input.beatCount === 0
  );
}

function scaleCutTimesToTarget(
  cuts: Array<{ time_sec: number; type: string }>,
  refDuration: number,
  targetDuration: number
): number[] {
  if (!(refDuration > 0 && targetDuration > 0)) return [];
  return cuts
    .filter((c) => c.type === "hard_cut")
    .map((c) => (c.time_sec / refDuration) * targetDuration)
    .filter((t) => t > 0.2 && t < targetDuration - 0.2)
    .sort((a, b) => a - b);
}

function buildShotTrimConcatGraph(cutTimes: number[]): {
  graph: string;
  outputLabel: string;
  segmentCount: number;
} {
  if (cutTimes.length === 0) {
    return { graph: "", outputLabel: "vsrc", segmentCount: 1 };
  }

  const segments: Array<{ start: number; end: number }> = [];
  let prev = 0;
  for (const t of cutTimes) {
    if (t > prev + 0.08) {
      segments.push({ start: prev, end: t });
      prev = t;
    }
  }
  segments.push({ start: prev, end: Number.POSITIVE_INFINITY });

  const trimParts: string[] = [];
  const concatInputs: string[] = [];
  let validSegments = 0;

  for (const seg of segments) {
    if (!(seg.end > seg.start)) continue;
    const label = `seg${validSegments}`;
    const endPart =
      seg.end === Number.POSITIVE_INFINITY ? "" : `:end=${seg.end.toFixed(3)}`;
    trimParts.push(
      `[0:v]trim=start=${seg.start.toFixed(3)}${endPart},setpts=PTS-STARTPTS[${label}]`
    );
    concatInputs.push(`[${label}]`);
    validSegments++;
  }

  if (validSegments <= 1) {
    return { graph: "", outputLabel: "vsrc", segmentCount: 1 };
  }

  return {
    graph:
      `${trimParts.join(";")};` +
      `${concatInputs.join("")}concat=n=${validSegments}:v=1:a=0[vcut]`,
    outputLabel: "vcut",
    segmentCount: validSegments,
  };
}

function buildZoompanFromMotionTimeline(
  timeline: VelocityTimelinePoint[]
): string | null {
  if (timeline.length < 2) return null;

  const mags = timeline.map((p) => p.magnitude ?? 0).filter((v) => v >= 0);
  const rel = timeline.map((p) => p.relative_speed ?? 1);
  if (mags.length < 2 || rel.length < 2) return null;

  const mean = (arr: number[]) =>
    arr.reduce((a, b) => a + b, 0) / Math.max(1, arr.length);
  const mMean = mean(mags);
  const rMean = mean(rel);
  const rVar = mean(rel.map((v) => (v - rMean) ** 2));
  const motionEnergy = Math.min(1, Math.max(0, mMean / 20));
  const jitter = Math.min(1, Math.max(0, Math.sqrt(rVar)));

  const baseZoom = (1.0 + motionEnergy * 0.04).toFixed(4);
  const amp = (0.004 + jitter * 0.02).toFixed(4);
  const zx = (120 + Math.round(motionEnergy * 160)).toString();
  const zy = (95 + Math.round(jitter * 110)).toString();

  return `zoompan=z='${baseZoom}+${amp}*sin(on/${zx})':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`;
}

function sampleFrameTimestamps(timeline: number[], maxCount = 120): number[] {
  if (timeline.length <= maxCount) return timeline;
  const out: number[] = [];
  const step = (timeline.length - 1) / (maxCount - 1);
  for (let i = 0; i < maxCount; i++) {
    const idx = Math.min(timeline.length - 1, Math.round(i * step));
    out.push(timeline[idx]);
  }
  return out;
}

async function readFrameTimestamps(
  ffprobeExe: string,
  videoPath: string
): Promise<number[]> {
  const safeProbe = /\\|\s/.test(ffprobeExe) ? `"${ffprobeExe}"` : ffprobeExe;
  const cmd = [
    safeProbe,
    `-i "${videoPath}"`,
    "-select_streams v:0",
    "-show_entries frame=pts_time",
    "-of csv=p=0",
    "-v error",
  ].join(" ");
  const { stdout } = await execAsync(cmd, { maxBuffer: 100 * 1024 * 1024 });
  return stdout
    .split(/\r?\n/)
    .map((l) => Number.parseFloat(l.trim()))
    .filter((n) => Number.isFinite(n));
}

async function exportDebugFrames(
  ffmpegExe: string,
  inputPath: string,
  outDir: string
): Promise<void> {
  await fs.promises.mkdir(outDir, { recursive: true });
  const safeExe = /\\|\s/.test(ffmpegExe) ? `"${ffmpegExe}"` : ffmpegExe;
  const cmd = [
    safeExe,
    "-y",
    `-i "${inputPath}"`,
    `-vf "fps=1"`,
    `"${path.join(outDir, "frame_%06d.jpg")}"`,
  ].join(" ");
  await execAsync(cmd, { maxBuffer: 100 * 1024 * 1024 });
}

/**
 * Process video with style applied (Buffer-based — avoids base64 overhead).
 * Rendering is driven exclusively by `style_dna` from orchestrator analysis.
 */
export async function processVideoFromBuffers(
  referenceBuffer: Buffer | null,
  targetBuffer: Buffer,
  options: {
    style_dna: RenderStyleDNA;
    keepOutput?: boolean;
  }
): Promise<
  | {
      success: true;
      styleDNA?: RenderStyleDNA;
      videoBase64?: string;
      outputPath?: string;
    }
  | { success: false; error: string }
> {
  const uploadDir = path.join(os.tmpdir(), "automated-video-uploads");
  const tempDir = path.join(uploadDir, `video-process-${Date.now()}`);
  const debugRoot = path.join(process.cwd(), "debug");
  const debugRefFramesDir = path.join(debugRoot, "ref_frames");
  const debugOutputFramesDir = path.join(debugRoot, "output_frames");
  const debugStyleDnaPath = path.join(debugRoot, "style_dna.json");
  const debugComparePath = path.join(debugRoot, "frame_timestamp_compare.json");

  try {
    assertRenderStyleDNA(options?.style_dna);
    const style = options.style_dna;
    if (DEBUG_MODE) {
      await fs.promises.mkdir(debugRoot, { recursive: true });
      await fs.promises.writeFile(
        debugStyleDnaPath,
        JSON.stringify(style, null, 2),
        "utf-8"
      );
      console.log("[DEBUG_MODE] style_dna.json");
      console.log(JSON.stringify(style, null, 2));
    }

    // Create temp directory
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    console.log(`Processing video in temp dir: ${tempDir}`);

    // Ensure upload/temp directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Write reference and target videos to temp files
    const referenceVideoPath = path.join(tempDir, "reference.mp4");
    const targetVideoPath = path.join(tempDir, "target.mp4");
    const outputVideoPath = path.join(tempDir, "output.mp4");

    const referenceProvided =
      referenceBuffer !== null && referenceBuffer.length > 0;
    if (referenceProvided) {
      await writeFileAsync(referenceVideoPath, referenceBuffer);
    }
    await writeFileAsync(targetVideoPath, targetBuffer);

    console.log("Videos written to temp files", {
      referenceVideoPath,
      targetVideoPath,
    });

    // ── Resolve FFmpeg ───────────────────────────────────────────────────
    const ffmpegExe = await resolveFfmpeg();
    const safeExe = /\\|\s/.test(ffmpegExe) ? `"${ffmpegExe}"` : ffmpegExe;

    // ── Probe target duration & reference audio (no client defaults) ─────
    let targetDuration = 0;
    let refHasAudio = false;
    try {
      const ffprobeExe = await resolveFfprobe();
      const probeData = await probeFfprobe(targetVideoPath, ffprobeExe);
      if (probeData.duration > 0) targetDuration = probeData.duration;
      if (referenceProvided) {
        try {
          const refProbe = await probeFfprobe(referenceVideoPath, ffprobeExe);
          refHasAudio = refProbe.hasAudio;
        } catch {
          /* assume no audio */
        }
      }
    } catch {
      console.warn("ffprobe failed for target");
    }
    if (!(targetDuration > 0)) {
      return {
        success: false,
        error:
          "Could not determine target video duration — style_dna cannot be applied safely",
      };
    }

    // ── Motion: cuts + motionTimeline → velocity segments → setpts ─────
    const motionSource = resampleTimelineWithCuts(
      style.motionTimeline,
      style.cuts,
      style.duration
    );
    const velocitySegs = timelineToVelocitySegments(
      motionSource,
      style.duration
    );
    let avgRelSpeed = 1.0;
    if (velocitySegs.length > 0) {
      avgRelSpeed =
        velocitySegs.reduce((a, s) => a + s.relative_speed, 0) /
        velocitySegs.length;
    }
    const setptsExpr = buildSetptsExpr(
      velocitySegs,
      avgRelSpeed,
      targetDuration
    );

    // ── Color: histogram CDF → curves (analysis only) ───────────────────
    const curvesFilter = buildCurvesFilterFromCDF(style.colorCDF);

    // ── Cuts: style_dna.cuts → trim/select (hard cuts) ──────────────────
    const scaledCuts = scaleCutTimesToTarget(
      style.cuts,
      style.duration,
      targetDuration
    );
    const cutGraph = buildShotTrimConcatGraph(scaledCuts);

    // ── Beats: style_dna.beatTimestamps → sendcmd ───────────────────────
    const beatCmdPath = path.join(tempDir, "beats.cmd");
    const beatEvents = style.beatTimestamps
      .map((t) =>
        style.duration > 0 ? (t / style.duration) * targetDuration : t
      )
      .filter((t) => t >= 0 && t < targetDuration - 0.02)
      .sort((a, b) => a - b);
    const beatCmdLines: string[] = [];
    for (const t of beatEvents) {
      const start = t.toFixed(3);
      const end = Math.min(targetDuration, t + 0.06).toFixed(3);
      beatCmdLines.push(`${start} beat_eq brightness 0.035;`);
      beatCmdLines.push(`${start} beat_eq contrast 1.055;`);
      beatCmdLines.push(`${end} beat_eq brightness 0;`);
      beatCmdLines.push(`${end} beat_eq contrast 1;`);
    }
    if (beatCmdLines.length > 0) {
      await writeFileAsync(beatCmdPath, `${beatCmdLines.join("\n")}\n`);
    }

    const zoompanExpr = buildZoompanFromMotionTimeline(style.motionTimeline);

    if (
      isFilterGraphStatic({
        cutCount: scaledCuts.length,
        motionPoints: style.motionTimeline.length,
        beatCount: beatEvents.length,
      })
    ) {
      return {
        success: false,
        error:
          "[STRICT FAILURE] style_dna produced static filter graph input (no cuts, no motion timeline, no beats).",
      };
    }

    const stageFilters: string[] = [];
    if (setptsExpr) stageFilters.push(`setpts=${setptsExpr}`);
    if (zoompanExpr) stageFilters.push(zoompanExpr);
    stageFilters.push(curvesFilter);
    if (beatCmdLines.length > 0) {
      stageFilters.push(
        `sendcmd=f='${beatCmdPath.replace(/\\/g, "/").replace(/:/g, "\\:")}'`
      );
      stageFilters.push("eq@beat_eq=brightness=0:contrast=1:saturation=1");
    }
    stageFilters.push("format=yuv420p");

    const sourceLabel = cutGraph.outputLabel;
    const filterGraphParts: string[] = [];
    if (cutGraph.graph) {
      filterGraphParts.push(cutGraph.graph);
      filterGraphParts.push(`[${sourceLabel}]${stageFilters.join(",")}[vout]`);
    } else {
      filterGraphParts.push(`[0:v]${stageFilters.join(",")}[vout]`);
    }
    const filterComplex = filterGraphParts.join(";");

    if (!filterComplex || filterComplex.trim().length === 0) {
      return {
        success: false,
        error: "[STRICT FAILURE] filter_complex is empty.",
      };
    }

    console.log("[filter_complex] FULL GRAPH:");
    console.log(filterComplex);
    if (DEBUG_MODE) {
      console.log("[DEBUG_MODE] filter_complex:");
      console.log(filterComplex);
    }

    const firstBeat =
      style.beatTimestamps.length > 0 ? style.beatTimestamps[0] : 0;
    const seekOffset = firstBeat > 0.05 ? firstBeat : 0;

    const audioTempoFilter =
      setptsExpr && avgRelSpeed > 0.01 ? buildAtempoChain(avgRelSpeed) : "";

    const dynamicCrf = targetDuration > 30 ? 20 : 18;

    console.log(
      `[style_dna] cuts=${style.cuts.length} motionPts=${style.motionTimeline.length} beats=${style.beatTimestamps.length} refDur=${style.duration.toFixed(2)}s targetDur=${targetDuration.toFixed(2)}s setpts=${Boolean(setptsExpr)} zoompan=${Boolean(zoompanExpr)} beatCmd=${beatEvents.length} segments=${cutGraph.segmentCount} avgSpeed=${avgRelSpeed.toFixed(3)}`
    );

    let ffmpegCmd: string;

    const encoderFlags = `-c:v libx264 -profile:v high -pix_fmt yuv420p -preset ultrafast -cpu-used 4 -crf ${dynamicCrf} -threads 0`;

    if (referenceProvided && refHasAudio) {
      const seekFlag = seekOffset > 0.05 ? `-ss ${seekOffset.toFixed(3)}` : "";

      const audioFilters: string[] = [];
      audioFilters.push("aloop=loop=-1:size=2e9");
      audioFilters.push(`atrim=0:${targetDuration.toFixed(3)}`);
      audioFilters.push("asetpts=PTS-STARTPTS");
      if (audioTempoFilter) audioFilters.push(audioTempoFilter);
      const audioChain = `[1:a]${audioFilters.join(",")}[aout]`;

      const durationFlag = `-t ${targetDuration.toFixed(3)}`;

      ffmpegCmd = [
        safeExe,
        "-y",
        seekFlag,
        durationFlag,
        `-i "${targetVideoPath}"`,
        `-stream_loop -1 -i "${referenceVideoPath}"`,
        `-filter_complex "${filterComplex};${audioChain}"`,
        `-map "[vout]" -map "[aout]"`,
        encoderFlags,
        "-c:a aac -b:a 192k",
        "-movflags +faststart",
        `"${outputVideoPath}"`,
      ].join(" ");
    } else {
      const seekFlag2 = seekOffset > 0.05 ? `-ss ${seekOffset.toFixed(3)}` : "";

      ffmpegCmd = [
        safeExe,
        "-y",
        seekFlag2,
        `-i "${targetVideoPath}"`,
        `-filter_complex "${filterComplex}"`,
        `-map "[vout]" -map 0:a?`,
        encoderFlags,
        "-c:a copy",
        "-movflags +faststart",
        `"${outputVideoPath}"`,
      ].join(" ");
    }

    console.log("FFmpeg command:", ffmpegCmd);
    if (DEBUG_MODE) {
      console.log("[DEBUG_MODE] ffmpeg command:");
      console.log(ffmpegCmd);
    }

    const startTime = Date.now();
    try {
      await execAsync(ffmpegCmd, { maxBuffer: 200 * 1024 * 1024 });
    } catch (ffErr: any) {
      console.error("FFmpeg failed:", ffErr?.stderr || ffErr);
      const msg =
        ffErr && (ffErr.stderr || ffErr.message)
          ? ffErr.stderr || ffErr.message
          : String(ffErr);
      return { success: false, error: `FFmpeg processing failed: ${msg}` };
    }
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`FFmpeg processing completed in ${elapsed}s`);

    if (DEBUG_MODE) {
      try {
        const ffprobeExe = await resolveFfprobe();
        if (referenceProvided) {
          await exportDebugFrames(
            ffmpegExe,
            referenceVideoPath,
            debugRefFramesDir
          );
        }
        await exportDebugFrames(
          ffmpegExe,
          outputVideoPath,
          debugOutputFramesDir
        );

        const refTs = referenceProvided
          ? await readFrameTimestamps(ffprobeExe, referenceVideoPath)
          : [];
        const outTs = await readFrameTimestamps(ffprobeExe, outputVideoPath);
        const refSample = sampleFrameTimestamps(refTs);
        const outSample = sampleFrameTimestamps(outTs);
        const pairCount = Math.min(refSample.length, outSample.length);
        const pairs: Array<{
          idx: number;
          ref: number;
          output: number;
          delta: number;
        }> = [];
        for (let i = 0; i < pairCount; i++) {
          const delta = outSample[i] - refSample[i];
          pairs.push({
            idx: i,
            ref: Number(refSample[i].toFixed(4)),
            output: Number(outSample[i].toFixed(4)),
            delta: Number(delta.toFixed(4)),
          });
        }
        await fs.promises.writeFile(
          debugComparePath,
          JSON.stringify(
            {
              generatedAt: new Date().toISOString(),
              referenceFrameCount: refTs.length,
              outputFrameCount: outTs.length,
              sampledPairs: pairs,
            },
            null,
            2
          ),
          "utf-8"
        );
        console.log("[DEBUG_MODE] Saved debug artifacts:", {
          debugStyleDnaPath,
          debugRefFramesDir,
          debugOutputFramesDir,
          debugComparePath,
        });
      } catch (debugErr) {
        console.error("[DEBUG_MODE] artifact generation failed:", debugErr);
      }
    }

    // ── Return result ────────────────────────────────────────────────────
    if (options && options.keepOutput) {
      console.log(`Output video written to: ${outputVideoPath}`);
      return { success: true, styleDNA: style, outputPath: outputVideoPath };
    }

    const outputBuffer = await readFileAsync(outputVideoPath);
    const outputBase64 = await bufferToBase64(outputBuffer);

    console.log(`Output video size: ${outputBuffer.length} bytes`);

    return { success: true, styleDNA: style, videoBase64: outputBase64 };
  } catch (error) {
    console.error("Video processing error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    // Check if it's an FFmpeg not found error
    if (errorMessage.includes("ffmpeg") || errorMessage.includes("not found")) {
      return {
        success: false,
        error:
          "FFmpeg is not installed. Please install FFmpeg to use video processing. Visit: https://ffmpeg.org/download.html",
      };
    }
    return {
      success: false,
      error: `Video processing failed: ${errorMessage}`,
    };
  } finally {
    // ── Robust Temp Cleanup ─────────────────────────────────────────────
    // Always clean up temp files (.png, .mp4, .json) even on errors.
    // If keepOutput is requested, only keep the output file and delete
    // everything else (HALD CLUT pngs, input copies, etc.).
    if (options?.keepOutput) {
      console.log("[CLEANUP] keepOutput=true — cleaning intermediates only");
      try {
        // Delete intermediate files but keep output.mp4
        const intermediates = ["reference.mp4", "target.mp4"];
        for (const f of intermediates) {
          const fp = path.join(tempDir, f);
          try {
            if (fs.existsSync(fp)) fs.unlinkSync(fp);
          } catch {
            /* ignore */
          }
        }
      } catch (e) {
        console.warn("[CLEANUP] intermediate cleanup error:", e);
      }
    } else {
      console.log("[CLEANUP] Deleting all temporary files...");
      try {
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      } catch (cleanupError) {
        console.error("[CLEANUP] Error cleaning temp dir:", cleanupError);
      }
    }

    // ── Stale Temp Cleanup ────────────────────────────────────────────
    // Sweep stale temp directories from previous runs (>30 min old)
    // to prevent Temp folder bloat over time.
    try {
      const staleThreshold = 30 * 60 * 1000; // 30 minutes
      const entries = fs.readdirSync(uploadDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!(entry.isDirectory() && entry.name.startsWith("video-process-")))
          continue;
        const dirPath = path.join(uploadDir, entry.name);
        try {
          const stat = fs.statSync(dirPath);
          if (Date.now() - stat.mtimeMs > staleThreshold) {
            fs.rmSync(dirPath, { recursive: true, force: true });
            console.log(`[CLEANUP] Removed stale temp: ${entry.name}`);
          }
        } catch {
          /* skip inaccessible dirs */
        }
      }
    } catch {
      /* uploadDir may not exist yet */
    }
  }
}

/**
 * Process video with style applied (legacy base64 wrapper — prefer processVideoFromBuffers).
 */
export async function processVideoWithStyle(
  referenceVideoBase64: string,
  targetVideoBase64: string,
  style_dna: RenderStyleDNA,
  options?: { keepOutput?: boolean }
): Promise<
  | {
      success: true;
      styleDNA?: RenderStyleDNA;
      videoBase64?: string;
      outputPath?: string;
    }
  | { success: false; error: string }
> {
  const refBuf = referenceVideoBase64
    ? await base64ToBuffer(referenceVideoBase64)
    : null;
  const tgtBuf = await base64ToBuffer(targetVideoBase64);
  return processVideoFromBuffers(refBuf, tgtBuf, {
    style_dna,
    keepOutput: options?.keepOutput,
  });
}

/**
 * Extract video metadata from a Buffer (avoids base64 overhead).
 */
export async function extractVideoMetadataFromBuffer(
  videoBuffer: Buffer
): Promise<VideoMetadata> {
  const tempDir = path.join(os.tmpdir(), `video-probe-${Date.now()}`);
  try {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const videoPath = path.join(tempDir, "video.mp4");
    await writeFileAsync(videoPath, videoBuffer);

    // ── Step 1: ffprobe → fps, aspect ratio, audio, duration ─────────
    let ffprobeData = {
      fps: 30,
      aspectRatio: "16:9",
      hasAudio: false,
      duration: 10,
    };
    const ffprobeExe = await resolveFfprobe();
    ffprobeData = await probeFfprobe(videoPath, ffprobeExe);
    console.log("ffprobe data:", ffprobeData);

    // ── Step 2: ffmpeg signalstats → brightness / contrast / saturation ─
    const ffmpegExe = await resolveFfmpeg();
    const safeExe = /\\|\s/.test(ffmpegExe) ? `"${ffmpegExe}"` : ffmpegExe;
    const { brightness, contrast, saturation, sharpness, vignette } =
      await analyzeWithFfmpeg(videoPath, safeExe);
    console.log("FFmpeg analysis:", {
      brightness,
      contrast,
      saturation,
      sharpness,
      vignette,
    });

    // ── Step 3: volumedetect → audio volume ──────────────────────────
    let audioVolume = 0.8;
    if (ffprobeData.hasAudio) {
      try {
        audioVolume = await detectAudioVolume(videoPath, ffmpegExe);
      } catch {
        /* optional */
      }
    }

    // ── Derive high-level labels ──────────────────────────────────────
    let colorProfile = "vibrant";
    if (brightness < -0.15 && saturation < 0.8) colorProfile = "dark";
    else if (brightness > 0.15 && saturation > 1.4) colorProfile = "bright";
    else if (saturation < 0.6) colorProfile = "muted";
    else if (saturation > 1.4) colorProfile = "vibrant";

    const transitionStyle = "fade";
    const isCinematic = ffprobeData.fps >= 23 && ffprobeData.fps <= 25;
    const orient = (() => {
      const [w, h] = ffprobeData.aspectRatio.split(":").map(Number);
      const r = (w || 16) / (h || 9);
      return r > 1.2 ? "horizontal" : r < 0.8 ? "vertical" : "square";
    })();

    return {
      colorProfile,
      brightness,
      contrast,
      saturation,
      sharpness,
      vignette,
      aspectRatio: ffprobeData.aspectRatio,
      fps: ffprobeData.fps,
      hasAudio: ffprobeData.hasAudio,
      audioVolume,
      duration: ffprobeData.duration > 0 ? ffprobeData.duration : 10,
      transitionStyle,
      colorMood: colorProfile,
      channelOffsets: { r: 0, g: 0, b: 0 },
      shadowsRgb: { r: 40, g: 40, b: 50 },
      midtonesRgb: { r: 128, g: 128, b: 128 },
      highlightsRgb: { r: 220, g: 220, b: 210 },
      grainDensity: 0.15,
      grainLabel: "light-grain",
      vignetteLabel:
        vignette > 0.15 ? "medium" : vignette > 0.05 ? "light" : "none",
      lensBlur: 0.1,
      lensBlurLabel: "none",
      velocitySegments: [],
      hasSpeedRamp: false,
      avgRelativeSpeed: 1.0,
      motionIntensity: 0.3,
      motionStyle: "smooth",
      isCinematic,
      orientation: orient,
      audioBeatData: { beats: [], firstBeatSec: 0, peakDb: -20 },
      cutTimeline: [],
    };
  } catch (error) {
    console.error("Error extracting metadata from buffer:", error);
    throw new Error(
      "[STRICT FAILURE] Video metadata extraction failed. Default metadata is disabled."
    );
  } finally {
    try {
      if (fs.existsSync(tempDir))
        fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

/**
 * Analyse a video file using ffmpeg signalstats + select filters.
 * This is a pure-FFmpeg approach — no Python required.
 * Processes only the first 5 seconds (up to 150 frames) for speed.
 */
async function analyzeWithFfmpeg(
  videoPath: string,
  safeExe: string
): Promise<{
  brightness: number;
  contrast: number;
  saturation: number;
  sharpness: number;
  vignette: number;
}> {
  // signalstats outputs per-frame YAVG (luma avg), YLOW, YHIGH, SATAVG, etc.
  // We sample the first 5 seconds for speed.
  try {
    const cmd = [
      safeExe,
      `-t 5 -i "${videoPath}"`,
      `-vf "signalstats=stat=tout+vrep+brng,metadata=print:file=-"`,
      "-f null -",
    ].join(" ");
    const { stderr } = await execAsync(cmd, { maxBuffer: 30 * 1024 * 1024 });

    // Parse YAVG (0-255 luma), SATAVG (0-~182 saturation), YHIGH/YLOW for contrast
    const yavgMatches =
      stderr.match(/lavfi\.signalstats\.YAVG=(\d+\.?\d*)/g) ?? [];
    const satMatches =
      stderr.match(/lavfi\.signalstats\.SATAVG=(\d+\.?\d*)/g) ?? [];
    const ylowMatches =
      stderr.match(/lavfi\.signalstats\.YLOW=(\d+\.?\d*)/g) ?? [];
    const yhighMatches =
      stderr.match(/lavfi\.signalstats\.YHIGH=(\d+\.?\d*)/g) ?? [];

    const parseVals = (matches: string[]) =>
      matches
        .map((m) => Number.parseFloat(m.split("=")[1]))
        .filter((v) => !isNaN(v));

    const yavgVals = parseVals(yavgMatches);
    const satVals = parseVals(satMatches);
    const ylowVals = parseVals(ylowMatches);
    const yhighVals = parseVals(yhighMatches);

    const mean = (arr: number[]) =>
      arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    // Brightness: map YAVG (0-255) → ffmpeg eq range [-1, 1], where 128 ≈ 0
    const avgLuma = mean(yavgVals) || 128;
    const brightness = Math.max(-1, Math.min(1, (avgLuma - 128) / 128));

    // Contrast: ratio of dynamic range (YHIGH - YLOW) relative to 128.
    // High dynamic range → high contrast; 128 span → 1.0x
    const avgHigh = mean(yhighVals) || 200;
    const avgLow = mean(ylowVals) || 16;
    const dynamicRange = avgHigh - avgLow;
    const contrast = Math.max(0.3, Math.min(3.0, dynamicRange / 128));

    // Saturation: SATAVG typically 0-182; map to multiplier 0-3.
    // ~60 ≈ neutral (1.0x)
    const avgSat = mean(satVals) || 60;
    const saturation = Math.max(0.1, Math.min(3.0, avgSat / 60));

    // Sharpness: use ffmpeg's blur detect on a handful of frames
    let sharpness = 1.0;
    try {
      const sharpCmd = [
        safeExe,
        `-t 3 -i "${videoPath}"`,
        `-vf "select=not(mod(n\\,15)),blurdetect"`,
        "-f null -",
      ].join(" ");
      const { stderr: sharpStderr } = await execAsync(sharpCmd, {
        maxBuffer: 10 * 1024 * 1024,
      });
      const blurMatches = sharpStderr.match(/blur=(\d+\.?\d*)/g) ?? [];
      const blurVals = blurMatches
        .map((m) => Number.parseFloat(m.split("=")[1]))
        .filter((v) => !isNaN(v));
      if (blurVals.length > 0) {
        const avgBlur = mean(blurVals);
        // blur 0 = perfectly sharp → sharpness 3.0; blur 1 = very blurry → sharpness ~0
        sharpness = Math.max(0, Math.min(3.0, (1 - avgBlur) * 3.0));
      }
    } catch {
      // blurdetect may not be available in older ffmpeg builds
      sharpness = 1.0;
    }

    // Vignette: compare average luma of centre crop vs edges
    // We do this with two cropdetect runs — or approximate from YLOW distribution
    // Simple heuristic: if corners are notably darker, vignette is present
    let vignette = 0.1;
    try {
      // Centre 40% crop
      const centreCmd = `${safeExe} -t 3 -i "${videoPath}" -vf "crop=iw*0.4:ih*0.4:iw*0.3:ih*0.3,signalstats,metadata=print:file=-" -f null -`;
      const { stderr: centreStderr } = await execAsync(centreCmd, {
        maxBuffer: 10 * 1024 * 1024,
      });
      const centreYavg = parseVals(
        centreStderr.match(/lavfi\.signalstats\.YAVG=(\d+\.?\d*)/g) ?? []
      );
      const centreMean = mean(centreYavg) || avgLuma;

      // Vignette = how much darker the full frame is compared to centre
      // (fullAvg < centreAvg → vignette present)
      if (centreMean > 1) {
        vignette = Math.max(
          0,
          Math.min(1, (centreMean - avgLuma) / centreMean)
        );
      }
    } catch {
      vignette = 0.1;
    }

    console.log(
      `analyzeWithFfmpeg → brightness=${brightness.toFixed(3)} contrast=${contrast.toFixed(3)} saturation=${saturation.toFixed(3)} sharpness=${sharpness.toFixed(3)} vignette=${vignette.toFixed(3)}`
    );
    return { brightness, contrast, saturation, sharpness, vignette };
  } catch (err) {
    console.error("analyzeWithFfmpeg failed:", err);
    throw new Error(
      "[STRICT FAILURE] FFmpeg visual analysis failed. Default values are disabled."
    );
  }
}

/**
 * Fallback metadata returned whenever the real extraction fails.
 */
const DEFAULT_METADATA: VideoMetadata = {
  colorProfile: "vibrant",
  brightness: 0.1,
  contrast: 1.3,
  saturation: 1.2,
  sharpness: 1.1,
  vignette: 0.3,
  aspectRatio: "16:9",
  fps: 30,
  hasAudio: true,
  audioVolume: 0.8,
  duration: 10,
  transitionStyle: "fade",
  colorMood: "neutral",
  channelOffsets: { r: 0, g: 0, b: 0 },
  shadowsRgb: { r: 40, g: 40, b: 50 },
  midtonesRgb: { r: 128, g: 128, b: 128 },
  highlightsRgb: { r: 220, g: 220, b: 210 },
  grainDensity: 0.15,
  grainLabel: "light-grain",
  vignetteLabel: "light",
  lensBlur: 0.1,
  lensBlurLabel: "none",
  velocitySegments: [],
  hasSpeedRamp: false,
  avgRelativeSpeed: 1.0,
  motionIntensity: 0.3,
  motionStyle: "smooth",
  isCinematic: false,
  orientation: "horizontal",
  audioBeatData: { beats: [], firstBeatSec: 0, peakDb: -20 },
  cutTimeline: [],
};

/**
 * Resolve the ffprobe executable that ships alongside ffmpeg.
 * Derived from the same candidate paths used in resolveFfmpeg().
 */
async function resolveFfprobe(): Promise<string> {
  const candidates: string[] = [];
  if (process.env.FFPROBE_PATH) candidates.push(process.env.FFPROBE_PATH);
  if (process.env.FFMPEG_PATH) {
    candidates.push(
      process.env.FFMPEG_PATH.replace(/ffmpeg(\.exe)?$/i, "ffprobe$1")
    );
  }
  candidates.push("ffprobe");
  if (process.platform === "win32") {
    // Removed hardcoded C: path — use PATH environment or FFPROBE_PATH instead
  } else {
    candidates.push("/usr/bin/ffprobe", "/usr/local/bin/ffprobe");
  }

  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const cmd = /\\|\s/.test(candidate)
        ? `"${candidate}" -version`
        : `${candidate} -version`;
      await execAsync(cmd);
      return candidate;
    } catch {
      // try next
    }
  }
  throw new Error("ffprobe not found");
}

/**
 * Run analyzer.py against a local video file.
 * Returns the parsed JSON object, or null on any failure.
 */
async function runAnalyzerScript(
  videoPath: string
): Promise<Record<string, any> | null> {
  const scriptPath = path.join(process.cwd(), "scripts", "analyzer.py");
  if (!fs.existsSync(scriptPath)) {
    console.warn("analyzer.py not found at", scriptPath);
    return null;
  }

  const python = (() => {
    if (process.env.PYTHON_PATH) return process.env.PYTHON_PATH;
    const winVenv = path.join(process.cwd(), ".venv", "Scripts", "python.exe");
    if (fs.existsSync(winVenv)) return winVenv;
    const unixVenv = path.join(process.cwd(), ".venv", "bin", "python");
    if (fs.existsSync(unixVenv)) return unixVenv;
    return process.platform === "win32" ? "python" : "python3";
  })();
  const { spawn } = await import("child_process");

  // Pass ffprobe path as 2nd argument so analyzer.py can detect audio beats
  let ffprobePath = "ffprobe";
  try {
    ffprobePath = await resolveFfprobe();
  } catch {
    /* use default */
  }

  const analyzer = spawn(python, [scriptPath, videoPath, ffprobePath], {
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";
  analyzer.stdout.on("data", (d: Buffer) => {
    stdout += d.toString();
  });
  analyzer.stderr.on("data", (d: Buffer) => {
    stderr += d.toString();
  });

  const exitCode: number = await new Promise((resolve) => {
    analyzer.on("close", (code) => resolve(code ?? 0));
    analyzer.on("error", (err) => {
      console.warn("analyzer.py spawn error:", err);
      resolve(1);
    });
  });

  if (exitCode !== 0) {
    console.warn(`analyzer.py exited ${exitCode}: ${stderr.slice(0, 500)}`);
    return null;
  }

  try {
    const parsed = JSON.parse(stdout);
    console.log("analyzer.py output:", parsed);
    return parsed;
  } catch {
    console.warn("Failed to parse analyzer.py output:", stdout.slice(0, 200));
    return null;
  }
}

/**
 * Use ffprobe to read stream-level properties (fps, aspect ratio, audio presence).
 */
async function probeFfprobe(
  videoPath: string,
  ffprobeExe: string
): Promise<{
  fps: number;
  aspectRatio: string;
  hasAudio: boolean;
  duration: number;
}> {
  const cmd = `"${ffprobeExe}" -v quiet -print_format json -show_streams "${videoPath}"`;
  const { stdout } = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 });
  const probe = JSON.parse(stdout);

  let fps = 30;
  let aspectRatio = "16:9";
  let hasAudio = false;
  let duration = 0;

  for (const stream of probe.streams ?? []) {
    if (stream.codec_type === "video") {
      // r_frame_rate is "30/1" or "30000/1001"
      if (stream.r_frame_rate) {
        const [num, den] = stream.r_frame_rate.split("/").map(Number);
        if (den > 0) fps = Math.round(num / den);
      }
      if (
        stream.display_aspect_ratio &&
        stream.display_aspect_ratio !== "0:1"
      ) {
        aspectRatio = stream.display_aspect_ratio;
      } else if (stream.width && stream.height) {
        const gcd = (a: number, b: number): number =>
          b === 0 ? a : gcd(b, a % b);
        const g = gcd(stream.width as number, stream.height as number);
        aspectRatio = `${(stream.width as number) / g}:${(stream.height as number) / g}`;
      }
      if (!duration && stream.duration) {
        duration = Number.parseFloat(stream.duration);
      }
    }
    if (stream.codec_type === "audio") {
      hasAudio = true;
    }
  }

  return { fps, aspectRatio, hasAudio, duration };
}

/**
 * Use ffmpeg's volumedetect filter to compute mean audio volume (0..1).
 * Returns 0.8 on any failure.
 */
async function detectAudioVolume(
  videoPath: string,
  ffmpegExe: string
): Promise<number> {
  try {
    // ffmpeg writes volumedetect output to stderr; execAsync captures both.
    const safeExe = /\\|\s/.test(ffmpegExe) ? `"${ffmpegExe}"` : ffmpegExe;
    const { stderr } = await execAsync(
      `${safeExe} -i "${videoPath}" -af volumedetect -f null -`,
      { maxBuffer: 1 * 1024 * 1024 }
    );
    const match = stderr.match(/mean_volume:\s*([-\d.]+)\s*dB/);
    if (match) {
      const dB = Number.parseFloat(match[1]);
      // Map roughly -60..0 dB → 0..1
      return Math.max(0, Math.min(1, (dB + 60) / 60));
    }
  } catch {
    // volumedetect is optional
  }
  return 0.8;
}

/**
 * Map raw Python analyzer output → typed VideoMetadata.
 *
 * Key mapping:
 *  analyzer `brightness`  → VideoMetadata `brightness`   ([-1, 1] ffmpeg eq range)
 *  analyzer `contrast`    → VideoMetadata `contrast`     ([0.2, 3.0] ffmpeg eq multiplier)
 *  analyzer `saturation`  → VideoMetadata `saturation`   (Python [0,1] → [0, 3] multiplier)
 *  analyzer `sharpness`   → VideoMetadata `sharpness`    (normalized [0, 3])
 *  analyzer `vignette`    → VideoMetadata `vignette`     ([0, 1])
 *  analyzer `duration`    → VideoMetadata `duration`     (seconds)
 *  analyzer `scenes`      → VideoMetadata `transitionStyle`
 *  analyzer `dominant_colors` + brightness/saturation → `colorProfile`
 */
function mapAnalyzerToMetadata(
  raw: Record<string, any>,
  ffprobeData: {
    fps: number;
    aspectRatio: string;
    hasAudio: boolean;
    duration: number;
  },
  audioVolume: number
): VideoMetadata {
  // ── brightness: Python normalises mean V channel to [-1, 1] ─────────────
  const brightness: number =
    typeof raw.brightness === "number"
      ? Math.max(-1, Math.min(1, raw.brightness))
      : DEFAULT_METADATA.brightness;

  // ── contrast: Python returns std-derived multiplier ≈ [0.2, 3.0] ────────
  const contrast: number =
    typeof raw.contrast === "number"
      ? Math.max(0.1, Math.min(4.0, raw.contrast))
      : DEFAULT_METADATA.contrast;

  // ── saturation: Python returns mean S/255 in [0, 1]; ×2 → [0, 2] multiplier
  // 0 = greyscale, 0.5 ≈ neutral (1.0x), 1.0 = fully saturated (2.0x)
  const saturation: number =
    typeof raw.saturation === "number"
      ? Math.max(0, Math.min(3.0, raw.saturation * 2.0))
      : DEFAULT_METADATA.saturation;

  // ── sharpness: Python returns Laplacian-var normalised to [0, 3] ─────────
  const sharpness: number =
    typeof raw.sharpness === "number"
      ? Math.max(0, Math.min(3.0, raw.sharpness))
      : DEFAULT_METADATA.sharpness;

  // ── vignette: Python returns (center-corner)/center clamped to [0,1] ────
  const vignette: number =
    typeof raw.vignette === "number"
      ? Math.max(0, Math.min(1, raw.vignette))
      : DEFAULT_METADATA.vignette;

  // ── duration: prefer ffprobe value; fall back to analyzer ────────────────
  const duration: number =
    ffprobeData.duration > 0
      ? ffprobeData.duration
      : typeof raw.duration === "number"
        ? raw.duration
        : DEFAULT_METADATA.duration;

  // ── transitionStyle: infer from scene count + cut types ───────────────────
  const sceneCount = Array.isArray(raw.scenes) ? raw.scenes.length : 1;
  const cutTimeline = Array.isArray(raw.cut_timeline)
    ? raw.cut_timeline.map((c: any) => ({
        timestamp_sec: Number(c.timestamp_sec) || 0,
        type:
          c.type === "gradual_transition"
            ? ("gradual_transition" as const)
            : ("hard_cut" as const),
        confidence: Number(c.confidence) || 0,
        hist_score: Number(c.hist_score) || 0,
        ecr_score: Number(c.ecr_score) || 0,
        td_score: Number(c.td_score) || 0,
      }))
    : [];
  const hardCuts = cutTimeline.filter(
    (c: { type: string }) => c.type === "hard_cut"
  ).length;
  const gradualCuts = cutTimeline.filter(
    (c: { type: string }) => c.type === "gradual_transition"
  ).length;
  const transitionStyle =
    hardCuts > gradualCuts * 2
      ? "cut"
      : gradualCuts > hardCuts
        ? "slow-fade"
        : sceneCount > 5
          ? "cut"
          : sceneCount > 2
            ? "fade"
            : "slow-fade";

  // ── colorProfile: infer from brightness + saturation levels ──────────────
  let colorProfile = "vibrant";
  if (brightness < -0.2 && saturation < 0.8) colorProfile = "dark";
  else if (brightness > 0.2 && saturation > 1.4) colorProfile = "bright";
  else if (saturation < 0.6) colorProfile = "muted";
  else if (saturation > 1.4) colorProfile = "vibrant";
  else colorProfile = "vibrant";

  // ── Deep-extraction fields from analyzer.py ──────────────────────────
  if (
    typeof raw.color_mood !== "string" ||
    raw.color_mood.trim().length === 0
  ) {
    throw new Error("[STRICT FAILURE] Missing ML color mood classification.");
  }
  const colorMood: string = raw.color_mood;
  const channelOffsets =
    raw.channel_offsets && typeof raw.channel_offsets === "object"
      ? {
          r: Number(raw.channel_offsets.r) || 0,
          g: Number(raw.channel_offsets.g) || 0,
          b: Number(raw.channel_offsets.b) || 0,
        }
      : { r: 0, g: 0, b: 0 };

  const parseRgb = (obj: any, fallback: { r: number; g: number; b: number }) =>
    obj && typeof obj === "object"
      ? {
          r: Number(obj.r) || fallback.r,
          g: Number(obj.g) || fallback.g,
          b: Number(obj.b) || fallback.b,
        }
      : fallback;

  const shadowsRgb = parseRgb(raw.shadows_rgb, { r: 40, g: 40, b: 50 });
  const midtonesRgb = parseRgb(raw.midtones_rgb, { r: 128, g: 128, b: 128 });
  const highlightsRgb = parseRgb(raw.highlights_rgb, {
    r: 220,
    g: 220,
    b: 210,
  });

  const grainDensity =
    typeof raw.grain_density === "number" ? raw.grain_density : 0.15;
  const grainLabel =
    typeof raw.grain_label === "string" ? raw.grain_label : "light-grain";
  const vignetteLabel =
    typeof raw.vignette_label === "string" ? raw.vignette_label : "light";
  const lensBlur = typeof raw.lens_blur === "number" ? raw.lens_blur : 0.1;
  const lensBlurLabel =
    typeof raw.lens_blur_label === "string" ? raw.lens_blur_label : "none";

  const velocitySegments = Array.isArray(raw.velocity_segments)
    ? raw.velocity_segments.slice(0, 60)
    : [];
  const hasSpeedRamp =
    typeof raw.has_speed_ramp === "boolean" ? raw.has_speed_ramp : false;
  const avgRelativeSpeed =
    typeof raw.avg_relative_speed === "number" ? raw.avg_relative_speed : 1.0;

  const motionIntensity: number =
    typeof raw.motion_intensity === "number" ? raw.motion_intensity : 0.3;
  const motionStyle: string =
    typeof raw.motion_style === "string" ? raw.motion_style : "smooth";
  const isCinematic: boolean =
    typeof raw.is_cinematic === "boolean" ? raw.is_cinematic : false;
  const orientation: string =
    typeof raw.orientation === "string" ? raw.orientation : "horizontal";

  const audioRaw = raw.audio && typeof raw.audio === "object" ? raw.audio : {};
  const audioBeatData = {
    beats: Array.isArray(audioRaw.beats) ? audioRaw.beats.slice(0, 80) : [],
    firstBeatSec:
      typeof audioRaw.first_beat_sec === "number" ? audioRaw.first_beat_sec : 0,
    peakDb: typeof audioRaw.peak_db === "number" ? audioRaw.peak_db : -20,
  };

  return {
    colorProfile,
    brightness,
    contrast,
    saturation,
    sharpness,
    vignette,
    aspectRatio: ffprobeData.aspectRatio,
    fps: ffprobeData.fps,
    hasAudio: ffprobeData.hasAudio || audioRaw.has_audio === true,
    audioVolume,
    duration,
    transitionStyle,
    colorMood,
    channelOffsets,
    shadowsRgb,
    midtonesRgb,
    highlightsRgb,
    grainDensity,
    grainLabel,
    vignetteLabel,
    lensBlur,
    lensBlurLabel,
    velocitySegments,
    hasSpeedRamp,
    avgRelativeSpeed,
    motionIntensity,
    motionStyle,
    isCinematic,
    orientation,
    audioBeatData,
    cutTimeline,
  };
}

/**
 * Extract real video metadata by:
 *  1. Running scripts/analyzer.py  → visual metrics (brightness/contrast/saturation/sharpness/vignette)
 *  2. Running ffprobe               → fps / aspect ratio / audio presence / duration
 *  3. Running ffmpeg volumedetect   → audio volume level
 * Falls back to DEFAULT_METADATA if any step is unavailable.
 */
export async function extractVideoMetadata(
  videoBase64: string
): Promise<VideoMetadata> {
  const tempDir = path.join(os.tmpdir(), `video-probe-${Date.now()}`);

  try {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const videoPath = path.join(tempDir, "video.mp4");
    await writeFileAsync(videoPath, await base64ToBuffer(videoBase64));

    // ── Step 1: analyzer.py → visual metrics ─────────────────────────────
    const analyzerResult = await runAnalyzerScript(videoPath);

    // ── Step 2 & 3: ffprobe + volumedetect ───────────────────────────────
    let ffprobeData: {
      fps: number;
      aspectRatio: string;
      hasAudio: boolean;
      duration: number;
    } = {
      fps: 30,
      aspectRatio: "16:9",
      hasAudio: false,
      duration: analyzerResult?.duration ?? 10,
    };
    let audioVolume = 0.8;

    try {
      const ffprobeExe = await resolveFfprobe();
      ffprobeData = await probeFfprobe(videoPath, ffprobeExe);
      console.log("ffprobe data:", ffprobeData);

      if (ffprobeData.hasAudio) {
        try {
          const ffmpegExe = await resolveFfmpeg();
          audioVolume = await detectAudioVolume(videoPath, ffmpegExe);
          console.log("audio volume:", audioVolume);
        } catch {
          // volumedetect is optional
        }
      }
    } catch (probeErr) {
      console.warn(
        "ffprobe unavailable, using defaults for fps/aspectRatio/audio:",
        probeErr
      );
    }

    // ── Step 3: map → VideoMetadata ───────────────────────────────────────
    if (!analyzerResult) {
      console.warn(
        "analyzer.py produced no results; using default visual metrics"
      );
      return {
        ...DEFAULT_METADATA,
        fps: ffprobeData.fps,
        aspectRatio: ffprobeData.aspectRatio,
        hasAudio: ffprobeData.hasAudio,
        audioVolume,
        duration:
          ffprobeData.duration > 0
            ? ffprobeData.duration
            : DEFAULT_METADATA.duration,
        cutTimeline: [],
      };
    }

    return mapAnalyzerToMetadata(analyzerResult, ffprobeData, audioVolume);
  } catch (error) {
    console.error("Error extracting metadata:", error);
    return { ...DEFAULT_METADATA };
  } finally {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (cleanupError) {
      console.error("Error cleaning up temp files:", cleanupError);
    }
  }
}
