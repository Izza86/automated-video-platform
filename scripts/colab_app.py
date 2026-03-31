#!/usr/bin/env python3
# pyright: reportMissingImports=false, reportMissingModuleSource=false
"""
Colab GPU Server — FastAPI + Ngrok Tunnel
==========================================
A single-file FastAPI server designed to run inside a Google Colab
notebook with a free T4 GPU. Wraps all five ML analysis scripts and
exposes them via HTTP endpoints.

Models executed on GPU:
  • TransNetV2             — 3D DDCNN shot boundary detection
  • RAFT-Large             — Dense optical flow (torchvision)
  • Depth-Anything V2 Base — Monocular depth estimation (HuggingFace)
  • Reinhard LAB           — Lightweight colour transfer (OpenCV, no weights)
  • madmom RNN+DBN         — High-accuracy beat tracking (primary)
  • librosa                     — Beat / onset detection (fallback)

Endpoints:
  POST /process-video          — Full pipeline (all 5 modules)
  POST /analyze/shots          — Shot detection only
  POST /analyze/motion         — Motion / optical flow only
  POST /analyze/depth          — Depth estimation only
  POST /analyze/color          — Color grading / Reinhard LAB
  POST /analyze/beats          — Audio beat detection only
  GET  /health                 — Health check + GPU info

Usage (inside Colab cell):
  !python colab_app.py

The server starts on port 8000 and creates an ngrok tunnel.
Your Next.js backend connects to the ngrok URL.
"""

import os
import sys
import json
import time
import shutil
import tempfile
import traceback
import subprocess
from pathlib import Path

import numpy as np
import torch
import cv2

# ─────────────────────────────────────────────────────────────────────────────
# GPU Setup
# ─────────────────────────────────────────────────────────────────────────────

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"[colab-gpu] Using device: {DEVICE}")
if DEVICE.type == "cuda":
    print(f"[colab-gpu] GPU: {torch.cuda.get_device_name(0)}")
    print(f"[colab-gpu] VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")


class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (np.integer,)):
            return int(obj)
        if isinstance(obj, (np.floating,)):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super().default(obj)


# ═════════════════════════════════════════════════════════════════════════════
#  MODEL LOADERS — Cached on first call, pinned to GPU
# ═════════════════════════════════════════════════════════════════════════════

_models = {}


def get_transnetv2():
    if "transnetv2" not in _models:
        try:
            from transnetv2 import TransNetV2
            _models["transnetv2"] = TransNetV2()
            print("[colab-gpu] TransNetV2 loaded", flush=True)
        except ImportError:
            print("[colab-gpu] TransNetV2 not installed, will use PySceneDetect", flush=True)
            _models["transnetv2"] = None
    return _models["transnetv2"]


def get_raft():
    if "raft" not in _models:
        from torchvision.models.optical_flow import raft_large, Raft_Large_Weights
        weights = Raft_Large_Weights.DEFAULT
        model = raft_large(weights=weights).to(DEVICE).eval()
        for p in model.parameters():
            p.requires_grad = False
        _models["raft"] = model
        print("[colab-gpu] RAFT-Large loaded on GPU", flush=True)
    return _models["raft"]


def get_depth_model():
    if "depth" not in _models:
        # Try Depth-Anything V2 first, then MiDaS
        try:
            from transformers import AutoImageProcessor, AutoModelForDepthEstimation
            proc = AutoImageProcessor.from_pretrained(
                "depth-anything/Depth-Anything-V2-Base-hf"
            )
            model = AutoModelForDepthEstimation.from_pretrained(
                "depth-anything/Depth-Anything-V2-Base-hf"
            ).to(DEVICE).eval()
            _models["depth"] = ("depth-anything-v2", model, proc)
            print("[colab-gpu] Depth-Anything V2 loaded on GPU", flush=True)
        except Exception as e:
            print(f"[colab-gpu] Depth-Anything V2 failed: {e}, trying MiDaS", flush=True)
            try:
                model = torch.hub.load("intel-isl/MiDaS", "DPT_Large")
                model.to(DEVICE).eval()
                midas_transforms = torch.hub.load("intel-isl/MiDaS", "transforms")
                transform = midas_transforms.dpt_transform
                _models["depth"] = ("midas-dpt-large", model, transform)
                print("[colab-gpu] MiDaS DPT-Large loaded on GPU", flush=True)
            except Exception as e2:
                print(f"[colab-gpu] MiDaS also failed: {e2}", flush=True)
                _models["depth"] = None
    return _models["depth"]


# ═════════════════════════════════════════════════════════════════════════════
#  FRAME EXTRACTION
# ═════════════════════════════════════════════════════════════════════════════

def get_video_info(video_path):
    cmd = [
        "ffprobe", "-v", "quiet", "-show_entries",
        "format=duration:stream=r_frame_rate,width,height",
        "-select_streams", "v:0", "-of", "json", video_path,
    ]
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        d = json.loads(r.stdout)
        dur = float(d.get("format", {}).get("duration", 10))
        s = d.get("streams", [{}])[0]
        fps_s = s.get("r_frame_rate", "30/1")
        n, dn = fps_s.split("/")
        return dur, float(n) / float(dn), int(s.get("width", 1920)), int(s.get("height", 1080))
    except Exception:
        return 10, 30, 1920, 1080


def extract_frames(video_path, fps=2, max_frames=300, scale="320:-2"):
    tmpdir = tempfile.mkdtemp(prefix="colab_frames_")
    cmd = [
        "ffmpeg", "-y", "-i", video_path,
        "-vf", f"fps={fps},scale={scale}",
        "-frames:v", str(max_frames), "-q:v", "4",
        os.path.join(tmpdir, "frame_%06d.jpg"),
    ]
    subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    frames = []
    dt = 1.0 / fps
    for i, fname in enumerate(sorted(f for f in os.listdir(tmpdir) if f.endswith(".jpg"))):
        fpath = os.path.join(tmpdir, fname)
        frame = cv2.imread(fpath)
        if frame is not None:
            frames.append((i * dt, frame))
        try:
            os.unlink(fpath)
        except OSError:
            pass
    try:
        os.rmdir(tmpdir)
    except OSError:
        pass
    return frames


