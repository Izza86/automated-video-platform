"""
Deterministic frame extractor and per-frame signals generator.

Follows strict rules:
- Use FFmpeg + FFprobe (no OpenCV VideoCapture)
- Extract ALL frames, save timestamps from ffprobe
- Compute per-frame: 256-bin RGB hist per channel, LAB hist (L,a,b), brightness (mean luminance), contrast (std luminance), saturation (HSV S mean)
- Store per-frame JSON objects (one per line) with exact timestamp alignment
- Batch process frames to avoid RAM overflow, use numpy vectorization
- Produce three sample plots: brightness, contrast, saturation curves
 - Add strict sanity checks, min/max stats, NaN checks, and save 5 sample frames with per-frame JSON for manual inspection.

Copilot: Do not remove error handling, fail-safes, and detailed logs in every handler.
"""
from __future__ import annotations
import os
import subprocess
import sys
import json
import math
import traceback
from pathlib import Path
from typing import List
import numpy as np
from PIL import Image
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from skimage import color
import shutil
import math


def run_cmd(cmd: List[str], capture_output: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, check=True, stdout=subprocess.PIPE if capture_output else None, stderr=subprocess.PIPE if capture_output else None, text=True)


def extract_timestamps_ffprobe(video_path: str) -> List[float]:
    """Use ffprobe to extract per-frame pkt_pts_time timestamps in seconds, preserving order."""
    try:
        # Try multiple ffprobe fields to be robust across containers
        fields = ["pkt_pts_time", "pts_time", "best_effort_timestamp_time"]
        for field in fields:
            cmd = [
                "ffprobe",
                "-v",
                "error",
                "-select_streams",
                "v",
                "-show_frames",
                "-show_entries",
                f"frame={field}",
                "-of",
                "csv=p=0",
                video_path,
            ]
            proc = run_cmd(cmd)
            lines = [ln.strip() for ln in proc.stdout.splitlines() if ln.strip()]
            if lines:
                try:
                    timestamps = [float(x) for x in lines]
                    return timestamps
                except ValueError:
                    # non-numeric entries; skip to next field
                    continue
        # If we reach here, no usable timestamps were found
        return []
    except Exception:
        tb = traceback.format_exc()
        print("extract_timestamps_ffprobe failed:\n", tb, file=sys.stderr)
        raise


def extract_frames_ffmpeg(video_path: str, out_dir: str) -> None:
    """Extract every frame to PNG files using ffmpeg, preserving exact frame order.

    Output files: out_dir/frame_00000001.png ...
    """
    try:
        os.makedirs(out_dir, exist_ok=True)
        out_pattern = os.path.join(out_dir, "frame_%08d.png")
        cmd = [
            "ffmpeg",
            "-y",
            "-i",
            video_path,
            "-vsync",
            "0",
            "-frame_pts",
            "true",
            out_pattern,
        ]
        # run and stream stderr to help debugging
        subprocess.run(cmd, check=True)
    except Exception:
        tb = traceback.format_exc()
        print("extract_frames_ffmpeg failed:\n", tb, file=sys.stderr)
        raise


def extract_frames_ffmpeg_with_fps(video_path: str, out_dir: str, fps: float) -> None:
    """Extract frames forcing a specific fps via the fps filter to match timestamps count."""
    try:
        os.makedirs(out_dir, exist_ok=True)
        out_pattern = os.path.join(out_dir, "frame_%08d.png")
        # Use fps filter to force exact frame count corresponding to timestamps
        cmd = [
            "ffmpeg",
            "-y",
            "-i",
            video_path,
            "-vf",
            f"fps={fps}",
            out_pattern,
        ]
        subprocess.run(cmd, check=True)
    except Exception:
        tb = traceback.format_exc()
        print("extract_frames_ffmpeg_with_fps failed:\n", tb, file=sys.stderr)
        raise


def get_video_resolution(video_path: str) -> Tuple[int, int]:
    try:
        cmd = [
            "ffprobe",
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=width,height",
            "-of",
            "csv=s=x:p=0",
            video_path,
        ]
        proc = run_cmd(cmd)
        out = proc.stdout.strip()
        if not out:
            raise RuntimeError("Could not determine video resolution via ffprobe")
        w, h = out.split("x")
        return int(w), int(h)
    except Exception:
        tb = traceback.format_exc()
        print("get_video_resolution failed:\n", tb, file=sys.stderr)
        raise


