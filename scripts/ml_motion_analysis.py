#!/usr/bin/env python3
"""
ML Motion Analysis — Real RAFT Optical Flow + Farneback Fallback
==================================================================
Cascading dense optical flow:

  1. RAFT-Small (torchvision.models.optical_flow) — real deep CNN
     Teed & Deng, ECCV 2020 — correlation volume + GRU refinement
  2. Farneback (OpenCV) — classical polynomial expansion fallback

Both paths produce identical output: motion vectors, velocity segments,
camera motion classification, zoom timeline, and motion intensity.

Usage:
  python scripts/ml_motion_analysis.py <video_path> [--fps 10]
"""

import sys, json, os, subprocess, tempfile, gc
import numpy as np

class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (np.integer,)): return int(obj)
        if isinstance(obj, (np.floating,)): return float(obj)
        if isinstance(obj, np.ndarray): return obj.tolist()
        return super().default(obj)

def json_dumps(obj): return json.dumps(obj, cls=NumpyEncoder)

def find_ffmpeg():
    for name in ['ffmpeg', 'ffmpeg.exe']:
        for d in os.environ.get('PATH', '').split(os.pathsep):
            p = os.path.join(d, name)
            if os.path.isfile(p): return p
    for p in [r'C:\ffmpeg\bin\ffmpeg.exe', r'C:\ProgramData\chocolatey\bin\ffmpeg.exe',
              '/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg']:
        if os.path.isfile(p): return p
    return 'ffmpeg'

def get_video_info(video_path):
    ffmpeg = find_ffmpeg()
    ffprobe = ffmpeg.replace('ffmpeg', 'ffprobe')
    cmd = [ffprobe, '-v', 'quiet', '-show_entries',
           'format=duration:stream=r_frame_rate,width,height',
           '-select_streams', 'v:0', '-of', 'json', video_path]
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        d = json.loads(r.stdout)
        dur = float(d.get('format', {}).get('duration', 10))
        s = d.get('streams', [{}])[0]
        fps_s = s.get('r_frame_rate', '30/1'); n, dn = fps_s.split('/')
        return dur, float(n)/float(dn), int(s.get('width', 1920)), int(s.get('height', 1080))
    except Exception:
        return 10, 30, 1920, 1080

def extract_frames(video_path, fps=30, max_frames=300):
    import cv2
    ffmpeg = find_ffmpeg()
    tmpdir = tempfile.mkdtemp(prefix='ml_motion_')
    cmd = [ffmpeg, '-y', '-i', video_path, '-vf', f'fps={fps},scale=480:-2',
           '-frames:v', str(max_frames), '-q:v', '3',
           os.path.join(tmpdir, 'frame_%06d.jpg')]
    subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    frames, grays = [], []
    for fname in sorted(os.listdir(tmpdir)):
        if fname.endswith('.jpg'):
            fpath = os.path.join(tmpdir, fname)
            f = cv2.imread(fpath)
            if f is not None:
                frames.append(f)
                grays.append(cv2.cvtColor(f, cv2.COLOR_BGR2GRAY))
            try: os.unlink(fpath)
            except OSError: pass
    try: os.rmdir(tmpdir)
    except OSError: pass
    return frames, grays


# ═══════════════════════════════════════════════════════════════════════════════
#  Real RAFT — torchvision.models.optical_flow.raft_small
# ═══════════════════════════════════════════════════════════════════════════════

_raft_model = None
_raft_device = None

def _load_raft():
    global _raft_model, _raft_device
    if _raft_model is not None:
        return _raft_model, _raft_device
    try:
        import torch
        from torchvision.models.optical_flow import raft_small, Raft_Small_Weights
        _raft_device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"[RAFT] Loading raft_small on {_raft_device}...", file=sys.stderr, flush=True)
        w = Raft_Small_Weights.DEFAULT
        _raft_model = raft_small(weights=w).to(_raft_device).eval()
        print("[RAFT] Model loaded", file=sys.stderr, flush=True)
        return _raft_model, _raft_device
    except Exception as e:
        print(f"[RAFT] Cannot load: {e}", file=sys.stderr)
        return None, None

