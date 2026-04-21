import sys
import os
import cv2
import json
import numpy as np
import gc

class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (np.integer,)): return int(obj)
        if isinstance(obj, (np.floating,)): return float(obj)
        if isinstance(obj, np.ndarray): return obj.tolist()
        return super().default(obj)

try:
    import torch
except ImportError:
    torch = None

if torch is None:
    DEVICE = "cpu"
else:
    # Force CUDA-only runtime to avoid accidental CPU fallbacks which are
    # extremely slow for Depth-Anything V2. Fail fast if CUDA is not available.
    if not torch.cuda.is_available():
        sys.stderr.write("[depth] ERROR: CUDA not available — refusing CPU fallback to avoid slow execution\n")
        raise RuntimeError("CUDA not available")
    DEVICE = torch.device("cuda")

def json_dumps(obj):
    return json.dumps(obj, cls=NumpyEncoder)

def empty_result():
    raise RuntimeError("ANTI-FAKE: empty_result() requested but no real data available.")

def try_depth_anything(frames):
    try:
        from transformers import AutoImageProcessor, AutoModelForDepthEstimation
        from PIL import Image
        proc = AutoImageProcessor.from_pretrained("depth-anything/Depth-Anything-V2-Base-hf")
        model = AutoModelForDepthEstimation.from_pretrained("depth-anything/Depth-Anything-V2-Base-hf").to(DEVICE).eval()
        
        results = []
        for f in frames:
            pil_img = Image.fromarray(cv2.cvtColor(f, cv2.COLOR_BGR2RGB))
            inputs = proc(images=pil_img, return_tensors="pt").to(DEVICE)
            with torch.no_grad():
                outputs = model(**inputs)
            d = outputs.predicted_depth.squeeze().cpu().numpy()
            results.append(d)
        return results, "depth-anything-v2"
    except Exception as e:
        sys.stderr.write(f"[depth] Depth-Anything V2 failed: {e}\n")
        return None, "none"

def try_midas(frames):
    try:
        model = torch.hub.load("intel-isl/MiDaS", "MiDaS_small").to(DEVICE).eval()
        transform = torch.hub.load("intel-isl/MiDaS", "transforms").small_transform
        results = []
        for f in frames:
            rgb = cv2.cvtColor(f, cv2.COLOR_BGR2RGB)
            input_batch = transform(rgb).to(DEVICE)
            with torch.no_grad():
                prediction = model(input_batch)
            results.append(prediction.squeeze().cpu().numpy())
        return results, "midas-small"
    except Exception as e:
        sys.stderr.write(f"[depth] MiDaS failed: {e}\n")
        return None, "none"

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

def analyze_depth_live(width, height, fps=2, max_frames=None, model_pref="auto"):
    import time
    t0 = time.time()
    
    # Selection logic
    model_type = "none"
    
    count = 0
    dt = 1.0 / fps
    
    for frame in read_frames_from_stdin(width, height, max_frames):
        if model_type == "none":
            # Try Depth-Anything first
            depth_maps, model_type = try_depth_anything([frame])
            if model_type == "none":
                depth_maps, model_type = try_midas([frame])
            
            if model_type == "none":
                raise RuntimeError("[depth] All depth models failed to load.")
            
            sys.stderr.write(f"[depth] Initialized: model={model_type} device={DEVICE}\n")
        else:
            if "anything" in model_type:
                depth_maps, _ = try_depth_anything([frame])
            else:
                depth_maps, _ = try_midas([frame])
        
        t = count * dt
        if depth_maps and len(depth_maps) > 0:
            d_map = depth_maps[0]
            # Normalize map to 0-1 for variance check
            d_min, d_max = d_map.min(), d_map.max()
            if d_max - d_min > 1e-6:
                d_map = (d_map - d_min) / (d_max - d_min)
            
            avg_d = float(np.mean(d_map))
            var_d = float(np.var(d_map))
            
            if count == 0:
                sys.stderr.write(f"[depth] Sample: frame={count} avg={avg_d:.4f} var={var_d:.6f}\n")
            
            obj = {
                "frame_index": count,
                "timestamp": round(t, 4),
                "depth": {
                    "averageDepth": round(avg_d, 4),
                    "depthVariance": round(var_d, 6),
                    "model": model_type
                }
            }
            print(json.dumps(obj), flush=True)
        else:
            raise RuntimeError(f"[depth] Depth extraction failed at frame {count}")

        count += 1
        if count % 20 == 0:
            import gc
            gc.collect()

    duration = time.time() - t0
    sys.stderr.write(f"[depth] Done: frames={count} time={duration:.2f}s model={model_type}\n")
    return {"frameCount": count, "mlModel": model_type}

