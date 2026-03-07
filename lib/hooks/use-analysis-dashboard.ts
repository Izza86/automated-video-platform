"use client";

import { useState, useCallback, useRef } from "react";
import type {
  AnalyzeAndTransferResponse,
  DashboardData,
  BlueprintData,
  EditInstructions,
  OutputInfo,
  PipelineTiming,
  AnalysisStage,
  AnalysisProgress,
} from "@/lib/types/analysis";

// ─────────────────────────────────────────────────────────────────────────────
// Options
// ─────────────────────────────────────────────────────────────────────────────

export interface AnalysisDashboardOptions {
  /** "proportional" | "loop" | "truncate" — default proportional */
  strategy?: string;
  /** Preserve beat alignment when transferring — default true */
  preserveBeats?: boolean;
  /** Include style instructions in output — default true */
  includeStyle?: boolean;
  /** "json" | "video" | "both" — default json */
  outputMode?: string;
  /** Abort signal from parent */
  signal?: AbortSignal;
}

// ─────────────────────────────────────────────────────────────────────────────
// Return type
// ─────────────────────────────────────────────────────────────────────────────

export interface AnalyzeResult {
  data: AnalyzeAndTransferResponse | null;
  error: string | null;
}

export interface UseAnalysisDashboardReturn {
  /** Run the full pipeline for reference + target */
  analyze: (
    reference: File,
    target: File,
    opts?: AnalysisDashboardOptions,
  ) => Promise<AnalyzeResult>;
  /** Reset all state back to idle */
  reset: () => void;

