/**
 * StyleDNA — Semantic Style Fingerprint Schema
 *
 * A StyleDNA encapsulates the SEMANTIC essence of a reference video's
 * editorial identity across 6 perceptual domains.  It is NOT a direct
 * mirror of raw analysis measurements — it is a distilled, render-ready
 * description of cinematic INTENT.
 *
 * Three-stage pipeline:
 *   extractStyleDNA(FullVideoMetadata)        → StyleDNA
 *   adaptToTargetContent(StyleDNA, Context)   → AdaptedStyleDNA
 *   generateFilterGraph(AdaptedStyleDNA, ctx) → FilterGraphOutput
 *
 * Semantic vs. proportional transformation:
 *   ✗ Proportional: "apply blur at proportional timestamp t×ratio"
 *   ✓ Semantic:     "apply blur at target's highest-motion timestamp"
 *
 *   ✗ Proportional: "apply dark grade at second 6.0 × ratio"
 *   ✓ Semantic:     "apply dark grade during target's low-energy section"
 *
 *   ✗ Proportional: "place cut at 3.1s × ratio"
 *   ✓ Semantic:     "place cut at target's 3rd strongest beat onset"
 */

import type {
  BeatEvent,
  DepthAnalysisResult,
  MotionAnalysisResult,
  RGB,
  ShotBoundary,
  TemporalColorSample,
} from "./index";

// ─────────────────────────────────────────────────────────────────────────────
// Pacing Domain
// ─────────────────────────────────────────────────────────────────────────────

