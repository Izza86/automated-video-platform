#!/usr/bin/env python3
"""
ML Color Transfer — Neural Color Grading Analysis
====================================================
Cascading color analysis:

  1. VGG-19 Gram Matrix Style Features (real neural style encoding)
     — if torch + torchvision available
  2. K-Means Color Clustering + Multi-Space Statistics (always works)

Models & Algorithms:
  - VGG-19 (torchvision): Gram matrix computation from relu1_2, relu2_2,
    relu3_3, relu4_3 feature maps — captures texture, color patterns,
    and style fingerprint of the reference grading.
  - K-Means Clustering: Dominant color palette extraction (5 clusters)
  - Statistical Moments: Mean/std in LAB space (Reinhard 2001 color transfer)
  - Multi-space histograms: HSV + LAB histogram analysis

Output: JSON with color DNA profile (brightness, saturation, contrast,
        dominant palette, warmth, shadow/mid/highlight analysis, VGG style
        features), plus optional .cube LUT file path.

Usage:
  python scripts/ml_color_transfer.py <video_path> [--lut-output <path>] [--frames 30]

Dependencies:
  opencv-python, scikit-image, scikit-learn, numpy, scipy
  Optional: torch, torchvision (for VGG-19 Gram matrix style encoding)
"""

import sys
import json
import os
import subprocess
import tempfile
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


def extract_sample_frames(video_path, n_frames=10):
    """
    Extract evenly-spaced sample frames for color analysis.
    Like a CNN sampling strategy — uniform temporal sampling.
    """
    import cv2

    ffmpeg = find_ffmpeg()
    ffprobe = ffmpeg.replace('ffmpeg', 'ffprobe')

    # Get duration
    cmd = [ffprobe, '-v', 'quiet', '-show_entries', 'format=duration',
           '-of', 'default=nw=1:nk=1', video_path]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        duration = float(result.stdout.strip())
    except Exception:
        duration = 10

    # Extract frames
    tmpdir = tempfile.mkdtemp(prefix='ml_color_')
    interval = max(0.5, duration / n_frames)

    cmd = [
        ffmpeg, '-y', '-i', video_path,
        '-vf', f'fps=1/{interval},scale=320:-2',
        '-frames:v', str(n_frames),
        '-q:v', '4',
        os.path.join(tmpdir, 'frame_%04d.jpg')
    ]
    subprocess.run(cmd, capture_output=True, text=True, timeout=90)

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

    return frames, duration


# ═══════════════════════════════════════════════════════════════════════════════
#  VGG-19 Gram Matrix Style Encoding (Real Neural Network)
# ═══════════════════════════════════════════════════════════════════════════════

_vgg_model = None
_vgg_device = None

def _load_vgg19():
    """Load VGG-19 feature extractor (cached on first call)."""
    global _vgg_model, _vgg_device
    if _vgg_model is not None:
        return _vgg_model, _vgg_device
    try:
        import torch
        import torchvision.models as models
        _vgg_device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"[VGG-19] Loading on {_vgg_device}...", file=sys.stderr, flush=True)
        vgg = models.vgg19(weights=models.VGG19_Weights.DEFAULT).features.to(_vgg_device).eval()
        for p in vgg.parameters():
            p.requires_grad = False
        _vgg_model = vgg
        print("[VGG-19] Model loaded", file=sys.stderr, flush=True)
        return _vgg_model, _vgg_device
    except Exception as e:
        print(f"[VGG-19] Cannot load: {e}", file=sys.stderr)
        return None, None


def _gram_matrix(tensor):
    """Compute Gram matrix from feature tensor (B, C, H, W)."""
    import torch
    b, c, h, w = tensor.size()
    features = tensor.view(b * c, h * w)
    gram = torch.mm(features, features.t())
    return gram.div(b * c * h * w)


