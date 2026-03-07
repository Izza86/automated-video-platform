#!/usr/bin/env python3
"""
AI Style-Cloner Video Analyzer — CapCut / TikTok Grade
=======================================================
Deep-extracts *every* visual, audio, and pacing characteristic from a
reference video and outputs a comprehensive JSON schema to stdout.

Analysis categories:
  1.  Color DNA         — RGB balance, shadow / midtone / highlight tints,
                          dominant palette, channel offsets for FFmpeg colorchannelmixer
  2.  Grain & Texture   — film-grain / noise density via Laplacian variance delta
  3.  Vignette & Blur   — edge-darkening strength + lens-blur / bokeh detection
  4.  Velocity Map      — per-segment speed-ramp detection (slow-mo ↔ fast-forward)
  5.  Motion Analysis   — optical-flow intensity + cinematic motion-blur flag
  6.  Audio Beats       — RMS peak timestamps, first beat for sync, peak dB
  7.  Classic Metrics   — brightness, contrast, saturation, sharpness
  8.  Shot Boundaries   — histogram χ² + edge-change-ratio + temporal-diff
                          fusion for hard cuts & gradual transitions
  9.  Aspect / Orient.  — width:height ratio, horizontal / vertical / square

Dependencies:
  pip install opencv-python-headless numpy scikit-learn

Usage:
  python scripts/analyzer.py <video_path> [ffprobe_path]
"""

import sys, json, os, subprocess
from pathlib import Path
from math import gcd

try:
    import cv2
    import numpy as np
    from sklearn.cluster import KMeans
except Exception as e:
    print(json.dumps({"error": "missing_python_dependency", "message": str(e)}))
    sys.exit(2)

# PySceneDetect is no longer needed — shot boundary detection is handled
# natively via histogram + edge-change-ratio + temporal-diff fusion below.

# ─── helpers ───────────────────────────────────────────────────────────────
_avg = lambda a, d=0.0: float(np.mean(a)) if len(a) else float(d)
_clamp = lambda v, lo, hi: max(lo, min(hi, v))


# ═══════════════════════════════════════════════════════════════════════════
# 1. Frame Sampling (returns full-res + thumbnail lists)
# ═══════════════════════════════════════════════════════════════════════════
def sample_frames(path, max_samples=40):
    """Return (thumb_frames, timestamps, frame_count, duration, fps, w, h)."""
    cap = cv2.VideoCapture(str(path))
    if not cap.isOpened():
        return [], [], 0, 0.0, 30.0, 0, 0
    fc = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    dur = fc / fps if fps > 0 else 0.0

    indices = np.linspace(0, max(fc - 1, 0), min(max_samples, max(fc, 1))).astype(int)
    frames, timestamps = [], []
    for idx in indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(idx))
        ok, frame = cap.read()
        if not ok:
            continue
        timestamps.append(float(idx) / fps if fps > 0 else 0.0)
        frames.append(cv2.resize(frame, (160, 90), interpolation=cv2.INTER_AREA))
    cap.release()
    return frames, timestamps, fc, dur, fps, w, h


