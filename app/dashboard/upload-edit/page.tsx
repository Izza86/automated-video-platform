"use client";

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Download,
  Eye,
  FileVideo,
  Loader2,
  Play,
  RotateCcw,
  Sparkles,
  Upload,
  Video,
  Zap,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAnalysisDashboard } from "@/lib/hooks/use-analysis-dashboard";
import { cn } from "@/lib/utils";

// Lazy-load analysis components (they pull in recharts which is heavy)
const AnalysisDashboard = dynamic(
  () =>
    import("@/components/analysis/analysis-dashboard").then(
      (m) => m.AnalysisDashboard
    ),
  {
    ssr: false,
    loading: () => <div className="h-64 animate-pulse rounded-xl bg-white/5" />,
  }
);
const AnalysisProgressBar = dynamic(
  () =>
    import("@/components/analysis/analysis-dashboard").then(
      (m) => m.AnalysisProgressBar
    ),
  { ssr: false }
);

/**
 * Normalize a video URL to ensure it works in the browser:
 * - Rewrites /outputs/filename.mp4 → /api/video/filename.mp4
 *   (Next.js production mode only serves public/ files that existed at
 *    build time; dynamically generated videos need the API route)
 * - Appends a cache-busting query parameter to force the browser to fetch
 *   the latest version (avoids stale black-screen from cached response)
 */
function cacheBustVideoUrl(url: string): string {
  if (!url) return url;
  // blob: and data: URLs don't need normalization
  if (url.startsWith("blob:") || url.startsWith("data:")) return url;

  let normalized = url;

  // Strip everything before /outputs/ (handles accidental absolute paths)
  const idx = normalized.indexOf("/outputs/");
  if (idx >= 0) {
    normalized = normalized.slice(idx);
  }

  // Rewrite /outputs/filename.mp4 → /api/video/filename.mp4
  if (normalized.startsWith("/outputs/")) {
    const filename = normalized.replace("/outputs/", "");
    normalized = `/api/video/${filename}`;
  }

  // If it already uses /api/video/, keep it
  if (!normalized.startsWith("/api/video/")) {
    return url;
  }

  // Append cache-busting timestamp
  const separator = normalized.includes("?") ? "&" : "?";
  return `${normalized}${separator}t=${Date.now()}`;
}

