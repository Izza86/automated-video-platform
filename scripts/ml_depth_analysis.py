#!/usr/bin/env python3
"""
ML Depth Analysis — Real MiDaS / Depth-Anything Monocular Depth Estimation
============================================================================
Uses real pre-trained monocular depth estimation models for per-frame
depth map generation.

Model Cascade (tries in order):
  1. Depth-Anything V2 (via transformers) — state of the art (2024)
  2. MiDaS v3.1 DPT-Large (via torch.hub) — robust, well-tested
  3. MiDaS v2.1 Small (via torch.hub) — lightweight fallback
  4. FFmpeg blurdetect heuristic — no ML, worst quality

Each model produces per-pixel relative depth maps. We extract:
  - Per-frame mean depth, variance, fg/bg separation
  - Depth timeline across the video
  - Parallax classification (flat / deep-focus / shallow-dof / racking)

Output: JSON with depth timeline, parallax metrics, and depth style.

Usage:
  python scripts/ml_depth_analysis.py <video_path> [--fps 2] [--model auto]

Dependencies:
  torch, torchvision, timm, transformers (optional)
  Model weights auto-downloaded on first run (~350MB for MiDaS Large).
"""

import sys
import json
import os
import subprocess
import tempfile
import gc
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
    for p in [r'C:\ffmpeg\bin\ffmpeg.exe', r'C:\ProgramData\chocolatey\bin\ffmpeg.exe',
              '/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg']:
        if os.path.isfile(p):
            return p
    return 'ffmpeg'


def get_video_duration(video_path):
    """Get video duration in seconds."""
    ffmpeg = find_ffmpeg()
    ffprobe = ffmpeg.replace('ffmpeg', 'ffprobe')
    cmd = [ffprobe, '-v', 'quiet', '-show_entries', 'format=duration',
           '-of', 'default=nw=1:nk=1', video_path]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        return float(result.stdout.strip())
    except Exception:
        return 10


def extract_frames(video_path, fps=2, max_frames=60):
    """Extract frames for depth analysis."""
    import cv2

    ffmpeg = find_ffmpeg()
    tmpdir = tempfile.mkdtemp(prefix='ml_depth_')

    cmd = [
        ffmpeg, '-y', '-i', video_path,
        '-vf', f'fps={fps},scale=384:-2',
        '-frames:v', str(max_frames),
        '-q:v', '3',
        os.path.join(tmpdir, 'frame_%06d.jpg')
    ]
    subprocess.run(cmd, capture_output=True, text=True, timeout=120)

    frames = []
    for fname in sorted(os.listdir(tmpdir)):
        if fname.endswith('.jpg'):
            fpath = os.path.join(tmpdir, fname)
            frame = cv2.imread(fpath)
            if frame is not None:
                frames.append(frame)
            try:
                os.unlink(fpath)
            except OSError:
                pass

    try:
        os.rmdir(tmpdir)
    except OSError:
        pass

    return frames


# ═══════════════════════════════════════════════════════════════════════════════
#  Model Cascade — Depth-Anything → MiDaS Large → MiDaS Small
# ═══════════════════════════════════════════════════════════════════════════════

