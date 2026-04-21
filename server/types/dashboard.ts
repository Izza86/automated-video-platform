/**
 * Dashboard card builder utilities.
 *
 * Converts raw FullVideoMetadata into an array of DashboardCard objects
 * suitable for direct rendering by the Next.js frontend.
 */

import type {
  DashboardAnalysisResponse,
  DashboardCard,
  FullVideoMetadata,
} from "./index";

/** Build a complete dashboard response from analysis results. */
export function buildDashboardResponse(
  meta: FullVideoMetadata,
  videoId: string,
  filename: string
): DashboardAnalysisResponse {
  return {
    videoId,
    filename,
    processedAt: new Date().toISOString(),
    cards: buildCards(meta),
    raw: meta,
  };
}

/** Build the array of dashboard cards. */
function buildCards(meta: FullVideoMetadata): DashboardCard[] {
  const cards: DashboardCard[] = [];

  // ── Shot Detection Card ─────────────────────────────────────────────
  const sd = meta.shotDetection;
  cards.push({
    id: "shot-detection",
    title: "Shot Detection",
    value: `${sd.shotCount} shots`,
    subtitle: `${sd.avgShotDurationSec.toFixed(1)}s avg · ${sd.editingPace} pace`,
    badge: sd.editingPace,
    badgeVariant:
      sd.editingPace === "rapid"
        ? "destructive"
        : sd.editingPace === "slow"
          ? "default"
          : "warning",
    sparkline: sd.cuts.map((c) => c.confidence),
    details: [
      { label: "Hard cuts", value: sd.hardCutCount },
      { label: "Gradual transitions", value: sd.gradualTransitionCount },
      {
        label: "Dominant type",
        value: sd.dominantTransitionType.replace("_", " "),
      },
      { label: "Analysis time", value: `${sd.processingMs}ms` },
    ],
  });

  // ── Motion Analysis Card ────────────────────────────────────────────
  const mo = meta.motion;
  // Build the velocity-timeline sparkline (downsample to max 80 points)
  const tlSpark = (() => {
    const tl = mo.velocityTimeline;
    if (tl.length <= 80) return tl.map((p) => p.relative_speed);
    const step = Math.ceil(tl.length / 80);
    const out: number[] = [];
    for (let i = 0; i < tl.length; i += step) out.push(tl[i].relative_speed);
    return out;
  })();

  // Segment distribution summary string e.g. "3 normal · 2 fast · 1 freeze"
  const distParts = (
    Object.entries(mo.segmentDistribution) as [string, number][]
  )
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${v} ${k}`);

  cards.push({
    id: "motion-analysis",
    title: "Motion Profile",
    value: mo.motionStyle,
    subtitle: `Intensity ${(mo.motionIntensity * 100).toFixed(0)}% · ${mo.jhatkaCount} jhatka${mo.jhatkaCount !== 1 ? "s" : ""}`,
    badge: mo.hasSpeedRamp ? "Speed Ramp" : "Constant",
    badgeVariant: mo.hasSpeedRamp ? "warning" : "default",
    sparkline: tlSpark,
    details: [
      { label: "Avg speed", value: `${mo.avgRelativeSpeed.toFixed(2)}×` },
      { label: "Peak magnitude", value: `${mo.peakMagnitude.toFixed(1)} px/f` },
      { label: "Segments", value: mo.velocitySegments.length },
      { label: "Distribution", value: distParts.join(" · ") || "—" },
      { label: "Jhatkas", value: mo.jhatkaCount },
      { label: "Cinematic", value: mo.isCinematic ? "Yes" : "No" },
      { label: "Analysis time", value: `${mo.processingMs}ms` },
    ],
  });

  // ── Audio Beat Card ─────────────────────────────────────────────────
  const au = meta.audio;

  // Beat-intensity sparkline (downsample to max 80 points)
  const beatSpark = (() => {
    const evts = au.beatEvents;
    if (evts.length <= 80) return evts.map((e) => e.intensity);
    const step = Math.ceil(evts.length / 80);
    const out: number[] = [];
    for (let i = 0; i < evts.length; i += step) out.push(evts[i].intensity);
    return out;
  })();

  // Region summary string e.g. "2 high · 3 medium · 1 silent"
  const regionParts = (() => {
    const counts: Record<string, number> = {};
    for (const r of au.rhythmRegions) {
      counts[r.energyLabel] = (counts[r.energyLabel] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${v} ${k}`);
  })();

  cards.push({
    id: "audio-beats",
    title: "Audio Analysis",
    value: au.hasAudio ? `${au.bpm} BPM` : "No Audio",
    subtitle: au.hasAudio
      ? `${au.beats.length} beats · ${au.timeSignatureGuess} · ${(au.bpmConfidence * 100).toFixed(0)}% conf`
      : "Silent track",
    badge: au.hasAudio ? "Audio" : "Silent",
    badgeVariant: au.hasAudio ? "success" : "default",
    sparkline: beatSpark,
    details: [
      { label: "First beat", value: `${au.firstBeatSec.toFixed(2)}s` },
      { label: "Beat density", value: `${au.beatDensity.toFixed(2)} b/s` },
      {
        label: "Avg intensity",
        value: `${(au.avgBeatIntensity * 100).toFixed(0)}%`,
      },
      {
        label: "Peak intensity",
        value: `${(au.peakBeatIntensity * 100).toFixed(0)}%`,
      },
      { label: "Peak dB", value: `${au.peakDb.toFixed(1)} dB` },
      { label: "Mean volume", value: `${(au.meanVolume * 100).toFixed(0)}%` },
      { label: "Rhythm regions", value: regionParts.join(" · ") || "—" },
      { label: "Time signature", value: au.timeSignatureGuess },
      { label: "Analysis time", value: `${au.processingMs}ms` },
    ],
  });

  // ── Color Grading Card ──────────────────────────────────────────────
  const cg = meta.colorGrading;
  cards.push({
    id: "color-grading",
    title: "Color DNA",
    value: cg.colorProfile,
    subtitle: `${cg.colorMood} mood`,
    badge: cg.grainLabel,
    badgeVariant: cg.grainDensity > 0.4 ? "warning" : "default",
    details: [
      { label: "Brightness", value: cg.brightness.toFixed(3) },
      { label: "Contrast", value: cg.contrast.toFixed(3) },
      { label: "Saturation", value: cg.saturation.toFixed(3) },
      { label: "Sharpness", value: cg.sharpness.toFixed(3) },
      {
        label: "Vignette",
        value: `${cg.vignetteLabel} (${cg.vignette.toFixed(2)})`,
      },
      { label: "Lens blur", value: cg.lensBlurLabel },
      { label: "Grain", value: cg.grainLabel },
      { label: "Analysis time", value: `${cg.processingMs}ms` },
    ],
  });

  // ── Video Identity Card ─────────────────────────────────────────────
  cards.push({
    id: "video-identity",
    title: "Video Properties",
    value: `${meta.duration.toFixed(1)}s`,
    subtitle: `${meta.fps}fps · ${meta.aspectRatio} · ${meta.orientation}`,
    details: [
      { label: "FPS", value: meta.fps },
      { label: "Aspect ratio", value: meta.aspectRatio },
      { label: "Duration", value: `${meta.duration.toFixed(1)}s` },
      { label: "Orientation", value: meta.orientation },
      { label: "Has audio", value: meta.hasAudio ? "Yes" : "No" },
    ],
  });

  return cards;
}
