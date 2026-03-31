/**
 * Shared types for the modular video-processing backend.
 *
 * Every module returns structured metadata as plain JSON
 * that can be rendered directly on dashboard cards.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Primitives
// ─────────────────────────────────────────────────────────────────────────────
export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface TimeRange {
  start_sec: number;
  end_sec: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Professional Transition & Motion Preset Enums
// ─────────────────────────────────────────────────────────────────────────────

/** Transition presets available in the blueprint transfer engine. */
export type TransitionPreset =
  | "zoom_hit"
  | "zoom_out_hit"
  | "flash"
  | "whip_pan"
  | "luma_fade"
  | "glitch"
  | "cross_blur"
  | "beat_cut"
  | "beat_speed_change"
  | "rhythm_shift"
  | "jhatka"
  | "wipe"
  | "slide"
  | "motion_blur_swipe"
  | "rgb_split";

/** Motion presets assigned to style blocks. */
export type MotionPreset =
  | "static"
  | "smooth_drift"
  | "handheld_shake"
  | "velocity_bounce"
  | "parallax_slide"
  | "dolly_zoom"
  | "whip_pan_drift"
  | "tracking_shot";

/** Template-injected overlay effect at beat onsets. */
export interface TemplateOverlayEffect {
  /** Timestamp of the overlay (seconds) */
  time_sec: number;
  /** Overlay kind */
  kind: "white_flash" | "color_flash" | "vignette_pulse" | "film_burn" | "glitch_block";
  /** Duration of the overlay (seconds) */
  durationSec: number;
  /** Peak intensity (0-1) */
  intensity: number;
  /** Hex colour for color_flash kind */
  color?: string;
  /** LUT path for template-level colour override */
  lutPath?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shot Detection
// ─────────────────────────────────────────────────────────────────────────────
export type CutType = "hard_cut" | "gradual_transition";

/** Specific transition subtype detected from frame analysis around boundary */
export type TransitionSubtype = "dissolve" | "blur_transition" | "flash_transition" | "fade" | "unknown";

export interface ShotBoundary {
  timestamp_sec: number;
  type: CutType;
  confidence: number;
  /** Histogram chi-squared distance (0-1 normalised) */
  hist_score: number;
  /** Edge-change ratio — Canny-based (0-1 normalised) */
  ecr_score: number;
  /** Twin-comparison temporal difference (0-1 normalised) */
  td_score: number;
  /** Detected transition subtype for gradual transitions */
  transitionSubtype?: TransitionSubtype;
  /** Duration of the gradual transition in seconds */
  transitionDurationSec?: number;
  /** Optional reason/explanation for the boundary */
  reason?: string;
  /** v12: whether this is a synthetic boundary from fallback pacing */
  synthetic?: boolean;
  /** v12: metadata from micro-cut detection */
  microCutMetadata?: {
    trigger: "motion_spike" | "histogram_discontinuity" | "luminance_delta";
    zoomFactor?: number;
    luminanceDelta?: number;
  };
}

export interface ShotDetectionResult {
  /** Every detected cut / transition boundary */
  cuts: ShotBoundary[];
  /** Total number of shots (= cuts.length + 1) */
  shotCount: number;
  /** Average shot length in seconds */
  avgShotDurationSec: number;
  /** Dominant editing style label */
  editingPace: "rapid" | "moderate" | "slow";
  /** Count of hard-cut boundaries */
  hardCutCount: number;
  /** Count of gradual-transition boundaries (dissolves, wipes, fades) */
  gradualTransitionCount: number;
  /** Which transition type is more frequent */
  dominantTransitionType: CutType;
  /** Processing time in ms */
  processingMs: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Motion / Optical-Flow Analysis
// ─────────────────────────────────────────────────────────────────────────────
export interface VelocitySegment {
  start_sec: number;
  end_sec: number;
  /** Speed relative to baseline (1.0 = normal) */
  relative_speed: number;
  /** Human-readable label */
  label: "freeze" | "slow-mo" | "normal" | "fast" | "hyper";
}

/** One sample of the per-frame velocity timeline (for frontend chart). */
export interface VelocityTimelinePoint {
  /** Wall-clock time in seconds */
  time_sec: number;
  /** Raw flow magnitude (px/frame, 0 = still, ~40+ = fast) */
  magnitude: number;
  /** Speed relative to baseline (1.0 = normal) */
  relative_speed: number;
}

/** A detected "jhatka" — an abrupt speed change (speed ramp inflection). */
export interface JhatkaEvent {
  /** Wall-clock time of the speed change */
  timestamp_sec: number;
  /** Speed *before* the change */
  speed_before: number;
  /** Speed *after* the change */
  speed_after: number;
  /** Absolute magnitude of the change (|after − before|) */
  delta: number;
  /** "accelerate" if speeding up, "decelerate" if slowing down */
  direction: "accelerate" | "decelerate";
}

export interface MotionAnalysisResult {
  /** Per-segment velocity profile (RAFT-style dense optical flow) */
  velocitySegments: VelocitySegment[];
  /** Whether the video contains deliberate speed ramping */
  hasSpeedRamp: boolean;
  /** Weighted average relative speed across all segments */
  avgRelativeSpeed: number;
  /** 0-1 global motion intensity */
  motionIntensity: number;
  /** High-level motion label */
  motionStyle: "static" | "smooth" | "dynamic" | "chaotic";
  /** True when motion profile indicates cinematic camera work */
  isCinematic: boolean;

