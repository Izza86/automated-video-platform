#!/usr/bin/env python3
"""
ML Beat Detection — Librosa Onset + Dynamic Bayesian Network
==============================================================
Uses librosa's production-grade audio analysis pipeline:

  1. Mel-spectrogram (128 mel bands — perceptual frequency mapping)
  2. Onset strength envelope via spectral flux computation
  3. Beat tracking via Dynamic Bayesian Network (Ellis 2007)
     — probabilistic tempo estimation with autocorrelation + DBN
  4. Onset peak-picking with adaptive thresholding
  5. BPM estimation with confidence scoring
  6. Multi-band spectral characterisation (bass/mid/high)

Algorithms (honest description):
  - Mel filter bank: 128 triangular bandpass filters mimicking
    human auditory perception (not CNN, but mathematically equivalent
    to a fixed-weight learned filter bank)
  - Onset strength: Spectral flux — first-order difference of
    mel-spectrogram bands, aggregated via median (not RNN)
  - Beat tracking: Dynamic Bayesian Network (librosa.beat.beat_track)
    — uses autocorrelation-based tempo estimation followed by a
    probabilistic state-space model for beat grid inference
  - Peak detection: Adaptive thresholding with backtracking

Output: JSON to stdout with beat timestamps, BPM, confidence,
        onset strengths, and spectral band analysis.

Usage:
  python scripts/ml_beat_detection.py <audio_or_video_path>

Dependencies:
  librosa >= 0.10.0, soundfile, numpy, scipy
"""

import sys
import json
import tempfile
import os
import subprocess
import numpy as np


class NumpyEncoder(json.JSONEncoder):
    """JSON encoder that handles numpy types."""
    def default(self, obj):
        if isinstance(obj, (np.integer,)):
            return int(obj)
        if isinstance(obj, (np.floating,)):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super().default(obj)


def json_dumps(obj):
    """Serialize to JSON with numpy support."""
    return json.dumps(obj, cls=NumpyEncoder)


def find_ffmpeg():
    """Find ffmpeg executable."""
    for name in ['ffmpeg', 'ffmpeg.exe']:
        for d in os.environ.get('PATH', '').split(os.pathsep):
            p = os.path.join(d, name)
            if os.path.isfile(p):
                return p
    # Check common locations
    for p in [r'C:\ffmpeg\bin\ffmpeg.exe', r'C:\ProgramData\chocolatey\bin\ffmpeg.exe',
              '/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg']:
        if os.path.isfile(p):
            return p
    return 'ffmpeg'


def extract_audio(video_path, output_wav, sr=22050):
    """Extract audio from video to WAV using ffmpeg."""
    ffmpeg = find_ffmpeg()
    cmd = [ffmpeg, '-y', '-i', video_path, '-vn', '-acodec', 'pcm_s16le',
           '-ar', str(sr), '-ac', '1', output_wav]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    return result.returncode == 0


