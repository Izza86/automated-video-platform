Professional AI Video Style Transfer — Design Notes

Objective

Given a fully edited reference video and a raw target video, extract a pure StyleDNA (no interpretation) and deterministically apply it to the target so the resulting target matches the reference editing style 1:1.

Critical constraints

- No semantic guessing or synthetic edits. If detection fails, retry with adjusted thresholds or resolutions; never fabricate cuts/motion/color.
- All analysis is frame-level: LAB+RGB histograms, brightness, contrast, saturation per-frame stored as temporal signals.
- Color transfer MUST be histogram matching (CDF) or 3D HALD LUT generation; if model fails retry (lower res/batch). No fallback to naive colorbalance.
- Use TransNetV2 + histogram/edge-change for shot/transition detection; RAFT for motion; librosa/madmom for beats.
- Preserve aspect ratio; letterbox or smart crop only when necessary and log decisions.
- Strict debug mode emitting detected vs applied logs.

Pipeline (high level)

1. Extract StyleDNA (pure data): frames → per-frame signals, transitions, motion, beats.
2. Validate detection confidence; if below threshold, reprocess with different parameters.
3. Deterministic transfer: apply the exact curves/transitions/motion to target frames.
4. Render via FFmpeg with frame-accurate filter chains.

Quick start (developer)

- This folder contains the initial pipeline skeleton. Next steps: implement `pipeline.py` functions: `extract_style_dna`, `validate_confidence`, `apply_transfer`, `render_ffmpeg`.
- Recommended runtime: Linux/Colab with GPU. Ensure `ffmpeg`, `python >=3.9`, `torch` (CUDA if GPU), `opencv-python`, `librosa` or `madmom` are available.

Debug & testing

- Save all intermediate outputs (per-frame JSON, motion vectors as numpy arrays, LUTs) to `outputs/` for reproducibility.
- Tests should compare per-frame histograms and motion curves between reference and output; failing criteria must mark run as FAILED and trigger reprocess.

Copilot: Do not remove error handling, fail-safes, and detailed logs in every handler.
