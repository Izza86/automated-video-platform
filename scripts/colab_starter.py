# pyright: reportMissingImports=false
# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  COLAB GPU SERVER — Starter Script                                      ║
# ║  Copy-paste each cell into a Google Colab notebook (Runtime → T4 GPU)   ║
# ╚═══════════════════════════════════════════════════════════════════════════╝
#
# INSTRUCTIONS:
#   1. Open https://colab.research.google.com
#   2. Create a new notebook
#   3. Runtime → Change runtime type → T4 GPU
#   4. Copy each "# ── CELL N ──" block into a separate Colab cell
#   5. Run cells in order
#   6. Copy the ngrok URL printed by Cell 4 into your .env file:
#        COLAB_GPU_URL=https://xxxx-xx-xxx.ngrok-free.app
#   7. Your backend will now route ML analysis through the T4 GPU!


# ══════════════════════════════════════════════════════════════════════════
# ── CELL 1: Verify GPU & Install Dependencies ──────────────────────────
# ══════════════════════════════════════════════════════════════════════════

# Verify T4 GPU is available
import os
import torch
assert torch.cuda.is_available(), "❌ No GPU detected! Go to Runtime → Change runtime type → T4 GPU"
print(f"✅ GPU: {torch.cuda.get_device_name(0)}")
print(f"   VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")
print(f"   PyTorch: {torch.__version__}")
print(f"   CUDA: {torch.version.cuda}")

# Install required packages (torch & torchvision are pre-installed on Colab)
os.system('pip install -q fastapi uvicorn python-multipart '
          'opencv-python-headless numpy scikit-learn scikit-image scipy '
          'scenedetect[opencv] librosa soundfile transformers timm pillow '
          'madmom')

# pyngrok — needed for the public tunnel
os.system('pip install -q pyngrok')

# TransNetV2 — install from GitHub (not available on PyPI)
# This is the 3D DDCNN shot boundary detector; PySceneDetect is the fallback.
print('\n⤷ Installing TransNetV2 from GitHub (may take ~30s)...')
ret = os.system('pip install git+https://github.com/soCzech/TransNetV2.git')
if ret != 0:
    print('⚠️  TransNetV2 install returned non-zero exit code — it may not be available. PySceneDetect will be used instead.')

print("\n✅ All packages installed!")


# ══════════════════════════════════════════════════════════════════════════
# ── CELL 2: Set Your Ngrok Auth Token ──────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════

# ╔═══════════════════════════════════════════╗
# ║  PASTE YOUR NGROK AUTHTOKEN BELOW        ║
# ╚═══════════════════════════════════════════╝
NGROK_AUTH_TOKEN = "YOUR_NGROK_AUTHTOKEN"  # ← Replace this!

assert NGROK_AUTH_TOKEN != "YOUR_NGROK_AUTHTOKEN", "❌ Paste your real ngrok auth token above!"

import os
os.environ["NGROK_AUTH_TOKEN"] = NGROK_AUTH_TOKEN
print(f"✅ Ngrok token set ({NGROK_AUTH_TOKEN[:8]}...)")


# ══════════════════════════════════════════════════════════════════════════
# ── CELL 3: Upload colab_app.py ────────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════

# Option A: Upload from your machine
# (Uncomment and run this, then use the upload dialog)
# from google.colab import files
# uploaded = files.upload()  # Select colab_app.py from your machine

# Option B: Write the server code inline (paste colab_app.py contents)
# If you uploaded the file in Option A, skip this cell.

# Verify the file exists
import os
if os.path.exists("colab_app.py"):
    size = os.path.getsize("colab_app.py")
    print(f"✅ colab_app.py found ({size:,} bytes)")
else:
    print("❌ colab_app.py not found!")
    print("   Upload it using the file browser (📁 icon on the left)")
    print("   or use: from google.colab import files; files.upload()")


# ══════════════════════════════════════════════════════════════════════════
# ── CELL 4: Patch Ngrok Token & Start Server ──────────────────────────
# ══════════════════════════════════════════════════════════════════════════

import os