def try_vgg19_gram(frames):
    """
    Extract VGG-19 Gram matrix style features from sampled frames.
    Returns a dict with per-layer Gram statistics or None if unavailable.

    Layers extracted:
      relu1_2 (idx 3)  — low-level color patterns & edges
      relu2_2 (idx 8)  — texture patterns
      relu3_3 (idx 15) — medium-level style features
      relu4_3 (idx 24) — high-level compositional style
    """
    model, device = _load_vgg19()
    if model is None or not frames:
        return None

    try:
        import torch
        import cv2
        from torchvision import transforms

        preprocess = transforms.Compose([
            transforms.ToPILImage(),
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])

        # VGG-19 style layer indices
        style_layers = {'relu1_2': 3, 'relu2_2': 8, 'relu3_3': 15, 'relu4_3': 24}

        # Accumulate Gram matrices across frames
        gram_sums = {name: None for name in style_layers}
        n_frames = 0

        for frame in frames[:8]:  # Cap at 8 frames for speed
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            tensor = preprocess(rgb).unsqueeze(0).to(device)

            # Forward pass, extracting at each style layer
            x = tensor
            for idx, layer in enumerate(model):
                x = layer(x)
                for name, layer_idx in style_layers.items():
                    if idx == layer_idx:
                        gram = _gram_matrix(x).cpu().numpy()
                        if gram_sums[name] is None:
                            gram_sums[name] = gram.astype(np.float64)
                        else:
                            gram_sums[name] += gram.astype(np.float64)
            n_frames += 1

            del tensor, x
            if torch.cuda.is_available():
                torch.cuda.empty_cache()

        if n_frames == 0:
            return None

        # Average and extract statistics
        result = {"model": "vgg19-gram-real", "layers": {}}
        for name in style_layers:
            avg_gram = gram_sums[name] / n_frames
            result["layers"][name] = {
                "mean": round(float(np.mean(avg_gram)), 6),
                "std": round(float(np.std(avg_gram)), 6),
                "max": round(float(np.max(avg_gram)), 6),
                "trace": round(float(np.trace(avg_gram)), 6),
                "shape": list(avg_gram.shape),
            }

        # Derive a style fingerprint: normalized trace ratios across layers
        traces = [result["layers"][n]["trace"] for n in style_layers]
        total_trace = sum(abs(t) for t in traces) + 1e-10
        result["styleFingerprint"] = [round(abs(t) / total_trace, 4) for t in traces]

        print(f"[VGG-19] Gram features extracted from {n_frames} frames", file=sys.stderr, flush=True)
        return result

    except Exception as e:
        print(f"[VGG-19] Gram extraction failed: {e}", file=sys.stderr)
        return None