def try_depth_anything(frames):
    """
    Try Depth-Anything V2 via HuggingFace transformers.
    State-of-the-art monocular depth estimation (2024).
    """
    try:
        import torch
        from transformers import AutoImageProcessor, AutoModelForDepthEstimation
        from PIL import Image
        import cv2

        print("[Depth-Anything] Loading Depth-Anything-V2-Small...", file=sys.stderr, flush=True)
        device = "cuda" if torch.cuda.is_available() else "cpu"

        processor = AutoImageProcessor.from_pretrained("depth-anything/Depth-Anything-V2-Small-hf")
        model = AutoModelForDepthEstimation.from_pretrained("depth-anything/Depth-Anything-V2-Small-hf").to(device)
        model.eval()

        print(f"[Depth-Anything] Model loaded on {device}, processing {len(frames)} frames...",
              file=sys.stderr, flush=True)

        depth_maps = []
        for i, frame in enumerate(frames):
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            pil_img = Image.fromarray(rgb)

            inputs = processor(images=pil_img, return_tensors="pt").to(device)
            with torch.no_grad():
                outputs = model(**inputs)
                predicted_depth = outputs.predicted_depth

            # Interpolate to original size
            depth = torch.nn.functional.interpolate(
                predicted_depth.unsqueeze(1),
                size=frame.shape[:2],
                mode="bicubic",
                align_corners=False,
            ).squeeze().cpu().numpy()

            # Normalize to 0-1
            depth = (depth - depth.min()) / (depth.max() - depth.min() + 1e-8)
            depth_maps.append(depth)

            if (i + 1) % 5 == 0:
                print(f"[Depth-Anything] {i+1}/{len(frames)} frames processed", file=sys.stderr, flush=True)

        del model, processor
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        gc.collect()

        return depth_maps, "depth-anything-v2-small"

    except ImportError as e:
        print(f"[Depth-Anything] Not available: {e}", file=sys.stderr)
        return None, None
    except Exception as e:
        print(f"[Depth-Anything] Failed: {e}", file=sys.stderr)
        return None, None


def try_midas(frames, model_type="DPT_Large"):
    """
    Try MiDaS depth estimation via torch.hub.

    MiDaS models (Intel ISL):
      - DPT_Large:  384x384 input, DPT-Large architecture (~350MB)
      - DPT_Hybrid: 384x384 input, DPT-Hybrid architecture (~120MB)
      - MiDaS_small: 256x256 input, EfficientNet backbone (~20MB)
    """
    try:
        import torch
        import cv2

        print(f"[MiDaS] Loading {model_type} from torch.hub...", file=sys.stderr, flush=True)
        device = "cuda" if torch.cuda.is_available() else "cpu"

        model = torch.hub.load("intel-isl/MiDaS", model_type, trust_repo=True)
        model.to(device).eval()

        midas_transforms = torch.hub.load("intel-isl/MiDaS", "transforms", trust_repo=True)
        if model_type in ["DPT_Large", "DPT_Hybrid"]:
            transform = midas_transforms.dpt_transform
        else:
            transform = midas_transforms.small_transform

        print(f"[MiDaS] {model_type} loaded on {device}, processing {len(frames)} frames...",
              file=sys.stderr, flush=True)

        depth_maps = []
        for i, frame in enumerate(frames):
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            input_batch = transform(rgb).to(device)

            with torch.no_grad():
                prediction = model(input_batch)
                prediction = torch.nn.functional.interpolate(
                    prediction.unsqueeze(1),
                    size=frame.shape[:2],
                    mode="bicubic",
                    align_corners=False,
                ).squeeze()

            depth = prediction.cpu().numpy()
            # Normalize to 0-1 (MiDaS outputs inverse depth)
            depth = (depth - depth.min()) / (depth.max() - depth.min() + 1e-8)
            depth_maps.append(depth)

            if (i + 1) % 5 == 0:
                print(f"[MiDaS] {i+1}/{len(frames)} frames processed", file=sys.stderr, flush=True)

        del model
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        gc.collect()

        return depth_maps, f"midas-{model_type.lower()}"

    except Exception as e:
        print(f"[MiDaS] {model_type} failed: {e}", file=sys.stderr)
        return None, None


