"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, Upload, Video, FileVideo, Sparkles, CheckCircle,
  AlertCircle, Play, Download, Loader2, Eye,
  Zap, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAnalysisDashboard } from "@/lib/hooks/use-analysis-dashboard";
import dynamic from "next/dynamic";

// Lazy-load analysis components (they pull in recharts which is heavy)
const AnalysisDashboard = dynamic(
  () => import("@/components/analysis/analysis-dashboard").then((m) => m.AnalysisDashboard),
  { ssr: false, loading: () => <div className="animate-pulse h-64 bg-white/5 rounded-xl" /> }
);
const AnalysisProgressBar = dynamic(
  () => import("@/components/analysis/analysis-dashboard").then((m) => m.AnalysisProgressBar),
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
  if (url.startsWith('blob:') || url.startsWith('data:')) return url;

  let normalized = url;

  // Strip everything before /outputs/ (handles accidental absolute paths)
  const idx = normalized.indexOf('/outputs/');
  if (idx >= 0) {
    normalized = normalized.slice(idx);
  }

  // Rewrite /outputs/filename.mp4 → /api/video/filename.mp4
  if (normalized.startsWith('/outputs/')) {
    const filename = normalized.replace('/outputs/', '');
    normalized = `/api/video/${filename}`;
  }

  // If it already uses /api/video/, keep it
  if (!normalized.startsWith('/api/video/')) {
    return url;
  }

  // Append cache-busting timestamp
  const separator = normalized.includes('?') ? '&' : '?';
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
  const analyzingRef = analysis.progress.stage !== "idle" && analysis.progress.stage !== "complete" && analysis.progress.stage !== "error";

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
    } else {
      setReferencePreviewUrl("");
    }
  }, [referenceVideo]);

  useEffect(() => {
    if (targetVideo) {
      const url = URL.createObjectURL(targetVideo);
      setTargetPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setTargetPreviewUrl("");
    }
  }, [targetVideo]);

  const handleReferenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setReferenceVideo(file);
      toast.info('Reference video uploaded — will analyze when you process.');
    }
  };

  const handleTargetUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setTargetVideo(e.target.files[0]);
    }
  };

  const handleProcess = async () => {
    if (!referenceVideo || !targetVideo) {
      toast.error('Please upload both videos first');
      return;
    }

    setProcessing(true);
    setProgress(0);
    setCompleted(false);
    let didComplete = false;

    try {
      // ── Stage 1: Analyze & Transfer via unified endpoint ──────────
      setCurrentStep('Running full pipeline: analysis → blueprint → instructions → render…');
      setProgress(10);

      let result: Awaited<ReturnType<typeof analysis.analyze>>['data'] = null;
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
        console.error('analysis.analyze threw:', analyzeErr);
        const errMsg = analyzeErr instanceof Error ? analyzeErr.message : 'Unexpected analysis error';
        toast.error(errMsg);
        setProcessing(false);
        setProgress(0);
        return;
      }

      // Total failure — no data at all
      if (!result) {
        throw new Error(pipelineError || "Pipeline failed — check server logs for details.");
      }

      setProgress(70);
      setCurrentStep('Processing results…');

      // ── Stage 2: Handle rendered output ───────────────────────────
      // Prefer videoUrl (served from /outputs/) over base64 blob
      if (result.output?.videoUrl) {
        // Direct URL — browser fetches the mp4 from public/outputs/
        // Apply cache-busting so the browser never shows a stale/black frame
        const freshUrl = cacheBustVideoUrl(result.output.videoUrl);
        setProcessedVideoUrl(freshUrl);
        await saveToProjects(result.output.videoUrl, referenceVideo, targetVideo, result);
      } else if (result.output?.videoBase64) {
        try {
          // Fallback: convert base64 → blob URL for <video> preview
          const b64 = result.output.videoBase64.startsWith('data:')
            ? result.output.videoBase64
            : `data:video/mp4;base64,${result.output.videoBase64}`;
          const resp = await fetch(b64);
          const blob = await resp.blob();
          const url = URL.createObjectURL(blob);
          setProcessedVideoUrl(url);
          await saveToProjects(url, referenceVideo, targetVideo, result);
        } catch (videoErr) {
          console.warn('Video preview failed:', videoErr);
          toast.warning('Analysis complete, but video preview failed to load.');
          await saveToProjects("", referenceVideo, targetVideo, result);
        }
      } else if (pipelineError) {
        // Render failed but analysis data is populated in dashboard cards
        toast.warning('Analysis complete, but video preview failed to render.');
        await saveToProjects("", referenceVideo, targetVideo, result);
      } else {
        toast.success('Analysis complete! Dashboard cards populated below.');
        await saveToProjects("", referenceVideo, targetVideo, result);
      }

      setProgress(100);
      setCompleted(true);
      didComplete = true;
      setCurrentStep('Complete!');

      // Only show success toast if render actually produced a video
      if (processedVideoUrl || result.output?.videoUrl || result.output?.videoBase64) {
        toast.success('Video processed and saved!', {
          action: {
            label: 'View Projects',
            onClick: () => window.location.href = '/dashboard/my-projects',
          },
        });
      }
    } catch (error) {
      console.error('Processing error:', error);

      let errorMessage: string;
      if (
        error instanceof DOMException &&
        error.name === 'AbortError'
      ) {
        errorMessage =
          'Video processing timed out. Try a shorter or lower-resolution video.';
      } else if (
        error instanceof TypeError &&
        /fetch|network/i.test(error.message)
      ) {
        errorMessage =
          'Network connection lost during processing. Please check your connection and retry.';
      } else {
        errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
      }

      toast.error(`Failed to process video: ${errorMessage}`);
      setCurrentStep('');
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
    
    const a = document.createElement('a');
    a.href = processedVideoUrl;
    a.download = `edited-video-${Date.now()}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    toast.success('Video downloaded successfully!');
  };

  const handleRetryRender = async () => {
    if (!referenceVideo || !targetVideo) {
      toast.error('Original videos no longer available. Please upload again.');
      return;
    }

    setProcessing(true);
    setCompleted(false);
    setProgress(50);
    setCurrentStep('Re-trying render with analysis data…');

    try {
      const { data: result, error: pipelineError } = await analysis.analyze(referenceVideo, targetVideo, {
        strategy: "proportional",
        preserveBeats: true,
        includeStyle: true,
        outputMode: "both",
      });

      if (!result) {
        throw new Error(pipelineError || "Retry failed");
      }

      if (result.output?.videoUrl) {
        const freshUrl = cacheBustVideoUrl(result.output.videoUrl);
        setProcessedVideoUrl(freshUrl);
        toast.success('Video rendered successfully!');
        await saveToProjects(result.output.videoUrl, referenceVideo, targetVideo, result);
      } else if (result.output?.videoBase64) {
        const b64 = result.output.videoBase64.startsWith('data:')
          ? result.output.videoBase64
          : `data:video/mp4;base64,${result.output.videoBase64}`;
        const resp = await fetch(b64);
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        setProcessedVideoUrl(url);
        toast.success('Video rendered successfully!');

        await saveToProjects(url, referenceVideo, targetVideo, result);
      } else {
        toast.warning('Render retry did not produce a video.');
      }

      setProgress(100);
      setCompleted(true);
      setCurrentStep('Complete!');
    } catch (error) {
      console.error('Retry render error:', error);
      toast.error('Retry failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
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
    pipelineResult: import("@/lib/types/analysis").AnalyzeAndTransferResponse,
  ) => {
    try {
      console.log('Starting to save project...');
      toast.info('Saving project to database...');

      const summary = pipelineResult.blueprint?.summary;
      const instrSummary = pipelineResult.instructions?.summary;

      // ── Send as FormData to /api/save-project ──────────────────────
      const form = new FormData();

      // If we have a /outputs/ URL (file is on disk in public/), pass
      // the URL string directly so the DB stores a lightweight path
      // instead of a huge base64 blob.  Only fall back to blob upload
      // for blob: URLs or data: URLs that can't be served by static file.
      const isStaticUrl = videoUrl && videoUrl.startsWith('/outputs/');

      if (isStaticUrl) {
        // File is already in public/outputs — just store the URL path
        // Send a zero-byte video placeholder (API will see size=0 and save URL from metadata)
        const placeholder = new Blob([new Uint8Array(0)], { type: 'video/mp4' });
        form.append('video', placeholder, `placeholder.mp4`);
        form.append('videoUrlOverride', videoUrl);
      } else if (videoUrl) {
        const blobResp = await fetch(videoUrl);
        const blob = await blobResp.blob();
        console.log('Video blob size:', blob.size, 'bytes');

        if (blob.size > 30 * 1024 * 1024) {
          toast.warning('Video is large, this may take a moment to save...');
        }
        form.append('video', blob, `edited-${Date.now()}.mp4`);
      } else {
        // No rendered video — send a minimal placeholder blob
        const placeholder = new Blob([new Uint8Array(0)], { type: 'video/mp4' });
        form.append('video', placeholder, `analysis-only-${Date.now()}.mp4`);
      }

      form.append('name', `${targVideo.name.split('.')[0]} - Edited`);
      form.append('type', 'reference-target');
      form.append(
        'metadata',
        JSON.stringify({
          referenceVideoName: refVideo.name,
          targetVideoName: targVideo.name,
          renderSucceeded: !!videoUrl,
          effects: [
            `Pipeline: analysis → blueprint → instructions → render`,
            summary ? `Duration: ${summary.totalDuration.toFixed(1)}s | ${summary.totalCuts} cuts | ${summary.totalSpeedRamps} speed ramps` : null,
            summary ? `BPM: ${summary.bpm} (${(summary.bpmConfidence * 100).toFixed(0)}% confidence) | Pace: ${summary.dominantPace}` : null,
            summary ? `Color: ${summary.dominantColorMood} / ${summary.dominantColorProfile} | Motion: ${summary.dominantMotionStyle}` : null,
            instrSummary ? `Strategy: ${instrSummary.strategy} | ${instrSummary.totalCuts} cuts, ${instrSummary.totalSpeedSegments} speed segs, ${instrSummary.totalTransitions} transitions` : null,
            instrSummary ? `Beat-snapped cuts: ${instrSummary.beatSnappedCuts}/${instrSummary.totalCuts}` : null,
            pipelineResult.timing ? `Total processing: ${(pipelineResult.timing.totalMs / 1000).toFixed(1)}s` : null,
            !videoUrl ? `⚠ Video render failed — analysis data only` : null,
          ].filter(Boolean),
          dashboardCards: pipelineResult.dashboard?.cards,
        })
      );

      const result = await fetch('/api/save-project', {
        method: 'POST',
        credentials: 'include',
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
        console.warn('[save] DB offline — video still available locally');
        if (videoUrl) {
          toast.warning(
            'Video rendered successfully! Database is offline, but you can ' +
            'still download the video below.',
            { duration: 8000 }
          );
        } else {
          toast.warning(
            'Analysis complete. Database is offline — results saved locally only.',
            { duration: 6000 }
          );
        }
      } else if (json.success) {
        // Detached save kicked off — video is immediate, DB save is background
        console.log('Project save initiated in background:', json.message);
        toast.success('Video ready! Project saving to database…');
      } else {
        // Unexpected shape — still non-fatal, video exists on disk
        console.warn('[save] Unexpected response:', json);
        toast.warning('Video available for download. Database save may have failed.');
      }
    } catch (error) {
      // ── Network-level fetch failure — still non-fatal ──────────────
      console.error('Error saving project:', error);
      if (videoUrl) {
        toast.warning(
          'Video rendered but could not reach the server to save. ' +
          'You can still download the output file below.',
          { duration: 8000 }
        );
      } else {
        toast.error(
          'Failed to save: ' + (error instanceof Error ? error.message : 'Unknown error')
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
        <div className="max-w-6xl mx-auto p-6 space-y-6">
          {/* Header */}
          <div>
            <Link 
              href="/dashboard" 
              className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <Sparkles className="w-10 h-10 text-purple-400 animate-pulse" />
              Upload & Edit Videos
            </h1>
            <p className="text-gray-400 mt-2">Apply editing style from reference video to your target video</p>
          </div>

          {/* Instructions */}
          <div className="bg-gradient-to-r from-blue-900/20 to-blue-800/10 border border-blue-500/30 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-400" />
              How it works
            </h2>
            <ol className="space-y-2 text-gray-300">
              <li className="flex items-start gap-2">
                <span className="font-bold text-purple-400">1.</span>
                <span>Upload a <strong>reference video</strong> - We'll analyze its color grading, transitions, audio, pacing, and effects</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-purple-400">2.</span>
                <span>Upload your <strong>target video</strong> that you want to edit with the same style</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-purple-400">3.</span>
                <span>Our system applies: <strong>HALD CLUT deep color matching, frame interpolation (60fps), velocity alignment, grain, vignette, transitions</strong> to the ENTIRE target video</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-purple-400">4.</span>
                <span>Reference audio is <strong>looped automatically</strong> if target video is longer, ensuring complete coverage</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-purple-400">5.</span>
                <span>Preview and download your newly edited video with professional style applied throughout!</span>
              </li>
            </ol>
          </div>

          {/* ═══════════════════════════════════════════════════════════
              ANALYSIS PROGRESS + DYNAMIC DASHBOARD CARDS
             ═══════════════════════════════════════════════════════════ */}
          {analyzingRef && (
            <AnalysisProgressBar
              stage={analysis.progress.stage}
              percent={analysis.progress.percent}
              message={analysis.progress.message}
            />
          )}

          {analysis.dashboard && (
            <AnalysisDashboard
              dashboard={analysis.dashboard}
              blueprintSummary={analysis.blueprint?.summary ?? null}
              timing={analysis.timing ?? null}
            />
          )}

          {/* Upload Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Reference Video */}
            <div className="bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] border border-purple-500/30 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Video className="w-6 h-6 text-purple-400" />
                <h2 className="text-xl font-bold">Reference Video</h2>
                {analyzingRef && (
                  <div className="flex items-center gap-2 text-sm text-yellow-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing...</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-400 mb-4">Upload the video with editing style you want to copy</p>
              
              <label className={cn(
                "border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all",
                referenceVideo 
                  ? "border-green-500/50 bg-green-500/10" 
                  : "border-purple-500/30 hover:border-purple-500/60 bg-purple-500/5 hover:bg-purple-500/10"
              )}>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleReferenceUpload}
                  className="hidden"
                  disabled={processing || completed}
                />
                {referenceVideo ? (
                  <>
                    <CheckCircle className="w-12 h-12 text-green-400 mb-3" />
                    <p className="text-white font-medium mb-1">{referenceVideo.name}</p>
                    <p className="text-xs text-gray-400">{(referenceVideo.size / 1024 / 1024).toFixed(2)} MB</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-purple-400 mb-3" />
                    <p className="text-white font-medium mb-1">Click to upload</p>
                    <p className="text-xs text-gray-400">MP4, MOV, AVI (Max 500MB)</p>
                  </>
                )}
              </label>
            </div>

            {/* Target Video */}
            <div className="bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] border border-cyan-500/30 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileVideo className="w-6 h-6 text-cyan-400" />
                <h2 className="text-xl font-bold">Target Video</h2>
              </div>
              <p className="text-sm text-gray-400 mb-4">Upload the video you want to edit</p>
              
              <label className={cn(
                "border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all",
                targetVideo 
                  ? "border-green-500/50 bg-green-500/10" 
                  : "border-cyan-500/30 hover:border-cyan-500/60 bg-cyan-500/5 hover:bg-cyan-500/10"
              )}>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleTargetUpload}
                  className="hidden"
                  disabled={processing || completed}
                />
                {targetVideo ? (
                  <>
                    <CheckCircle className="w-12 h-12 text-green-400 mb-3" />
                    <p className="text-white font-medium mb-1">{targetVideo.name}</p>
                    <p className="text-xs text-gray-400">{(targetVideo.size / 1024 / 1024).toFixed(2)} MB</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-cyan-400 mb-3" />
                    <p className="text-white font-medium mb-1">Click to upload</p>
                    <p className="text-xs text-gray-400">MP4, MOV, AVI (Max 500MB)</p>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Processing Section */}
          {(processing || completed) && (
            <div className="bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] border border-purple-500/30 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                {completed ? (
                  <>
                    <CheckCircle className="w-6 h-6 text-green-400" />
                    Processing Complete!
                  </>
                ) : (
                  <>
                    <Sparkles className="w-6 h-6 text-purple-400 animate-spin" />
                    Processing Videos...
                  </>
                )}
              </h2>

              {/* Current Step */}
              {currentStep && !completed && (
                <p className="text-sm text-purple-300 mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  {currentStep}
                </p>
              )}

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">
                    {completed ? "Ready to preview and download" : "Applying editing style"}
                  </span>
                  <span className="text-sm text-purple-400 font-bold">{progress}%</span>
                </div>
                <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>

              {/* Video Preview — only when render succeeded */}
              {completed && processedVideoUrl && (
                <div className="mb-4 bg-black/40 rounded-lg overflow-hidden border border-green-500/30">
                  <div className="p-3 bg-green-900/20 border-b border-green-500/30 flex items-center gap-2">
                    <Eye className="w-5 h-5 text-green-400" />
                    <h3 className="font-semibold text-green-300">Processed Video Preview</h3>
                  </div>
                  <div className="aspect-video bg-black flex items-center justify-center">
                    <video
                      src={processedVideoUrl}
                      controls
                      autoPlay
                      loop
                      className="w-full h-full"
                    />
                  </div>
                </div>
              )}

              {/* Render-failed notice + retry */}
              {completed && !processedVideoUrl && (
                <div className="mb-4 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                  <p className="text-yellow-400 text-sm flex items-center gap-2 mb-3">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    Analysis complete, but video preview failed to render. Dashboard cards are populated above.
                  </p>
                  <Button
                    onClick={handleRetryRender}
                    disabled={processing}
                    className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white text-sm"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    {processing ? 'Retrying…' : 'Re-try Render'}
                  </Button>
                </div>
              )}

              {/* FORCE SHOW BUTTONS — always visible when progress hits 100% */}
              {completed && (
                <div className="flex gap-3">
                  {processedVideoUrl && (
                    <Button 
                      onClick={handleDownload}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Edited Video
                    </Button>
                  )}
                  <Button 
                    onClick={handleReset}
                    className={cn(
                      "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white",
                      !processedVideoUrl && "flex-1"
                    )}
                  >
                    Edit Another Video
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          {!processing && !completed && (
            <div className="flex justify-center">
              <Button
                onClick={handleProcess}
                disabled={!referenceVideo || !targetVideo || analyzingRef}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-8 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-5 h-5 mr-2" />
                {analyzingRef ? 'Analyzing Reference...' : 'Apply Editing Style'}
              </Button>
            </div>
          )}

          {/* Preview Section (Optional) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] border border-purple-500/30 rounded-xl p-6">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <Play className="w-5 h-5 text-purple-400" />
                Reference Preview
              </h3>
              <div className="aspect-video bg-black/40 rounded-lg flex items-center justify-center">
                {referencePreviewUrl ? (
                  <video
                    src={referencePreviewUrl}
                    controls
                    className="w-full h-full rounded-lg"
                  />
                ) : (
                  <p className="text-gray-500">No video uploaded</p>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] border border-cyan-500/30 rounded-xl p-6">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <Play className="w-5 h-5 text-cyan-400" />
                Target Preview
              </h3>
              <div className="aspect-video bg-black/40 rounded-lg flex items-center justify-center">
                {targetPreviewUrl ? (
                  <video
                    src={targetPreviewUrl}
                    controls
                    className="w-full h-full rounded-lg"
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