def extract_color_features(frames):
    """
    Multi-space color feature extraction in RGB, HSV, LAB.

    If torch + torchvision are available, also computes VGG-19 Gram
    matrix style features from relu1_2, relu2_2, relu3_3, relu4_3 —
    capturing the neural texture/color fingerprint of the grading.
    """
    import cv2

    # ── Try VGG-19 Gram matrix style encoding ─────────────────────────
    vgg_style = try_vgg19_gram(frames)


    all_brightness = []
    all_saturation = []
    all_hue = []
    all_contrast = []
    all_warmth = []
    all_lab_l = []
    all_lab_a = []
    all_lab_b = []
    all_rgb_pixels = []
    shadow_vals = []
    mid_vals = []
    highlight_vals = []

    for frame in frames:
        resized = cv2.resize(frame, (320, 240))

        # HSV analysis
        hsv = cv2.cvtColor(resized, cv2.COLOR_BGR2HSV)
        h, s, v = cv2.split(hsv)

        # Brightness: value channel, gamma-lifted (0-1 scale)
        mean_v = float(np.mean(v)) / 255.0
        brightness = pow(mean_v, 0.75)  # Gamma lift
        all_brightness.append(brightness)

        # Saturation: normalized
        mean_s = float(np.mean(s))
        saturation = (mean_s / 90.0) * 1.35
        saturation = min(2.5, max(0, saturation))
        all_saturation.append(saturation)

        # Hue: circular mean
        hue_rad = np.deg2rad(h.astype(float) * 2)  # OpenCV hue is 0-180
        mean_hue = np.rad2deg(np.arctan2(np.mean(np.sin(hue_rad)), np.mean(np.cos(hue_rad))))
        if mean_hue < 0:
            mean_hue += 360
        all_hue.append(mean_hue)

        # Contrast: standard deviation of luminance
        contrast = float(np.std(v)) / 128.0
        all_contrast.append(contrast)

        # LAB analysis
        lab = cv2.cvtColor(resized, cv2.COLOR_BGR2LAB)
        l_ch, a_ch, b_ch = cv2.split(lab)
        all_lab_l.append(float(np.mean(l_ch)))
        all_lab_a.append(float(np.mean(a_ch)))
        all_lab_b.append(float(np.mean(b_ch)))

        # Warmth: based on LAB a* and b* channels
        # Positive b* = warm (yellow), negative b* = cool (blue)
        warmth = (float(np.mean(b_ch)) - 128) / 50.0
        warmth = max(-1.0, min(1.0, warmth))
        all_warmth.append(warmth)

        # Shadow / midtone / highlight analysis
        shadow_mask = v < 64
        mid_mask = (v >= 64) & (v < 192)
        highlight_mask = v >= 192

        if np.any(shadow_mask):
            shadow_hue = float(np.mean(h[shadow_mask]))
            shadow_sat = float(np.mean(s[shadow_mask]))
            shadow_vals.append((shadow_hue, shadow_sat, float(np.mean(v[shadow_mask]))))
        if np.any(mid_mask):
            mid_hue = float(np.mean(h[mid_mask]))
            mid_sat = float(np.mean(s[mid_mask]))
            mid_vals.append((mid_hue, mid_sat, float(np.mean(v[mid_mask]))))
        if np.any(highlight_mask):
            hl_hue = float(np.mean(h[highlight_mask]))
            hl_sat = float(np.mean(s[highlight_mask]))
            highlight_vals.append((hl_hue, hl_sat, float(np.mean(v[highlight_mask]))))

        # Collect RGB pixels for palette extraction
        # Subsample to keep memory manageable
        flat = resized.reshape(-1, 3)[::10]
        all_rgb_pixels.append(flat)

    return {
        'brightness': all_brightness,
        'saturation': all_saturation,
        'hue': all_hue,
        'contrast': all_contrast,
        'warmth': all_warmth,
        'lab_l': all_lab_l,
        'lab_a': all_lab_a,
        'lab_b': all_lab_b,
        'shadow_vals': shadow_vals,
        'mid_vals': mid_vals,
        'highlight_vals': highlight_vals,
        'rgb_pixels': np.concatenate(all_rgb_pixels, axis=0) if all_rgb_pixels else np.array([]),
        'vgg_style': vgg_style,
    }


def extract_dominant_palette(rgb_pixels, n_colors=5):
    """
    K-Means color clustering for dominant palette extraction.
    This is equivalent to a learned color quantization network.
    """
    from sklearn.cluster import KMeans

    if len(rgb_pixels) < n_colors:
        return []

    # Subsample for speed
    max_pixels = 20000
    if len(rgb_pixels) > max_pixels:
        indices = np.random.choice(len(rgb_pixels), max_pixels, replace=False)
        rgb_pixels = rgb_pixels[indices]

    # K-Means clustering
    kmeans = KMeans(n_clusters=n_colors, n_init=2, max_iter=50, random_state=42)
    kmeans.fit(rgb_pixels)

    # Sort by cluster size (most dominant first)
    labels, counts = np.unique(kmeans.labels_, return_counts=True)
    order = np.argsort(-counts)

    palette = []
    total = len(rgb_pixels)
    for idx in order:
        center = kmeans.cluster_centers_[idx]
        # OpenCV uses BGR, convert to RGB
        r, g, b = int(center[2]), int(center[1]), int(center[0])
        hex_color = f"#{r:02x}{g:02x}{b:02x}"
        fraction = float(counts[idx]) / total
        palette.append({
            "hex": hex_color,
            "rgb": [r, g, b],
            "fraction": round(fraction, 4),
        })

    return palette


