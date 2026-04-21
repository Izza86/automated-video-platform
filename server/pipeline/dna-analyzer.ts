import { spawn } from "node:child_process";
import type { DeterministicFrame } from "./deterministic-extractor";

export interface ColorDNA {
  brightness: number; // Luma mean
  contrast: number; // Luma std-dev
  saturation: number; // HSV mean saturation
  exposure: number; // LAB L mean
  flicker: number; // Absolute delta L-mean from prev frame
  hist_rgb: {
    r: number[];
    g: number[];
    b: number[];
  };
  hist_lab: {
    l: number[];
    a: number[];
    b: number[];
  };
  cdf_rgb: {
    r: number[];
    g: number[];
    b: number[];
  };
  lab_mean: {
    l: number;
    a: number;
    b: number;
  };
}

export interface FrameDNA {
  frame_index: number;
  timestamp: number;
  color: ColorDNA;
  motion: {
    meanMagnitude: number;
    maxMagnitude: number;
    directionConsistency: number;
    frameDiff: number;
    zoomSpeed: number;
    cameraType: string;
    model: string;
  };
  depth: {
    averageDepth: number;
    depthVariance: number;
    model: string;
  };
  lighting: {
    exposure: number;
    flicker: number;
  };
  shot_id: number;
  is_cut: boolean;
  beat_alignment: number;
}

/**
 * StyleDNAAnalyzer
 * ────────────────
 * Consumes deterministic frames and produces a frame-by-frame style signature.
 */
export class StyleDNAAnalyzer {
  private static prevLuma = 0.5;

