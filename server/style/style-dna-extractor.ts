/**
 * StyleDNA Extractor
 *
 * Distils a `FullVideoMetadata` object into a `StyleDNA` — the semantic
 * fingerprint of the reference video's editorial identity.
 *
 * Each domain extractor reads raw ML analysis values and transforms them
 * into the semantic abstractions defined in `server/types/style-dna.ts`.
 *
 * Key principle: this module is PURE — no side-effects, no file I/O.
 * Given the same refMeta input it always produces the same StyleDNA.
 */

import type { FullVideoMetadata } from "../types";
import type {
  StyleDNA,
  PacingDNA,
  MotionDNA,
  ColorDNA,
  LightingDNA,
  RhythmDNA,
  TextureDNA,
} from "../types/style-dna";

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract a semantic StyleDNA from a reference video's full analysis.
 *
 * @param refMeta  Full pipeline analysis of the reference video
 * @returns        StyleDNA — semantic fingerprint across 6 perceptual domains
 */
export function extractStyleDNA(refMeta: FullVideoMetadata): StyleDNA {
  const { shotDetection: sd, motion: mo, audio: ab, colorGrading: cg, depth, duration } = refMeta;

  return {
    sourceDuration: duration,
    extractedAt: new Date().toISOString(),
    engineVersion: "v12",
    pacing: extractPacing(sd, ab, duration),
    motion: extractMotion(mo, depth),
    color: extractColor(cg),
    lighting: extractLighting(cg),
    rhythm: extractRhythm(ab, sd),
    texture: extractTexture(cg),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Domain Extractors
// ─────────────────────────────────────────────────────────────────────────────

function extractPacing(
  sd: FullVideoMetadata["shotDetection"],
  ab: FullVideoMetadata["audio"],
  duration: number,
): PacingDNA {
  const hardCuts = sd.cuts.filter((c) => c.type === "hard_cut");
  const gradualCuts = sd.cuts.filter(
    (c) =>
      c.type === "gradual_transition" &&
      c.transitionSubtype &&
      c.transitionSubtype !== "unknown",
  );

  // ── Cut density: hard cuts per second ──────────────────────────────
  const cutDensity = duration > 0 ? hardCuts.length / duration : 0;

  // ── Tempo alignment: fraction of hard cuts within 100ms of a beat ──
  const beatOnsets = (ab.beatEvents ?? []).map((b) => b.timestamp_sec);
  let beatAlignedCuts = 0;
  for (const cut of hardCuts) {
    const nearestDist = beatOnsets.reduce(
      (best, t) => Math.min(best, Math.abs(t - cut.timestamp_sec)),
      Infinity,
    );
    if (nearestDist <= 0.1) beatAlignedCuts++;
  }
  const tempoAlignment = hardCuts.length > 0 ? beatAlignedCuts / hardCuts.length : 0;

  // ── Shot length variance (std dev) ─────────────────────────────────
  const allCuts = [...hardCuts].sort((a, b) => a.timestamp_sec - b.timestamp_sec);
  const shotLengths: number[] = [];
  let prev = 0;
  for (const cut of allCuts) {
    if (cut.timestamp_sec > prev) shotLengths.push(cut.timestamp_sec - prev);
    prev = cut.timestamp_sec;
  }
  if (prev < duration) shotLengths.push(duration - prev);

  const meanLen =
    shotLengths.length > 0
      ? shotLengths.reduce((a, b) => a + b, 0) / shotLengths.length
      : sd.avgShotDurationSec;
  const shotLengthVariance =
    shotLengths.length > 1
      ? Math.sqrt(
          shotLengths.reduce((a, b) => a + Math.pow(b - meanLen, 2), 0) / shotLengths.length,
        )
      : 0;

  // ── Transition subtype profile ──────────────────────────────────────
  const transitionProfile: Record<string, number> = {};
  for (const cut of gradualCuts) {
    const subtype = cut.transitionSubtype ?? "unknown";
    transitionProfile[subtype] = (transitionProfile[subtype] ?? 0) + 1;
  }

  // ── Fallback pacing detection (v12 feature) ──────────────────────
  // Track if fallback was needed (≤1 hard cuts detected)
  const fallbackPacingTriggered = hardCuts.length <= 1;
  const syntheticCutCount = fallbackPacingTriggered ? 0 : 0; // Will be populated during adaptation

  return {
    cutDensity,
    avgShotLen: sd.avgShotDurationSec,
    tempoAlignment,
    shotLengthVariance,
    editingPace: sd.editingPace,
    hardCutConfidences: hardCuts.map((c) => c.confidence).sort((a, b) => b - a),
    gradualTransitionCount: sd.gradualTransitionCount,
    transitionProfile,
    fallbackPacingTriggered,
    syntheticCutCount,
    gradualTransitions: gradualCuts.map((c) => ({
      refTime: c.timestamp_sec,
      subtype: c.transitionSubtype ?? "unknown",
      duration: c.transitionDurationSec ?? 0.3,
      tdScore: c.td_score,
      histScore: c.hist_score,
      ecrScore: c.ecr_score,
    })),
  };
}

function extractMotion(
  mo: FullVideoMetadata["motion"],
  depth: FullVideoMetadata["depth"],
): MotionDNA {
  // ── Motion direction bias: mean panX/panY unit vector ───────────────
  const motionTl = mo.motionTimeline ?? [];
  let sumX = 0;
  let sumY = 0;
  for (const sample of motionTl) {
    sumX += sample.camera.panX;
    sumY += sample.camera.panY;
  }
  const n = motionTl.length || 1;
  const rawX = sumX / n;
  const rawY = sumY / n;
  const mag = Math.sqrt(rawX * rawX + rawY * rawY) || 1;

  // ── Shake intensity: normalise avgShakeMagnitude ─────────────────────
  // 0 = tripod, 0.01 = light handheld, 0.05+ = heavy shake
  const shakeIntensity = Math.min(1, (mo.avgShakeMagnitude ?? 0) / 0.05);

  // ── Motion spike detection (v12 fallback pacing feature) ──────────
  // Detect velocity peaks that indicate implicit cut moments
  const velocities = (mo.velocityTimeline ?? []).map((v) => v.relative_speed ?? 0);
  const sorted = [...velocities].sort((a, b) => a - b);
  const spikeThreshold = sorted[Math.floor(sorted.length * 0.75)] || 0;
  const motionSpikes = velocities.filter((v) => v > spikeThreshold * 1.5);
  const motionSpikeFrequency = velocities.length > 0 ? motionSpikes.length / velocities.length : 0;
  const hasMotionSpikes = motionSpikes.length > 0;

  return {
    cameraEnergy: mo.motionIntensity,
    parallaxStrength: depth?.avgFgBgSeparation ?? 0,
    motionDirectionBias: { x: rawX / mag, y: rawY / mag },
    velocityProfile: mo.motionStyle,
    zoomDominance: mo.dominantZoom ?? "none",
    avgZoomSpeed: mo.avgZoomSpeed ?? 0,
    shakeIntensity,
    jhatkaCount: mo.jhatkaCount,
    peakMagnitude: mo.peakMagnitude,
    isCinematic: mo.isCinematic,
    motionSpikeFrequency,
    hasMotionSpikes,
    velocityTimeline: (mo.velocityTimeline ?? []).map((v) => ({
      time_sec: v.time_sec,
      relative_speed: v.relative_speed,
    })),
    zoomTimeline: mo.zoomTimeline ?? [],
  };
}

function extractColor(cg: FullVideoMetadata["colorGrading"]): ColorDNA {
  const histCdf = cg.histogramCdf ?? null;

  // ── Tone curve signature: 32 sampled points from master CDF ──────────
  const toneCurveSignature: number[] = [];
  if (
    histCdf &&
    histCdf.r?.length === 256 &&
    histCdf.g?.length === 256 &&
    histCdf.b?.length === 256
  ) {
    const masterCdf = histCdf.r.map((r, i) => (r + histCdf.g[i] + histCdf.b[i]) / 3);
    for (let i = 0; i <= 255; i += 8) {
      toneCurveSignature.push(Math.max(0, Math.min(1, masterCdf[i])));
    }
  }

  // ── Skin bias: warmth estimate from highlight/midtone channel balance ─
  // R-dominant highlights with warm midtones → skin-flattering grade
  const hi = cg.highlightsRgb;
  const mi = cg.midtonesRgb;
  const warmthHi = (hi.r - hi.b) / 255;
  const warmthMi = (mi.r - mi.b) / 255;
  const skinBias = Math.max(0, Math.min(1, 0.5 + (warmthHi + warmthMi) / 2));

  return {
    toneCurveSignature,
    histogramCdf: histCdf,
    paletteClusters: [cg.shadowsRgb, cg.midtonesRgb, cg.highlightsRgb],
    skinBias,
    colorMood: cg.colorMood,
    colorProfile: cg.colorProfile,
    meanLuminance: cg.meanLuminance,
    stdLuminance: cg.stdLuminance,
    temporalColorEvolution: cg.temporalSamples ?? [],
    colorbalanceParams: cg.colorbalanceParams,
    colorchannelmixerParams: cg.colorchannelmixerParams,
    moodSegments: buildMoodSegments(cg),
  };
}

function extractLighting(cg: FullVideoMetadata["colorGrading"]): LightingDNA {
  const temporalSamples = cg.temporalSamples ?? [];

  let exposureVolatility = 0;
  let flickerFreq = 0.5;
  let flickerAmplitude = 0.02;
  let exposureInertia = 0.82;
  let stochasticJitter = 0.08;
  const exposureCurvePoints: Array<{ refTime: number; brightness: number }> = [];

  if (temporalSamples.length >= 2) {
    const brightnesses = temporalSamples.map((s) => s.brightness);
    const mean = brightnesses.reduce((a, b) => a + b, 0) / brightnesses.length;
    const variance =
      brightnesses.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / brightnesses.length;
    const lumaStd = Math.sqrt(variance);
    const lumaRange = Math.max(...brightnesses) - Math.min(...brightnesses);

    exposureVolatility = lumaStd;

    // ── v11 flicker formula (identical to the inline logic in edit-transfer) ──
    flickerFreq = Math.max(0.5, Math.min(12.0, lumaStd * 50));
    let amp = Math.max(0.02, Math.min(0.5, lumaRange * 1.5));
    if (lumaStd > 0.08) amp = Math.min(0.6, amp * 1.2); // +20% boost for high variance
    flickerAmplitude = amp;

    // Prompt 4: derive organic exposure dynamics from temporal brightness
    exposureInertia = Math.max(0.65, Math.min(0.95, 0.9 - lumaStd * 1.2));
    const deltas: number[] = [];
    for (let i = 1; i < brightnesses.length; i++) {
      deltas.push(Math.abs(brightnesses[i] - brightnesses[i - 1]));
    }
    const meanDelta = deltas.length > 0 ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0;
    stochasticJitter = Math.max(0.02, Math.min(0.2, meanDelta * 1.5));

    // Smooth with inertia (EMA) to emulate camera auto-exposure adaptation
    let ema = brightnesses[0] ?? 0.5;
    for (const s of temporalSamples) {
      ema = exposureInertia * ema + (1 - exposureInertia) * (s.brightness ?? ema);
      exposureCurvePoints.push({ refTime: s.time_sec, brightness: ema });
    }
  }

  // ── Highlight rolloff: CDF slope at luma 0.75–1.0 (bins 192–255) ────
  // ── Shadow depth: 1 – CDF at luma 0.25 (bin 64) ─────────────────────
  const histCdf = cg.histogramCdf;
  let highlightRolloff = 0.5;
  let shadowDepth = 0.5;

  if (histCdf && histCdf.r?.length === 256) {
    const masterCdf = histCdf.r.map((r, i) => (r + histCdf.g[i] + histCdf.b[i]) / 3);
    // Rolloff: how much CDF rises from 0.75 to 1.0 range → higher = softer highlights
    highlightRolloff = Math.min(1, Math.max(0, masterCdf[255] - masterCdf[192]));
    // Shadow depth: fraction of content below 0.25 brightness → higher = more shadows
    shadowDepth = Math.min(1, Math.max(0, 1 - masterCdf[64]));
  }

  return {
    exposureVolatility,
    highlightRolloff,
    shadowDepth,
    halationIntensity: cg.halationIntensity ?? 0,
    vignetteStrength: cg.vignette,
    flickerFreq,
    flickerAmplitude,
    exposureInertia,
    stochasticJitter,
    exposureCurvePoints,
  };
}

function extractRhythm(
  ab: FullVideoMetadata["audio"],
  sd: FullVideoMetadata["shotDetection"],
): RhythmDNA {
  const beatEvents = ab.beatEvents ?? [];

  // ── Beat type distribution: fraction per spectral band ──────────────
  const bandCounts: Record<string, number> = {
    "sub-bass": 0,
    bass: 0,
    mid: 0,
    high: 0,
  };
  for (const beat of beatEvents) {
    bandCounts[beat.band] = (bandCounts[beat.band] ?? 0) + 1;
  }
  const total = beatEvents.length || 1;
  const beatTypeDistribution = {
    "sub-bass": (bandCounts["sub-bass"] ?? 0) / total,
    bass: (bandCounts.bass ?? 0) / total,
    mid: (bandCounts.mid ?? 0) / total,
    high: (bandCounts.high ?? 0) / total,
  } as RhythmDNA["beatTypeDistribution"];

  // ── Sync strength: fraction of hard cuts within 100ms of a beat ──────
  const hardCuts = sd.cuts.filter((c) => c.type === "hard_cut");
  let syncAligned = 0;
  for (const cut of hardCuts) {
    for (const beat of beatEvents) {
      if (Math.abs(beat.timestamp_sec - cut.timestamp_sec) <= 0.1) {
        syncAligned++;
        break;
      }
    }
  }
  const syncStrength = hardCuts.length > 0 ? syncAligned / hardCuts.length : 0;

  // ── Drop zones: beats with intensity ≥ 70% of peak ──────────────────
  const peakIntensity = ab.peakBeatIntensity ?? Math.max(0, ...beatEvents.map((b) => b.intensity));
  const dropThreshold = peakIntensity * 0.7;
  const dropZones = beatEvents
    .filter((b) => b.intensity >= dropThreshold)
    .map((b) => ({ refTime: b.timestamp_sec, intensity: b.intensity, band: b.band }));

  // Prompt 3: classify beats into cinematic intent classes
  const sortedFlux = [...beatEvents.map((b) => b.flux)].sort((a, b) => a - b);
  const fluxThreshold = sortedFlux[Math.floor(sortedFlux.length * 0.85)] ?? 0;
  const bandLowEnergy = (band: string): number => {
    if (band === "sub-bass") return 1.0;
    if (band === "bass") return 0.8;
    if (band === "mid") return 0.35;
    return 0.1;
  };

  const classifiedBeats = beatEvents.map((b) => {
    const lowFreqEnergy = bandLowEnergy(b.band) * b.intensity;
    let cls: "hard_kick" | "snare" | "hi_hat" | "drop_moment" = "snare";

    if (b.intensity >= 0.9 || (b.flux >= fluxThreshold && lowFreqEnergy > 0.55)) {
      cls = "drop_moment";
    } else if (lowFreqEnergy > 0.5) {
      cls = "hard_kick";
    } else if (b.band === "high" && b.intensity <= 0.6) {
      cls = "hi_hat";
    }

    return {
      refTime: b.timestamp_sec,
      class: cls,
      intensity: b.intensity,
      flux: b.flux,
      lowFreqEnergy,
    };
  });

  const classCounts = {
    hard_kick: 0,
    snare: 0,
    hi_hat: 0,
    drop_moment: 0,
  };
  for (const c of classifiedBeats) classCounts[c.class] += 1;
  const classTotal = Math.max(1, classifiedBeats.length);
  const beatClassDistribution: RhythmDNA["beatClassDistribution"] = {
    hard_kick: classCounts.hard_kick / classTotal,
    snare: classCounts.snare / classTotal,
    hi_hat: classCounts.hi_hat / classTotal,
    drop_moment: classCounts.drop_moment / classTotal,
  };

  return {
    beatTypeDistribution,
    syncStrength,
    dropZones,
    bpm: ab.bpm,
    beatDensity: ab.beatDensity,
    avgBeatIntensity: ab.avgBeatIntensity,
    peakBeatIntensity: ab.peakBeatIntensity,
    beatEvents,
    classifiedBeats,
    beatClassDistribution,
    timeSignature: ab.timeSignatureGuess,
  };
}

function buildMoodSegments(cg: FullVideoMetadata["colorGrading"]): ColorDNA["moodSegments"] {
  const samples = cg.temporalSamples ?? [];
  if (samples.length === 0) {
    return [
      {
        start_sec: 0,
        end_sec: 1,
        labMean: {
          l: Math.max(0, Math.min(100, (cg.meanLuminance / 255) * 100)),
          a: ((cg.midtonesRgb.r - cg.midtonesRgb.g) / 255) * 128,
          b: ((cg.midtonesRgb.g - cg.midtonesRgb.b) / 255) * 128,
        },
        contrastMean: cg.contrast,
        saturationVariance: 0,
      },
    ];
  }

  const segmentCount = Math.max(2, Math.min(4, Math.round(samples.length / 20) || 3));
  const segLen = Math.ceil(samples.length / segmentCount);
  const segments: ColorDNA["moodSegments"] = [];

  for (let i = 0; i < samples.length; i += segLen) {
    const chunk = samples.slice(i, i + segLen);
    if (chunk.length === 0) continue;
    const start = chunk[0].time_sec;
    const end = chunk[chunk.length - 1].time_sec;
    const meanBrightness = chunk.reduce((a, s) => a + s.brightness, 0) / chunk.length;
    const meanContrast = chunk.reduce((a, s) => a + s.contrast, 0) / chunk.length;
    const sats = chunk.map((s) => s.saturation);
    const satMean = sats.reduce((a, b) => a + b, 0) / sats.length;
    const satVar = sats.reduce((a, b) => a + Math.pow(b - satMean, 2), 0) / sats.length;

    const labMean = {
      l: Math.max(0, Math.min(100, meanBrightness * 100)),
      a: ((cg.midtonesRgb.r - cg.midtonesRgb.g) / 255) * 128,
      b: ((cg.midtonesRgb.g - cg.midtonesRgb.b) / 255) * 128,
    };

    segments.push({
      start_sec: start,
      end_sec: Math.max(end, start + 0.01),
      labMean,
      contrastMean: meanContrast,
      saturationVariance: satVar,
    });
  }

  return segments;
}

function extractTexture(cg: FullVideoMetadata["colorGrading"]): TextureDNA {
  const temporalSamples = cg.temporalSamples ?? [];

  // ── Blur pattern: temporal samples where blurLevel > 0.15 ────────────
  // Compute adaptive radius from ML blur score using the v11 formula.
  const blurPattern = temporalSamples
    .filter((s) => (s.blurLevel ?? 0) > 0.15)
    .map((s) => ({
      refTime: s.time_sec,
      refDuration: 1.0, // ~1 sample per second from signalstats
      blurLevel: s.blurLevel ?? 0,
      // v11 adaptive radius: blurLevel 0.15→1, 0.5→3, 1.0→5
      radius: Math.max(1, Math.min(5, Math.round(1 + ((s.blurLevel ?? 0) - 0.15) * 4.7))),
    }));

  // ── Sharpness: reference level scaled to FFmpeg unsharp range (0–2) ──
  const sharpnessProfile = Math.min(2.0, Math.max(0.3, (cg.sharpness || 1.0) * 0.7));

  return {
    grainProfile: {
      density: cg.grainDensity ?? 0,
      strength: Math.round((cg.grainDensity ?? 0) * 100),
      label: cg.grainLabel,
    },
    sharpnessProfile,
    blurPattern,
    hasFilmTexture: cg.hasFilmTexture,
    filmStockLabel: cg.filmStockLabel,
    lensBlur: cg.lensBlur,
  };
}
