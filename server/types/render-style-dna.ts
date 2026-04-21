/**
 * Minimal render contract: analysis output that MUST drive FFmpeg in
 * `processVideoFromBuffers` — no client-side defaults.
 */
import type { FullVideoMetadata, VelocityTimelinePoint } from "./index";

export interface RenderStyleDNA {
  /** Reference shot boundaries (drives future trim/concat; required for parity). */
  cuts: Array<{ time_sec: number; type: string }>;
  /** Per-frame velocity / timing (reference) — drives setpts mapping. */
  motionTimeline: VelocityTimelinePoint[];
  /** Per-channel 256-bin histogram CDF (0–1) — drives curves filter. */
  colorCDF: { r: number[]; g: number[]; b: number[] };
  /** Beat onset times (seconds) from reference audio — audio sync offset. */
  beatTimestamps: number[];
  /** Reference duration (seconds). */
  duration: number;
}

const CDF_LEN = 256;

export function assertRenderStyleDNA(
  d: RenderStyleDNA | null | undefined
): asserts d is RenderStyleDNA {
  if (!d) {
    throw new Error(
      "style_dna is required — run orchestrator analysis (analyzeVideo) before rendering"
    );
  }
  const { colorCDF, motionTimeline, beatTimestamps, duration } = d;
  if (
    !(colorCDF?.r && colorCDF?.g && colorCDF?.b) ||
    colorCDF.r.length !== CDF_LEN ||
    colorCDF.g.length !== CDF_LEN ||
    colorCDF.b.length !== CDF_LEN
  ) {
    throw new Error(
      "style_dna.colorCDF must contain r,g,b arrays of length 256 from analysis"
    );
  }
  if (!Array.isArray(motionTimeline)) {
    throw new Error(
      "style_dna.motionTimeline must be an array from motion analysis"
    );
  }
  if (!Array.isArray(beatTimestamps)) {
    throw new Error(
      "style_dna.beatTimestamps must be an array from audio analysis"
    );
  }
  if (typeof duration !== "number" || !(duration > 0)) {
    throw new Error(
      "style_dna.duration must be a positive number (reference length)"
    );
  }
}

/** Build render DNA from a completed `analyzeVideo` / `FullVideoMetadata` result. */
export function buildRenderStyleDNA(meta: FullVideoMetadata): RenderStyleDNA {
  const cdf = meta.colorGrading.histogramCdf;
  if (!cdf?.r?.length || cdf.r.length !== CDF_LEN) {
    throw new Error(
      "buildRenderStyleDNA: missing 256-bin histogramCdf from color analysis"
    );
  }

  return {
    cuts: meta.shotDetection.cuts.map((c) => ({
      time_sec: c.timestamp_sec,
      type: c.type,
    })),
    motionTimeline: meta.motion.velocityTimeline,
    colorCDF: {
      r: [...cdf.r],
      g: [...cdf.g],
      b: [...cdf.b],
    },
    beatTimestamps: [...meta.audio.beats],
    duration: meta.duration,
  };
}