  /**
   * Compute deep color metrics for a single raw frame (rgb24).
   * Includes full LAB conversion and flicker detection.
   */
  static analyzeColor(frame: DeterministicFrame): ColorDNA {
    const { buffer, width, height } = frame;
    const pixelCount = width * height;

    const rHist = new Uint32Array(256);
    const gHist = new Uint32Array(256);
    const bHist = new Uint32Array(256);
    const lHist = new Uint32Array(256);
    const aHist = new Uint32Array(256);
    const bLabHist = new Uint32Array(256); // Rename to avoid confusion with RGB blue

    let totalR = 0,
      totalG = 0,
      totalB = 0;
    let totalL = 0,
      totalA = 0,
      totalBLab = 0;
    let totalSat = 0;
    let totalLuma = 0;

    // Fast RGB to LAB approx + histograms
    for (let i = 0; i < pixelCount; i++) {
      const r = buffer[i * 3];
      const g = buffer[i * 3 + 1];
      const b = buffer[i * 3 + 2];

      rHist[r]++;
      gHist[g]++;
      bHist[b]++;

      totalR += r;
      totalG += g;
      totalB += b;

      // 1. HSV Saturation
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const s = max === 0 ? 0 : (max - min) / max;
      totalSat += s;

      // 2. Strict LAB Conversion (Approximation for performance, but 256-bin accurate)
      // Reference: sRGB -> XYZ -> CIELAB
      const rL = r / 255;
      const gL = g / 255;
      const bL = b / 255;

      const x = 0.412_456_4 * rL + 0.357_576_1 * gL + 0.180_437_5 * bL;
      const y = 0.212_672_9 * rL + 0.715_152_2 * gL + 0.072_175 * bL;
      const z = 0.019_333_9 * rL + 0.119_192 * gL + 0.950_304_1 * bL;

      const f = (v: number) =>
        v > 0.008_856 ? v ** (1 / 3) : 7.787 * v + 16 / 116;
      const fx = f(x / 0.950_47);
      const fy = f(y / 1.0);
      const fz = f(z / 1.088_83);

      const l = 116 * fy - 16;
      const la = 500 * (fx - fy);
      const lb = 200 * (fy - fz);

      // Map LAB to 256 bins
      // L is 0..100, a is -128..128, b is -128..128
      const lBin = Math.max(0, Math.min(255, Math.round((l / 100) * 255)));
      const aBin = Math.max(
        0,
        Math.min(255, Math.round(((la + 128) / 256) * 255))
      );
      const bBin = Math.max(
        0,
        Math.min(255, Math.round(((lb + 128) / 256) * 255))
      );

      lHist[lBin]++;
      aHist[aBin]++;
      bLabHist[bBin]++;

      totalL += l;
      totalA += la;
      totalBLab += lb;
      totalLuma += 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    const exposure = totalL / pixelCount;
    const luma = totalLuma / pixelCount / 255;
    const flicker = Math.abs(luma - StyleDNAAnalyzer.prevLuma);
    StyleDNAAnalyzer.prevLuma = luma;

    // 3. Contrast (Std Dev)
    let sumSqDiff = 0;
    for (let i = 0; i < pixelCount; i++) {
      const lumaP =
        (0.2126 * buffer[i * 3] +
          0.7152 * buffer[i * 3 + 1] +
          0.0722 * buffer[i * 3 + 2]) /
        255;
      const d = lumaP - luma;
      sumSqDiff += d * d;
    }
    const contrast = Math.sqrt(sumSqDiff / pixelCount);

    // 4. Compute Normalized Histograms and CDFs for Color Transfer
    const rHistNorm = Array.from(rHist).map((v) => v / pixelCount);
    const gHistNorm = Array.from(gHist).map((v) => v / pixelCount);
    const bHistNorm = Array.from(bHist).map((v) => v / pixelCount);

    const rCdf = new Float32Array(256);
    const gCdf = new Float32Array(256);
    const bCdf = new Float32Array(256);
    let rSum = 0,
      gSum = 0,
      bSum = 0;

    for (let i = 0; i < 256; i++) {
      rSum += rHistNorm[i];
      gSum += gHistNorm[i];
      bSum += bHistNorm[i];
      rCdf[i] = rSum;
      gCdf[i] = gSum;
      bCdf[i] = bSum;
    }

    return {
      brightness: Number.parseFloat(luma.toFixed(4)),
      contrast: Number.parseFloat(contrast.toFixed(4)),
      saturation: Number.parseFloat((totalSat / pixelCount).toFixed(4)),
      exposure: Number.parseFloat((exposure / 100).toFixed(4)),
      flicker: Number.parseFloat(flicker.toFixed(4)),
      hist_rgb: {
        r: rHistNorm,
        g: gHistNorm,
        b: bHistNorm,
      },
      hist_lab: {
        l: Array.from(lHist).map((v) => v / pixelCount),
        a: Array.from(aHist).map((v) => v / pixelCount),
        b: Array.from(bLabHist).map((v) => v / pixelCount),
      },
      cdf_rgb: {
        r: Array.from(rCdf),
        g: Array.from(gCdf),
        b: Array.from(bCdf),
      },
      lab_mean: {
        l: exposure,
        a: totalA / pixelCount,
        b: totalBLab / pixelCount,
      },
    };
  }

  /**
   * Final production-grade LAB conversion is complex to do in JS at 60fps.
   * We will eventually move the heavy lift to the Python scripts for RAFT/Depth,
   * but keep color analysis in Node for speed where possible.
   */

  /**
   * Start a Python ML process for Motion Analysis (RAFT)
   */
  static startMotionProcess(width: number, height: number, fps: number) {
    const args = [
      "scripts/ml_motion_analysis.py",
      "--stdin",
      "--width",
      width.toString(),
      "--height",
      height.toString(),
      "--fps",
      fps.toString(),
    ];

    const child = spawn("python", args);
    return child;
  }

  /**
   * Start a Python ML process for Shot Detection (Classical/TransNet)
   */
  static startShotProcess(width: number, height: number, fps: number) {
    const args = [
      "scripts/ml_shot_detection.py",
      "--stdin",
      "--width",
      width.toString(),
      "--height",
      height.toString(),
      "--fps",
      fps.toString(),
    ];

    const child = spawn("python", args);
    return child;
  }

  /**
   * Start a Python ML process for Depth Analysis (Depth-Anything V2)
   */
  static startDepthProcess(width: number, height: number, fps: number) {
    const args = [
      "scripts/ml_depth_analysis.py",
      "--stdin",
      "--width",
      width.toString(),
      "--height",
      height.toString(),
      "--fps",
      fps.toString(),
    ];

    const child = spawn("python", args);
    return child;
  }

  /**
   * Validate a DNA sequence for STRICT consistency.
   * Throws if NaN or illegal values are found.
   */
  static validateDNA(dna: FrameDNA[]): void {
    if (dna.length === 0) {
      throw new Error(
        "[STRICT] DNA sequence is empty. Analysis failed to produce any frames."
      );
    }

    let zeroMotionCount = 0;
    let zeroDepthVarCount = 0;

    for (const entry of dna) {
      if (isNaN(entry.timestamp) || isNaN(entry.frame_index)) {
        throw new Error(
          `[STRICT] Corrupt indexing in DNA at frame ${entry.frame_index}`
        );
      }
      if (isNaN(entry.color.brightness) || isNaN(entry.color.saturation)) {
        throw new Error(
          `[STRICT] NaN Color features detected in DNA at frame ${entry.frame_index}`
        );
      }

      // Rejection Rule: Exactly 0.0 magnitude usually means model failure/dummy
      if (entry.motion.meanMagnitude === 0) zeroMotionCount++;
      if (entry.depth.depthVariance === 0) zeroDepthVarCount++;

      if (isNaN(entry.motion.meanMagnitude)) {
        throw new Error(
          `[STRICT] NaN Motion features detected in DNA at frame ${entry.frame_index}`
        );
      }
    }

    const zeroMotionRatio = zeroMotionCount / dna.length;
    const zeroDepthVarRatio = zeroDepthVarCount / dna.length;

    if (zeroMotionRatio > 0.9) {
      throw new Error(
        `[STRICT] Validation Failed: ${Math.round(zeroMotionRatio * 100)}% of frames have 0.0 motion. This indicates a model failure or static dummy output.`
      );
    }
    if (zeroDepthVarRatio > 0.9) {
      throw new Error(
        `[STRICT] Validation Failed: ${Math.round(zeroDepthVarRatio * 100)}% of frames have 0.0 depth variance (flat). This indicates a model failure.`
      );
    }
  }
}