def extract_audio_wav(video_path, sr=22050):
    wav_path = tempfile.mktemp(suffix=".wav")
    cmd = [
        "ffmpeg", "-y", "-i", video_path, "-vn",
        "-acodec", "pcm_s16le", "-ar", str(sr), "-ac", "1", wav_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    if result.returncode != 0 or not os.path.exists(wav_path) or os.path.getsize(wav_path) < 1000:
        return None
    return wav_path


# ═════════════════════════════════════════════════════════════════════════════
#  ANALYSIS MODULE 1: Shot Detection (TransNetV2 → PySceneDetect → Classical)
# ═════════════════════════════════════════════════════════════════════════════

def analyze_shots(video_path, fps=5):
    t0 = time.time()
    duration, vfps, w, h = get_video_info(video_path)

    # Tier 1: TransNetV2
    transnet = get_transnetv2()
    if transnet is not None:
        try:
            frms = extract_frames(video_path, fps=fps, max_frames=500, scale="48:27")
            if len(frms) >= 3:
                frames_np = np.array(
                    [cv2.cvtColor(f, cv2.COLOR_BGR2RGB) for _, f in frms], dtype=np.uint8
                )
                single_preds, _ = transnet.predict_frames(frames_np)
                scenes = transnet.predictions_to_scenes(single_preds)

                boundaries = []
                for i in range(len(scenes) - 1):
                    end_frame = scenes[i][1]
                    t = end_frame / fps
                    conf = float(single_preds[end_frame]) if end_frame < len(single_preds) else 0.8
                    boundaries.append({
                        "time_sec": round(t, 4),
                        "type": "cut" if conf > 0.7 else "gradual",
                        "confidence": round(min(1.0, conf), 4),
                        "score": round(conf, 4),
                    })
                return _build_shot_result(boundaries, duration, "transnetv2-gpu",
                                          round(time.time() - t0, 3))
        except Exception as e:
            print(f"[shots] TransNetV2 failed: {e}", flush=True)

    # Tier 2: PySceneDetect
    try:
        from scenedetect import open_video, SceneManager
        from scenedetect.detectors import ContentDetector, AdaptiveDetector
        video = open_video(video_path)
        sm = SceneManager()
        sm.add_detector(ContentDetector(threshold=27.0, min_scene_len=8))
        sm.add_detector(AdaptiveDetector(adaptive_threshold=3.0, min_scene_len=10))
        sm.detect_scenes(video)
        scene_list = sm.get_scene_list()
        boundaries = []
        for i, (start, end) in enumerate(scene_list):
            if i > 0:
                boundaries.append({
                    "time_sec": round(start.get_seconds(), 4),
                    "type": "cut", "confidence": 0.85, "score": 0.85,
                })
        return _build_shot_result(boundaries, duration, "pyscenedetect-gpu",
                                  round(time.time() - t0, 3))
    except Exception as e:
        print(f"[shots] PySceneDetect failed: {e}", flush=True)

    # Tier 3: Classical fallback
    frms = extract_frames(video_path, fps=2, max_frames=200, scale="240:-2")
    boundaries = _classical_shot_detect(frms, fps=2)
    return _build_shot_result(boundaries, duration, "classical-gpu-fallback",
                              round(time.time() - t0, 3))


def _build_shot_result(boundaries, duration, model_name, proc_sec=0):
    shots = []
    prev = 0.0
    for b in boundaries:
        if b["time_sec"] > prev + 0.2:
            shots.append({
                "start_sec": round(prev, 4), "end_sec": round(b["time_sec"], 4),
                "confidence": b["confidence"], "type": b["type"],
            })
            prev = b["time_sec"]
    if prev < duration - 0.1:
        shots.append({"start_sec": round(prev, 4), "end_sec": round(duration, 4),
                       "confidence": 1.0, "type": "end"})
    if not shots:
        shots = [{"start_sec": 0, "end_sec": round(duration, 4), "confidence": 1.0, "type": "cut"}]
    durs = [s["end_sec"] - s["start_sec"] for s in shots]
    return {
        "shots": shots, "boundaries": boundaries,
        "shotCount": len(shots),
        "cutCount": sum(1 for b in boundaries if b["type"] == "cut"),
        "gradualCount": sum(1 for b in boundaries if b["type"] == "gradual"),
        "avgShotDuration": round(float(np.mean(durs)) if durs else duration, 3),
        "minShotDuration": round(float(min(durs)) if durs else 0, 3),
        "maxShotDuration": round(float(max(durs)) if durs else duration, 3),
        "mlModel": model_name,
        "processingMs": round(proc_sec * 1000),
    }


def _classical_shot_detect(frames, fps=2):
    if len(frames) < 3:
        return []
    features = []
    for _, frame in frames:
        resized = cv2.resize(frame, (240, 180))
        hsv = cv2.cvtColor(resized, cv2.COLOR_BGR2HSV)
        gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
        h_hist = cv2.calcHist([hsv], [0, 1], None, [16, 16], [0, 180, 0, 256])
        cv2.normalize(h_hist, h_hist)
        features.append({"hist": h_hist.flatten(), "gray": gray})
    boundaries = []
    dists = []
    for i in range(1, len(features)):
        d = cv2.compareHist(
            features[i - 1]["hist"].astype(np.float32),
            features[i]["hist"].astype(np.float32),
            cv2.HISTCMP_CHISQR,
        )
        dists.append(d)
    if not dists:
        return []
    arr = np.array(dists)
    med = float(np.median(arr))
    mad = float(np.median(np.abs(arr - med)))
    th = max(0.15, med + 2.5 * mad)
    for i, d in enumerate(dists):
        if d >= th:
            boundaries.append({
                "time_sec": round(frames[i + 1][0], 4), "type": "cut",
                "confidence": round(min(1.0, d / (th + 0.01)), 4),
                "score": round(d, 4),
            })
    return boundaries


# ═════════════════════════════════════════════════════════════════════════════
#  ANALYSIS MODULE 2: Motion / Optical Flow (RAFT-Large GPU)
# ═════════════════════════════════════════════════════════════════════════════

def analyze_motion(video_path, fps=10):
    import gc
    t0 = time.time()
    duration, vfps, ow, oh = get_video_info(video_path)
    # RAFT-Large uses ~2x VRAM vs Small — cap resolution & frame count
    frms = extract_frames(video_path, fps=fps, max_frames=200, scale="384:-2")
    if len(frms) < 3:
        return _empty_motion(duration)

    raft_model = get_raft()
    total = len(frms)
    dt = 1.0 / fps
    data = []
    step = max(2, 3 if duration > 20 else 2)

    for i in range(step, total, step):
        pi = max(0, i - step)
        t_sec = i * dt

        # RAFT GPU flow
        flow = _raft_flow_gpu(raft_model, frms[pi][1], frms[i][1])
        if flow is None:
            # Farneback fallback
            g1 = cv2.cvtColor(frms[pi][1], cv2.COLOR_BGR2GRAY)
            g2 = cv2.cvtColor(frms[i][1], cv2.COLOR_BGR2GRAY)
            flow = cv2.calcOpticalFlowFarneback(
                g1, g2, None, 0.5, 5, 15, 5, 7, 1.5, cv2.OPTFLOW_FARNEBACK_GAUSSIAN
            )

        mag = np.sqrt(flow[..., 0] ** 2 + flow[..., 1] ** 2)
        ang = np.arctan2(flow[..., 1], flow[..., 0])
        mm = float(np.mean(mag))
        xm = float(np.max(mag))
        ma = float(np.mean(mag > 2.0))

        # Zoom from radial flow divergence
        h, w = flow.shape[:2]
        cy, cx = h / 2.0, w / 2.0
        ys = np.arange(0, h, max(1, h // 32))
        xs = np.arange(0, w, max(1, w // 32))
        yy, xx = np.meshgrid(ys, xs, indexing="ij")
        dx, dy = xx.astype(np.float32) - cx, yy.astype(np.float32) - cy
        r = np.sqrt(dx**2 + dy**2) + 1e-6
        rad = flow[yy, xx, 0] * (dx / r) + flow[yy, xx, 1] * (dy / r)
        zs = float(np.mean(rad))

        # Camera motion from median displacement
        mdx = float(np.median(flow[..., 0]))
        mdy = float(np.median(flow[..., 1]))
        cam_mag = float(np.sqrt((mdx / w) ** 2 + (mdy / h) ** 2))
        if cam_mag < 0.002:
            cam_type = "static"
        elif abs(mdx / w) > abs(mdy / h) * 2:
            cam_type = "pan-horizontal"
        elif abs(mdy / h) > abs(mdx / w) * 2:
            cam_type = "tilt-vertical"
        else:
            cam_type = "drift"

        data.append({
            "time_sec": round(t_sec, 4),
            "meanMagnitude": round(mm, 4),
            "maxMagnitude": round(xm, 4),
            "motionArea": round(ma, 4),
            "frameDiff": round(float(np.mean(cv2.absdiff(
                cv2.cvtColor(frms[pi][1], cv2.COLOR_BGR2GRAY),
                cv2.cvtColor(frms[i][1], cv2.COLOR_BGR2GRAY),
            ))) / 255.0, 4),
            "zoomSpeed": round(zs, 6),
            "camera": {
                "panX": round(mdx / w, 6), "panY": round(mdy / h, 6),
                "type": cam_type, "magnitude": round(cam_mag, 6),
            },
        })

        del flow, mag, ang
        if i % 10 == 0:
            gc.collect()
            torch.cuda.empty_cache()

    del frms
    gc.collect()
    torch.cuda.empty_cache()

    if not data:
        return _empty_motion(duration)

    mags = [m["meanMagnitude"] for m in data]
    avg_mag = float(np.mean(mags))
    mx = max(max(mags), 1)
    oi = round(float(np.mean(mags)) / mx, 4)
    style = ("static" if oi < 0.1 else "slow" if oi < 0.25
             else "moderate" if oi < 0.5 else "dynamic" if oi < 0.75 else "intense")

    # Build velocity segments
    vel_segs = _build_velocity_segments(data, duration, dt * step, avg_mag)
    azs = [m.get("zoomSpeed", 0) for m in data]
    zl = [{"time_sec": m["time_sec"], "zoomSpeed": m.get("zoomSpeed", 0)} for m in data]

    from collections import Counter
    ct = Counter(m["camera"]["type"] for m in data)
    dc = ct.most_common(1)[0][0] if ct else "static"

    s = max(1, len(data) // 300)

    return {
        "velocitySegments": vel_segs,
        "motionTimeline": data[::s][:300],
        "overallIntensity": oi,
        "complexity": round(float(np.std(mags)) / (mx + 0.01), 4),
        "style": style,
        "dominantCameraMotion": dc,
        "avgMagnitude": round(avg_mag, 4),
        "maxMagnitude": round(float(max(mags)), 4),
        "avgMotionArea": round(float(np.mean([m["motionArea"] for m in data])), 4),
        "avgFrameDiff": round(float(np.mean([m["frameDiff"] for m in data])), 4),
        "segmentCount": len(vel_segs),
        "frameCount": len(data),
        "analysisFps": fps,
        "duration": round(duration, 3),
        "resolution": {"width": ow, "height": oh},
        "zoomTimeline": zl[::max(1, len(zl) // 300)][:300],
        "avgZoomSpeed": round(float(np.mean(azs)), 6) if azs else 0,
        "maxZoomSpeed": round(float(max(azs, key=abs)), 6) if azs else 0,
        "dominantZoom": (
            "zoom-in" if np.mean(azs) > 0.3
            else ("zoom-out" if np.mean(azs) < -0.3 else "none")
        ),
        "mlModel": "raft-large-gpu",
        "processingMs": round((time.time() - t0) * 1000),
    }


def _raft_flow_gpu(model, frame1_bgr, frame2_bgr):
    try:
        r1 = cv2.cvtColor(frame1_bgr, cv2.COLOR_BGR2RGB)
        r2 = cv2.cvtColor(frame2_bgr, cv2.COLOR_BGR2RGB)
        h, w = r1.shape[:2]
        # Cap at 384px wide for RAFT-Large VRAM safety on T4
        if w > 384:
            scale = 384.0 / w
            nw, nh = 384, int(h * scale)
        else:
            nw, nh = w, h
        nw, nh = (nw // 8) * 8, (nh // 8) * 8
        r1, r2 = cv2.resize(r1, (nw, nh)), cv2.resize(r2, (nw, nh))
        t1 = torch.from_numpy(r1).permute(2, 0, 1).float().unsqueeze(0).to(DEVICE)
        t2 = torch.from_numpy(r2).permute(2, 0, 1).float().unsqueeze(0).to(DEVICE)
        with torch.no_grad(), torch.amp.autocast(device_type="cuda"):
            preds = model(t1, t2)
            flow = preds[-1].float()  # back to fp32 for numpy
        result = flow[0].permute(1, 2, 0).cpu().numpy()
        del t1, t2, flow, preds
        return result
    except Exception as e:
        print(f"[motion] RAFT-Large GPU flow failed: {e}", flush=True)
        return None


def _build_velocity_segments(data, dur, dt, avg_mag):
    if not data:
        return [{"start_sec": 0, "end_sec": dur, "level": "static", "avgMagnitude": 0}]
    mags = [m["meanMagnitude"] for m in data]
    p25, p50, p75, p90 = [float(np.percentile(mags, p)) for p in (25, 50, 75, 90)]

    def cl(m):
        if m < max(p25, 0.5):
            return "static"
        if m < max(p50, 2.0):
            return "slow"
        if m < max(p75, 5.0):
            return "moderate"
        if m < max(p90, 10.0):
            return "fast"
        return "intense"

    segs = []
    cur, si, sm = cl(mags[0]), 0, [mags[0]]
    for i in range(1, len(mags)):
        lvl = cl(mags[i])
        if lvl != cur:
            segs.append({
                "start_sec": round(data[si]["time_sec"], 4),
                "end_sec": round(data[i - 1]["time_sec"] + dt, 4),
                "level": cur,
                "avgMagnitude": round(float(np.mean(sm)), 4),
                "maxMagnitude": round(float(max(sm)), 4),
            })
            cur, si, sm = lvl, i, [mags[i]]
        else:
            sm.append(mags[i])
    segs.append({
        "start_sec": round(data[si]["time_sec"], 4),
        "end_sec": round(min(data[-1]["time_sec"] + dt, dur), 4),
        "level": cur,
        "avgMagnitude": round(float(np.mean(sm)), 4),
        "maxMagnitude": round(float(max(sm)), 4),
    })
    return segs


def _empty_motion(dur=0):
    return {
        "velocitySegments": [{"start_sec": 0, "end_sec": dur, "level": "static", "avgMagnitude": 0}],
        "motionTimeline": [], "overallIntensity": 0, "complexity": 0, "style": "static",
        "dominantCameraMotion": "static", "avgMagnitude": 0, "maxMagnitude": 0,
        "avgMotionArea": 0, "avgFrameDiff": 0, "segmentCount": 1, "frameCount": 0,
        "analysisFps": 0, "duration": dur, "resolution": {"width": 0, "height": 0},
        "mlModel": "none", "processingMs": 0,
    }


# ═════════════════════════════════════════════════════════════════════════════
#  ANALYSIS MODULE 3: Depth Estimation (Depth-Anything V2 GPU)
# ═════════════════════════════════════════════════════════════════════════════

def analyze_depth(video_path, fps=2):
    t0 = time.time()
    duration, vfps, ow, oh = get_video_info(video_path)
    depth_info = get_depth_model()
    if depth_info is None:
        return _empty_depth(duration)

    model_name, model, processor = depth_info
    frms = extract_frames(video_path, fps=fps, max_frames=60, scale="384:-2")
    if not frms:
        return _empty_depth(duration)

    timeline = []
    for t_sec, frame in frms:
        depth_map = _run_depth_frame(model_name, model, processor, frame)
        if depth_map is None:
            continue
        mean_d = float(np.mean(depth_map))
        var_d = float(np.var(depth_map))
        # fg/bg separation: difference between top-quartile and bottom-quartile depth
        q25, q75 = float(np.percentile(depth_map, 25)), float(np.percentile(depth_map, 75))
        sep = q75 - q25
        timeline.append({
            "time_sec": round(t_sec, 4),
            "meanDepth": round(mean_d, 4),
            "depthVariance": round(var_d, 6),
            "fgBgSeparation": round(sep, 4),
        })

    if not timeline:
        return _empty_depth(duration)

    avg_sep = float(np.mean([t["fgBgSeparation"] for t in timeline]))
    avg_depth = float(np.mean([t["meanDepth"] for t in timeline]))
    has_parallax = avg_sep > 0.3

    # Classify depth style
    if avg_sep < 0.1:
        depth_style = "flat"
    elif avg_sep < 0.3:
        depth_style = "deep-focus"
    elif avg_sep < 0.5:
        depth_style = "shallow-dof"
    else:
        depth_style = "racking"

    return {
        "depthTimeline": timeline,
        "avgFgBgSeparation": round(avg_sep, 4),
        "avgMeanDepth": round(avg_depth, 4),
        "hasStrongParallax": has_parallax,
        "depthStyle": depth_style,
        "mlModel": model_name + "-gpu",
        "processingMs": round((time.time() - t0) * 1000),
    }


def _run_depth_frame(model_name, model, processor, frame_bgr):
    try:
        rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        if model_name.startswith("depth-anything"):
            from PIL import Image
            pil_img = Image.fromarray(rgb)
            inputs = processor(images=pil_img, return_tensors="pt").to(DEVICE)
            with torch.no_grad():
                outputs = model(**inputs)
            depth = outputs.predicted_depth.squeeze().cpu().numpy()
        else:
            # MiDaS
            input_batch = processor(rgb).to(DEVICE)
            with torch.no_grad():
                prediction = model(input_batch)
            depth = prediction.squeeze().cpu().numpy()
        # Normalize to 0-1
        d_min, d_max = depth.min(), depth.max()
        if d_max - d_min > 1e-6:
            depth = (depth - d_min) / (d_max - d_min)
        else:
            depth = np.zeros_like(depth)
        return depth
    except Exception as e:
        print(f"[depth] Frame failed: {e}", flush=True)
        return None


def _empty_depth(dur=0):
    return {
        "depthTimeline": [], "avgFgBgSeparation": 0, "avgMeanDepth": 0.5,
        "hasStrongParallax": False, "depthStyle": "flat",
        "mlModel": "none", "processingMs": 0,
    }


# ═════════════════════════════════════════════════════════════════════════════
#  ANALYSIS MODULE 4: Color / Reinhard LAB Transfer
# ═════════════════════════════════════════════════════════════════════════════

def reinhard_lab_stats(frames):
    """
    Compute Reinhard color transfer statistics from sampled frames.

    Converts each frame to CIELAB colour space and computes per-channel
    mean and standard deviation.  These statistics are all that's needed
    to transfer the colour "feel" of one video onto another using:

        target_ch = (target_ch - target_mean) * (ref_std / target_std) + ref_mean

    Returns per-channel LAB statistics averaged across all frames.
    """
    if not frames:
        return None

    all_L_mean, all_A_mean, all_B_mean = [], [], []
    all_L_std, all_A_std, all_B_std = [], [], []

    for frame in frames:
        lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB).astype(np.float32)
        L, A, B = cv2.split(lab)

        all_L_mean.append(float(np.mean(L)))
        all_A_mean.append(float(np.mean(A)))
        all_B_mean.append(float(np.mean(B)))
        all_L_std.append(float(np.std(L)))
        all_A_std.append(float(np.std(A)))
        all_B_std.append(float(np.std(B)))

    return {
        "mean_L": round(float(np.mean(all_L_mean)), 2),
        "mean_a": round(float(np.mean(all_A_mean)), 2),
        "mean_b": round(float(np.mean(all_B_mean)), 2),
        "std_L": round(float(np.mean(all_L_std)), 2),
        "std_a": round(float(np.mean(all_A_std)), 2),
        "std_b": round(float(np.mean(all_B_std)), 2),
    }


def analyze_color(video_path, n_frames=10):
    t0 = time.time()
    from sklearn.cluster import KMeans

    frms = extract_frames(video_path, fps=max(1, n_frames // 5), max_frames=n_frames, scale="320:-2")
    if not frms:
        return _empty_color()

    frames = [f for _, f in frms]
    duration, _, _, _ = get_video_info(video_path)

    # ── Classical multi-space statistics ───────────────────────────────
    all_b, all_s, all_c, all_w, all_hue = [], [], [], [], []
    all_lab_l, all_lab_a, all_lab_b = [], [], []
    shadow_vals, mid_vals, hl_vals = [], [], []
    all_pixels = []

    for frame in frames:
        resized = cv2.resize(frame, (320, 240))
        hsv = cv2.cvtColor(resized, cv2.COLOR_BGR2HSV)
        lab = cv2.cvtColor(resized, cv2.COLOR_BGR2LAB)
        h_ch, s_ch, v_ch = cv2.split(hsv)
        l_ch, a_ch, b_ch = cv2.split(lab)

        mv = float(np.mean(v_ch)) / 255.0
        all_b.append(pow(mv, 0.75))
        ms = float(np.mean(s_ch))
        all_s.append(min(2.5, max(0, (ms / 90.0) * 1.35)))
        all_c.append(float(np.std(v_ch)) / 128.0)
        warmth = (float(np.mean(b_ch)) - 128) / 50.0
        all_w.append(max(-1.0, min(1.0, warmth)))

        hue_rad = np.deg2rad(h_ch.astype(float) * 2)
        mh = np.rad2deg(np.arctan2(np.mean(np.sin(hue_rad)), np.mean(np.cos(hue_rad))))
        if mh < 0:
            mh += 360
        all_hue.append(mh)

        all_lab_l.append(float(np.mean(l_ch)))
        all_lab_a.append(float(np.mean(a_ch)))
        all_lab_b.append(float(np.mean(b_ch)))

        sm, mm_, hm = v_ch < 64, (v_ch >= 64) & (v_ch < 192), v_ch >= 192
        if np.any(sm):
            shadow_vals.append((float(np.mean(h_ch[sm])), float(np.mean(s_ch[sm])), float(np.mean(v_ch[sm]))))
        if np.any(mm_):
            mid_vals.append((float(np.mean(h_ch[mm_])), float(np.mean(s_ch[mm_])), float(np.mean(v_ch[mm_]))))
        if np.any(hm):
            hl_vals.append((float(np.mean(h_ch[hm])), float(np.mean(s_ch[hm])), float(np.mean(v_ch[hm]))))

        all_pixels.append(resized.reshape(-1, 3)[::10])

    brightness = round(float(np.mean(all_b)), 4)
    saturation = round(float(np.mean(all_s)), 4)
    contrast = round(float(np.mean(all_c)), 4)
    warmth_val = round(float(np.mean(all_w)), 4)

    hue_arr = np.array(all_hue)
    hr = np.deg2rad(hue_arr)
    mean_hue = np.rad2deg(np.arctan2(np.mean(np.sin(hr)), np.mean(np.cos(hr))))
    if mean_hue < 0:
        mean_hue += 360
    hue = round(float(mean_hue), 1)

    # K-Means palette
    all_px = np.concatenate(all_pixels, axis=0)
    if len(all_px) > 20000:
        idx = np.random.choice(len(all_px), 20000, replace=False)
        all_px = all_px[idx]
    km = KMeans(n_clusters=5, n_init=2, max_iter=50, random_state=42).fit(all_px)
    labels, counts = np.unique(km.labels_, return_counts=True)
    order = np.argsort(-counts)
    palette = []
    for idx in order:
        ctr = km.cluster_centers_[idx]
        r, g, b = int(ctr[2]), int(ctr[1]), int(ctr[0])
        palette.append({
            "hex": f"#{r:02x}{g:02x}{b:02x}",
            "rgb": [r, g, b],
            "fraction": round(float(counts[idx]) / len(all_px), 4),
        })

    # Shadow/mid/highlight analysis
    def _zone_stats(vals):
        if not vals:
            return {}
        return {
            "avgHue": round(float(np.mean([v[0] for v in vals])) * 2, 1),
            "avgSaturation": round(float(np.mean([v[1] for v in vals])) / 255, 4),
            "avgBrightness": round(float(np.mean([v[2] for v in vals])) / 255, 4),
        }

    # ── Reinhard LAB statistics (lightweight, no GPU model needed) ────
    reinhard_stats = reinhard_lab_stats(frames)

    # Look classification
    if brightness < 0.35 and contrast > 0.5:
        look = "cinematic-dark"
    elif brightness > 0.7 and saturation < 0.8:
        look = "bright-pastel"
    elif saturation > 1.5 and warmth_val > 0.2:
        look = "vibrant-warm"
    elif saturation > 1.5 and warmth_val < -0.2:
        look = "vibrant-cool"
    elif warmth_val > 0.3:
        look = "warm-golden"
    elif warmth_val < -0.3:
        look = "cool-blue"
    elif contrast < 0.25:
        look = "flat-log"
    elif saturation < 0.5:
        look = "desaturated"
    else:
        look = "natural"

    eq_brightness = round((brightness - 0.5) * 0.4, 4)
    eq_contrast = round(0.8 + contrast * 0.6, 4)
    eq_saturation = round(saturation, 4)
    eq_gamma = round(1.0 / max(0.3, brightness + 0.1), 4)

    return {
        "brightness": brightness,
        "saturation": saturation,
        "contrast": contrast,
        "warmth": warmth_val,
        "hue": hue,
        "look": look,
        "dominantPalette": palette,
        "shadowAnalysis": _zone_stats(shadow_vals),
        "midtoneAnalysis": _zone_stats(mid_vals),
        "highlightAnalysis": _zone_stats(hl_vals),
        "eqParams": {
            "brightness": eq_brightness,
            "contrast": eq_contrast,
            "saturation": eq_saturation,
            "gamma": eq_gamma,
        },
        "labStats": reinhard_stats if reinhard_stats else {
            "mean_L": round(float(np.mean(all_lab_l)), 2),
            "mean_a": round(float(np.mean(all_lab_a)), 2),
            "mean_b": round(float(np.mean(all_lab_b)), 2),
            "std_L": round(float(np.std(all_lab_l)), 2),
            "std_a": round(float(np.std(all_lab_a)), 2),
            "std_b": round(float(np.std(all_lab_b)), 2),
        },
        "temporalConsistency": round(1.0 - min(1.0, float(np.std(all_b)) + float(np.std(all_s))), 4),
        "reinhardLabStats": reinhard_stats,
        "frameCount": len(frames),
        "duration": round(duration, 3),
        "mlModel": "reinhard-lab+kmeans-gpu",
        "processingMs": round((time.time() - t0) * 1000),
    }


def _empty_color():
    return {
        "brightness": 0.5, "saturation": 1.0, "contrast": 0.5, "warmth": 0,
        "hue": 0, "look": "unknown", "dominantPalette": [],
        "shadowAnalysis": {}, "midtoneAnalysis": {}, "highlightAnalysis": {},
        "eqParams": {"brightness": 0, "contrast": 1, "saturation": 1, "gamma": 1},
        "labStats": {}, "temporalConsistency": 0, "frameCount": 0,
        "duration": 0, "mlModel": "none", "processingMs": 0,
    }


# ═════════════════════════════════════════════════════════════════════════════
#  ANALYSIS MODULE 5: Beat Detection (madmom RNN+DBN primary, librosa fallback)
# ═════════════════════════════════════════════════════════════════════════════

def analyze_beats(video_path):
    t0 = time.time()
    import librosa

    wav_path = extract_audio_wav(video_path)
    if wav_path is None:
        return _empty_beats()

    try:
        y, sr = librosa.load(wav_path, sr=22050, mono=True)
        duration = len(y) / sr
        if duration < 0.5:
            return _empty_beats(duration)

        # ── Tier 1: madmom RNN + DBN beat tracking (high accuracy) ────
        #    madmom uses 3× bidirectional LSTMs trained on 100+ annotated
        #    beat tracking datasets → beat activation function → DBN for
        #    probabilistic beat grid inference (fps=100 → 10ms resolution).
        #    This gives significantly better rhythmic accuracy than librosa.
        beat_times = None
        bpm = 0.0
        madmom_used = False
        model_name = "librosa-spectral-flux-dbn-gpu"

        try:
            import madmom  # type: ignore[reportMissingImports]
            print("[beats] Trying madmom RNN+DBN (high-accuracy)...", flush=True)
            sig = madmom.audio.signal.Signal(wav_path, sample_rate=44100, num_channels=1)
            beat_proc = madmom.features.beats.RNNBeatProcessor()(sig)
            dbn_proc = madmom.features.beats.DBNBeatTrackingProcessor(fps=100)
            beat_times_mm = dbn_proc(beat_proc)
            if len(beat_times_mm) >= 3:
                beat_times = beat_times_mm
                madmom_used = True
                model_name = "madmom-rnn-dbn-gpu"
                # Tempo estimation via madmom CombFilter
                try:
                    tempo_proc = madmom.features.tempo.TempoEstimationProcessor(fps=100)
                    tempi = tempo_proc(beat_proc)
                    if len(tempi) > 0:
                        bpm = float(tempi[0][0])
                except Exception:
                    pass
                print(f"[beats] ✅ madmom: {len(beat_times)} beats, BPM={bpm:.1f}", flush=True)
            else:
                print(f"[beats] madmom found only {len(beat_times_mm)} beats — falling back to librosa", flush=True)
        except ImportError:
            print("[beats] madmom not installed — using librosa", flush=True)
        except Exception as e:
            print(f"[beats] madmom failed: {e} — using librosa", flush=True)

        # ── Tier 2: librosa spectral flux + DBN (fallback) ────────────
        onset_env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=512, aggregate=np.median)
        onset_env_bass = librosa.onset.onset_strength(y=y, sr=sr, hop_length=512,
                                                       feature=librosa.feature.melspectrogram,
                                                       fmin=20, fmax=250, n_mels=32)
        onset_env_mid = librosa.onset.onset_strength(y=y, sr=sr, hop_length=512,
                                                      feature=librosa.feature.melspectrogram,
                                                      fmin=250, fmax=4000, n_mels=32)
        onset_env_high = librosa.onset.onset_strength(y=y, sr=sr, hop_length=512,
                                                       feature=librosa.feature.melspectrogram,
                                                       fmin=4000, fmax=8000, n_mels=32)

        if beat_times is None:
            # Librosa beat tracker as fallback
            tempo, beat_frames = librosa.beat.beat_track(
                onset_envelope=onset_env, sr=sr, hop_length=512, start_bpm=120, tightness=100
            )
            beat_times = librosa.frames_to_time(beat_frames, sr=sr, hop_length=512)
            if hasattr(tempo, "__len__"):
                bpm = float(tempo[0]) if len(tempo) > 0 else 0.0
            else:
                bpm = float(tempo)

        # Onset detection (always via librosa for multi-band analysis)
        onset_frames = librosa.onset.onset_detect(
            onset_envelope=onset_env, sr=sr, hop_length=512, backtrack=True, delta=0.07, wait=3
        )
        onset_times = librosa.frames_to_time(onset_frames, sr=sr, hop_length=512)

        # Merge beat times + onset times, de-duplicate
        all_times = np.unique(np.concatenate([beat_times, onset_times]))
        all_times = np.sort(all_times)
        all_times = all_times[all_times < duration - 0.05]
        if len(all_times) > 1:
            deduped = [all_times[0]]
            for t in all_times[1:]:
                if t - deduped[-1] >= 0.06:
                    deduped.append(t)
            all_times = np.array(deduped)

        # Build beat events with per-beat intensity and band classification
        onset_env_norm = onset_env / (np.max(onset_env) + 1e-8)
        beat_events = []
        for t in all_times:
            fi = librosa.time_to_frames(t, sr=sr, hop_length=512)
            fi = min(fi, len(onset_env_norm) - 1)
            intensity = float(onset_env_norm[fi])
            bass_e = float(onset_env_bass[min(fi, len(onset_env_bass) - 1)])
            mid_e = float(onset_env_mid[min(fi, len(onset_env_mid) - 1)])
            high_e = float(onset_env_high[min(fi, len(onset_env_high) - 1)])
            mx_band = max(bass_e, mid_e, high_e)
            if mx_band < 0.01:
                band = "mid"
            elif bass_e >= mid_e and bass_e >= high_e:
                band = "bass"
            elif high_e >= mid_e:
                band = "high"
            else:
                band = "mid"
            beat_events.append({
                "timestamp_sec": round(float(t), 4),
                "intensity": round(max(0, min(1, intensity)), 4),
                "flux": round(float(onset_env[fi]), 4),
                "band": band,
            })

        # Normalize BPM to 60-180 range
        while bpm > 180:
            bpm /= 2
        while 0 < bpm < 60:
            bpm *= 2
        bpm = round(max(60, min(180, bpm)), 1)

        # BPM confidence from inter-beat interval consistency
        confidence = 0.0
        if len(beat_times) >= 3:
            ibis = np.diff(beat_times)
            if len(ibis) > 0:
                med_ibi = np.median(ibis)
                if med_ibi > 0:
                    consistency = 1.0 - min(1.0, np.std(ibis) / med_ibi)
                    inlier_ratio = np.mean(np.abs(ibis - med_ibi) < med_ibi * 0.3)
                    confidence = round(float(consistency * inlier_ratio), 4)

        rms = librosa.feature.rms(y=y, hop_length=512)[0]
        peak_amplitude = float(np.max(np.abs(y)))
        peak_db = round(20 * np.log10(peak_amplitude + 1e-10), 1)
        mean_rms = float(np.mean(rms))

        return {
            "beats": [round(float(t), 4) for t in beat_times if t < duration],
            "beatEvents": beat_events[:500],
            "bpm": bpm,
            "bpmConfidence": confidence,
            "firstBeatSec": round(float(beat_times[0]), 4) if len(beat_times) > 0 else 0,
            "peakDb": peak_db,
            "meanVolume": round(min(1.0, mean_rms * 3), 4),
            "hasAudio": True,
            "audioTimeline": [],  # Kept lightweight for API transfer
            "rhythmRegions": [],
            "regionCount": 0,
            "avgBeatIntensity": round(float(np.mean([b["intensity"] for b in beat_events])) if beat_events else 0, 4),
            "peakBeatIntensity": round(float(max(b["intensity"] for b in beat_events)) if beat_events else 0, 4),
            "beatDensity": round(len(beat_events) / max(duration, 0.1), 4),
            "timeSignatureGuess": "4/4",
            "processingMs": round((time.time() - t0) * 1000),
            "mlModel": model_name,
        }
    finally:
        try:
            os.unlink(wav_path)
        except OSError:
            pass


def _empty_beats(duration=0):
    return {
        "beats": [], "beatEvents": [], "bpm": 0, "bpmConfidence": 0,
        "firstBeatSec": 0, "peakDb": -60, "meanVolume": 0, "hasAudio": False,
        "audioTimeline": [], "rhythmRegions": [], "regionCount": 0,
        "avgBeatIntensity": 0, "peakBeatIntensity": 0, "beatDensity": 0,
        "timeSignatureGuess": "unknown", "processingMs": 0, "mlModel": "none",
    }


# ═════════════════════════════════════════════════════════════════════════════
#  FASTAPI SERVER
# ═════════════════════════════════════════════════════════════════════════════

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse, Response
import uvicorn

app = FastAPI(title="Colab GPU Video Analysis Server", version="1.0.0")


@app.get("/health")
async def health():
    gpu_info = {}
    if torch.cuda.is_available():
        gpu_info = {
            "gpu": torch.cuda.get_device_name(0),
            "vram_total_gb": round(torch.cuda.get_device_properties(0).total_memory / 1e9, 2),
            "vram_used_gb": round(torch.cuda.memory_allocated(0) / 1e9, 2),
            "vram_free_gb": round(
                (torch.cuda.get_device_properties(0).total_memory - torch.cuda.memory_allocated(0)) / 1e9, 2
            ),
        }
    return {
        "status": "ok",
        "device": str(DEVICE),
        "gpu": gpu_info,
        "models_loaded": list(_models.keys()),
    }


async def _save_upload(file: UploadFile) -> str:
    """Save uploaded video to a temp file and return the path."""
    suffix = Path(file.filename or "video.mp4").suffix or ".mp4"
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    content = await file.read()
    tmp.write(content)
    tmp.close()
    return tmp.name


@app.post("/process-video")
async def process_video(file: UploadFile = File(...)):
    """
    Full pipeline: runs ALL 5 analysis modules on the uploaded video.
    Returns combined metadata matching the TypeScript FullVideoMetadata shape.
    """
    video_path = await _save_upload(file)
    try:
        t0 = time.time()
        import gc

        results = {}
        errors = []

        # ── GPU memory strategy for T4 (16 GB VRAM) ──────────────────
        # RAFT-Large + Depth-Anything-Base are heavy; unload each after
        # its stage finishes so the next stage has headroom.
        # Color analysis now uses Reinhard LAB (no GPU model needed).
        STAGE_CLEANUP = {
            "motion": "raft",
            "depth": "depth",
        }

        for name, fn, args in [
            ("shots", analyze_shots, (video_path,)),
            ("motion", analyze_motion, (video_path, 10)),
            ("depth", analyze_depth, (video_path, 2)),
            ("color", analyze_color, (video_path, 10)),
            ("beats", analyze_beats, (video_path,)),
        ]:
            try:
                results[name] = fn(*args)
                print(f"[pipeline] {name}: OK ({results[name].get('processingMs', 0)}ms, "
                      f"model={results[name].get('mlModel', 'n/a')})", flush=True)
            except Exception as e:
                errors.append(f"{name}: {str(e)}")
                traceback.print_exc()
                results[name] = None

            # Offload heavy model from GPU after its stage
            model_key = STAGE_CLEANUP.get(name)
            if model_key and model_key in _models:
                m = _models.pop(model_key)
                if hasattr(m, "cpu"):
                    m.cpu()
                elif isinstance(m, tuple):
                    for part in m:
                        if hasattr(part, "cpu"):
                            part.cpu()
                del m
            gc.collect()
            torch.cuda.empty_cache()

        total_ms = round((time.time() - t0) * 1000)

        return JSONResponse(
            content=json.loads(json.dumps({
                "success": True,
                "shots": results.get("shots"),
                "motion": results.get("motion"),
                "depth": results.get("depth"),
                "color": results.get("color"),
                "beats": results.get("beats"),
                "totalProcessingMs": total_ms,
                "device": str(DEVICE),
                "errors": errors if errors else None,
            }, cls=NumpyEncoder)),
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        try:
            os.unlink(video_path)
        except OSError:
            pass


@app.post("/analyze/shots")
async def api_shots(file: UploadFile = File(...)):
    video_path = await _save_upload(file)
    try:
        result = analyze_shots(video_path)
        return JSONResponse(content=json.loads(json.dumps(result, cls=NumpyEncoder)))
    finally:
        try:
            os.unlink(video_path)
        except OSError:
            pass


@app.post("/analyze/motion")
async def api_motion(file: UploadFile = File(...)):
    video_path = await _save_upload(file)
    try:
        result = analyze_motion(video_path, fps=10)
        return JSONResponse(content=json.loads(json.dumps(result, cls=NumpyEncoder)))
    finally:
        try:
            os.unlink(video_path)
        except OSError:
            pass


@app.post("/analyze/depth")
async def api_depth(file: UploadFile = File(...)):
    video_path = await _save_upload(file)
    try:
        result = analyze_depth(video_path, fps=2)
        return JSONResponse(content=json.loads(json.dumps(result, cls=NumpyEncoder)))
    finally:
        try:
            os.unlink(video_path)
        except OSError:
            pass


@app.post("/analyze/color")
async def api_color(file: UploadFile = File(...)):
    video_path = await _save_upload(file)
    try:
        result = analyze_color(video_path, n_frames=10)
        return JSONResponse(content=json.loads(json.dumps(result, cls=NumpyEncoder)))
    finally:
        try:
            os.unlink(video_path)
        except OSError:
            pass


@app.post("/analyze/beats")
async def api_beats(file: UploadFile = File(...)):
    video_path = await _save_upload(file)
    try:
        result = analyze_beats(video_path)
        return JSONResponse(content=json.loads(json.dumps(result, cls=NumpyEncoder)))
    finally:
        try:
            os.unlink(video_path)
        except OSError:
            pass


# ═════════════════════════════════════════════════════════════════════════════
#  FFmpeg GPU RENDER — Offloaded from the Next.js server
# ═════════════════════════════════════════════════════════════════════════════

@app.post("/render")
async def render_video(
    target: UploadFile = File(...),
    reference: UploadFile = File(None),
    hald_clut: UploadFile = File(None),
    filter_graph: str = Form(...),
    temporal_color_cmd: str = Form(""),
    beat_pulse_cmd: str = Form(""),
    blur_cmd: str = Form(""),
    transition_cmd: str = Form(""),
    impact_cmd: str = Form(""),
    codec_flags: str = Form("-c:v libx264 -profile:v high -pix_fmt yuv420p -preset slow -crf 18 -threads 0"),
    bitrate_flags: str = Form("-b:v 5M -minrate 3M -maxrate 8M -bufsize 16M"),
    audio_flags: str = Form(""),
    mapping_flags: str = Form('-map "[vout]"'),
    duration: float = Form(10.0),
    loop_audio: bool = Form(False),
):
    """
    GPU-accelerated FFmpeg render endpoint.

    Receives the pre-built filter_complex graph and video files from the
    Next.js server, runs FFmpeg on the Colab machine (with optional NVENC
    GPU encoding), and streams the rendered MP4 back.

    This keeps all filter-graph construction logic on the TypeScript side
    while offloading the heavy CPU/GPU encode work to Colab's hardware.
    """
    tmp_dir = tempfile.mkdtemp(prefix="colab_render_")
    try:
        t0 = time.time()

        # ── Save uploaded files ────────────────────────────────────────
        target_path = os.path.join(tmp_dir, "target.mp4")
        with open(target_path, "wb") as f:
            f.write(await target.read())

        ref_path = None
        if reference is not None:
            content = await reference.read()
            if len(content) > 0:
                ref_path = os.path.join(tmp_dir, "reference.mp4")
                with open(ref_path, "wb") as f:
                    f.write(content)

        hald_path = None
        if hald_clut is not None:
            content = await hald_clut.read()
            if len(content) > 0:
                hald_path = os.path.join(tmp_dir, "hald_clut.png")
                with open(hald_path, "wb") as f:
                    f.write(content)

        # ── Write temporal color sendcmd file if provided ──────────────
        sendcmd_path = None
        if temporal_color_cmd.strip():
            sendcmd_path = os.path.join(tmp_dir, "temporal_color.cmd")
            with open(sendcmd_path, "w", encoding="utf-8") as f:
                f.write(temporal_color_cmd)

        # ── Write beat pulse sendcmd file if provided ──────────────────
        beat_pulse_path = None
        if beat_pulse_cmd.strip():
            beat_pulse_path = os.path.join(tmp_dir, "beat_pulse.cmd")
            with open(beat_pulse_path, "w", encoding="utf-8") as f:
                f.write(beat_pulse_cmd)

        # ── Write blur replication sendcmd file if provided ────────────
        blur_cmd_path = None
        if blur_cmd.strip():
            blur_cmd_path = os.path.join(tmp_dir, "ref_blur.cmd")
            with open(blur_cmd_path, "w", encoding="utf-8") as f:
                f.write(blur_cmd)

        # ── Write transition replication sendcmd file if provided ──────
        transition_cmd_path = None
        if transition_cmd.strip():
            transition_cmd_path = os.path.join(tmp_dir, "ref_transition.cmd")
            with open(transition_cmd_path, "w", encoding="utf-8") as f:
                f.write(transition_cmd)

        # ── Write beat-triggered jitter sendcmd file if provided ───────
        impact_cmd_path = None
        if impact_cmd.strip():
            impact_cmd_path = os.path.join(tmp_dir, "beat_impact.cmd")
            with open(impact_cmd_path, "w", encoding="utf-8") as f:
                f.write(impact_cmd)

        output_path = os.path.join(tmp_dir, "output.mp4")

        # ── Rewrite filter_graph paths ─────────────────────────────────
        #    The client's filter_graph references placeholder paths.
        #    Replace them with real Colab-side temp paths.
        #    Use forward slashes and escape colons for FFmpeg.
        graph = filter_graph

        if sendcmd_path:
            safe_cmd = sendcmd_path.replace("\\", "/").replace(":", "\\:")
            graph = graph.replace("__SENDCMD_PATH__", safe_cmd)

        if beat_pulse_path:
            safe_bp = beat_pulse_path.replace("\\", "/").replace(":", "\\:")
            graph = graph.replace("__BEATPULSE_PATH__", safe_bp)

        if blur_cmd_path:
            safe_blur = blur_cmd_path.replace("\\", "/").replace(":", "\\:")
            graph = graph.replace("__BLURCMD_PATH__", safe_blur)

        if transition_cmd_path:
            safe_trans = transition_cmd_path.replace("\\", "/").replace(":", "\\:")
            graph = graph.replace("__TRANSCMD_PATH__", safe_trans)

        if impact_cmd_path:
            safe_impact = impact_cmd_path.replace("\\", "/").replace(":", "\\:")
            graph = graph.replace("__IMPACTCMD_PATH__", safe_impact)

        # ── Build inputs ───────────────────────────────────────────────
        inputs = []
        # Input indices must match what the client's filter_graph expects:
        #   With ref audio:  0=reference, 1=target, 2=hald (optional)
        #   Without ref:     0=target, 1=hald (optional)
        has_ref = ref_path is not None

        if has_ref:
            if loop_audio:
                inputs.extend(["-stream_loop", "-1", "-i", ref_path])
            else:
                inputs.extend(["-i", ref_path])

        inputs.extend(["-i", target_path])

        if hald_path:
            inputs.extend(["-i", hald_path])

        # ── Write filter graph to file (avoid CLI length limits) ───────
        filter_file = os.path.join(tmp_dir, "filter_complex.txt")
        with open(filter_file, "w", encoding="utf-8") as f:
            f.write(graph)

        # Verify the filter graph file was written successfully
        if not os.path.exists(filter_file) or os.path.getsize(filter_file) == 0:
            raise HTTPException(
                status_code=400,
                detail="filter_complex.txt is missing or empty — cannot render",
            )
        print(f"[render] filter_complex.txt written: {os.path.getsize(filter_file)} bytes", flush=True)

        # ── Check for NVENC GPU encoding ──────────────────────────────
        #    If an NVIDIA GPU is available, swap libx264 → h264_nvenc
        #    for 5-10× faster encoding.  Keep libx264 as fallback.
        actual_codec_flags = codec_flags
        if torch.cuda.is_available():
            try:
                # Probe whether h264_nvenc is available in this FFmpeg build
                probe = subprocess.run(
                    ["ffmpeg", "-hide_banner", "-encoders"],
                    capture_output=True, text=True, timeout=5,
                )
                if "h264_nvenc" in probe.stdout:
                    actual_codec_flags = codec_flags.replace(
                        "-c:v libx264", "-c:v h264_nvenc"
                    ).replace(
                        "-preset slow", "-preset p4"
                    ).replace(
                        "-crf 18", "-cq 18 -rc vbr -bf 0"
                    )
                    # Ensure -bf 0 is present even if codec_flags
                    # already had nvenc but missed it
                    if "-bf 0" not in actual_codec_flags:
                        actual_codec_flags += " -bf 0"
                    print("[render] Using h264_nvenc GPU encoding (B-frames disabled for browser compat)", flush=True)
                else:
                    print("[render] h264_nvenc not available, using libx264", flush=True)
            except Exception:
                print("[render] GPU encoder probe failed, using libx264", flush=True)

        # ── Read filter graph content for -filter_complex ──────────────
        #    Use standard -filter_complex with the graph as an inline
        #    string argument.  This is compatible with ALL FFmpeg versions
        #    (the newer -/filter_complex file-read syntax requires 7.x+).
        with open(filter_file, "r", encoding="utf-8") as f:
            filter_graph_content = f.read()

        # ── Build FFmpeg command ───────────────────────────────────────
        cmd = [
            "ffmpeg", "-y",
            "-analyzeduration", "100M", "-probesize", "100M",
            *inputs,
            "-filter_complex", filter_graph_content,
        ]

        # Parse mapping, codec, audio, and bitrate flags
        import shlex
        cmd.extend(shlex.split(mapping_flags))
        cmd.extend(shlex.split(actual_codec_flags))
        if audio_flags.strip():
            cmd.extend(shlex.split(audio_flags))
        cmd.extend(["-movflags", "+faststart"])
        cmd.extend(shlex.split(bitrate_flags))
        cmd.extend(["-t", f"{duration:.3f}"])
        cmd.append(output_path)

        print(f"[render] FFmpeg command: {' '.join(cmd)}", flush=True)

        # ── Execute FFmpeg ─────────────────────────────────────────────
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=600,  # 10 minute max
        )

        if proc.returncode != 0:
            print(f"[render] FFmpeg FAILED:\n{proc.stderr[-2000:]}", flush=True)
            raise HTTPException(
                status_code=500,
                detail=f"FFmpeg render failed (exit {proc.returncode}):\n{proc.stderr[-2000:]}",
            )

        if not os.path.exists(output_path):
            raise HTTPException(status_code=500, detail="FFmpeg produced no output file")

        output_size = os.path.getsize(output_path)
        elapsed = time.time() - t0
        print(
            f"[render] ✅ Render complete: {output_size/1024:.0f}KB in {elapsed:.1f}s"
            + (f" (GPU: {torch.cuda.get_device_name(0)})" if torch.cuda.is_available() else ""),
            flush=True,
        )

        # ── Stream rendered video back ─────────────────────────────────
        video_bytes = open(output_path, "rb").read()
        return Response(
            content=video_bytes,
            media_type="video/mp4",
            headers={
                "X-Render-Ms": str(round(elapsed * 1000)),
                "X-Output-Size": str(output_size),
            },
        )

    except HTTPException:
        raise
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="FFmpeg render timed out (>10 min)")
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        try:
            shutil.rmtree(tmp_dir, ignore_errors=True)
        except Exception:
            pass


# ═════════════════════════════════════════════════════════════════════════════
#  NGROK TUNNEL + STARTUP
# ═════════════════════════════════════════════════════════════════════════════

def start_server():
    PORT = 8000

    # ── Pre-load ALL models BEFORE exposing the server ───────────────
    #    Download & load every model onto GPU first so the ngrok URL
    #    is only published once the server is fully warm.  This prevents
    #    the 600s timeout when the first request triggers a large
    #    model download (RAFT / Depth-Anything).
    #    VGG-19 has been removed — colour analysis now uses the
    #    lightweight Reinhard LAB method (OpenCV only, no weights).
    print("[colab-gpu] Pre-loading models onto GPU (this may take a few minutes on first run)...", flush=True)
    try:
        get_raft()
    except Exception as e:
        print(f"[colab-gpu] ⚠ RAFT pre-load failed: {e}", flush=True)
    try:
        get_depth_model()
    except Exception as e:
        print(f"[colab-gpu] ⚠ Depth model pre-load failed: {e}", flush=True)
    try:
        get_transnetv2()
    except Exception as e:
        print(f"[colab-gpu] ⚠ TransNetV2 pre-load failed: {e}", flush=True)
    print("[colab-gpu] ✅ All models loaded. Opening tunnel...\n", flush=True)

    # ── Ngrok tunnel (opened AFTER models are warm) ──────────────────
    try:
        from pyngrok import ngrok

        # ╔═══════════════════════════════════════════════════════════╗
        # ║  PASTE YOUR NGROK AUTHTOKEN BELOW                       ║
        # ╚═══════════════════════════════════════════════════════════╝
        NGROK_AUTH_TOKEN = "YOUR_NGROK_AUTHTOKEN"

        ngrok.set_auth_token(NGROK_AUTH_TOKEN)
        tunnel = ngrok.connect(PORT, "http")
        public_url = tunnel.public_url

        print("\n" + "=" * 60)
        print("🚀 COLAB GPU SERVER READY")
        print("=" * 60)
        print(f"  Local:   http://localhost:{PORT}")
        print(f"  Public:  {public_url}")
        print(f"  Health:  {public_url}/health")
        print(f"  Device:  {DEVICE}")
        if DEVICE.type == "cuda":
            print(f"  GPU:     {torch.cuda.get_device_name(0)}")
        print("=" * 60)
        print(f"\n📋 Copy this URL into your .env file:")
        print(f"   COLAB_GPU_URL={public_url}")
        print("=" * 60 + "\n")

    except ImportError:
        print(f"\n[colab-gpu] pyngrok not installed — running locally on port {PORT}")
        print(f"  http://localhost:{PORT}/health\n")
    except Exception as e:
        print(f"\n[colab-gpu] Ngrok tunnel failed: {e}")
        print(f"  Running locally on port {PORT}\n")

    print("[colab-gpu] Server starting...\n", flush=True)

    uvicorn.run(app, host="0.0.0.0", port=PORT)


if __name__ == "__main__":
    start_server()