# ═══════════════════════════════════════════════════════════════════════════
# 2. Shot Boundary Detection  (histogram + ECR + temporal-diff fusion)
# ═══════════════════════════════════════════════════════════════════════════
def detect_shot_boundaries(path):
    """Real shot-boundary detection via three fused signals:

    1. **Histogram χ² distance** (HSV, 3-channel) — sensitive to global
       colour shifts that accompany hard cuts.
    2. **Edge Change Ratio (ECR)** — ratio of entering/exiting Canny
       edge pixels; spikes on scene changes while staying low during
       camera motion.
    3. **Temporal pixel difference** — mean |ΔI| between consecutive
       greyscale thumbnails; catches fades, dissolves, and wipes.

    The three normalised signals are fused with learned-style weights
    (0.45 / 0.30 / 0.25).  An adaptive dual-threshold scheme then
    classifies each peak as *hard_cut* or *gradual_transition*.

    Returns
    -------
    scenes : list[dict]          — legacy segment list {start_sec, end_sec}
    cut_timeline : list[dict]    — per-cut detail with timestamp, type,
                                   confidence, and per-signal scores
    """
    cap = cv2.VideoCapture(str(path))
    if not cap.isOpened():
        return [], []

    fc  = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    dur = fc / fps if fps > 0 else 0.0

    if fc < 2:
        cap.release()
        return [{"start_sec": 0.0, "end_sec": round(dur, 3)}], []

    # Sample at ~10 fps equivalent — high enough to catch single-frame
    # hard cuts yet fast enough for multi-minute references.
    step = max(1, int(round(fps / 10)))

    hist_diffs, ecr_scores, td_scores, timestamps = [], [], [], []
    prev_small = prev_gray = prev_edges = None
    frame_idx = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if frame_idx % step != 0:
            frame_idx += 1
            continue

        ts    = frame_idx / fps
        small = cv2.resize(frame, (160, 90), interpolation=cv2.INTER_AREA)
        gray  = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 50, 150)

        if prev_small is not None:
            # ── 1. Histogram χ² (HSV, 3 channels, 64 bins each) ──────
            hsv_c = cv2.cvtColor(small,      cv2.COLOR_BGR2HSV)
            hsv_p = cv2.cvtColor(prev_small, cv2.COLOR_BGR2HSV)
            h_score = 0.0
            for ch in range(3):
                hc = cv2.calcHist([hsv_c], [ch], None, [64], [0, 256])
                hp = cv2.calcHist([hsv_p], [ch], None, [64], [0, 256])
                cv2.normalize(hc, hc)
                cv2.normalize(hp, hp)
                h_score += cv2.compareHist(hp, hc, cv2.HISTCMP_CHISQR)
            hist_diffs.append(h_score)

            # ── 2. Edge Change Ratio ─────────────────────────────────
            entering = np.count_nonzero(edges & ~prev_edges)
            exiting  = np.count_nonzero(~edges & prev_edges)
            total_e  = max(1, np.count_nonzero(edges) + np.count_nonzero(prev_edges))
            ecr_scores.append(max(entering, exiting) / total_e)

            # ── 3. Temporal pixel difference ─────────────────────────
            td_scores.append(float(np.mean(np.abs(
                gray.astype(np.float32) - prev_gray.astype(np.float32)
            ))))

            timestamps.append(ts)

        prev_small = small.copy()
        prev_gray  = gray.copy()
        prev_edges = edges.copy()
        frame_idx += 1

    cap.release()

    if not timestamps:
        return [{"start_sec": 0.0, "end_sec": round(dur, 3)}], []

    # ── Normalise each signal to [0, 1] ──────────────────────────────────
    def _norm(a):
        a = np.asarray(a, dtype=np.float64)
        mx = a.max()
        return a / mx if mx > 1e-8 else np.zeros_like(a)

    h_n = _norm(hist_diffs)
    e_n = _norm(ecr_scores)
    t_n = _norm(td_scores)

    # ── Fused signal with tuned weights ──────────────────────────────────
    fused = 0.45 * h_n + 0.30 * e_n + 0.25 * t_n

    # ── Adaptive dual-threshold ──────────────────────────────────────────
    mu    = float(np.mean(fused))
    sigma = float(np.std(fused))

    hard_thresh    = max(mu + 2.5 * sigma, 0.35)
    gradual_thresh = max(mu + 1.5 * sigma, 0.20)

    # ── Walk the fused signal, enforce minimum gap between detections ────
    min_gap_sec    = 0.3          # ignore detections closer than 300 ms
    grad_window    = max(3, int(0.5 * (fps / max(step, 1))))  # ~0.5 s
    cut_timeline   = []
    last_cut_ts    = -min_gap_sec

    for i, score in enumerate(fused):
        ts = timestamps[i]
        if ts - last_cut_ts < min_gap_sec:
            continue

        hs = float(h_n[i])
        es = float(e_n[i])
        ts_val = float(t_n[i])

        if score >= hard_thresh:
            cut_timeline.append({
                "timestamp_sec": round(ts, 3),
                "type":          "hard_cut",
                "confidence":    round(min(1.0, float(score / hard_thresh)), 3),
                "hist_score":    round(hs, 4),
                "ecr_score":     round(es, 4),
                "td_score":      round(ts_val, 4),
            })
            last_cut_ts = ts

        elif score >= gradual_thresh:
            # Require sustained elevation over a local window to avoid
            # false positives from brief camera shakes.
            lo = max(0, i - grad_window // 2)
            hi = min(len(fused), i + grad_window // 2 + 1)
            if float(np.mean(fused[lo:hi])) >= gradual_thresh * 0.7:
                cut_timeline.append({
                    "timestamp_sec": round(ts, 3),
                    "type":          "gradual_transition",
                    "confidence":    round(min(1.0, float(score / gradual_thresh)), 3),
                    "hist_score":    round(hs, 4),
                    "ecr_score":     round(es, 4),
                    "td_score":      round(ts_val, 4),
                })
                last_cut_ts = ts

    # ── Build legacy `scenes` list from cut points ───────────────────────
    cut_times = [0.0] + [c["timestamp_sec"] for c in cut_timeline] + [round(dur, 3)]
    scenes = []
    for i in range(len(cut_times) - 1):
        if cut_times[i + 1] > cut_times[i]:
            scenes.append({"start_sec": round(cut_times[i], 3),
                           "end_sec":   round(cut_times[i + 1], 3)})
    if not scenes:
        scenes = [{"start_sec": 0.0, "end_sec": round(dur, 3)}]

    return scenes, cut_timeline


# ═══════════════════════════════════════════════════════════════════════════
# 3. Color DNA  (palette + shadow / midtone / highlight RGB splits)
# ═══════════════════════════════════════════════════════════════════════════
def extract_color_dna(frames, k=6):
    if not frames:
        return _default_color_dna()

    pixels = np.vstack([f.reshape(-1, 3) for f in frames]).astype(float)  # BGR

    # ── KMeans palette ─────────────────────────────────────────────────
    n_c = min(k, len(pixels))
    km = KMeans(n_clusters=n_c, random_state=0, n_init=10).fit(pixels)
    centers = km.cluster_centers_.astype(int)
    palette = ["#%02x%02x%02x" % (c[2], c[1], c[0]) for c in centers]

    # ── Global channel offsets for colorchannelmixer ───────────────────
    gm = pixels.mean(axis=0)  # BGR
    ch_off = {
        "r": round(_clamp((gm[2] - 128) / 128, -1, 1), 4),
        "g": round(_clamp((gm[1] - 128) / 128, -1, 1), 4),
        "b": round(_clamp((gm[0] - 128) / 128, -1, 1), 4),
    }

    # ── Shadow / Midtone / Highlight split (by V channel) ─────────────
    hsv_all = np.vstack([cv2.cvtColor(f, cv2.COLOR_BGR2HSV).reshape(-1, 3)
                         for f in frames]).astype(float)
    bgr_all = pixels
    v = hsv_all[:, 2]

    shadow_mask = v < 85
    mid_mask = (v >= 85) & (v < 170)
    hi_mask = v >= 170

    def _rgb_mean(mask):
        sel = bgr_all[mask]
        if len(sel) == 0:
            return {"r": 128, "g": 128, "b": 128}
        m = sel.mean(axis=0)
        return {"r": round(float(m[2])), "g": round(float(m[1])), "b": round(float(m[0]))}

    shadows = _rgb_mean(shadow_mask)
    midtones = _rgb_mean(mid_mask)
    highlights = _rgb_mean(hi_mask)

    # ── Color mood ─────────────────────────────────────────────────────
    warmth = ch_off["r"] - ch_off["b"]
    if warmth > 0.15:
        mood = "warm"
    elif warmth < -0.15:
        mood = "cool"
    elif abs(ch_off["r"]) < 0.05 and abs(ch_off["g"]) < 0.05 and abs(ch_off["b"]) < 0.05:
        mood = "neutral"
    else:
        mood = "cinematic"

    return {
        "palette": palette,
        "channel_offsets": ch_off,
        "shadows_rgb": shadows,
        "midtones_rgb": midtones,
        "highlights_rgb": highlights,
        "color_mood": mood,
    }

def _default_color_dna():
    return {
        "palette": [],
        "channel_offsets": {"r": 0, "g": 0, "b": 0},
        "shadows_rgb": {"r": 40, "g": 40, "b": 50},
        "midtones_rgb": {"r": 128, "g": 128, "b": 128},
        "highlights_rgb": {"r": 220, "g": 220, "b": 210},
        "color_mood": "neutral",
    }


# ═══════════════════════════════════════════════════════════════════════════
# 4. Grain & Texture Density
# ═══════════════════════════════════════════════════════════════════════════
def analyze_grain(frames):
    """Estimate film-grain / noise level.
    Approach: Gaussian-blur each frame, then measure the variance of the
    difference (original − blurred).  Higher variance = more grain/noise.
    Returns grain_density in [0, 1] and a label."""
    if not frames:
        return 0.0, "none"

    diffs = []
    for f in frames:
        gray = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY).astype(float)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        noise = gray - blurred
        diffs.append(float(np.std(noise)))

    avg_noise = _avg(diffs)
    # Typical range 0-15; normalise to 0-1
    density = round(_clamp(avg_noise / 15.0, 0, 1), 4)

    if density < 0.15:
        label = "clean"
    elif density < 0.35:
        label = "light-grain"
    elif density < 0.6:
        label = "medium-grain"
    else:
        label = "heavy-grain"

    return density, label


# ═══════════════════════════════════════════════════════════════════════════
# 5. Vignette & Lens-Blur Detection
# ═══════════════════════════════════════════════════════════════════════════
def analyze_vignette_blur(frames):
    """Return vignette_strength [0,1], lens_blur_strength [0,1], labels."""
    if not frames:
        return 0.0, "none", 0.0, "none"

    vignette_vals, blur_vals = [], []
    for f in frames:
        gray = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY).astype(float)
        h, w = gray.shape

        # ── Vignette: centre vs corners brightness ────────────────────
        cx1, cy1 = int(w * 0.35), int(h * 0.35)
        cx2, cy2 = int(w * 0.65), int(h * 0.65)
        center = gray[cy1:cy2, cx1:cx2]
        csz_x, csz_y = max(1, int(w * 0.15)), max(1, int(h * 0.15))
        corners = [gray[:csz_y, :csz_x], gray[:csz_y, w - csz_x:],
                   gray[h - csz_y:, :csz_x], gray[h - csz_y:, w - csz_x:]]
        corner_mean = _avg([float(c.mean()) for c in corners if c.size])
        center_mean = float(center.mean()) if center.size else corner_mean
        v = _clamp((center_mean - corner_mean) / max(1e-6, center_mean), 0, 1)
        vignette_vals.append(v)

        # ── Lens blur: compare edge sharpness of centre vs border ─────
        lap_center = cv2.Laplacian(center.astype(np.uint8), cv2.CV_64F)
        border_top = gray[:csz_y, :]
        border_bot = gray[h - csz_y:, :]
        border = np.vstack([border_top, border_bot])
        lap_border = cv2.Laplacian(border.astype(np.uint8), cv2.CV_64F)
        lc = float(lap_center.var()) + 1e-6
        lb = float(lap_border.var()) + 1e-6
        # If border is much blurrier than centre → lens blur / tilt-shift
        blur_ratio = _clamp(1.0 - lb / lc, 0, 1)
        blur_vals.append(blur_ratio)

    vignette_strength = round(_avg(vignette_vals), 4)
    blur_strength = round(_avg(blur_vals), 4)

    vign_label = ("none" if vignette_strength < 0.05 else
                  "light" if vignette_strength < 0.15 else
                  "medium" if vignette_strength < 0.30 else "heavy")

    blur_label = ("none" if blur_strength < 0.10 else
                  "subtle" if blur_strength < 0.30 else
                  "medium" if blur_strength < 0.55 else "strong")

    return vignette_strength, vign_label, blur_strength, blur_label


