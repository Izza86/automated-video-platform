/**
 * StyleDNA Adapter — Semantic Style Mapping Engine
 *
 * Maps a reference StyleDNA onto a target video's content context,
 * producing an AdaptedStyleDNA where every timestamp is an absolute
 * position on the TARGET timeline and every intensity is semantically
 * scaled to the TARGET's own content energy.
 *
 * ─────────────────────────────────────────────────────────────────────
 * THE SEMANTIC PRINCIPLE
 * ─────────────────────────────────────────────────────────────────────
 *
 * Proportional (old approach — AVOIDED):
 *   "Apply blur at ref timestamp × (targetDuration / refDuration)"
 *   → Wrong: ref's blur at 3.2 s (a fast whip) maps to target's
 *     quiet static section at 4.8 s.
 *
 * Semantic (new approach — THIS MODULE):
 *   "Apply blur at the target's highest-motion timestamp"
 *   → Correct: ref had blur during motion → target gets blur during ITS
 *     own motion peak, wherever that falls.
 *
 * ─────────────────────────────────────────────────────────────────────
 * DOMAIN-BY-DOMAIN SEMANTIC RULES
 * ─────────────────────────────────────────────────────────────────────
 *
 * PACING:
 *   • Cut count = cutDensity × targetDuration (density-preserved)
 *   • Candidates: target beat onsets (scored by intensity) + jhatka events
 *   • Selection: top-N by score with minGap = avgShotLen × 0.4
 *   • If syncStrength > 0.6: snap selected cuts to nearest beat (±120ms)
 *
 * MOTION:
 *   • Setpts: built from TARGET's own velocityTimeline, scaled by the
 *     reference's cameraEnergy (energy ratio = ref/target intensity)
 *   • Jitter: K hardest beats in target timeline (K = ref hard beat count)
 *     with reference beat's intensity determining the shake magnitude
 *
 * COLOR:
 *   • CDF curves: timeless histogram transform — applied as-is from ref
 *   • Temporal evolution: ENERGY-LEVEL MATCHED, not proportional time.
 *     Beat intensity (proxy for visual energy) → find ref sample with
 *     matching brightness percentile → apply that sample's grade ratios.
 *
 * LIGHTING:
 *   • Flicker: content-independent sin() expression — inherited directly
 *     from reference variance, not re-proportioned.
 *   • Halation/vignette: content-independent global effects.
 *
 * RHYTHM:
 *   • Beat pulses: mapped to TARGET's own beat grid (trivially correct)
 *   • Drop zones: target's K hardest beats (K = ref drop zone count)
 *     → same number of "climax" moments, but at target's real climaxes
 *
 * TEXTURE:
 *   • Blur: placed at target's motion peaks (velocity rank, not time rank)
 *   • Grain/sharpness: content-independent global properties
 */

import type { BeatEvent, TemporalColorSample } from "../types";
import type {
  StyleDNA,
  TargetContentContext,
  AdaptedStyleDNA,
} from "../types/style-dna";

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Semantically adapt a reference StyleDNA to target content.
 *
 * All timestamps in the returned AdaptedStyleDNA are on the TARGET timeline.
 * Intensities are semantically matched by energy rank, not proportional time.
 *
 * @param dna   Reference video's StyleDNA (from extractStyleDNA)
 * @param ctx   Target video's content context (beats, shots, motion)
 */
