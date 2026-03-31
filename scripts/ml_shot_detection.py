#!/usr/bin/env python3
"""
ML Shot Detection — TransNetV2 → PySceneDetect → Classical Fusion
===================================================================
Cascading shot boundary detection:

  1. TransNetV2 (real 3D CNN) — if transnetv2 package installed
  2. PySceneDetect (ContentDetector + AdaptiveDetector) — if scenedetect installed
  3. Classical multi-signal fusion fallback — always works

TransNetV2: Frame-level shot boundary probability via 3D DDCNN
  trained on ClipShots + BBC + RAI datasets.

PySceneDetect: Perceptual hashing + HSV + adaptive threshold —
  robust production-grade scene detection.

Classical: HSV histogram chi-sq + LAB Bhattacharyya + real SSIM +
  Canny edge density fusion with adaptive thresholding.

Output: JSON with shot boundaries, transition types, confidence scores.

Usage:
  python scripts/ml_shot_detection.py <video_path> [--fps 5]
"""

import sys
import json
import os
import subprocess
import tempfile
import numpy as np


class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (np.integer,)): return int(obj)
        if isinstance(obj, (np.floating,)): return float(obj)
        if isinstance(obj, np.ndarray): return obj.tolist()
        return super().default(obj)

def json_dumps(obj):
    return json.dumps(obj, cls=NumpyEncoder)

def find_ffmpeg():
    for name in ['ffmpeg', 'ffmpeg.exe']:
        for d in os.environ.get('PATH', '').split(os.pathsep):
            p = os.path.join(d, name)
            if os.path.isfile(p): return p
    for p in [r'C:\ffmpeg\bin\ffmpeg.exe', r'C:\ProgramData\chocolatey\bin\ffmpeg.exe',
              '/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg']:
        if os.path.isfile(p): return p
    return 'ffmpeg'

def get_video_duration(video_path):
    ffmpeg = find_ffmpeg()
    ffprobe = ffmpeg.replace('ffmpeg', 'ffprobe')
    cmd = [ffprobe, '-v', 'quiet', '-show_entries', 'format=duration',
           '-of', 'default=nw=1:nk=1', video_path]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        return float(result.stdout.strip())
    except Exception:
        return 0

def extract_frames(video_path, fps=2, max_frames=200, scale='240:-2'):
    import cv2
    ffmpeg = find_ffmpeg()
    tmpdir = tempfile.mkdtemp(prefix='ml_shots_')
    cmd = [ffmpeg, '-y', '-i', video_path,
           '-vf', f'fps={fps},scale={scale}',
           '-frames:v', str(max_frames), '-q:v', '4',
           os.path.join(tmpdir, 'frame_%06d.jpg')]
    subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    frames = []
    for i, fname in enumerate(sorted(f for f in os.listdir(tmpdir) if f.endswith('.jpg'))):
        fpath = os.path.join(tmpdir, fname)
        frame = cv2.imread(fpath)
        if frame is not None:
            frames.append((i / fps, frame))
        try: os.unlink(fpath)
        except OSError: pass
    try: os.rmdir(tmpdir)
    except OSError: pass
    return frames


# ═══════════════════════════════════════════════════════════════════════════════
#  Tier 1 — Real TransNetV2
# ═══════════════════════════════════════════════════════════════════════════════

def try_transnetv2(video_path, fps=5):
    try:
        from transnetv2 import TransNetV2 as TransNetV2Model
        import cv2
    except ImportError:
        print("[TransNetV2] transnetv2 package not installed", file=sys.stderr)
        return None

    try:
        print("[TransNetV2] Loading model...", file=sys.stderr, flush=True)
        model = TransNetV2Model()
        duration = get_video_duration(video_path)

        frms = extract_frames(video_path, fps=fps, max_frames=500, scale='48:27')
        if len(frms) < 3: return None

        import cv2
        frames_np = np.array([cv2.cvtColor(f, cv2.COLOR_BGR2RGB) for _, f in frms], dtype=np.uint8)
        print(f"[TransNetV2] Processing {len(frames_np)} frames...", file=sys.stderr, flush=True)

        single_preds, _ = model.predict_frames(frames_np)
        scenes = model.predictions_to_scenes(single_preds)

        boundaries = []
        for i in range(len(scenes) - 1):
            end_frame = scenes[i][1]
            t = end_frame / fps
            conf = float(single_preds[end_frame]) if end_frame < len(single_preds) else 0.8
            boundaries.append({
                "time_sec": round(t, 4),
                "type": "cut" if conf > 0.2 else "gradual",
                "confidence": round(min(1.0, conf), 4),
                "score": round(conf, 4),
            })

        return _build_result(boundaries, duration, "transnetv2-real")
    except Exception as e:
        print(f"[TransNetV2] Failed: {e}", file=sys.stderr)
        return None


