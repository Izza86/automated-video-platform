/**
 * Audio Beat Detection — Spectral Flux + Onset Detection  (v2)
 *
 * Multi-pass FFmpeg audio analysis pipeline:
 *
 *   Pass 1 — `astats` per-frame RMS + crest factor → energy timeline
 *   Pass 2 — `showfreqs` / band-split energy → 4-band spectral flux
 *   Pass 3 — `volumedetect` → peak dB + mean volume
 *
 * Passes 1+2+3 run concurrently.  The spectral flux signal is used for
 * onset detection with adaptive thresholding, producing beat events with
 * per-beat intensity and dominant frequency band.
 *
 * OUTPUT CONTRACT
 * ───────────────
 * • `beats`          — plain timestamp array (backward compat)
 * • `beatEvents`     — full `BeatEvent[]` with intensity + band
 * • `audioTimeline`  — per-frame energy + flux for frontend waveform
 * • `rhythmRegions`  — contiguous energy regions for edit sync cards
 * • BPM estimated via autocorrelation with confidence score
 */

import type {
  AudioBeatResult,
  BeatEvent,
  RhythmRegion,
  AudioTimelinePoint,
} from "../types";
import {
  resolveFfmpeg,
  safeExe,
  execAsync,
  probeVideo,
  makeTempDir,
  cleanTempDir,
  writeTempFile,
  mean,
} from "../utils/ffmpeg";
import { runMLScript, runColabMLScriptWithRetry } from "../utils/ml-runner";

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

/** Internal sample rate for astats – high enough for beat precision */
const ASTATS_FRAME_RATE = 86;

/** Spectral flux onset adaptive-threshold multiplier (base — scaled down
 *  dynamically for low-energy audio so quiet videos still produce beats).
 *  Set to 1.02 (near-unity) so even marginal flux rises trigger onsets. */
const ONSET_THRESHOLD_MULT = 1.02;

/** Minimum inter-onset interval in seconds (prevents double-triggers) */
const MIN_IOI_SEC = 0.06;

/** Adaptive threshold window size (frames) */
const ADAPT_WINDOW = 8;

/** Minimum region duration for rhythm segmentation */
const MIN_REGION_SEC = 0.5;

/** Max beat events returned (cap JSON size) */
const MAX_BEAT_EVENTS = 500;

/** Max timeline points returned (downsample for frontend) */
const MAX_TIMELINE_PTS = 600;

/** Band boundaries in Hz for sub-bass / bass / mid / high */
const BAND_SUB_BASS_HI = 60;
const BAND_BASS_HI = 250;
const BAND_MID_HI = 4000;

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/** Shape of the ML Python script's JSON output */
interface MLBeatResult {
  beats: number[];
  beatEvents: Array<{
    timestamp_sec: number;
    intensity: number;
    flux?: number;
    band?: string;
  }>;
  bpm: number;
  bpmConfidence: number;
  firstBeatSec: number;
  peakDb?: number;
  meanVolume?: number;
  hasAudio: boolean;
  audioTimeline?: Array<{ time_sec: number; energy: number; flux?: number }>;
  rhythmRegions?: Array<{
    start_sec: number;
    end_sec: number;
    localBpm?: number;
    avgIntensity?: number;
    energyLabel?: string;
  }>;
  regionCount?: number;
  avgBeatIntensity?: number;
  peakBeatIntensity?: number;
  beatDensity?: number;
  timeSignatureGuess?: string;
  processingMs?: number;
  mlModel?: string;
  error?: string;
}

