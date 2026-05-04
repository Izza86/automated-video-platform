/**
 * CapCut-Style Template System Types
 * 
 * 100% deterministic editing replication.
 * Templates are extracted from reference videos and applied to targets
 * with exact precision - no approximation, no ML guessing.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Core Template Types
// ─────────────────────────────────────────────────────────────────────────────

export interface EditingTemplate {
  templateId: string;
  name: string;
  version: number;
  createdAt: string;
  
  // Source reference info
  sourceDuration: number;
  sourceResolution: { width: number; height: number };
  sourceFps: number;
  
  // Timeline structure (100% deterministic)
  timeline: TemplateEvent[];
  
  // Asset references
  assets: TemplateAssets;
}

export interface TemplateAssets {
  transitions: TransitionAsset[];
  filters: FilterAsset[];
  overlays: OverlayAsset[];
  luts: LUTAsset[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Template Events
// ─────────────────────────────────────────────────────────────────────────────

export type TemplateEventType = 
  | "cut" 
  | "transition" 
  | "filter" 
  | "speed" 
  | "zoom" 
  | "overlay" 
  | "text"
  | "shake"
  | "blur"
  | "flash";

export interface TemplateEvent {
  time_sec: number;
  duration_sec: number;
  type: TemplateEventType;
  
  // Exact parameters (no approximation!)
  params: Record<string, number | string | boolean | number[]>;
  
  // For transitions: exact transition ID
  transitionId?: string;
  
  // For filters: exact filter settings
  filterId?: string;
  
  // For speed: exact speed curve
  speedCurve?: SpeedCurve;
  
  // For zoom: exact zoom parameters
  zoomParams?: ZoomParams;
  
  // For shake: exact shake parameters
  shakeParams?: ShakeParams;
  
  // For blur: exact blur parameters
  blurParams?: BlurParams;
  
  // For flash: exact flash parameters
  flashParams?: FlashParams;
}

// ─────────────────────────────────────────────────────────────────────────────
// Speed Curve
// ─────────────────────────────────────────────────────────────────────────────

export interface SpeedCurve {
  // Control points for speed ramping
  // Each point: [time_offset_seconds, speed_multiplier]
  // Speed is interpolated between points
  points: Array<{ time_sec: number; speed: number }>;
  
  // Easing function for interpolation
  easing: "linear" | "easeIn" | "easeOut" | "easeInOut" | "step";
  
  // Whether to maintain pitch during speed changes
  maintainPitch: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Zoom Parameters
// ─────────────────────────────────────────────────────────────────────────────

export interface ZoomParams {
  // Zoom scale (1.0 = normal, >1 = zoom in, <1 = zoom out)
  scale: number | Array<{ time_sec: number; scale: number }>;
  
  // Zoom center point (0.5 = center)
  centerX: number;
  centerY: number;
  
  // Easing
  easing: "linear" | "easeIn" | "easeOut" | "easeInOut";
}

// ─────────────────────────────────────────────────────────────────────────────
// Shake Parameters
// ─────────────────────────────────────────────────────────────────────────────

export interface ShakeParams {
  // Shake amplitude in pixels
  amplitude: number;
  
  // Shake frequency in Hz
  frequency: number;
  
  // Shake direction
  direction: "horizontal" | "vertical" | "both" | "random";
  
  // Whether to decay over time
  decay: boolean;
  decayFactor?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Blur Parameters
// ─────────────────────────────────────────────────────────────────────────────

export interface BlurParams {
  // Blur type
  type: "gaussian" | "radial" | "motion" | "pixelate" | "directional";
  
  // Blur strength (0 = none, 1 = max)
  strength: number | Array<{ time_sec: number; strength: number }>;
  
  // For motion blur: direction in degrees
  angle?: number;
  
  // For radial blur: center point
  centerX?: number;
  centerY?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Flash Parameters
// ─────────────────────────────────────────────────────────────────────────────

export interface FlashParams {
  // Flash color
  color: string; // hex like "#FFFFFF" or "#FF00FF"
  
  // Flash intensity (0-1)
  intensity: number;
  
  // Flash duration in seconds
  duration: number;
  
  // How many times to flash
  count: number;
  
  // Easing
  easing: "linear" | "easeIn" | "easeOut" | "pulse";
}

// ─────────────────────────────────────────────────────────────────────────────
// Assets
// ─────────────────────────────────────────────────────────────────────────────

export interface TransitionAsset {
  id: string;
  name: string;
  type: TransitionType;
  
  // Pre-rendered transition video path
  videoPath?: string;
  
  // Or parameter-based generation
  params?: TransitionParams;
  
  // Duration in seconds
  duration: number;
  
  // Thumbnail for UI
  thumbnailPath?: string;
}

export type TransitionType =
  | "zoom_in"
  | "zoom_out"
  | "zoom_in_fast"
  | "zoom_out_slow"
  | "whip_left"
  | "whip_right"
  | "whip_up"
  | "whip_down"
  | "white_flash"
  | "color_flash"
  | "glitch_digital"
  | "glitch_rgb"
  | "blur_radial_in"
  | "blur_radial_out"
  | "blur_motion"
  | "pixelate_in"
  | "pixelate_out"
  | "flip_3d_x"
  | "flip_3d_y"
  | "camera_shake_light"
  | "camera_shake_heavy"
  | "mirror_split"
  | "kaleidoscope"
  | "cross_dissolve"
  | "luma_dissolve"
  | "fade_black"
  | "fade_white"
  | "slide_left"
  | "slide_right"
  | "slide_up"
  | "slide_down"
  | "bounce"
  | "elastic"
  | "morph"
  | "ripple"
  | "wave"
  | "vortex"
  | "cube_rotate"
  | "page_curl"
  | "mosaic_reveal"
  | "light_leak"
  | "film_burn"
  | "vhs_glitch"
  | "crt_flicker"
  | "chromatic_aberration"
  | "lens_distortion"
  | "barrel_roll"
  | "spin"
  | "spiral"
  | "heartbeat"
  | "pulse"
  | "glow"
  | "shadow_reveal"
  | "glass_shatter"
  | "ink_spread"
  | "paint_brush"
  | "pencil_sketch"
  | "oil_paint"
  | "watercolor"
  | "neon_outline"
  | "cyberpunk_scan"
  | "matrix_rain"
  | "star_wipe"
  | "heart_wipe"
  | "diamond_wipe"
  | "clock_wipe"
  | "venetian_blinds"
  | "checkerboard"
  | "radial_wipe"
  | "iris_wipe"
  | "box_wipe"
  | " BarnDoor_wipe";

export interface TransitionParams {
  // Zoom transitions
  zoomStart?: number;
  zoomEnd?: number;
  zoomCenterX?: number;
  zoomCenterY?: number;
  
  // Whip transitions
  blurAmount?: number;
  direction?: "left" | "right" | "up" | "down";
  
  // Flash transitions
  peakBrightness?: number;
  flashColor?: string;
  
  // Glitch transitions
  blockSize?: number;
  rgbSplit?: number;
  chromaticAberration?: boolean;
  
  // Blur transitions
  blurStart?: number;
  blurEnd?: number;
  blurType?: "gaussian" | "radial" | "motion";
  
  // 3D transitions
  rotateX?: number;
  rotateY?: number;
  rotateZ?: number;
  perspective?: number;
  
  // Shake transitions
  shakeAmplitude?: number;
  shakeFrequency?: number;
  
  // General
  duration?: number;
  easing?: "linear" | "easeIn" | "easeOut" | "easeInOut" | "bounce" | "elastic";
}

export interface FilterAsset {
  id: string;
  name: string;
  type: FilterType;
  
  // LUT file path
  lutPath?: string;
  
  // Or parameter-based filter
  params?: FilterParams;
}

export type FilterType =
  | "lut"
  | "eq"
  | "colorbalance"
  | "colorchannelmixer"
  | "curves"
  | "hue"
  | "saturation"
  | "brightness"
  | "contrast"
  | "gamma"
  | "vignette"
  | "grain"
  | "sharpen"
  | "blur"
  | "glow"
  | "shadow"
  | "highlight"
  | "temperature"
  | "tint"
  | "fade"
  | "vintage"
  | "cinematic"
  | "dramatic"
  | "matte"
  | "split_tone"
  | "cross_process"
  | "bleach_bypass"
  | "day_for_night"
  | "infrared"
  | "lomo"
  | "polaroid"
  | "instant"
  | "noir"
  | "sepia"
  | "monochrome"
  | "duotone"
  | "tritone"
  | "gradient_map"
  // Modern/popular filter names
  | "modern_high_contrast"
  | "modern_muted"
  | "modern_vibrant"
  | "cyberpunk_scan"
  | "tropical"
  | "moody"
  | "matrix_rain"
  | "temperature";

export interface FilterParams {
  brightness?: number;
  contrast?: number;
  saturation?: number;
  hue?: number;
  gamma?: number;
  temperature?: number;
  tint?: number;
  vignette?: number;
  grain?: number;
  sharpen?: number;
  blur?: number;
  fade?: number;
  shadows?: number;
  highlights?: number;
  
  // Color channel adjustments
  redGain?: number;
  greenGain?: number;
  blueGain?: number;
  
  // Curves
  curvePoints?: Array<{ input: number; output: number }>;
  
  // Split toning
  shadowColor?: string;
  highlightColor?: string;
  shadowBalance?: number;
  highlightBalance?: number;
}

export interface OverlayAsset {
  id: string;
  name: string;
  type: OverlayType;
  path: string;
  
  // Position
  position: {
    x: number; // 0-1 (relative to video width)
    y: number; // 0-1 (relative to video height)
  };
  
  // Size
  scale: number;
  
  // Timing
  startTime: number;
  endTime: number;
  
  // Animation
  animation?: OverlayAnimation;
}

export type OverlayType =
  | "text"
  | "image"
  | "video"
  | "sticker"
  | "emoji"
  | "shape"
  | "arrow"
  | "badge"
  | "watermark"
  | "logo"
  | "frame"
  | "border"
  | "mask";

export interface OverlayAnimation {
  type: "fade" | "slide" | "zoom" | "rotate" | "bounce" | "typewriter" | "reveal";
  duration: number;
  delay: number;
  easing: string;
}

export interface LUTAsset {
  id: string;
  name: string;
  path: string;
  
  // Which segment this LUT applies to
  segmentTime: number;
  segmentDuration: number;
  
  // Color profile info
  colorProfile?: string;
  colorMood?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Template Application
// ─────────────────────────────────────────────────────────────────────────────

export interface ApplyOptions {
  /** Time mapping strategy */
  strategy?: "proportional" | "beat_sync" | "shot_match" | "content_aware";
  
  /** Target duration override */
  targetDuration?: number;
  
  /** Whether to use target's own beats for sync */
  useTargetBeats?: boolean;
  
  /** Whether to maintain source aspect ratio */
  maintainAspectRatio?: boolean;
  
  /** Output resolution */
  outputResolution?: { width: number; height: number };
  
  /** Output width */
  outputWidth?: number;
  
  /** Output height */
  outputHeight?: number;
  
  /** Quality preset */
  quality?: "draft" | "standard" | "high" | "ultra";
  
  /** Whether to include audio from reference */
  includeReferenceAudio?: boolean;
  
  /** Whether to loop reference audio if shorter */
  loopAudio?: boolean;
}