def stream_frames_ffmpeg(video_path: str, width: int, height: int, fps: Optional[float] = None):
    """Stream frames via ffmpeg stdout as rawvideo (RGB24). Yields numpy arrays per frame.

    If fps is provided, apply -vf fps={fps} to force exact frame rate.
    """
    try:
        # Build ffmpeg command exactly as required
        cmd = [
            "ffmpeg",
            "-v",
            "error",
            "-i",
            video_path,
        ]
        if fps is not None:
            # fps may be provided as string with high precision
            cmd += ["-vf", f"fps={fps}"]
        cmd += ["-f", "rawvideo", "-pix_fmt", "rgb24", "-"]

        # Debug
        print("Running ffmpeg command:", " ".join(map(str, cmd)))

        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if proc.stdout is None:
            raise RuntimeError("ffmpeg stdout pipe not available")

        frame_size = width * height * 3
        print(f"Video resolution: {width}x{height}")
        print(f"Expected bytes per frame: {frame_size}")

        total_bytes = 0
        frames_parsed = 0
        try:
            while True:
                raw = proc.stdout.read(frame_size)
                if not raw:
                    break
                total_bytes += len(raw)
                if len(raw) < frame_size:
                    # incomplete frame at end — stop
                    print(f"Incomplete frame read: {len(raw)} bytes (<{frame_size}) — stopping")
                    break
                arr = np.frombuffer(raw, dtype=np.uint8)
                try:
                    arr = arr.reshape((height, width, 3))
                except Exception:
                    print(f"Reshape failed for frame #{frames_parsed} — raw length={len(raw)}")
                    break
                frames_parsed += 1
                yield arr
        finally:
            # Close stdout and wait for process to exit, then read stderr safely
            try:
                if proc.stdout:
                    proc.stdout.close()
            except Exception:
                pass
            try:
                proc.wait(timeout=5)
            except Exception:
                try:
                    proc.kill()
                except Exception:
                    pass
                proc.wait()
            stderr_text = ""
            try:
                if proc.stderr:
                    # read remaining stderr (binary -> text)
                    stderr_bytes = proc.stderr.read()
                    if isinstance(stderr_bytes, bytes):
                        stderr_text = stderr_bytes.decode("utf-8", errors="replace")
                    else:
                        stderr_text = str(stderr_bytes)
            except Exception:
                stderr_text = "<failed to read ffmpeg stderr>"

            print(f"ffmpeg stderr (truncated 4000 chars):\n{stderr_text[:4000]}")
            print(f"Total bytes read: {total_bytes}")
            print(f"Frames successfully parsed: {frames_parsed}")
            if frames_parsed == 0:
                raise RuntimeError("No frames parsed from ffmpeg stdout — pipe extraction failed")
    except Exception:
        tb = traceback.format_exc()
        print("stream_frames_ffmpeg failed:\n", tb, file=sys.stderr)
        raise


def compute_signals_from_arrays(arrays: List[np.ndarray]):
    """Compute signals from list of RGB uint8 numpy arrays. Returns list of dicts matching previous format."""
    results = []
    try:
        for arr in arrays:
            r = arr[:, :, 0].ravel()
            g = arr[:, :, 1].ravel()
            b = arr[:, :, 2].ravel()
            r_hist = np.bincount(r, minlength=256).astype(int).tolist()
            g_hist = np.bincount(g, minlength=256).astype(int).tolist()
            b_hist = np.bincount(b, minlength=256).astype(int).tolist()

            arr_f = (arr.astype(np.float32) / 255.0)
            lab = color.rgb2lab(arr_f)
            l_ch = lab[:, :, 0].ravel()
            a_ch = lab[:, :, 1].ravel()
            b_ch_lab = lab[:, :, 2].ravel()
            l_hist, _ = np.histogram(l_ch, bins=256, range=(0.0, 100.0))
            a_hist, _ = np.histogram(a_ch, bins=256, range=(-128.0, 127.0))
            b_hist_lab, _ = np.histogram(b_ch_lab, bins=256, range=(-128.0, 127.0))

            lum = (0.2126 * arr[:, :, 0].astype(np.float32) + 0.7152 * arr[:, :, 1].astype(np.float32) + 0.0722 * arr[:, :, 2].astype(np.float32))
            brightness = float(np.mean(lum))
            contrast = float(np.std(lum))

            hsv = color.rgb2hsv(arr_f)
            s_ch = hsv[:, :, 1].ravel()
            saturation = float(np.mean(s_ch))

            results.append({
                "rgb_hist": [r_hist, g_hist, b_hist],
                "lab_hist": [l_hist.tolist(), a_hist.tolist(), b_hist_lab.tolist()],
                "brightness": brightness,
                "contrast": contrast,
                "saturation": saturation,
            })
        return results
    except Exception:
        tb = traceback.format_exc()
        print("compute_signals_from_arrays failed:\n", tb, file=sys.stderr)
        raise