def analyze_depth_maps(depth_maps, fps, duration):
    """Analyze depth maps to extract per-frame metrics."""
    timeline = []

    for i, depth in enumerate(depth_maps):
        t = i / fps
        if t > duration:
            break

        mean_depth = float(np.mean(depth))
        depth_variance = float(np.var(depth))

        # Foreground-background separation:
        # Compute the difference between the upper quartile and lower quartile
        # of depth values — large gap = strong fg/bg separation
        q25 = float(np.percentile(depth, 25))
        q75 = float(np.percentile(depth, 75))
        fg_bg_separation = min(1.0, (q75 - q25) * 2)  # Scale to 0-1

        timeline.append({
            "time_sec": round(t, 4),
            "meanDepth": round(mean_depth, 4),
            "depthVariance": round(depth_variance, 4),
            "fgBgSeparation": round(fg_bg_separation, 4),
        })

    # Aggregate metrics
    avg_fg_bg = float(np.mean([f["fgBgSeparation"] for f in timeline])) if timeline else 0
    avg_mean_depth = float(np.mean([f["meanDepth"] for f in timeline])) if timeline else 0.5
    has_strong_parallax = avg_fg_bg > 0.4

    # Classify depth style
    if timeline and len(timeline) > 4:
        sep_values = [f["fgBgSeparation"] for f in timeline]
        sep_variance = float(np.var(sep_values))
        if sep_variance > 0.04:
            depth_style = "racking"
        elif avg_fg_bg > 0.6:
            depth_style = "shallow-dof"
        elif avg_fg_bg > 0.25:
            depth_style = "deep-focus"
        else:
            depth_style = "flat"
    else:
        depth_style = "flat"

    return {
        "depthTimeline": timeline,
        "avgFgBgSeparation": round(avg_fg_bg, 4),
        "hasStrongParallax": has_strong_parallax,
        "depthStyle": depth_style,
        "avgMeanDepth": round(avg_mean_depth, 4),
    }


# ═══════════════════════════════════════════════════════════════════════════════
#  Main Pipeline
# ═══════════════════════════════════════════════════════════════════════════════

def analyze_depth(video_path, fps=2, model_pref="auto"):
    """
    Full depth analysis pipeline with model cascade.

    Order: Depth-Anything V2 → MiDaS DPT-Large → MiDaS Small → empty
    """
    duration = get_video_duration(video_path)
    frames = extract_frames(video_path, fps=fps, max_frames=60)

    if not frames:
        return empty_result(duration)

    print(f"[depth] Extracted {len(frames)} frames at {fps}fps for depth analysis",
          file=sys.stderr, flush=True)

    depth_maps = None
    model_name = "none"

    # Model cascade
    if model_pref in ("auto", "depth-anything-v2"):
        depth_maps, model_name = try_depth_anything(frames)

    if depth_maps is None and model_pref in ("auto", "midas-large"):
        depth_maps, model_name = try_midas(frames, "DPT_Large")

    if depth_maps is None and model_pref in ("auto", "midas-hybrid"):
        depth_maps, model_name = try_midas(frames, "DPT_Hybrid")

    if depth_maps is None and model_pref in ("auto", "midas-small"):
        depth_maps, model_name = try_midas(frames, "MiDaS_small")

    if depth_maps is None:
        print("[depth] All depth models unavailable, returning empty result", file=sys.stderr)
        return empty_result(duration)

    print(f"[depth] Depth estimation complete with {model_name}: {len(depth_maps)} maps",
          file=sys.stderr, flush=True)

    result = analyze_depth_maps(depth_maps, fps, duration)
    result["mlModel"] = model_name
    return result


def empty_result(duration=0):
    return {
        "depthTimeline": [],
        "avgFgBgSeparation": 0,
        "hasStrongParallax": False,
        "depthStyle": "flat",
        "avgMeanDepth": 0.5,
        "mlModel": "none",
    }


def main():
    if len(sys.argv) < 2:
        print(json_dumps({"error": "Usage: ml_depth_analysis.py <video_path> [--fps 2] [--model auto]",
                          **empty_result()}))
        return

    video_path = sys.argv[1]
    if video_path.startswith('"') and video_path.endswith('"'):
        video_path = video_path[1:-1]

    if not os.path.isfile(video_path):
        print(json_dumps({"error": f"File not found: {video_path}", **empty_result()}))
        return

    fps = 2
    model = "auto"
    if '--fps' in sys.argv:
        idx = sys.argv.index('--fps')
        if idx + 1 < len(sys.argv):
            try:
                fps = int(sys.argv[idx + 1])
            except ValueError:
                pass
    if '--model' in sys.argv:
        idx = sys.argv.index('--model')
        if idx + 1 < len(sys.argv):
            model = sys.argv[idx + 1]

    try:
        result = analyze_depth(video_path, fps=fps, model_pref=model)
        print(json_dumps(result))
    except Exception as e:
        import traceback
        traceback.print_exc(file=sys.stderr)
        print(json_dumps({"error": str(e), **empty_result()}))


if __name__ == "__main__":
    main()
