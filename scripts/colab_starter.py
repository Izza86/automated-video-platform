# pyright: reportMissingImports=false
# =============================================================================
#  COLAB GPU SERVER — Drive-Ready Starter Script
#  V2: Permanent Storage + Keep-Alive + GPU Optimization
# =============================================================================
#
# INSTRUCTIONS (Drive Workflow):
#   1. Upload 'colab_app.py' and any custom model scripts (e.g. transnetv2.py) 
#      to your Google Drive folder (e.g. MyDrive/AI_Editor).
#   2. In colab_app.py, ensure your NGROK_AUTH_TOKEN is pasted at line 1834.
#   3. Run the cells below in a T4 GPU notebook.
#   4. Use the printed Ngrok URL in your .env file:
#        COLAB_GPU_URL=https://xxxx-xx-xxx.ngrok-free.app
# ══════════════════════════════════════════════════════════════════════════


# ══════════════════════════════════════════════════════════════════════════
# ── CELL 1: Session Keep-Alive (Prevents Disconnect) ─────────────────────
# ══════════════════════════════════════════════════════════════════════════

# Run this cell to keep the session alive. 
# It uses JS to click the 'Connect' button every 60 seconds.
import IPython
js_code = '''
function ConnectButton(){
    console.log("Connect button clicker starting..."); 
    setInterval(function(){
        document.querySelector("#top-toolbar > colab-connect-button").shadowRoot.querySelector("#connect").click(); 
        console.log("Keep-Alive: Clicked Connect Button"); 
    }, 60000);
}
ConnectButton();
'''
display(IPython.display.Javascript(js_code))
print("✅ Keep-Alive script is active. Session will stay alive for 12-24 hours.")



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
print("[INSTALL] Installing TransNetV2 from GitHub...") 
ret = os.system('pip install git+https://github.com/soCzech/TransNetV2.git')
if ret != 0:
    print("[OK] TransNetV2 already available.") 

print("\n[OK] All packages installed!")
# Madmom ki dependencies aur library install karein
!pip install cython
!pip install git+https://github.com/CPJKU/madmom.git
print("[OK] Madmom installed successfully!")

# =========================================================
# ---------------------------------------------------------
# CELL 2: Set Your Ngrok Auth Token
# ---------------------------------------------------------
# =========================================================

# ===============================================
# ===============================================
#  PASTE YOUR NGROK AUTHTOKEN BELOW        
# ===============================================
NGROK_AUTH_TOKEN = "3CqChBxZCQsm7korJ1szVhF6rtV_5BHfKdTo3odKB5bsKYiA4"  # ← Replace this!

assert NGROK_AUTH_TOKEN != "YOUR_NGROK_AUTHTOKEN", "[ERROR] Paste your real ngrok auth token above!"

import os
os.environ["NGROK_AUTH_TOKEN"] = NGROK_AUTH_TOKEN
print(f"[OK] Ngrok token set ({NGROK_AUTH_TOKEN[:8]}...)")

# =========================================================
# ---------------------------------------------------------
# CELL 3: Upload colab_app.py
# ---------------------------------------------------------
# =========================================================

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
    print(f"[OK] colab_app.py found ({size:,} bytes)")
else:
    print("[ERROR] colab_app.py not found!")
    print("   Upload it using the file browser (icon on the left)")
    print("   or use: from google.colab import files; files.upload()")
# =========================================================
# ---------------------------------------------------------
# CELL 4: Patch Ngrok Token & Start Server
# ---------------------------------------------------------
# =========================================================

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
    print("[OK] Ngrok token injected into colab_app.py")

# Pre-download models before starting the server
# (this avoids download timeouts during the first request)
print("\n[DOWNLOAD] Pre-downloading ML models (this takes 1-3 minutes)...")

import torch
print("  → RAFT-Large...", end=" ", flush=True)
from torchvision.models.optical_flow import raft_large, Raft_Large_Weights
_ = raft_large(weights=Raft_Large_Weights.DEFAULT)
print("[OK]")

print("  → Depth-Anything V2 Base...", end=" ", flush=True)
try:
    from transformers import AutoImageProcessor, AutoModelForDepthEstimation
    _ = AutoImageProcessor.from_pretrained("depth-anything/Depth-Anything-V2-Base-hf")
    _ = AutoModelForDepthEstimation.from_pretrained("depth-anything/Depth-Anything-V2-Base-hf")
    print("[OK]")
except Exception as e:
    print(f"[WARNING]  {e} (will try MiDaS fallback)")

print("  → CLIP (openai/clip-vit-large-patch14)...", end=" ", flush=True)
try:
    from transformers import CLIPModel, AutoImageProcessor
    clip_name = "openai/clip-vit-large-patch14"
    _ = AutoImageProcessor.from_pretrained(clip_name)
    _ = CLIPModel.from_pretrained(clip_name).eval()
    print("[OK]")
except Exception as e:
    print(f"[WARNING]  CLIP preload failed: {e} — will try to initialize on first request")

print("  → TransNetV2...", end=" ", flush=True)
try:
    from transnetv2 import TransNetV2
    _ = TransNetV2()
    print("[OK]")
except ImportError:
    print("[WARNING]  Not installed — attempting to install TransNetV2 now...")
    # Try installing once more in-case Cell 1's install failed silently
    try:
        ir = os.system('pip install git+https://github.com/soCzech/TransNetV2.git')
        if ir == 0:
            from transnetv2 import TransNetV2
            _ = TransNetV2()
            print("[OK] Environment ready!")
        else:
            print("[WARNING]  Install retry failed — PySceneDetect will be used instead")
    except Exception as e:
        print(f"[WARNING]  Retry failed: {e} — PySceneDetect will be used instead")
except Exception as e:
    print(f"[WARNING]  {e}")

print("  → madmom RNN beat tracker...", end=" ", flush=True)
try:
    import madmom
    # Force-load the RNN weights so first request doesn't stall
    _ = madmom.features.beats.RNNBeatProcessor()
    print("[OK]")
except ImportError:
    print("[WARN] Not installed — librosa will be used instead")
except Exception as e:
    print(f"[WARN] {e}")

# NOTE: VGG-19 is no longer needed — colour analysis uses the
# lightweight Reinhard LAB method (OpenCV only, no weights download).
print("  → Reinhard LAB Color... [OK] (no download needed — uses OpenCV)")

print("\n[START] Starting server...")

# Run the server (this blocks — the cell will keep running)
!python colab_app.py --log-level debug --host 0.0.0.0 --port 8000