def analyze_depth(video_path, fps=2, model_pref="auto"):
    """Fallback for non-stdin processing of a file."""
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Could not open video: {video_path}")
    
    import time
    t0 = time.time()
    
    model_type = "none"
    results = []
    count = 0
    dt = 1.0 / fps
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    while True:
        ret, frame = cap.read()
        if not ret: break
        
        if model_type == "none":
            depth_maps, model_type = try_depth_anything([frame])
            if model_type == "none":
                depth_maps, model_type = try_midas([frame])
            if model_type == "none":
                raise RuntimeError("[depth] All depth models failed to load.")
        else:
            if "anything" in model_type:
                depth_maps, _ = try_depth_anything([frame])
            else:
                depth_maps, _ = try_midas([frame])
                
        if depth_maps:
            d_map = depth_maps[0]
            d_min, d_max = d_map.min(), d_map.max()
            if d_max - d_min > 1e-6:
                d_map = (d_map - d_min) / (d_max - d_min)
            
            results.append({
                "frame_index": count,
                "timestamp": round(count * dt, 4),
                "depth": {
                    "averageDepth": round(float(np.mean(d_map)), 4),
                    "depthVariance": round(float(np.var(d_map)), 6),
                    "model": model_type
                }
            })
        count += 1
        if count % 20 == 0: gc.collect()

    cap.release()
    return {"frameCount": count, "mlModel": model_type, "depthTimeline": results}

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
        fps = 2
        model = "auto"
        max_f = None
        if '--width' in sys.argv: width = int(sys.argv[sys.argv.index('--width') + 1])
        if '--height' in sys.argv: height = int(sys.argv[sys.argv.index('--height') + 1])
        if '--fps' in sys.argv: fps = int(sys.argv[sys.argv.index('--fps') + 1])
        if '--model' in sys.argv: model = sys.argv[sys.argv.index('--model') + 1]
        if '--frames' in sys.argv: max_f = int(sys.argv[sys.argv.index('--frames') + 1])
        
        try:
            result = analyze_depth_live(width, height, fps, max_f, model)
            _emit(result)
        except Exception as e:
            _emit({"error": str(e), **empty_result()})
        return

    if len(sys.argv) < 2:
        _emit({"error": "Usage: ml_depth_analysis.py <video_path>", **empty_result()})
        return

    video_path = sys.argv[1]
    if video_path.startswith('"') and video_path.endswith('"'): video_path = video_path[1:-1]
    if not os.path.isfile(video_path):
        _emit({"error": f"File not found: {video_path}", **empty_result()})
        return

    fps = 2
    model = "auto"
    if '--fps' in sys.argv:
        idx = sys.argv.index('--fps')
        if idx + 1 < len(sys.argv):
            try: fps = int(sys.argv[idx + 1])
            except ValueError: pass
    if '--model' in sys.argv:
        idx = sys.argv.index('--model')
        if idx + 1 < len(sys.argv): model = sys.argv[idx + 1]

    warnings = []
    try:
        st = _time.time()
        result = analyze_depth(video_path, fps=fps, model_pref=model)
        used_model = result.get("mlModel", "none")
        stages_log.append({"name": "depth-analysis", "ok": used_model != "none", "model": used_model, "ms": round((_time.time() - st) * 1000)})
        _emit(result, warnings if warnings else None)
    except Exception as e:
        import traceback; traceback.print_exc(file=sys.stderr)
        stages_log.append({"name": "depth-analysis", "ok": False, "error": str(e)})
        _emit({"error": str(e), **empty_result()}, warnings if warnings else None)

if __name__ == "__main__":
    main()
