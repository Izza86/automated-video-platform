/**
 * Reference Video Editing Pattern Analyzer
 *
 * Takes a complete `FullVideoMetadata` produced by the analysis pipeline
 * and synthesises a structured **Editing Blueprint** — a timeline that
 * fuses:
 *
 *   • **Cuts**                — from shot detection boundaries
 *   • **Speed ramps**         — from velocity segments + jhatka events
 *   • **Beat-aligned transitions** — from audio beat events correlated
 *                                with cut / jhatka timestamps
 *   • **Style parameters**    — from colour-grading metadata, mapped
 *                                onto each segment
 *
 * The output is a self-contained `EditingBlueprint` that can be:
 *   1. Rendered as a visual timeline in the dashboard
 *   2. Applied to a *different* target video via `edit-transfer`
 *   3. Serialised and stored as a reusable "editing template"
 *
 * Everything is pure computation — no FFmpeg / I/O required.
 */

import type {
  FullVideoMetadata,
  ShotBoundary,
  VelocitySegment,
  JhatkaEvent,
  BeatEvent,
  RhythmRegion,
  ColorGradingResult,
  BlueprintEvent,
  BlueprintSegment,
  BlueprintStyleParams,
  BlueprintSummary,
  EditingBlueprint,
} from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

/** Max time delta (seconds) for two events to be considered beat-aligned */
const BEAT_ALIGNMENT_TOLERANCE_SEC = 0.12;

/** Minimum jhatka delta to qualify as a notable speed ramp event */
const JHATKA_MIN_DELTA = 0.3;

/** Minimum confidence on a cut to include in the blueprint */
const CUT_MIN_CONFIDENCE = 0.15;

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate an Editing Blueprint from fully-analysed video metadata.
 *
 * @param meta      - Complete `FullVideoMetadata` from the analysis pipeline
 * @param filename  - Original video filename (for labelling)
 * @returns A self-contained `EditingBlueprint`
 */