# Patch the ngrok token into colab_app.py
token = os.environ.get("NGROK_AUTH_TOKEN", "")
if token and os.path.exists("colab_app.py"):
    with open("colab_app.py", "r") as f:
        content = f.read()
    content = content.replace(
        'NGROK_AUTH_TOKEN = "YOUR_NGROK_AUTHTOKEN"',
        f'NGROK_AUTH_TOKEN = "{token}"',
    )
    with open("colab_app.py", "w") as f:
        f.write(content)
    print("✅ Ngrok token injected into colab_app.py")

# Pre-download models before starting the server
# (this avoids download timeouts during the first request)
print("\n📥 Pre-downloading ML models (this takes 1-3 minutes)...")

import torch
print("  → RAFT-Large...", end=" ", flush=True)
from torchvision.models.optical_flow import raft_large, Raft_Large_Weights
_ = raft_large(weights=Raft_Large_Weights.DEFAULT)
print("✅")

print("  → Depth-Anything V2 Base...", end=" ", flush=True)
try:
    from transformers import AutoImageProcessor, AutoModelForDepthEstimation
    _ = AutoImageProcessor.from_pretrained("depth-anything/Depth-Anything-V2-Base-hf")
    _ = AutoModelForDepthEstimation.from_pretrained("depth-anything/Depth-Anything-V2-Base-hf")
    print("✅")
except Exception as e:
    print(f"⚠️  {e} (will try MiDaS fallback)")

print("  → CLIP (openai/clip-vit-large-patch14)...", end=" ", flush=True)
try:
    from transformers import CLIPModel, AutoImageProcessor
    clip_name = "openai/clip-vit-large-patch14"
    _ = AutoImageProcessor.from_pretrained(clip_name)
    _ = CLIPModel.from_pretrained(clip_name).eval()
    print("✅")
except Exception as e:
    print(f"⚠️  CLIP preload failed: {e} — will try to initialize on first request")

print("  → TransNetV2...", end=" ", flush=True)
try:
    from transnetv2 import TransNetV2
    _ = TransNetV2()
    print("✅")
except ImportError:
    print("⚠️  Not installed — attempting to install TransNetV2 now...")
    # Try installing once more in-case Cell 1's install failed silently
    try:
        ir = os.system('pip install git+https://github.com/soCzech/TransNetV2.git')
        if ir == 0:
            from transnetv2 import TransNetV2
            _ = TransNetV2()
            print("✅ (installed on retry)")
        else:
            print("⚠️  Install retry failed — PySceneDetect will be used instead")
    except Exception as e:
        print(f"⚠️  Retry failed: {e} — PySceneDetect will be used instead")
except Exception as e:
    print(f"⚠️  {e}")

print("  → madmom RNN beat tracker...", end=" ", flush=True)
try:
    import madmom
    # Force-load the RNN weights so first request doesn't stall
    _ = madmom.features.beats.RNNBeatProcessor()
    print("✅")
except ImportError:
    print("⚠️  Not installed — librosa will be used instead")
except Exception as e:
    print(f"⚠️  {e}")

# NOTE: VGG-19 is no longer needed — colour analysis uses the
# lightweight Reinhard LAB method (OpenCV only, no weights download).
print("  → Reinhard LAB Color... ✅ (no download needed — uses OpenCV)")

print("\n🚀 Starting server...")

# Run the server (this blocks — the cell will keep running)
os.system('python colab_app.py')


# ══════════════════════════════════════════════════════════════════════════
# ── CELL 5 (Optional): Test the Server ─────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════

# Run this in a SEPARATE notebook tab (since Cell 4 blocks)
# Or open a new Colab notebook just for testing.

# Replace with YOUR ngrok URL from Cell 4 output:
# COLAB_URL = "https://xxxx-xx-xxx.ngrok-free.app"
#
# import requests
#
# # Health check
# r = requests.get(f"{COLAB_URL}/health")
# print(r.json())
#
# # Test with a video
# with open("test_video.mp4", "rb") as f:
#     r = requests.post(f"{COLAB_URL}/analyze/shots", files={"file": f})
# print(r.json())