  // ── RAFT-style extras ──────────────────────────────────────────────

  /** Per-frame velocity timeline for frontend spark-chart / waveform */
  velocityTimeline: VelocityTimelinePoint[];
  /** Detected abrupt speed changes ("jhatkas") */
  jhatkas: JhatkaEvent[];
  /** Count of jhatkas for quick dashboard display */
  jhatkaCount: number;
  /** Peak magnitude (px/frame) across entire video */
  peakMagnitude: number;
  /** Segment label distribution e.g. { freeze: 1, normal: 3, fast: 2 } */
  segmentDistribution: Record<VelocitySegment["label"], number>;

  // ── RAFT-v2 Zoom Detection ─────────────────────────────────────────

  /** Per-frame zoom timeline from radial flow divergence analysis */
  zoomTimeline?: Array<{ time_sec: number; zoomSpeed: number }>;
  /** Average zoom speed (positive = zoom-in, negative = zoom-out, ~0 = none) */
  avgZoomSpeed?: number;
  /** Peak absolute zoom speed detected */
  maxZoomSpeed?: number;
  /** Dominant zoom direction across the video */
  dominantZoom?: "zoom-in" | "zoom-out" | "none";

  // ── Spatial DNA: Per-frame Camera Motion (for shake/zoom cloning) ───

  /** Per-frame motion timeline with camera displacement vectors */
  motionTimeline?: CameraMotionSample[];
  /** Average camera shake magnitude (0 = tripod, >0.01 = handheld) */
  avgShakeMagnitude?: number;
  /** Whether the reference has noticeable camera shake / handheld feel */
  hasHandheldShake?: boolean;