# ═══════════════════════════════════════════════════════════════════════════
# 6. Velocity Map / Speed-Ramp Detection
# ═══════════════════════════════════════════════════════════════════════════
def detect_velocity_map(frames, timestamps):
    """Detect speed-ramping by comparing per-segment optical-flow deltas.
    Returns a list of velocity segments and global speed-ramp flag.

    ★ STRICT RULE: 'Jhatkay' (velocity ramping & hard cuts) are the SOUL
    of this project.  We analyse EVERY consecutive frame pair to capture
    even the subtlest speed change.  Nothing is averaged or thrown away."""
    if len(frames) < 3 or len(timestamps) < 3:
        return [], False, 1.0

    magnitudes = []
    prev_gray = cv2.cvtColor(frames[0], cv2.COLOR_BGR2GRAY)
    for f in frames[1:]:
        curr = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY)
        flow = cv2.calcOpticalFlowFarneback(
            prev_gray, curr, None, 0.5, 3, 15, 3, 5, 1.2, 0)
        mag, _ = cv2.cartToPolar(flow[..., 0], flow[..., 1])
        magnitudes.append(float(mag.mean()))
        prev_gray = curr

    if not magnitudes:
        return [], False, 1.0

    # Normalise magnitudes to [0-1]
    mag_arr = np.array(magnitudes)
    mx = mag_arr.max() or 1.0
    normed = mag_arr / mx

    # Build segments — one per consecutive-frame pair (NEVER averaged)
    segments = []
    for i in range(len(normed)):
        t_start = timestamps[i] if i < len(timestamps) else 0.0
        t_end = timestamps[i + 1] if i + 1 < len(timestamps) else timestamps[-1]
        speed = float(normed[i])
        label = ("slow-mo" if speed < 0.25 else
                 "normal" if speed < 0.65 else "speed-up")
        segments.append({
            "start_sec": round(t_start, 3),
            "end_sec": round(t_end, 3),
            "relative_speed": round(speed, 3),
            "label": label,
        })

    # Has speed ramp? Check if variance of speeds is significant
    has_ramp = bool(float(np.std(normed)) > 0.12)
    avg_speed = round(float(np.mean(normed)), 4)

    return segments, has_ramp, avg_speed


