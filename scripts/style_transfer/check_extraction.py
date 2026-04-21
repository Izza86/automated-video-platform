import subprocess, sys, json, os
from pathlib import Path

def run_cmd(cmd):
    return subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

video = sys.argv[1]
frames_dir = Path(sys.argv[2])

# ffprobe timestamps
cmd = ["ffprobe","-v","error","-select_streams","v","-show_frames","-show_entries","frame=pkt_pts_time","-of","csv=p=0",video]
proc = run_cmd(cmd)
lines = [ln.strip() for ln in proc.stdout.splitlines() if ln.strip()]
print('ffprobe timestamps count:', len(lines))
print('ffprobe first 5:', lines[:5])

# frame files
files = sorted(frames_dir.glob('frame_*.png'))
print('extracted frames count:', len(files))
print('first frame:', files[0] if files else None)
print('last frame:', files[-1] if files else None)

# show file sizes of a few
for f in files[:5]:
    print(f, f.stat().st_size)

# check if any frame file has timestamp embedded via name
print('sample filenames:', [f.name for f in files[:10]])