# ═══════════════════════════════════════════════════════════════════════════════
#  Tier 2 — PySceneDetect (ContentDetector + AdaptiveDetector)
# ═══════════════════════════════════════════════════════════════════════════════

def try_pyscenedetect(video_path):
    try:
        from scenedetect import open_video, SceneManager
        from scenedetect.detectors import ContentDetector, AdaptiveDetector
    except ImportError:
        print("[PySceneDetect] Not installed", file=sys.stderr)
        return None

    try:
        print("[PySceneDetect] Running dual detectors...", file=sys.stderr, flush=True)
        duration = get_video_duration(video_path)
        video = open_video(video_path)
        sm = SceneManager()
        sm.add_detector(ContentDetector(threshold=27.0, min_scene_len=8, luma_only=False))
        sm.add_detector(AdaptiveDetector(adaptive_threshold=3.0, min_scene_len=10, min_content_val=15.0))
        sm.detect_scenes(video)
        scene_list = sm.get_scene_list()

        boundaries = []
        for i, (start, end) in enumerate(scene_list):
            if i > 0:
                boundaries.append({
                    "time_sec": round(start.get_seconds(), 4),
                    "type": "cut", "confidence": 0.85, "score": 0.85,
                })

        return _build_result(boundaries, duration, "pyscenedetect-content-adaptive")
    except Exception as e:
        print(f"[PySceneDetect] Failed: {e}", file=sys.stderr)
        return None


# ═══════════════════════════════════════════════════════════════════════════════
#  Tier 3 — Classical Multi-Signal Fusion (always works)
# ═══════════════════════════════════════════════════════════════════════════════

def compute_ssim_real(img1, img2):
    """Real SSIM — uses skimage if available, else Wang 2004 formula."""
    try:
        from skimage.metrics import structural_similarity
        return float(structural_similarity(img1, img2, data_range=255))
    except ImportError:
        mu1, mu2 = float(np.mean(img1.astype(float))), float(np.mean(img2.astype(float)))
        s1, s2 = float(np.std(img1.astype(float))), float(np.std(img2.astype(float)))
        s12 = float(np.mean((img1.astype(float) - mu1) * (img2.astype(float) - mu2)))
        C1, C2 = (0.01*255)**2, (0.03*255)**2
        return max(0.0, min(1.0,
            (2*mu1*mu2+C1)/(mu1**2+mu2**2+C1) *
            (2*s1*s2+C2)/(s1**2+s2**2+C2) *
            (s12+C2/2)/(s1*s2+C2/2)
        ))

def detect_shots_classical(video_path, fps=2):
    import cv2
    duration = get_video_duration(video_path)
    frames = extract_frames(video_path, fps=fps)
    if len(frames) < 3:
        return _build_result([], duration, "classical-fusion-fallback")

    # Feature extraction
    features = []
    for _, frame in frames:
        resized = cv2.resize(frame, (240, 180))
        hsv = cv2.cvtColor(resized, cv2.COLOR_BGR2HSV)
        lab = cv2.cvtColor(resized, cv2.COLOR_BGR2LAB)
        gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
        h_h = cv2.calcHist([hsv], [0], None, [32], [0, 180]); cv2.normalize(h_h, h_h)
        h_s = cv2.calcHist([hsv], [1], None, [32], [0, 256]); cv2.normalize(h_s, h_s)
        h_v = cv2.calcHist([hsv], [2], None, [32], [0, 256]); cv2.normalize(h_v, h_v)
        h_l = cv2.calcHist([lab], [0], None, [16], [0, 256]); cv2.normalize(h_l, h_l)
        h_a = cv2.calcHist([lab], [1], None, [16], [0, 256]); cv2.normalize(h_a, h_a)
        h_b = cv2.calcHist([lab], [2], None, [16], [0, 256]); cv2.normalize(h_b, h_b)
        edges = cv2.Canny(gray, 50, 150)
        features.append({
            'hist_hsv': np.concatenate([h_h, h_s, h_v]).flatten(),
            'hist_lab': np.concatenate([h_l, h_a, h_b]).flatten(),
            'edge_density': float(np.count_nonzero(edges)) / edges.size,
            'gray': gray,
        })

    # Compute inter-frame distances
    hist_d, lab_d, ssim_s, edge_d = [], [], [], []
    for i in range(1, len(features)):
        p, c = features[i-1], features[i]
        hist_d.append(cv2.compareHist(p['hist_hsv'].astype(np.float32), c['hist_hsv'].astype(np.float32), cv2.HISTCMP_CHISQR))
        lab_d.append(cv2.compareHist(p['hist_lab'].astype(np.float32), c['hist_lab'].astype(np.float32), cv2.HISTCMP_BHATTACHARYYA))
        ssim_s.append(compute_ssim_real(p['gray'], c['gray']))
        edge_d.append(abs(c['edge_density'] - p['edge_density']))

    def norm(a):
        a = np.array(a, dtype=float)
        m = np.max(a)
        return a / m if m > 0 else a

    fusion = 0.35*norm(hist_d) + 0.25*norm(lab_d) + 0.25*(1.0-np.array(ssim_s)) + 0.15*norm(edge_d)
    med = float(np.median(fusion))
    mad = float(np.median(np.abs(fusion - med)))
    cut_th = max(0.08, med + 2.0*mad)
    grad_th = max(0.05, med + 1.2*mad)

    boundaries = []
    min_gap = max(2, int(fps * 0.4))
    i = 0
    while i < len(fusion):
        s = fusion[i]
        if s >= cut_th:
            boundaries.append({"time_sec": round(frames[i+1][0], 4), "type": "cut",
                             "confidence": round(min(1.0, float(s/(cut_th+0.01))), 4), "score": round(float(s), 4)})
            i += min_gap; continue
        elif s >= grad_th:
            ws, we = max(0, i-2), min(len(fusion), i+4)
            wsc = fusion[ws:we]
            if len(wsc) >= 3 and np.mean(wsc) > grad_th*0.8:
                boundaries.append({"time_sec": round(frames[i+1][0], 4), "type": "gradual",
                                 "confidence": round(min(1.0, float(np.mean(wsc)/(grad_th+0.01))*0.8), 4),
                                 "score": round(float(s), 4)})
                i += min_gap; continue
        i += 1

    result = _build_result(boundaries, duration, "classical-ssim-fusion")
    result["fusionThreshold"] = round(cut_th, 4)
    result["gradualThreshold"] = round(grad_th, 4)
    return result


