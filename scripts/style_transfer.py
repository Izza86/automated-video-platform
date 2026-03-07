#!/usr/bin/env python3
"""
Style transfer pipeline using MoviePy, Librosa and scikit-image.
Features:
- Color histogram matching using skimage.exposure.match_histograms
- Beat detection using librosa and aligning cuts/transitions to beats
- Audio looping using moviepy.audio.fx.all.audio_loop
- Cinematic overlays: film grain + vignette derived from reference

Usage:
  python scripts/style_transfer.py reference.mp4 target.mp4 output.mp4

Dependencies:
  pip install moviepy librosa scikit-image opencv-python-headless numpy soundfile

Notes:
- This processes frames in Python and can be slow for long videos.
- It guarantees output duration equals target duration and loops reference audio.
"""

import sys
import tempfile
import os
import math
import numpy as np

try:
    # MoviePy v2.x changed its package structure: 'moviepy.editor' no longer exists.
    # All public classes are now importable directly from 'moviepy'.
    from moviepy import VideoFileClip, AudioFileClip, concatenate_videoclips
    # AudioLoop is now a class-based effect under moviepy.audio.fx (v2.x)
    from moviepy.audio.fx import AudioLoop
except ImportError as _import_err:
    print(
        f"[style_transfer] ERROR: Could not import MoviePy v2.x.\n"
        f"  Make sure you are running this script with the correct Python interpreter\n"
        f"  (the one inside your .venv) and that moviepy>=2.0 is installed.\n"
        f"  Original error: {_import_err}",
        file=sys.stderr,
    )
    sys.exit(2)

try:
    from skimage.exposure import match_histograms as _match_histograms
    import inspect as _inspect
    # scikit-image >= 0.19 removed the `multichannel` kwarg in favour of `channel_axis`.
    _MH_USES_CHANNEL_AXIS = "channel_axis" in _inspect.signature(_match_histograms).parameters
except ImportError as _sk_err:
    print(f"[style_transfer] ERROR: scikit-image not found: {_sk_err}", file=sys.stderr)
    sys.exit(2)

import librosa
import cv2


def sample_frames(clip, n=10):
    duration = clip.duration
    if duration <= 0:
        return []
    # Stay 0.1 s away from the very end to avoid the '0 bytes read' ffmpeg
    # warning that occurs when seeking exactly to the last frame.
    safe_end = max(0.0, duration - 0.1)
    times = np.linspace(0, safe_end, min(n, max(1, int(n))))
    frames = []
    for t in times:
        try:
            frame = clip.get_frame(t)  # RGB uint8
            # Guard against empty / non-array results
            if frame is None or not isinstance(frame, np.ndarray) or frame.size == 0:
                continue
            frames.append(frame)
        except Exception:
            continue
    return frames


def compute_reference_template(ref_clip, samples=8):
    frames = sample_frames(ref_clip, n=samples)
    if not frames:
        return None
    # Use median frame as representative
    stack = np.stack(frames, axis=0).astype(np.float32)
    template = np.median(stack, axis=0).astype(np.uint8)
    return template


def detect_beats_from_audio(ref_clip, sr=22050):
    # Export audio to temp wav and use librosa to detect beats
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
        tmpname = tmp.name
    try:
        ref_clip.audio.write_audiofile(tmpname, fps=sr, logger=None)
        y, sr_loaded = librosa.load(tmpname, sr=sr)
        # onset strength -> beat_track
        onset_env = librosa.onset.onset_strength(y=y, sr=sr_loaded)
        tempo, beats = librosa.beat.beat_track(onset_envelope=onset_env, sr=sr_loaded)
        beat_times = librosa.frames_to_time(beats, sr=sr_loaded)
        # include 0 and ensure unique increasing times
        beat_times = np.unique(np.concatenate(([0.0], beat_times)))
        return beat_times.tolist()
    finally:
        try:
            os.unlink(tmpname)
        except Exception:
            pass