  /** Current progress */
  progress: AnalysisProgress;
  /** Dashboard cards from the backend */
  dashboard: DashboardData | null;
  /** Blueprint data (timeline + segments + summary) */
  blueprint: BlueprintData | null;
  /** Edit instructions (cuts, speed segments, transitions, style) */
  instructions: EditInstructions | null;
  /** Output video info */
  output: OutputInfo | null;
  /** Pipeline timing breakdown */
  timing: PipelineTiming | null;
  /** Raw full response (for debugging / advanced usage) */
  rawResponse: AnalyzeAndTransferResponse | null;
  /** Error message if any */
  error: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

const INITIAL_PROGRESS: AnalysisProgress = {
  stage: "idle",
  percent: 0,
  message: "",
};

export function useAnalysisDashboard(): UseAnalysisDashboardReturn {
  const [progress, setProgress] = useState<AnalysisProgress>(INITIAL_PROGRESS);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [blueprint, setBlueprint] = useState<BlueprintData | null>(null);
  const [instructions, setInstructions] = useState<EditInstructions | null>(null);
  const [output, setOutput] = useState<OutputInfo | null>(null);
  const [timing, setTiming] = useState<PipelineTiming | null>(null);
  const [rawResponse, setRawResponse] = useState<AnalyzeAndTransferResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Prevent duplicate calls
  const runningRef = useRef(false);

  const tick = useCallback(
    (stage: AnalysisStage, percent: number, message: string) =>
      setProgress({ stage, percent, message }),
    [],
  );

  const analyze = useCallback(
    async (
      reference: File,
      target: File,
      opts: AnalysisDashboardOptions = {},
    ): Promise<AnalyzeResult> => {
      if (runningRef.current) return { data: null, error: "Analysis already in progress" };
      runningRef.current = true;

      // Reset previous results
      setDashboard(null);
      setBlueprint(null);
      setInstructions(null);
      setOutput(null);
      setTiming(null);
      setRawResponse(null);
      setError(null);

      // Hoist controller so it's accessible in the catch block for
      // reading the abort reason on timeout / caller-abort errors.
      const MAX_RETRIES = 2;
      // Removed AbortController timeout logic for polling

      try {
        // ── Stage 1: Upload ──────────────────────────────────────────
        tick("uploading", 5, "Preparing files for upload…");

        const form = new FormData();
        form.append("reference", reference);
        form.append("target", target);
        if (opts.strategy) form.append("strategy", opts.strategy);
        if (opts.preserveBeats !== undefined)
          form.append("preserveBeats", String(opts.preserveBeats));
        if (opts.includeStyle !== undefined)
          form.append("includeStyle", String(opts.includeStyle));
        form.append("outputMode", opts.outputMode ?? "json");

        tick("uploading", 15, "Uploading videos to server…");

        // 30 minute timeout — video processing can be very slow for
        // long / high-res files.  We pass a reason string so the
        // resulting DOMException message is descriptive instead of
        // the default "signal is aborted without reason".
        // No timeout logic; allow backend to handle job duration

        // ── Stage 2: Analyzing (with retry for transient failures) ───
        tick("analyzing", 25, "Running shot detection, motion & audio analysis…");

        let res: Response | null = null;
        let lastFetchErr: unknown = null;

        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          try {
            res = await fetch("/api/analyze-and-transfer", {
              method: "POST",
              credentials: "include",
              body: form,
            });
            lastFetchErr = null;
            break; // success — exit retry loop
          } catch (fetchErr: unknown) {
            lastFetchErr = fetchErr;
            // Only retry on network-level errors (TypeError from fetch)
            const isRetryable =
              fetchErr instanceof TypeError ||
              (fetchErr instanceof DOMException &&
                fetchErr.name === "NetworkError");
            if (!isRetryable || attempt === MAX_RETRIES) break;
            // Exponential back-off: 2s → 4s
            const delay = 2000 * 2 ** attempt;
            tick(
              "analyzing",
              25,
              `Network hiccup — retrying in ${delay / 1000}s (attempt ${attempt + 2}/${MAX_RETRIES + 1})…`,
            );
            await new Promise((r) => setTimeout(r, delay));
          }
        }

        // No timeout to clear

        // If every attempt failed, surface a helpful message
        if (!res) {
          const netMsg =
            lastFetchErr instanceof Error
              ? lastFetchErr.message
              : "Unknown network error";
          throw new Error(
            `Could not reach the server after ${MAX_RETRIES + 1} attempts: ${netMsg}. ` +
              "Check your internet connection and try again.",
          );
        }

        tick("blueprint", 60, "Generating editing blueprint…");

        if (!res.ok) {
          let msg = `Server error ${res.status}: ${res.statusText || "Unknown"}`;
          try {
            const contentType = res.headers.get("content-type") || "";
            if (contentType.includes("application/json")) {
              const errBody = await res.json();
              msg = errBody?.error || msg;
            } else {
              const text = await res.text();
              if (text) msg = text.slice(0, 300);
            }
          } catch {
            /* ignore parse errors */
          }
          throw new Error(msg);
        }

        tick("rendering", 80, "Processing response…");

        const body = (await res.json()) as AnalyzeAndTransferResponse;

        // Always populate dashboard state when we have data —
        // even if success=false (render failed but analysis succeeded).
        if (body.dashboard) {
          setDashboard(body.dashboard);
        }
        if (body.blueprint) {
          setBlueprint(body.blueprint);
        }
        if (body.instructions) {
          setInstructions(body.instructions);
        }
        if (body.output) {
          setOutput(body.output);
        }
        if (body.timing) {
          setTiming(body.timing);
        }
        setRawResponse(body);

        if (!body.success && !body.dashboard) {
          // Truly failed — no data at all
          throw new Error(body.error || "Pipeline returned success=false");
        }

        // ── Stage 3: Populate state ──────────────────────────────────
        tick("complete", 100, body.success ? "Analysis complete!" : "Analysis complete — video render failed.");

        // Return partial success: data is present, error notes render issue
        const partialError = !body.success ? (body.output?.error || body.error || "Video render failed") : null;
        return { data: body, error: partialError };
      } catch (err: unknown) {
        let msg: string;

        if (err instanceof TypeError && /fetch|network/i.test(err.message)) {
          msg =
            "Network connection lost while processing. " +
            "Please check your connection and try again.";
        } else {
          msg = err instanceof Error ? err.message : "Unknown error";
        }

        setError(msg);
        tick("error", 0, msg);
        return { data: null, error: msg };
      } finally {
        runningRef.current = false;
      }
    },
    [tick],
  );

  const reset = useCallback(() => {
    setProgress(INITIAL_PROGRESS);
    setDashboard(null);
    setBlueprint(null);
    setInstructions(null);
    setOutput(null);
    setTiming(null);
    setRawResponse(null);
    setError(null);
    runningRef.current = false;
  }, []);

  return {
    analyze,
    reset,
    progress,
    dashboard,
    blueprint,
    instructions,
    output,
    timing,
    rawResponse,
    error,
  };
}
