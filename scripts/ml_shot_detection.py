import sys
import os
import cv2
import json
import numpy as np

class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (np.integer,)): return int(obj)
        if isinstance(obj, (np.floating,)): return float(obj)
        if isinstance(obj, np.ndarray): return obj.tolist()
        return super().default(obj)

def json_dumps(obj):
    return json.dumps(obj, cls=NumpyEncoder)

def empty_result():
    raise RuntimeError("ANTI-FAKE: empty_result() requested but no real data available.")

def try_transnetv2(frames):
    try:
        from transnetv2 import TransNetV2
        model = TransNetV2()
        single_preds, _ = model.predict_frames(frames)
        return single_preds, "transnetv2"
    except Exception as e:
        sys.stderr.write(f"[shots] TransNetV2 failed: {e}\n")
        return None, "none"

def detect_shots_classical(frames):
    if len(frames) < 3: return [], "none"
    dists = []
    for i in range(1, len(frames)):
        h1 = cv2.calcHist([frames[i-1]], [0], None, [256], [0, 256])
        h2 = cv2.calcHist([frames[i]], [0], None, [256], [0, 256])
        dists.append(cv2.compareHist(h1, h2, cv2.HISTCMP_CHISQR))
    
    avg = np.mean(dists)
    std = np.std(dists)
    th = avg + 3 * std
    
    shots = []
    for i, d in enumerate(dists):
        if d > th:
            shots.append({"index": i + 1, "score": float(d)})
    return shots, "hist-chisqr"

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
        yield cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
        frames_processed += 1

def analyze_shots_live(width, height, fps=5, max_frames=None):
    import time
    t0 = time.time()
    
    # We buffer frames because TransNetV2 works on sequences
    all_frames = []
    for frame in read_frames_from_stdin(width, height, max_frames):
        # Resize for model/performance
        small = cv2.resize(frame, (48, 27))
        all_frames.append(small)
    
    if not all_frames:
        raise RuntimeError("[shots] No frames received over stdin.")
    
    frames_np = np.array(all_frames)
    preds, model_name = try_transnetv2(frames_np)
    
    is_cut_list = []
    if preds is not None:
        is_cut_list = (preds > 0.5).tolist()
    else:
        # Fallback to classical
        cuts, model_name = detect_shots_classical(frames_np)
        is_cut_list = [False] * len(all_frames)
        for c in cuts: is_cut_list[c["index"]] = True
        
    sys.stderr.write(f"[shots] Initialized: model={model_name} frames={len(all_frames)}\n")
    
    shot_id = 0
    for i, is_cut in enumerate(is_cut_list):
        if is_cut: shot_id += 1
        obj = {
            "timestamp": round(i / fps, 4),
            "shot": {
                "shot_id": shot_id,
                "is_cut": is_cut,
                "model": model_name
            }
        }
        print(json.dumps(obj), flush=True)
        if i == 0: sys.stderr.write(f"[shots] Sample: frame={i} is_cut={is_cut} shot_id={shot_id}\n")

    duration = time.time() - t0
    sys.stderr.write(f"[shots] Done: time={duration:.2f}s model={model_name}\n")
    return {"shotCount": shot_id + 1, "mlModel": model_name}

def analyze_shots(video_path, fps=5):
    """Fallback for non-stdin processing of a file."""
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Could not open video: {video_path}")
    
    all_frames = []
    while True:
        ret, frame = cap.read()
        if not ret: break
        small = cv2.resize(frame, (48, 27))
        all_frames.append(small)
    cap.release()
    
    if not all_frames: return {"shots": [], "shotCount": 0, "mlModel": "none"}
    
    frames_np = np.array(all_frames)
    preds, model_name = try_transnetv2(frames_np)
    
    shot_id = 0
    results = []
    is_cut_list = []
    if preds is not None:
        is_cut_list = (preds > 0.5).tolist()
    else:
        cuts, model_name = detect_shots_classical(frames_np)
        is_cut_list = [False] * len(all_frames)
        for c in cuts: is_cut_list[c["index"]] = True
        
    for i, is_cut in enumerate(is_cut_list):
        if is_cut: shot_id += 1
        results.append({
            "timestamp": round(i / fps, 4),
            "shot": {"shot_id": shot_id, "is_cut": is_cut, "model": model_name}
        })
    
    return {"shotCount": shot_id + 1, "mlModel": model_name, "shotTimeline": results}

def main():
    import time as _time
    _t0 = _time.time()
    stages_log = []

    def _emit(result, warnings=None):
        result["_pipelineOk"] = "error" not in result or result.get("shotCount", 0) > 0
        result["_stages"] = stages_log
        result["_processingMs"] = round((_time.time() - _t0) * 1000)
        if warnings:
            result["_warnings"] = warnings
        print(json_dumps(result))

    if '--stdin' in sys.argv:
        width = 1920
        height = 1080
        fps = 5
        max_f = None
        if '--width' in sys.argv: width = int(sys.argv[sys.argv.index('--width') + 1])
        if '--height' in sys.argv: height = int(sys.argv[sys.argv.index('--height') + 1])
        if '--fps' in sys.argv: fps = float(sys.argv[sys.argv.index('--fps') + 1])
        if '--frames' in sys.argv: max_f = int(sys.argv[sys.argv.index('--frames') + 1])
        
        try:
            result = analyze_shots_live(width, height, fps, max_f)
            _emit(result)
        except Exception as e:
            _emit({"error": str(e), **empty_result()})
        return

    if len(sys.argv) < 2:
        _emit({"error": "Usage: ml_shot_detection.py <video_path>", **empty_result()})
        return
    video_path = sys.argv[1]
    if video_path.startswith('"') and video_path.endswith('"'): video_path = video_path[1:-1]
    if not os.path.isfile(video_path):
        _emit({"error": f"File not found: {video_path}", **empty_result()})
        return
    fps = 5
    if '--fps' in sys.argv:
        idx = sys.argv.index('--fps')
        if idx+1 < len(sys.argv):
            try: fps = int(sys.argv[idx+1])
            except ValueError: pass

    warnings = []
    try:
        st = _time.time()
        result = analyze_shots(video_path, fps)
        model = result.get("mlModel", "none")
        stages_log.append({"name": "shot-detection", "ok": model != "none", "model": model, "ms": round((_time.time() - st) * 1000)})
        _emit(result, warnings if warnings else None)
    except Exception as e:
        import traceback; traceback.print_exc(file=sys.stderr)
        stages_log.append({"name": "shot-detection", "ok": False, "error": str(e)})
        _emit({"error": str(e), **empty_result()}, warnings if warnings else None)

if __name__ == "__main__":
    main()