def compute_vignette_and_grain(ref_clip):
    # Sample frames and compute vignette strength and grain level
    frames = sample_frames(ref_clip, n=8)
    if not frames:
        return 0.0, 0.0
    vign_values = []
    grain_values = []
    for f in frames:
        # Validate frame before any OpenCV call
        if f is None or not isinstance(f, np.ndarray) or f.size == 0 or f.ndim < 2:
            continue
        try:
            # Ensure uint8 input for cvtColor (MoviePy may return float frames)
            f_u8 = np.clip(f, 0, 255).astype(np.uint8) if f.dtype != np.uint8 else f
            gray_u8 = cv2.cvtColor(f_u8, cv2.COLOR_RGB2GRAY)  # uint8, H×W
            gray = gray_u8.astype(np.float32)                  # float32 for maths
        except Exception:
            continue
        h, w = gray.shape
        # vignette: compare center vs corners
        cx1, cy1 = int(w * 0.4), int(h * 0.4)
        cx2, cy2 = int(w * 0.6), int(h * 0.6)
        center = gray[cy1:cy2, cx1:cx2]
        if center.size == 0:
            continue
        corner_sz_x = max(1, int(w * 0.15))
        corner_sz_y = max(1, int(h * 0.15))
        corners = [
            gray[0:corner_sz_y, 0:corner_sz_x],
            gray[0:corner_sz_y, w - corner_sz_x:w],
            gray[h - corner_sz_y:h, 0:corner_sz_x],
            gray[h - corner_sz_y:h, w - corner_sz_x:w],
        ]
        corner_means = [c.mean() for c in corners if c.size > 0]
        if not corner_means:
            continue
        vign = max(0.0, min(1.0, (center.mean() - np.mean(corner_means)) / max(1.0, center.mean())))
        vign_values.append(vign)
        # grain: estimate high-frequency energy via Laplacian variance.
        # cv2.Laplacian with CV_64F requires uint8 or float32 source; use the
        # uint8 gray image to avoid 'Unsupported combination of source format'.
        try:
            lap = cv2.Laplacian(gray_u8, cv2.CV_64F)
            grain_values.append(float(lap.var()))
        except cv2.error:
            # Last-resort fallback: use numpy gradient as proxy for sharpness
            grad = np.gradient(gray.astype(np.float64))
            grain_values.append(float(np.var(grad[0]) + np.var(grad[1])))
    vignette = float(np.mean(vign_values)) if vign_values else 0.0
    grain = float(np.mean(grain_values)) if grain_values else 0.0
    # normalize grain to a 0..1 scale (heuristic)
    grain_norm = max(0.0, min(0.4, grain / 500.0))
    return vignette, grain_norm


def apply_film_grain(frame, grain_strength=0.05):
    # frame is RGB uint8
    # Fully vectorized: randn broadcasts across channels via (h,w,1) shape,
    # avoiding the old per-pixel min/max normalization loop.
    h, w = frame.shape[:2]
    noise = np.random.randn(h, w, 1).astype(np.float32) * (grain_strength * 127.5)
    out = np.clip(frame.astype(np.float32) + noise, 0, 255).astype(np.uint8)
    return out


def build_vignette_mask(h, w, vignette_strength=0.2):
    """Pre-compute a radial vignette mask at the given resolution.
    Returns a float32 array of shape (h, w, 1) that can be reused across frames."""
    X = np.linspace(-1, 1, w, dtype=np.float32)[None, :]
    Y = np.linspace(-1, 1, h, dtype=np.float32)[:, None]
    radius = np.sqrt(X * X + Y * Y)
    mask = 1.0 - np.clip((radius - 0.5) * 2.0 * vignette_strength, 0.0, 1.0)
    return mask[:, :, None]


def apply_vignette(frame, vignette_strength=0.2, mask=None):
    # If a pre-computed mask is provided, skip the expensive per-frame rebuild.
    if mask is None:
        h, w = frame.shape[:2]
        mask = build_vignette_mask(h, w, vignette_strength)
    out = np.clip(frame.astype(np.float32) * mask, 0, 255).astype(np.uint8)
    return out


def reduce_saturation(frame, factor=0.85):
    """Blend frame toward its grayscale version.
    factor=1.0 keeps original colors; factor=0.0 produces full grayscale.
    Fully vectorized via NumPy broadcasting."""
    gray = np.mean(frame, axis=2, keepdims=True).astype(np.float32)
    out = gray + factor * (frame.astype(np.float32) - gray)
    return np.clip(out, 0, 255).astype(np.uint8)


def match_color(frame, reference_template):
    try:
        # skimage >= 0.19 uses channel_axis instead of the removed multichannel kwarg.
        if _MH_USES_CHANNEL_AXIS:
            matched = _match_histograms(frame, reference_template, channel_axis=-1)
        else:
            matched = _match_histograms(frame, reference_template, multichannel=True)
        matched = np.clip(matched, 0, 255).astype(np.uint8)
        return matched
    except Exception:
        return frame