# ═══════════════════════════════════════════════════════════════════════════════
#  Shared helpers
# ═══════════════════════════════════════════════════════════════════════════════

def _build_result(boundaries, duration, model_name):
    shots = []
    prev = 0.0
    for b in boundaries:
        if b["time_sec"] > prev + 0.2:
            shots.append({"start_sec": round(prev, 4), "end_sec": round(b["time_sec"], 4),
                         "confidence": b["confidence"], "type": b["type"]})
            prev = b["time_sec"]
    if prev < duration - 0.1:
        shots.append({"start_sec": round(prev, 4), "end_sec": round(duration, 4), "confidence": 1.0, "type": "end"})
    if not shots:
        shots = [{"start_sec": 0, "end_sec": round(duration, 4), "confidence": 1.0, "type": "cut"}]
    durs = [s["end_sec"]-s["start_sec"] for s in shots]
    return {
        "shots": shots, "boundaries": boundaries,
        "shotCount": len(shots),
        "cutCount": sum(1 for b in boundaries if b["type"]=="cut"),
        "gradualCount": sum(1 for b in boundaries if b["type"]=="gradual"),
        "avgShotDuration": round(float(np.mean(durs)) if durs else duration, 3),
        "minShotDuration": round(float(min(durs)) if durs else 0, 3),
        "maxShotDuration": round(float(max(durs)) if durs else duration, 3),
        "mlModel": model_name,
    }


def main():
    if len(sys.argv) < 2:
        print(json_dumps({"error": "Usage: ml_shot_detection.py <video_path> [--fps 5]", "shots": [], "shotCount": 0, "mlModel": "none"}))
        return
    video_path = sys.argv[1]
    if video_path.startswith('"') and video_path.endswith('"'): video_path = video_path[1:-1]
    if not os.path.isfile(video_path):
        print(json_dumps({"error": f"File not found: {video_path}", "shots": [], "shotCount": 0, "mlModel": "none"}))
        return
    fps = 5
    if '--fps' in sys.argv:
        idx = sys.argv.index('--fps')
        if idx+1 < len(sys.argv):
            try: fps = int(sys.argv[idx+1])
            except ValueError: pass
    try:
        # Cascade: TransNetV2 → PySceneDetect → Classical
        result = try_transnetv2(video_path, fps=fps)
        if result is None:
            result = try_pyscenedetect(video_path)
        if result is None:
            result = detect_shots_classical(video_path, fps=fps)
        print(json_dumps(result))
    except Exception as e:
        import traceback; traceback.print_exc(file=sys.stderr)
        print(json_dumps({"error": str(e), "shots": [], "shotCount": 0, "mlModel": "error"}))

if __name__ == "__main__":
    main()