def compute_histograms_and_signals(image_paths: List[Path]):
    """Compute per-image signals in a vectorized manner for a batch of images.

    Returns list of dicts: each dict contains rgb_hist (3 lists), lab_hist (l,a,b lists), brightness, contrast, saturation
    """
    results = []
    try:
        # Load images into an array (H, W, 3) per image, but do one-by-one for memory reason yet vectorize where possible
        for p in image_paths:
            img = Image.open(p).convert("RGB")
            arr = np.asarray(img, dtype=np.uint8)
            # RGB histograms 256 bins/channel
            r = arr[:, :, 0].ravel()
            g = arr[:, :, 1].ravel()
            b = arr[:, :, 2].ravel()
            r_hist = np.bincount(r, minlength=256).astype(int).tolist()
            g_hist = np.bincount(g, minlength=256).astype(int).tolist()
            b_hist = np.bincount(b, minlength=256).astype(int).tolist()

            # Convert to float in [0,1] for color conversions
            arr_f = (arr.astype(np.float32) / 255.0)
            # LAB conversion via skimage (expects RGB in [0,1])
            lab = color.rgb2lab(arr_f)
            l_ch = lab[:, :, 0].ravel()  # L in ~[0,100]
            a_ch = lab[:, :, 1].ravel()  # ~[-128,127]
            b_ch_lab = lab[:, :, 2].ravel()
            l_hist, _ = np.histogram(l_ch, bins=256, range=(0.0, 100.0))
            a_hist, _ = np.histogram(a_ch, bins=256, range=(-128.0, 127.0))
            b_hist, _ = np.histogram(b_ch_lab, bins=256, range=(-128.0, 127.0))

            # Brightness and contrast via luminance
            # Use Rec.709 luminance: Y = 0.2126 R + 0.7152 G + 0.0722 B (R,G,B in 0-255)
            lum = (0.2126 * arr[:, :, 0].astype(np.float32) + 0.7152 * arr[:, :, 1].astype(np.float32) + 0.0722 * arr[:, :, 2].astype(np.float32))
            brightness = float(np.mean(lum))
            contrast = float(np.std(lum))

            # Saturation via rgb->hsv
            hsv = color.rgb2hsv(arr_f)
            s_ch = hsv[:, :, 1].ravel()
            saturation = float(np.mean(s_ch))

            results.append({
                "rgb_hist": [r_hist, g_hist, b_hist],
                "lab_hist": [l_hist.tolist(), a_hist.tolist(), b_hist.tolist()],
                "brightness": brightness,
                "contrast": contrast,
                "saturation": saturation,
            })
        return results
    except Exception:
        tb = traceback.format_exc()
        print("compute_histograms_and_signals failed:\n", tb, file=sys.stderr)
        raise