export function adaptToTargetContent(
  dna: StyleDNA,
  ctx: TargetContentContext,
): AdaptedStyleDNA {
  return {
    source: dna,
    target: ctx,
    pacing: adaptPacing(dna, ctx),
    motion: adaptMotion(dna, ctx),
    color: adaptColor(dna, ctx),
    lighting: adaptLighting(dna, ctx),
    rhythm: adaptRhythm(dna, ctx),
    texture: adaptTexture(dna, ctx),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Pacing Adaptation
// ─────────────────────────────────────────────────────────────────────────────

function adaptPacing(
  dna: StyleDNA,
  ctx: TargetContentContext,
): AdaptedStyleDNA["pacing"] {
  const { duration } = ctx;
  const { pacing } = dna;

  // How many cuts in the target?  Same density × target duration.
  const targetCutCount = Math.max(0, Math.round(pacing.cutDensity * duration));

  // ── Build cut candidates from target context ─────────────────────────
  const candidates: Array<{ time: number; score: number }> = [];

  // Beat onsets — scored by intensity (strong beats = better cut points)
  for (const beat of ctx.beatEvents) {
    const t = beat.timestamp_sec;
    if (t > 0.2 && t < duration - 0.2) {
      candidates.push({ time: t, score: beat.intensity });
    }
  }

  // Jhatka events — abrupt speed changes are natural cut anchors
  for (const jhatka of ctx.motionData.jhatkas ?? []) {
    const t = jhatka.timestamp_sec;
    if (t > 0.2 && t < duration - 0.2) {
      // delta magnitude (0.3 → score 0.45) — slightly lower priority than beats
      candidates.push({ time: t, score: Math.min(0.9, jhatka.delta * 0.45) });
    }
  }

  // Shot boundaries in target context (already on target timeline)
  for (const shot of ctx.shotBoundaries) {
    if (shot.type === "hard_cut") {
      const t = shot.timestamp_sec;
      if (t > 0.2 && t < duration - 0.2) {
        candidates.push({ time: t, score: shot.confidence * 0.8 });
      }
    }
  }

  // ── Select top-N candidates by score with minimum spacing ───────────
  const minGap = Math.max(0.5, pacing.avgShotLen * 0.4);
  let cutTimestamps = selectTopCandidates(candidates, targetCutCount, minGap);

  // ── Snap to nearest beat if the reference was beat-aligned ──────────
  if (pacing.tempoAlignment > 0.6 && ctx.beatEvents.length > 0) {
    cutTimestamps = cutTimestamps.map((t) => {
      const snap = findNearestBeat(t, ctx.beatEvents, 0.12);
      return snap ?? t;
    });
    cutTimestamps.sort((a, b) => a - b);
  }

  // ── Gradual transitions: place at nearest target shot boundary ───────
  // If no target shot boundaries exist, fall back to proportional time.
  const gradualTransitions = pacing.gradualTransitions.map((gt) => {
    const proportionalTime = (gt.refTime / dna.sourceDuration) * duration;

    // Prefer a nearby gradual-transition boundary in the target
    const nearestGradual = ctx.shotBoundaries
      .filter((s) => s.type === "gradual_transition")
      .reduce(
        (best, s) => {
          const dist = Math.abs(s.timestamp_sec - proportionalTime);
          return dist < best.dist ? { time: s.timestamp_sec, dist } : best;
        },
        { time: proportionalTime, dist: Infinity },
      );

    return {
      time: nearestGradual.time,
      subtype: gt.subtype,
      duration: gt.duration,
      tdScore: gt.tdScore,
      histScore: gt.histScore,
    };
  });

  return { cutTimestamps, gradualTransitions };
}

// ─────────────────────────────────────────────────────────────────────────────
// Motion Adaptation
// ─────────────────────────────────────────────────────────────────────────────

function adaptMotion(
  dna: StyleDNA,
  ctx: TargetContentContext,
): AdaptedStyleDNA["motion"] {
  const { duration } = ctx;
  const { motion, rhythm } = dna;

  // ── Setpts: semantic — use TARGET's velocity profile, scaled by ref energy ─
  // If the reference is more dynamic than the target, scale up the
  // target's speed deviations proportionally so the energy feel matches.
  let setptsExpr: string | null = null;
  const targetVtl = ctx.motionData.velocityTimeline ?? [];

  if (targetVtl.length >= 2) {
    const refEnergy = motion.cameraEnergy;
    const targetEnergy = ctx.motionData.motionIntensity;
    // energyRatio: how much MORE dynamic the ref is vs the target
    // clamped to avoid extreme scaling (0.1× – 3×)
    const energyRatio = Math.max(0.1, Math.min(3.0, targetEnergy > 0 ? refEnergy / targetEnergy : 1.0));
    setptsExpr = buildSemanticSetpts(targetVtl, duration, energyRatio);
  }
  // If target has no velocity timeline, setptsExpr=null → generator
  // falls back to the reference velocity timeline (proportional).

  // ── Jitter: semantic — map to TARGET's K hardest beats ───────────────
  // K = number of hard beats in the reference that had intensity > 0.4
  const refHardBeats = rhythm.beatEvents.filter((b) => b.intensity > 0.4);
  const K = refHardBeats.length;

  // Sort ref jitter beats by intensity (strongest first) for rank-matching
  const sortedRefBeats = [...refHardBeats].sort((a, b) => b.intensity - a.intensity);

  // Find the K hardest beats in the target timeline
  const sortedTargetBeats = [...ctx.beatEvents]
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, K);

  const jitterEvents = sortedTargetBeats
    .map((targetBeat, i) => {
      // Inherit the shake magnitude from the reference's ranked beat
      const refBeat = sortedRefBeats[i] ?? targetBeat;
      const t = targetBeat.timestamp_sec;
      const tEnd = Math.min(duration, t + 0.08);
      // v11 formula: rotAngle = intensity × 0.0375 (×1.5 boost vs v10)
      return {
        time: t,
        endTime: tEnd,
        rotAngle: refBeat.intensity * 0.0375,
        scaleAmount: 1.0 + refBeat.intensity * 0.045,
      };
    })
    .filter((e) => e.time >= 0 && e.time < duration - 0.05)
    .sort((a, b) => a.time - b.time);

  return {
    setptsExpr,
    // Prompt 5: depth-aware zoom direction / parallax pan
    zoomExpr: buildDepthAwareZoomExpr(dna, ctx),
    jitterEvents,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Color Adaptation
// ─────────────────────────────────────────────────────────────────────────────

function adaptColor(
  dna: StyleDNA,
  ctx: TargetContentContext,
): AdaptedStyleDNA["color"] {
  const { color } = dna;

  const moodGradeSegments = buildTargetMoodSegments(
    color.moodSegments,
    ctx.duration,
    dna.sourceDuration,
  );

  // ── CDF curves: timeless histogram transform ─────────────────────────
  const curvesFilter = moodGradeSegments.length > 0
    ? null
    : color.histogramCdf
    ? buildCDFCurvesFilter(color.histogramCdf)
    : null;

  // ── Temporal sendcmd: SEMANTIC energy-level matching ─────────────────
  // High-energy reference samples → target's high-energy beat regions.
  // This prevents applying moody dark grades to the target's most
  // energetic moments just because time-stamps happen to align.
  const temporalSendcmd = buildSemanticTemporalSendcmd(
    color.temporalColorEvolution,
    ctx.beatEvents,
    ctx.duration,
    dna.sourceDuration,
  );

  // HALD: applied whenever we have CDF data for deep colour matching
  const applyHald = moodGradeSegments.length > 0 ? false : !!color.histogramCdf;

  // Fallback filters (used when CDF + HALD are both absent)
  const fallbackColorFilters: string[] = [];
  if (color.colorchannelmixerParams) {
    fallbackColorFilters.push(`colorchannelmixer=${color.colorchannelmixerParams}`);
  }
  if (color.colorbalanceParams) {
    fallbackColorFilters.push(`colorbalance=${color.colorbalanceParams}`);
  }

  return { curvesFilter, temporalSendcmd, applyHald, fallbackColorFilters, moodGradeSegments };
}

// ─────────────────────────────────────────────────────────────────────────────
// Lighting Adaptation
// ─────────────────────────────────────────────────────────────────────────────

function adaptLighting(dna: StyleDNA, ctx: TargetContentContext): AdaptedStyleDNA["lighting"] {
  const { lighting } = dna;

  // ── Flicker: content-independent sin() expression ───────────────────
  // These parameters are derived from the reference's luma variance —
  // they describe HOW MUCH the reference flickers, not WHEN.
  // Applying the same expression to any target duration is semantically
  // correct: the oscillation rate and amplitude are properties of the
  // reference's aesthetic, not its specific timeline.
  const flickerExpr = "0";

  const exposureEvents = lighting.exposureCurvePoints
    .map((p, i) => {
      const t = (p.refTime / Math.max(dna.sourceDuration, 0.001)) * ctx.duration;
      const drift = (Math.sin((i + 1) * 2.17) + Math.cos((i + 1) * 1.13)) * 0.5;
      const jitter = drift * lighting.stochasticJitter;
      const base = p.brightness - 0.5;
      const withInertia = base * (1 - (1 - lighting.exposureInertia) * 0.7);
      return {
        time: Math.max(0, Math.min(ctx.duration, t)),
        brightness: Math.max(-0.2, Math.min(0.2, withInertia + jitter)),
      };
    })
    .filter((e) => e.time < ctx.duration - 0.02)
    .sort((a, b) => a.time - b.time);

  // ── Halation: content-independent highlight glow ─────────────────────
  let halationFilter: string | null = null;
  if (lighting.halationIntensity > 0.1) {
    const liftAmount = lighting.halationIntensity * 0.15;
    const highlightTarget = (0.75 + liftAmount).toFixed(3);
    halationFilter = `curves=master='0/0 0.5/0.5 0.75/${highlightTarget} 1/1'`;
  }

  // ── Vignette: content-independent frame darkening ────────────────────
  let vignetteAngle: number | null = null;
  if (lighting.vignetteStrength > 0) {
    vignetteAngle = Math.max(0.01, (Math.PI / 2) * (1 - lighting.vignetteStrength));
  }

  return { flickerExpr, exposureEvents, halationFilter, vignetteAngle };
}

// ─────────────────────────────────────────────────────────────────────────────
// Rhythm Adaptation
// ─────────────────────────────────────────────────────────────────────────────

function adaptRhythm(
  dna: StyleDNA,
  ctx: TargetContentContext,
): AdaptedStyleDNA["rhythm"] {
  const { duration } = ctx;
  const { rhythm } = dna;

  // ── Beat pulses: map to TARGET's own beat grid ────────────────────────
  // Beat pulses are the most content-independent effect: every beat in
  // the target gets a brightness/contrast flash proportional to its own
  // intensity.  We inherit the reference's intensity-to-flash formula,
  // but apply it to the target's actual beat positions.
  const beatPulseEvents: AdaptedStyleDNA["rhythm"]["beatPulseEvents"] = [];

  const sortedTargetBeatsByIntensity = [...ctx.beatEvents].sort((a, b) => b.intensity - a.intensity);
  const classified = rhythm.classifiedBeats ?? [];
  const beatResponseEvents = classified
    .map((c, i) => {
      const tBeat = sortedTargetBeatsByIntensity[i % Math.max(1, sortedTargetBeatsByIntensity.length)];
      if (!tBeat) return null;
      const t = tBeat.timestamp_sec;
      const endTime = Math.min(duration, t + (c.class === "drop_moment" ? 0.14 : 0.08));

      if (c.class === "hard_kick") {
        return {
          time: t,
          endTime,
          kind: "zoom_punch" as const,
          brightness: 0,
          contrast: 1.04 + c.intensity * 0.08,
          zoom: 1.02 + c.intensity * 0.08,
          rotation: 0,
          velocityRamp: 1.0,
        };
      }

      if (c.class === "snare") {
        return {
          time: t,
          endTime,
          kind: "micro_shake" as const,
          brightness: 0,
          contrast: 1.02 + c.intensity * 0.05,
          zoom: 1.0,
          rotation: 0.006 + c.intensity * 0.02,
          velocityRamp: 1.0,
        };
      }

      if (c.class === "hi_hat") {
        return {
          time: t,
          endTime,
          kind: "light_flicker" as const,
          brightness: 0.01 + c.intensity * 0.03,
          contrast: 1.0,
          zoom: 1.0,
          rotation: 0,
          velocityRamp: 1.0,
        };
      }

      return {
        time: t,
        endTime,
        kind: "drop_combo" as const,
        brightness: 0.02 + c.intensity * 0.05,
        contrast: 1.1 + c.intensity * 0.18,
        zoom: 1.04 + c.intensity * 0.1,
        rotation: 0.01 + c.intensity * 0.02,
        velocityRamp: 1.05 + c.intensity * 0.25,
      };
    })
    .filter((e): e is NonNullable<typeof e> => !!e)
    .sort((a, b) => a.time - b.time);

  // ── Drop zones: semantic — target's K hardest beats ──────────────────
  // K = number of drop zones in the reference.
  // Instead of mapping by proportional time ("ref drop at 4.2 s → target 6.1 s"),
  // we ask "what are the K most energetic moments in the TARGET?"
  const K = rhythm.dropZones.length;
  const sortedRefDrops = [...rhythm.dropZones].sort((a, b) => b.intensity - a.intensity);
  const sortedTargetBeats = [...ctx.beatEvents].sort((a, b) => b.intensity - a.intensity);

  const dropZoneEvents = sortedTargetBeats.slice(0, K).map((beat, i) => ({
    time: beat.timestamp_sec,
    intensity: sortedRefDrops[i]?.intensity ?? beat.intensity,
  })).sort((a, b) => a.time - b.time);

  return { beatPulseEvents, beatResponseEvents, dropZoneEvents };
}

function buildTargetMoodSegments(
  segments: StyleDNA["color"]["moodSegments"],
  targetDuration: number,
  sourceDuration: number,
): AdaptedStyleDNA["color"]["moodGradeSegments"] {
  if (!segments || segments.length === 0) return [];

  let cursor = 0;
  const mapped: AdaptedStyleDNA["color"]["moodGradeSegments"] = [];
  for (const seg of segments) {
    const ratio = Math.max(0.01, (seg.end_sec - seg.start_sec) / Math.max(sourceDuration, 0.001));
    const dur = ratio * targetDuration;
    const start = cursor;
    const end = Math.min(targetDuration, start + dur);
    cursor = end;

    const brightness = Math.max(-0.12, Math.min(0.12, (seg.labMean.l - 50) / 120));
    const contrast = Math.max(0.82, Math.min(1.28, 0.9 + seg.contrastMean * 0.2));
    const saturation = Math.max(0.72, Math.min(1.38, 0.9 + Math.sqrt(Math.max(0, seg.saturationVariance)) * 0.7));
    const lutStrength = Math.max(0.2, Math.min(1.0, 0.5 + seg.saturationVariance * 1.2));

    mapped.push({ start, end, brightness, contrast, saturation, lutStrength });
  }

  if (mapped.length > 0) {
    mapped[mapped.length - 1].end = targetDuration;
  }
  return mapped.filter((m) => m.end - m.start > 0.01);
}

function buildDepthAwareZoomExpr(dna: StyleDNA, ctx: TargetContentContext): string | null {
  const fps = 30;
  const frames = Math.max(1, Math.round(ctx.duration * fps));
  const avgDepth = ctx.depthData?.avgMeanDepth ?? 0.5;
  const parallax = Math.max(0, Math.min(1, dna.motion.parallaxStrength));

  if (avgDepth < 0.45) {
    // Foreground-dominant: push-in zoom
    const maxZoom = Math.max(1.02, Math.min(1.22, 1 + 0.06 + dna.motion.cameraEnergy * 0.14));
    const rate = (maxZoom - 1) / frames;
    return `zoompan=z='min(1+${rate.toFixed(7)}*on,${maxZoom.toFixed(4)})':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${ctx.width}x${ctx.height}:fps=${fps}`;
  }

  // Background/deep scene: parallax pan with subtle zoom
  const ampX = Math.max(4, Math.round(ctx.width * 0.012 * Math.max(0.25, parallax)));
  const ampY = Math.max(3, Math.round(ctx.height * 0.009 * Math.max(0.25, parallax)));
  const biasX = dna.motion.motionDirectionBias.x >= 0 ? 1 : -1;
  const biasY = dna.motion.motionDirectionBias.y >= 0 ? 1 : -1;
  return `zoompan=z='1.02+0.01*sin(on/${(fps * 1.8).toFixed(2)})':d=1:x='iw/2-(iw/zoom/2)+${biasX * ampX}*sin(on/${(fps * 1.6).toFixed(2)})':y='ih/2-(ih/zoom/2)+${biasY * ampY}*cos(on/${(fps * 2.2).toFixed(2)})':s=${ctx.width}x${ctx.height}:fps=${fps}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Texture Adaptation
// ─────────────────────────────────────────────────────────────────────────────

function adaptTexture(
  dna: StyleDNA,
  ctx: TargetContentContext,
): AdaptedStyleDNA["texture"] {
  const { duration } = ctx;
  const { texture } = dna;

  // ── Grain: content-independent global property ────────────────────────
  const grainFilter =
    texture.grainProfile.strength >= 3
      ? `noise=c0s=${texture.grainProfile.strength}:c0f=t`
      : null;

  // ── Sharpness: content-independent global property ────────────────────
  const sharpnessFilter = `unsharp=3:3:${texture.sharpnessProfile.toFixed(1)}:3:3:0.0`;

  // ── Blur: SEMANTIC — placed at target's motion peaks ──────────────────
  const blurEvents = buildSemanticBlurEvents(texture.blurPattern, ctx, duration);

  return { grainFilter, sharpnessFilter, blurEvents };
}

// ─────────────────────────────────────────────────────────────────────────────
// Semantic Algorithm Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Select the top `count` candidates by score, enforcing `minGap` seconds
 * between any two selected points.
 *
 * Algorithm: greedy selection — sort by score descending, then accept each
 * candidate only if it's ≥ minGap from all already-selected points.
 */
function selectTopCandidates(
  candidates: Array<{ time: number; score: number }>,
  count: number,
  minGap: number,
): number[] {
  if (count <= 0 || candidates.length === 0) return [];

  const byScore = [...candidates].sort((a, b) => b.score - a.score);
  const selected: number[] = [];

  for (const c of byScore) {
    if (selected.length >= count) break;
    const tooClose = selected.some((t) => Math.abs(t - c.time) < minGap);
    if (!tooClose) selected.push(c.time);
  }

  return selected.sort((a, b) => a - b);
}

/** Find the nearest beat timestamp to `time`, within `maxDelta` seconds. */
function findNearestBeat(
  time: number,
  beats: BeatEvent[],
  maxDelta: number,
): number | null {
  let best: number | null = null;
  let bestDist = maxDelta;
  for (const b of beats) {
    const dist = Math.abs(b.timestamp_sec - time);
    if (dist < bestDist) {
      bestDist = dist;
      best = b.timestamp_sec;
    }
  }
  return best;
}

/**
 * Build the FFmpeg curves filter string from a per-channel CDF.
 *
 * Samples the CDF at 32 points (step=8) and builds a master + r/g/b
 * curves filter for statistical colour matching.
 * This is TIMELESS — no timeline mapping needed, just histogram maths.
 */
function buildCDFCurvesFilter(cdf: { r: number[]; g: number[]; b: number[] }): string {
  const buildChannelCurve = (cdfArr: number[]): string => {
    const points: string[] = [];
    for (let i = 0; i <= 255; i += 8) {
      const inVal = (Math.min(255, i) / 255).toFixed(4);
      const outVal = Math.max(0, Math.min(1, cdfArr[Math.min(255, i)])).toFixed(4);
      points.push(`${inVal}/${outVal}`);
    }
    // Always include the 1.0 endpoint
    points.push(`1/${Math.max(0, Math.min(1, cdfArr[255])).toFixed(4)}`);
    return points.join(" ");
  };

  const masterCdf = cdf.r.map((r, i) => (r + cdf.g[i] + cdf.b[i]) / 3);
  const masterCurve = buildChannelCurve(masterCdf);
  const rCurve = buildChannelCurve(cdf.r);
  const gCurve = buildChannelCurve(cdf.g);
  const bCurve = buildChannelCurve(cdf.b);

  return `curves=master='${masterCurve}':r='${rCurve}':g='${gCurve}':b='${bCurve}'`;
}

/**
 * Build semantic temporal color sendcmd events.
 *
 * SEMANTIC MAPPING: Match reference color samples to target beat positions
 * by ENERGY LEVEL, not by proportional time.
 *
 * Algorithm:
 * 1. Compute each reference sample's brightness percentile rank (0–1).
 * 2. For each target beat, treat beat.intensity as a visual energy proxy.
 * 3. Find the reference sample whose brightness percentile is closest to
 *    the beat's intensity rank.
 * 4. Apply that sample's contrast/saturation ratios at the beat timestamp.
 *
 * This means: a dark reference sample (low brightness percentile) gets
 * applied to the target's QUIET beats (low intensity), not to whatever
 * moment happens to be proportionally aligned.
 *
 * Fallback: if no beats available, use proportional time mapping.
 */
function buildSemanticTemporalSendcmd(
  refSamples: TemporalColorSample[],
  targetBeats: BeatEvent[],
  targetDuration: number,
  refDuration: number,
): Array<{ time: number; contrastRatio: number; saturationRatio: number }> {
  if (refSamples.length < 2) return [];

  const refMeanContrast =
    refSamples.reduce((s, t) => s + t.contrast, 0) / refSamples.length || 1;
  const refMeanSaturation =
    refSamples.reduce((s, t) => s + t.saturation, 0) / refSamples.length || 1;

  // ── Build brightness percentile rank for each reference sample ───────
  const sortedBrightness = [...refSamples.map((s) => s.brightness)].sort((a, b) => a - b);

  const getPercentileRank = (brightness: number): number => {
    const idx = sortedBrightness.findIndex((b) => b >= brightness);
    return idx < 0 ? 1 : idx / (sortedBrightness.length - 1 || 1);
  };

  const refWithRank = refSamples.map((s) => ({
    ...s,
    energyRank: getPercentileRank(s.brightness),
  }));

  const result: Array<{ time: number; contrastRatio: number; saturationRatio: number }> = [];
  const activeBeats = targetBeats.filter((b) => b.timestamp_sec < targetDuration - 0.05);

  if (activeBeats.length > 0) {
    // ── Semantic path: energy-level matched ────────────────────────────
    for (const beat of activeBeats) {
      // beat.intensity (0–1) is our proxy for visual energy rank
      const beatRank = beat.intensity;

      // Find the reference sample with the closest energy rank
      let closest = refWithRank[0];
      let closestDist = Math.abs(refWithRank[0].energyRank - beatRank);
      for (const ref of refWithRank) {
        const dist = Math.abs(ref.energyRank - beatRank);
        if (dist < closestDist) {
          closestDist = dist;
          closest = ref;
        }
      }

      result.push({
        time: beat.timestamp_sec,
        contrastRatio: closest.contrast / refMeanContrast,
        saturationRatio: closest.saturation / refMeanSaturation,
      });
    }
  } else {
    // ── Proportional fallback: no beat data in target ─────────────────
    for (const sample of refSamples) {
      const targetTime = Math.max(
        0,
        (sample.time_sec / Math.max(refDuration, 0.001)) * targetDuration,
      );
      result.push({
        time: targetTime,
        contrastRatio: sample.contrast / refMeanContrast,
        saturationRatio: sample.saturation / refMeanSaturation,
      });
    }
  }

  // De-duplicate by rounding to 3 decimal places — keep last entry per key
  const deduped = new Map<number, { time: number; contrastRatio: number; saturationRatio: number }>();
  for (const entry of result) {
    const key = parseFloat(entry.time.toFixed(3));
    deduped.set(key, { ...entry, time: key });
  }

  return Array.from(deduped.values()).sort((a, b) => a.time - b.time);
}

/**
 * Build semantic blur events for the target timeline.
 *
 * SEMANTIC MAPPING: Place blur events at target's highest-motion timestamps
 * (velocity peaks), ranked to match the reference's blur intensity distribution.
 *
 * The reference's blur RADIUS profile is preserved: if ref had heavy blur
 * (radius 5) during its fastest motion peak, the target gets radius 5 during
 * ITS fastest motion peak — regardless of when that peak occurs.
 *
 * Fallback: if target has no motion data, use proportional timestamp mapping
 * but still sort by blur intensity (most intense blurs applied first).
 */
function buildSemanticBlurEvents(
  blurPattern: StyleDNA["texture"]["blurPattern"],
  ctx: TargetContentContext,
  targetDuration: number,
): Array<{ time: number; radius: number }> {
  if (blurPattern.length === 0) return [];

  // Sort ref blur events by blurLevel descending (most intense first)
  const sortedRefBlur = [...blurPattern].sort((a, b) => b.blurLevel - a.blurLevel);

  // Find target motion peaks: velocity > 1.2× baseline
  const velocityTl = ctx.motionData.velocityTimeline ?? [];
  const motionPeaks = velocityTl
    .filter((v) => v.relative_speed > 1.2 && v.time_sec < targetDuration - 0.05)
    .sort((a, b) => b.relative_speed - a.relative_speed); // highest speed first

  const events: Array<{ time: number; radius: number }> = [];

  if (motionPeaks.length > 0) {
    // ── Semantic: map ref blur events → target motion peaks by rank ────
    const limit = Math.min(sortedRefBlur.length, motionPeaks.length);
    for (let i = 0; i < limit; i++) {
      events.push({
        time: motionPeaks[i].time_sec,
        radius: sortedRefBlur[i].radius,
      });
    }
  } else {
    // ── Fallback: proportional mapping (but still by blur intensity) ───
    for (const blur of sortedRefBlur) {
      const targetTime = Math.max(
        0,
        (blur.refTime / Math.max(ctx.motionData.peakMagnitude, 1)) * targetDuration,
      );
      if (targetTime < targetDuration - 0.05) {
        events.push({ time: targetTime, radius: blur.radius });
      }
    }
  }

  return events.sort((a, b) => a.time - b.time);
}

/**
 * Build a semantic setpts expression from the TARGET's own velocity timeline.
 *
 * Unlike the reference-proportional approach, this uses TARGET content:
 * - The speed SHAPE comes from the target's own motion profile
 * - The speed MAGNITUDE is scaled by the reference's cameraEnergy ratio
 *
 * If the reference was very dynamic (cameraEnergy=0.8) but the target is
 * static (motionIntensity=0.1), energyRatio = 8.0 would over-scale.
 * We clamp to 0.1–3.0 to stay in a reasonable cinematic range.
 */
function buildSemanticSetpts(
  velocityTimeline: Array<{ time_sec: number; relative_speed: number }>,
  targetDuration: number,
  energyRatio: number,
): string | null {
  if (velocityTimeline.length < 2) return null;

  const MAX_ITER = 50;
  const MIN_SPEED = 0.25;
  const MAX_SPEED = 4.0;

  // Scale the target's speed DEVIATIONS from 1.0 by energyRatio
  // velocity=1.5 with ratio=2.0 → 1.0 + (1.5-1.0)*2.0 = 2.0
  const scaledTimeline = velocityTimeline.map((v) => ({
    time_sec: v.time_sec,
    relative_speed: 1.0 + (v.relative_speed - 1.0) * energyRatio,
  }));

  interface Seg {
    inStart: number;
    inEnd: number;
    speed: number;
    outStart: number;
  }

  const resolved: Seg[] = [];
  let outCursor = 0;

  for (let i = 0; i < scaledTimeline.length - 1; i++) {
    const speed = Math.max(
      MIN_SPEED,
      Math.min(MAX_SPEED, scaledTimeline[i].relative_speed || 1.0),
    );
    const inStart = scaledTimeline[i].time_sec;
    const inEnd = scaledTimeline[i + 1].time_sec;
    const inDuration = inEnd - inStart;
    if (inDuration <= 0) continue;
    resolved.push({ inStart, inEnd, speed, outStart: outCursor });
    outCursor += inDuration / speed;
  }

  if (resolved.length === 0) return null;

  // Cap to MAX_ITER keyframes for FFmpeg expression parser safety
  let segs = resolved;
  if (segs.length > MAX_ITER) {
    const step = Math.ceil(segs.length / MAX_ITER);
    const decimated: Seg[] = [];
    let cursor = 0;
    for (let i = 0; i < segs.length; i += step) {
      const s = segs[i];
      const end = i + step < segs.length ? segs[i + step].inStart : targetDuration;
      decimated.push({ inStart: s.inStart, inEnd: end, speed: s.speed, outStart: cursor });
      cursor += (end - s.inStart) / s.speed;
    }
    segs = decimated;
  }

  // Build nested if(between(T,...)) expression
  let expr = "PTS";
  for (let i = segs.length - 1; i >= 0; i--) {
    const s = segs[i];
    const oS = s.outStart.toFixed(2);
    const iS = s.inStart.toFixed(2);
    const iE = s.inEnd.toFixed(2);
    const spd = s.speed.toFixed(2);
    const segExpr = `(${oS}+(T-${iS})/${spd})/TB`;
    expr = `if(between(T,${iS},${iE}),${segExpr},${expr})`;
  }

  return expr;
}