# ═══════════════════════════════════════════════════════════════════════════
# 7. Motion Analysis (Optical Flow — aggregate)
# ═══════════════════════════════════════════════════════════════════════════
def analyze_motion(frames):
    if len(frames) < 2:
        return 0.0, "static"
    magnitudes = []
    prev = cv2.cvtColor(frames[0], cv2.COLOR_BGR2GRAY)
    for f in frames[1:]:
        cur = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY)
        flow = cv2.calcOpticalFlowFarneback(prev, cur, None, 0.5, 3, 15, 3, 5, 1.2, 0)
        mag, _ = cv2.cartToPolar(flow[..., 0], flow[..., 1])
        magnitudes.append(float(mag.mean()))
        prev = cur
    avg = _avg(magnitudes)
    intensity = round(_clamp(avg / 10.0, 0, 1), 4)
    style = ("static" if intensity < 0.15 else
             "smooth" if intensity < 0.35 else
             "dynamic" if intensity < 0.6 else "fast-action")
    return intensity, style


# ═══════════════════════════════════════════════════════════════════════════
# 8. Classic Visual Metrics
# ═══════════════════════════════════════════════════════════════════════════
def compute_visual_metrics(frames):
    br, co, sa, sh = [], [], [], []
    for f in frames:
        try:
            hsv = cv2.cvtColor(f, cv2.COLOR_BGR2HSV)
            gray = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY)
            br.append((float(hsv[:, :, 2].astype(float).mean()) / 255.0) * 2.0 - 1.0)
            co.append(_clamp(1.0 + (float(gray.std()) - 64.0) / 128.0, 0.2, 3.0))
            sa.append(float(hsv[:, :, 1].astype(float).mean()) / 255.0)
            sh.append(float(cv2.Laplacian(gray, cv2.CV_64F).var()))
        except Exception:
            continue
    s_avg = _avg(sh, 0.0)
    return {
        "brightness": round(_avg(br, 0.0), 4),
        "contrast":   round(_avg(co, 1.0), 4),
        "saturation": round(_avg(sa, 0.5), 4),
        "sharpness":  round(_clamp(s_avg / 100.0, 0, 3), 4),
    }


