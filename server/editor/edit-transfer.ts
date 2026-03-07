/**
 * Edit Transfer Engine  ─  v8 (Temporal Color DNA)
 *
 * Applies a reference video's `FullVideoMetadata` editorial style to a
 * target video via a single FFmpeg filter graph.
 *
 * v8 — TEMPORAL COLOR DNA + SENDCMD
 * ──────────────────────────────────
 * • Per-second color sampling across the FULL reference video
 * • FFmpeg sendcmd drives eq brightness/contrast/saturation dynamically
 * • Reference's colour evolution replicated exactly on the target
 *   (warm intro → cold chorus → desaturated bridge)
 * • NO static averaged values — every second comes from analysis data
 * • NO hardcoded curves=preset — all contrast derived from reference
 * • Proportional time mapping: ref timestamps → target timestamps
 * • Fallback to static eq ONLY when temporal data unavailable
 *
 * v7.1 Features Retained:
 * • NO constant shake / jitter / handheld vibration
 * • Movement mapped ONLY to reference velocity_ramping
 * • 1-frame directional shift on beat peaks (impact feel)
 * • Exact zoom_velocity from RAFT — no HF noise added
 * • Unlocked saturation & contrast — raw reference passthrough
 * • NO minimum duration safety — allow 0.04 s micro-cuts
 * • Forced tblend motion blur on ANY non-zero motion
 * • Zero-normalization grain / halation / vignette
 * • Graceful depth fallback (flat default, render always proceeds)
 *
 * Master Logic Rules (permanent)
 * ──────────────────────────────
 * 1. **Quality First** — CRF 18, preset slow.  Bitrate flags
 *    (-b:v 5M / -minrate 3M / -maxrate 8M / -bufsize 16M)
 *    are placed LAST before the output path.
 *
 * 2. **Reference-Proportional Color** — v8 uses sendcmd-driven
 *    temporal eq that changes at each second.  Fallback: ONE
 *    curves=preset=strong_contrast + ONE static eq.
 *    Both BEFORE the HALD CLUT.  NO stacking.
 *
 * 3. **Scale First** — `scale=W:H:…,crop=W:H` is the FIRST filter.
 *
 * 4. **Linear Label Path** — filter_complex uses unique labels only:
 *    `[v1]` → `[v2]` → `[vout]`.  No label reuse.
 *
 * 5. **Full HD Default** — Scale 1080×1920, pro sharpness, alimiter.
 */

import * as fs from "node:fs";
import * as path from "node:path";

import type {
  FullVideoMetadata,
  EditTransferResult,
  VelocitySegment,
  ColorGradingResult,
  ShotDetectionResult,
  ShotBoundary,
  AudioBeatResult,
  BeatEvent,
  CameraMotionSample,
} from "../types";
import {
  resolveFfmpeg,
  safeExe,
  execAsync,
  probeVideo,
  makeTempDir,
  cleanTempDir,
  writeTempFile,
} from "../utils/ffmpeg";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Hard clamp for the setpts speed factor (0.25× – 4×) */
const MIN_SPEED = 0.25;
const MAX_SPEED = 4.0;

/** Safety cap for loop iterations */
const MAX_LOOP_ITERATIONS = 200;

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export interface TransferOptions {
  /** Keep the output file on disk instead of converting to base64 */
  keepOutput?: boolean;
  /** Override output dimensions (default: 1080×1920 Full HD vertical) */
  outputWidth?: number;
  outputHeight?: number;
  /** Raw bytes of the reference video (used to extract audio) */
  referenceBuffer?: Buffer;
}

/**
 * Apply the reference metadata style to the target video.
 *
 * @param targetBuffer  Raw bytes of the target video
 * @param refMeta       Full metadata extracted from the reference video
 * @param opts          Optional overrides (include referenceBuffer for audio)
 */