export interface PacingDNA {
  /** Cuts per second across the reference (density, not raw timestamps) */
  cutDensity: number;
  /** Average shot length in seconds */
  avgShotLen: number;
  /**
   * 0–1: how tightly the reference edit is aligned to its own beat grid.
   * Computed as the fraction of hard cuts within 100 ms of a beat onset.
   * High tempo-alignment → the adapter should also snap target cuts to beats.
   */
  tempoAlignment: number;
  /** Standard deviation of shot lengths (high = dynamic pacing) */
  shotLengthVariance: number;
  /** Human-readable pace label */
  editingPace: "rapid" | "moderate" | "slow";
  /** Confidence scores of each detected hard cut (sorted descending) */
  hardCutConfidences: number[];
  /** Number of gradual transitions detected */
  gradualTransitionCount: number;
  /** Transition subtype counts e.g. { dissolve: 3, flash_transition: 1 } */
  transitionProfile: Record<string, number>;
  /** Raw gradual transition data retained for replication */
  gradualTransitions: Array<{
    refTime: number;
    subtype: string;
    duration: number;
    tdScore: number;
    histScore: number;
    ecrScore: number;
  }>;
  /** Raw timestamps of detected hard cuts (for deterministic replication) */
  rawCutTimestamps: number[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Motion Domain
// ─────────────────────────────────────────────────────────────────────────────

export interface MotionDNA {
  /** 0–1 overall camera activity (from motionIntensity) */
  cameraEnergy: number;
  /**
   * 0–1 foreground-background separation depth (from Depth-Anything V2).
   * High = strong subject/background separation, ideal for parallax replication.
   */
  parallaxStrength: number;
  /**
   * Dominant camera direction vector (normalised unit vector).
   * Computed from the mean panX/panY of the motionTimeline.
   * Used to bias the target's zoom/pan direction semantically.
   */
  motionDirectionBias: { x: number; y: number };
  /** High-level velocity style label */
  velocityProfile: "static" | "smooth" | "dynamic" | "chaotic";
  /** Dominant zoom direction across the reference */
  zoomDominance: "zoom-in" | "zoom-out" | "none";
  /** Average zoom speed magnitude (signed: positive = in) */
  avgZoomSpeed: number;
  /** 0–1 handheld camera shake intensity */
  shakeIntensity: number;
  /** Number of abrupt speed changes (jhatka events) */
  jhatkaCount: number;
  /** Peak optical-flow magnitude (px/frame) */
  peakMagnitude: number;
  /** Whether the reference exhibits cinematic camera work */
  isCinematic: boolean;
  /** Average magnitude of motion spikes (for fallback pacing robustness) */
  motionSpikeFrequency: number;
  /** Whether significant motion spikes detected (good for synthetic cuts) */
  hasMotionSpikes: boolean;
  /** Full per-frame velocity timeline (for setpts expression building) */
  velocityTimeline: Array<{ time_sec: number; relative_speed: number }>;
  /** Per-frame zoom timeline (for zoompan expression building) */
  zoomTimeline: Array<{ time_sec: number; zoomSpeed: number }>;
  /** Per-frame camera motion timeline (pan/shake signals) */
  cameraMotionTimeline: Array<{
    time_sec: number;
    panX: number;
    panY: number;
    magnitude: number;
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Color Domain
// ─────────────────────────────────────────────────────────────────────────────

export interface ColorDNA {
  /**
   * 32-point master tone curve signature (normalised, 0–1 values).
   * Derived from the luminance-averaged histogram CDF sampled at step=8.
   * This is the global tonal fingerprint of the reference grade.
   */
  toneCurveSignature: number[];
  /**
   * Full per-channel CDF for histogram matching (256 entries each).
   * Null if unavailable — falls back to colorbalance/HALD.
   */
  histogramCdf: { r: number[]; g: number[]; b: number[] } | null;
  /**
   * Dominant color palette clusters extracted from the reference.
   * [shadows, midtones, highlights, halation (optional)]
   */
  paletteClusters: RGB[];
  /**
   * 0–1 warmth/skin bias.
   * Derived from the ratio of warm-hued pixels in the highlight/midtone range.
   * High = warm golden/orange grade (skin-flattering).
   * Low = cool/desaturated grade.
   */
  skinBias: number;
  /** Human-readable color mood (warm / cool / cinematic / vintage …) */
  colorMood: string;
  /** Color profile label */
  colorProfile: "dark" | "muted" | "vibrant" | "vivid" | "bright";
  /** Mean luminance of the reference (0–255) */
  meanLuminance: number;
  /** Luminance standard deviation */
  stdLuminance: number;
  /**
   * Per-second temporal color evolution.
   * Used for the sendcmd-driven contrast/saturation evolution.
   * The semantic adapter re-maps these by energy level, not proportional time.
   */
  temporalColorEvolution: TemporalColorSample[];
  /** Pre-built FFmpeg colorbalance filter string (fallback) */
  colorbalanceParams: string;
  /** Pre-built FFmpeg colorchannelmixer filter string (fallback, may be empty) */
  colorchannelmixerParams: string;
  /** Mood segments extracted from reference timeline for dynamic grading */
  moodSegments: Array<{
    start_sec: number;
    end_sec: number;
    labMean: { l: number; a: number; b: number };
    contrastMean: number;
    saturationVariance: number;
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Lighting Domain
// ─────────────────────────────────────────────────────────────────────────────

export interface LightingDNA {
  /**
   * Temporal brightness standard deviation.
   * High = volatile exposure with strong highlights/shadows oscillation.
   * Directly maps to the flicker frequency and amplitude.
   */
  exposureVolatility: number;
  /**
   * 0–1 highlight rolloff softness.
   * Derived from the CDF slope in the 0.75–1.0 luma range.
   * 0 = clipped/harsh highlights, 1 = gentle film-like rolloff.
   */
  highlightRolloff: number;
  /**
   * 0–1 shadow depth (how crushed the blacks are).
   * Derived from 1 – CDF value at luma=64 (0.25 range).
   * 0 = lifted/matte shadows, 1 = deep crushed blacks.
   */
  shadowDepth: number;
  /** Film halation intensity (warm glow around bright areas, 0–1) */
  halationIntensity: number;
  /** Vignette strength (0–1) */
  vignetteStrength: number;
  /**
   * Derived flicker frequency in Hz.
   * Computed: max(0.5, min(12.0, lumaStd * 50))
   * Low variance → slow breathing; high variance → aggressive strobe.
   */
  flickerFreq: number;
  /**
   * Peak brightness oscillation amplitude (0–0.6).
   * Computed: max(0.02, min(0.6, lumaRange * 1.5 * boost))
   * Boosted by 20% if lumaStd > 0.08 (high-energy reference).
   */
  flickerAmplitude: number;
  /** Exposure response inertia (0–1, high = slower adaptation) */
  exposureInertia: number;
  /** Stochastic modulation strength for organic auto-exposure feel (0–1) */
  stochasticJitter: number;
  /** Reference exposure curve points used for target auto-exposure simulation */
  exposureCurvePoints: Array<{ refTime: number; brightness: number }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Rhythm Domain
// ─────────────────────────────────────────────────────────────────────────────

export interface RhythmDNA {
  /**
   * Fractional distribution of beat spectral bands.
   * Each value is 0–1 (fraction of total beats), summing to 1.
   * sub-bass/bass = heavy kick-driven, high = hi-hat/snare driven.
   */
  beatTypeDistribution: Record<BeatEvent["band"], number>;
  /**
   * 0–1 sync strength: fraction of reference hard cuts within 100 ms of a beat.
   * High = the editor cut on the beat; Low = free-form editing.
   */
  syncStrength: number;
  /**
   * Drop zone events from the reference — moments of peak energy.
   * These are NOT stored as timestamps.  They are stored as
   * { refTime, intensity, band } so the adapter can find corresponding
   * moments in the TARGET's beat grid by intensity rank.
   */
  dropZones: Array<{
    refTime: number;
    intensity: number;
    band: BeatEvent["band"];
  }>;
  /** Global BPM */
  bpm: number;
  /** Beats per second */
  beatDensity: number;
  /** Average beat intensity (0–1) */
  avgBeatIntensity: number;
  /** Peak beat intensity */
  peakBeatIntensity: number;
  /** Full beat event list for fine-grained mapping */
  beatEvents: BeatEvent[];
  /** Classified beat roles for content-aware response mapping */
  classifiedBeats: Array<{
    refTime: number;
    class: "hard_kick" | "snare" | "hi_hat" | "drop_moment";
    intensity: number;
    flux: number;
    lowFreqEnergy: number;
  }>;
  /** Distribution of beat classes (fractions summing to ~1) */
  beatClassDistribution: Record<
    "hard_kick" | "snare" | "hi_hat" | "drop_moment",
    number
  >;
  /** Time signature guess */
  timeSignature: "4/4" | "3/4" | "6/8" | "unknown";
}

// ─────────────────────────────────────────────────────────────────────────────
// Texture Domain
// ─────────────────────────────────────────────────────────────────────────────

export interface TextureDNA {
  /** Film grain profile */
  grainProfile: {
    /** 0–1 grain density */
    density: number;
    /** 0–100 FFmpeg noise units */
    strength: number;
    label: "clean" | "light-grain" | "medium-grain" | "heavy-grain";
  };
  /**
   * Reference sharpness level (0–2, FFmpeg unsharp scale).
   * Cloned directly to target — sharpness is a timeless style property.
   */
  sharpnessProfile: number;
  /**
   * Blur events detected in the reference (blurLevel > 0.15).
   * Stored with the RELATIVE blur intensity, not timestamps.
   * The adapter maps these to the target's own motion-peak moments.
   */
  blurPattern: Array<{
    /** Timestamp in the reference video (for debugging only) */
    refTime: number;
    /** Blur event duration in seconds */
    refDuration: number;
    /** ML-detected blur level (0.15–1.0) */
    blurLevel: number;
    /** Computed FFmpeg boxblur radius (1–5) */
    radius: number;
  }>;
  /** Whether reference has analogue film texture */
  hasFilmTexture: boolean;
  /** Film stock classification */
  filmStockLabel: "digital" | "35mm" | "16mm" | "super8" | "vintage";
  /** Lens blur / bokeh intensity (0–1) */
  lensBlur: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Top-Level StyleDNA
// ─────────────────────────────────────────────────────────────────────────────

export interface StyleDNA {
  /** Source video duration in seconds */
  sourceDuration: number;
  /** ISO timestamp of extraction */
  extractedAt: string;
  /** Engine version */
  engineVersion: "v11" | "v12";
  pacing: PacingDNA;
  motion: MotionDNA;
  color: ColorDNA;
  lighting: LightingDNA;
  rhythm: RhythmDNA;
  texture: TextureDNA;
}

// ─────────────────────────────────────────────────────────────────────────────
// Target Content Context
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The raw content characteristics of the TARGET video.
 * This is what the adapter uses to place style events semantically.
 */
export interface TargetContentContext {
  /** Target video duration in seconds */
  duration: number;
  /** Beat events in the target's audio */
  beatEvents: BeatEvent[];
  /** Shot boundaries in the target */
  shotBoundaries: ShotBoundary[];
  /** Target motion analysis */
  motionData: MotionAnalysisResult;
  /** Target depth analysis (optional) */
  depthData?: DepthAnalysisResult;
  /** Output width in pixels */
  width: number;
  /** Output height in pixels */
  height: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Adapted StyleDNA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * An AdaptedStyleDNA is a StyleDNA that has been semantically re-targeted
 * to a specific target video.  All timestamps are absolute positions on
 * the TARGET timeline.  Intensities are semantically scaled.
 *
 * Key semantic transformations applied by the adapter:
 *
 * PACING
 *   • Cut timestamps: placed at target's beat onsets + motion inflections,
 *     not at proportional reference timestamps.  Count = cutDensity × targetDuration.
 *
 * MOTION
 *   • Speed expression: built from TARGET'S velocityTimeline (own content),
 *     with reference cameraEnergy used as a scalar multiplier.
 *   • Jitter: mapped to TARGET'S hardest beats by intensity rank.
 *
 * COLOR
 *   • CDF curves: timeless — reference histogram transform applied as-is.
 *   • Temporal evolution: re-mapped by energy level.  High-energy reference
 *     samples map to target's high-energy beat regions, not proportional time.
 *
 * LIGHTING
 *   • Flicker parameters: inherited from reference variance — content-independent
 *     sin() expressions that don't depend on any timeline.
 *
 * RHYTHM
 *   • Drop zones: mapped to target's K highest-intensity beats (by rank),
 *     not by proportional timestamp.
 *   • Beat pulses: mapped to target's own beat grid.
 *
 * TEXTURE
 *   • Blur: placed at target's highest-motion timestamps (velocity peaks),
 *     not at proportional reference timestamps.
 *   • Grain/sharpness: timeless — applied globally.
 */
export interface AdaptedStyleDNA {
  /** Source reference DNA (retained for debugging/serialisation) */
  source: StyleDNA;
  /** Target content context */
  target: TargetContentContext;

  // ── Adapted Pacing ────────────────────────────────────────────────────────
  pacing: {
    /**
     * Hard cut timestamps on the TARGET timeline (seconds), sorted ascending.
     * Semantically placed at target's natural anchor points (beats, motion peaks).
     */
    cutTimestamps: number[];
    /**
     * Gradual transition events adapted to the target timeline.
     * Placed at target shot boundaries (or proportionally if no target shots).
     */
    gradualTransitions: Array<{
      time: number;
      subtype: string;
      duration: number;
      tdScore: number;
      histScore: number;
    }>;
  };

  // ── Adapted Motion ────────────────────────────────────────────────────────
  motion: {
    /** FFmpeg setpts expression (null = passthrough) */
    setptsExpr: string | null;
    /** FFmpeg zoompan expression (null = no zoom) */
    zoomExpr: string | null;
    /**
     * Beat-triggered jitter events placed at target's hardest beats.
     * rotAngle and scaleAmount inherited from reference intensity profile.
     */
    jitterEvents: Array<{
      time: number;
      endTime: number;
      rotAngle: number;
      scaleAmount: number;
    }>;
    /** Exact camera displacement events (panX, panY) mapped proportionally */
    panEvents: Array<{ time: number; x: number; y: number; magnitude: number }>;
  };

  // ── Adapted Color ─────────────────────────────────────────────────────────
  color: {
    /**
     * FFmpeg curves filter string (CDF-driven, timeless).
     * Null if no CDF data available.
     */
    curvesFilter: string | null;
    /**
     * Per-event contrast/saturation sendcmd entries for the TARGET timeline.
     * Placed at target beat positions using energy-level correspondence.
     */
    temporalSendcmd: Array<{
      time: number;
      contrastRatio: number;
      saturationRatio: number;
    }>;
    /** Whether HALD CLUT should be applied */
    applyHald: boolean;
    /**
     * Fallback color filter strings (colorbalance, channelmixer).
     * Used when CDF + HALD are both unavailable.
     */
    fallbackColorFilters: string[];
    /** Segment-wise mood grading mapped to target timeline */
    moodGradeSegments: Array<{
      start: number;
      end: number;
      brightness: number;
      contrast: number;
      saturation: number;
      lutStrength: number;
    }>;
  };

  // ── Adapted Lighting ──────────────────────────────────────────────────────
  lighting: {
    /**
     * FFmpeg brightness expression string for eq@temporal_eq.
     * e.g. "0.1234*sin(2*PI*t*3.50)"
     * Content-independent — valid for any target duration.
     */
    flickerExpr: string;
    /** Organic auto-exposure control points on target timeline */
    exposureEvents: Array<{ time: number; brightness: number }>;
    /** FFmpeg curves filter for halation (null = skip) */
    halationFilter: string | null;
    /** Vignette angle in radians (null = skip) */
    vignetteAngle: number | null;
  };

  // ── Adapted Rhythm ────────────────────────────────────────────────────────
  rhythm: {
    /**
     * Beat-pulse sendcmd events on the TARGET timeline.
     * Mapped to the target's own beat grid.
     */
    beatPulseEvents: Array<{
      time: number;
      endTime: number;
      brightness: number;
      contrast: number;
    }>;
    /** Content-aware beat response events (kick/snare/hat/drop mapping) */
    beatResponseEvents: Array<{
      time: number;
      endTime: number;
      kind: "zoom_punch" | "micro_shake" | "light_flicker" | "drop_combo";
      brightness: number;
      contrast: number;
      zoom: number;
      rotation: number;
      velocityRamp: number;
    }>;
    /**
     * Drop zone events at the target's K hardest beats.
     * K = reference dropZones.length; selected by intensity rank.
     */
    dropZoneEvents: Array<{ time: number; intensity: number }>;
  };

  // ── Adapted Texture ───────────────────────────────────────────────────────
  texture: {
    /** FFmpeg noise filter string (null = no grain) */
    grainFilter: string | null;
    /** FFmpeg unsharp filter string */
    sharpnessFilter: string;
    /**
     * Blur sendcmd events placed at TARGET's motion peaks.
     * Semantically: reference had blur when motion was high → replicate
     * at the target's own high-motion moments.
     */
    blurEvents: Array<{ time: number; radius: number }>;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Filter Graph Output
// ─────────────────────────────────────────────────────────────────────────────

/** Result returned by generateFilterGraph() */
export interface FilterGraphOutput {
  /** Ordered inline video filter chain (comma-separated FFmpeg filters) */
  videoFilterChain: string;
  /**
   * Hard-cut segmentation graph (trim→concat pre-pass).
   * Empty string when no segmentation is needed.
   */
  hardCutGraph: string;
  /** Whether the outer graph should apply HALD CLUT after the filter chain */
  useHald: boolean;
  /** Ordered filter log entries for dashboard display */
  filterLog: string[];
  /** Paths of sendcmd files written to disk (null = file not generated) */
  cmdFiles: {
    temporalColor: string | null;
    beatPulse: string | null;
    blur: string | null;
    transition: string | null;
    impact: string | null;
  };
}