export function analyzeEditingPattern(
  meta: FullVideoMetadata,
  filename = "video.mp4",
): EditingBlueprint {
  const t0 = performance.now();

  // ── 1.  Build event timeline ────────────────────────────────────────
  const events: BlueprintEvent[] = [];

  // 1a.  Cut events (from shot detection)
  events.push(...buildCutEvents(meta.shotDetection.cuts));

  // 1b.  Speed-ramp events (from velocity segments + jhatkas)
  events.push(...buildSpeedRampEvents(meta.motion.velocitySegments));
  events.push(...buildJhatkaEvents(meta.motion.jhatkas));

  // 1c.  Beat-aligned transition events (correlate beats with cuts/jhatkas)
  events.push(
    ...buildBeatAlignedEvents(
      meta.audio.beatEvents,
      meta.shotDetection.cuts,
      meta.motion.jhatkas,
    ),
  );

  // 1d.  Rhythm-shift events (from rhythm region boundaries)
  events.push(...buildRhythmShiftEvents(meta.audio.rhythmRegions));

  // 1e.  Style keyframe events (one at t=0 for the global grade)
  events.push(buildStyleKeyframe(meta.colorGrading, 0));

  // Sort chronologically, then by kind as tiebreaker
  events.sort(
    (a, b) => a.time_sec - b.time_sec || a.kind.localeCompare(b.kind),
  );

  // ── 2.  Build uniform-style segments ────────────────────────────────
  const segments = buildSegments(meta);

  // ── 3.  Summary statistics ──────────────────────────────────────────
  const summary = buildSummary(meta, events);

  const processingMs = Math.round(performance.now() - t0);

  return {
    blueprintId: `bp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    sourceFilename: filename,
    generatedAt: new Date().toISOString(),
    timeline: events,
    segments,
    summary,
    rawMetadata: meta,
    processingMs,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Event Builders
// ─────────────────────────────────────────────────────────────────────────────

/** Convert shot boundaries → BlueprintEvent[] */
function buildCutEvents(cuts: ShotBoundary[]): BlueprintEvent[] {
  return cuts
    .filter((c) => c.confidence >= CUT_MIN_CONFIDENCE)
    .map((cut) => ({
      time_sec: cut.timestamp_sec,
      duration_sec: 0,
      kind: "cut" as const,
      confidence: cut.confidence,
      description:
        cut.type === "hard_cut"
          ? `Hard cut (conf ${(cut.confidence * 100).toFixed(0)}%)`
          : `Gradual transition (conf ${(cut.confidence * 100).toFixed(0)}%)`,
      source: "shot" as const,
      params: {
        cutType: cut.type,
        histScore: round3(cut.hist_score),
        ecrScore: round3(cut.ecr_score),
        tdScore: round3(cut.td_score),
      },
    }));
}

/** Convert velocity segments → speed-ramp events for non-normal segments */
function buildSpeedRampEvents(segments: VelocitySegment[]): BlueprintEvent[] {
  return segments
    .filter((s) => s.label !== "normal")
    .map((seg) => ({
      time_sec: seg.start_sec,
      duration_sec: seg.end_sec - seg.start_sec,
      kind: "speed_ramp" as const,
      confidence: Math.min(1, Math.abs(seg.relative_speed - 1) / 2),
      description: `${capitalize(seg.label)} segment: ${seg.relative_speed.toFixed(2)}× for ${(seg.end_sec - seg.start_sec).toFixed(2)}s`,
      source: "motion" as const,
      params: {
        speed: seg.relative_speed,
        label: seg.label,
        startSec: seg.start_sec,
        endSec: seg.end_sec,
      },
    }));
}

/** Convert jhatkas → instantaneous speed-change events */
function buildJhatkaEvents(jhatkas: JhatkaEvent[]): BlueprintEvent[] {
  return jhatkas
    .filter((j) => j.delta >= JHATKA_MIN_DELTA)
    .map((j) => ({
      time_sec: j.timestamp_sec,
      duration_sec: 0,
      kind: "jhatka" as const,
      confidence: Math.min(1, j.delta / 2),
      description: `Speed ${j.direction}: ${j.speed_before.toFixed(2)}× → ${j.speed_after.toFixed(2)}× (Δ${j.delta.toFixed(2)})`,
      source: "motion" as const,
      params: {
        direction: j.direction,
        speedBefore: j.speed_before,
        speedAfter: j.speed_after,
        delta: j.delta,
      },
    }));
}

/**
 * Correlate beat events with cut boundaries and jhatka events.
 *
 * A beat is "aligned" if it falls within ±BEAT_ALIGNMENT_TOLERANCE_SEC
 * of a cut or jhatka timestamp. This detects intentional beat-synchronised
 * editing (e.g. cuts on the beat, speed changes on the beat).
 */
function buildBeatAlignedEvents(
  beats: BeatEvent[],
  cuts: ShotBoundary[],
  jhatkas: JhatkaEvent[],
): BlueprintEvent[] {
  const events: BlueprintEvent[] = [];

  // Pre-index cut + jhatka times for fast lookup
  const editTimes = [
    ...cuts.map((c) => ({ t: c.timestamp_sec, kind: "cut" as const })),
    ...jhatkas.map((j) => ({ t: j.timestamp_sec, kind: "jhatka" as const })),
  ].sort((a, b) => a.t - b.t);

  for (const beat of beats) {
    // Find the nearest edit event to this beat
    const nearest = findNearest(
      editTimes.map((e) => e.t),
      beat.timestamp_sec,
    );

    if (nearest === null) continue;

    const delta = Math.abs(editTimes[nearest.index].t - beat.timestamp_sec);
    if (delta > BEAT_ALIGNMENT_TOLERANCE_SEC) continue;

    const alignedWith = editTimes[nearest.index].kind;

    events.push({
      time_sec: beat.timestamp_sec,
      duration_sec: 0,
      kind: "beat_transition",
      confidence: beat.intensity * (1 - delta / BEAT_ALIGNMENT_TOLERANCE_SEC),
      description: `Beat-aligned ${alignedWith} (${beat.band} band, intensity ${(beat.intensity * 100).toFixed(0)}%, Δ${(delta * 1000).toFixed(0)}ms)`,
      source: "fused",
      params: {
        beatIntensity: beat.intensity,
        beatBand: beat.band,
        alignedWith,
        alignmentDeltaMs: round3(delta * 1000),
        beatFlux: round3(beat.flux),
      },
    });
  }

  return events;
}

/** Build rhythm-shift events at rhythm-region boundaries. */
function buildRhythmShiftEvents(regions: RhythmRegion[]): BlueprintEvent[] {
  if (regions.length <= 1) return [];

  const events: BlueprintEvent[] = [];
  for (let i = 1; i < regions.length; i++) {
    const prev = regions[i - 1];
    const curr = regions[i];

    // Only emit when energy changes
    if (prev.energyLabel === curr.energyLabel) continue;

    events.push({
      time_sec: curr.start_sec,
      duration_sec: 0,
      kind: "rhythm_shift",
      confidence: Math.abs(curr.avgIntensity - prev.avgIntensity),
      description: `Rhythm shift: ${prev.energyLabel} → ${curr.energyLabel} (${prev.localBpm.toFixed(0)} → ${curr.localBpm.toFixed(0)} BPM)`,
      source: "audio",
      params: {
        fromEnergy: prev.energyLabel,
        toEnergy: curr.energyLabel,
        fromBpm: prev.localBpm,
        toBpm: curr.localBpm,
      },
    });
  }

  return events;
}

/** Create a style keyframe event for the global colour grade. */
function buildStyleKeyframe(
  cg: ColorGradingResult,
  timeSec: number,
): BlueprintEvent {
  return {
    time_sec: timeSec,
    duration_sec: 0,
    kind: "style_keyframe",
    confidence: 1.0,
    description: `Style: ${cg.colorProfile} / ${cg.colorMood} (brightness ${cg.brightness.toFixed(2)}, sat ${cg.saturation.toFixed(2)}, contrast ${cg.contrast.toFixed(2)})`,
    source: "style",
    params: {
      brightness: cg.brightness,
      contrast: cg.contrast,
      saturation: cg.saturation,
      sharpness: cg.sharpness,
      vignette: cg.vignette,
      colorProfile: cg.colorProfile,
      colorMood: cg.colorMood,
      grainLabel: cg.grainLabel,
      lensBlurLabel: cg.lensBlurLabel,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Segment Builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build non-overlapping timeline segments, each with:
 *   - speed (from velocity segments)
 *   - rhythm energy (from rhythm regions)
 *   - beat-alignment flag (is there a beat within tolerance of segment start?)
 *   - style params (from global colour grade)
 *
 * Strategy: merge breakpoints from velocity segments + rhythm regions,
 * then slice the timeline at each breakpoint.
 */
function buildSegments(meta: FullVideoMetadata): BlueprintSegment[] {
  const dur = meta.duration;
  if (dur <= 0) return [];

  // Collect all unique breakpoints
  const bpSet = new Set<number>();
  bpSet.add(0);
  bpSet.add(dur);

  for (const vs of meta.motion.velocitySegments) {
    bpSet.add(vs.start_sec);
    bpSet.add(vs.end_sec);
  }
  for (const rr of meta.audio.rhythmRegions) {
    bpSet.add(rr.start_sec);
    bpSet.add(rr.end_sec);
  }

  const breakpoints = [...bpSet].sort((a, b) => a - b);

  // Beat times sorted for fast alignment check
  const beatTimes = meta.audio.beatEvents.map((b) => b.timestamp_sec).sort((a, b) => a - b);

  const style = extractStyleParams(meta.colorGrading);
  const segments: BlueprintSegment[] = [];

  for (let i = 0; i < breakpoints.length - 1; i++) {
    const start = breakpoints[i];
    const end = breakpoints[i + 1];
    if (end - start < 0.001) continue; // skip degenerate

    const midpoint = (start + end) / 2;

    // Find the velocity segment covering this midpoint
    const vel = findCoveringVelocitySegment(
      meta.motion.velocitySegments,
      midpoint,
    );

    // Find the rhythm region covering this midpoint
    const rhythm = findCoveringRhythmRegion(
      meta.audio.rhythmRegions,
      midpoint,
    );

    // Check if a beat aligns with segment start
    const beatAligned = isNearBeat(beatTimes, start, BEAT_ALIGNMENT_TOLERANCE_SEC);

    segments.push({
      start_sec: round3(start),
      end_sec: round3(end),
      speed: vel?.relative_speed ?? 1.0,
      speedLabel: vel?.label ?? "normal",
      rhythmEnergy: rhythm?.energyLabel ?? "silent",
      beatAligned,
      style,
    });
  }

  return segments;
}

/** Extract a BlueprintStyleParams from the global ColorGradingResult. */
function extractStyleParams(cg: ColorGradingResult): BlueprintStyleParams {
  return {
    brightness: cg.brightness,
    contrast: cg.contrast,
    saturation: cg.saturation,
    sharpness: cg.sharpness,
    vignette: cg.vignette,
    colorMood: cg.colorMood,
    colorProfile: cg.colorProfile,
    grainLabel: cg.grainLabel,
    eqParams: cg.eqParams,
    colorbalanceParams: cg.colorbalanceParams,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary Builder
// ─────────────────────────────────────────────────────────────────────────────

function buildSummary(
  meta: FullVideoMetadata,
  events: BlueprintEvent[],
): BlueprintSummary {
  return {
    totalDuration: meta.duration,
    totalCuts: events.filter((e) => e.kind === "cut").length,
    totalSpeedRamps: events.filter((e) => e.kind === "speed_ramp").length,
    totalBeatTransitions: events.filter((e) => e.kind === "beat_transition")
      .length,
    totalJhatkas: events.filter((e) => e.kind === "jhatka").length,
    avgShotDuration: meta.shotDetection.avgShotDurationSec,
    dominantPace: meta.shotDetection.editingPace,
    dominantMotionStyle: meta.motion.motionStyle,
    bpm: meta.audio.bpm,
    bpmConfidence: meta.audio.bpmConfidence,
    timeSignature: meta.audio.timeSignatureGuess,
    dominantColorMood: meta.colorGrading.colorMood,
    dominantColorProfile: meta.colorGrading.colorProfile,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

/** Binary-search nearest value in a sorted number array. */
function findNearest(
  sorted: number[],
  target: number,
): { index: number; value: number } | null {
  if (sorted.length === 0) return null;

  let lo = 0;
  let hi = sorted.length - 1;

  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] < target) lo = mid + 1;
    else hi = mid;
  }

  // Check lo and lo-1 for closest
  let best = lo;
  if (
    lo > 0 &&
    Math.abs(sorted[lo - 1] - target) < Math.abs(sorted[lo] - target)
  ) {
    best = lo - 1;
  }

  return { index: best, value: sorted[best] };
}

/** Find the velocity segment whose range covers the given time. */
function findCoveringVelocitySegment(
  segments: VelocitySegment[],
  t: number,
): VelocitySegment | undefined {
  return segments.find((s) => t >= s.start_sec && t < s.end_sec);
}

/** Find the rhythm region whose range covers the given time. */
function findCoveringRhythmRegion(
  regions: RhythmRegion[],
  t: number,
): RhythmRegion | undefined {
  return regions.find((r) => t >= r.start_sec && t < r.end_sec);
}

/** Check if any beat falls within ±tolerance of a given timestamp. */
function isNearBeat(
  beatTimes: number[],
  t: number,
  tolerance: number,
): boolean {
  const nearest = findNearest(beatTimes, t);
  if (!nearest) return false;
  return Math.abs(nearest.value - t) <= tolerance;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