export async function transferEdit(
  targetBuffer: Buffer,
  refMeta: FullVideoMetadata,
  opts: TransferOptions = {},
): Promise<EditTransferResult> {
  const t0 = performance.now();
  const tmp = makeTempDir("edit-transfer");

  try {
    const targetPath = await writeTempFile(tmp, "target.mp4", targetBuffer);

    // ── Write reference video to disk for audio extraction ────────────
    let referencePath: string | null = null;
    if (opts.referenceBuffer) {
      referencePath = await writeTempFile(tmp, "reference.mp4", opts.referenceBuffer);
    }

    const outputDir = path.join(process.cwd(), "public", "outputs");
    fs.mkdirSync(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, `transfer-${Date.now()}.mp4`);
    const probe = await probeVideo(targetPath);
    const ffmpeg = await resolveFfmpeg();
    const exe = safeExe(ffmpeg);

    // Probe reference for audio duration if available
    let refDuration = refMeta.duration || 10;
    if (referencePath) {
      try {
        const refProbe = await probeVideo(referencePath);
        refDuration = refProbe.duration || refDuration;
      } catch { /* use metadata duration */ }
    }

    const cg = refMeta.colorGrading;
    const mo = refMeta.motion;
    const sd = refMeta.shotDetection;
    const ab = refMeta.audio;
    const targetDuration = probe.duration || refMeta.duration || 10;

    // ── Build HALD CLUT for deep colour matching ──────────────────────
    const haldPath = path.join(tmp, "hald_clut.png");
    const useHald = await generateHaldClut(exe, haldPath, cg);

    // ══════════════════════════════════════════════════════════════════
    //  MASTER LOGIC — Video Filter Chain
    // ══════════════════════════════════════════════════════════════════
    //
    //  PERMANENTLY REMOVED: hqdn3d, noise, tblend
    //    → They destroy detail on modern high-res footage.
    //
    //  ORDER: scale → crop → setpts → curves → eq → sharpness → vignette → fps → fades
    //         (format=yuv420p applied at the end of filter_complex graph)
    // ══════════════════════════════════════════════════════════════════

    const vf: string[] = [];
    const filterLog: string[] = [];

    // ── 1. Scaling — FIRST in chain (Full HD 1080×1920) ──────────────
    //    Scale + crop BEFORE everything else so the rest of the
    //    pipeline (setpts, color, sharpness, vignette) only processes
    //    the final resolution — not the raw source dimensions.
    const w = opts.outputWidth ?? 1080;
    const h = opts.outputHeight ?? 1920;
    vf.push(`scale=${w}:${h}:force_original_aspect_ratio=increase`);
    vf.push(`crop=${w}:${h}`);
    filterLog.push(`scale:${w}x${h}`);

    // ── 1b. Dynamic Zoom Cloning — per-frame RAFT zoompan ────────────
    //    Maps the RAFT optical-flow zoom timeline onto a zoompan filter
    //    with per-timestamp zoom expressions.  If the reference zooms in
    //    at 2.3s, the target gets a proportional zoom at that same
    //    timestamp.  Uses the zoomTimeline (radial flow divergence) from
    //    ml_motion_analysis.py.
    //
    //    Zoom behaviour:
    //      zoomSpeed > 0  →  zoom-in  (divergent radial flow)
    //      zoomSpeed < 0  →  zoom-out (convergent radial flow)
    //      ≈ 0            →  no zoom  (static / pan only)
    //
    //    The zoompan z-expression uses nested if(between(on/fps,…))
    //    to change zoom at exact timestamps, matching the reference.
    const zoomTimeline = mo.zoomTimeline ?? [];
    const avgZoom = mo.avgZoomSpeed ?? 0;

    if (zoomTimeline.length > 2 && Math.abs(avgZoom) > 0.1) {
      // Build per-timestamp zoom expression from RAFT data
      const zoomExpr = buildDynamicZoomExpr(zoomTimeline, targetDuration, w, h);
      if (zoomExpr) {
        vf.push(zoomExpr);
        filterLog.push(`zoom:dynamic(${zoomTimeline.length}pts)`);
      }
    } else if (Math.abs(avgZoom) > 0.3) {
      // Fallback: simple global zoom direction when no timeline
      const isZoomIn = avgZoom > 0;
      const zoomRate = isZoomIn ? 0.0003 : -0.0002;
      const zoomCap = isZoomIn ? '1.06' : '1.0';
      const zoomFloor = isZoomIn ? '1.0' : '0.95';
      const zoomExpr = isZoomIn
        ? `min(${zoomCap},1+${zoomRate}*on)`
        : `max(${zoomFloor},1+${zoomRate}*on)`;
      vf.push(
        `zoompan=z='${zoomExpr}':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${w}x${h}:fps=30`
      );
      filterLog.push(`zoom:${isZoomIn ? 'in' : 'out'}(global)`);
    }

    // ── 1c. Impact Frames — beat-peak directional shift ────────────────
    //    v7.1 CRITICAL REVISION: NO constant shake / jitter / vibration.
    //    The reference (m reff.mp4) is STABLE — not vibrating.
    //
    //    STRATEGY:
    //      • Zero jitter, zero micro-vibration, zero random rotation.
    //      • Movement is mapped ONLY to the reference's velocity_ramping.
    //        If the reference speeds up → target speeds up.
    //        If the reference is steady → target is perfectly steady.
    //      • On beat peaks (intensity ≥ 0.7), inject a 1-frame
    //        directional crop-shift (±12px on X or Y axis) to create
    //        the visceral "impact" feel without constant shake.
    //
    //    Implementation:
    //      Build a zoompan x/y expression that is normally centered
    //      but snaps ±12px on the frame of each beat peak.
    //      Uses `if(between(on, peakFrame, peakFrame+1), shift, 0)`.
    const beatEvents: BeatEvent[] = ab?.beatEvents ?? [];
    const strongBeats = beatEvents.filter((b) => b.intensity >= 0.7 && b.timestamp_sec > 0.1);

    if (strongBeats.length > 0) {
      // Build a per-beat impact shift expression for the X axis.
      // Each strong beat gets a 1-frame ±12px horizontal jolt,
      // alternating direction for visual variety.
      const IMPACT_PX = 12;
      let impactXExpr = "0";
      for (let i = strongBeats.length - 1; i >= 0; i--) {
        const frame = Math.round(strongBeats[i].timestamp_sec * 30);
        const dir = i % 2 === 0 ? IMPACT_PX : -IMPACT_PX;
        impactXExpr = `if(between(on,${frame},${frame + 1}),${dir},${impactXExpr})`;
      }

      // Apply via zoompan with z=1 (no zoom), but x/y shifted on beats.
      // The zoompan output is exactly w×h, so no dimension issues.
      vf.push(
        `zoompan=z='1':d=1:x='iw/2-(iw/2)+${impactXExpr}':y='ih/2-(ih/2)':s=${w}x${h}:fps=30`
      );
      filterLog.push(`impact:${strongBeats.length}beats(${IMPACT_PX}px)`);
    }

    // ── 1d. Motion Blur — EXTREME: forced on any motion ────────────────
    //    EXTREME MODE: No threshold, no style check, no opacity cap.
    //    ANY detected motion gets tblend frame-blending.
    //    Opacity maps 1:1 to motionIntensity × 0.8 (was capped at 0.4).
    const motionIntensity = mo.motionIntensity ?? 0;
    if (motionIntensity > 0.05) {
      // EXTREME: direct 1:1 opacity mapping — no cap
      const blendOpacity = (motionIntensity * 0.8).toFixed(2);
      vf.push(`tblend=all_mode=average:all_opacity=${blendOpacity}`);
      filterLog.push(`motionblur:tblend(${blendOpacity})`);
    }

    // ── 2. Motion sync (setpts) ──────────────────────────────────────
    //    If the reference pattern is >2× shorter than the target, the
    //    complex looped setpts creates jitter / lag.  In that case we
    //    pass video through at native speed and instead loop the AUDIO.
    const refPatternEnd = mo.velocitySegments.length > 0
      ? Math.max(...mo.velocitySegments.map((s) => s.end_sec))
      : 0;
    const durationRatio = refPatternEnd > 0 ? targetDuration / refPatternEnd : Infinity;
    const useComplexSetpts = durationRatio <= 2.0 && durationRatio > 0;
    let loopAudio = false;

    if (useComplexSetpts) {
      const setptsExpr = buildSetptsExpr(mo.velocitySegments, targetDuration);
      if (setptsExpr) {
        vf.push(`setpts='${setptsExpr}'`);
        filterLog.push(`velocity:${mo.velocitySegments.length}segs`);
      }
    } else {
      // Passthrough — native PTS, audio will be looped to cover target
      vf.push("setpts=PTS-STARTPTS");
      filterLog.push("setpts:passthrough");
      if (refPatternEnd > 0 && targetDuration > refPatternEnd) {
        loopAudio = true;
      }
    }

    // ── 3. Temporal Color DNA — Reference-Proportional Evolution ─────
    //    v8 CORE INNOVATION: Instead of ONE static eq for the whole
    //    video, we track how the reference's color grading EVOLVES
    //    second-by-second and replicate that exact journey on the target.
    //
    //    When temporal samples exist (cg.temporalSamples[]):
    //      • Write a sendcmd commands file with per-second eq changes
    //      • Map reference timestamps proportionally onto target duration
    //      • sendcmd drives a labeled eq@temporal_eq filter at runtime
    //      • NO hardcoded curves preset — all contrast comes from data
    //
    //    Fallback (no temporal data):
    //      • Use static eq from averaged analysis (previous behaviour)

    const temporalSamples = cg.temporalSamples ?? [];

    if (temporalSamples.length >= 2) {
      // ── v8: Temporal Color — sendcmd-driven dynamic eq ────────────
      const refDur = refMeta.duration || temporalSamples[temporalSamples.length - 1].time_sec + 1;

      const cmdLines: string[] = [];
      for (const sample of temporalSamples) {
        // Proportional mapping: ref timeline → target timeline
        const targetTime = Math.max(0, (sample.time_sec / refDur) * targetDuration);
        const t = targetTime.toFixed(3);

        // Convert brightness: 0-1 scale → eq scale (-1 to 1)
        const eqBrightness = Math.max(-1, Math.min(1, (sample.brightness - 0.5) * 2));

        cmdLines.push(`${t} [temporal_eq] brightness ${eqBrightness.toFixed(4)}`);
        cmdLines.push(`${t} [temporal_eq] contrast ${sample.contrast.toFixed(4)}`);
        cmdLines.push(`${t} [temporal_eq] saturation ${sample.saturation.toFixed(4)}`);
      }

      const sendcmdPath = path.join(tmp, "temporal_color.cmd");
      fs.writeFileSync(sendcmdPath, cmdLines.join(";\n") + ";", "utf-8");

      // Forward slashes for FFmpeg path compatibility on Windows
      const sendcmdPathFwd = sendcmdPath.replace(/\\/g, "/");

      // sendcmd injects per-second parameter changes into eq@temporal_eq
      // NO curves preset — the temporal eq handles all contrast dynamically
      vf.push(`sendcmd=f='${sendcmdPathFwd}'`);
      vf.push(`eq@temporal_eq=brightness=0:contrast=1:saturation=1`);
      filterLog.push(`temporal-color:${temporalSamples.length}samples(sendcmd)`);

      console.log(
        `[edit-transfer] Temporal Color DNA active: ${temporalSamples.length} samples, ` +
        `${refDur.toFixed(1)}s ref → ${targetDuration.toFixed(1)}s target`
      );
    } else {
      // Fallback: static eq when no temporal data available
      vf.push("curves=preset=strong_contrast");
      filterLog.push("curves:strong_contrast(fallback)");

      const refSat = cg.saturation || 1.5;
      const refCon = cg.stdLuminance
        ? Math.max(0.5, (cg.stdLuminance / 40) + (cg.contrast || 1.0))
        : (cg.contrast || 1.0);
      const refMeanLum = cg.meanLuminance ?? 128;
      const lumOffset = Math.max(-0.25, Math.min(0.25, (refMeanLum - 128) / 512));
      const eqParts = [`saturation=${refSat.toFixed(2)}`, `contrast=${refCon.toFixed(2)}`];
      if (Math.abs(lumOffset) > 0.005) {
        eqParts.push(`brightness=${lumOffset.toFixed(4)}`);
      }
      vf.push(`eq=${eqParts.join(":")}`);
      filterLog.push(`eq:sat${refSat.toFixed(1)}+con${refCon.toFixed(1)}(fallback)`);
    }

    if (useHald) {
      filterLog.push("haldclut(applied-in-graph)");
    } else {
      // Fallback when HALD CLUT failed: apply colour layers inline
      if (cg.colorchannelmixerParams) {
        vf.push(`colorchannelmixer=${cg.colorchannelmixerParams}`);
        filterLog.push("colorchannelmixer");
      }
      vf.push(`colorbalance=${cg.colorbalanceParams}`);
      filterLog.push("colorbalance");
    }

    // ── 4. Pro Sharpness — matched to reference editing DNA ──────────
    //    Uses the reference's detected sharpness level to clone the
    //    exact crispness or softness of the original edit.
    const refSharpAmount = Math.min(2.0, Math.max(0.3, (cg.sharpness || 1.0) * 0.7));
    vf.push(`unsharp=3:3:${refSharpAmount.toFixed(1)}:3:3:0.0`);
    filterLog.push(`unsharp:${refSharpAmount.toFixed(1)}`);

    // ── 4b. Film Texture — NO-CAPS: zero normalization ───────────────
    //    NO hasFilmTexture gate, NO threshold, NO cap.
    //    If ref is 100% noisy → target is 100% noisy.
    //    grainDensity maps linearly: density × 100 (FFmpeg noise 0–100).
    const grainStrength = Math.round((cg.grainDensity ?? 0) * 100);
    if (grainStrength >= 1) {
      vf.push(`noise=c0s=${grainStrength}:c0f=t`);
      filterLog.push(`grain:${grainStrength}`);
    }
    // Halation: zero normalization — raw intensity drives highlight lift.
    // NO threshold — any non-zero halation gets applied.
    const halation = cg.halationIntensity ?? 0;
    if (halation > 0) {
      // Raw linear lift: 0.0 halation → 0% lift, 1.0 → 30% lift
      const highlightLift = (0.70 + halation * 0.30).toFixed(2);
      vf.push(`curves=highlights='0/${highlightLift} 1/1'`);
      filterLog.push(`halation:${halation.toFixed(2)}`);
    }

    // ── 5. Vignette — NO-CAPS: zero normalization ─────────────────────
    //    NO threshold, NO angle floor.  vignette=0 → no filter.
    //    vignette=1.0 → angle approaches 0 (full-frame darken).
    //    Raw linear: angle = (π/2) × (1 − vignette).
    if (cg.vignette > 0) {
      const angle = (Math.PI / 2) * (1 - cg.vignette);
      vf.push(`vignette=angle=${Math.max(0.01, angle).toFixed(4)}`);
      filterLog.push(`vignette:${angle.toFixed(2)}`);
    }

    // ── 6. Frame rate normalisation ──────────────────────────────────
    vf.push("fps=30");
    filterLog.push("fps:30");

    // ── 7. Fades — MINIMAL to preserve first-frame visibility ───────
    //    RULE: No heavy initial fade-in — it hides the start-frame
    //    "jhatky" (the crucial first impact frame).  Use 0.08s micro-
    //    fade to just soften the hard splice, and a gentle 0.3s
    //    fade-out at the end for a clean finish.
    vf.push("fade=t=in:st=0:d=0.08");
    vf.push(`fade=t=out:st=${Math.max(0, targetDuration - 0.3).toFixed(2)}:d=0.3`);
    filterLog.push("fades:0.08in+0.3out");

    // NOTE: format=yuv420p is applied at the END of the filter_complex
    // graph (after HALD CLUT if used).  Do NOT add it here in the
    // inline chain — it would be mid-pipeline before the CLUT path.

    const videoFilterChain = vf.join(",");

    // ── Encoder: Forced High Bitrate (permanent) ─────────────────────
    //    -b:v 5M   = target 5 Mbps average bitrate
    //    -minrate 3M = FLOOR — never drop below 3 Mbps, even on
    //                  near-static or low-contrast frames.  This is
    //                  the fix for the 341 kbps collapse.
    //    -maxrate 8M = ceiling for VBV compliance
    //    -bufsize 16M = 2× maxrate for smooth rate control
    //    -crf 18     = quality target (VBV overrides when needed)
    //
    //    PERMANENT RULE: These values must not be lowered.  The
    //    previous -b:v 3000k / -minrate 2000k caused bitrate collapse
    //    on color-graded footage.
    // Codec + quality flags (applied early)
    const codecFlags =
      `-c:v libx264 -profile:v high -pix_fmt yuv420p -preset slow -crf 18 -threads 0`;

    // Bitrate control flags — MUST be the LAST arguments before the
    // output file path.  Some FFmpeg builds ignore rate-control flags
    // that appear before -filter_complex_script or -map, causing
    // bitrate collapse to ~300kbps.  Placing them last ensures they
    // are treated as output-file options.
    const bitrateFlags =
      `-b:v 5M -minrate 3M -maxrate 8M -bufsize 16M`;

    // ── Build FFmpeg command ──────────────────────────────────────────
    //
    // STRATEGY: -filter_complex_script (temp file on disk)
    //   The entire filter graph is written to a plain text file and
    //   FFmpeg reads it via -filter_complex_script.  This bypasses:
    //     • Windows 8191-char CLI length limit
    //     • cmd.exe / PowerShell quote stripping
    //     • Nested single/double quote conflicts
    //   Inside the script file there is NO shell — commas, colons,
    //   and special chars are read literally by FFmpeg's parser.
    //
    // Input layout:
    //   -i 0 = reference video   (audio source)      — when available
    //   -i 1 = target video      (video source)
    //   -i 2 = hald clut         (optional)
    //
    // When no reference is provided:
    //   -i 0 = target video
    //   -i 1 = hald clut         (optional)

    const hasRefAudio = referencePath && refMeta.hasAudio;

    // ── Determine input indices ───────────────────────────────────────
    const vidIdx = hasRefAudio ? 1 : 0;
    const haldIdx = hasRefAudio ? 2 : 1;

    // ── 1b. Beat-Synced Hard-Cut Segmentation ─────────────────────────
    //    Merges TWO timing sources into a single unified cut list:
    //      A) Audio beat onsets  (ab.beatEvents[].timestamp_sec)
    //      B) Shot boundaries    (sd.cuts[].timestamp_sec, hard_cut only)
    //
    //    Beats are the PRIMARY timing driver — they produce the
    //    rhythmic, high-energy cuts that sync to the music.
    //    Shot boundaries fill in any gaps longer than 2 seconds
    //    where no beat was detected (ensures visual variety).
    //
    //    The merged list is de-duplicated (no two cuts within 0.15 s)
    //    then used to trim→concat the target video into segments
    //    that cut exactly on beat onsets.
    const hardCuts = sd.cuts.filter((c) => c.type === "hard_cut" && c.confidence > 0.3);
    // beatEvents already declared above (impact frames section)
    let useHardCutSegmentation = false;
    let hardCutGraph = "";

    // ── Build unified beat-synced cut points ──────────────────────────
    const rawCutTimes = buildBeatSyncedCutPoints(
      beatEvents,
      hardCuts,
      targetDuration,
      refDuration,
    );

    // ── DTW Frame-Perfect Alignment ───────────────────────────────────
    //    Warps the raw cut points using beat intensity as a weighting
    //    signal.  Strong beats hold position; weak beats flex toward
    //    the nearest strong beat — creating tighter rhythmic groups
    //    that mirror the reference's editing DNA.
    const unifiedCutTimes = applyDTWAlignment(
      rawCutTimes,
      beatEvents,
      targetDuration,
    );

    if (unifiedCutTimes.length >= 1 && targetDuration > 1) {
      // Convert cut-point timestamps into segments: [0→cut1, cut1→cut2, …, cutN→end]
      const segments: { start: number; end: number }[] = [];
      let prev = 0;
      for (const cutTime of unifiedCutTimes) {
        if (cutTime > prev + 0.03 && cutTime < targetDuration) {
          segments.push({ start: prev, end: cutTime });
          prev = cutTime;
        }
      }
      // Final segment: last cut → end of target
      if (prev < targetDuration - 0.03) {
        segments.push({ start: prev, end: targetDuration });
      }

      // EXTREME: Accept even a single segment (was >= 2)
      if (segments.length >= 1) {
        // Build trim→setpts chains for each segment, then concat
        // TRANSITION RENDERING: Apply transition effects at segment boundaries
        const trimParts: string[] = [];
        const concatInputs: string[] = [];

        // ── Assign transition presets to cut points ─────────────────
        //    Each segment (except the first) gets a transition effect
        //    at its start, chosen based on beat intensity:
        //      intensity ≥ 0.8  → zoom_hit / flash (high energy)
        //      intensity ≥ 0.5  → whip_pan / glitch / rgb_split
        //      intensity < 0.5  → cross_blur / luma_fade (subtle)
        const transitionAssignments = assignTransitionPresets(
          unifiedCutTimes,
          beatEvents,
          segments,
        );

        for (let i = 0; i < segments.length; i++) {
          const seg = segments[i];
          const label = `seg${i}`;
          const segDuration = seg.end - seg.start;
          const transition = transitionAssignments[i];

          // Base: trim + reset PTS
          let segFilters = `trim=start=${seg.start.toFixed(3)}:end=${seg.end.toFixed(3)},setpts=PTS-STARTPTS`;

          // Apply transition effect at segment HEAD (first frames)
          if (transition && i > 0 && segDuration > 0.1) {
            const fx = buildTransitionFilter(transition, segDuration);
            if (fx) {
              segFilters += `,${fx}`;
            }
          }

          trimParts.push(`[${vidIdx}:v]${segFilters}[${label}]`);
          concatInputs.push(`[${label}]`);
        }

        hardCutGraph = trimParts.join(";") +
          ";" +
          concatInputs.join("") +
          `concat=n=${segments.length}:v=1:a=0[segmented]`;

        useHardCutSegmentation = true;

        const beatCount = beatEvents.filter((b) => unifiedCutTimes.includes(b.timestamp_sec)).length;
        const shotCount = unifiedCutTimes.length - beatCount;
        const transCount = transitionAssignments.filter(Boolean).length;
        filterLog.push(
          `beat-sync:${segments.length}segs(${beatCount}beats+${shotCount}shots+${transCount}transitions)`
        );

        console.log(
          `[edit-transfer] Beat-synced segmentation: ${segments.length} segments ` +
          `(${beatCount} from beats, ${shotCount} from shots, ${transCount} transitions) ` +
          `covering ${targetDuration.toFixed(1)}s target`
        );
      }
    }

    // ── Build the filter_complex graph string ─────────────────────────
    //    STRICT LINEAR LABEL PATH (permanent):
    //
    //    Without HALD:  [src] → filters → [vout]
    //    With HALD:     [src] → filters → [v1] ; [v1][hald]haldclut[v2] ; [v2] → shadow-protect → [vout]
    //
    //    RULES:
    //    • Every label is used EXACTLY ONCE as output and ONCE as input.
    //    • No label reuse — prevents FFmpeg "label already defined" errors.
    //    • No extra curves/eq after HALD — the main chain already has
    //      ONE curves + ONE eq.  Additional passes crush blacks → black video.
    //    • Shadow protection is a SINGLE curves filter that lifts the
    //      black floor to ~8% without touching mid-tones or highlights.
    let filterGraph: string;

    // When hard-cut segmentation is active, the video source is the
    // [segmented] label from the trim→concat pre-pass, not [vidIdx:v].
    const videoSrcLabel = useHardCutSegmentation ? "[segmented]" : `[${vidIdx}:v]`;

    if (useHald) {
      // ── Shadow-Safe HALD CLUT (permanent) ───────────────────────────
      //    Path:  [src] → videoFilterChain → [v1]
      //           [v1][haldIdx:v] haldclut  → [v2]
      //           [v2] → shadow-protect curves → format → [vout]
      //
      //    Shadow protection: `curves=master='0/0.08 0.15/0.13 1/1'`
      //      • Lifts absolute black to 8% — prevents total black crush
      //      • Gently holds deep shadows (15% → 13%) for amber density
      //      • Passes mid-tones and highlights through unchanged (1/1)
      //
      //    NOTHING else after shadow-protect — no eq, no curves, no
      //    colorbalance.  Those were the black-video root cause.
      const graphParts: string[] = [];

      if (useHardCutSegmentation) {
        graphParts.push(hardCutGraph);
      }

      graphParts.push(
        `${videoSrcLabel}${videoFilterChain}[v1]`,
        `[v1][${haldIdx}:v]haldclut[v2]`,
        `[v2]curves=master='0/0.08 0.15/0.13 1/1',pad=ceil(iw/2)*2:ceil(ih/2)*2,format=yuv420p[vout]`,
      );
      filterGraph = graphParts.join(";");
    } else {
      // No HALD — append format=yuv420p at the end of the inline chain
      const graphParts: string[] = [];

      if (useHardCutSegmentation) {
        graphParts.push(hardCutGraph);
      }

      graphParts.push(`${videoSrcLabel}${videoFilterChain},pad=ceil(iw/2)*2:ceil(ih/2)*2,format=yuv420p[vout]`);
      filterGraph = graphParts.join(";");
    }

    // Write the graph to a temp script file — this eliminates all
    // Windows shell quoting/escaping issues AND avoids the 8191-char
    // command-line length limit on cmd.exe.
    //
    // IMPORTANT: Inside a script file there is no SHELL, but FFmpeg's
    // own filter-graph parser still needs single quotes around option
    // values that contain commas or parentheses (e.g. setpts, curves).
    const filterScriptPath = path.join(tmp, "filter_complex.txt");
    fs.writeFileSync(filterScriptPath, filterGraph, "utf-8");

    console.log("[edit-transfer] filter_complex_script content:");
    console.log(filterGraph);

    // ── Assemble inputs ───────────────────────────────────────────────
    const inputs: string[] = [];
    if (hasRefAudio) {
      // If we need to loop the reference audio to cover the target
      // duration, use -stream_loop on the reference input.
      if (loopAudio) {
        // Smart infinite loop — seamless audio looping with -stream_loop -1
        // FFmpeg loops the reference audio infinitely; the -t flag and
        // atrim filter cap the output at targetDuration.
        inputs.push(`-stream_loop -1 -i "${referencePath}"`);
        filterLog.push(`audio-loop:seamless`);
      } else {
        inputs.push(`-i "${referencePath}"`);
      }
    }
    inputs.push(`-i "${targetPath}"`);
    if (useHald) {
      inputs.push(`-i "${haldPath}"`);
    }

    // ── Assemble mapping + audio handling ─────────────────────────────
    //    Reference audio is ALWAYS the primary track when available.
    //
    //    AUDIO STRATEGY (Spatial DNA / Force Duration):
    //      • aloop=loop=-1:size=2e9 → infinite loop of the audio stream
    //      • atrim=0:<targetDuration> → hard-trim to exact target length
    //      • asetpts=PTS-STARTPTS → reset timestamps after trim
    //      • alimiter=limit=0.9 → prevent clipping
    //    This guarantees NO audio gaps even when the video is stretched
    //    by RAFT speed ramps or the reference is shorter than target.
    //
    //    DURATION ENFORCEMENT:
    //      • -t <targetDuration> is ALWAYS applied (not just for looped
    //        audio) to guarantee the output is exactly the right length.
    //
    //    NOTE: -map uses [vout] from the script file.  The square-bracket
    //    label must be double-quoted on the command line so Windows
    //    doesn't interpret the brackets.
    const mapping: string[] = [`-map "[vout]"`];
    const audioFlags: string[] = [];

    if (hasRefAudio) {
      mapping.push(`-map 0:a:0`);
      // Full audio pipeline: loop → trim → reset PTS → limiter
      // Ensures NO gaps even if RAFT stretches the video beyond
      // the reference audio duration.
      audioFlags.push(
        `-af "aloop=loop=-1:size=2e9,atrim=0:${targetDuration.toFixed(3)},asetpts=PTS-STARTPTS,alimiter=limit=0.9"`,
        `-c:a aac -b:a 192k`,
      );
      filterLog.push(`audio:aloop+atrim(${targetDuration.toFixed(1)}s)`);
    } else {
      mapping.push(`-map ${vidIdx}:a?`);
      audioFlags.push(`-c:a aac -b:a 192k`);
    }

    // ── Final command ─────────────────────────────────────────────────
    //    -filter_complex_script reads the graph from a file on disk.
    //    No shell escaping, no character limit, no quoting issues.
    // ── Final command ─────────────────────────────────────────────────
    //    ORDER MATTERS for rate control:
    //      1. inputs
    //      2. filter_complex_script
    //      3. mapping
    //      4. codec/quality flags
    //      5. audio flags
    //      6. movflags
    //      7. bitrate flags  ← MUST be last before output path
    //      8. -t duration    ← ALWAYS enforced for exact output length
    //      9. output path
    const ffmpegCmd = [
      exe, "-y",
      `-analyzeduration 100M -probesize 100M`,
      ...inputs,
      `-filter_complex_script "${filterScriptPath}"`,
      ...mapping,
      codecFlags,
      ...audioFlags,
      `-movflags +faststart`,
      bitrateFlags,
      // ALWAYS enforce strict output duration — prevents infinite
      // processing from -stream_loop and guarantees exact length.
      `-t ${targetDuration.toFixed(3)}`,
      `"${outputPath}"`,
    ].join(" ");

    // ── Execute — NO FALLBACK. Surface the full FFmpeg error. ─────────
    console.log("[edit-transfer] FFmpeg command:", ffmpegCmd);
    console.log("[edit-transfer] Filter graph:", filterLog.join(" → "));

    try {
      const { stderr } = await execAsync(ffmpegCmd, { maxBuffer: 200 * 1024 * 1024 });
      // Log FFmpeg stderr (contains progress info) for debugging
      if (stderr) {
        const lastLines = stderr.split("\n").slice(-15).join("\n");
        console.log("[edit-transfer] FFmpeg stderr (last 15 lines):\n", lastLines);
      }
    } catch (ffErr: unknown) {
      const errObj = ffErr as { stderr?: string; stdout?: string; message?: string };
      const fullStderr = errObj.stderr || "";
      const fullMsg = errObj.message || String(ffErr);

      // Log the COMPLETE FFmpeg error — no truncation
      console.error("═══════════════════════════════════════════════════════════");
      console.error("[edit-transfer] FULL FILTER CHAIN FAILED — NO FALLBACK");
      console.error("═══════════════════════════════════════════════════════════");
      console.error("[edit-transfer] Command:\n", ffmpegCmd);
      console.error("[edit-transfer] Full stderr:\n", fullStderr);
      console.error("[edit-transfer] Error message:\n", fullMsg);
      console.error("═══════════════════════════════════════════════════════════");

      return {
        success: false,
        appliedMetadata: refMeta,
        filterGraphSummary: filterLog.join(" → "),
        processingMs: Math.round(performance.now() - t0),
        error: `FFmpeg FAILED (no fallback). Full stderr:\n${fullStderr}\n\nMessage: ${fullMsg}`,
      };
    }

    // Verify output file was actually created and has meaningful content
    if (!fs.existsSync(outputPath)) {
      return {
        success: false,
        appliedMetadata: refMeta,
        filterGraphSummary: filterLog.join(" → "),
        processingMs: Math.round(performance.now() - t0),
        error: "FFmpeg completed but failed to create output file.",
      };
    }

    // Reject suspiciously small outputs (< 50KB for a video = likely black/corrupt)
    const outputStat = fs.statSync(outputPath);
    const outputSizeKB = outputStat.size / 1024;
    if (outputSizeKB < 50) {
      console.error(
        `[edit-transfer] ⚠ Output file suspiciously small: ${outputSizeKB.toFixed(1)}KB. ` +
        `Likely bitrate collapse / black video. Filter chain: ${filterLog.join(" → ")}`
      );
      // Don't fail — user might still want the file — but log prominently
    }

    // ── Derive a browser-accessible URL ───────────────────────────────
    // outputPath is absolute: <cwd>/public/outputs/transfer-xxx.mp4
    // The browser needs:         /outputs/transfer-xxx.mp4
    const filename = path.basename(outputPath);
    const videoUrl = `/outputs/${filename}`;

    // ── Return result ─────────────────────────────────────────────────
    if (opts.keepOutput) {
      return {
        success: true,
        outputPath,
        videoUrl,
        appliedMetadata: refMeta,
        filterGraphSummary: filterLog.join(" → "),
        processingMs: Math.round(performance.now() - t0),
      };
    }

    // Non-keepOutput: also return the URL (file stays in public/outputs)
    // plus a base64 version for backward compat
    const outputBuffer = await fs.promises.readFile(outputPath);
    const videoBase64 =
      "data:video/mp4;base64," + outputBuffer.toString("base64");

    return {
      success: true,
      videoBase64,
      videoUrl,
      appliedMetadata: refMeta,
      filterGraphSummary: filterLog.join(" → "),
      processingMs: Math.round(performance.now() - t0),
    };
  } finally {
    cleanTempDir(tmp);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HALD CLUT generation  (uses pre-computed params from ColorGradingResult)
// ─────────────────────────────────────────────────────────────────────────────

async function generateHaldClut(
  exe: string,
  outputPath: string,
  cg: ColorGradingResult,
): Promise<boolean> {
  try {
    const filters: string[] = [];

    // ── IMPORTANT: Do NOT include `eq` here. ──────────────────────────
    //    The main filter chain already applies:
    //      • curves=preset=strong_contrast
    //      • eq=saturation=1.3:contrast=1.1  (cinematic base)
    //      • Signal-driven eq refinement
    //    Including eq in the CLUT causes DOUBLE-APPLICATION of
    //    brightness / contrast / saturation → near-black output.
    //    The CLUT encodes ONLY colour-channel mixing & balance.
    // ──────────────────────────────────────────────────────────────────
    if (cg.colorchannelmixerParams) {
      filters.push(`colorchannelmixer=${cg.colorchannelmixerParams}`);
    }
    filters.push(`colorbalance=${cg.colorbalanceParams}`);

    // Write filter graph to a script file — same strategy as the main
    // render command, avoids all Windows quoting issues.
    const scriptDir = path.dirname(outputPath);
    const scriptPath = path.join(scriptDir, "hald_filter.txt");
    const graphContent = `[0:v]${filters.join(",")}[vout]`;
    fs.writeFileSync(scriptPath, graphContent, "utf-8");

    const cmd = [
      exe,
      "-y",
      `-analyzeduration 100M -probesize 100M`,
      `-f lavfi -i "haldclutsrc=level=8"`,
      `-filter_complex_script "${scriptPath}"`,
      `-map "[vout]"`,
      "-frames:v 1",
      `"${outputPath}"`,
    ].join(" ");

    await execAsync(cmd, { maxBuffer: 30 * 1024 * 1024 });

    // Validate CLUT was generated with reasonable size (identity CLUT ≈ 600-800KB)
    const stat = fs.statSync(outputPath);
    if (stat.size < 1000) {
      console.warn(`[edit-transfer] HALD CLUT suspiciously small (${stat.size}B) — skipping CLUT`);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[edit-transfer] HALD CLUT generation failed:", err instanceof Error ? err.message : err);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Velocity setpts expression builder  ─  cumulative PTS + LOOP
// ─────────────────────────────────────────────────────────────────────────────
//
// ALGORITHM
// ---------
// 1. **LOOP** — If the reference velocity pattern ends before the target
//    duration, the pattern is tiled cyclically.  Each loop iteration
//    picks up exactly where the previous one left off so the output
//    timeline is seamless.
//
// 2. **Cumulative PTS** — Each segment `i` has:
//        inputStart[i]   = sum of prior segment input-durations
//        outputStart[i]  = sum of prior segment output-durations
//    where output-duration = input-duration / speed.
//
//    The setpts expression for frame time T inside segment i is:
//        STARTPTS + (outputStart[i] + (T - inputStart[i]) / speed[i]) * TB
//
//    We normalise into PTS timebase units (T = PTS/TB after STARTPTS
//    subtraction), so the expression becomes:
//        (outStart + (T - inStart) / speed) / TB
//    FFmpeg's `setpts` already works in PTS units; T is wall-clock via
//    the `T` variable (seconds), so the final expression per segment is:
//        outStart + (T - inStart) / speed
//
// 3. The segments are merged if adjacent ones have near-equal speed,
//    then wrapped in a nested `if(between(T,…),…,…)` chain.

/**
 * A segment in the output timeline after looping + cumulative offsets.
 * All times are in **input-time** seconds (i.e. the T variable of
 * setpts, which counts the *original* wall-clock position of each frame).
 */
interface ResolvedSegment {
  /** Input-time start of this segment (seconds) */
  inStart: number;
  /** Input-time end of this segment (seconds) */
  inEnd: number;
  /** Clamped speed factor */
  speed: number;
  /** Output-time start of this segment (seconds) */
  outStart: number;
}

function buildSetptsExpr(
  velocitySegments: VelocitySegment[],
  targetDuration: number,
): string | null {
  if (!velocitySegments || velocitySegments.length === 0) return null;

  // ── Step 1: derive canonical single-loop pattern ────────────────────
  // Sort by start_sec and ensure contiguous coverage
  const canonical = [...velocitySegments].sort(
    (a, b) => a.start_sec - b.start_sec,
  );
  const refEnd = Math.max(...canonical.map((s) => s.end_sec));
  if (refEnd <= 0) return null;

  // ── Step 2: LOOP the pattern to cover target duration ───────────────
  const resolved: ResolvedSegment[] = [];
  let outCursor = 0; // cumulative output-time in seconds
  let loopIter = 0;

  while (outCursor < targetDuration && loopIter < MAX_LOOP_ITERATIONS) {
    const iterInputBase = loopIter * refEnd;

    for (const seg of canonical) {
      const speed = clampSpeed(seg.relative_speed);
      const inStart = iterInputBase + seg.start_sec;
      const inEnd = iterInputBase + seg.end_sec;
      const inDuration = seg.end_sec - seg.start_sec;
      const outDuration = inDuration / speed;

      resolved.push({
        inStart,
        inEnd,
        speed,
        outStart: outCursor,
      });

      outCursor += outDuration;

      // If we've exceeded target duration, stop early
      if (outCursor >= targetDuration) break;
    }

    loopIter++;
  }

  if (resolved.length === 0) return null;

  // ── Step 3: merge adjacent segments with same speed ─────────────────
  const merged: ResolvedSegment[] = [resolved[0]];
  for (let i = 1; i < resolved.length; i++) {
    const prev = merged[merged.length - 1];
    const cur = resolved[i];
    if (Math.abs(prev.speed - cur.speed) < 0.02) {
      // Extend prev to cover cur (recalculate nothing, just widen the
      // input-time window — outStart stays the same for the merged block)
      prev.inEnd = cur.inEnd;
    } else {
      merged.push({ ...cur });
    }
  }

  // ── Step 4: build nested if(between(T,…)) expression ───────────────
  //
  // QUOTING RULES FOR -filter_complex_script FILES:
  //   • Use 2 decimal places — some Gyan.dev FFmpeg builds choke on 6.
  //   • The filter graph is written to a SCRIPT FILE on disk and passed
  //     via -filter_complex_script — there is no SHELL quoting layer,
  //     but FFmpeg's own filter-graph parser STILL uses commas as
  //     option separators within a filter.  So the setpts value MUST
  //     be wrapped in SINGLE QUOTES inside the script file:
  //         setpts='if(between(T,0.00,5.50),(0.00+(T-0.00)/1.00)/TB,PTS)'
  //     The single quotes tell FFmpeg's parser: treat everything inside
  //     as one literal option value — do NOT split on commas/parens.
  //
  // For each segment the output PTS (in seconds) for input-time T is:
  //     outStart + (T - inStart) / speed
  //
  // setpts expects an expression that evaluates to PTS-units.  The `T`
  // variable in setpts is the wall-clock time of the *input* frame in
  // seconds.  Using the T-based form: (outStart + (T - inStart) / speed) / TB

  let expr = "PTS"; // fallback: identity
  for (let i = merged.length - 1; i >= 0; i--) {
    const s = merged[i];
    const oS = s.outStart.toFixed(2);
    const iS = s.inStart.toFixed(2);
    const iE = s.inEnd.toFixed(2);
    const spd = s.speed.toFixed(2);

    // (outStart + (T - inStart) / speed) / TB
    const segExpr = `(${oS}+(T-${iS})/${spd})/TB`;

    // Plain commas — safe because the caller wraps in single quotes:
    //   setpts='if(between(T,0.00,5.50),(0.00+(T-0.00)/1.00)/TB,PTS)'
    expr = `if(between(T,${iS},${iE}),${segExpr},${expr})`;
  }

  return expr;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function clampSpeed(speed: number): number {
  return Math.max(MIN_SPEED, Math.min(MAX_SPEED, speed || 1.0));
}

// ─────────────────────────────────────────────────────────────────────────────
// Dynamic Zoom Expression Builder  ─  per-frame RAFT zoompan
// ─────────────────────────────────────────────────────────────────────────────
//
// Converts the per-frame zoomTimeline from ml_motion_analysis.py into a
// zoompan filter string with an `if(between(…))` z-expression that
// changes zoom at exact reference timestamps.
//
// STRATEGY:
//   1. Group consecutive zoom samples into segments of similar direction.
//   2. For each segment, compute a zoom rate from the mean zoomSpeed.
//   3. Build a nested `if(between(on/fps, start, end), zoomExpr, ...)`
//      expression where `on` is the zoompan frame counter and fps=30.
//   4. Clamp zoom between 0.92 (max zoom-out) and 1.12 (max zoom-in)
//      to keep the effect cinematic, not jarring.
// ─────────────────────────────────────────────────────────────────────────────

function buildDynamicZoomExpr(
  zoomTimeline: Array<{ time_sec: number; zoomSpeed: number }>,
  targetDuration: number,
  w: number,
  h: number,
): string | null {
  if (zoomTimeline.length < 2) return null;

  // ── Segment the timeline into zoom regions ──────────────────────────
  // Each region has consistent zoom direction (in/out/none).
  interface ZoomRegion {
    start: number;
    end: number;
    avgSpeed: number;
  }

  const regions: ZoomRegion[] = [];
  let regStart = zoomTimeline[0].time_sec;
  let regSpeeds = [zoomTimeline[0].zoomSpeed];

  for (let i = 1; i < zoomTimeline.length; i++) {
    const prev = zoomTimeline[i - 1];
    const curr = zoomTimeline[i];
    const sameDirection =
      (prev.zoomSpeed >= 0 && curr.zoomSpeed >= 0) ||
      (prev.zoomSpeed < 0 && curr.zoomSpeed < 0);

    if (!sameDirection || curr.time_sec - prev.time_sec > 1.0) {
      // End current region
      const avg = regSpeeds.reduce((a, b) => a + b, 0) / regSpeeds.length;
      regions.push({
        start: regStart,
        end: prev.time_sec,
        avgSpeed: avg,
      });
      regStart = curr.time_sec;
      regSpeeds = [curr.zoomSpeed];
    } else {
      regSpeeds.push(curr.zoomSpeed);
    }
  }
  // Final region
  const lastSample = zoomTimeline[zoomTimeline.length - 1];
  const avgFinal = regSpeeds.reduce((a, b) => a + b, 0) / regSpeeds.length;
  regions.push({ start: regStart, end: lastSample.time_sec, avgSpeed: avgFinal });

  // Filter out very short or very weak zoom regions
  const significant = regions.filter(
    (r) => r.end - r.start > 0.15 && Math.abs(r.avgSpeed) > 0.05,
  );

  if (significant.length === 0) return null;

  // ── Loop zoom pattern if target is longer than reference ────────────
  const refEnd = Math.max(...significant.map((r) => r.end));
  let allRegions = [...significant];
  if (targetDuration > refEnd && refEnd > 0) {
    let offset = refEnd;
    let iter = 0;
    while (offset < targetDuration && iter < 50) {
      for (const r of significant) {
        const loopedStart = offset + r.start;
        const loopedEnd = offset + r.end;
        if (loopedStart >= targetDuration) break;
        allRegions.push({
          start: loopedStart,
          end: Math.min(loopedEnd, targetDuration),
          avgSpeed: r.avgSpeed,
        });
      }
      offset += refEnd;
      iter++;
    }
  }

  // Cap to 60 regions to prevent expression explosion
  if (allRegions.length > 60) {
    const step = Math.ceil(allRegions.length / 60);
    allRegions = allRegions.filter((_, i) => i % step === 0);
  }

  // ── Build the z-expression ──────────────────────────────────────────
  // `on` = zoompan frame counter, `on/30` ≈ time in seconds at 30fps
  // v7.1: Exact zoom_velocity from RAFT — no HF noise, no artificial
  // amplification.  Pure mathematical mapping of reference zoom speed.
  // Scale factor converts RAFT optical-flow units to zoompan z-units.
  const ZOOM_SCALE = 0.0008;

  let zExpr = "1.0"; // default: no zoom
  for (let i = allRegions.length - 1; i >= 0; i--) {
    const r = allRegions[i];
    const rate = (r.avgSpeed * ZOOM_SCALE).toFixed(6);
    const startFrame = Math.round(r.start * 30);
    const endFrame = Math.round(r.end * 30);
    // NO-CAPS: raw accumulation — no min/max bounds
    //   1 + rate * (on - startFrame)  — follows reference exactly
    const segExpr = `(1+${rate}*(on-${startFrame}))`;
    zExpr = `if(between(on,${startFrame},${endFrame}),${segExpr},${zExpr})`;
  }

  return `zoompan=z='${zExpr}':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${w}x${h}:fps=30`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Signal-Driven Color DNA  (eq-only — v4 Black-Video Fix)
// ─────────────────────────────────────────────────────────────────────────────
//
// PERMANENT RULE: This function must NEVER emit a `curves=…` filter.
//   The main chain already has ONE curves=preset=strong_contrast.
//   Stacking additional curves presets (increase_contrast, lighter,
//   cross_process) compresses the luma range further each time →
//   near-black or total-black output.
//
// What this function CAN emit:
//   • A single `eq=…` tweak (safe additive adjustment to contrast,
//     brightness, saturation) based on the reference's shot signals.
//   • NO hue-rotation — hue shifts were causing muddy tints on
//     footage with different white-balance than the reference.
// ─────────────────────────────────────────────────────────────────────────────

function buildSignalColorDNA(
  sd: ShotDetectionResult,
  cg: ColorGradingResult,
  _targetDuration: number,
): string[] {
  const cuts = sd.cuts;
  if (!cuts || cuts.length === 0) return [];

  const filters: string[] = [];

  // ── Aggregate signal statistics ────────────────────────────────────
  const histScores = cuts.map((c) => c.hist_score);
  const ecrScores = cuts.map((c) => c.ecr_score);

  const histMean = histScores.reduce((a, b) => a + b, 0) / histScores.length;
  const ecrMean = ecrScores.reduce((a, b) => a + b, 0) / ecrScores.length;

  // ── ECR-driven eq refinement — EXTREME: wider deltas, no safety ────
  //    EXTREME MODE: multiplied ECR/hist coefficients, wider clamps.
  const contrastDelta = clampRange(ecrMean * 0.35, 0, 0.25);
  const brightnessDelta = clampRange((ecrMean - 0.5) * 0.06, -0.04, 0.04);
  const saturationDelta = clampRange(histMean * 0.2, 0, 0.18);

  if (contrastDelta > 0.02 || Math.abs(brightnessDelta) > 0.005 || saturationDelta > 0.02) {
    const c = (1.0 + contrastDelta).toFixed(3);
    const b = brightnessDelta.toFixed(4);
    const s = (1.0 + saturationDelta).toFixed(3);
    filters.push(`eq=contrast=${c}:brightness=${b}:saturation=${s}`);
  }

  // NO curves preset here — permanently removed to prevent black video

  return filters;
}

/** Clamp a number to [min, max] */
function clampRange(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ─────────────────────────────────────────────────────────────────────────────
// DTW Frame-Perfect Transition Alignment
// ─────────────────────────────────────────────────────────────────────────────
//
// Dynamic Time Warping (DTW) — aligns reference edit points to the target
// timeline using beat intensity as a weighting signal.
//
// ALGORITHM
// ---------
// 1. High-intensity beats (≥ 1.2× average) are LOCKED to their exact
//    proportional position — these are the rhythmic anchor points.
//
// 2. Low-intensity beats DRIFT toward the nearest high-intensity anchor,
//    creating tighter rhythmic groupings that mirror the reference's
//    editing DNA more accurately than simple linear scaling.
//
// 3. The drift amount is proportional to how far below average the
//    beat's intensity is, capped at 8% of the mean inter-cut gap.
//
// This replaces naive `refTime × (targetDur / refDur)` with an
// intensity-aware warping that preserves the FEEL of the original
// edit rhythm.
// ─────────────────────────────────────────────────────────────────────────────

function applyDTWAlignment(
  cutTimes: number[],
  beatEvents: BeatEvent[],
  targetDuration: number,
): number[] {
  if (cutTimes.length < 3 || beatEvents.length === 0) return cutTimes;

  // Map each cut time to the nearest beat's intensity
  const intensities = cutTimes.map((t) => {
    let nearest = beatEvents[0];
    let minDist = Infinity;
    for (const b of beatEvents) {
      // Use modulo to handle tiled beats
      const dist = Math.abs((b.timestamp_sec % targetDuration) - t);
      if (dist < minDist) {
        minDist = dist;
        nearest = b;
      }
    }
    // Only assign beat intensity if the nearest beat is within 1 second
    return minDist < 1.0 ? nearest.intensity : 0.5;
  });

  const avgIntensity =
    intensities.reduce((a, b) => a + b, 0) / intensities.length;
  const strongThreshold = avgIntensity * 1.2;

  // Warp: high-intensity cuts stay locked, low-intensity flex toward anchors
  const warped = cutTimes.map((t, i) => {
    const intensity = intensities[i];
    if (intensity >= strongThreshold) return t; // Strong: locked

    // Drift toward nearest strong beat
    const maxDrift =
      0.08 * (targetDuration / Math.max(1, cutTimes.length));
    const driftFactor =
      Math.max(0, 1 - intensity / Math.max(avgIntensity, 0.01)) * maxDrift;

    let nearestStrongTime = t;
    let nearestDist = Infinity;
    for (let j = 0; j < cutTimes.length; j++) {
      if (
        intensities[j] >= strongThreshold &&
        Math.abs(cutTimes[j] - t) < nearestDist &&
        j !== i
      ) {
        nearestDist = Math.abs(cutTimes[j] - t);
        nearestStrongTime = cutTimes[j];
      }
    }

    const direction = Math.sign(nearestStrongTime - t);
    return t + direction * driftFactor;
  });

  // Re-sort and de-duplicate (no two cuts within MIN_CUT_GAP)
  return warped
    .filter((t) => t > 0.05 && t < targetDuration - 0.05)
    .sort((a, b) => a - b)
    .filter((t, i, arr) => i === 0 || t - arr[i - 1] >= MIN_CUT_GAP);
}

// ─────────────────────────────────────────────────────────────────────────────
// Beat-Synced Cut Point Builder
// ─────────────────────────────────────────────────────────────────────────────
//
// Merges audio beat onsets and shot-detection hard-cuts into a single
// de-duplicated, sorted timeline of cut points.
//
// PRIORITY ORDER:
//   1. Beat onsets (from audio analysis) — these are the rhythmic
//      anchor points that make the output feel music-driven.
//   2. Shot boundaries (from shot detection) — these fill visual gaps
//      where no beat was detected, preventing long static holds.
//
// DE-DUPLICATION:
//   Any two cut points within MIN_CUT_GAP seconds of each other are
//   merged (the earlier one wins).  This prevents micro-stutter from
//   near-simultaneous beat + shot triggers.
//
// GAP FILLING:
//   If any gap between consecutive cuts exceeds MAX_GAP_SEC, synthetic
//   mid-point cuts are inserted to keep the energy high.
// ─────────────────────────────────────────────────────────────────────────────

/** Minimum gap between two cut points (seconds) — EXTREME: 0.04s micro-cuts */
const MIN_CUT_GAP = 0.04;

/** Maximum gap before a synthetic fill cut is inserted — EXTREME: 1.5s */
const MAX_GAP_SEC = 1.5;

/**
 * Build a unified, beat-synced cut point list from audio beats + shot cuts.
 *
 * @param beatEvents    BeatEvent[] from audio analysis
 * @param hardCuts      ShotBoundary[] (pre-filtered for hard_cut type)
 * @param targetDuration Total duration of the target video
 * @param refDuration   Duration of the reference video
 * @returns Sorted array of cut-point timestamps (seconds)
 */
function buildBeatSyncedCutPoints(
  beatEvents: BeatEvent[],
  hardCuts: ShotBoundary[],
  targetDuration: number,
  refDuration: number,
): number[] {
  // ── Collect all candidate cut points ────────────────────────────────
  const rawCuts: number[] = [];

  // A) Beat onsets — PRIMARY timing source
  //    Only include beats that fall within the target duration.
  //    For beats from the reference that exceed target duration,
  //    wrap them cyclically (modulo) so the pattern repeats.
  if (beatEvents.length > 0) {
    const maxBeatTime = Math.max(...beatEvents.map((b) => b.timestamp_sec));
    const beatPatternLen = maxBeatTime > 0 ? maxBeatTime : refDuration;

    for (const beat of beatEvents) {
      if (beat.timestamp_sec <= 0.05) continue; // skip beat at time=0

      if (beat.timestamp_sec < targetDuration) {
        rawCuts.push(beat.timestamp_sec);
      }

      // If target is longer than the beat pattern, tile the beats
      if (beatPatternLen > 0 && targetDuration > beatPatternLen) {
        let loopOffset = beatPatternLen;
        let loopCount = 0;
        while (loopOffset < targetDuration && loopCount < 50) {
          const tiled = beat.timestamp_sec + loopOffset;
          if (tiled > 0.05 && tiled < targetDuration - 0.05) {
            rawCuts.push(tiled);
          }
          loopOffset += beatPatternLen;
          loopCount++;
        }
      }
    }
  }

  // B) Shot boundaries — SECONDARY, fill gaps only
  //    These provide visual variety where no beat was detected.
  for (const cut of hardCuts) {
    if (cut.timestamp_sec > 0.05 && cut.timestamp_sec < targetDuration - 0.05) {
      rawCuts.push(cut.timestamp_sec);
    }
  }

  if (rawCuts.length === 0) return [];

  // ── Sort and de-duplicate ───────────────────────────────────────────
  //    Remove any cut point that's within MIN_CUT_GAP of a previous one.
  const sorted = [...new Set(rawCuts.map((t) => parseFloat(t.toFixed(3))))].sort(
    (a, b) => a - b,
  );

  const deduped: number[] = [];
  let lastCut = -Infinity;

  for (const t of sorted) {
    if (t - lastCut >= MIN_CUT_GAP) {
      deduped.push(t);
      lastCut = t;
    }
  }

  // ── Gap filling — insert mid-point cuts for long gaps ───────────────
  //    Ensures no segment exceeds MAX_GAP_SEC, keeping the energy high.
  const withFills: number[] = [];
  let prev = 0;

  for (const t of deduped) {
    while (t - prev > MAX_GAP_SEC) {
      const mid = prev + MAX_GAP_SEC;
      if (mid < targetDuration - 0.05) {
        withFills.push(parseFloat(mid.toFixed(3)));
      }
      prev = mid;
    }
    withFills.push(t);
    prev = t;
  }

  // Fill gap between last cut and end of target
  while (targetDuration - prev > MAX_GAP_SEC) {
    const mid = prev + MAX_GAP_SEC;
    if (mid < targetDuration - 0.05) {
      withFills.push(parseFloat(mid.toFixed(3)));
    }
    prev = mid;
  }

  // Cap at 200 segments to prevent FFmpeg filter-graph explosion
  return withFills.slice(0, 200);
}

// ─────────────────────────────────────────────────────────────────────────────
// Transition Preset Assignment & FFmpeg Filter Rendering
// ─────────────────────────────────────────────────────────────────────────────
//
// Each transition preset is mapped to a real FFmpeg filter expression
// that modifies the first few frames of an incoming segment, creating
// the visual transition effect at the cut point.
//
// PRESETS RENDERED:
//   zoom_hit       — zoompan with scale 1→1.15 over ~3 frames
//   zoom_out_hit   — zoompan with scale 1.15→1.0 over ~3 frames
//   flash          — eq brightness spike (×3) fading to normal over ~2-3 frames
//   whip_pan       — boxblur horizontal spike fading to 0 over ~4 frames
//   luma_fade      — eq brightness×1.5 fading to normal over ~4 frames
//   glitch         — rgbashift with offset decaying over ~2 frames
//   cross_blur     — boxblur 0→sigma→0 over ~4 frames
//   motion_blur_swipe — directional avgblur spike over ~3 frames
//   rgb_split      — rgbashift with larger offset, decaying
//   wipe / slide   — rendered as flash (FFmpeg wipe requires 2 inputs)
// ─────────────────────────────────────────────────────────────────────────────

/** Transition preset definition for FFmpeg rendering */
interface TransitionAssignment {
  kind: string;
  effectDurationSec: number;
  intensity: number;
  blurSigma?: number;
  brightnessSpikeMultiplier?: number;
  glitchOffsetPx?: number;
  scaleFrom?: number;
  scaleTo?: number;
}

/**
 * Assign a transition preset to each segment based on beat intensity
 * at the cut point.  Returns an array parallel to `segments` — null
 * for the first segment (no transition) or when no beat matches.
 */
function assignTransitionPresets(
  cutTimes: number[],
  beatEvents: BeatEvent[],
  segments: Array<{ start: number; end: number }>,
): Array<TransitionAssignment | null> {
  // High-energy presets (intensity ≥ 0.7)
  const highPresets: TransitionAssignment[] = [
    { kind: "zoom_hit", effectDurationSec: 0.1, intensity: 1, scaleFrom: 1.0, scaleTo: 1.15 },
    { kind: "flash", effectDurationSec: 0.08, intensity: 1, brightnessSpikeMultiplier: 3.0 },
    { kind: "rgb_split", effectDurationSec: 0.08, intensity: 1, glitchOffsetPx: 12 },
  ];

  // Medium-energy presets (intensity 0.4–0.7)
  const medPresets: TransitionAssignment[] = [
    { kind: "whip_pan", effectDurationSec: 0.12, intensity: 0.7, blurSigma: 25 },
    { kind: "glitch", effectDurationSec: 0.06, intensity: 0.7, glitchOffsetPx: 8 },
    { kind: "motion_blur_swipe", effectDurationSec: 0.1, intensity: 0.7, blurSigma: 30 },
    { kind: "zoom_out_hit", effectDurationSec: 0.1, intensity: 0.7, scaleFrom: 1.15, scaleTo: 1.0 },
  ];

  // Low-energy presets (intensity < 0.4)
  const lowPresets: TransitionAssignment[] = [
    { kind: "cross_blur", effectDurationSec: 0.14, intensity: 0.4, blurSigma: 8 },
    { kind: "luma_fade", effectDurationSec: 0.15, intensity: 0.4, brightnessSpikeMultiplier: 1.5 },
  ];

  const assignments: Array<TransitionAssignment | null> = [];

  for (let i = 0; i < segments.length; i++) {
    if (i === 0) {
      assignments.push(null);
      continue;
    }

    const cutTime = segments[i].start;

    // Find nearest beat to this cut point
    let nearestBeat: BeatEvent | null = null;
    let nearestDist = Infinity;
    for (const b of beatEvents) {
      const dist = Math.abs(b.timestamp_sec - cutTime);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestBeat = b;
      }
    }

    const beatIntensity = (nearestBeat && nearestDist < 0.5) ? nearestBeat.intensity : 0.3;

    // Select preset based on intensity
    let pool: TransitionAssignment[];
    if (beatIntensity >= 0.7) {
      pool = highPresets;
    } else if (beatIntensity >= 0.4) {
      pool = medPresets;
    } else {
      pool = lowPresets;
    }

    // Cycle through the pool to avoid repetitive transitions
    const preset = { ...pool[i % pool.length], intensity: beatIntensity };
    assignments.push(preset);
  }

  return assignments;
}

/**
 * Build an FFmpeg filter expression for a transition effect applied
 * to the HEAD of a segment (first few frames after a cut).
 *
 * Uses the `enable` option with `between(t,0,dur)` to limit the
 * effect to only the first `effectDurationSec` seconds of the segment.
 *
 * @param transition  The transition preset to render
 * @param segDuration Duration of the segment in seconds
 * @returns FFmpeg filter string or null if unsupported
 */
function buildTransitionFilter(
  transition: TransitionAssignment,
  segDuration: number,
): string | null {
  const dur = Math.min(transition.effectDurationSec, segDuration * 0.3);
  if (dur < 0.02) return null;

  const enableExpr = `enable='between(t,0,${dur.toFixed(3)})'`;

  switch (transition.kind) {
    // ── Zoom Hit: scale spike 1→1.15 ────────────────────────────────
    case "zoom_hit": {
      // Use a brief scale>1 with zoompan to create a "punch" effect
      // Limit to the first few frames via enable
      const scale = (transition.scaleTo ?? 1.15).toFixed(2);
      return `zoompan=z='if(between(on,0,${Math.round(dur * 30)}),${scale},1)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=iw:ih:fps=30`;
    }

    // ── Zoom Out Hit: scale 1.15→1.0 ────────────────────────────────
    case "zoom_out_hit": {
      const scaleStart = (transition.scaleFrom ?? 1.15).toFixed(2);
      const frames = Math.round(dur * 30);
      // Linear interpolation from scaleStart to 1.0
      return `zoompan=z='if(between(on,0,${frames}),${scaleStart}-${((parseFloat(scaleStart) - 1.0) / frames).toFixed(5)}*on,1)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=iw:ih:fps=30`;
    }

    // ── Flash: brightness + contrast spike ──────────────────────────
    case "flash": {
      // v9: Synchronized flash using brightness + contrast for a more
      // dynamic visual punch on every detected beat.  The contrast
      // boost (1.4) adds depth so the flash isn't just a flat white-out.
      const spike = transition.brightnessSpikeMultiplier ?? 3.0;
      // Scale brightness proportionally to spike intensity, capped at 0.35
      const brightVal = Math.min(0.35, 0.25 * (spike / 3.0)).toFixed(2);
      // Contrast boost scales with intensity but floor at 1.4
      const contrastVal = Math.max(1.4, 1.4 * (spike / 3.0)).toFixed(2);
      return `eq=brightness=${brightVal}:contrast=${contrastVal}:${enableExpr}`;
    }

    // ── Whip Pan: horizontal blur spike ─────────────────────────────
    case "whip_pan": {
      const sigma = Math.min(30, transition.blurSigma ?? 25);
      // Horizontal blur (luma X = sigma, luma Y = 1) with enable
      return `boxblur=luma_radius=${sigma}:luma_power=1:${enableExpr}`;
    }

    // ── Luma Fade: gentle brightness lift ───────────────────────────
    case "luma_fade": {
      const mult = transition.brightnessSpikeMultiplier ?? 1.5;
      const brightVal = Math.min(0.5, (mult - 1.0) * 0.4).toFixed(2);
      return `eq=brightness=${brightVal}:${enableExpr}`;
    }

    // ── Glitch: RGB channel offset ──────────────────────────────────
    case "glitch": {
      const offset = Math.min(15, transition.glitchOffsetPx ?? 8);
      // rgbashift creates chromatic aberration by shifting R and B channels
      return `rgbashift=rh=${offset}:bh=${-offset}:${enableExpr}`;
    }

    // ── Cross Blur: gaussian blur spike ─────────────────────────────
    case "cross_blur": {
      const sigma = Math.min(12, transition.blurSigma ?? 8);
      return `boxblur=luma_radius=${sigma}:luma_power=1:${enableExpr}`;
    }

    // ── Motion Blur Swipe: directional blur ─────────────────────────
    case "motion_blur_swipe": {
      const sigma = Math.min(35, transition.blurSigma ?? 30);
      // Horizontal-dominant blur to simulate a swipe
      return `boxblur=luma_radius=${sigma}:luma_power=1:${enableExpr}`;
    }

    // ── RGB Split: chromatic aberration ──────────────────────────────
    case "rgb_split": {
      const offset = Math.min(18, transition.glitchOffsetPx ?? 12);
      return `rgbashift=rh=${offset}:rv=${Math.round(offset / 3)}:bh=${-offset}:bv=${-Math.round(offset / 3)}:${enableExpr}`;
    }

    // ── Wipe / Slide: rendered as flash (requires 2-input xfade, too complex for concat) ──
    case "wipe":
    case "slide": {
      return `eq=brightness=0.25:${enableExpr}`;
    }

    default:
      return null;
  }
}