def process(reference_path, target_path, output_path, samples=8, crossfade_on_beats=False):
    ref = VideoFileClip(reference_path)
    tgt = VideoFileClip(target_path)

    print(f"Reference duration: {ref.duration}s, Target duration: {tgt.duration}s")

    # Compute representative reference template for histogram matching
    ref_template = compute_reference_template(ref, samples=samples)
    if ref_template is None:
        raise RuntimeError("Failed to compute reference template")

    # ── Determine processing resolution (720p max width) ──────────────────
    # Base the processing size on the TARGET video so that every frame,
    # vignette mask, and histogram-template share the exact same dimensions.
    tgt_w, tgt_h = tgt.size          # MoviePy .size is (width, height)
    MAX_PROC_W = 720
    if tgt_w > MAX_PROC_W:
        scale = MAX_PROC_W / tgt_w
        proc_w = MAX_PROC_W
        proc_h = int(tgt_h * scale)
    else:
        proc_w, proc_h = tgt_w, tgt_h
    # Resize the reference template to the target's processing resolution so
    # histogram matching and all overlays operate at the same scale.
    ref_template_proc = cv2.resize(ref_template, (proc_w, proc_h), interpolation=cv2.INTER_AREA)
    print(f"Processing resolution: {proc_w}x{proc_h} (target native {tgt_w}x{tgt_h})")

    # Detect beats in reference audio
    if ref.audio is None:
        beat_times = [0.0]
    else:
        beat_times = detect_beats_from_audio(ref, sr=22050)
    print("Detected beats:", beat_times[:10], "...")

    # Compute cinematic overlay params
    vignette_strength, grain_strength = compute_vignette_and_grain(ref)
    print("Vignette strength:", vignette_strength, "Grain strength:", grain_strength)

    # Pre-compute vignette mask once at the processing resolution so it is
    # not rebuilt on every frame (major speedup on long videos).
    vignette_mask = None
    if vignette_strength > 0.02:
        vignette_mask = build_vignette_mask(proc_h, proc_w, vignette_strength * 0.9)

    # Build processed video clip by applying per-frame transforms
    def transform_frame(frame):
        # frame: RGB uint8 at original (target) resolution
        if frame.dtype != np.uint8:
            frame = np.clip(frame, 0, 255).astype(np.uint8)

        fh, fw = frame.shape[:2]
        needs_rescale = (fw != proc_w or fh != proc_h)

        # ── Downscale to processing resolution for faster per-frame work ─
        if needs_rescale:
            frame = cv2.resize(frame, (proc_w, proc_h), interpolation=cv2.INTER_AREA)

        out = match_color(frame, ref_template_proc)

        # Reduce saturation so histogram-matched colors look natural, not neon
        out = reduce_saturation(out, factor=0.80)

        if grain_strength > 0.01:
            # Grain reduced by 50% compared to original (* 0.4 instead of * 0.8)
            out = apply_film_grain(out, grain_strength * 0.4)
        if vignette_mask is not None:
            out = apply_vignette(out, mask=vignette_mask)

        out = np.clip(out, 0, 255).astype(np.uint8)

        # ── Upscale back to original resolution for final write ──────
        if needs_rescale:
            out = cv2.resize(out, (fw, fh), interpolation=cv2.INTER_LANCZOS4)

        return out

    processed = tgt.image_transform(transform_frame)

    # Ensure video plays full length without freezing: we will split at beat times
    # and re-concatenate (this aligns transitions to beats). Ensure last segment
    # ends exactly at target duration.
    tdur = tgt.duration
    # Build cut points as beat times clipped to target duration
    cut_times = [t for t in beat_times if 0 <= t < tdur]
    cut_times = sorted(set([0.0] + cut_times + [tdur]))
    segments = []
    for i in range(len(cut_times) - 1):
        s = float(cut_times[i])
        e = float(cut_times[i + 1])
        # Avoid zero-length
        if e - s < 1e-3:
            continue
        seg = processed.subclipped(s, e)
        segments.append(seg)

    if not segments:
        final_video = processed.with_duration(tdur)
    else:
        # Concatenate segments (exact cuts on beat boundaries)
        final_video = concatenate_videoclips(segments, method='compose')
        final_video = final_video.with_duration(tdur)

    # Loop reference audio to match target duration.
    # MoviePy v2.x uses class-based effects applied via .with_effects([...])
    if ref.audio is not None:
        looped_audio = ref.audio.with_effects([AudioLoop(duration=tdur)])
    else:
        looped_audio = None

    # Attach looped audio to final video
    if looped_audio is not None:
        final = final_video.with_audio(looped_audio)
    else:
        final = final_video

    # Write output file – use as many threads as cores allow (min 8) and
    # 'medium' preset for a good speed/quality trade-off (was 'slow').
    _threads = max(8, os.cpu_count() or 8)
    print(f"Writing output with {_threads} threads (preset=medium)")
    final.write_videofile(output_path, codec='libx264', audio_codec='aac', bitrate='5000k', preset='medium', threads=_threads)


if __name__ == '__main__':
    if len(sys.argv) < 4:
        print("Usage: python scripts/style_transfer.py reference.mp4 target.mp4 output.mp4")
        sys.exit(1)
    ref_path = sys.argv[1]
    tgt_path = sys.argv[2]
    out_path = sys.argv[3]
    process(ref_path, tgt_path, out_path)
