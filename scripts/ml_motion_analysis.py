import sys
import os
import cv2
try:
    import torch
except ImportError:
    torch = None
import json
import numpy as np
import gc

class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (np.integer,)): return int(obj)
        if isinstance(obj, (np.floating,)): return float(obj)
        if isinstance(obj, np.ndarray): return obj.tolist()
        return super().default(obj)

if torch is not None:
    DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
else:
    DEVICE = "cpu"

def json_dumps(obj):
    return json.dumps(obj, cls=NumpyEncoder)

def empty():
    raise RuntimeError("ANTI-FAKE: empty() result requested but no real data available.")

def _load_raft():
    if not torch: return None, None
    try:
        from torchvision.models.optical_flow import raft_large, Raft_Large_Weights
        weights = Raft_Large_Weights.DEFAULT
        model = raft_large(weights=weights).to(DEVICE).eval()
        for p in model.parameters(): p.requires_grad = False
        return model, weights.transforms()
    except Exception as e:
        sys.stderr.write(f"[motion] RAFT load failed: {e}\n")
        return None, None

def raft_flow(model, transform, f1, f2):
    if model is None: return None
    try:
        # RGB expected
        rgb1 = cv2.cvtColor(f1, cv2.COLOR_BGR2RGB)
        rgb2 = cv2.cvtColor(f2, cv2.COLOR_BGR2RGB)
        # Resize for speed/VRAM
        h, w = rgb1.shape[:2]
        nw, nh = (w // 8) * 8, (h // 8) * 8
        r1 = cv2.resize(rgb1, (nw, nh))
        r2 = cv2.resize(rgb2, (nw, nh))
        t1 = torch.from_numpy(r1).permute(2, 0, 1).float().unsqueeze(0).to(DEVICE)
        t2 = torch.from_numpy(r2).permute(2, 0, 1).float().unsqueeze(0).to(DEVICE)
        with torch.no_grad():
            preds = model(t1, t2)
            flow = preds[-1].float()
        return flow[0].permute(1, 2, 0).cpu().numpy()
    except Exception as e:
        sys.stderr.write(f"[motion] RAFT inference failed: {e}\n")
        return None

def farneback_flow(g1, g2):
    return cv2.calcOpticalFlowFarneback(g1, g2, None, 0.5, 3, 15, 3, 5, 1.2, 0)

def detect_camera_type(flow):
    mdx = float(np.median(flow[..., 0]))
    mdy = float(np.median(flow[..., 1]))
    h, w = flow.shape[:2]
    if abs(mdx/w) < 0.002 and abs(mdy/h) < 0.002: return "static"
    if abs(mdx/w) > abs(mdy/h) * 2: return "pan"
    if abs(mdy/h) > abs(mdx/w) * 2: return "tilt"
    return "drift"

def read_frames_from_stdin(width, height, count=None):
    frame_size = width * height * 3
    frames_processed = 0
    while True:
        if count is not None and frames_processed >= count:
            break
        raw_frame = sys.stdin.buffer.read(frame_size)
        if len(raw_frame) != frame_size:
            break
        frame = np.frombuffer(raw_frame, dtype=np.uint8).reshape((height, width, 3))
        # Convert RGB to BGR for OpenCV consistency
        import cv2
        yield cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
        frames_processed += 1

def analyze_motion_live(width, height, fps=30, max_frames=None):
    import time
    t0 = time.time()
    model, transform = _load_raft()
    model_name = "raft-large" if model else "farneback"
    sys.stderr.write(f"[motion] Initialized: model={model_name} device={DEVICE}\n")
    
    count = 0
    prev_frame = None
    prev_gray = None
    
    for frame in read_frames_from_stdin(width, height, max_frames):
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        if prev_frame is not None:
            flow = raft_flow(model, transform, prev_frame, frame)
            if flow is None:
                flow = farneback_flow(prev_gray, gray)
            
            mag, _ = cv2.cartToPolar(flow[..., 0], flow[..., 1])
            mm = float(np.mean(mag))
            xm = float(np.max(mag))
            cam = detect_camera_type(flow)
            
            if count == 1: # First sample
                sys.stderr.write(f"[motion] Sample: frame={count} mean={mm:.4f} type={cam}\n")
            
            obj = {
                "frame_index": count,
                "timestamp": round(count / fps, 4),
                "motion": {
                    "meanMagnitude": round(mm, 4),
                    "maxMagnitude": round(xm, 4),
                    "cameraType": cam,
                    "model": model_name
                }
            }
            print(json.dumps(obj), flush=True)
            
        prev_frame = frame.copy()
        prev_gray = gray.copy()
        count += 1
    
    duration = time.time() - t0
    sys.stderr.write(f"[motion] Done: frames={count} time={duration:.2f}s model={model_name}\n")
    return {"frameCount": count, "mlModel": model_name}

def analyze_motion(video_path, fps=30):
    """Fallback for non-stdin processing of a file."""
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Could not open video: {video_path}")
    
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    
    import time
    t0 = time.time()
    model, transform = _load_raft()
    model_name = "raft-large" if model else "farneback"
    
    count = 0
    prev_frame = None
    prev_gray = None
    results = []
    
    while True:
        ret, frame = cap.read()
        if not ret: break
        
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        if prev_frame is not None:
            flow = raft_flow(model, transform, prev_frame, frame)
            if flow is None:
                flow = farneback_flow(prev_gray, gray)
            
            mag, _ = cv2.cartToPolar(flow[..., 0], flow[..., 1])
            mm = float(np.mean(mag))
            xm = float(np.max(mag))
            cam = detect_camera_type(flow)
            
            results.append({
                "timestamp": round(count / fps, 4),
                "motion": {
                    "meanMagnitude": round(mm, 4),
                    "maxMagnitude": round(xm, 4),
                    "cameraType": cam,
                    "model": model_name
                }
            } )
            
        prev_frame = frame.copy()
        prev_gray = gray.copy()
        count += 1
        
    cap.release()
    return {"frameCount": count, "mlModel": model_name, "motionTimeline": results}

def main():
    import time as _time
    _t0 = _time.time()
    stages_log = []

    def _emit(result, warnings=None):
        result["_pipelineOk"] = "error" not in result or result.get("frameCount", 0) > 0
        result["_stages"] = stages_log
        result["_processingMs"] = round((_time.time() - _t0) * 1000)
        if warnings:
            result["_warnings"] = warnings
        print(json_dumps(result))

    if '--stdin' in sys.argv:
        width = 1920
        height = 1080
        fps = 30
        max_f = None
        if '--width' in sys.argv: width = int(sys.argv[sys.argv.index('--width') + 1])
        if '--height' in sys.argv: height = int(sys.argv[sys.argv.index('--height') + 1])
        if '--fps' in sys.argv: fps = int(sys.argv[sys.argv.index('--fps') + 1])
        if '--frames' in sys.argv: max_f = int(sys.argv[sys.argv.index('--frames') + 1])
        
        try:
            result = analyze_motion_live(width, height, fps, max_f)
            _emit(result)
        except Exception as e:
            _emit({"error": str(e), **empty()})
        return

    if len(sys.argv) < 2:
        _emit({"error":"Usage: ml_motion_analysis.py <video_path>", **empty()}); return
    vp = sys.argv[1]
    if vp.startswith('"') and vp.endswith('"'): vp = vp[1:-1]
    if not os.path.isfile(vp):
        _emit({"error":f"File not found: {vp}", **empty()}); return
    fps = 30
    if '--fps' in sys.argv:
        idx = sys.argv.index('--fps')
        if idx+1 < len(sys.argv):
            try: fps = int(sys.argv[idx+1])
            except ValueError: pass
    warnings = []
    try:
        st = _time.time()
        result = analyze_motion(vp, fps)
        model = result.get("mlModel", "unknown")
        if "farneback" in str(model).lower():
            warnings.append("RAFT unavailable, used Farneback fallback")
        stages_log.append({"name": "motion-analysis", "ok": True, "model": model, "ms": round((_time.time() - st) * 1000)})
        _emit(result, warnings if warnings else None)
    except Exception as e:
        import traceback; traceback.print_exc(file=sys.stderr)
        stages_log.append({"name": "motion-analysis", "ok": False, "error": str(e)})
        _emit({"error":str(e), **empty()}, warnings if warnings else None)

if __name__ == "__main__": main()
