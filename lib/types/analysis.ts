/**
 * Frontend types mirroring the backend DashboardAnalysisResponse,
 * BlueprintSummary, EditInstructions, and pipeline timing.
 *
 * These are the shapes returned by POST /api/analyze-and-transfer
 * in JSON output mode.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard Cards
// ─────────────────────────────────────────────────────────────────────────────

export interface DashboardCardDetail {
  label: string;
  value: string | number;
}

export interface DashboardCard {
  id: string;
  title: string;
  value: string | number;
  subtitle?: string;
  badge?: string;
  badgeVariant?: "default" | "success" | "warning" | "destructive";
  sparkline?: number[];
  details?: DashboardCardDetail[];
}

export interface DashboardData {
  videoId: string;
  filename: string;
  processedAt: string;
  cards: DashboardCard[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Blueprint
// ─────────────────────────────────────────────────────────────────────────────

export interface BlueprintEvent {
  time_sec: number;
  duration_sec: number;
  kind:
    | "cut"
    | "speed_ramp"
    | "beat_transition"
    | "style_keyframe"
    | "jhatka"
    | "rhythm_shift";
  confidence: number;
  description: string;
  source: "shot" | "motion" | "audio" | "style" | "fused";
  params: Record<string, string | number | boolean>;
}

export interface BlueprintStyleParams {
  brightness: number;
  contrast: number;
  saturation: number;
  sharpness: number;
  vignette: number;
  colorMood: string;
  colorProfile: string;
  grainLabel: string;
  eqParams: string;
  colorbalanceParams: string;
}

export interface BlueprintSegment {
  start_sec: number;
  end_sec: number;
  speed: number;
  speedLabel: "freeze" | "slow-mo" | "normal" | "fast" | "hyper";
  rhythmEnergy: "silent" | "low" | "medium" | "high" | "peak";
  beatAligned: boolean;
  style: BlueprintStyleParams;
}

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

export interface BlueprintData {
  blueprintId: string;
  sourceFilename: string;
  generatedAt: string;
  totalTimelineEvents: number;
  totalSegments: number;
  summary: BlueprintSummary;
  timeline: BlueprintEvent[];
  segments: BlueprintSegment[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Edit Instructions
// ─────────────────────────────────────────────────────────────────────────────

export interface EditCutInstruction {
  time_sec: number;
  type: "hard_cut" | "gradual_transition";
  confidence: number;
  beatSnapped: boolean;
  snapDeltaMs: number;
  transitionOverlapSec: number;
}

export interface EditSpeedInstruction {
  start_sec: number;
  end_sec: number;
  speed: number;
  label: "freeze" | "slow-mo" | "normal" | "fast" | "hyper";
  rhythmEnergy: "silent" | "low" | "medium" | "high" | "peak";
  beatAligned: boolean;
}

export interface EditTransitionInstruction {
  time_sec: number;
  kind:
    | "zoom_hit"
    | "flash"
    | "whip_pan"
    | "luma_fade"
    | "beat_cut"
    | "beat_speed_change"
    | "rhythm_shift"
    | "jhatka"
    | "glitch"
    | "zoom_out_hit"
    | "cross_blur";
  intensity: number;
  description: string;
  params: Record<string, string | number | boolean>;
  effectDurationSec?: number;
  scaleFrom?: number;
  scaleTo?: number;
  brightnessSpikeMultiplier?: number;
  blurSigma?: number;
  glitchOffsetPx?: number;
}

export interface EditInstructionsSummary {
  sourceBlueprintId: string;
  sourceDuration: number;
  targetDuration: number;
  durationRatio: number;
  strategy: "proportional" | "loop" | "truncate";
  totalCuts: number;
  totalSpeedSegments: number;
  totalTransitions: number;
  beatSnappedCuts: number;
  processingMs: number;
}

export interface EditInstructions {
  instructionId: string;
  generatedAt: string;
  sourceBlueprintId: string;
  cuts: EditCutInstruction[];
  speedSegments: EditSpeedInstruction[];
  transitions: EditTransitionInstruction[];
  styleBlocks: {
    start_sec: number;
    end_sec: number;
    eqParams: string;
    colorbalanceParams: string;
    colorMood: string;
    colorProfile: string;
    grainLabel: string;
    motionPreset:
      | "smooth_drift"
      | "velocity_bounce"
      | "handheld_shake"
      | "static"
      | "parallax_slide";
    templateLutPath?: string;
    templateOverlays?: {
      time_sec: number;
      kind: "white_flash" | "color_flash" | "vignette_pulse" | "lut_swap";
      durationSec: number;
      intensity: number;
      color?: string;
      lutPath?: string;
    }[];
  }[];
  summary: EditInstructionsSummary;
  templateId?: string;
  templateOverlays?: {
    time_sec: number;
    kind: "white_flash" | "color_flash" | "vignette_pulse" | "lut_swap";
    durationSec: number;
    intensity: number;
    color?: string;
    lutPath?: string;
  }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Output & Timing
// ─────────────────────────────────────────────────────────────────────────────

export interface OutputInfo {
  rendered: boolean;
  filterGraphSummary: string;
  renderMs: number;
  videoBase64?: string;
  videoUrl?: string;
  videoSizeBytes?: number;
  error?: string;
}

export interface PipelineTiming {
  totalMs: number;
  analysisMs: number;
  blueprintMs: number;
  instructionsMs: number;
  renderMs: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Full API Response
// ─────────────────────────────────────────────────────────────────────────────

export interface AnalyzeAndTransferResponse {
  success: boolean;
  error?: string;
  dashboard: DashboardData;
  blueprint: BlueprintData;
  instructions: EditInstructions;
  output: OutputInfo;
  timing: PipelineTiming;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook state
// ─────────────────────────────────────────────────────────────────────────────

export type AnalysisStage =
  | "idle"
  | "uploading"
  | "analyzing"
  | "blueprint"
  | "rendering"
  | "complete"
  | "error";

export interface AnalysisProgress {
  stage: AnalysisStage;
  percent: number;
  message: string;
}