# ═══════════════════════════════════════════════════════════════════════════
# 9. Audio Beat / Peak Detection
# ═══════════════════════════════════════════════════════════════════════════
def detect_audio_beats(video_path, ffprobe_exe="ffprobe"):
    beats, first_beat, peak_db, has_audio = [], 0.0, -60.0, False
    try:
        r = subprocess.run(
            [ffprobe_exe, "-v", "quiet", "-select_streams", "a",
             "-show_entries", "stream=codec_type", "-of", "json", str(video_path)],
            capture_output=True, text=True, timeout=15)
        p = json.loads(r.stdout or "{}")
        if not p.get("streams"):
            return {"has_audio": False, "beats": [], "first_beat_sec": 0.0, "peak_db": -60.0}
        has_audio = True

        r2 = subprocess.run(
            [ffprobe_exe, "-v", "quiet", "-f", "lavfi",
             "-i", "amovie=" + str(video_path).replace("\\", "/") + ",astats=metadata=1:reset=1",
             "-show_entries", "frame_tags=lavfi.astats.Overall.RMS_level",
             "-show_entries", "frame=pts_time", "-of", "json"],
            capture_output=True, text=True, timeout=30)
        data = json.loads(r2.stdout or "{}")

        rms = []
        for fr in data.get("frames", []):
            pts = float(fr.get("pts_time", 0))
            lv = fr.get("tags", {}).get("lavfi.astats.Overall.RMS_level", "-inf")
            try:
                rms.append((pts, float(lv)))
            except (ValueError, TypeError):
                rms.append((pts, -100.0))

        if rms:
            peak_db = max(r for _, r in rms)
            threshold = peak_db - 6.0
            beats = [round(t, 3) for t, r in rms if r >= threshold]
            if beats:
                first_beat = beats[0]
    except Exception:
        pass
    return {
        "has_audio": has_audio,
        "beats": beats[:80],
        "first_beat_sec": round(first_beat, 3),
        "peak_db": round(peak_db, 2),
    }