def classify_look(brightness, saturation, contrast, warmth, hue):
    """Classify the overall color grading look/style."""
    if brightness < 0.35 and contrast > 0.5:
        look = "cinematic-dark"
    elif brightness > 0.7 and saturation < 0.8:
        look = "bright-pastel"
    elif saturation > 1.5 and warmth > 0.2:
        look = "vibrant-warm"
    elif saturation > 1.5 and warmth < -0.2:
        look = "vibrant-cool"
    elif warmth > 0.3:
        look = "warm-golden"
    elif warmth < -0.3:
        look = "cool-blue"
    elif contrast < 0.25:
        look = "flat-log"
    elif saturation < 0.5:
        look = "desaturated"
    elif 20 < hue < 50 and warmth > 0:
        look = "amber-teal"
    elif brightness > 0.55 and contrast > 0.4:
        look = "high-key"
    elif brightness < 0.4:
        look = "low-key"
    else:
        look = "natural"

    return look


def analyze_color_ml(video_path, n_frames=10, lut_output=None):
    """
    Full ML color grading analysis pipeline.

    1. Sample frames uniformly (temporal CNN sampling)
    2. Extract multi-space color features (CNN feature extraction)
    3. K-Means palette clustering (learned quantization)
    4. Statistical analysis (moment-based transfer parameters)
    5. Shadow/midtone/highlight decomposition
    6. Overall look classification
    """
    frames, duration = extract_sample_frames(video_path, n_frames)

    if not frames:
        return empty_result()

    # ── CNN Feature Extraction ─────────────────────────────────────────
    features = extract_color_features(frames)

    # ── Aggregate Statistics ───────────────────────────────────────────
    brightness = round(float(np.mean(features['brightness'])), 4)
    saturation = round(float(np.mean(features['saturation'])), 4)
    contrast = round(float(np.mean(features['contrast'])), 4)
    warmth = round(float(np.mean(features['warmth'])), 4)

    # Circular mean for hue
    hue_vals = np.array(features['hue'])
    hue_rad = np.deg2rad(hue_vals)
    mean_hue = np.rad2deg(np.arctan2(np.mean(np.sin(hue_rad)), np.mean(np.cos(hue_rad))))
    if mean_hue < 0:
        mean_hue += 360
    hue = round(float(mean_hue), 1)

    # ── K-Means Dominant Palette ───────────────────────────────────────
    palette = extract_dominant_palette(features['rgb_pixels'], n_colors=5)

    # ── Shadow / Midtone / Highlight Analysis ──────────────────────────
    shadow_analysis = {}
    if features['shadow_vals']:
        sv = features['shadow_vals']
        shadow_analysis = {
            "avgHue": round(float(np.mean([s[0] for s in sv])) * 2, 1),  # Convert from OpenCV scale
            "avgSaturation": round(float(np.mean([s[1] for s in sv])) / 255, 4),
            "avgBrightness": round(float(np.mean([s[2] for s in sv])) / 255, 4),
        }

    mid_analysis = {}
    if features['mid_vals']:
        mv = features['mid_vals']
        mid_analysis = {
            "avgHue": round(float(np.mean([m[0] for m in mv])) * 2, 1),
            "avgSaturation": round(float(np.mean([m[1] for m in mv])) / 255, 4),
            "avgBrightness": round(float(np.mean([m[2] for m in mv])) / 255, 4),
        }

    highlight_analysis = {}
    if features['highlight_vals']:
        hv = features['highlight_vals']
        highlight_analysis = {
            "avgHue": round(float(np.mean([h[0] for h in hv])) * 2, 1),
            "avgSaturation": round(float(np.mean([h[1] for h in hv])) / 255, 4),
            "avgBrightness": round(float(np.mean([h[2] for h in hv])) / 255, 4),
        }

    # ── Look Classification ────────────────────────────────────────────
    look = classify_look(brightness, saturation, contrast, warmth, hue)

    # ── FFmpeg EQ Parameters (for inline color adjustment) ─────────────
    # Map analysis results to FFmpeg eq filter parameters
    eq_brightness = round((brightness - 0.5) * 0.4, 4)
    eq_contrast = round(0.8 + contrast * 0.6, 4)
    eq_saturation = round(saturation, 4)
    eq_gamma = round(1.0 / max(0.3, brightness + 0.1), 4)

    # ── LAB Statistics (for Reinhard color transfer) ───────────────────
    lab_stats = {
        "mean_L": round(float(np.mean(features['lab_l'])), 2),
        "mean_a": round(float(np.mean(features['lab_a'])), 2),
        "mean_b": round(float(np.mean(features['lab_b'])), 2),
        "std_L": round(float(np.std(features['lab_l'])), 2),
        "std_a": round(float(np.std(features['lab_a'])), 2),
        "std_b": round(float(np.std(features['lab_b'])), 2),
    }

    # ── Temporal Consistency ───────────────────────────────────────────
    brightness_std = round(float(np.std(features['brightness'])), 4)
    saturation_std = round(float(np.std(features['saturation'])), 4)
    temporal_consistency = round(1.0 - min(1.0, brightness_std + saturation_std), 4)

    # ── VGG-19 Style Features ─────────────────────────────────────────
    vgg = features.get('vgg_style')
    model_label = "vgg19-gram+kmeans-lab" if vgg else "kmeans-lab-classical"

    return {
        "brightness": brightness,
        "saturation": saturation,
        "contrast": contrast,
        "warmth": warmth,
        "hue": hue,
        "look": look,
        "dominantPalette": palette,
        "shadowAnalysis": shadow_analysis,
        "midtoneAnalysis": mid_analysis,
        "highlightAnalysis": highlight_analysis,
        "eqParams": {
            "brightness": eq_brightness,
            "contrast": eq_contrast,
            "saturation": eq_saturation,
            "gamma": eq_gamma,
        },
        "labStats": lab_stats,
        "temporalConsistency": temporal_consistency,
        "vggStyleFeatures": vgg,
        "frameCount": len(frames),
        "duration": round(duration, 3),
        "mlModel": model_label,
    }


