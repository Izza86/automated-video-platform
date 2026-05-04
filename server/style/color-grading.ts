/**
 * Color Grading Extraction
 *
 * Extracts a comprehensive colour "DNA" fingerprint from a video using
 * FFmpeg analysis passes:
 *
 *   1. `signalstats`  → Luma (Y), Saturation (S), dynamic range.
 *   2. `blurdetect`   → Sharpness / lens blur.
 *   3. Centre-vs-edge crop comparison → Vignette detection.
 *   4. `noise` analysis → Film grain density estimation.
 *   5. Histogram percentile analysis → Shadows / Midtones / Highlights RGB.
 *
 * All values are normalised to ranges the FFmpeg `eq`, `colorbalance`,
 * `colorchannelmixer`, and `haldclut` filters can consume directly.
 *
 * Returns a `ColorGradingResult` with clean JSON for dashboard cards.
 */

import type { ColorGradingResult, RGB, TemporalColorSample } from "../types";
import {
  cleanTempDir,
  execAsync,
  makeTempDir,
  mean,
  parseMetricValues,
  probeVideo,
  resolveFfmpeg,
  safeExe,
  writeTempFile,
} from "../utils/ffmpeg";
import { runMLScript } from "../utils/ml-runner";
import { logger } from "../utils/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────
/**
 * v8: Analyse the FULL video duration, not just 5 seconds.
 * The signalstats pass for per-second color DNA needs the entire video
 * to capture how the editor's color grading evolves from start to end.
 * For the histogram/sharpness/vignette passes we still limit to 10s
 * for speed since those are structural (don't change dramatically).
 */
const STRUCTURAL_ANALYSIS_SEC = 10;

// ─────────────────────────────────────────────────────────────────────────────
// ML Color Analysis Types
// ─────────────────────────────────────────────────────────────────────────────