def process_video(reference_path: str, out_dir: str, batch_size: int = 200, json_out: str = None):
    """Main extraction flow.

    - Calls ffprobe to get timestamps
    - Calls ffmpeg to dump frames
    - Processes frames in batches and writes newline-delimited JSON file
    - Saves brightness/contrast/saturation plots
    - Prints debug info
    """
    try:
        out_dir = Path(out_dir)
        frames_dir = out_dir / "frames"
        frames_dir.mkdir(parents=True, exist_ok=True)

        print("Extracting timestamps with ffprobe...")
        timestamps = extract_timestamps_ffprobe(reference_path)

        print("Extracting frames via ffmpeg pipe (single-pass streaming)...")
        if not timestamps:
            raise RuntimeError("ffprobe returned no timestamps; cannot perform deterministic extraction")

        width, height = get_video_resolution(reference_path)
        expected_frames = len(timestamps)
        duration = float(timestamps[-1] - timestamps[0]) if len(timestamps) >= 2 else 0.0

        # Compute exact fps from timestamps per strict rule
        if duration <= 0:
            raise RuntimeError("Invalid duration computed from timestamps; cannot compute fps")
        fps_exact = float((expected_frames - 1) / duration)
        print(f"Computed exact fps from timestamps: {fps_exact:.10f}")

        # Try streaming with increasing precision until match or exhausted
        precisions = [6, 8, 10, 12]
        final_fps_used = None
        frames_read = None
        signals_list = None
        retry_attempts = 0

        for prec in precisions:
            retry_attempts += 1
            fps_str = format(fps_exact, f'.{prec}f')
            print(f"Streaming attempt {retry_attempts} with fps={fps_str}")
            # collect signals in-memory (batched computation) but do not write yet
            frames_generator = stream_frames_ffmpeg(reference_path, width, height, fps=fps_str)
            signals_list = []
            brightness_curve = []
            contrast_curve = []
            saturation_curve = []
            batch_arrs = []
            try:
                for arr in frames_generator:
                    batch_arrs.append(arr)
                    if len(batch_arrs) >= batch_size:
                        batch_signals = compute_signals_from_arrays(batch_arrs)
                        signals_list.extend(batch_signals)
                        for s in batch_signals:
                            brightness_curve.append(s['brightness'])
                            contrast_curve.append(s['contrast'])
                            saturation_curve.append(s['saturation'])
                        batch_arrs = []
                if batch_arrs:
                    batch_signals = compute_signals_from_arrays(batch_arrs)
                    signals_list.extend(batch_signals)
                    for s in batch_signals:
                        brightness_curve.append(s['brightness'])
                        contrast_curve.append(s['contrast'])
                        saturation_curve.append(s['saturation'])
            except Exception:
                tb = traceback.format_exc()
                print("Streaming decode failed:\n", tb, file=sys.stderr)
                continue

            frames_read = len(signals_list)
            print(f"Total timestamps: {expected_frames}")
            print(f"Total frames decoded: {frames_read}")
            final_fps_used = fps_str

            if frames_read == expected_frames:
                print("Perfect alignment achieved")
                # write NDJSON and produce outputs
                with json_out_path.open("w", encoding="utf-8") as jf:
                    for idx, sig in enumerate(signals_list):
                        ts = timestamps[idx]
                        obj = {
                            "frame_index": idx,
                            "timestamp": ts,
                            "rgb_hist": sig["rgb_hist"],
                            "lab_hist": sig["lab_hist"],
                            "brightness": sig["brightness"],
                            "contrast": sig["contrast"],
                            "saturation": sig["saturation"],
                        }
                        jf.write(json.dumps(obj) + "\n")
                break
            else:
                print(f"Mismatch at precision {prec}: timestamps={expected_frames} decoded={frames_read}")
                # retry with higher precision
                continue

        if frames_read is None:
            raise RuntimeError("No frames decoded; streaming extraction failed")
        if frames_read != expected_frames:
            # final failure: log debug and abort
            print(f"Final mismatch: timestamps={expected_frames} frames_decoded={frames_read}")
            raise RuntimeError(f"After retries: timestamps count ({expected_frames}) != frames decoded ({frames_read}). Aborting to preserve strict alignment.")

        json_out_path = Path(json_out) if json_out else out_dir / "style_dna_frames.ndjson"
        brightness_curve = []
        contrast_curve = []
        saturation_curve = []
        sample_objs = []

        with json_out_path.open("w", encoding="utf-8") as jf:
            # process in batches
            for i in range(0, total_frames, batch_size):
                batch_files = frame_files[i : i + batch_size]
                batch_signals = compute_histograms_and_signals(batch_files)
                for j, sig in enumerate(batch_signals):
                    frame_idx = i + j
                    ts = timestamps[frame_idx]
                    obj = {
                        "frame_index": frame_idx,
                        "timestamp": ts,
                        "rgb_hist": sig["rgb_hist"],
                        "lab_hist": sig["lab_hist"],
                        "brightness": sig["brightness"],
                        "contrast": sig["contrast"],
                        "saturation": sig["saturation"],
                    }
                    jf.write(json.dumps(obj) + "\n")
                    brightness_curve.append(sig["brightness"])
                    contrast_curve.append(sig["contrast"])
                    saturation_curve.append(sig["saturation"])
                    # Collect first 5 samples for manual inspection
                    if len(sample_objs) < 5:
                        sample_objs.append(obj)

        duration = timestamps[-1] - timestamps[0] if len(timestamps) >= 2 else 0.0
        print(f"Duration (s): {duration:.6f}")
        print(f"First timestamp: {timestamps[0]:.6f}")
        print(f"Last timestamp: {timestamps[-1]:.6f}")

        # Sanity checks
        assert total_frames > 0, "No frames extracted"
        # timestamps strictly increasing
        for k in range(1, len(timestamps)):
            if not (timestamps[k] > timestamps[k - 1]):
                raise AssertionError(f"Timestamps not strictly increasing at index {k}: {timestamps[k-1]} -> {timestamps[k]}")

        # No NaN values in curves
        for v in brightness_curve + contrast_curve + saturation_curve:
            if v is None or (isinstance(v, float) and math.isnan(v)):
                raise AssertionError("Detected NaN or None in computed signals")

        # Save sample JSON and copy corresponding frame images
        samples_path = out_dir / "samples.json"
        with samples_path.open("w", encoding="utf-8") as sf:
            json.dump(sample_objs, sf, indent=2)

        samples_img_dir = out_dir / "sample_frames"
        samples_img_dir.mkdir(parents=True, exist_ok=True)
        for s in sample_objs:
            idx = s["frame_index"] + 1  # frame files are 1-indexed in names
            fname = frames_dir / f"frame_{idx:08d}.png"
            if fname.exists():
                shutil.copy(str(fname), str(samples_img_dir / fname.name))
            else:
                print(f"Warning: sample frame file missing: {fname}", file=sys.stderr)

        # Save sample plots
        def save_curve(curve, name):
            plt.figure(figsize=(12, 3))
            plt.plot(curve, linewidth=0.6)
            plt.title(name)
            plt.xlabel("frame_index")
            plt.tight_layout()
            out_png = out_dir / f"{name.replace(' ', '_').lower()}.png"
            plt.savefig(out_png)
            plt.close()

        save_curve(brightness_curve, "Brightness Curve")
        save_curve(contrast_curve, "Contrast Curve")
        save_curve(saturation_curve, "Saturation Curve")

        print(f"Wrote NDJSON: {json_out_path}")
        print("Saved sample plots: brightness/contrast/saturation")
        # Debug summary
        print("Debug Summary:")
        print(f"  total_frames: {total_frames}")
        print(f"  duration_s: {duration:.6f}")
        print(f"  brightness min/max: {min(brightness_curve):.6f}/{max(brightness_curve):.6f}")
        print(f"  contrast min/max: {min(contrast_curve):.6f}/{max(contrast_curve):.6f}")
        print(f"  saturation min/max: {min(saturation_curve):.6f}/{max(saturation_curve):.6f}")

        return {
            "success": True,
            "frames": total_frames,
            "duration_s": duration,
            "first_timestamp": timestamps[0],
            "last_timestamp": timestamps[-1],
            "ndjson": str(json_out_path),
        }
    except Exception as e:
        tb = traceback.format_exc()
        print("process_video failed:\n", tb, file=sys.stderr)
        return {"success": False, "error": str(e)}


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Extract per-frame style signals from reference video (deterministic)")
    parser.add_argument("video", help="Path to reference video")
    parser.add_argument("out", help="Output directory to store frames, NDJSON, and plots")
    parser.add_argument("--batch", type=int, default=200, help="Batch size for processing frames")
    parser.add_argument("--json", default=None, help="Optional NDJSON output path")
    args = parser.parse_args()

    res = process_video(args.video, args.out, batch_size=args.batch, json_out=args.json)
    if not res.get("success"):
        print("Extraction failed:", res.get("error"), file=sys.stderr)
        sys.exit(2)
    else:
        print("Extraction successful:")
        print(res)
