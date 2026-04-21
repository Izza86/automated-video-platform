/**
 * Filter Graph Generator
 *
 * Translates an `AdaptedStyleDNA` into a concrete FFmpeg filter graph,
 * writing any required sendcmd files to disk and returning the assembled
 * filter chain strings.
 *
 * This is the ONLY module that performs file I/O for the rendering pipeline.
 * It is intentionally impure: it writes `.cmd` files to `tmp/` and returns
 * their paths so the caller can upload them to Colab or pass them locally.
 *
 * Pipeline position:
 *   extractStyleDNA  →  adaptToTargetContent  →  [THIS MODULE]  →  FFmpeg
 *
 * Filter chain order (permanent, matches v11):
 *   scale → crop → zoompan → sendcmd/impact → setpts
 *   → curves(CDF) → sendcmd/temporal_eq → sendcmd/ref_blur
 *   → sendcmd/ref_transition → unsharp → noise → halation
 *   → vignette → sendcmd/beat_pulse → fps → fades
 */

import * as fs from "node:fs";
import * as path from "node:path";

import type { AdaptedStyleDNA, FilterGraphOutput } from "../types/style-dna";

// ─────────────────────────────────────────────────────────────────────────────
// Options
// ─────────────────────────────────────────────────────────────────────────────

export interface FilterGraphOptions {
  /** Index of the video input stream (0 or 1 depending on whether ref audio is included) */
  vidIdx: number;
  /** Index of the HALD CLUT input stream */
  haldIdx: number;
  /** Whether hard-cut segmentation pre-pass is active */
  useHardCutSegmentation: boolean;
  /** The assembled hard-cut segmentation graph (trim→concat) — empty if not used */
  hardCutGraph: string;
  /** Whether to substitute __PLACEHOLDER__ tokens for Colab path injection */
  useColab: boolean;
  /** Exact duration of the target video (seconds) */
  targetDuration: number;
  /** Output width in pixels */
  width: number;
  /** Output height in pixels */
  height: number;
  /**
   * Reference velocity timeline used as fallback setpts when the adapter
   * could not build a semantic expression (target had no velocity data).
   */
  refVelocityTimeline: Array<{ time_sec: number; relative_speed: number }>;
  /** Reference zoom timeline for the zoompan expression */
  refZoomTimeline: Array<{ time_sec: number; zoomSpeed: number }>;
  /** Reference video duration for proportional timeline scaling */
  refDuration: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate the complete FFmpeg filter graph from an `AdaptedStyleDNA`.
 *
 * Writes all sendcmd files to `tmp/` and returns the assembled filter
 * chain + metadata in a `FilterGraphOutput`.
 *
 * @param adapted  Semantically adapted style DNA (from adaptToTargetContent)
 * @param tmp      Temp directory path (writable, will be cleaned up by caller)
 * @param opts     Render context (dimensions, input indices, Colab flag)
 */
export async function generateFilterGraph(
  adapted: AdaptedStyleDNA,
  tmp: string,
  opts: FilterGraphOptions
): Promise<FilterGraphOutput> {
  const vf: string[] = [];
  const filterLog: string[] = [];
  const cmdFiles: FilterGraphOutput["cmdFiles"] = {
    temporalColor: null,
    beatPulse: null,
    blur: null,
    transition: null,
    impact: null,
  };

  const { targetDuration, width: w, height: h, useColab } = opts;

  // ── 1. Scale + Crop — ALWAYS FIRST ─────────────────────────────────
  vf.push(`scale=${w}:${h}:force_original_aspect_ratio=increase`);
  vf.push(`crop=${w}:${h}`);
  filterLog.push(`scale:${w}x${h}`);

  // ── 2a. Per-point RAFT Zoompan ──────────────────────────────────────
  // Use the reference zoom timeline (proportional mapping is correct for zoom:
  // zoom speed is a property of the reference's spatial composition intent).
  if (adapted.motion.zoomExpr) {
    vf.push(adapted.motion.zoomExpr);
    filterLog.push("zoom:depth-aware(semantic)");
  } else {
    const zoomTimeline = adapted.source.motion.zoomTimeline;
    if (zoomTimeline.length >= 2) {
      const zoomExpr = buildKeyframeZoomExpr(
        zoomTimeline,
        targetDuration,
        opts.refDuration,
        w,
        h
      );
      if (zoomExpr) {
        vf.push(zoomExpr);
        filterLog.push(`zoom:keyframe(${zoomTimeline.length}pts)`);
      }
    }
  }

  // ── 2b. Beat-Triggered Jitter (v11 Impact Shake) ───────────────────
  // Jitter events come from the ADAPTER — placed at target's K hardest beats.
  if (adapted.motion.jitterEvents.length > 0) {
    const lines: string[] = [];
    for (const evt of adapted.motion.jitterEvents) {
      const t = evt.time.toFixed(3);
      const tEnd = evt.endTime.toFixed(3);
      const rot = evt.rotAngle.toFixed(4);
      const scale = evt.scaleAmount.toFixed(4);
      lines.push(`${t} impact_rotate angle ${rot};`);
      lines.push(`${t} impact_scale w iw*${scale};`);
      lines.push(`${t} impact_scale h ih*${scale};`);
      lines.push(`${tEnd} impact_rotate angle 0;`);
      lines.push(`${tEnd} impact_scale w iw;`);
      lines.push(`${tEnd} impact_scale h ih;`);
    }
    const impactPath = path.join(tmp, "beat_impact.cmd");
    fs.writeFileSync(impactPath, lines.join("\n") + "\n", "utf-8");
    cmdFiles.impact = impactPath;

    const ref = useColab ? "__IMPACTCMD_PATH__" : fwdPath(impactPath);
    vf.push(`sendcmd=f='${ref}'`);
    vf.push("rotate@impact_rotate=angle=0:ow=iw:oh=ih");
    vf.push("scale@impact_scale=w=iw:h=ih");
    filterLog.push(
      `impact-jitter:${adapted.motion.jitterEvents.length}beats(semantic)`
    );

    console.log(
      `[filter-graph] Beat jitter: ${adapted.motion.jitterEvents.length} semantic events ` +
        `(at target's ${adapted.motion.jitterEvents.length} hardest beats)`
    );
  } else {
    filterLog.push("impact-jitter:skipped(no-hard-beats)");
  }

  // ── 2c. Motion Sync — setpts (STRICT) ───────────────────────────────
  const setptsExpr = adapted.motion.setptsExpr;
  if (!setptsExpr) {
    throw new Error(
      "[STRICT FAILURE] Missing semantic setpts expression. Motion fallback is disabled."
    );
  }
  vf.push(`setpts='${setptsExpr}'`);
  filterLog.push("velocity:semantic(target-own-profile)");

  // ── 3. Color Transfer ───────────────────────────────────────────────

  // 3a. CDF-interpolated curves (timeless, content-independent)
  if (adapted.color.curvesFilter) {
    vf.push(adapted.color.curvesFilter);
    filterLog.push("histogram-match:cdf-curves(semantic,32pt)");
    console.log("[filter-graph] CDF curves applied (32-point, master+r+g+b)");
  } else if (!adapted.color.applyHald) {
    throw new Error(
      "[STRICT FAILURE] Missing CDF/HALD color transform. Color fallback is disabled."
    );
  }

  // 3b. Temporal color + flicker
  const temporalSendcmd = adapted.color.temporalSendcmd;
  const exposureEvents = adapted.lighting.exposureEvents;
  const moodSegments = adapted.color.moodGradeSegments;

  if (
    temporalSendcmd.length >= 2 ||
    exposureEvents.length > 0 ||
    moodSegments.length > 0
  ) {
    const cmdLines: string[] = [];

    // Segment-wise mood adaptation (prompt 6)
    for (const seg of moodSegments) {
      const t = seg.start.toFixed(3);
      cmdLines.push(
        `${t} temporal_eq brightness ${seg.brightness.toFixed(5)};`
      );
      cmdLines.push(`${t} temporal_eq contrast ${seg.contrast.toFixed(5)};`);
      cmdLines.push(
        `${t} temporal_eq saturation ${seg.saturation.toFixed(5)};`
      );
    }

    for (const entry of temporalSendcmd) {
      const t = entry.time.toFixed(3);
      cmdLines.push(
        `${t} temporal_eq contrast ${entry.contrastRatio.toFixed(6)};`
      );
      cmdLines.push(
        `${t} temporal_eq saturation ${entry.saturationRatio.toFixed(6)};`
      );
    }

    // Organic exposure curve (prompt 4)
    for (const e of exposureEvents) {
      cmdLines.push(
        `${e.time.toFixed(3)} temporal_eq brightness ${e.brightness.toFixed(5)};`
      );
    }

    const sendcmdPath = path.join(tmp, "temporal_color.cmd");
    fs.writeFileSync(sendcmdPath, cmdLines.join("\n") + "\n", "utf-8");
    cmdFiles.temporalColor = sendcmdPath;

    const ref = useColab ? "__SENDCMD_PATH__" : fwdPath(sendcmdPath);
    vf.push(`sendcmd=f='${ref}'`);
    vf.push("eq@temporal_eq=brightness=0:contrast=1:saturation=1");

    filterLog.push(
      `temporal-color:${temporalSendcmd.length}events+mood:${moodSegments.length}+exposure:${exposureEvents.length}`
    );
    console.log(
      `[filter-graph] Temporal color: ${temporalSendcmd.length} semantic events ` +
        "(energy-level matched, not proportional)"
    );
  } else {
    vf.push("eq@temporal_eq=brightness=0:contrast=1:saturation=1");
    filterLog.push("temporal-color:static-default");
  }

  // 3c. Adaptive blur replication — SEMANTIC (at target motion peaks)
  const blurEvents = adapted.texture.blurEvents;
  if (blurEvents.length > 0) {
    const blurLines: string[] = [];
    for (const evt of blurEvents) {
      const t = evt.time.toFixed(3);
      blurLines.push(`${t} ref_blur luma_radius ${evt.radius};`);
      blurLines.push(`${t} ref_blur luma_power 2;`);
    }
    // Reset at video end
    blurLines.push(
      `${Math.max(0, targetDuration - 0.05).toFixed(3)} ref_blur luma_radius 0;`
    );

    const blurPath = path.join(tmp, "ref_blur.cmd");
    fs.writeFileSync(blurPath, blurLines.join("\n") + "\n", "utf-8");
    cmdFiles.blur = blurPath;

    const ref = useColab ? "__BLURCMD_PATH__" : fwdPath(blurPath);
    vf.push(`sendcmd=f='${ref}'`);
    vf.push("boxblur@ref_blur=luma_radius=0:luma_power=2");
    filterLog.push(`ref-blur:${blurEvents.length}events(semantic,motion-peak)`);

    console.log(
      `[filter-graph] Blur: ${blurEvents.length} events at target motion peaks ` +
        "(semantic, not proportional)"
    );
  }

  // 3d. Gradual transition replication
  const gradualTransitions = adapted.pacing.gradualTransitions;
  if (gradualTransitions.length > 0) {
    const transLines: string[] = [];

    for (const gt of gradualTransitions) {
      const halfDur = gt.duration / 2;
      const tBefore = Math.max(0, gt.time - halfDur).toFixed(3);
      const tAt = gt.time.toFixed(3);
      const tAfter = Math.min(targetDuration, gt.time + halfDur).toFixed(3);

      switch (gt.subtype) {
        case "flash_transition": {
          const flash = Number.parseFloat(
            (0.25 + (gt.tdScore - 0.5) * 0.9).toFixed(3)
          );
          transLines.push(`${tBefore} ref_transition brightness 0;`);
          transLines.push(`${tAt} ref_transition brightness ${flash};`);
          transLines.push(`${tAfter} ref_transition brightness 0;`);
          break;
        }
        case "dissolve": {
          const bright = Number.parseFloat(
            (-0.08 - (gt.histScore - 0.3) * 0.34).toFixed(3)
          );
          const cont = Number.parseFloat(
            (0.92 - (gt.histScore - 0.3) * 0.34).toFixed(3)
          );
          transLines.push(`${tBefore} ref_transition brightness 0;`);
          transLines.push(`${tAt} ref_transition brightness ${bright};`);
          transLines.push(`${tAfter} ref_transition brightness 0;`);
          transLines.push(`${tBefore} ref_transition contrast 1;`);
          transLines.push(`${tAt} ref_transition contrast ${cont};`);
          transLines.push(`${tAfter} ref_transition contrast 1;`);
          break;
        }
        case "fade": {
          const depth = Number.parseFloat(
            (-0.15 - (gt.histScore - 0.1) * 0.8).toFixed(3)
          );
          transLines.push(`${tBefore} ref_transition brightness 0;`);
          transLines.push(`${tAt} ref_transition brightness ${depth};`);
          transLines.push(`${tAfter} ref_transition brightness 0;`);
          break;
        }
        case "blur_transition": {
          const dip = Number.parseFloat(
            (-0.03 - gt.histScore * 0.12).toFixed(3)
          );
          transLines.push(`${tBefore} ref_transition brightness 0;`);
          transLines.push(`${tAt} ref_transition brightness ${dip};`);
          transLines.push(`${tAfter} ref_transition brightness 0;`);
          break;
        }
        default:
          break;
      }
    }

    if (transLines.length > 0) {
      const transPath = path.join(tmp, "ref_transition.cmd");
      fs.writeFileSync(transPath, transLines.join("\n") + "\n", "utf-8");
      cmdFiles.transition = transPath;

      const ref = useColab ? "__TRANSCMD_PATH__" : fwdPath(transPath);
      vf.push(`sendcmd=f='${ref}'`);
      vf.push("eq@ref_transition=brightness=0:contrast=1");
      filterLog.push(
        `ref-transition:${gradualTransitions.length}(${gradualTransitions.map((g) => g.subtype).join(",")})`
      );
    }
  }

  // HALD CLUT note (applied in the graph assembly, not inline chain)
  if (adapted.color.applyHald) {
    filterLog.push("haldclut(v11-lut-priority)");
  }

  // ── 4. Sharpness ────────────────────────────────────────────────────
  vf.push(adapted.texture.sharpnessFilter);
  filterLog.push(
    `unsharp:${adapted.source.texture.sharpnessProfile.toFixed(1)}`
  );

  // ── 4b. Film Grain ──────────────────────────────────────────────────
  if (adapted.texture.grainFilter) {
    vf.push(adapted.texture.grainFilter);
    filterLog.push(`grain:${adapted.source.texture.grainProfile.strength}`);
  }

  // ── 4c. Halation ────────────────────────────────────────────────────
  if (adapted.lighting.halationFilter) {
    vf.push(adapted.lighting.halationFilter);
    filterLog.push(
      `halation:${adapted.source.lighting.halationIntensity.toFixed(2)}`
    );
  }

  // ── 5. Vignette ─────────────────────────────────────────────────────
  if (adapted.lighting.vignetteAngle !== null) {
    vf.push(`vignette=angle=${adapted.lighting.vignetteAngle.toFixed(4)}`);
    filterLog.push(`vignette:${adapted.lighting.vignetteAngle.toFixed(2)}`);
  }

  // ── 6. Beat Pulse — SEMANTIC (target's own beat grid) ───────────────
  if (adapted.rhythm.beatResponseEvents.length > 0) {
    const responseLines: string[] = [];
    for (const evt of adapted.rhythm.beatResponseEvents) {
      const t = evt.time.toFixed(3);
      const tEnd = evt.endTime.toFixed(3);
      responseLines.push(
        `${t} beat_response brightness ${evt.brightness.toFixed(4)};`
      );
      responseLines.push(
        `${t} beat_response contrast ${evt.contrast.toFixed(4)};`
      );
      if (evt.rotation !== 0) {
        responseLines.push(
          `${t} beat_response_rot angle ${evt.rotation.toFixed(5)};`
        );
        responseLines.push(`${tEnd} beat_response_rot angle 0;`);
      }
      if (evt.zoom !== 1) {
        responseLines.push(
          `${t} beat_response_scale w iw*${evt.zoom.toFixed(4)};`
        );
        responseLines.push(
          `${t} beat_response_scale h ih*${evt.zoom.toFixed(4)};`
        );
        responseLines.push(`${tEnd} beat_response_scale w iw;`);
        responseLines.push(`${tEnd} beat_response_scale h ih;`);
      }
      responseLines.push(`${tEnd} beat_response brightness 0;`);
      responseLines.push(`${tEnd} beat_response contrast 1;`);
    }

    const responsePath = path.join(tmp, "beat_response.cmd");
    fs.writeFileSync(responsePath, responseLines.join("\n") + "\n", "utf-8");
    cmdFiles.beatPulse = responsePath;

    const ref = useColab ? "__BEATPULSE_PATH__" : fwdPath(responsePath);
    vf.push(`sendcmd=f='${ref}'`);
    vf.push("eq@beat_response=brightness=0:contrast=1");
    vf.push("rotate@beat_response_rot=angle=0:ow=iw:oh=ih");
    vf.push("scale@beat_response_scale=w=iw:h=ih");
    filterLog.push(
      `beat-response:${adapted.rhythm.beatResponseEvents.length}content-aware`
    );
  } else if (adapted.rhythm.beatPulseEvents.length > 0) {
    const pulseLines: string[] = [];
    for (const evt of adapted.rhythm.beatPulseEvents) {
      const t = evt.time.toFixed(3);
      const tEnd = evt.endTime.toFixed(3);
      pulseLines.push(
        `${t} beat_pulse brightness ${evt.brightness.toFixed(3)};`
      );
      pulseLines.push(`${t} beat_pulse contrast ${evt.contrast.toFixed(3)};`);
      pulseLines.push(`${tEnd} beat_pulse brightness 0;`);
      pulseLines.push(`${tEnd} beat_pulse contrast 1;`);
    }
    const pulsePath = path.join(tmp, "beat_pulse.cmd");
    fs.writeFileSync(pulsePath, pulseLines.join("\n") + "\n", "utf-8");
    cmdFiles.beatPulse = pulsePath;

    const ref = useColab ? "__BEATPULSE_PATH__" : fwdPath(pulsePath);
    vf.push(`sendcmd=f='${ref}'`);
    vf.push("eq@beat_pulse=brightness=0:contrast=1");
    filterLog.push(
      `beat-pulse:${adapted.rhythm.beatPulseEvents.length}beats(semantic)`
    );

    console.log(
      `[filter-graph] Beat pulse: ${adapted.rhythm.beatPulseEvents.length} events ` +
        `(target's own beat grid, intensity range ` +
        `${adapted.rhythm.beatPulseEvents.reduce((m, e) => Math.min(m, e.brightness), Number.POSITIVE_INFINITY).toFixed(2)}-` +
        `${adapted.rhythm.beatPulseEvents.reduce((m, e) => Math.max(m, e.brightness), 0).toFixed(2)})`
    );
  }

  // ── 7. FPS normalisation + minimal fades ────────────────────────────
  vf.push("fps=30");
  vf.push("fade=t=in:st=0:d=0.08");
  vf.push(
    `fade=t=out:st=${Math.max(0, targetDuration - 0.3).toFixed(2)}:d=0.3`
  );
  filterLog.push("fps:30", "fades:0.08in+0.3out");

  // ── Assemble final filter chain string ──────────────────────────────
  const videoFilterChain = vf.join(",");

  console.log("[filter-graph] StyleDNA pipeline summary:");
  console.log(
    `  [1] Pacing: ${adapted.pacing.cutTimestamps.length} semantic cuts`
  );
  console.log(
    `  [2] Motion: ${adapted.motion.jitterEvents.length} jitter events`
  );
  console.log(
    `  [3] Color: ${temporalSendcmd.length} semantic temporal events`
  );
  console.log(
    `  [4] Lighting: exposureEvents=${adapted.lighting.exposureEvents.length}`
  );
  console.log(
    `  [5] Rhythm: responses=${adapted.rhythm.beatResponseEvents.length}`
  );
  console.log(`  [6] Texture: ${blurEvents.length} blur events`);

  return {
    videoFilterChain,
    hardCutGraph: opts.useHardCutSegmentation ? opts.hardCutGraph : "",
    useHald: adapted.color.applyHald,
    filterLog,
    cmdFiles,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Normalise a Windows absolute path to forward slashes + escape colons for FFmpeg. */
function fwdPath(p: string): string {
  return p.replace(/\\/g, "/").replace(/:/g, "\\:");
}

/**
 * Build a per-point RAFT zoompan expression from the reference zoom timeline.
 *
 * Zoom is a spatial composition property: proportional time mapping is
 * appropriate here because it describes how the FRAME COMPOSITION changes
 * over the reference's duration.
 */
function buildKeyframeZoomExpr(
  zoomTimeline: Array<{ time_sec: number; zoomSpeed: number }>,
  targetDuration: number,
  refDuration: number,
  w: number,
  h: number
): string | null {
  if (zoomTimeline.length < 2) return null;

  const MAX_ITER = 50;
  const ZOOM_SCALE = 0.0008; // RAFT optical-flow units → zoompan z-units

  const refEnd = Math.max(
    refDuration,
    zoomTimeline[zoomTimeline.length - 1].time_sec + 0.01
  );
  const scale = targetDuration / refEnd;

  interface ZoomKF {
    startFrame: number;
    endFrame: number;
    rate: number;
  }

  const keyframes: ZoomKF[] = [];
  for (let i = 0; i < zoomTimeline.length - 1; i++) {
    const startFrame = Math.round(zoomTimeline[i].time_sec * scale * 30);
    const endFrame = Math.round(zoomTimeline[i + 1].time_sec * scale * 30);
    if (endFrame <= startFrame) continue;
    keyframes.push({
      startFrame,
      endFrame,
      rate: zoomTimeline[i].zoomSpeed * ZOOM_SCALE,
    });
  }

  if (keyframes.length === 0) return null;

  let kfs = keyframes;
  if (kfs.length > MAX_ITER) {
    const step = Math.ceil(kfs.length / MAX_ITER);
    kfs = kfs.filter((_, i) => i % step === 0);
  }

  let zExpr = "1.0";
  for (let i = kfs.length - 1; i >= 0; i--) {
    const kf = kfs[i];
    const segExpr = `(1+${kf.rate.toFixed(6)}*(on-${kf.startFrame}))`;
    zExpr = `if(between(on,${kf.startFrame},${kf.endFrame}),${segExpr},${zExpr})`;
  }

  return `zoompan=z='${zExpr}':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${w}x${h}:fps=30`;
}

/**
 * Build a proportional setpts expression from the REFERENCE velocity timeline.
 * Used as a fallback when the target has no own velocity data.
 */
function buildFallbackSetpts(
  timeline: Array<{ time_sec: number; relative_speed: number }>,
  targetDuration: number,
  refDuration: number
): string | null {
  if (!timeline || timeline.length < 2) return null;

  const MAX_ITER = 50;
  const MIN_SPEED = 0.25;
  const MAX_SPEED = 4.0;

  const refEnd = Math.max(
    refDuration,
    timeline[timeline.length - 1].time_sec + 0.01
  );
  const scale = targetDuration / refEnd;

  interface Seg {
    inStart: number;
    inEnd: number;
    speed: number;
    outStart: number;
  }

  const resolved: Seg[] = [];
  let outCursor = 0;

  for (let i = 0; i < timeline.length - 1; i++) {
    const speed = Math.max(
      MIN_SPEED,
      Math.min(MAX_SPEED, timeline[i].relative_speed || 1.0)
    );
    const inStart = timeline[i].time_sec * scale;
    const inEnd = timeline[i + 1].time_sec * scale;
    const inDuration = inEnd - inStart;
    if (inDuration <= 0) continue;
    resolved.push({ inStart, inEnd, speed, outStart: outCursor });
    outCursor += inDuration / speed;
  }

  if (resolved.length === 0) return null;

  let segs = resolved;
  if (segs.length > MAX_ITER) {
    const step = Math.ceil(segs.length / MAX_ITER);
    const decimated: Seg[] = [];
    let cursor = 0;
    for (let i = 0; i < segs.length; i += step) {
      const s = segs[i];
      const end =
        i + step < segs.length ? segs[i + step].inStart : targetDuration;
      decimated.push({
        inStart: s.inStart,
        inEnd: end,
        speed: s.speed,
        outStart: cursor,
      });
      cursor += (end - s.inStart) / s.speed;
    }
    segs = decimated;
  }

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