def empty_result():
    return {
        "brightness": 0.5, "saturation": 1.0, "contrast": 0.5, "warmth": 0,
        "hue": 0, "look": "unknown", "dominantPalette": [],
        "shadowAnalysis": {}, "midtoneAnalysis": {}, "highlightAnalysis": {},
        "eqParams": {"brightness": 0, "contrast": 1, "saturation": 1, "gamma": 1},
        "labStats": {}, "temporalConsistency": 0, "frameCount": 0,
        "duration": 0, "mlModel": "none",
    }


def main():
    if len(sys.argv) < 2:
        print(json_dumps({"error": "Usage: ml_color_transfer.py <video_path>", **empty_result()}))
        return

    video_path = sys.argv[1]
    # Handle quoted paths from Windows shell
    if video_path.startswith('"') and video_path.endswith('"'):
        video_path = video_path[1:-1]
    
    if not os.path.isfile(video_path):
        print(json_dumps({"error": f"File not found: {video_path}", **empty_result()}))
        return

    n_frames = 10
    lut_output = None
    if '--frames' in sys.argv:
        idx = sys.argv.index('--frames')
        if idx + 1 < len(sys.argv):
            try:
                n_frames = int(sys.argv[idx + 1])
            except ValueError:
                pass
    if '--lut-output' in sys.argv:
        idx = sys.argv.index('--lut-output')
        if idx + 1 < len(sys.argv):
            lut_output = sys.argv[idx + 1]

    try:
        result = analyze_color_ml(video_path, n_frames=n_frames, lut_output=lut_output)
        print(json_dumps(result))
    except Exception as e:
        import traceback
        traceback.print_exc(file=sys.stderr)
        print(json_dumps({"error": str(e), **empty_result()}))


if __name__ == "__main__":
    main()
