/**
 * Blueprint Transfer Engine
 *
 * Takes an `EditingBlueprint` extracted from a reference video and applies
 * it onto a target video timeline, producing a complete set of
 * `EditInstructions` — structured JSON describing every cut, speed
 * segment, beat-aligned transition, and style block.
 *
 * Adaptation strategies
 * ─────────────────────
 *
 * 1. **Proportional** (default)
 *    All timestamps scale linearly by `targetDuration / sourceDuration`.
 *    Cuts, speed segments, transitions, and style blocks all shift
 *    proportionally so the *relative* pacing is preserved.
 *
 * 2. **Loop**
 *    When the target is longer than the source, the blueprint pattern
 *    is tiled cyclically.  Each loop iteration appends the full
 *    blueprint offset by the cumulative duration.
 *
 * 3. **Truncate**
 *    The blueprint is applied 1:1 up to the target duration.  Events
 *    beyond the target length are simply dropped.
 *
 * Beat preservation
 * ─────────────────
 * When `preserveBeats` is enabled (default), cuts are snapped to the
 * nearest beat timestamp within a configurable tolerance window.
 * This maintains the rhythmic feel even after proportional scaling.
 *
 * Everything is pure computation — no FFmpeg / I/O / filesystem access.
 */

import type {
  EditingBlueprint,
  BlueprintEvent,
  BlueprintSegment,
  BlueprintTransferOptions,
  AdaptationStrategy,
  EditInstructions,
  EditCutInstruction,
  EditSpeedInstruction,
  EditTransitionInstruction,
  EditStyleInstruction,
  EditInstructionsSummary,
  CutType,
  TransitionPreset,
  MotionPreset,
  TemplateOverlayEffect,
} from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// Defaults
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_STRATEGY: AdaptationStrategy = "proportional";
/** EXTREME MODE: 0.05s minimum — allow micro-segments for maximum
 *  cut density matching reference's chaotic pacing. */
const DEFAULT_MIN_SEGMENT_SEC = 0.05;
const DEFAULT_TRANSITION_OVERLAP_SEC = 0.08;
const BEAT_SNAP_TOLERANCE_SEC = 0.15;

/** Max length for description strings in the output JSON.  Keeps the
 *  serialised payload well under the 1 MB safety threshold. */
const MAX_DESCRIPTION_LEN = 80;

/** Maximum number of template overlays per style block.  Prevents
 *  beat-dense tracks from generating thousands of overlay entries. */
const MAX_OVERLAYS_PER_BLOCK = 30;

/** Maximum total template overlays in the top-level array. */
const MAX_TOTAL_TEMPLATE_OVERLAYS = 120;

// ─────────────────────────────────────────────────────────────────────────────
// Professional Transition Presets Library
// ─────────────────────────────────────────────────────────────────────────────
//
// Each preset defines the default effect parameters that the renderer
// should use.  The blueprint transfer engine resolves a blueprint event
// to one of these presets and populates the corresponding fields on
// EditTransitionInstruction.

interface TransitionPresetDef {
  kind: TransitionPreset;
  effectDurationSec: number;
  scaleFrom?: number;
  scaleTo?: number;
  brightnessSpikeMultiplier?: number;
  blurSigma?: number;
  glitchOffsetPx?: number;
  motionBlurAngle?: number;
  description: string;
}