def analyze_beats(audio_path):
    """
    Full beat detection pipeline using librosa.

    The pipeline:
    1. Mel-spectrogram (perceptual frequency analysis — 128 mel bands)
    2. Onset strength via spectral flux computation
    3. Beat tracking via Dynamic Bayesian Network (DBN)
    4. Spectral band analysis for per-beat frequency characterization
    """
    import librosa

    # ── Load audio ─────────────────────────────────────────────────────
    y, sr = librosa.load(audio_path, sr=22050, mono=True)
    duration = len(y) / sr

    if duration < 0.5:
        return empty_result(duration)

    # ── Mel Spectrogram: Perceptual Frequency Analysis ─────────────────
    # 128 mel bands = triangular bandpass filter bank mimicking
    # human cochlear frequency response
    mel_spec = librosa.feature.melspectrogram(
        y=y, sr=sr, n_mels=128, fmax=8000, hop_length=512
    )
    mel_db = librosa.power_to_db(mel_spec, ref=np.max)

    # ── Onset Detection via Spectral Flux ──────────────────────────────
    # librosa's onset_strength computes spectral flux: the first-order
    # difference of mel-spectrogram energy across time, aggregated
    # via median across frequency bands
    onset_env = librosa.onset.onset_strength(
        y=y, sr=sr, hop_length=512, aggregate=np.median
    )

    # Multi-band onset strength for spectral characterization
    onset_env_bass = librosa.onset.onset_strength(
        y=y, sr=sr, hop_length=512,
        feature=librosa.feature.melspectrogram,
        fmin=20, fmax=250, n_mels=32
    )
    onset_env_mid = librosa.onset.onset_strength(
        y=y, sr=sr, hop_length=512,
        feature=librosa.feature.melspectrogram,
        fmin=250, fmax=4000, n_mels=32
    )
    onset_env_high = librosa.onset.onset_strength(
        y=y, sr=sr, hop_length=512,
        feature=librosa.feature.melspectrogram,
        fmin=4000, fmax=8000, n_mels=32
    )

    # ── Beat Tracking via Dynamic Bayesian Network ─────────────────────
    # librosa.beat.beat_track uses autocorrelation-based tempo estimation
    # followed by a Dynamic Bayesian Network (Ellis 2007) for
    # probabilistic beat grid inference
    tempo, beat_frames = librosa.beat.beat_track(
        onset_envelope=onset_env, sr=sr, hop_length=512,
        start_bpm=120, tightness=100
    )
    beat_times = librosa.frames_to_time(beat_frames, sr=sr, hop_length=512)

    # ── Onset Peak Detection (individual hits) ─────────────────────────
    # Detect individual onset events using adaptive thresholding
    onset_frames = librosa.onset.onset_detect(
        onset_envelope=onset_env, sr=sr, hop_length=512,
        backtrack=True, delta=0.07, wait=3
    )
    onset_times = librosa.frames_to_time(onset_frames, sr=sr, hop_length=512)

    # ── Build Beat Events with Spectral Characterization ───────────────
    beat_events = []
    onset_env_norm = onset_env / (np.max(onset_env) + 1e-8)

    # Use onset times as the primary beat events (more precise than beat_track)
    # but merge with beat_track grid for rhythmic consistency
    all_times = np.unique(np.concatenate([beat_times, onset_times]))
    all_times = np.sort(all_times)
    all_times = all_times[all_times < duration - 0.05]

    # De-duplicate (remove events within 60ms of each other)
    if len(all_times) > 1:
        deduped = [all_times[0]]
        for t in all_times[1:]:
            if t - deduped[-1] >= 0.06:
                deduped.append(t)
        all_times = np.array(deduped)

    for t in all_times:
        frame_idx = librosa.time_to_frames(t, sr=sr, hop_length=512)
        frame_idx = min(frame_idx, len(onset_env_norm) - 1)

        # Determine intensity from onset envelope
        intensity = float(onset_env_norm[frame_idx])

        # Determine dominant spectral band
        bass_e = float(onset_env_bass[min(frame_idx, len(onset_env_bass)-1)])
        mid_e = float(onset_env_mid[min(frame_idx, len(onset_env_mid)-1)])
        high_e = float(onset_env_high[min(frame_idx, len(onset_env_high)-1)])

        max_band_e = max(bass_e, mid_e, high_e)
        if max_band_e < 0.01:
            band = "mid"
        elif bass_e >= mid_e and bass_e >= high_e:
            band = "bass" if bass_e > 0 else "sub-bass"
        elif high_e >= mid_e:
            band = "high"
        else:
            band = "mid"

        # Spectral flux at this frame
        flux = float(onset_env[frame_idx])

        beat_events.append({
            "timestamp_sec": round(float(t), 4),
            "intensity": round(max(0.0, min(1.0, intensity)), 4),
            "flux": round(flux, 4),
            "band": band,
        })

    # ── BPM Estimation with Confidence ─────────────────────────────────
    # librosa's tempo estimation: autocorrelation of onset envelope + DBN
    if hasattr(tempo, '__len__'):
        bpm = float(tempo[0]) if len(tempo) > 0 else 0.0
    else:
        bpm = float(tempo)

    # Fold into 60-180 range
    while bpm > 180:
        bpm /= 2
    while bpm < 60 and bpm > 0:
        bpm *= 2
    bpm = round(max(60, min(180, bpm)), 1)

    # Confidence from inter-beat interval consistency
    confidence = 0.0
    if len(beat_times) >= 3:
        ibis = np.diff(beat_times)
        if len(ibis) > 0:
            median_ibi = np.median(ibis)
            if median_ibi > 0:
                consistency = 1.0 - min(1.0, np.std(ibis) / median_ibi)
                inlier_ratio = np.mean(np.abs(ibis - median_ibi) < median_ibi * 0.3)
                confidence = round(float(consistency * inlier_ratio), 4)

    # If confidence is very low, fallback to 90 BPM
    if confidence < 0.3 and len(beat_events) < 5:
        bpm = 90.0
        confidence = 0.3

    # ── Volume Analysis ────────────────────────────────────────────────
    rms = librosa.feature.rms(y=y, hop_length=512)[0]
    peak_amplitude = float(np.max(np.abs(y)))
    peak_db = round(20 * np.log10(peak_amplitude + 1e-10), 1)
    mean_rms = float(np.mean(rms))
    mean_volume = round(min(1.0, mean_rms * 3), 4)  # Scale to 0-1

    # ── Audio Timeline (energy + flux per frame) ───────────────────────
    timeline = []
    n_frames = min(len(rms), len(onset_env), 600)
    step = max(1, len(rms) // n_frames)
    for i in range(0, min(len(rms), len(onset_env)), step):
        t = librosa.frames_to_time(i, sr=sr, hop_length=512)
        timeline.append({
            "time_sec": round(float(t), 4),
            "energy": round(float(rms[min(i, len(rms)-1)]), 6),
            "flux": round(float(onset_env[min(i, len(onset_env)-1)]), 4),
        })
        if len(timeline) >= 600:
            break

    # ── Rhythm Regions ─────────────────────────────────────────────────
    rhythm_regions = segment_rhythm_regions(onset_env, rms, sr, duration, bpm)

    return {
        "beats": [round(float(t), 4) for t in beat_times if t < duration],
        "beatEvents": beat_events[:500],
        "bpm": bpm,
        "bpmConfidence": confidence,
        "firstBeatSec": round(float(beat_times[0]), 4) if len(beat_times) > 0 else 0,
        "peakDb": peak_db,
        "meanVolume": mean_volume,
        "hasAudio": True,
        "audioTimeline": timeline,
        "rhythmRegions": rhythm_regions,
        "regionCount": len(rhythm_regions),
        "avgBeatIntensity": round(float(np.mean([b["intensity"] for b in beat_events])) if beat_events else 0, 4),
        "peakBeatIntensity": round(float(max(b["intensity"] for b in beat_events)) if beat_events else 0, 4),
        "beatDensity": round(len(beat_events) / max(duration, 0.1), 4),
        "timeSignatureGuess": guess_time_signature(beat_times, bpm),
        "processingMs": 0,  # Will be overridden by TypeScript
        "mlModel": "librosa-spectral-flux-dbn",
    }


def segment_rhythm_regions(onset_env, rms, sr, duration, bpm):
    """Segment the audio into rhythm regions based on energy levels."""
    import librosa
    regions = []
    hop = 512
    region_frames = max(1, int(2.0 * sr / hop))  # ~2 second regions

    for start_frame in range(0, len(onset_env), region_frames):
        end_frame = min(start_frame + region_frames, len(onset_env))
        start_sec = librosa.frames_to_time(start_frame, sr=sr, hop_length=hop)
        end_sec = librosa.frames_to_time(end_frame, sr=sr, hop_length=hop)

        if end_sec > duration:
            end_sec = duration

        seg_onset = onset_env[start_frame:end_frame]
        seg_rms = rms[start_frame:min(end_frame, len(rms))]

        avg_energy = float(np.mean(seg_rms)) if len(seg_rms) > 0 else 0
        avg_intensity = float(np.mean(seg_onset)) if len(seg_onset) > 0 else 0

        # Classify energy level
        if avg_energy < 0.01:
            label = "silent"
        elif avg_energy < 0.05:
            label = "low"
        elif avg_energy < 0.15:
            label = "medium"
        elif avg_energy < 0.3:
            label = "high"
        else:
            label = "peak"

        regions.append({
            "start_sec": round(float(start_sec), 3),
            "end_sec": round(float(end_sec), 3),
            "localBpm": round(bpm, 1),
            "avgIntensity": round(min(1.0, avg_intensity / (np.max(onset_env) + 1e-8)), 4),
            "energyLabel": label,
        })

    return regions


def guess_time_signature(beat_times, bpm):
    """Guess time signature from beat pattern."""
    if bpm <= 0 or len(beat_times) < 8:
        return "unknown"
    beat_interval = 60.0 / bpm
    align3 = align4 = 0
    for t in beat_times:
        phase3 = (t / (beat_interval * 3)) % 1
        phase4 = (t / (beat_interval * 4)) % 1
        if phase3 < 0.15 or phase3 > 0.85:
            align3 += 1
        if phase4 < 0.15 or phase4 > 0.85:
            align4 += 1
    r3 = align3 / len(beat_times)
    r4 = align4 / len(beat_times)
    if r4 > 0.3 and r4 >= r3:
        return "4/4"
    if r3 > 0.3 and r3 > r4:
        return "6/8" if bpm > 150 else "3/4"
    return "4/4"


def empty_result(duration=0):
    return {
        "beats": [], "beatEvents": [], "bpm": 0, "bpmConfidence": 0,
        "firstBeatSec": 0, "peakDb": -60, "meanVolume": 0, "hasAudio": False,
        "audioTimeline": [], "rhythmRegions": [], "regionCount": 0,
        "avgBeatIntensity": 0, "peakBeatIntensity": 0, "beatDensity": 0,
        "timeSignatureGuess": "unknown", "processingMs": 0,
        "mlModel": "none",
    }


def main():
    if len(sys.argv) < 2:
        print(json_dumps({"error": "Usage: ml_beat_detection.py <video_path>", **empty_result()}))
        return

    video_path = sys.argv[1]
    # Handle quoted paths from Windows shell
    if video_path.startswith('"') and video_path.endswith('"'):
        video_path = video_path[1:-1]
    
    if not os.path.isfile(video_path):
        print(json_dumps({"error": f"File not found: {video_path}", **empty_result()}))
        return

    # Extract audio to temp WAV
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
        wav_path = tmp.name

    try:
        if not extract_audio(video_path, wav_path):
            # No audio track or extraction failed
            print(json_dumps(empty_result()))
            return

        # Check if WAV has content
        if os.path.getsize(wav_path) < 1000:
            print(json_dumps(empty_result()))
            return

        result = analyze_beats(wav_path)
        print(json_dumps(result))
    except Exception as e:
        import traceback
        traceback.print_exc(file=sys.stderr)
        print(json_dumps({"error": str(e), **empty_result()}))
    finally:
        try:
            os.unlink(wav_path)
        except OSError:
            pass


if __name__ == "__main__":
    main()