/** Shape of the ML Python script's JSON output */
interface MLColorResult {
  brightness: number;
  saturation: number;
  contrast: number;
  warmth: number;
  hue: number;
  look: string;
  dominantPalette?: Array<{ hex: string; rgb: number[]; fraction: number }>;
  shadowAnalysis?: {
    avgHue?: number;
    avgSaturation?: number;
    avgBrightness?: number;
  };
  midtoneAnalysis?: {
    avgHue?: number;
    avgSaturation?: number;
    avgBrightness?: number;
  };
  highlightAnalysis?: {
    avgHue?: number;
    avgSaturation?: number;
    avgBrightness?: number;
  };
  eqParams?: {
    brightness: number;
    contrast: number;
    saturation: number;
    gamma: number;
  };
  labStats?: {
    mean_L: number;
    mean_a: number;
    mean_b: number;
    std_L: number;
    std_a: number;
    std_b: number;
  };
  temporalConsistency?: number;
  frameCount?: number;
  duration?: number;
  mlModel?: string;
  error?: string;
  /** Film halation intensity (warm glow, detected from highlight bleed) */
  halation?: number;
  /** Film grain density detected by CNN (0-1) */
  grainDensity?: number;
  /** Luminance contrast standard deviation */
  contrastStd?: number;
  /** Per-channel histogram CDF from ML analysis (256 bins each, 0-1) */
  histogramCdf?: { r: number[]; g: number[]; b: number[] } | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/** Extract the colour-grade fingerprint from a video Buffer. */
export async function extractColorGrading(
  videoBuffer: Buffer
): Promise<ColorGradingResult> {
  const t0 = performance.now();
  const tmp = makeTempDir("color-grade");

  try {
    const videoPath = await writeTempFile(tmp, "input.mp4", videoBuffer);
    const ffmpeg = await resolveFfmpeg();
    const exe = safeExe(ffmpeg);
    const probe = await probeVideo(videoPath);
    const videoDuration = probe.duration || 30;

    // ── ML-first: Reinhard LAB + K-Means via Python ────────────────────
    // Lightweight colour analysis using Reinhard LAB statistics and
    // K-Means palette clustering. No heavy model downloads needed.
    const mlResult = await runMLScript<MLColorResult>(
      "ml_color_transfer.py",
      videoPath,
      ["--frames", "10"],
      Math.max(300_000, videoDuration * 5000) // Scale timeout: min 300s, or 5s per second of video
    );

    if (
      mlResult &&
      !mlResult.error &&
      mlResult.frameCount &&
      mlResult.frameCount > 0
    ) {
      console.log(
        `[color-grade] ML color analysis succeeded: look=${mlResult.look}, ` +
          `brightness=${mlResult.brightness}, saturation=${mlResult.saturation}, ` +
          `model=${mlResult.mlModel}`
      );

      const brightness = mlResult.brightness;
      const saturation = mlResult.saturation;
      const contrast = mlResult.contrast;

      // Derive shadow/midtone/highlight RGB from ML analysis
      const shadowsRgb: RGB = {
        r: Math.round(
          (mlResult.shadowAnalysis?.avgBrightness ?? 0.3) * 200 + 28
        ),
        g: Math.round(
          (mlResult.shadowAnalysis?.avgBrightness ?? 0.3) * 200 + 28
        ),
        b: Math.round(
          (mlResult.shadowAnalysis?.avgBrightness ?? 0.3) * 200 + 28
        ),
      };
      const midtonesRgb: RGB = {
        r: Math.round(
          (mlResult.midtoneAnalysis?.avgBrightness ?? 0.5) * 200 + 28
        ),
        g: Math.round(
          (mlResult.midtoneAnalysis?.avgBrightness ?? 0.5) * 200 + 28
        ),
        b: Math.round(
          (mlResult.midtoneAnalysis?.avgBrightness ?? 0.5) * 200 + 28
        ),
      };
      const highlightsRgb: RGB = {
        r: Math.round(
          (mlResult.highlightAnalysis?.avgBrightness ?? 0.8) * 200 + 28
        ),
        g: Math.round(
          (mlResult.highlightAnalysis?.avgBrightness ?? 0.8) * 200 + 28
        ),
        b: Math.round(
          (mlResult.highlightAnalysis?.avgBrightness ?? 0.8) * 200 + 28
        ),
      };

      // Channel offsets from warmth
      const channelOffsets: RGB = {
        r: mlResult.warmth > 0 ? mlResult.warmth * 0.3 : 0,
        g: 0,
        b: mlResult.warmth < 0 ? Math.abs(mlResult.warmth) * 0.3 : 0,
      };

      const colorProfile = classifyColorProfile(brightness, saturation);
      const colorMood = classifyColorMood(
        brightness,
        saturation,
        channelOffsets
      );

      // Build FFmpeg eq params from ML analysis
      const eqBrightness = Number.parseFloat(
        Math.max(-1, Math.min(1, (brightness - 0.5) * 2)).toFixed(3)
      );
      const eqParams = `brightness=${eqBrightness.toFixed(3)}:contrast=${contrast.toFixed(3)}:saturation=${saturation.toFixed(3)}`;

      const toB = (v: number) => ((v - 128) / 128).toFixed(3);
      // BUG FIX: Reduced highlight boost to prevent overexposure
      // Original highlights were ~228 (0.78 boost), now neutral ~128 (0 boost)
      const neutralHighlights = { r: 128, g: 128, b: 128 };
      const colorbalanceParams =
        `rs=${toB(shadowsRgb.r)}:gs=${toB(shadowsRgb.g)}:bs=${toB(shadowsRgb.b)}` +
        `:rm=${toB(midtonesRgb.r)}:gm=${toB(midtonesRgb.g)}:bm=${toB(midtonesRgb.b)}` +
        `:rh=${toB(neutralHighlights.r)}:gh=${toB(neutralHighlights.g)}:bh=${toB(neutralHighlights.b)}`;

      const rr = (1 + channelOffsets.r * 0.5).toFixed(3);
      const gg = (1 + channelOffsets.g * 0.5).toFixed(3);
      const bb = (1 + channelOffsets.b * 0.5).toFixed(3);
      const hasOffset =
        Math.abs(channelOffsets.r) > 0.01 ||
        Math.abs(channelOffsets.g) > 0.01 ||
        Math.abs(channelOffsets.b) > 0.01;
      const colorchannelmixerParams = hasOffset
        ? `rr=${rr}:gg=${gg}:bb=${bb}`
        : "";

      // v8: Run temporal color analysis AND histogram CDF on the FULL video concurrently
      // ML script may provide its own CDF — use that as priority, fallback to FFmpeg extraction
      const [temporalSamples, ffmpegCdf] = await Promise.all([
        analyzeTemporalColor(exe, videoPath, videoDuration),
        analyzeHistogramCdf(exe, videoPath),
      ]);
      const histogramCdf = mlResult.histogramCdf ?? ffmpegCdf;
      console.log(
        `[color-grade] Temporal color DNA: ${temporalSamples.length} samples across ${videoDuration.toFixed(1)}s`
      );
      console.log(
        `[color-grade] Histogram CDF source: ${mlResult.histogramCdf ? "ML (Python)" : ffmpegCdf ? "FFmpeg extraction" : "NONE"}`
      );

      return {
        brightness,
        contrast,
        saturation,
        sharpness: 1.0, // ML doesn't analyse sharpness, use neutral default
        vignette: 0,
        channelOffsets,
        shadowsRgb,
        midtonesRgb,
        highlightsRgb,
        colorProfile,
        colorMood,
        grainDensity: 0.1,
        grainLabel: "clean" as const,
        lensBlur: 0,
        lensBlurLabel: "none" as const,
        vignetteLabel: "none" as const,
        halationIntensity: mlResult.halation ?? 0,
        halationColor: { r: 255, g: 180, b: 100 },
        hasFilmTexture:
          (mlResult.halation ?? 0) > 0.15 || (mlResult.grainDensity ?? 0) > 0.2,
        filmStockLabel: "digital" as const,
        meanLuminance: Math.round(brightness * 255),
        stdLuminance: Math.round((mlResult.contrastStd ?? 0.2) * 128),
        histogramCdf: histogramCdf ?? undefined,
        eqParams,
        colorbalanceParams,
        colorchannelmixerParams,
        unsharpParams: "5:5:1.00:5:5:0.0",
        temporalSamples,
        processingMs: Math.round(performance.now() - t0),
      };
    }

    // Replace strict failure with logger and fallback.
    logger.failStage("Color Analysis: ML color analysis failed. Using synthetic fallbacks.");
    return {
      highlightsRgb: { r: 255, g: 255, b: 255 },
      colorProfile: "vibrant",
      colorMood: "balanced",
      grainDensity: 0.1,
      lensBlur: 0,
      vignetteLabel: "none",
      halationIntensity: 0,
      meanLuminance: 128,
      stdLuminance: 32,
      brightness: 0.5,
      contrast: 1.0,
      saturation: 1.0,
      sharpness: 1.0,
      vignette: 0,
      channelOffsets: { r: 0, g: 0, b: 0 },
      shadowsRgb: { r: 0, g: 0, b: 0 },
      midtonesRgb: { r: 128, g: 128, b: 128 },
      grainLabel: "clean" as const,
      lensBlurLabel: "none" as const,
      halationColor: { r: 0, g: 0, b: 0 },
      hasFilmTexture: false,
      filmStockLabel: "digital" as const,
      histogramCdf: undefined,
      eqParams: "brightness=0.000:contrast=1.000:saturation=1.000",
      colorbalanceParams: "",
      colorchannelmixerParams: "",
      unsharpParams: "5:5:1.00:5:5:0.0",
      temporalSamples: [],
      processingMs: Math.round(performance.now() - t0),
    };
  } finally {
    cleanTempDir(tmp);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pass 1 — signalstats (brightness, contrast, saturation, grain)
// ─────────────────────────────────────────────────────────────────────────────

interface SignalResult {
  brightness: number;
  contrast: number;
  saturation: number;
  grainDensity: number;
}

async function analyzeSignalStats(
  exe: string,
  videoPath: string
): Promise<SignalResult> {
  const cmd = [
    exe,
    `-t ${STRUCTURAL_ANALYSIS_SEC} -i "${videoPath}"`,
    `-vf "signalstats=stat=tout+vrep+brng,metadata=print:file=-"`,
    "-f null -",
  ].join(" ");

  try {
    const res = await execAsync(cmd, { maxBuffer: 30 * 1024 * 1024 });
    // metadata=print:file=- writes to stdout; combine both streams
    const combined = (res.stdout ?? "") + "\n" + (res.stderr ?? "");
    return parseSignalStats(combined);
  } catch (err: any) {
    const combined = ((err.stdout ?? "") + "\n" + (err.stderr ?? "")).trim();
    if (combined) return parseSignalStats(combined);
    return { brightness: 0, contrast: 1, saturation: 1, grainDensity: 0.15 };
  }
}

function parseSignalStats(output: string): SignalResult {
  const yavg = parseMetricValues(output.match(/YAVG=([\d.]+)/g) ?? []);
  const sat = parseMetricValues(output.match(/SATAVG=([\d.]+)/g) ?? []);
  const ylow = parseMetricValues(output.match(/YLOW=([\d.]+)/g) ?? []);
  const yhigh = parseMetricValues(output.match(/YHIGH=([\d.]+)/g) ?? []);
  const tout = parseMetricValues(output.match(/TOUT=([\d.]+)/g) ?? []);

  // ── Brightness (0 → 1 scale) ──────────────────────────────────────
  // YAVG is in [0, 255].  Map to [0, 1] so we never return negative.
  // Apply a gamma lift (pow 0.75) so that deep-shadow footage isn't
  // collapsed to near-zero — this lets the analyser "see through"
  // dark grades instead of treating the whole video as black.
  const avgLuma = mean(yavg) || 128;
  const linearBrightness = Math.max(0, Math.min(1, avgLuma / 255));
  const brightness = Number.parseFloat((linearBrightness ** 0.75).toFixed(3));

  // ── Contrast ──────────────────────────────────────────────────────
  // Dynamic range in luma levels, normalised so 128-spread → 1.0.
  const dynamicRange = (mean(yhigh) || 200) - (mean(ylow) || 16);
  const contrast = Number.parseFloat(
    Math.max(0.2, Math.min(3.0, dynamicRange / 128)).toFixed(3)
  );

  // ── Saturation (enhanced vivid-color detection) ──────────────────
  // FFmpeg SATAVG is typically 0-~150 for very vivid content.
  // 
  // Improved mapping for better accuracy:
  //   - Adaptive divisor based on content energy (combines YAVG and SATAVG)
  //   - Vivid content (high SATAVG + high brightness) gets multiplier 1.6
  //   - Desaturated content gets clamped better at lower end
  //   - Clamp to [0, 3] for filter safety
  const avgSat = mean(sat) || 60;
  const adaptiveMultiplier = avgSat > 80 && linearBrightness > 0.4 ? 1.6 : avgSat > 60 ? 1.45 : 1.3;
  const saturation = Number.parseFloat(
    Math.max(0.0, Math.min(3.0, (avgSat / 85) * adaptiveMultiplier)).toFixed(3)
  );

  // Temporal outlier (TOUT) percentage as a proxy for film grain
  // High TOUT → noisy / grainy frames
  const avgTout = mean(tout) || 0;
  const grainDensity = Number.parseFloat(
    Math.max(0, Math.min(1, avgTout * 5)).toFixed(3)
  );

  return { brightness, contrast, saturation, grainDensity };
}

// ─────────────────────────────────────────────────────────────────────────────
// Pass 2 — Sharpness & Lens Blur (blurdetect)
// ─────────────────────────────────────────────────────────────────────────────

interface SharpnessResult {
  sharpness: number;
  lensBlur: number;
}

async function analyzeSharpness(
  exe: string,
  videoPath: string
): Promise<SharpnessResult> {
  const cmd = [
    exe,
    `-t ${STRUCTURAL_ANALYSIS_SEC} -i "${videoPath}"`,
    `-vf "select=not(mod(n\\,10)),blurdetect"`,
    "-f null -",
  ].join(" ");

  try {
    const { stderr } = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 });
    const blurVals = parseMetricValues(stderr.match(/blur=([\d.]+)/g) ?? []);

    if (blurVals.length === 0) return { sharpness: 1.0, lensBlur: 0.1 };

    const avgBlur = mean(blurVals);
    const sharpness = Number.parseFloat(
      Math.max(0, Math.min(3.0, (1 - avgBlur) * 3.0)).toFixed(3)
    );
    const lensBlur = Number.parseFloat(
      Math.max(0, Math.min(1.0, avgBlur)).toFixed(3)
    );

    return { sharpness, lensBlur };
  } catch {
    return { sharpness: 1.0, lensBlur: 0.1 };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pass 3 — Vignette (centre vs edge brightness)
// ─────────────────────────────────────────────────────────────────────────────

interface VignetteResult {
  vignette: number;
}

async function analyzeVignette(
  exe: string,
  videoPath: string
): Promise<VignetteResult> {
  try {
    // Full-frame average luma
    const fullCmd = [
      exe,
      `-t ${STRUCTURAL_ANALYSIS_SEC} -i "${videoPath}"`,
      `-vf "signalstats,metadata=print:file=-"`,
      "-f null -",
    ].join(" ");

    // Centre 40% crop average luma
    const centreCmd = [
      exe,
      `-t ${STRUCTURAL_ANALYSIS_SEC} -i "${videoPath}"`,
      `-vf "crop=iw*0.4:ih*0.4:iw*0.3:ih*0.3,signalstats,metadata=print:file=-"`,
      "-f null -",
    ].join(" ");

    const [fullRes, centreRes] = await Promise.all([
      execAsync(fullCmd, { maxBuffer: 10 * 1024 * 1024 }).catch((e: any) => ({
        stdout: e.stdout ?? "",
        stderr: e.stderr ?? "",
      })),
      execAsync(centreCmd, { maxBuffer: 10 * 1024 * 1024 }).catch((e: any) => ({
        stdout: e.stdout ?? "",
        stderr: e.stderr ?? "",
      })),
    ]);

    // metadata=print:file=- writes to stdout; combine both streams
    const fullOut =
      ((fullRes as any).stdout ?? "") + "\n" + ((fullRes as any).stderr ?? "");
    const centreOut =
      ((centreRes as any).stdout ?? "") +
      "\n" +
      ((centreRes as any).stderr ?? "");

    const fullYavg =
      mean(parseMetricValues(fullOut.match(/YAVG=([\d.]+)/g) ?? [])) || 128;

    const centreYavg =
      mean(parseMetricValues(centreOut.match(/YAVG=([\d.]+)/g) ?? [])) || 128;

    const vignette =
      centreYavg > 1
        ? Number.parseFloat(
            Math.max(
              0,
              Math.min(1, (centreYavg - fullYavg) / centreYavg)
            ).toFixed(3)
          )
        : 0.1;

    return { vignette };
  } catch {
    return { vignette: 0.1 };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pass 4 — Histogram Region Analysis (Shadows / Midtones / Highlights RGB)
// ─────────────────────────────────────────────────────────────────────────────

interface HistogramResult {
  channelOffsets: RGB;
  shadowsRgb: RGB;
  midtonesRgb: RGB;
  highlightsRgb: RGB;
}

async function analyzeHistogramRegions(
  exe: string,
  videoPath: string
): Promise<HistogramResult> {
  // Extract per-channel histogram data using FFmpeg's `histogram` filter.
  // We sample 3 frames at evenly-spaced intervals and average.
  //
  // Simpler approach: use `colorbalance` probe by analysing the mean
  // colour of dark/mid/bright pixels via threshold + signalstats.

  try {
    // Shadows: pixels where luma < 64
    const shadowCmd = [
      exe,
      `-t ${STRUCTURAL_ANALYSIS_SEC} -i "${videoPath}"`,
      `-vf "lutyuv=y='if(lt(val,64),val,0)',signalstats,metadata=print:file=-"`,
      "-f null -",
    ].join(" ");

    // Highlights: pixels where luma > 192
    const highlightCmd = [
      exe,
      `-t ${STRUCTURAL_ANALYSIS_SEC} -i "${videoPath}"`,
      `-vf "lutyuv=y='if(gt(val,192),val,0)',signalstats,metadata=print:file=-"`,
      "-f null -",
    ].join(" ");

    const [shadowRes, highlightRes] = await Promise.all([
      execAsync(shadowCmd, { maxBuffer: 10 * 1024 * 1024 }).catch((e: any) => ({
        stdout: e.stdout ?? "",
        stderr: e.stderr ?? "",
      })),
      execAsync(highlightCmd, { maxBuffer: 10 * 1024 * 1024 }).catch(
        (e: any) => ({ stdout: e.stdout ?? "", stderr: e.stderr ?? "" })
      ),
    ]);

    // metadata=print:file=- writes to stdout; combine both streams
    const shadowOut =
      ((shadowRes as any).stdout ?? "") +
      "\n" +
      ((shadowRes as any).stderr ?? "");
    const highlightOut =
      ((highlightRes as any).stdout ?? "") +
      "\n" +
      ((highlightRes as any).stderr ?? "");

    const shadowYavg =
      mean(parseMetricValues(shadowOut.match(/YAVG=([\d.]+)/g) ?? [])) || 40;
    const highlightYavg =
      mean(parseMetricValues(highlightOut.match(/YAVG=([\d.]+)/g) ?? [])) ||
      220;

    // Use saturation signals as rough proxies for colour cast
    const shadowSat =
      mean(parseMetricValues(shadowOut.match(/SATAVG=([\d.]+)/g) ?? [])) || 30;
    const highlightSat =
      mean(parseMetricValues(highlightOut.match(/SATAVG=([\d.]+)/g) ?? [])) ||
      30;

    // Approximate RGB from Y + Sat heuristic (this is rough; a true per-channel
    // histogram requires frame extraction which is slower)
    const shadowsRgb: RGB = {
      r: Math.round(Math.max(0, Math.min(255, shadowYavg - shadowSat * 0.3))),
      g: Math.round(Math.max(0, Math.min(255, shadowYavg))),
      b: Math.round(Math.max(0, Math.min(255, shadowYavg + shadowSat * 0.2))),
    };
    const midtonesRgb: RGB = { r: 128, g: 128, b: 128 };
    const highlightsRgb: RGB = {
      r: Math.round(
        Math.max(0, Math.min(255, highlightYavg + highlightSat * 0.1))
      ),
      g: Math.round(Math.max(0, Math.min(255, highlightYavg))),
      b: Math.round(
        Math.max(0, Math.min(255, highlightYavg - highlightSat * 0.15))
      ),
    };

    // Channel offsets: deviation of each channel from neutral (0 = balanced)
    const channelOffsets: RGB = {
      r: Number.parseFloat(((shadowsRgb.r - 40) / 128).toFixed(3)),
      g: Number.parseFloat(((shadowsRgb.g - 40) / 128).toFixed(3)),
      b: Number.parseFloat(((shadowsRgb.b - 50) / 128).toFixed(3)),
    };

    return { channelOffsets, shadowsRgb, midtonesRgb, highlightsRgb };
  } catch {
    return {
      channelOffsets: { r: 0, g: 0, b: 0 },
      shadowsRgb: { r: 40, g: 40, b: 50 },
      midtonesRgb: { r: 128, g: 128, b: 128 },
      highlightsRgb: { r: 220, g: 220, b: 210 },
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pass 5 — Histogram CDF Analysis (Per-Channel Cumulative Distribution)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract per-channel (R, G, B) histograms from the reference video and
 * compute the Cumulative Distribution Function (CDF) for each channel.
 *
 * The CDF maps input intensity → output intensity and is used by
 * edit-transfer.ts to build a `curves` filter that precisely matches
 * the target's colour distribution to the reference's.
 *
 * Method: Extract frames as PNG images, decode to RGB, count pixel
 * values per channel, normalise → CDF.
 */
async function analyzeHistogramCdf(
  exe: string,
  videoPath: string
): Promise<{ r: number[]; g: number[]; b: number[] } | null> {
  try {
    const tmpDir = makeTempDir("histogram-cdf");

    // Extract ~15 high-quality evenly-spaced frames as PNG images
    // (PNG is lossless → no JPEG compression artefacts affecting histogram)
    // More frames = better histogram precision for accurate color matching
    const frameCount = Math.min(15, Math.ceil(STRUCTURAL_ANALYSIS_SEC * 2));
    const extractCmd = [
      exe,
      `-t ${STRUCTURAL_ANALYSIS_SEC}`,
      `-i "${videoPath}"`,
      `-vf "fps=${frameCount}/${STRUCTURAL_ANALYSIS_SEC},scale=960:-2"`,
      `-frames:v ${frameCount}`,
      `"${tmpDir}/frame_%03d.png"`,
    ].join(" ");

    await execAsync(extractCmd, { maxBuffer: 50 * 1024 * 1024 }).catch(
      (e: any) => {
        console.warn(
          "[color-grade] Histogram CDF frame extraction stderr:",
          (e.stderr || "").slice(0, 300)
        );
      }
    );

    // Read all PNG frames and decode to raw pixel data
    const fs = await import("fs");
    const pathMod = await import("path");
    // @ts-ignore — canvas is optional native module; fallback to rawvideo if unavailable
    const { createCanvas, loadImage } = await import("canvas").catch(() => ({
      createCanvas: null,
      loadImage: null,
    }));

    const files = fs
      .readdirSync(tmpDir)
      .filter((f: string) => f.endsWith(".png"))
      .sort();

    if (files.length === 0) {
      cleanTempDir(tmpDir);
      console.warn("[color-grade] Histogram CDF: no frames extracted");
      return null;
    }

    // Accumulate per-channel histograms (256 bins each)
    const histR = new Float64Array(256);
    const histG = new Float64Array(256);
    const histB = new Float64Array(256);
    let totalPixels = 0;

    if (createCanvas && loadImage) {
      // Path A: node-canvas available — decode PNG directly
      for (const file of files) {
        try {
          const img = await loadImage(pathMod.join(tmpDir, file));
          const canvas = createCanvas(img.width, img.height);
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const data = imageData.data; // RGBA interleaved

          const pixelCount = img.width * img.height;
          for (let i = 0; i < pixelCount; i++) {
            histR[data[i * 4]]++;
            histG[data[i * 4 + 1]]++;
            histB[data[i * 4 + 2]]++;
          }
          totalPixels += pixelCount;
        } catch {
          // skip this frame
        }
      }
    } else {
      // Path B: no node-canvas — re-extract frames as raw RGB24 into single file
      console.log(
        "[color-grade] Histogram CDF: node-canvas unavailable, using rawvideo fallback"
      );
      const rawPath = pathMod.join(tmpDir, "frames.rgb");
      const rawCmd = [
        exe,
        `-t ${STRUCTURAL_ANALYSIS_SEC}`,
        `-i "${videoPath}"`,
        `-vf "fps=1,scale=320:-2,format=rgb24"`,
        "-frames:v 10",
        "-f rawvideo",
        `"${rawPath}"`,
      ].join(" ");

      await execAsync(rawCmd, { maxBuffer: 100 * 1024 * 1024 }).catch(() => {});

      if (fs.existsSync(rawPath)) {
        const data = fs.readFileSync(rawPath);
        // Each pixel is 3 bytes (RGB24)
        const pixelCount = Math.floor(data.length / 3);
        for (let i = 0; i < pixelCount; i++) {
          histR[data[i * 3]]++;
          histG[data[i * 3 + 1]]++;
          histB[data[i * 3 + 2]]++;
        }
        totalPixels = pixelCount;
      }
    }

    cleanTempDir(tmpDir);

    if (totalPixels === 0) {
      console.warn("[color-grade] Histogram CDF: zero pixels read");
      return null;
    }

    // Convert histograms to CDFs (normalised to 0-1)
    const toCdf = (hist: Float64Array): number[] => {
      const cdf = new Array<number>(256);
      let cumulative = 0;
      for (let i = 0; i < 256; i++) {
        cumulative += hist[i];
        cdf[i] = cumulative / totalPixels;
      }
      return cdf;
    };

    const cdf = {
      r: toCdf(histR),
      g: toCdf(histG),
      b: toCdf(histB),
    };

    console.log(
      `[color-grade] ✅ Histogram CDF computed: ${totalPixels.toLocaleString()} pixels from ${files.length} frames`
    );

    return cdf;
  } catch (err) {
    console.warn("[color-grade] Histogram CDF extraction failed:", err);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Classification Helpers
// ─────────────────────────────────────────────────────────────────────────────

function classifyColorProfile(
  brightness: number, // 0-1 scale
  saturation: number
): ColorGradingResult["colorProfile"] {
  // brightness is now 0-1 (gamma-lifted); thresholds adjusted accordingly.
  if (brightness < 0.35 && saturation < 0.8) return "dark";
  if (brightness > 0.65 && saturation > 1.4) return "bright";
  if (saturation < 0.6) return "muted";
  if (saturation > 1.4) return "vivid";
  return "vibrant";
}

function classifyColorMood(
  brightness: number, // 0-1 scale
  saturation: number,
  channelOffsets: RGB
): string {
  // Warm = red/yellow bias; Cool = blue bias; Neutral = balanced
  const warmth = channelOffsets.r - channelOffsets.b;

  if (brightness < 0.35 && saturation < 0.7) return "cinematic";
  if (warmth > 0.15) return "warm";
  if (warmth < -0.15) return "cool";
  if (saturation < 0.5) return "desaturated";
  if (saturation > 1.8) return "hyper-saturated";
  return "neutral";
}

// ─────────────────────────────────────────────────────────────────────────────
// Pass 5 — Midtone RGB (64 < Y < 192)
// ─────────────────────────────────────────────────────────────────────────────

interface MidtoneResult {
  midtonesRgb: RGB;
}

async function analyzeMidtones(
  exe: string,
  videoPath: string
): Promise<MidtoneResult> {
  try {
    // Isolate midtone pixels: 64 < Y < 192
    const cmd = [
      exe,
      `-t ${STRUCTURAL_ANALYSIS_SEC} -i "${videoPath}"`,
      `-vf "lutyuv=y='if(between(val,64,192),val,0)',signalstats,metadata=print:file=-"`,
      "-f null -",
    ].join(" ");

    const res = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 }).catch(
      (e: any) => ({ stdout: e.stdout ?? "", stderr: e.stderr ?? "" })
    );

    // metadata=print:file=- writes to stdout; combine both streams
    const combined =
      ((res as any).stdout ?? "") + "\n" + ((res as any).stderr ?? "");

    const midYavg =
      mean(parseMetricValues(combined.match(/YAVG=([\d.]+)/g) ?? [])) || 128;
    const midSat =
      mean(parseMetricValues(combined.match(/SATAVG=([\d.]+)/g) ?? [])) || 30;

    return {
      midtonesRgb: {
        r: Math.round(Math.max(0, Math.min(255, midYavg + midSat * 0.05))),
        g: Math.round(Math.max(0, Math.min(255, midYavg))),
        b: Math.round(Math.max(0, Math.min(255, midYavg - midSat * 0.05))),
      },
    };
  } catch {
    return { midtonesRgb: { r: 128, g: 128, b: 128 } };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pass 6 — Temporal Color DNA (per-second color evolution across FULL video)
// ─────────────────────────────────────────────────────────────────────────────
//
// v8 CORE INNOVATION: Instead of sampling 5 seconds and averaging into ONE
// static eq, we sample the reference at 1fps across its FULL duration and
// build a per-second timeline of brightness/contrast/saturation/luma.
//
// edit-transfer.ts will then use FFmpeg's `sendcmd` filter to dynamically
// change eq parameters at each second boundary, so the target video's
// colour grade evolves EXACTLY as the reference does.
//
// e.g. Reference: warm intro → cold chorus → desaturated bridge
//      Target:    warm intro → cold chorus → desaturated bridge  ← TEMPORAL DNA
//
// This is the key difference from averaging: we preserve the JOURNEY.

async function analyzeTemporalColor(
  exe: string,
  videoPath: string,
  duration: number
): Promise<TemporalColorSample[]> {
  try {
    // v10.3: Sample at 5fps (every 0.2s) for sub-second flicker detection.
    // Previously 1fps missed rapid brightness/contrast flashes.
    // signalstats gives us per-frame YAVG, SATAVG, YLOW, YHIGH
    const cmd = [
      exe,
      `-i "${videoPath}"`,
      `-vf "fps=5,signalstats,metadata=print:file=-"`,
      "-f null -",
    ].join(" ");

    const res = await execAsync(cmd, {
      maxBuffer: 100 * 1024 * 1024, // 100MB — full video produces lots of output
      timeout: Math.max(60_000, duration * 3000), // Scale timeout with duration
    });

    const combined =
      ((res as any).stdout ?? "") + "\n" + ((res as any).stderr ?? "");
    const samples = parseTemporalSignalStats(combined, duration);

    // ── Blur detection pass (Laplacian variance) ─────────────────────
    //    Run a second lightweight FFmpeg pass at 5fps.
    //    Compute per-frame blurriness using signalstats YAVG variance
    //    between consecutive frames.  Low YHIGH-YLOW = blurry.
    //    This detects intentional blur effects, defocus transitions,
    //    and motion blur in the reference.
    try {
      await addBlurDetection(exe, videoPath, duration, samples);
    } catch (blurErr) {
      console.warn(
        "[color-grade] Blur detection pass failed (non-fatal):",
        blurErr
      );
    }

    return samples;
  } catch (err: any) {
    // Try parsing partial output on error
    const combined = ((err.stdout ?? "") + "\n" + (err.stderr ?? "")).trim();
    if (combined.length > 100) {
      const partial = parseTemporalSignalStats(combined, duration);
      if (partial.length > 0) {
        console.log(
          `[color-grade] Temporal analysis partial: ${partial.length} samples recovered from error`
        );
        return partial;
      }
    }
    throw new Error(
      "[STRICT FAILURE] Temporal color analysis failed. Color fallback is disabled."
    );
  }
}

/**
 * Detect blur level per-frame using Laplacian variance via signalstats.
 * Low dynamic range (YHIGH - YLOW) relative to mean indicates blur.
 * This is computed from the existing samples — no extra FFmpeg pass needed.
 *
 * Supplements with edge-based blur detection: frames where the
 * YAVG is normal but YHIGH-YLOW collapses indicate intentional blur.
 */
async function addBlurDetection(
  exe: string,
  videoPath: string,
  duration: number,
  samples: TemporalColorSample[]
): Promise<void> {
  if (samples.length < 2) return;

  // Compute per-sample blur from dynamic range collapse.
  // Sharp frames have wide dynamic range (YHIGH - YLOW > 150).
  // Blurry frames have narrow range (< 80).
  // We use the raw meanLuma and contrast (which encodes dynamic range)
  // to derive blur level.
  //
  // blur = 1 - normalised_contrast (where contrast < baseline = blurry)
  // Baseline contrast comes from the video's median.
  // Also run a separate Laplacian-based pass for more accurate blur
  // Using FFmpeg's bwdif + signalstats to detect edge sharpness
  try {
    const blurCmd = [
      exe,
      `-i "${videoPath}"`,
      // Extract 5fps, apply edge detection (Sobel-like via convolution),
      // then measure the resulting edge energy via signalstats YAVG.
      // High YAVG on edge-detected frames = sharp. Low = blurry.
      `-vf "fps=5,convolution=0 -1 0 -1 4 -1 0 -1 0:0 -1 0 -1 4 -1 0 -1 0:0 -1 0 -1 4 -1 0 -1 0:0 -1 0 -1 4 -1 0 -1 0,signalstats,metadata=print:file=-"`,
      "-f null -",
    ].join(" ");

    const blurRes = await execAsync(blurCmd, {
      maxBuffer: 50 * 1024 * 1024,
      timeout: Math.max(30_000, duration * 2000),
    });

    const blurOutput =
      ((blurRes as any).stdout ?? "") + "\n" + ((blurRes as any).stderr ?? "");

    // Parse Laplacian YAVG values — higher = sharper edges
    const edgeValues: { time: number; edgeEnergy: number }[] = [];
    let currentTime = -1;
    let edgeYavg = 0;

    for (const line of blurOutput.split("\n")) {
      const timeMatch = line.match(/pts_time[=:](\d+\.?\d*)/);
      if (timeMatch) {
        if (currentTime >= 0) {
          edgeValues.push({ time: currentTime, edgeEnergy: edgeYavg });
        }
        currentTime = Number.parseFloat(timeMatch[1]);
        edgeYavg = 0;
        continue;
      }
      const yavgMatch = line.match(/YAVG=([\d.]+)/);
      if (yavgMatch) {
        edgeYavg = Number.parseFloat(yavgMatch[1]);
      }
    }
    if (currentTime >= 0) {
      edgeValues.push({ time: currentTime, edgeEnergy: edgeYavg });
    }

    if (edgeValues.length > 0) {
      // Normalise edge energy with confidence scoring for better blur detection
      const maxEdge = Math.max(...edgeValues.map((e) => e.edgeEnergy), 1);
      const meanEdge = edgeValues.reduce((sum, e) => sum + e.edgeEnergy, 0) / edgeValues.length;
      const edgeStdDev = Math.sqrt(
        edgeValues.reduce((sum, e) => sum + Math.pow(e.edgeEnergy - meanEdge, 2), 0) / edgeValues.length
      );

      // Map edge energy to blur level: high edges = sharp (blur=0), low = blurry (blur=1)
      // Use statistical bounds for more accurate blur classification
      for (const sample of samples) {
        // Find nearest edge measurement
        let nearest = edgeValues[0];
        let nearestDist = Math.abs(sample.time_sec - nearest.time);
        for (const ev of edgeValues) {
          const dist = Math.abs(sample.time_sec - ev.time);
          if (dist < nearestDist) {
            nearest = ev;
            nearestDist = dist;
          }
        }

        if (nearestDist < 0.5) {
          // Enhanced blur detection: compare against statistical mean
          // Frames below mean - stdDev are considered blurry
          const sharpnessScore = (nearest.edgeEnergy - (meanEdge - edgeStdDev)) / (edgeStdDev + 1);
          sample.blurLevel = Number.parseFloat(
            Math.max(0, Math.min(1, 1 - Math.max(0, sharpnessScore))).toFixed(3)
          );
        }
      }

      const blurCount = samples.filter((s) => (s.blurLevel ?? 0) > 0.4).length;
      console.log(
        `[color-grade] Blur detection: ${blurCount}/${samples.length} frames have blur > 0.4`
      );
      return;
    }
  } catch {
    // Laplacian pass failed — fall back to contrast-based blur
  }

  throw new Error(
    "[STRICT FAILURE] Blur edge-analysis failed. Blur fallback is disabled."
  );
}

/**
 * Global Look Fallback — when temporal per-second analysis fails,
 * compute the reference video's MEDIAN brightness / contrast / saturation
 * from a quick signalstats pass and replicate those values across the
 * full duration at 1-second intervals.  This ensures the target video
 * still receives a consistent cinematic mood instead of an empty timeline.
 */
async function buildGlobalLookFallback(
  exe: string,
  videoPath: string,
  duration: number
): Promise<TemporalColorSample[]> {
  try {
    // Quick 5-second sample to derive median color values
    const sampleSec = Math.min(5, duration);
    const cmd = [
      exe,
      `-t ${sampleSec} -i "${videoPath}"`,
      `-vf "fps=2,signalstats,metadata=print:file=-"`,
      "-f null -",
    ].join(" ");

    const res = await execAsync(cmd, {
      maxBuffer: 10 * 1024 * 1024,
      timeout: 30_000,
    });

    const combined =
      ((res as any).stdout ?? "") + "\n" + ((res as any).stderr ?? "");

    // Collect raw metric arrays
    const yavgs: number[] = [];
    const satavgs: number[] = [];
    const ylows: number[] = [];
    const yhighs: number[] = [];

    for (const line of combined.split("\n")) {
      const yavgM = line.match(/YAVG=([\d.]+)/);
      if (yavgM) yavgs.push(Number.parseFloat(yavgM[1]));
      const satM = line.match(/SATAVG=([\d.]+)/);
      if (satM) satavgs.push(Number.parseFloat(satM[1]));
      const ylM = line.match(/YLOW=([\d.]+)/);
      if (ylM) ylows.push(Number.parseFloat(ylM[1]));
      const yhM = line.match(/YHIGH=([\d.]+)/);
      if (yhM) yhighs.push(Number.parseFloat(yhM[1]));
    }

    // Compute medians (sort + middle element)
    const median = (arr: number[]) => {
      if (arr.length === 0) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
    };

    const medYavg = median(yavgs) || 128;
    const medSatavg = median(satavgs) || 45;
    const medYlow = median(ylows) || 16;
    const medYhigh = median(yhighs) || 235;

    const linearBrightness = Math.max(0, Math.min(1, medYavg / 255));
    const brightness = Number.parseFloat((linearBrightness ** 0.75).toFixed(3));
    const dynamicRange = medYhigh - medYlow;
    const contrast = Number.parseFloat(
      Math.max(0.2, Math.min(3.0, dynamicRange / 128)).toFixed(3)
    );
    const saturation = Number.parseFloat(
      Math.max(0.0, Math.min(3.0, (medSatavg / 90) * 1.35)).toFixed(3)
    );
    const meanLuma = Math.round(medYavg);

    // Replicate the global look across the full duration at 1-second intervals
    const samples: TemporalColorSample[] = [];
    for (let t = 0; t < duration; t++) {
      samples.push({ time_sec: t, brightness, contrast, saturation, meanLuma });
    }

    console.log(
      `[color-grade] Global Look fallback: brightness=${brightness}, contrast=${contrast}, ` +
        `saturation=${saturation} → ${samples.length} uniform samples`
    );
    return samples;
  } catch (fallbackErr) {
    console.error(
      "[color-grade] Global Look fallback also failed:",
      fallbackErr
    );
    return [];
  }
}

/**
 * Parse FFmpeg signalstats metadata output into per-second TemporalColorSample[].
 *
 * FFmpeg metadata=print format:
 *   frame:0    pts:0       pts_time:0.000000
 *   lavfi.signalstats.YAVG=128.5
 *   lavfi.signalstats.SATAVG=45.2
 *   lavfi.signalstats.YLOW=16
 *   lavfi.signalstats.YHIGH=235
 *   frame:1    pts:30000   pts_time:1.000000
 *   ...
 *
 * We extract per-frame metrics and convert them to our normalised scale:
 *   brightness:  YAVG / 255             (0-1)
 *   contrast:    (YHIGH - YLOW) / 128   (0-3, where 1.0 = neutral)
 *   saturation:  (SATAVG / 90) * 1.35   (0-3, matching our structural mapping)
 *   meanLuma:    YAVG raw               (0-255)
 */
function parseTemporalSignalStats(
  output: string,
  duration: number
): TemporalColorSample[] {
  const samples: TemporalColorSample[] = [];

  // Split into frame blocks
  const lines = output.split("\n");
  let currentTime = -1;
  let yavg = 0;
  let satavg = 0;
  let ylow = 16;
  let yhigh = 235;

  for (const line of lines) {
    // Detect frame boundary with timestamp
    const timeMatch = line.match(/pts_time[=:](\d+\.?\d*)/);
    if (timeMatch) {
      // Save the previous frame if we had one
      if (currentTime >= 0) {
        const linearBrightness = Math.max(0, Math.min(1, yavg / 255));
        const brightness = Number.parseFloat(
          (linearBrightness ** 0.75).toFixed(3)
        );
        const dynamicRange = yhigh - ylow;
        const contrast = Number.parseFloat(
          Math.max(0.2, Math.min(3.0, dynamicRange / 128)).toFixed(3)
        );
        const saturation = Number.parseFloat(
          Math.max(0.0, Math.min(3.0, (satavg / 90) * 1.35)).toFixed(3)
        );

        samples.push({
          time_sec: currentTime,
          brightness,
          contrast,
          saturation,
          meanLuma: Math.round(yavg),
        });
      }

      currentTime = Number.parseFloat(timeMatch[1]);
      // Reset for new frame
      yavg = 0;
      satavg = 0;
      ylow = 16;
      yhigh = 235;
      continue;
    }

    // Parse individual metrics
    const yavgMatch = line.match(/YAVG=([\d.]+)/);
    if (yavgMatch) {
      yavg = Number.parseFloat(yavgMatch[1]);
      continue;
    }

    const satMatch = line.match(/SATAVG=([\d.]+)/);
    if (satMatch) {
      satavg = Number.parseFloat(satMatch[1]);
      continue;
    }

    const ylowMatch = line.match(/YLOW=([\d.]+)/);
    if (ylowMatch) {
      ylow = Number.parseFloat(ylowMatch[1]);
      continue;
    }

    const yhighMatch = line.match(/YHIGH=([\d.]+)/);
    if (yhighMatch) {
      yhigh = Number.parseFloat(yhighMatch[1]);
    }
  }

  // Don't forget the last frame
  if (currentTime >= 0) {
    const linearBrightness = Math.max(0, Math.min(1, yavg / 255));
    const brightness = Number.parseFloat((linearBrightness ** 0.75).toFixed(3));
    const dynamicRange = yhigh - ylow;
    const contrast = Number.parseFloat(
      Math.max(0.2, Math.min(3.0, dynamicRange / 128)).toFixed(3)
    );
    const saturation = Number.parseFloat(
      Math.max(0.0, Math.min(3.0, (satavg / 90) * 1.35)).toFixed(3)
    );

    samples.push({
      time_sec: currentTime,
      brightness,
      contrast,
      saturation,
      meanLuma: Math.round(yavg),
    });
  }

  console.log(
    `[color-grade] Parsed ${samples.length} temporal color samples from ${duration.toFixed(1)}s video`
  );

  return samples;
}