const TRANSITION_PRESETS: Record<string, TransitionPresetDef> = {
  // ── Zoom hits ─────────────────────────────────────────────────────
  zoom_hit: {
    kind: "zoom_hit",
    effectDurationSec: 0.1,
    scaleFrom: 1.0,
    scaleTo: 1.15,
    description: "Quick zoom-in punch on beat",
  },
  zoom_out_hit: {
    kind: "zoom_out_hit",
    effectDurationSec: 0.1,
    scaleFrom: 1.15,
    scaleTo: 1.0,
    description: "Quick zoom-out snap on beat",
  },

  // ── Flash / brightness spike ──────────────────────────────────────
  flash: {
    kind: "flash",
    effectDurationSec: 0.08,
    brightnessSpikeMultiplier: 3.0,
    description: "White flash brightness spike",
  },

  // ── Whip pan ──────────────────────────────────────────────────────
  whip_pan: {
    kind: "whip_pan",
    effectDurationSec: 0.12,
    blurSigma: 25,
    description: "Fast horizontal motion-blur swipe",
  },

  // ── Luma fade ─────────────────────────────────────────────────────
  luma_fade: {
    kind: "luma_fade",
    effectDurationSec: 0.15,
    brightnessSpikeMultiplier: 1.5,
    description: "Brightness-driven luma dissolve",
  },

  // ── Glitch ────────────────────────────────────────────────────────
  glitch: {
    kind: "glitch",
    effectDurationSec: 0.06,
    glitchOffsetPx: 8,
    description: "RGB-split channel offset glitch",
  },

  // ── Cross blur ─────────────────────────────────────────────────────
  cross_blur: {
    kind: "cross_blur",
    effectDurationSec: 0.14,
    blurSigma: 8,
    description: "Gaussian blur 0→8→0 across the cut",
  },

  // ── Wipe transition ───────────────────────────────────────────────
  wipe: {
    kind: "wipe",
    effectDurationSec: 0.2,
    description: "Linear wipe transition (left-to-right)",
  },

  // ── Slide transition ──────────────────────────────────────────────
  slide: {
    kind: "slide",
    effectDurationSec: 0.18,
    description: "Push-slide transition (incoming pushes outgoing)",
  },

  // ── Motion blur swipe ─────────────────────────────────────────────
  motion_blur_swipe: {
    kind: "motion_blur_swipe",
    effectDurationSec: 0.1,
    blurSigma: 30,
    motionBlurAngle: 0,
    description: "Directional motion blur swipe on cut",
  },

  // ── RGB split / chromatic aberration ──────────────────────────────
  rgb_split: {
    kind: "rgb_split",
    effectDurationSec: 0.08,
    glitchOffsetPx: 12,
    description: "Chromatic aberration RGB channel split",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Template LUT & Overlay Registry
// ─────────────────────────────────────────────────────────────────────────────
//
// Maps templateId → { lutPath, overlay config }.
// When a template is active, these effects are force-injected at every
// beat onset, overriding the target video's original colour/style.

interface TemplateConfig {
  /** Path to the HALD CLUT PNG (Color DNA) */
  lutPath: string;
  /** Overlay effect to inject at every beat */
  overlayKind: TemplateOverlayEffect["kind"];
  /** Duration of each overlay flash (seconds) */
  overlayDurationSec: number;
  /** Peak intensity of the overlay (0-1) */
  overlayIntensity: number;
  /** For color_flash: hex colour */
  overlayColor?: string;
}

const TEMPLATE_REGISTRY: Record<string, TemplateConfig> = {
  cinematic_amber: {
    lutPath: "luts/cinematic_amber.png",
    overlayKind: "white_flash",
    overlayDurationSec: 0.08,
    overlayIntensity: 0.85,
  },
  neon_night: {
    lutPath: "luts/neon_night.png",
    overlayKind: "color_flash",
    overlayDurationSec: 0.06,
    overlayIntensity: 0.9,
    overlayColor: "#FF00FF",
  },
  vintage_film: {
    lutPath: "luts/vintage_film.png",
    overlayKind: "vignette_pulse",
    overlayDurationSec: 0.1,
    overlayIntensity: 0.7,
  },
  high_contrast_bw: {
    lutPath: "luts/high_contrast_bw.png",
    overlayKind: "white_flash",
    overlayDurationSec: 0.05,
    overlayIntensity: 0.95,
  },
  tropical_warm: {
    lutPath: "luts/tropical_warm.png",
    overlayKind: "color_flash",
    overlayDurationSec: 0.08,
    overlayIntensity: 0.75,
    overlayColor: "#FF4500",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Apply an editing blueprint onto a target video timeline.
 *
 * @param blueprint       The `EditingBlueprint` from the reference video
 * @param targetDuration  Duration of the target video (seconds).
 *                        Can be overridden via `opts.targetDuration`.
 * @param opts            Transfer options (strategy, beat preservation, etc.)
 * @returns               Structured `EditInstructions` ready for rendering
 */
export function transferBlueprint(
  blueprint: EditingBlueprint,
  targetDuration: number,
  opts: BlueprintTransferOptions = {},
): EditInstructions {
  const t0 = performance.now();

  const strategy = opts.strategy ?? DEFAULT_STRATEGY;
  const tgtDur = opts.targetDuration ?? targetDuration;
  const minSeg = opts.minSegmentDuration ?? DEFAULT_MIN_SEGMENT_SEC;
  const preserveBeats = opts.preserveBeats ?? true;
  const includeStyle = opts.includeStyle ?? true;
  const transitionOverlap =
    opts.transitionOverlapSec ?? DEFAULT_TRANSITION_OVERLAP_SEC;

  const srcDur = blueprint.summary.totalDuration;
  const ratio = srcDur > 0 ? tgtDur / srcDur : 1;

  // ── 1. Compute the time-mapping function ─────────────────────────────
  const mapTime = buildTimeMapper(strategy, srcDur, tgtDur);

  // ── 2. Optionally collect target beat grid for snapping ──────────────
  const targetBeatGrid = preserveBeats
    ? buildScaledBeatGrid(blueprint, mapTime, tgtDur)
    : [];

  // ── 3. Adapt cut events ──────────────────────────────────────────────
  const cutEvents = blueprint.timeline.filter(
    (e) => e.kind === "cut",
  );
  const cuts = adaptCuts(
    cutEvents,
    mapTime,
    tgtDur,
    targetBeatGrid,
    preserveBeats,
    transitionOverlap,
  );

  // ── 4. Adapt speed segments ──────────────────────────────────────────
  const speedSegments = adaptSpeedSegments(
    blueprint.segments,
    mapTime,
    tgtDur,
    minSeg,
    targetBeatGrid,
    preserveBeats,
  );

  // ── 5. Adapt transitions (beat-aligned, rhythm shifts, jhatkas) ──────
  const transitionEvents = blueprint.timeline.filter(
    (e) =>
      e.kind === "beat_transition" ||
      e.kind === "rhythm_shift" ||
      e.kind === "jhatka",
  );
  const templateId = opts.templateId;
  const transitions = adaptTransitions(
    transitionEvents,
    mapTime,
    tgtDur,
    templateId,
  );

  // ── 6. Adapt style blocks ─────────────────────────────────────────
  const styleBlocks = includeStyle
    ? adaptStyleBlocks(
        blueprint.segments,
        mapTime,
        tgtDur,
        minSeg,
        targetBeatGrid,
        templateId,
      )
    : [];

  // ── 7. Template force-inject: LUT + overlays at every beat onset ────
  let templateOverlays: TemplateOverlayEffect[] | undefined;
  if (templateId) {
    const tplConfig = TEMPLATE_REGISTRY[templateId];
    if (tplConfig && targetBeatGrid.length > 0) {
      templateOverlays = targetBeatGrid
        .filter((t) => t > 0 && t < tgtDur - 0.05)
        .map((t) => ({
          time_sec: round3(t),
          kind: tplConfig.overlayKind,
          durationSec: tplConfig.overlayDurationSec,
          intensity: tplConfig.overlayIntensity,
          color: tplConfig.overlayColor,
          lutPath: tplConfig.lutPath,
        }));
    }
  }

  // ── 7. Summary ──────────────────────────────────────────────────────
  const processingMs = Math.round(performance.now() - t0);

  const summary: EditInstructionsSummary = {
    sourceBlueprintId: blueprint.blueprintId,
    sourceDuration: srcDur,
    targetDuration: tgtDur,
    durationRatio: round3(ratio),
    strategy,
    totalCuts: cuts.length,
    totalSpeedSegments: speedSegments.length,
    totalTransitions: transitions.length,
    beatSnappedCuts: cuts.filter((c) => c.beatSnapped).length,
    processingMs,
  };

  // ── 8. Payload-size safety ───────────────────────────────────────
  //    Truncate verbose description strings and cap overlay arrays
  //    to prevent "Unterminated string in JSON" errors caused by
  //    payloads exceeding the response size limit.
  for (const tr of transitions) {
    if (tr.description && tr.description.length > MAX_DESCRIPTION_LEN) {
      tr.description = tr.description.slice(0, MAX_DESCRIPTION_LEN - 1) + "…";
    }
  }
  for (const sb of styleBlocks) {
    if (sb.templateOverlays && sb.templateOverlays.length > MAX_OVERLAYS_PER_BLOCK) {
      sb.templateOverlays = sb.templateOverlays.slice(0, MAX_OVERLAYS_PER_BLOCK);
    }
  }
  if (templateOverlays && templateOverlays.length > MAX_TOTAL_TEMPLATE_OVERLAYS) {
    templateOverlays = templateOverlays.slice(0, MAX_TOTAL_TEMPLATE_OVERLAYS);
  }

  return {
    instructionId: `ei_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    generatedAt: new Date().toISOString(),
    sourceBlueprintId: blueprint.blueprintId,
    cuts,
    speedSegments,
    transitions,
    styleBlocks,
    summary,
    templateId,
    templateOverlays,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Time Mapper
// ─────────────────────────────────────────────────────────────────────────────

type TimeMapper = (srcTime: number) => number;

/**
 * Build the time-mapping function for a given strategy.
 *
 * - **proportional**: `t_target = t_source × (tgtDur / srcDur)`
 * - **loop**:         `t_target = t_source + N × srcDur` (N = iteration)
 *                     The mapper itself just does proportional within one
 *                     iteration — the looping is handled externally.
 * - **truncate**:     `t_target = t_source` (1:1, capped at tgtDur)
 */
function buildTimeMapper(
  strategy: AdaptationStrategy,
  srcDur: number,
  tgtDur: number,
): TimeMapper {
  if (srcDur <= 0) return (t) => t;

  switch (strategy) {
    case "proportional": {
      const ratio = tgtDur / srcDur;
      return (t) => round3(t * ratio);
    }
    case "loop":
      // 1:1 mapping — looping handled at event level
      return (t) => round3(t);
    case "truncate":
      return (t) => round3(Math.min(t, tgtDur));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Beat Grid
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a scaled beat grid from the reference beat events.
 * Each beat timestamp is mapped through `mapTime` so that cuts can
 * be snapped to the target-timeline beat positions.
 */
function buildScaledBeatGrid(
  blueprint: EditingBlueprint,
  mapTime: TimeMapper,
  tgtDur: number,
): number[] {
  const beats = blueprint.rawMetadata.audio.beatEvents
    .map((b) => mapTime(b.timestamp_sec))
    .filter((t) => t >= 0 && t <= tgtDur);

  // For loop strategy, tile beats across the full target
  if (beats.length > 0) {
    const srcDur = blueprint.summary.totalDuration;
    if (srcDur > 0 && tgtDur > srcDur) {
      const iterations = Math.ceil(tgtDur / srcDur);
      const baseBeatCount = beats.length;
      for (let i = 1; i < iterations && beats.length < 10000; i++) {
        const offset = i * srcDur;
        for (let j = 0; j < baseBeatCount; j++) {
          const t = round3(blueprint.rawMetadata.audio.beatEvents[j].timestamp_sec + offset);
          if (t <= tgtDur) beats.push(t);
        }
      }
    }
  }

  return beats.sort((a, b) => a - b);
}

// ─────────────────────────────────────────────────────────────────────────────
// Cut Adaptation
// ─────────────────────────────────────────────────────────────────────────────

function adaptCuts(
  cutEvents: BlueprintEvent[],
  mapTime: TimeMapper,
  tgtDur: number,
  beatGrid: number[],
  preserveBeats: boolean,
  transitionOverlap: number,
): EditCutInstruction[] {
  const instructions: EditCutInstruction[] = [];
  const seenTimes = new Set<number>();

  const processEvent = (evt: BlueprintEvent, timeOffset: number) => {
    const rawTime = mapTime(evt.time_sec) + timeOffset;
    if (rawTime <= 0 || rawTime >= tgtDur) return;

    let finalTime = rawTime;
    let snapped = false;
    let snapDelta = 0;

    if (preserveBeats && beatGrid.length > 0) {
      const nearest = binarySearchNearest(beatGrid, rawTime);
      if (nearest !== null) {
        const delta = Math.abs(nearest - rawTime);
        if (delta <= BEAT_SNAP_TOLERANCE_SEC) {
          snapDelta = round3((nearest - rawTime) * 1000);
          finalTime = nearest;
          snapped = true;
        }
      }
    }

    // Deduplicate (can happen with loop strategy)
    const key = Math.round(finalTime * 1000);
    if (seenTimes.has(key)) return;
    seenTimes.add(key);

    const cutType: CutType =
      (evt.params.cutType as CutType) || "hard_cut";

    instructions.push({
      time_sec: round3(finalTime),
      type: cutType,
      confidence: evt.confidence,
      beatSnapped: snapped,
      snapDeltaMs: snapDelta,
      transitionOverlapSec:
        cutType === "gradual_transition" ? transitionOverlap : 0,
    });
  };

  // For loop strategy, tile events across target duration
  const srcDur =
    cutEvents.length > 0
      ? Math.max(...cutEvents.map((e) => e.time_sec), 1)
      : 1;
  const iterations =
    tgtDur > srcDur ? Math.ceil(tgtDur / srcDur) : 1;

  for (let iter = 0; iter < iterations; iter++) {
    const offset = iter * srcDur;
    if (offset >= tgtDur) break;
    for (const evt of cutEvents) {
      processEvent(evt, iter === 0 ? 0 : offset);
    }
    if (iterations === 1) break; // proportional / truncate — one pass
  }

  return instructions.sort((a, b) => a.time_sec - b.time_sec);
}

// ─────────────────────────────────────────────────────────────────────────────
// Speed Segment Adaptation
// ─────────────────────────────────────────────────────────────────────────────

function adaptSpeedSegments(
  segments: BlueprintSegment[],
  mapTime: TimeMapper,
  tgtDur: number,
  minSeg: number,
  beatGrid: number[],
  preserveBeats: boolean,
): EditSpeedInstruction[] {
  if (segments.length === 0) {
    // Fallback: single normal-speed segment covering the whole target
    return [
      {
        start_sec: 0,
        end_sec: round3(tgtDur),
        speed: 1.0,
        label: "normal",
        rhythmEnergy: "medium",
        beatAligned: false,
      },
    ];
  }

  const instructions: EditSpeedInstruction[] = [];
  const srcDur = segments[segments.length - 1].end_sec || tgtDur;
  const iterations =
    tgtDur > srcDur && srcDur > 0 ? Math.ceil(tgtDur / srcDur) : 1;

  for (let iter = 0; iter < iterations; iter++) {
    const offset = iter > 0 ? iter * srcDur : 0;
    if (offset >= tgtDur) break;

    for (const seg of segments) {
      let start = mapTime(seg.start_sec) + (iter > 0 ? offset : 0);
      let end = mapTime(seg.end_sec) + (iter > 0 ? offset : 0);

      // Clamp to target bounds
      start = Math.max(0, Math.min(start, tgtDur));
      end = Math.max(start, Math.min(end, tgtDur));

      // Skip degenerate segments
      if (end - start < minSeg) continue;

      // Beat alignment on segment start
      let beatAligned = seg.beatAligned;
      if (preserveBeats && beatGrid.length > 0 && start > 0) {
        const nearest = binarySearchNearest(beatGrid, start);
        if (nearest !== null && Math.abs(nearest - start) <= BEAT_SNAP_TOLERANCE_SEC) {
          start = nearest;
          beatAligned = true;
        }
      }

      instructions.push({
        start_sec: round3(start),
        end_sec: round3(end),
        speed: seg.speed,
        label: seg.speedLabel,
        rhythmEnergy: seg.rhythmEnergy,
        beatAligned,
      });
    }

    if (iterations === 1) break;
  }

  // Ensure full coverage: fill any gaps with normal-speed segments
  return ensureFullCoverage(instructions, tgtDur, minSeg);
}

/**
 * Fill gaps in the speed-segment list so it covers [0, tgtDur]
 * without overlaps.
 */
function ensureFullCoverage(
  segments: EditSpeedInstruction[],
  tgtDur: number,
  minSeg: number,
): EditSpeedInstruction[] {
  if (segments.length === 0) {
    return [
      {
        start_sec: 0,
        end_sec: round3(tgtDur),
        speed: 1.0,
        label: "normal",
        rhythmEnergy: "medium",
        beatAligned: false,
      },
    ];
  }

  // Sort and de-overlap
  const sorted = [...segments].sort((a, b) => a.start_sec - b.start_sec);
  const result: EditSpeedInstruction[] = [];
  let cursor = 0;

  for (const seg of sorted) {
    // Gap before this segment?
    if (seg.start_sec > cursor + minSeg) {
      result.push({
        start_sec: round3(cursor),
        end_sec: round3(seg.start_sec),
        speed: 1.0,
        label: "normal",
        rhythmEnergy: "medium",
        beatAligned: false,
      });
    }

    // Clamp start to cursor to prevent overlaps
    const start = Math.max(seg.start_sec, cursor);
    if (seg.end_sec > start + minSeg) {
      result.push({ ...seg, start_sec: round3(start) });
      cursor = seg.end_sec;
    }
  }

  // Fill trailing gap
  if (cursor < tgtDur - minSeg) {
    result.push({
      start_sec: round3(cursor),
      end_sec: round3(tgtDur),
      speed: 1.0,
      label: "normal",
      rhythmEnergy: "medium",
      beatAligned: false,
    });
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Transition Adaptation — Professional Presets Library
// ─────────────────────────────────────────────────────────────────────────────
//
// Instead of a simple 1:1 kind mapping, the engine now:
//   1. Resolves each blueprint event to a professional preset from the
//      TRANSITION_PRESETS library.
//   2. Generates fully-populated EditTransitionInstructions with all
//      effect parameters (scale, brightness spike, blur sigma, etc.).
//   3. If a jhatka event is detected → emits a "zoom_hit" preset
//      (scale 1.0→1.15 in 0.1s).
//   4. If a template is active and the event is a beat_transition →
//      also emits a "flash" preset (brightness spike) at the same time.
//   5. High-confidence beat_transitions (>0.8) get upgraded to a
//      "whip_pan" for extra punch.

function adaptTransitions(
  events: BlueprintEvent[],
  mapTime: TimeMapper,
  tgtDur: number,
  templateId?: string,
): EditTransitionInstruction[] {
  const instructions: EditTransitionInstruction[] = [];
  const seenTimes = new Set<string>();

  const pushInstruction = (
    t: number,
    preset: TransitionPresetDef,
    evt: BlueprintEvent,
    overrides: Partial<EditTransitionInstruction> = {},
  ) => {
    const key = `${Math.round(t * 1000)}_${preset.kind}`;
    if (seenTimes.has(key)) return;
    seenTimes.add(key);

    instructions.push({
      time_sec: round3(t),
      kind: preset.kind,
      intensity: evt.confidence,
      description: preset.description,
      params: { ...evt.params },
      effectDurationSec: preset.effectDurationSec,
      scaleFrom: preset.scaleFrom,
      scaleTo: preset.scaleTo,
      brightnessSpikeMultiplier: preset.brightnessSpikeMultiplier,
      blurSigma: preset.blurSigma,
      glitchOffsetPx: preset.glitchOffsetPx,
      motionBlurAngle: preset.motionBlurAngle,
      ...overrides,
    });
  };

  for (const evt of events) {
    const t = mapTime(evt.time_sec);
    if (t < 0 || t > tgtDur) continue;

    // ── Resolve to professional presets based on event kind ────────────

    if (evt.kind === "jhatka") {
      // Jhatka → Zoom-Hit (scale 1.0 → 1.15 in 0.1s)
      pushInstruction(t, TRANSITION_PRESETS.zoom_hit, evt);

      // Also add a complementary flash for extra punch
      pushInstruction(t, TRANSITION_PRESETS.flash, evt, {
        intensity: Math.min(1.0, evt.confidence * 1.2),
      });
    } else if (evt.kind === "beat_transition") {
      // EXTREME: confidence >= 0.3 gets whip_pan (was >= 0.8)
      if (evt.confidence >= 0.3) {
        pushInstruction(t, TRANSITION_PRESETS.whip_pan, evt);
      } else {
        // Standard beat → beat_cut (resolved from preset library)
        pushInstruction(t, {
          kind: "beat_cut",
          effectDurationSec: 0.02,
          description: "Hard cut on beat",
        }, evt);
      }

      // EXTREME: Force zoom_hit on EVERY beat_transition with confidence > 0.05
      if (evt.confidence > 0.05) {
        pushInstruction(t, TRANSITION_PRESETS.zoom_hit, evt, {
          intensity: Math.min(1.0, evt.confidence * 1.5),
        });
      }

      // EXTREME: Force glitch on high-confidence beats (>= 0.5)
      if (evt.confidence >= 0.5) {
        pushInstruction(t, TRANSITION_PRESETS.glitch, evt);
      }

      // Template active? Force-inject a flash at every beat onset
      if (templateId) {
        const tplConfig = TEMPLATE_REGISTRY[templateId];
        const flashPreset = TRANSITION_PRESETS.flash;
        pushInstruction(t, flashPreset, evt, {
          brightnessSpikeMultiplier:
            tplConfig ? 3.5 : flashPreset.brightnessSpikeMultiplier,
          description: `Template flash [${templateId}]`,
        });
      }
    } else if (evt.kind === "rhythm_shift") {
      // Rhythm shifts → luma_fade for smooth energy transitions
      pushInstruction(t, TRANSITION_PRESETS.luma_fade, evt);
    } else {
      // Fallback: beat_speed_change
      pushInstruction(t, {
        kind: "beat_speed_change",
        effectDurationSec: 0.05,
        description: "Beat-synced speed change",
      }, evt);
    }

    // ── Param-driven preset overrides ───────────────────────────────
    // If the blueprint event itself carries a `flash` or `glitch` param,
    // inject the corresponding preset regardless of kind.
    if (evt.params.flash === true || evt.params.flash === "true") {
      const spike = typeof evt.params.brightness_spike === "number"
        ? evt.params.brightness_spike
        : 3.0;
      pushInstruction(t, TRANSITION_PRESETS.flash, evt, {
        brightnessSpikeMultiplier: spike as number,
        description: `Flash (brightness_spike=${spike})`,
      });
    }
    if (evt.params.glitch === true || evt.params.glitch === "true") {
      pushInstruction(t, TRANSITION_PRESETS.glitch, evt);
    }
    if (evt.params.rgb_split === true || evt.params.rgb_split === "true") {
      pushInstruction(t, TRANSITION_PRESETS.rgb_split, evt);
    }
    if (evt.params.wipe === true || evt.params.wipe === "true") {
      pushInstruction(t, TRANSITION_PRESETS.wipe, evt);
    }
    if (evt.params.slide === true || evt.params.slide === "true") {
      pushInstruction(t, TRANSITION_PRESETS.slide, evt);
    }
    if (evt.params.motion_blur === true || evt.params.motion_blur === "true") {
      const angle = typeof evt.params.motion_blur_angle === "number"
        ? evt.params.motion_blur_angle
        : 0;
      pushInstruction(t, TRANSITION_PRESETS.motion_blur_swipe, evt, {
        motionBlurAngle: angle as number,
        description: `Motion blur swipe (angle=${angle}°)`,
      });
    }
  }

  return instructions.sort((a, b) => a.time_sec - b.time_sec);
}

// ─────────────────────────────────────────────────────────────────────────────
// Style Block Adaptation — with Motion Presets & Template Injection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Derive the motion_preset from segment properties.
 *
 * Logic:
 *   • speed > 2.0 + energy peak         → whip_pan_drift
 *   • speed > 1.3 + energy peak/high    → velocity_bounce
 *   • speed < 0.5 (deep slow-mo)        → dolly_zoom
 *   • speed < 0.7 (slow-mo)             → smooth_drift
 *   • speed ≈ 1.0 + beatAligned + high  → tracking_shot
 *   • beatAligned + energy high/peak     → handheld_shake
 *   • energy silent/low                  → static
 *   • else                               → smooth_drift
 */
function deriveMotionPreset(seg: BlueprintSegment): MotionPreset {
  const { speed, rhythmEnergy, beatAligned } = seg;

  // EXTREME: Lower thresholds for maximum energy classification
  if (speed > 1.5 && rhythmEnergy === "peak") {
    return "whip_pan_drift";
  }
  if (speed > 0.9 && (rhythmEnergy === "peak" || rhythmEnergy === "high")) {
    return "velocity_bounce";
  }
  if (speed < 0.5) {
    return "dolly_zoom";
  }
  if (speed < 0.7) {
    return "smooth_drift";
  }
  if (speed > 0.9 && speed < 1.1 && beatAligned && rhythmEnergy === "high") {
    return "tracking_shot";
  }
  if (beatAligned && (rhythmEnergy === "high" || rhythmEnergy === "peak" || rhythmEnergy === "medium")) {
    return "handheld_shake";
  }
  if (rhythmEnergy === "silent") {
    return "static";
  }
  return "smooth_drift";
}

function adaptStyleBlocks(
  segments: BlueprintSegment[],
  mapTime: TimeMapper,
  tgtDur: number,
  minSeg: number,
  beatGrid: number[],
  templateId?: string,
): EditStyleInstruction[] {
  if (segments.length === 0) return [];

  // Resolve template config (if any)
  const tplConfig = templateId ? TEMPLATE_REGISTRY[templateId] : undefined;

  const blocks: EditStyleInstruction[] = [];
  const seen = new Set<string>();

  for (const seg of segments) {
    const start = Math.max(0, mapTime(seg.start_sec));
    const end = Math.min(tgtDur, mapTime(seg.end_sec));
    if (end - start < minSeg) continue;

    // Deduplicate identical style blocks (by start time)
    const key = `${Math.round(start * 1000)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    // ── Motion preset ─────────────────────────────────────────────
    const motionPreset = deriveMotionPreset(seg);

    // ── Template LUT override ───────────────────────────────────────
    const templateLutPath = tplConfig?.lutPath;

    // ── Template overlays within this block ─────────────────────────
    // Force-inject the template overlay (e.g. white flash) at every
    // beat onset that falls within this style block's time range.
    let blockOverlays: TemplateOverlayEffect[] | undefined;
    if (tplConfig && beatGrid.length > 0) {
      const beatsInBlock = beatGrid.filter(
        (bt) => bt >= start && bt <= end,
      );
      if (beatsInBlock.length > 0) {
        blockOverlays = beatsInBlock.map((bt) => ({
          time_sec: round3(bt),
          kind: tplConfig.overlayKind,
          durationSec: tplConfig.overlayDurationSec,
          intensity: tplConfig.overlayIntensity,
          color: tplConfig.overlayColor,
          lutPath: tplConfig.lutPath,
        }));
      }
    }

    blocks.push({
      start_sec: round3(start),
      end_sec: round3(end),
      eqParams: seg.style.eqParams,
      colorbalanceParams: seg.style.colorbalanceParams,
      colorMood: seg.style.colorMood,
      colorProfile: seg.style.colorProfile,
      grainLabel: seg.style.grainLabel,
      motionPreset,
      templateLutPath,
      templateOverlays: blockOverlays,
    });
  }

  return blocks.sort((a, b) => a.start_sec - b.start_sec);
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

/** Binary-search for the nearest value in a sorted number array. */
function binarySearchNearest(sorted: number[], target: number): number | null {
  if (sorted.length === 0) return null;

  let lo = 0;
  let hi = sorted.length - 1;

  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] < target) lo = mid + 1;
    else hi = mid;
  }

  let best = lo;
  if (
    lo > 0 &&
    Math.abs(sorted[lo - 1] - target) < Math.abs(sorted[lo] - target)
  ) {
    best = lo - 1;
  }

  return sorted[best];
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