export default function UploadEditPage() {
  const [referenceVideo, setReferenceVideo] = useState<File | null>(null);
  const [targetVideo, setTargetVideo] = useState<File | null>(null);
  const [referencePreviewUrl, setReferencePreviewUrl] = useState<string>("");
  const [targetPreviewUrl, setTargetPreviewUrl] = useState<string>("");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [processedVideoUrl, setProcessedVideoUrl] = useState<string>("");
  const [currentStep, setCurrentStep] = useState<string>("");

  // New analysis hook — replaces the old extractedMetadata state
  const analysis = useAnalysisDashboard();

  // Derived convenience booleans
  const analyzingRef =
    analysis.progress.stage !== "idle" &&
    analysis.progress.stage !== "complete" &&
    analysis.progress.stage !== "error";

  // Remove FFmpeg loading - we'll use backend instead
  useEffect(() => {
    // Nothing to load on client
  }, []);

  // Create preview URLs when videos are uploaded
  useEffect(() => {
    if (referenceVideo) {
      const url = URL.createObjectURL(referenceVideo);
      setReferencePreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setReferencePreviewUrl("");
  }, [referenceVideo]);

  useEffect(() => {
    if (targetVideo) {
      const url = URL.createObjectURL(targetVideo);
      setTargetPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setTargetPreviewUrl("");
  }, [targetVideo]);

  const handleReferenceUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setReferenceVideo(file);
      toast.info("Reference video uploaded — will analyze when you process.");
    }
  };

  const handleTargetUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setTargetVideo(e.target.files[0]);
    }
  };

  const handleProcess = async () => {
    if (!(referenceVideo && targetVideo)) {
      toast.error("Please upload both videos first");
      return;
    }

    setProcessing(true);
    setProgress(0);
    setCompleted(false);
    let didComplete = false;

    try {
      // ── Stage 1: Analyze & Transfer via unified endpoint ──────────
      setCurrentStep(
        "Running full pipeline: analysis → blueprint → instructions → render…"
      );
      setProgress(10);

      let result: Awaited<ReturnType<typeof analysis.analyze>>["data"] = null;
      let pipelineError: string | null = null;

      try {
        const response = await analysis.analyze(referenceVideo, targetVideo, {
          strategy: "proportional",
          preserveBeats: true,
          includeStyle: true,
          outputMode: "both",
        });
        result = response.data;
        pipelineError = response.error;
      } catch (analyzeErr) {
        // Catch unexpected throws from the hook itself so the UI never crashes
        console.error("analysis.analyze threw:", analyzeErr);
        const errMsg =
          analyzeErr instanceof Error
            ? analyzeErr.message
            : "Unexpected analysis error";
        toast.error(errMsg);
        setProcessing(false);
        setProgress(0);
        return;
      }

      // Total failure — no data at all
      if (!result) {
        throw new Error(
          pipelineError || "Pipeline failed — check server logs for details."
        );
      }

      setProgress(70);
      setCurrentStep("Processing results…");

      // ── Stage 2: Handle rendered output ───────────────────────────
      // Prefer videoUrl (served from /outputs/) over base64 blob
      if (result.output?.videoUrl) {
        // Direct URL — browser fetches the mp4 from public/outputs/
        // Apply cache-busting so the browser never shows a stale/black frame
        const freshUrl = cacheBustVideoUrl(result.output.videoUrl);
        setProcessedVideoUrl(freshUrl);
        await saveToProjects(
          result.output.videoUrl,
          referenceVideo,
          targetVideo,
          result
        );
      } else if (result.output?.videoBase64) {
        try {
          // Fallback: convert base64 → blob URL for <video> preview
          const b64 = result.output.videoBase64.startsWith("data:")
            ? result.output.videoBase64
            : `data:video/mp4;base64,${result.output.videoBase64}`;
          const resp = await fetch(b64);
          const blob = await resp.blob();
          const url = URL.createObjectURL(blob);
          setProcessedVideoUrl(url);
          await saveToProjects(url, referenceVideo, targetVideo, result);
        } catch (videoErr) {
          console.warn("Video preview failed:", videoErr);
          toast.warning("Analysis complete, but video preview failed to load.");
          await saveToProjects("", referenceVideo, targetVideo, result);
        }
      } else if (pipelineError) {
        // Render failed but analysis data is populated in dashboard cards
        toast.warning("Analysis complete, but video preview failed to render.");
        await saveToProjects("", referenceVideo, targetVideo, result);
      } else {
        toast.success("Analysis complete! Dashboard cards populated below.");
        await saveToProjects("", referenceVideo, targetVideo, result);
      }

      setProgress(100);
      setCompleted(true);
      didComplete = true;
      setCurrentStep("Complete!");

      // Only show success toast if render actually produced a video
      if (
        processedVideoUrl ||
        result.output?.videoUrl ||
        result.output?.videoBase64
      ) {
        toast.success("Video processed and saved!", {
          action: {
            label: "View Projects",
            onClick: () => (window.location.href = "/dashboard/my-projects"),
          },
        });
      }
    } catch (error) {
      console.error("Processing error:", error);

      let errorMessage: string;
      if (error instanceof DOMException && error.name === "AbortError") {
        errorMessage =
          "Video processing timed out. Try a shorter or lower-resolution video.";
      } else if (
        error instanceof TypeError &&
        /fetch|network/i.test(error.message)
      ) {
        errorMessage =
          "Network connection lost during processing. Please check your connection and retry.";
      } else {
        errorMessage = error instanceof Error ? error.message : "Unknown error";
      }

      toast.error(`Failed to process video: ${errorMessage}`);
      setCurrentStep("");
    } finally {
      // Always reset processing state so the UI never gets stuck.
      // Use the local `didComplete` flag (not the React state closure,
      // which would be stale here).
      if (!didComplete) {
        setProcessing(false);
        setProgress(0);
      }
    }
  };

  const handleDownload = () => {
    if (!processedVideoUrl) return;

    const a = document.createElement("a");
    a.href = processedVideoUrl;
    a.download = `edited-video-${Date.now()}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    toast.success("Video downloaded successfully!");
  };

  const handleRetryRender = async () => {
    if (!(referenceVideo && targetVideo)) {
      toast.error("Original videos no longer available. Please upload again.");
      return;
    }

    setProcessing(true);
    setCompleted(false);
    setProgress(50);
    setCurrentStep("Re-trying render with analysis data…");

    try {
      const { data: result, error: pipelineError } = await analysis.analyze(
        referenceVideo,
        targetVideo,
        {
          strategy: "proportional",
          preserveBeats: true,
          includeStyle: true,
          outputMode: "both",
        }
      );

      if (!result) {
        throw new Error(pipelineError || "Retry failed");
      }

      if (result.output?.videoUrl) {
        const freshUrl = cacheBustVideoUrl(result.output.videoUrl);
        setProcessedVideoUrl(freshUrl);
        toast.success("Video rendered successfully!");
        await saveToProjects(
          result.output.videoUrl,
          referenceVideo,
          targetVideo,
          result
        );
      } else if (result.output?.videoBase64) {
        const b64 = result.output.videoBase64.startsWith("data:")
          ? result.output.videoBase64
          : `data:video/mp4;base64,${result.output.videoBase64}`;
        const resp = await fetch(b64);
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        setProcessedVideoUrl(url);
        toast.success("Video rendered successfully!");

        await saveToProjects(url, referenceVideo, targetVideo, result);
      } else {
        toast.warning("Render retry did not produce a video.");
      }

      setProgress(100);
      setCompleted(true);
      setCurrentStep("Complete!");
    } catch (error) {
      console.error("Retry render error:", error);
      toast.error(
        "Retry failed: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
      setCompleted(true);
      setProgress(100);
    } finally {
      setProcessing(false);
    }
  };

  const saveToProjects = async (
    videoUrl: string,
    refVideo: File,
    targVideo: File,
    pipelineResult: import("@/lib/types/analysis").AnalyzeAndTransferResponse
  ) => {
    try {
      console.log("Starting to save project...");
      toast.info("Saving project to database...");

      const summary = pipelineResult.blueprint?.summary;
      const instrSummary = pipelineResult.instructions?.summary;

      // ── Send as FormData to /api/save-project ──────────────────────
      const form = new FormData();

      // If we have a /outputs/ URL (file is on disk in public/), pass
      // the URL string directly so the DB stores a lightweight path
      // instead of a huge base64 blob.  Only fall back to blob upload
      // for blob: URLs or data: URLs that can't be served by static file.
      const isStaticUrl = videoUrl && videoUrl.startsWith("/outputs/");

      if (isStaticUrl) {
        // File is already in public/outputs — just store the URL path
        // Send a zero-byte video placeholder (API will see size=0 and save URL from metadata)
        const placeholder = new Blob([new Uint8Array(0)], {
          type: "video/mp4",
        });
        form.append("video", placeholder, "placeholder.mp4");
        form.append("videoUrlOverride", videoUrl);
      } else if (videoUrl) {
        const blobResp = await fetch(videoUrl);
        const blob = await blobResp.blob();
        console.log("Video blob size:", blob.size, "bytes");

        if (blob.size > 30 * 1024 * 1024) {
          toast.warning("Video is large, this may take a moment to save...");
        }
        form.append("video", blob, `edited-${Date.now()}.mp4`);
      } else {
        // No rendered video — send a minimal placeholder blob
        const placeholder = new Blob([new Uint8Array(0)], {
          type: "video/mp4",
        });
        form.append("video", placeholder, `analysis-only-${Date.now()}.mp4`);
      }

      form.append("name", `${targVideo.name.split(".")[0]} - Edited`);
      form.append("type", "reference-target");
      form.append(
        "metadata",
        JSON.stringify({
          referenceVideoName: refVideo.name,
          targetVideoName: targVideo.name,
          renderSucceeded: !!videoUrl,
          effects: [
            "Pipeline: analysis → blueprint → instructions → render",
            summary
              ? `Duration: ${summary.totalDuration.toFixed(1)}s | ${summary.totalCuts} cuts | ${summary.totalSpeedRamps} speed ramps`
              : null,
            summary
              ? `BPM: ${summary.bpm} (${(summary.bpmConfidence * 100).toFixed(0)}% confidence) | Pace: ${summary.dominantPace}`
              : null,
            summary
              ? `Color: ${summary.dominantColorMood} / ${summary.dominantColorProfile} | Motion: ${summary.dominantMotionStyle}`
              : null,
            instrSummary
              ? `Strategy: ${instrSummary.strategy} | ${instrSummary.totalCuts} cuts, ${instrSummary.totalSpeedSegments} speed segs, ${instrSummary.totalTransitions} transitions`
              : null,
            instrSummary
              ? `Beat-snapped cuts: ${instrSummary.beatSnappedCuts}/${instrSummary.totalCuts}`
              : null,
            pipelineResult.timing
              ? `Total processing: ${(pipelineResult.timing.totalMs / 1000).toFixed(1)}s`
              : null,
            videoUrl ? null : "⚠ Video render failed — analysis data only",
          ].filter(Boolean),
          dashboardCards: pipelineResult.dashboard?.cards,
        })
      );

      const result = await fetch("/api/save-project", {
        method: "POST",
        credentials: "include",
        body: form,
      });

      // ── Parse response ────────────────────────────────────────────
      let json: {
        success?: boolean;
        dbOffline?: boolean;
        error?: string;
        videoUrl?: string;
        message?: string;
      } = {};

      try {
        json = await result.json();
      } catch {
        // If JSON parsing fails, treat as offline but non-fatal
        json = { success: false, dbOffline: true };
      }

      // ── The API now always returns 200.  Check the payload. ────────
      if (json.dbOffline) {
        // DB is unreachable but the video file is on disk
        console.warn("[save] DB offline — video still available locally");
        if (videoUrl) {
          toast.warning(
            "Video rendered successfully! Database is offline, but you can " +
              "still download the video below.",
            { duration: 8000 }
          );
        } else {
          toast.warning(
            "Analysis complete. Database is offline — results saved locally only.",
            { duration: 6000 }
          );
        }
      } else if (json.success) {
        // Detached save kicked off — video is immediate, DB save is background
        console.log("Project save initiated in background:", json.message);
        toast.success("Video ready! Project saving to database…");
      } else {
        // Unexpected shape — still non-fatal, video exists on disk
        console.warn("[save] Unexpected response:", json);
        toast.warning(
          "Video available for download. Database save may have failed."
        );
      }
    } catch (error) {
      // ── Network-level fetch failure — still non-fatal ──────────────
      console.error("Error saving project:", error);
      if (videoUrl) {
        toast.warning(
          "Video rendered but could not reach the server to save. " +
            "You can still download the output file below.",
          { duration: 8000 }
        );
      } else {
        toast.error(
          "Failed to save: " +
            (error instanceof Error ? error.message : "Unknown error")
        );
      }
    }
  };

  const handleReset = () => {
    setReferenceVideo(null);
    setTargetVideo(null);
    setProcessing(false);
    setProgress(0);
    setCompleted(false);
    setProcessedVideoUrl("");
    setCurrentStep("");
    analysis.reset();

    // Revoke object URLs
    if (processedVideoUrl) {
      URL.revokeObjectURL(processedVideoUrl);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1408] text-white">
      <div className="pt-16">
        <div className="mx-auto max-w-6xl space-y-6 p-6">
          {/* Header */}
          <div>
            <Link
              className="mb-4 inline-flex items-center gap-2 text-purple-400 transition-colors hover:text-purple-300"
              href="/dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
            <h1 className="flex items-center gap-3 font-bold text-4xl">
              <Sparkles className="h-10 w-10 animate-pulse text-purple-400" />
              Upload & Edit Videos
            </h1>
            <p className="mt-2 text-gray-400">
              Apply editing style from reference video to your target video
            </p>
          </div>

          {/* Instructions */}
          <div className="rounded-xl border border-blue-500/30 bg-gradient-to-r from-blue-900/20 to-blue-800/10 p-6">
            <h2 className="mb-3 flex items-center gap-2 font-bold text-xl">
              <AlertCircle className="h-5 w-5 text-blue-400" />
              How it works
            </h2>
            <ol className="space-y-2 text-gray-300">
              <li className="flex items-start gap-2">
                <span className="font-bold text-purple-400">1.</span>
                <span>
                  Upload a <strong>reference video</strong> - We'll analyze its
                  color grading, transitions, audio, pacing, and effects
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-purple-400">2.</span>
                <span>
                  Upload your <strong>target video</strong> that you want to
                  edit with the same style
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-purple-400">3.</span>
                <span>
                  Our system applies:{" "}
                  <strong>
                    HALD CLUT deep color matching, frame interpolation (60fps),
                    velocity alignment, grain, vignette, transitions
                  </strong>{" "}
                  to the ENTIRE target video
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-purple-400">4.</span>
                <span>
                  Reference audio is <strong>looped automatically</strong> if
                  target video is longer, ensuring complete coverage
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-purple-400">5.</span>
                <span>
                  Preview and download your newly edited video with professional
                  style applied throughout!
                </span>
              </li>
            </ol>
          </div>

          {/* ═══════════════════════════════════════════════════════════
              ANALYSIS PROGRESS + DYNAMIC DASHBOARD CARDS
             ═══════════════════════════════════════════════════════════ */}
          {analyzingRef && (
            <AnalysisProgressBar
              message={analysis.progress.message}
              percent={analysis.progress.percent}
              stage={analysis.progress.stage}
            />
          )}

          {analysis.dashboard && (
            <AnalysisDashboard
              blueprintSummary={analysis.blueprint?.summary ?? null}
              dashboard={analysis.dashboard}
              timing={analysis.timing ?? null}
            />
          )}

          {/* Upload Section */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Reference Video */}
            <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] p-6">
              <div className="mb-4 flex items-center gap-2">
                <Video className="h-6 w-6 text-purple-400" />
                <h2 className="font-bold text-xl">Reference Video</h2>
                {analyzingRef && (
                  <div className="flex items-center gap-2 text-sm text-yellow-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Analyzing...</span>
                  </div>
                )}
              </div>
              <p className="mb-4 text-gray-400 text-sm">
                Upload the video with editing style you want to copy
              </p>

              <label
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all",
                  referenceVideo
                    ? "border-green-500/50 bg-green-500/10"
                    : "border-purple-500/30 bg-purple-500/5 hover:border-purple-500/60 hover:bg-purple-500/10"
                )}
              >
                <input
                  accept="video/*"
                  className="hidden"
                  disabled={processing || completed}
                  onChange={handleReferenceUpload}
                  type="file"
                />
                {referenceVideo ? (
                  <>
                    <CheckCircle className="mb-3 h-12 w-12 text-green-400" />
                    <p className="mb-1 font-medium text-white">
                      {referenceVideo.name}
                    </p>
                    <p className="text-gray-400 text-xs">
                      {(referenceVideo.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="mb-3 h-12 w-12 text-purple-400" />
                    <p className="mb-1 font-medium text-white">
                      Click to upload
                    </p>
                    <p className="text-gray-400 text-xs">
                      MP4, MOV, AVI (Max 500MB)
                    </p>
                  </>
                )}
              </label>
            </div>

            {/* Target Video */}
            <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] p-6">
              <div className="mb-4 flex items-center gap-2">
                <FileVideo className="h-6 w-6 text-cyan-400" />
                <h2 className="font-bold text-xl">Target Video</h2>
              </div>
              <p className="mb-4 text-gray-400 text-sm">
                Upload the video you want to edit
              </p>

              <label
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all",
                  targetVideo
                    ? "border-green-500/50 bg-green-500/10"
                    : "border-cyan-500/30 bg-cyan-500/5 hover:border-cyan-500/60 hover:bg-cyan-500/10"
                )}
              >
                <input
                  accept="video/*"
                  className="hidden"
                  disabled={processing || completed}
                  onChange={handleTargetUpload}
                  type="file"
                />
                {targetVideo ? (
                  <>
                    <CheckCircle className="mb-3 h-12 w-12 text-green-400" />
                    <p className="mb-1 font-medium text-white">
                      {targetVideo.name}
                    </p>
                    <p className="text-gray-400 text-xs">
                      {(targetVideo.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="mb-3 h-12 w-12 text-cyan-400" />
                    <p className="mb-1 font-medium text-white">
                      Click to upload
                    </p>
                    <p className="text-gray-400 text-xs">
                      MP4, MOV, AVI (Max 500MB)
                    </p>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Processing Section */}
          {(processing || completed) && (
            <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] p-6">
              <h2 className="mb-4 flex items-center gap-2 font-bold text-xl">
                {completed ? (
                  <>
                    <CheckCircle className="h-6 w-6 text-green-400" />
                    Processing Complete!
                  </>
                ) : (
                  <>
                    <Sparkles className="h-6 w-6 animate-spin text-purple-400" />
                    Processing Videos...
                  </>
                )}
              </h2>

              {/* Current Step */}
              {currentStep && !completed && (
                <p className="mb-3 flex items-center gap-2 text-purple-300 text-sm">
                  <Zap className="h-4 w-4" />
                  {currentStep}
                </p>
              )}

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-gray-400 text-sm">
                    {completed
                      ? "Ready to preview and download"
                      : "Applying editing style"}
                  </span>
                  <span className="font-bold text-purple-400 text-sm">
                    {progress}%
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-gray-800">
                  <div
                    className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Video Preview — only when render succeeded */}
              {completed && processedVideoUrl && (
                <div className="mb-4 overflow-hidden rounded-lg border border-green-500/30 bg-black/40">
                  <div className="flex items-center gap-2 border-green-500/30 border-b bg-green-900/20 p-3">
                    <Eye className="h-5 w-5 text-green-400" />
                    <h3 className="font-semibold text-green-300">
                      Processed Video Preview
                    </h3>
                  </div>
                  <div className="flex aspect-video items-center justify-center bg-black">
                    <video
                      autoPlay
                      className="h-full w-full"
                      controls
                      loop
                      src={processedVideoUrl}
                    />
                  </div>
                </div>
              )}

              {/* Render-failed notice + retry */}
              {completed && !processedVideoUrl && (
                <div className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-900/20 p-4">
                  <p className="mb-3 flex items-center gap-2 text-sm text-yellow-400">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    Analysis complete, but video preview failed to render.
                    Dashboard cards are populated above.
                  </p>
                  <Button
                    className="bg-gradient-to-r from-yellow-600 to-orange-600 text-sm text-white hover:from-yellow-700 hover:to-orange-700"
                    disabled={processing}
                    onClick={handleRetryRender}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    {processing ? "Retrying…" : "Re-try Render"}
                  </Button>
                </div>
              )}

              {/* FORCE SHOW BUTTONS — always visible when progress hits 100% */}
              {completed && (
                <div className="flex gap-3">
                  {processedVideoUrl && (
                    <Button
                      className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
                      onClick={handleDownload}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Edited Video
                    </Button>
                  )}
                  <Button
                    className={cn(
                      "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700",
                      !processedVideoUrl && "flex-1"
                    )}
                    onClick={handleReset}
                  >
                    Edit Another Video
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          {!(processing || completed) && (
            <div className="flex justify-center">
              <Button
                className="bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-3 font-bold text-lg text-white hover:from-purple-700 hover:to-pink-700 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!(referenceVideo && targetVideo) || analyzingRef}
                onClick={handleProcess}
              >
                <Play className="mr-2 h-5 w-5" />
                {analyzingRef
                  ? "Analyzing Reference..."
                  : "Apply Editing Style"}
              </Button>
            </div>
          )}

          {/* Preview Section (Optional) */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] p-6">
              <h3 className="mb-3 flex items-center gap-2 font-bold">
                <Play className="h-5 w-5 text-purple-400" />
                Reference Preview
              </h3>
              <div className="flex aspect-video items-center justify-center rounded-lg bg-black/40">
                {referencePreviewUrl ? (
                  <video
                    className="h-full w-full rounded-lg"
                    controls
                    src={referencePreviewUrl}
                  />
                ) : (
                  <p className="text-gray-500">No video uploaded</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] p-6">
              <h3 className="mb-3 flex items-center gap-2 font-bold">
                <Play className="h-5 w-5 text-cyan-400" />
                Target Preview
              </h3>
              <div className="flex aspect-video items-center justify-center rounded-lg bg-black/40">
                {targetPreviewUrl ? (
                  <video
                    className="h-full w-full rounded-lg"
                    controls
                    src={targetPreviewUrl}
                  />
                ) : (
                  <p className="text-gray-500">No video uploaded</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