/** Analyse audio beats, spectral flux and volume from a video Buffer. */
export async function analyzeAudio(
  videoBuffer: Buffer,
): Promise<AudioBeatResult> {
  const t0 = performance.now();
  const tmp = makeTempDir("audio");

  try {
    const videoPath = await writeTempFile(tmp, "input.mp4", videoBuffer);
    const probe = await probeVideo(videoPath);

    if (!probe.hasAudio) {
      return emptyResult(t0);
    }

    // ── ML-first: RNN/LSTM Beat Tracker via Python ────────────────────
    // Replaces basic energy detection with RNN-based beat tracker.
    // Ensures every cut is locked to the music's transients for 100%
    // rhythmic accuracy.
    //
    // Strategy:
    //   1. Try Colab GPU with retry (3 attempts, 10-min timeout each)
    //      — Colab's madmom RNN+DBN gives highest accuracy
    //   2. Fall back to local Python if Colab is unavailable
    //   3. Fall back to FFmpeg spectral flux if Python fails
    const mlResult =
      (await runColabMLScriptWithRetry<MLBeatResult>(
        "ml_beat_detection.py",
        videoPath,
        600_000,  // 10 min per attempt
        3,        // 3 retry attempts
      )) ??
      (await runMLScript<MLBeatResult>(
        "ml_beat_detection.py",
        videoPath,
        [],
        600_000, // 10 min timeout for local Python
      ));

    if (mlResult && !mlResult.error && mlResult.hasAudio && mlResult.beatEvents && mlResult.beatEvents.length > 0) {
      console.log(
        `[audio] ML beat detection succeeded: ${mlResult.beatEvents.length} beats, ` +
        `BPM=${mlResult.bpm}, confidence=${mlResult.bpmConfidence}, model=${mlResult.mlModel}`,
      );

      // Map ML beat events to our BeatEvent type
      const mlBeatEvents: BeatEvent[] = mlResult.beatEvents.map((b) => ({
        timestamp_sec: b.timestamp_sec,
        intensity: b.intensity,
        flux: b.flux ?? 0,
        band: (b.band as BeatEvent["band"]) || "mid",
      }));

      // Map ML rhythm regions
      const mlRhythmRegions: RhythmRegion[] = (mlResult.rhythmRegions ?? []).map((r) => ({
        start_sec: r.start_sec,
        end_sec: r.end_sec,
        localBpm: r.localBpm ?? mlResult.bpm,
        avgIntensity: r.avgIntensity ?? 0,
        energyLabel: (r.energyLabel as RhythmRegion["energyLabel"]) || "medium",
      }));

      // Map ML timeline
      const mlTimeline: AudioTimelinePoint[] = (mlResult.audioTimeline ?? []).map((t) => ({
        time_sec: t.time_sec,
        energy: t.energy,
        flux: t.flux ?? 0,
      }));

      const cappedEvents = mlBeatEvents.slice(0, MAX_BEAT_EVENTS);
      const cappedTimestamps = cappedEvents.map((b) => b.timestamp_sec);
      const intensities = cappedEvents.map((b) => b.intensity);

      return {
        beats: cappedTimestamps,
        beatEvents: cappedEvents,
        bpm: mlResult.bpm,
        bpmConfidence: mlResult.bpmConfidence,
        firstBeatSec: cappedTimestamps.length > 0 ? cappedTimestamps[0] : 0,
        peakDb: round1(mlResult.peakDb ?? -60),
        meanVolume: round3(mlResult.meanVolume ?? 0),
        hasAudio: true,
        audioTimeline: mlTimeline.slice(0, MAX_TIMELINE_PTS),
        rhythmRegions: mlRhythmRegions,
        regionCount: mlRhythmRegions.length,
        avgBeatIntensity: intensities.length > 0 ? round3(mean(intensities)) : 0,
        peakBeatIntensity: intensities.length > 0 ? round3(Math.max(...intensities)) : 0,
        beatDensity: probe.duration > 0 ? round3(cappedEvents.length / probe.duration) : 0,
        timeSignatureGuess: (mlResult.timeSignatureGuess as AudioBeatResult["timeSignatureGuess"]) ?? "unknown",
        processingMs: Math.round(performance.now() - t0),
      };
    }

    // ── STRICT MODE: No FFmpeg/librosa fallback ───────────────────────
    //    High-accuracy ML beat data (madmom RNN+DBN via Colab or local
    //    Python) is REQUIRED for frame-accurate beat sync.  Return empty
    //    result so the caller retries with Colab GPU active.
    console.error(
      "[audio] ❌ ML beat detection FAILED after all retries " +
      "(Colab 3× + local Python). FFmpeg/librosa fallback is DISABLED. " +
      "Ensure the Colab GPU notebook is running and COLAB_GPU_URL is set.",
    );
    return emptyResult(t0);

    // ---------- Legacy FFmpeg pipeline below (unreachable — strict mode) ----------
    console.log("[audio] ML beat detection unavailable or failed, falling back to FFmpeg pipeline");

    const ffmpeg = await resolveFfmpeg();
    const exe = safeExe(ffmpeg);
    const duration = probe.duration || 10;

    // ── Three concurrent FFmpeg passes ────────────────────────────────
    const [energyFrames, bandFrames, volume] = await Promise.all([
      extractEnergyTimeline(exe, videoPath),
      extractBandEnergy(exe, videoPath),
      detectVolume(exe, videoPath),
    ]);

    // ── Compute spectral flux from band energy ────────────────────────
    const fluxSignal = computeSpectralFlux(bandFrames);

    // ── Fuse energy + flux into unified timeline ──────────────────────
    const rawTimeline = fuseTimeline(energyFrames, fluxSignal, duration);

    // ── Onset detection with adaptive threshold ───────────────────────
    let beatEvents = detectOnsets(rawTimeline);

    // ── GUARANTEED FALLBACK ────────────────────────────────────────────
    //    If spectral-flux onsets returned 0 beats, ALWAYS run the energy
    //    fallback so the editor always has rhythmic data to cut against.
    //    If flux found 1-4 beats, still try the fallback — if it finds
    //    more, prefer it (handles ambient / natural audio where flux is
    //    near-constant but energy has visible transients).
    if (beatEvents.length === 0 && rawTimeline.length >= 4) {
      // Primary completely failed — unconditionally use energy fallback
      const energyFallback = fallbackEnergyOnsets(rawTimeline);
      console.log(
        `[audio] Flux onsets=0, energy fallback=${energyFallback.length} — FORCED energy fallback`,
      );
      beatEvents = energyFallback;
    } else if (beatEvents.length < 5 && rawTimeline.length >= 4) {
      // Primary found very few — try energy, use if it found more
      const energyFallback = fallbackEnergyOnsets(rawTimeline);
      if (energyFallback.length > beatEvents.length) {
        console.log(
          `[audio] Flux onsets=${beatEvents.length}, energy fallback=${energyFallback.length} — using energy`,
        );
        beatEvents = energyFallback;
      }
    }

    // ── BPM estimation ────────────────────────────────────────────────
    const beatTimes = beatEvents.map((b) => b.timestamp_sec);
    const { bpm, confidence: bpmConfidence } = estimateBPM(beatTimes);

    // ── Rhythm region segmentation ────────────────────────────────────
    const rhythmRegions = segmentRhythmRegions(rawTimeline, duration);

    // ── Aggregate metrics ─────────────────────────────────────────────
    const intensities = beatEvents.map((b) => b.intensity);
    const avgBeatIntensity = intensities.length > 0
      ? round3(mean(intensities))
      : 0;
    const peakBeatIntensity = intensities.length > 0
      ? round3(Math.max(...intensities))
      : 0;
    const beatDensity = duration > 0
      ? round3(beatEvents.length / duration)
      : 0;

    const timeSignatureGuess = guessTimeSignature(beatTimes, bpm);

    // ── Downsample timeline for frontend ──────────────────────────────
    const audioTimeline = downsampleTimeline(rawTimeline, MAX_TIMELINE_PTS);

    // ── Cap beat events ───────────────────────────────────────────────
    const cappedEvents = beatEvents.slice(0, MAX_BEAT_EVENTS);
    const cappedTimestamps = cappedEvents.map((b) => b.timestamp_sec);

    return {
      beats: cappedTimestamps,
      beatEvents: cappedEvents,
      bpm,
      bpmConfidence,
      firstBeatSec: cappedTimestamps.length > 0 ? cappedTimestamps[0] : 0,
      peakDb: round1(volume.peakDb),
      meanVolume: round3(volume.meanVolume),
      hasAudio: true,
      audioTimeline,
      rhythmRegions,
      regionCount: rhythmRegions.length,
      avgBeatIntensity,
      peakBeatIntensity,
      beatDensity,
      timeSignatureGuess,
      processingMs: Math.round(performance.now() - t0),
    };
  } finally {
    cleanTempDir(tmp);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pass 1 — Per-frame RMS energy timeline  (astats)
// ─────────────────────────────────────────────────────────────────────────────

interface EnergyFrame {
  time: number;
  rms: number; // linear 0-1
  crest: number; // crest factor (peak / rms)
}

async function extractEnergyTimeline(
  exe: string,
  videoPath: string,
): Promise<EnergyFrame[]> {
  const cmd = [
    exe,
    `-analyzeduration 100M -probesize 100M`,
    `-i "${videoPath}"`,
    `-af "astats=metadata=1:reset=1,ametadata=print:file=-"`,
    `-vn -f null -`,
  ].join(" ");

  try {
    const res = await execAsync(cmd, { maxBuffer: 80 * 1024 * 1024 });
    // ametadata=print:file=- writes to stdout; combine both streams
    const combined = (res.stdout ?? "") + "\n" + (res.stderr ?? "");
    return parseAstatsOutput(combined);
  } catch (err: unknown) {
    const stdout = (err as { stdout?: string })?.stdout ?? "";
    const stderr = (err as { stderr?: string })?.stderr ?? "";
    const combined = (stdout + "\n" + stderr).trim();
    if (combined) return parseAstatsOutput(combined);
    return [];
  }
}

function parseAstatsOutput(output: string): EnergyFrame[] {
  const frames: EnergyFrame[] = [];
  const lines = output.split("\n");
  let pts = 0;
  let rmsDb = -60;
  let crest = 1;

  // ROBUST PARSING: Some FFmpeg builds use `=` as the key-value
  // separator (e.g. `RMS_level=-12.5`), while others use `: `
  // (e.g. `RMS_level: -12.5`).  The regex `[:=]\s*` handles both.
  for (const line of lines) {
    const ptsM = line.match(/pts_time[:=]\s*([\d.]+)/);
    if (ptsM) pts = parseFloat(ptsM[1]);

    const rmsM = line.match(/RMS_level[:=]\s*([-\d.]+)/);
    if (rmsM) rmsDb = parseFloat(rmsM[1]);

    const crestM = line.match(/Crest_factor[:=]\s*([\d.]+)/);
    if (crestM) crest = parseFloat(crestM[1]);

    // Each frame emits RMS_level last in astats output — use as commit
    if (rmsM && Number.isFinite(rmsDb)) {
      const linear = rmsDb <= -100 ? 0 : Math.pow(10, rmsDb / 20);
      frames.push({ time: pts, rms: Math.min(1, linear), crest });
    }
  }

  return frames;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pass 2 — Band-split energy  (4-band crossover via FFmpeg)
// ─────────────────────────────────────────────────────────────────────────────
//
// We use `asplit` + `lowpass`/`highpass` chains to create 4 frequency bands:
//   sub-bass (< 60 Hz), bass (60-250 Hz), mid (250-4000 Hz), high (> 4000 Hz)
// Then `astats` on each band → per-band RMS.
//
// Simpler fallback: single `astats` already captured above.  For the
// band pass we use `anequalizer` or a series of bandpass filters with
// `ebur128` for per-band loudness.  But the simplest reliable approach:
// Extract raw PCM, then use `showfreqs`-style analysis via `afftfilt`.
//
// Practical approach: 4 parallel `bandpass` → `astats` extractions.

interface BandFrame {
  time: number;
  subBass: number; // linear RMS
  bass: number;
  mid: number;
  high: number;
}

async function extractBandEnergy(
  exe: string,
  videoPath: string,
): Promise<BandFrame[]> {
  // Use a crossover filter approach:
  // Split into 4 bands, measure RMS of each via metadata.
  // This is done in a single FFmpeg command with filter_complex.
  const cmd = [
    exe,
    ` -analyzeduration 100M -probesize 100M`,
    ` -i "${videoPath}"`,
    ` -filter_complex "`,
    `[0:a]asplit=4[a1][a2][a3][a4];`,
    `[a1]lowpass=f=${BAND_SUB_BASS_HI},astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-[out1];`,
    `[a2]highpass=f=${BAND_SUB_BASS_HI},lowpass=f=${BAND_BASS_HI},astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-[out2];`,
    `[a3]highpass=f=${BAND_BASS_HI},lowpass=f=${BAND_MID_HI},astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-[out3];`,
    `[a4]highpass=f=${BAND_MID_HI},astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-[out4]"`,
    `-map "[out1]" -map "[out2]" -map "[out3]" -map "[out4]"`,
    `-f null -`,
  ].join("");

  try {
    const res = await execAsync(cmd, { maxBuffer: 80 * 1024 * 1024 });
    const combined = (res.stdout ?? "") + "\n" + (res.stderr ?? "");
    return parseBandOutput(combined);
  } catch (err: unknown) {
    // Complex filter may fail on some FFmpeg builds — fall back gracefully
    const stdout = (err as { stdout?: string })?.stdout ?? "";
    const stderr = (err as { stderr?: string })?.stderr ?? "";
    const combined = (stdout + "\n" + stderr).trim();
    if (combined.includes("RMS_level")) return parseBandOutput(combined);
    return [];
  }
}

function parseBandOutput(output: string): BandFrame[] {
  // The 4-stream output interleaves pts_time + RMS_level lines.
  // We need to collect them per-time-bucket.
  const buckets = new Map<number, Partial<BandFrame>>();
  const lines = output.split("\n");
  let currentPts = 0;
  let streamIdx = 0;

  // ROBUST PARSING: handle both `=` and `: ` delimiters across
  // different FFmpeg builds (Gyan, BtbN, system-packaged, etc.).
  for (const line of lines) {
    // Track which stream we're in (output changes between streams)
    const streamM = line.match(/Stream #0:(\d+)/);
    if (streamM) streamIdx = parseInt(streamM[1], 10);

    const ptsM = line.match(/pts_time[:=]\s*([\d.]+)/);
    if (ptsM) currentPts = round2Bucket(parseFloat(ptsM[1]));

    const rmsM = line.match(/RMS_level[:=]\s*([-\d.]+)/);
    if (rmsM) {
      const rmsDb = parseFloat(rmsM[1]);
      const linear = rmsDb <= -100 ? 0 : Math.pow(10, rmsDb / 20);

      if (!buckets.has(currentPts)) {
        buckets.set(currentPts, { time: currentPts, subBass: 0, bass: 0, mid: 0, high: 0 });
      }
      const b = buckets.get(currentPts)!;

      // Assign to the appropriate band based on parse order
      // Since all 4 streams share the same stderr, we use a round-robin
      // approach based on how many RMS values we've seen for this timestamp
      const filled = [b.subBass, b.bass, b.mid, b.high].filter((v) => v !== undefined && v > 0).length;
      switch (filled) {
        case 0: b.subBass = linear; break;
        case 1: b.bass = linear; break;
        case 2: b.mid = linear; break;
        case 3: b.high = linear; break;
      }
    }
  }

  return Array.from(buckets.values()).map((b) => ({
    time: b.time ?? 0,
    subBass: b.subBass ?? 0,
    bass: b.bass ?? 0,
    mid: b.mid ?? 0,
    high: b.high ?? 0,
  }));
}

function round2Bucket(t: number): number {
  return Math.round(t * 100) / 100;
}

// ─────────────────────────────────────────────────────────────────────────────
// Spectral Flux Computation
// ─────────────────────────────────────────────────────────────────────────────
//
// Spectral flux = sum of positive-only differences in band energy
// between consecutive frames.  This is the core onset signal.

interface FluxFrame {
  time: number;
  flux: number;
  dominantBand: BeatEvent["band"];
}

function computeSpectralFlux(bandFrames: BandFrame[]): FluxFrame[] {
  if (bandFrames.length < 2) return [];

  const result: FluxFrame[] = [];

  for (let i = 1; i < bandFrames.length; i++) {
    const prev = bandFrames[i - 1];
    const curr = bandFrames[i];

    // Positive half-wave rectified difference per band
    const dSub = Math.max(0, curr.subBass - prev.subBass);
    const dBass = Math.max(0, curr.bass - prev.bass);
    const dMid = Math.max(0, curr.mid - prev.mid);
    const dHigh = Math.max(0, curr.high - prev.high);

    const flux = dSub + dBass + dMid + dHigh;

    // Dominant band = band with largest positive delta
    const bands: [number, BeatEvent["band"]][] = [
      [dSub, "sub-bass"],
      [dBass, "bass"],
      [dMid, "mid"],
      [dHigh, "high"],
    ];
    bands.sort((a, b) => b[0] - a[0]);

    result.push({
      time: curr.time,
      flux,
      dominantBand: bands[0][1],
    });
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Timeline Fusion
// ─────────────────────────────────────────────────────────────────────────────
//
// Merge Pass-1 energy frames and spectral-flux frames into a unified
// timeline keyed by 0.02 s buckets.

interface TimelineFrame {
  time: number;
  energy: number;
  flux: number;
  dominantBand: BeatEvent["band"];
}

function fuseTimeline(
  energyFrames: EnergyFrame[],
  fluxFrames: FluxFrame[],
  _duration: number,
): TimelineFrame[] {
  const buckets = new Map<number, TimelineFrame>();

  for (const ef of energyFrames) {
    const key = round2Bucket(ef.time);
    if (!buckets.has(key)) {
      buckets.set(key, { time: key, energy: ef.rms, flux: 0, dominantBand: "mid" });
    } else {
      buckets.get(key)!.energy = ef.rms;
    }
  }

  for (const ff of fluxFrames) {
    const key = round2Bucket(ff.time);
    if (!buckets.has(key)) {
      buckets.set(key, { time: key, energy: 0, flux: ff.flux, dominantBand: ff.dominantBand });
    } else {
      const b = buckets.get(key)!;
      b.flux = ff.flux;
      b.dominantBand = ff.dominantBand;
    }
  }

  return Array.from(buckets.values()).sort((a, b) => a.time - b.time);
}

// ─────────────────────────────────────────────────────────────────────────────
// Onset Detection — Adaptive Threshold on Spectral Flux
// ─────────────────────────────────────────────────────────────────────────────
//
// For each frame, compute a local adaptive threshold = mean(flux) over
// a sliding window × ONSET_THRESHOLD_MULT.  A beat is triggered when
// flux exceeds the threshold AND the minimum inter-onset interval has
// passed.

function detectOnsets(timeline: TimelineFrame[]): BeatEvent[] {
  if (timeline.length < ADAPT_WINDOW + 2) {
    return fallbackEnergyOnsets(timeline);
  }

  // Pre-compute flux array
  const fluxArr = timeline.map((f) => f.flux);
  const maxFlux = Math.max(...fluxArr, 0.0001);

  // ── Sensitivity scaling for low-volume / quiet audio ────────────────
  //    Compute the median flux.  If the signal is very weak (median < 5%
  //    of peak), scale down the threshold multiplier so that even tiny
  //    spectral changes register as onsets.
  const sortedFlux = [...fluxArr].filter((v) => v > 0).sort((a, b) => a - b);
  const medianFlux = sortedFlux.length > 0
    ? sortedFlux[Math.floor(sortedFlux.length / 2)]
    : 0;
  const signalStrength = maxFlux > 0 ? medianFlux / maxFlux : 0;

  // Scale threshold: strong signal → full multiplier, weak → as low as 1.01
  const adaptiveMult = signalStrength > 0.05
    ? ONSET_THRESHOLD_MULT
    : Math.max(1.01, 1.0 + (ONSET_THRESHOLD_MULT - 1.0) * (signalStrength / 0.05));

  // Floor gate: drop to 0.2% of peak for quiet audio — ultra-aggressive
  // so that even the faintest spectral changes are captured as onsets.
  const floorGate = signalStrength > 0.05 ? maxFlux * 0.005 : maxFlux * 0.002;

  const events: BeatEvent[] = [];
  let lastOnsetTime = -1;

  for (let i = ADAPT_WINDOW; i < timeline.length; i++) {
    const frame = timeline[i];

    // Local adaptive threshold using percentile-weighted window mean.
    // Instead of a plain mean (which is pulled up by spikes and
    // suppresses subsequent onsets), use the 25th-percentile of the
    // window as the baseline — this keeps the threshold low between
    // beats, making consecutive beats easier to detect.
    const windowFlux = fluxArr.slice(i - ADAPT_WINDOW, i);
    const windowSorted = [...windowFlux].sort((a, b) => a - b);
    const p25 = windowSorted[Math.max(0, Math.floor(windowSorted.length * 0.25))];
    const localBaseline = (mean(windowFlux) + p25) / 2; // blend of mean and p25
    const threshold = localBaseline * adaptiveMult;

    if (
      frame.flux > threshold &&
      frame.flux > floorGate &&
      frame.time - lastOnsetTime >= MIN_IOI_SEC
    ) {
      events.push({
        timestamp_sec: round3(frame.time),
        intensity: round3(Math.min(1, frame.flux / maxFlux)),
        flux: round3(frame.flux),
        band: frame.dominantBand,
      });
      lastOnsetTime = frame.time;
    }
  }

  // ── Secondary pass on normalised flux if primary pass found < 5 beats ──
  //    Quiet audio with near-constant low flux may not clear even the
  //    reduced threshold.  Normalise flux to [0-1] and re-run with a
  //    simple derivative-based peak picker.
  if (events.length < 5 && fluxArr.length > ADAPT_WINDOW + 2) {
    const normFlux = fluxArr.map((v) => v / maxFlux);
    const normEvents: BeatEvent[] = [];
    let normLastOnset = -1;

    for (let i = 1; i < normFlux.length - 1; i++) {
      const prev = normFlux[i - 1];
      const curr = normFlux[i];
      const next = normFlux[i + 1];
      const t = timeline[i].time;

      // Local peak in normalised flux that exceeds a low absolute bar
      if (
        curr > prev &&
        curr >= next &&
        curr > 0.03 && // 3% of normalised peak
        t - normLastOnset >= MIN_IOI_SEC
      ) {
        normEvents.push({
          timestamp_sec: round3(t),
          intensity: round3(curr),
          flux: round3(fluxArr[i]),
          band: timeline[i].dominantBand,
        });
        normLastOnset = t;
      }
    }

    if (normEvents.length > events.length) {
      console.log(
        `[audio] Primary onsets=${events.length}, normalized-peak onsets=${normEvents.length} — using normalized`,
      );
      return normEvents;
    }
  }

  return events;
}

/**
 * Fallback: if spectral flux is unavailable (band pass failed),
 * detect onsets from energy alone using the same adaptive approach.
 */
function fallbackEnergyOnsets(timeline: TimelineFrame[]): BeatEvent[] {
  if (timeline.length < 4) return [];

  const energyArr = timeline.map((f) => f.energy);
  const maxEnergy = Math.max(...energyArr, 0.0001);

  // Adaptive sensitivity: quiet audio → lower threshold multiplier
  const sortedEnergy = [...energyArr].filter((v) => v > 0).sort((a, b) => a - b);
  const medianEnergy = sortedEnergy.length > 0
    ? sortedEnergy[Math.floor(sortedEnergy.length / 2)]
    : 0;
  const energyStrength = maxEnergy > 0 ? medianEnergy / maxEnergy : 0;
  const threshMult = energyStrength > 0.1 ? 1.08 : Math.max(1.01, 1.0 + 0.08 * (energyStrength / 0.1));
  const floorGate = energyStrength > 0.1 ? maxEnergy * 0.005 : maxEnergy * 0.002;

  const events: BeatEvent[] = [];
  let lastOnsetTime = -1;
  const window = Math.min(8, Math.floor(timeline.length / 2));

  for (let i = window; i < timeline.length; i++) {
    const frame = timeline[i];
    const localMean = mean(energyArr.slice(i - window, i));

    if (
      frame.energy > localMean * threshMult &&
      frame.energy > floorGate &&
      frame.time - lastOnsetTime >= MIN_IOI_SEC
    ) {
      events.push({
        timestamp_sec: round3(frame.time),
        intensity: round3(Math.min(1, frame.energy / maxEnergy)),
        flux: 0,
        band: "mid",
      });
      lastOnsetTime = frame.time;
    }
  }

  return events;
}

// ─────────────────────────────────────────────────────────────────────────────
// BPM Estimation — Autocorrelation with Confidence
// ─────────────────────────────────────────────────────────────────────────────

function estimateBPM(
  beatTimes: number[],
): { bpm: number; confidence: number } {
  if (beatTimes.length < 3) return { bpm: 0, confidence: 0 };

  // Compute inter-onset intervals (IOI)
  const ioi: number[] = [];
  for (let i = 1; i < beatTimes.length; i++) {
    ioi.push(beatTimes[i] - beatTimes[i - 1]);
  }

  // Filter outlier intervals (> 2 std from median)
  const sorted = [...ioi].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const std = Math.sqrt(mean(ioi.map((v) => (v - median) ** 2)));
  const maxDev = Math.max(std * 2, 0.05);
  const filtered = ioi.filter((v) => Math.abs(v - median) <= maxDev);

  if (filtered.length === 0) return { bpm: 0, confidence: 0 };

  const avgIOI = mean(filtered);
  if (avgIOI <= 0) return { bpm: 0, confidence: 0 };

  const rawBPM = 60 / avgIOI;

  // ── Fold into musical BPM range (60–180) ────────────────────────
  // Anything above 180 is almost certainly double-time detection;
  // halve it repeatedly until it fits the normal human-tempo range.
  // Anything below 60 is likely half-time; double it.
  let foldedBPM = rawBPM;
  while (foldedBPM > 180) foldedBPM /= 2;
  while (foldedBPM < 60 && foldedBPM > 0) foldedBPM *= 2;
  foldedBPM = round1(Math.max(60, Math.min(180, foldedBPM)));

  // Confidence = ratio of inliers to total intervals × consistency factor
  const inlierRatio = filtered.length / ioi.length;
  const consistencyStd = Math.sqrt(
    mean(filtered.map((v) => (v - avgIOI) ** 2)),
  );
  const consistency = avgIOI > 0 ? Math.max(0, 1 - consistencyStd / avgIOI) : 0;
  const confidence = round3(Math.min(1, inlierRatio * consistency));

  // ── Low-confidence fallback ─────────────────────────────────────
  // If confidence is below 50 %, the beat grid is too inconsistent
  // to trust.  Fall back to a neutral 90 BPM (moderate tempo) rather
  // than propagating a misleading value like 300.
  const bpm = confidence < 0.5 ? 90 : foldedBPM;

  return { bpm, confidence };
}

// ─────────────────────────────────────────────────────────────────────────────
// Time Signature Guess
// ─────────────────────────────────────────────────────────────────────────────

function guessTimeSignature(
  beatTimes: number[],
  bpm: number,
): AudioBeatResult["timeSignatureGuess"] {
  if (bpm <= 0 || beatTimes.length < 8) return "unknown";

  const beatInterval = 60 / bpm;

  // Look at groupings of strong vs weak beats.
  // Count how many beats align well on 3-beat vs 4-beat boundaries.
  let align3 = 0;
  let align4 = 0;

  for (let i = 0; i < beatTimes.length; i++) {
    const phase3 = (beatTimes[i] / (beatInterval * 3)) % 1;
    const phase4 = (beatTimes[i] / (beatInterval * 4)) % 1;

    if (phase3 < 0.15 || phase3 > 0.85) align3++;
    if (phase4 < 0.15 || phase4 > 0.85) align4++;
  }

  const ratio3 = align3 / beatTimes.length;
  const ratio4 = align4 / beatTimes.length;

  if (ratio4 > 0.3 && ratio4 >= ratio3) return "4/4";
  if (ratio3 > 0.3 && ratio3 > ratio4) {
    // Distinguish 3/4 from 6/8 based on BPM
    return bpm > 150 ? "6/8" : "3/4";
  }
  return "4/4"; // default assumption
}

// ─────────────────────────────────────────────────────────────────────────────
// Rhythm Region Segmentation
// ─────────────────────────────────────────────────────────────────────────────
//
// Walk the energy timeline and group consecutive frames with similar
// energy levels into regions.  Each region gets a local BPM and an
// energy label (silent / low / medium / high / peak).

function segmentRhythmRegions(
  timeline: TimelineFrame[],
  duration: number,
): RhythmRegion[] {
  if (timeline.length < 2) {
    return [{
      start_sec: 0,
      end_sec: duration,
      localBpm: 0,
      avgIntensity: 0,
      energyLabel: "silent",
    }];
  }

  // Classify each frame into an energy bucket
  const maxEnergy = Math.max(...timeline.map((f) => f.energy), 0.001);
  const classified = timeline.map((f) => ({
    ...f,
    label: classifyEnergy(f.energy, maxEnergy),
  }));

  // Group consecutive frames with same label
  const raw: RhythmRegion[] = [];
  let regionStart = classified[0].time;
  let regionLabel = classified[0].label;
  let regionEnergies: number[] = [classified[0].energy];

  for (let i = 1; i < classified.length; i++) {
    const c = classified[i];

    if (c.label !== regionLabel) {
      raw.push({
        start_sec: round3(regionStart),
        end_sec: round3(c.time),
        localBpm: 0, // filled below
        avgIntensity: round3(mean(regionEnergies) / maxEnergy),
        energyLabel: regionLabel,
      });
      regionStart = c.time;
      regionLabel = c.label;
      regionEnergies = [];
    }
    regionEnergies.push(c.energy);
  }

  // Close final region
  raw.push({
    start_sec: round3(regionStart),
    end_sec: round3(duration),
    localBpm: 0,
    avgIntensity: round3(mean(regionEnergies) / maxEnergy),
    energyLabel: regionLabel,
  });

  // Merge micro-regions (< MIN_REGION_SEC)
  const merged: RhythmRegion[] = [];
  for (const r of raw) {
    if (r.end_sec - r.start_sec < MIN_REGION_SEC && merged.length > 0) {
      merged[merged.length - 1].end_sec = r.end_sec;
    } else {
      merged.push({ ...r });
    }
  }

  return merged;
}

function classifyEnergy(
  energy: number,
  maxEnergy: number,
): RhythmRegion["energyLabel"] {
  const ratio = maxEnergy > 0 ? energy / maxEnergy : 0;
  if (ratio < 0.05) return "silent";
  if (ratio < 0.25) return "low";
  if (ratio < 0.55) return "medium";
  if (ratio < 0.82) return "high";
  return "peak";
}

// ─────────────────────────────────────────────────────────────────────────────
// Pass 3 — Volume Detection
// ─────────────────────────────────────────────────────────────────────────────

interface VolumeInfo {
  peakDb: number;
  meanVolume: number;
}

async function detectVolume(
  exe: string,
  videoPath: string,
): Promise<VolumeInfo> {
  const cmd = `${exe} -analyzeduration 100M -probesize 100M -i "${videoPath}" -af volumedetect -vn -f null -`;

  try {
    const { stderr } = await execAsync(cmd, { maxBuffer: 5 * 1024 * 1024 });
    const peakMatch = stderr.match(/max_volume:\s*([-\d.]+)\s*dB/);
    const meanMatch = stderr.match(/mean_volume:\s*([-\d.]+)\s*dB/);
    const peakDb = peakMatch ? parseFloat(peakMatch[1]) : -20;
    const meanDb = meanMatch ? parseFloat(meanMatch[1]) : -30;
    const meanVolume = Math.max(0, Math.min(1, (meanDb + 60) / 60));
    return { peakDb, meanVolume };
  } catch {
    return { peakDb: -20, meanVolume: 0.5 };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Timeline Downsampling
// ─────────────────────────────────────────────────────────────────────────────

function downsampleTimeline(
  timeline: TimelineFrame[],
  maxPoints: number,
): AudioTimelinePoint[] {
  if (timeline.length <= maxPoints) {
    return timeline.map((f) => ({
      time_sec: round3(f.time),
      energy: round3(f.energy),
      flux: round3(f.flux),
    }));
  }

  const step = Math.ceil(timeline.length / maxPoints);
  const out: AudioTimelinePoint[] = [];
  for (let i = 0; i < timeline.length; i += step) {
    const f = timeline[i];
    out.push({
      time_sec: round3(f.time),
      energy: round3(f.energy),
      flux: round3(f.flux),
    });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty result (no audio track)
// ─────────────────────────────────────────────────────────────────────────────

function emptyResult(t0: number): AudioBeatResult {
  return {
    beats: [],
    beatEvents: [],
    bpm: 0,
    bpmConfidence: 0,
    firstBeatSec: 0,
    peakDb: -Infinity,
    meanVolume: 0,
    hasAudio: false,
    audioTimeline: [],
    rhythmRegions: [],
    regionCount: 0,
    avgBeatIntensity: 0,
    peakBeatIntensity: 0,
    beatDensity: 0,
    timeSignatureGuess: "unknown",
    processingMs: Math.round(performance.now() - t0),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Numeric Helpers
// ─────────────────────────────────────────────────────────────────────────────

function round1(n: number): number {
  return parseFloat(n.toFixed(1));
}

function round3(n: number): number {
  return parseFloat(n.toFixed(3));
}