def raft_flow(frame1_bgr, frame2_bgr):
    """Compute dense flow with real RAFT. Returns (H,W,2) or None."""
    model, device = _load_raft()
    if model is None: return None
    try:
        import torch, cv2
        r1 = cv2.cvtColor(frame1_bgr, cv2.COLOR_BGR2RGB)
        r2 = cv2.cvtColor(frame2_bgr, cv2.COLOR_BGR2RGB)
        h, w = r1.shape[:2]
        nh, nw = (h//8)*8, (w//8)*8
        if nh != h or nw != w:
            r1, r2 = cv2.resize(r1, (nw, nh)), cv2.resize(r2, (nw, nh))
        t1 = torch.from_numpy(r1).permute(2,0,1).float().unsqueeze(0).to(device)
        t2 = torch.from_numpy(r2).permute(2,0,1).float().unsqueeze(0).to(device)
        with torch.no_grad():
            preds = model(t1, t2)
            flow = preds[-1]
        result = flow[0].permute(1,2,0).cpu().numpy()
        del t1, t2, flow, preds
        if torch.cuda.is_available(): torch.cuda.empty_cache()
        return result
    except Exception as e:
        print(f"[RAFT] Flow failed: {e}", file=sys.stderr)
        return None

def farneback_flow(prev_gray, curr_gray):
    import cv2
    return cv2.calcOpticalFlowFarneback(prev_gray, curr_gray, None,
        pyr_scale=0.5, levels=5, winsize=15, iterations=5,
        poly_n=7, poly_sigma=1.5, flags=cv2.OPTFLOW_FARNEBACK_GAUSSIAN)

def sparse_flow(prev_gray, curr_gray):
    import cv2
    pts = cv2.goodFeaturesToTrack(prev_gray, maxCorners=200, qualityLevel=0.01, minDistance=10, blockSize=7)
    if pts is None or len(pts) == 0: return np.array([])
    curr_pts, st, _ = cv2.calcOpticalFlowPyrLK(prev_gray, curr_gray, pts, None,
        winSize=(21,21), maxLevel=3, criteria=(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT, 30, 0.01))
    if curr_pts is None: return np.array([])
    mask = st.flatten() == 1
    return (curr_pts[mask] - pts[mask]) if mask.any() else np.array([])

def camera_motion(disps, shape):
    if len(disps) < 5:
        return {"panX": 0, "panY": 0, "type": "static", "magnitude": 0}
    mdx, mdy = float(np.median(disps[:,0,0])), float(np.median(disps[:,0,1]))
    h, w = shape[:2]
    px, py = mdx/w, mdy/h
    mag = float(np.sqrt(px**2 + py**2))
    if mag < 0.002: mt = "static"
    elif abs(px) > abs(py)*2: mt = "pan-horizontal"
    elif abs(py) > abs(px)*2: mt = "tilt-vertical"
    elif mag > 0.05: mt = "rapid"
    else: mt = "drift"
    return {"panX": round(px,6), "panY": round(py,6), "type": mt, "magnitude": round(mag,6)}

def detect_zoom(flow, shape):
    h, w = shape[:2]
    cy, cx = h/2.0, w/2.0
    step = max(1, min(h,w)//32)
    ys, xs = np.arange(0,h,step), np.arange(0,w,step)
    yy, xx = np.meshgrid(ys, xs, indexing='ij')
    dx, dy = xx.astype(np.float32)-cx, yy.astype(np.float32)-cy
    r = np.sqrt(dx**2+dy**2)+1e-6
    rad = flow[yy,xx,0]*(dx/r) + flow[yy,xx,1]*(dy/r)
    wt = (r/r.max()).clip(0.2,1.0)
    return float(np.average(rad.flatten(), weights=wt.flatten()))

def _log(cur, tot, label="RAFT"):
    pct = int(cur/max(tot,1)*100)
    filled = int(30*cur/max(tot,1))
    print(f"[{label}] {'█'*filled}{'░'*(30-filled)} {pct}% ({cur}/{tot})", file=sys.stderr, flush=True)

def analyze_motion(video_path, fps=30):
    import cv2
    dur, vfps, ow, oh = get_video_info(video_path)
    frames, grays = extract_frames(video_path, fps)
    if len(grays) < 3: return empty(dur)

    total = len(grays)
    dt = 1.0/fps
    use_raft = _load_raft()[0] is not None
    label = "raft-small-real" if use_raft else "farneback-fallback"
    step = 2 if dur > 10 else 1
    pairs = list(range(1, total, step))
    n = len(pairs)
    print(f"[{label}] {total} frames, dur={dur:.1f}s, step={step}, pairs={n}", file=sys.stderr, flush=True)

    data = []
    for bi in range(0, n, 10):
        batch = pairs[bi:bi+10]
        for i in batch:
            t = i*dt
            pi = max(0, i-step)
            flow = raft_flow(frames[pi], frames[i]) if use_raft else farneback_flow(grays[pi], grays[i])
            mag = np.sqrt(flow[...,0]**2 + flow[...,1]**2)
            ang = np.arctan2(flow[...,1], flow[...,0])
            mm, xm, dm = float(np.mean(mag)), float(np.max(mag)), float(np.median(mag))
            ma = float(np.mean(mag > 2.0))
            dd = float(np.rad2deg(np.average(ang.flatten(), weights=mag.flatten()+0.01))) if mm > 0.5 else 0
            disp = sparse_flow(grays[pi], grays[i])
            cam = camera_motion(disp, grays[i].shape)
            zs = detect_zoom(flow, grays[i].shape)
            fd = float(np.mean(cv2.absdiff(grays[pi], grays[i])))/255.0
            del flow, mag, ang
            data.append({"time_sec":round(t,4),"meanMagnitude":round(mm,4),"maxMagnitude":round(xm,4),
                         "medianMagnitude":round(dm,4),"motionArea":round(ma,4),"dominantDirection":round(dd,1),
                         "frameDiff":round(fd,4),"zoomSpeed":round(zs,6),"camera":cam})
        gc.collect()
        try:
            import torch
            if torch.cuda.is_available(): torch.cuda.empty_cache()
        except ImportError: pass
        _log(min(bi+10, n), n, label.upper())

    del frames, grays; gc.collect()
    ei = dt*step
    vel_segs = build_vel_segs(data, dur, ei)
    mags = [m["meanMagnitude"] for m in data]
    mx = max(max(mags),1)
    oi = round(float(np.mean(mags))/mx, 4)
    cx = round(float(np.std(mags))/(mx+0.01), 4)
    style = "static" if oi<0.1 else "slow" if oi<0.25 else "moderate" if oi<0.5 else "dynamic" if oi<0.75 else "intense"
    from collections import Counter
    ct = Counter(m["camera"]["type"] for m in data)
    dc = ct.most_common(1)[0][0] if ct else "static"
    s = max(1, len(data)//300)
    zl = [{"time_sec":m["time_sec"],"zoomSpeed":m.get("zoomSpeed",0)} for m in data]
    azs = [m.get("zoomSpeed",0) for m in data]
    return {
        "velocitySegments": vel_segs, "motionTimeline": data[::s][:300],
        "overallIntensity": oi, "complexity": cx, "style": style,
        "dominantCameraMotion": dc,
        "avgMagnitude": round(float(np.mean(mags)),4), "maxMagnitude": round(float(max(mags)),4),
        "avgMotionArea": round(float(np.mean([m["motionArea"] for m in data])),4),
        "avgFrameDiff": round(float(np.mean([m["frameDiff"] for m in data])),4),
        "segmentCount": len(vel_segs), "frameCount": total, "analysisFps": fps,
        "duration": round(dur,3), "resolution": {"width":ow,"height":oh},
        "zoomTimeline": zl[::max(1,len(zl)//300)][:300],
        "avgZoomSpeed": round(float(np.mean(azs)),6) if azs else 0,
        "maxZoomSpeed": round(float(max(azs, key=abs)),6) if azs else 0,
        "dominantZoom": "zoom-in" if np.mean(azs)>0.3 else ("zoom-out" if np.mean(azs)<-0.3 else "none"),
        "mlModel": label,
    }

def build_vel_segs(data, dur, dt):
    if not data: return [{"start_sec":0,"end_sec":dur,"level":"static","avgMagnitude":0}]
    mags = [m["meanMagnitude"] for m in data]
    p25,p50,p75,p90 = [float(np.percentile(mags,p)) for p in (25,50,75,90)]
    def cl(m):
        if m < max(p25,0.5): return "static"
        if m < max(p50,2.0): return "slow"
        if m < max(p75,5.0): return "moderate"
        if m < max(p90,10.0): return "fast"
        return "intense"
    segs, cur, si, sm = [], cl(mags[0]), 0, [mags[0]]
    for i in range(1, len(mags)):
        l = cl(mags[i])
        if l != cur:
            segs.append({"start_sec":round(data[si]["time_sec"],4),"end_sec":round(data[i-1]["time_sec"]+dt,4),
                         "level":cur,"avgMagnitude":round(float(np.mean(sm)),4),"maxMagnitude":round(float(max(sm)),4)})
            cur, si, sm = l, i, [mags[i]]
        else: sm.append(mags[i])
    segs.append({"start_sec":round(data[si]["time_sec"],4),"end_sec":round(min(data[-1]["time_sec"]+dt,dur),4),
                 "level":cur,"avgMagnitude":round(float(np.mean(sm)),4),"maxMagnitude":round(float(max(sm)),4)})
    merged = []
    for s in segs:
        if merged and (s["end_sec"]-s["start_sec"])<0.3:
            merged[-1]["end_sec"] = s["end_sec"]
            w1, w2 = merged[-1]["end_sec"]-merged[-1]["start_sec"], s["end_sec"]-s["start_sec"]
            merged[-1]["avgMagnitude"] = round((merged[-1]["avgMagnitude"]*w1+s["avgMagnitude"]*w2)/(w1+w2),4)
            merged[-1]["maxMagnitude"] = max(merged[-1]["maxMagnitude"], s["maxMagnitude"])
        else: merged.append(s)
    return merged or segs

def empty(dur=0):
    return {"velocitySegments":[{"start_sec":0,"end_sec":dur,"level":"static","avgMagnitude":0}],
            "motionTimeline":[],"overallIntensity":0,"complexity":0,"style":"static",
            "dominantCameraMotion":"static","avgMagnitude":0,"maxMagnitude":0,"avgMotionArea":0,
            "avgFrameDiff":0,"segmentCount":1,"frameCount":0,"analysisFps":0,"duration":dur,
            "resolution":{"width":0,"height":0},"mlModel":"none"}

def main():
    if len(sys.argv) < 2:
        print(json_dumps({"error":"Usage: ml_motion_analysis.py <video_path>", **empty()})); return
    vp = sys.argv[1]
    if vp.startswith('"') and vp.endswith('"'): vp = vp[1:-1]
    if not os.path.isfile(vp):
        print(json_dumps({"error":f"File not found: {vp}", **empty()})); return
    fps = 30
    if '--fps' in sys.argv:
        idx = sys.argv.index('--fps')
        if idx+1 < len(sys.argv):
            try: fps = int(sys.argv[idx+1])
            except ValueError: pass
    try:
        print(json_dumps(analyze_motion(vp, fps)))
    except Exception as e:
        import traceback; traceback.print_exc(file=sys.stderr)
        print(json_dumps({"error":str(e), **empty()}))

if __name__ == "__main__": main()