  /** Processing time in ms */
  processingMs: number;
}

/** Per-frame camera motion sample from RAFT dense optical flow */
export interface CameraMotionSample {
  /** Wall-clock timestamp (seconds) */
  time_sec: number;
  /** Mean optical-flow magnitude (px/frame) */
  meanMagnitude: number;
  /** Zoom speed from radial flow divergence (positive = zoom-in) */
  zoomSpeed: number;
  /** Camera displacement vector */
  camera: {
    /** Normalised horizontal pan speed */
    panX: number;
    /** Normalised vertical pan speed */
    panY: number;
    /** Camera motion classification */
    type: string;
    /** Overall displacement magnitude */
    magnitude: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Audio Beat Analysis
// ─────────────────────────────────────────────────────────────────────────────

/** A single detected beat with its intensity and spectral context. */
export interface BeatEvent {
  /** Wall-clock timestamp in seconds */
  timestamp_sec: number;
  /** Beat intensity / strength (0-1 normalised) */
  intensity: number;
  /** Spectral flux magnitude at onset (unnormalised) */
  flux: number;
  /** Dominant frequency band at onset */
  band: "sub-bass" | "bass" | "mid" | "high";
}

/** A contiguous region of consistent rhythmic energy. */
export interface RhythmRegion {
  start_sec: number;
  end_sec: number;
  /** Local BPM within this region */
  localBpm: number;
  /** Average beat intensity in this region (0-1) */
  avgIntensity: number;
  /** Label describing energy level */
  energyLabel: "silent" | "low" | "medium" | "high" | "peak";
}

/** Per-frame energy timeline sample for frontend waveform. */
export interface AudioTimelinePoint {
  time_sec: number;
  /** RMS energy (0-1 linear) */
  energy: number;
  /** Spectral flux (onset strength, unnormalised) */
  flux: number;
}

export interface AudioBeatResult {
  /** Beat timestamps in seconds (kept for backward compat) */
  beats: number[];
  /** Full beat events with intensity + band */
  beatEvents: BeatEvent[];
  /** BPM estimate (global) */
  bpm: number;
  /** Confidence of the BPM estimate (0-1) */
  bpmConfidence: number;
  /** Timestamp of the first detected beat */
  firstBeatSec: number;
  /** Peak dB level of the audio track */
  peakDb: number;
  /** Mean volume mapped to 0-1 */
  meanVolume: number;
  /** Whether the source has an audio track at all */
  hasAudio: boolean;

  // ── Spectral-flux extras ────────────────────────────────────────────

  /** Per-frame energy + flux timeline for frontend waveform */
  audioTimeline: AudioTimelinePoint[];
  /** Detected rhythm regions (energy segments) */
  rhythmRegions: RhythmRegion[];
  /** Number of rhythm regions */
  regionCount: number;
  /** Average beat intensity across all beats (0-1) */
  avgBeatIntensity: number;
  /** Strongest beat event */
  peakBeatIntensity: number;
  /** Beat density: beats per second */
  beatDensity: number;
  /** Time signature guess */
  timeSignatureGuess: "4/4" | "3/4" | "6/8" | "unknown";

  /** Processing time in ms */
  processingMs: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Temporal Color Sample (per-second color DNA timeline)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single point on the reference video's temporal color timeline.
 * Captured every ~1 second by FFmpeg signalstats, this tracks how
 * the reference's color grading CHANGES over time (e.g. warm intro →
 * cold chorus → desaturated bridge).
 *
 * The edit-transfer engine uses these to dynamically adjust eq
 * parameters at runtime via FFmpeg's sendcmd filter, so the target
 * video's color evolves exactly as the reference does.
 */
export interface TemporalColorSample {
  /** Wall-clock timestamp in the reference video (seconds) */
  time_sec: number;
  /** Brightness at this moment (0–1 normalised) */
  brightness: number;
  /** Contrast at this moment (dynamic range ratio) */
  contrast: number;
  /** Saturation multiplier at this moment */
  saturation: number;
  /** Mean luma (0–255) at this moment */
  meanLuma: number;
  /** Blur level at this moment (0 = sharp, 1 = very blurry).
   *  Detected via Laplacian variance: low variance = blurry frame.
   *  Used to replicate intentional blur effects from the reference. */
  blurLevel?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Color / Style Extraction
// ─────────────────────────────────────────────────────────────────────────────
export interface ColorGradingResult {
  /** Brightness in FFmpeg eq range [-1, 1] */
  brightness: number;
  /** Contrast multiplier [0.2, 3.0] */
  contrast: number;
  /** Saturation multiplier [0, 3.0] */
  saturation: number;
  /** Sharpness [0, 3.0] */
  sharpness: number;
  /** Vignette intensity [0, 1] */
  vignette: number;

  /** Per-channel colour offset (used for colorchannelmixer) */
  channelOffsets: RGB;
  /** Shadow region average colour */
  shadowsRgb: RGB;
  /** Midtone region average colour */
  midtonesRgb: RGB;
  /** Highlight region average colour */
  highlightsRgb: RGB;

  /** Human-readable colour profile */
  colorProfile: "dark" | "muted" | "vibrant" | "vivid" | "bright";
  /** Mood keyword (warm / cool / neutral / cinematic / vintage …) */
  colorMood: string;

  /** Film grain density [0, 1] */
  grainDensity: number;
  grainLabel: "clean" | "light-grain" | "medium-grain" | "heavy-grain";

  /** Lens blur / bokeh intensity [0, 1] */
  lensBlur: number;
  lensBlurLabel: "none" | "light" | "medium" | "heavy";

  /** Vignette strength label */
  vignetteLabel: "none" | "light" | "medium" | "heavy";

  // ── Film Texture Analysis ─────────────────────────────────────────────

  /** Film halation intensity (warm glow around highlights) [0, 1] */
  halationIntensity: number;
  /** Film halation colour (typically warm orange/red) */
  halationColor: RGB;
  /** Whether the reference exhibits analogue film texture */
  hasFilmTexture: boolean;
  /** Film stock classification */
  filmStockLabel: "digital" | "35mm" | "16mm" | "super8" | "vintage";

  // ── Histogram Matching ───────────────────────────────────────────────

  /** Per-channel histogram CDF (256 entries each) for precise matching */
  histogramCdf?: {
    r: number[];
    g: number[];
    b: number[];
  };
  /** Mean luminance of the reference (0-255) */
  meanLuminance: number;
  /** Luminance standard deviation */
  stdLuminance: number;

  // ── Pre-computed FFmpeg filter params (for edit-transfer compatibility) ──

  /** Ready-to-use FFmpeg `eq` filter string: "brightness=X:contrast=Y:saturation=Z" */
  eqParams: string;
  /** Ready-to-use FFmpeg `colorbalance` filter string */
  colorbalanceParams: string;
  /** Ready-to-use FFmpeg `colorchannelmixer` filter string (empty if no offset) */
  colorchannelmixerParams: string;
  /** Ready-to-use FFmpeg `unsharp` filter string */
  unsharpParams: string;

  // ── Temporal Color DNA (per-second color evolution) ──────────────────

  /**
   * Per-second color timeline of the reference video.
   * Each sample captures brightness, contrast, saturation at that moment.
   * The edit-transfer engine uses this to dynamically change eq parameters
   * at runtime via FFmpeg's sendcmd filter — so the target's color
   * evolves exactly as the reference does from second 0 to end.
   *
   * Empty array = fallback to static averaged values.
   */
  temporalSamples: TemporalColorSample[];

  /** Processing time in ms */
  processingMs: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Edit Transfer (output of applying reference style → target)
// ─────────────────────────────────────────────────────────────────────────────
export interface EditTransferResult {
  success: boolean;
  /** Absolute path to the produced output file (when keepOutput=true) */
  outputPath?: string;
  /** Browser-accessible URL e.g. /outputs/transfer-xxx.mp4 */
  videoUrl?: string;
  /** Base-64 encoded output (when keepOutput=false) */
  videoBase64?: string;
  /** Full metadata that was applied */
  appliedMetadata: FullVideoMetadata;
  /** FFmpeg filter graph summary (for debug / dashboard display) */
  filterGraphSummary: string;
  /** Total wall-clock processing time in ms */
  processingMs: number;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Editing Blueprint / Pattern Analysis
// ─────────────────────────────────────────────────────────────────────────────

/** A single event on the editing blueprint timeline. */
export type BlueprintEventKind =
  | "cut"
  | "speed_ramp"
  | "beat_transition"
  | "style_keyframe"
  | "jhatka"
  | "rhythm_shift";

/** Describes one editing action at a specific point in the timeline. */
export interface BlueprintEvent {
  /** Wall-clock time this event begins (seconds) */
  time_sec: number;
  /** Duration the event spans (0 for instantaneous events like cuts) */
  duration_sec: number;
  /** Event category */
  kind: BlueprintEventKind;
  /** Confidence / strength of this event (0-1) */
  confidence: number;
  /** Human-readable description of the event */
  description: string;
  /** Source module that produced this event */
  source: "shot" | "motion" | "audio" | "style" | "fused";
  /** Optional nested parameters for the event */
  params: Record<string, string | number | boolean>;
}

/** A continuous segment of the edit template with uniform style. */
export interface BlueprintSegment {
  /** Segment start (seconds) */
  start_sec: number;
  /** Segment end (seconds) */
  end_sec: number;
  /** Target playback speed in this segment (relative, 1.0 = normal) */
  speed: number;
  /** Speed label */
  speedLabel: VelocitySegment["label"];
  /** Dominant rhythm energy in this segment */
  rhythmEnergy: "silent" | "low" | "medium" | "high" | "peak";
  /** Whether a beat-aligned transition should occur at segment start */
  beatAligned: boolean;
  /** Style parameters active in this segment */
  style: BlueprintStyleParams;
}

/** Style parameters for a segment of the blueprint. */
export interface BlueprintStyleParams {
  brightness: number;
  contrast: number;
  saturation: number;
  sharpness: number;
  vignette: number;
  colorMood: string;
  colorProfile: string;
  grainLabel: string;
  /** Pre-computed FFmpeg eq string for this segment */
  eqParams: string;
  /** Pre-computed FFmpeg colorbalance string */
  colorbalanceParams: string;
}

/** Summary statistics for the editing blueprint. */
export interface BlueprintSummary {
  totalDuration: number;
  totalCuts: number;
  totalSpeedRamps: number;
  totalBeatTransitions: number;
  totalJhatkas: number;
  avgShotDuration: number;
  dominantPace: "rapid" | "moderate" | "slow";
  dominantMotionStyle: string;
  bpm: number;
  bpmConfidence: number;
  timeSignature: string;
  dominantColorMood: string;
  dominantColorProfile: string;
}

/** The complete editing blueprint / template. */
export interface EditingBlueprint {
  /** Unique ID for this blueprint */
  blueprintId: string;
  /** Source video filename */
  sourceFilename: string;
  /** ISO timestamp when the blueprint was generated */
  generatedAt: string;
  /** Chronologically sorted event timeline */
  timeline: BlueprintEvent[];
  /** Uniform-style segments (non-overlapping, covering full duration) */
  segments: BlueprintSegment[];
  /** High-level summary statistics */
  summary: BlueprintSummary;
  /** The raw metadata that produced this blueprint */
  rawMetadata: FullVideoMetadata;
  /** Processing time for blueprint generation in ms */
  processingMs: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Blueprint Transfer — Edit Instructions
// ─────────────────────────────────────────────────────────────────────────────

/** Strategy for adapting a longer/shorter blueprint onto a target timeline. */
export type AdaptationStrategy =
  | "proportional"   // Scale all timestamps linearly
  | "loop"           // Tile the pattern cyclically
  | "truncate";      // Apply only what fits, ignore the rest

/** Options controlling how a blueprint is applied to a target. */
export interface BlueprintTransferOptions {
  /** How to handle duration mismatch (default: "proportional") */
  strategy?: AdaptationStrategy;
  /** Override the target duration in seconds (else auto-detected) */
  targetDuration?: number;
  /** Minimum segment duration after adaptation (seconds, default 0.1) */
  minSegmentDuration?: number;
  /** Whether to preserve beat alignment (shift cuts to nearest beat, default true) */
  preserveBeats?: boolean;
  /** Whether to include style instructions (default true) */
  includeStyle?: boolean;
  /** Transition overlap duration for gradual transitions (seconds, default 0.08) */
  transitionOverlapSec?: number;
  /** Template ID to force-inject LUT + overlays at every beat */
  templateId?: string;
}

/** One cut instruction in the final edit. */
export interface EditCutInstruction {
  /** Cut point on the target timeline (seconds) */
  time_sec: number;
  /** Hard cut or gradual transition */
  type: CutType;
  /** Confidence inherited from the source blueprint */
  confidence: number;
  /** Whether this cut was snapped to a beat */
  beatSnapped: boolean;
  /** If beat-snapped, the delta from original position (ms) */
  snapDeltaMs: number;
  /** Transition overlap with next segment (seconds, 0 for hard cuts) */
  transitionOverlapSec: number;
}

/** One speed-segment instruction in the final edit. */
export interface EditSpeedInstruction {
  /** Segment start on the target timeline (seconds) */
  start_sec: number;
  /** Segment end on the target timeline (seconds) */
  end_sec: number;
  /** Playback speed factor (1.0 = normal) */
  speed: number;
  /** Human-readable label */
  label: VelocitySegment["label"];
  /** Rhythm energy level during this segment */
  rhythmEnergy: "silent" | "low" | "medium" | "high" | "peak";
  /** Whether the segment boundary aligns with a beat */
  beatAligned: boolean;
}

/** One transition instruction (beat-aligned or rhythm-driven). */
export interface EditTransitionInstruction {
  /** Transition point on the target timeline (seconds) */
  time_sec: number;
  /** Transition kind — expanded to cover all professional presets */
  kind: TransitionPreset;
  /** Intensity / strength (0-1) */
  intensity: number;
  /** Description of what happens at this point */
  description: string;
  /** Related parameters */
  params: Record<string, string | number | boolean>;

  // ── Professional Preset Effect Parameters ──────────────────────────

  /** Duration of the transition effect (seconds) */
  effectDurationSec?: number;
  /** Zoom scale start (e.g. 1.0 for normal) */
  scaleFrom?: number;
  /** Zoom scale end (e.g. 1.15 for zoom-in punch) */
  scaleTo?: number;
  /** Brightness multiplier for flash transitions */
  brightnessSpikeMultiplier?: number;
  /** Gaussian blur sigma for whip_pan / cross_blur */
  blurSigma?: number;
  /** RGB-split pixel offset for glitch transitions */
  glitchOffsetPx?: number;
  /** Motion blur angle for motion_blur_swipe (degrees) */
  motionBlurAngle?: number;
}

/** Style block for a range of the target timeline. */
export interface EditStyleInstruction {
  /** Style active from (seconds) */
  start_sec: number;
  /** Style active until (seconds) */
  end_sec: number;
  /** FFmpeg `eq` filter string */
  eqParams: string;
  /** FFmpeg `colorbalance` filter string */
  colorbalanceParams: string;
  /** Human labels */
  colorMood: string;
  colorProfile: string;
  grainLabel: string;

  // ── Professional Rendering Fields ──────────────────────────────────

  /** Motion preset for this style block */
  motionPreset?: MotionPreset;
  /** Path to template LUT override (if template is active) */
  templateLutPath?: string;
  /** Template overlay effects at beat onsets within this block */
  templateOverlays?: TemplateOverlayEffect[];
  /** Film grain intensity to replicate (0-1, from reference) */
  filmGrainIntensity?: number;
  /** Whether to apply motion blur in this block */
  applyMotionBlur?: boolean;
  /** Depth-aware parallax factor (0 = flat, 1 = full parallax) */
  parallaxFactor?: number;
}

/** Summary of the adaptation process. */
export interface EditInstructionsSummary {
  /** Source blueprint ID */
  sourceBlueprintId: string;
  /** Source video duration (seconds) */
  sourceDuration: number;
  /** Target video duration (seconds) */
  targetDuration: number;
  /** Duration ratio (target / source) */
  durationRatio: number;
  /** Adaptation strategy used */
  strategy: AdaptationStrategy;
  /** Total cut instructions */
  totalCuts: number;
  /** Total speed instructions */
  totalSpeedSegments: number;
  /** Total transition instructions */
  totalTransitions: number;
  /** How many cuts were beat-snapped */
  beatSnappedCuts: number;
  /** Processing time in ms */
  processingMs: number;
}

/** The complete set of edit instructions for a target video. */
export interface EditInstructions {
  /** Unique instruction set ID */
  instructionId: string;
  /** ISO timestamp */
  generatedAt: string;
  /** The source blueprint this was derived from */
  sourceBlueprintId: string;
  /** Chronologically sorted cut points */
  cuts: EditCutInstruction[];
  /** Non-overlapping speed segments covering full duration */
  speedSegments: EditSpeedInstruction[];
  /** Beat-aligned transitions and rhythm-driven events */
  transitions: EditTransitionInstruction[];
  /** Style instructions (optionally included) */
  styleBlocks: EditStyleInstruction[];
  /** Adaptation summary */
  summary: EditInstructionsSummary;
  /** Active template ID (if any) */
  templateId?: string;
  /** Top-level template overlay effects across entire timeline */
  templateOverlays?: TemplateOverlayEffect[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Depth / Spatial Analysis (Depth-Anything V2)
// ─────────────────────────────────────────────────────────────────────────────

/** Per-frame depth sample from monocular depth estimation. */
export interface DepthFrameSample {
  /** Wall-clock timestamp (seconds) */
  time_sec: number;
  /** Mean depth across the frame (0 = near, 1 = far, normalised) */
  meanDepth: number;
  /** Depth variance (high = complex parallax scene) */
  depthVariance: number;
  /** Foreground-background separation strength (0-1) */
  fgBgSeparation: number;
}

export interface DepthAnalysisResult {
  /** Per-frame depth timeline */
  depthTimeline: DepthFrameSample[];
  /** Average foreground-background separation across video */
  avgFgBgSeparation: number;
  /** Whether the reference uses strong depth-of-field / parallax */
  hasStrongParallax: boolean;
  /** Dominant depth composition style */
  depthStyle: "flat" | "shallow-dof" | "deep-focus" | "racking";
  /** Average mean depth */
  avgMeanDepth: number;
  /** Processing time in ms */
  processingMs: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Full Pipeline Composite
// ─────────────────────────────────────────────────────────────────────────────
export interface FullVideoMetadata {
  // Identity
  fps: number;
  aspectRatio: string;
  duration: number;
  orientation: "horizontal" | "vertical" | "square";
  hasAudio: boolean;

  // Shot Detection
  shotDetection: ShotDetectionResult;

  // Motion
  motion: MotionAnalysisResult;

  // Audio
  audio: AudioBeatResult;

  // Style
  colorGrading: ColorGradingResult;

  // Depth (optional — only when depth analysis module is available)
  depth?: DepthAnalysisResult;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard Card JSON (clean output for the frontend)
// ─────────────────────────────────────────────────────────────────────────────
export interface DashboardCard {
  id: string;
  title: string;
  value: string | number;
  subtitle?: string;
  badge?: string;
  badgeVariant?: "default" | "success" | "warning" | "destructive";
  /** Spark-line data points (for mini charts) */
  sparkline?: number[];
  /** Nested detail rows */
  details?: { label: string; value: string | number }[];
}

export interface DashboardAnalysisResponse {
  videoId: string;
  filename: string;
  processedAt: string;
  cards: DashboardCard[];
  raw: FullVideoMetadata;
}