# ═══════════════════════════════════════════════════════════════════════════
# 10. Orientation
# ═══════════════════════════════════════════════════════════════════════════
def detect_orientation(w, h):
    if w <= 0 or h <= 0:
        return "16:9", "horizontal"
    g = gcd(w, h)
    ar = f"{w // g}:{h // g}"
    ratio = w / h
    orient = "horizontal" if ratio > 1.2 else ("vertical" if ratio < 0.8 else "square")
    return ar, orient


# ═══════════════════════════════════════════════════════════════════════════
# ★  MAIN ANALYSIS  ★
# ═══════════════════════════════════════════════════════════════════════════
def analyze(video_path, ffprobe_exe="ffprobe"):
    p = Path(video_path)
    if not p.exists():
        return {"error": "file_not_found"}

    frames, timestamps, fc, dur, fps, w, h = sample_frames(p, max_samples=40)

    # High-res velocity sampling — 120 frames for fine-grained jhatkay detection.
    # Visual analyses (color, grain, vignette) only need ~40 frames,
    # but velocity/hard-cuts need much higher temporal resolution.
    vel_frames, vel_timestamps, _, _, _, _, _ = sample_frames(p, max_samples=120)

    # 1. Color DNA (palette, shadows, midtones, highlights, channel offsets)
    color_dna = extract_color_dna(frames, k=6)

    # 2. Grain & Texture
    grain_density, grain_label = analyze_grain(frames)

    # 3. Vignette & Lens Blur
    vign_str, vign_label, blur_str, blur_label = analyze_vignette_blur(frames)

    # 4. Velocity Map / Speed Ramping (uses HIGH-RES frames)
    velocity_segments, has_speed_ramp, avg_speed = detect_velocity_map(vel_frames, vel_timestamps)

    # 5. Motion Analysis
    motion_intensity, motion_style = analyze_motion(frames)

    # 6. Classic Visual Metrics
    metrics = compute_visual_metrics(frames)

    # 7. Audio Beats
    audio = detect_audio_beats(video_path, ffprobe_exe)

    # 8. Shot Boundary Detection (histogram + ECR + temporal-diff fusion)
    try:
        scenes, cut_timeline = detect_shot_boundaries(p)
    except Exception:
        scenes, cut_timeline = [{"start_sec": 0.0, "end_sec": round(dur, 3)}], []
    if not scenes:
        scenes = [{"start_sec": 0.0, "end_sec": round(dur, 3)}]

    # 9. Orientation
    aspect_ratio, orientation = detect_orientation(w, h)

    is_cinematic = 23 <= fps <= 25

    return {
        # ── Basics ────────────────────────────────────────────────────
        "frame_count": fc,
        "duration": round(dur, 4),
        "fps": round(fps, 2),
        "width": w,
        "height": h,
        "aspect_ratio": aspect_ratio,
        "orientation": orientation,
        "is_cinematic": is_cinematic,
        "scenes": scenes,
        "cut_timeline": cut_timeline,

        # ── Classic visual metrics ────────────────────────────────────
        **metrics,

        # ── Color DNA (deep) ──────────────────────────────────────────
        "dominant_colors": color_dna["palette"],
        "channel_offsets": color_dna["channel_offsets"],
        "color_mood": color_dna["color_mood"],
        "shadows_rgb": color_dna["shadows_rgb"],
        "midtones_rgb": color_dna["midtones_rgb"],
        "highlights_rgb": color_dna["highlights_rgb"],

        # ── Grain & Texture ───────────────────────────────────────────
        "grain_density": grain_density,
        "grain_label": grain_label,

        # ── Vignette & Lens Blur ──────────────────────────────────────
        "vignette": vign_str,
        "vignette_label": vign_label,
        "lens_blur": blur_str,
        "lens_blur_label": blur_label,

        # ── Velocity / Speed Ramping ──────────────────────────────────
        "velocity_segments": velocity_segments[:500],
        "has_speed_ramp": has_speed_ramp,
        "avg_relative_speed": avg_speed,

        # ── Motion ────────────────────────────────────────────────────
        "motion_intensity": motion_intensity,
        "motion_style": motion_style,

        # ── Audio ─────────────────────────────────────────────────────
        "audio": audio,
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "missing_path"}))
        sys.exit(1)
    out = analyze(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "ffprobe")
    print(json.dumps(out))
 