export interface ApplyResult {
  success: boolean;
  outputPath?: string;
  videoUrl?: string;
  videoBase64?: string;
  
  // Template that was applied
  templateId: string;
  
  // Mapping info (optional for error cases)
  timeMap?: TimeMapping[];
  
  // Applied events
  appliedEvents: AppliedEvent[];
  
  // Stats
  processingMs: number;
  outputDuration: number;
  outputSizeBytes: number;
  
  // Error
  error?: string;
}

export interface TimeMapping {
  sourceTime: number;
  targetTime: number;
  sourceDuration: number;
  targetDuration: number;
}

export interface AppliedEvent {
  sourceEvent: TemplateEvent;
  targetTime: number;
  targetDuration: number;
  applied: boolean;
  reason?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Template Storage
// ─────────────────────────────────────────────────────────────────────────────

export interface TemplateStorage {
  save(template: EditingTemplate): Promise<void>;
  load(templateId: string): Promise<EditingTemplate | null>;
  list(): Promise<TemplateSummary[]>;
  delete(templateId: string): Promise<void>;
}

export interface TemplateSummary {
  templateId: string;
  name: string;
  createdAt: string;
  sourceDuration: number;
  eventCount: number;
  thumbnailUrl?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Frame Analysis (for extraction)
// ─────────────────────────────────────────────────────────────────────────────

export interface FrameAnalysis {
  frameIndex: number;
  timestamp: number;
  
  // Color info
  color: {
    meanR: number;
    meanG: number;
    meanB: number;
    brightness: number;
    contrast: number;
    saturation: number;
  };
  
  // Motion info
  motion: {
    magnitude: number;
    direction: number;
    zoom: number;
    panX: number;
    panY: number;
  };
  
  // Edge info
  edges: {
    density: number;
    direction: number;
  };
  
  // Audio sync
  audio: {
    energy: number;
    flux: number;
    isBeat: boolean;
  };
}

export interface CutDetection {
  frame: number;
  time_sec: number;
  type: "hard" | "soft" | "dissolve" | "fade" | "wipe" | "unknown";
  confidence: number;
  hasTransition: boolean;
  transitionType?: string;
  transitionDuration?: number;
}

export interface SegmentEditing {
  type: TemplateEventType;
  params: Record<string, number | string | boolean | number[]>;
  transitionId?: string;
  filterSettings?: FilterParams;
  speedCurve?: SpeedCurve;
}

