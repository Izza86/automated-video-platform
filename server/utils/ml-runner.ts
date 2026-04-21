/**
 * ML Runner — Shared helper for spawning Python ML scripts
 *
 * Provides:
 *   • `runMLScript()`          — single script invocation (Colab → local)
 *   • `runMLScriptEnhanced()`  — returns data + pipeline envelope metadata
 *   • `runMultiStageAnalysis()`— orchestrated multi-stage pipeline
 *     that runs Stage 1 (temporal), Stage 2 (spatial), Stage 3 (motion)
 *     with configurable parallelism.
 *
 * All ML integrations in audio-analysis.ts, shot-detection.ts,
 * motion-analysis.ts, and color-grading.ts use this helper.
 *
 * v2: Added _pipelineOk envelope validation, Colab health-check
 *     pre-flight, structured warnings, and enhanced result metadata.
 */

import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { checkColabHealth } from "./colab-healthcheck";

// ─────────────────────────────────────────────────────────────────────────────
// ML Envelope — metadata returned by refactored Python scripts
// ─────────────────────────────────────────────────────────────────────────────

/** Metadata envelope that every refactored Python ML script now emits. */
export interface MLEnvelope {
  /** Whether the primary ML model ran successfully */
  pipelineOk: boolean;
  /** Per-sub-stage results inside the Python script */
  stages: { name: string; ok: boolean; ms: number }[];
  /** Total Python-side processing time in ms */
  processingMs: number;
  /** Non-fatal warnings from the Python script */
  warnings: string[];
}

/** Enhanced result from runMLScriptEnhanced — data + envelope. */
export interface MLScriptResult<T = Record<string, unknown>> {
  /** Parsed ML data (with _pipeline* fields stripped), or null on total failure */
  data: T | null;
  /** Pipeline envelope metadata (present even on fallback results) */
  envelope: MLEnvelope;
  /** Whether the Colab GPU was used (vs local Python) */
  usedColab: boolean;
  /** Exit code from local Python spawn (null if Colab was used or spawn errored) */
  exitCode: number | null;
}

const EMPTY_ENVELOPE: MLEnvelope = {
  pipelineOk: false,
  stages: [],
  processingMs: 0,
  warnings: [],
};

/**
 * Extract the _pipeline* envelope fields from a parsed ML result object,
 * returning the envelope and a cleaned data object (without the _ fields).
 */
export function extractMLEnvelope<T = Record<string, unknown>>(
  raw: Record<string, unknown> | null
): { data: T | null; envelope: MLEnvelope } {
  if (!raw) return { data: null, envelope: { ...EMPTY_ENVELOPE } };

  const envelope: MLEnvelope = {
    pipelineOk: (raw._pipelineOk as boolean) ?? true,
    stages: (raw._stages as MLEnvelope["stages"]) ?? [],
    processingMs: (raw._processingMs as number) ?? 0,
    warnings: (raw._warnings as string[]) ?? [],
  };

  // Strip envelope fields from the data
  const cleaned = { ...raw };
  delete cleaned._pipelineOk;
  delete cleaned._stages;
  delete cleaned._processingMs;
  delete cleaned._warnings;

  return { data: cleaned as unknown as T, envelope };
}

/** Root of the project */
const PROJECT_ROOT = resolve(process.cwd());

// ─────────────────────────────────────────────────────────────────────────────
// Colab GPU Remote Client
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Map from Python script filename → Colab API endpoint path.
 */
const SCRIPT_TO_ENDPOINT: Record<string, string> = {
  "ml_shot_detection.py": "/analyze/shots",
  "ml_motion_analysis.py": "/analyze/motion",
  "ml_depth_analysis.py": "/analyze/depth",
  "ml_color_transfer.py": "/analyze/color",
  "ml_beat_detection.py": "/analyze/beats",
};

/**
 * Try to run the ML analysis on a remote Colab GPU server.
 *
 * Reads the COLAB_GPU_URL env var (set to the ngrok public URL).
 * Uploads the video file as multipart/form-data to the appropriate
 * endpoint and returns the parsed JSON result.
 *
 * Pre-flight: Optionally checks Colab health before sending the job.
 *
 * Returns `null` if:
 *   - COLAB_GPU_URL is not set
 *   - The script has no mapped endpoint
 *   - The remote server is unreachable or returns an error
 *   - Pre-flight health check fails
 */
async function runColabMLScript<T = Record<string, unknown>>(
  scriptName: string,
  videoPath: string,
  timeoutMs = 600_000,
  skipHealthCheck = false
): Promise<T | null> {
  const colabUrl = process.env.COLAB_GPU_URL;
  if (!colabUrl) {
    console.log(`[ml-runner] COLAB_GPU_URL not set, skipping Colab for ${scriptName}`);
    return null;
  }

  const endpoint = SCRIPT_TO_ENDPOINT[scriptName];
  if (!endpoint) {
    console.log(
      `[ml-runner] No Colab endpoint for ${scriptName}, using local Python`
    );
    return null;
  }

  if (!existsSync(videoPath)) {
    console.error(
      `[ml-runner] ❌ Video file not found for Colab upload: ${videoPath}`
    );
    throw new Error(`Video file not found: ${videoPath}`);
  }

  // Pre-flight health check (uses 30s cache, so nearly free on repeat calls)
  if (!skipHealthCheck) {
    let health = await checkColabHealth();
    if (!health.healthy) {
      console.warn(
        `[ml-runner] Colab pre-flight FAILED for ${scriptName}: ${health.message}`
      );
      // Wait 5s and retry once before giving up (helps transient cold-starts)
      console.log(`[ml-runner] Waiting 5s and retrying Colab health check for ${scriptName}...`);
      await new Promise((r) => setTimeout(r, 5000));
      health = await checkColabHealth();
      if (!health.healthy) {
        console.warn(
          `[ml-runner] Colab pre-flight STILL FAILED after retry for ${scriptName}: ${health.message}`
        );
        return null;
      } else {
        console.log(`[ml-runner] Colab health OK on retry for ${scriptName}`);
      }
    }
  }

  const url = `${colabUrl.replace(/\/+$/, "")}${endpoint}`;
  console.log(`[ml-runner] 🚀 Sending ${scriptName} to Colab GPU: ${url}`);

  try {
    // Read video file
    const videoBuffer = readFileSync(videoPath);
    const filename = videoPath.split(/[\\/]/).pop() || "video.mp4";
    console.log(`[ml-runner] Video file size: ${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB, filename: ${filename}`);

    // Build multipart form data manually for better control
    const boundary = `----FormBoundary${Date.now()}${Math.random().toString(36).slice(2)}`;
    const lineFeed = "\r\n";
    
    // Build multipart body
    const multipartBody: Buffer[] = [];
    
    // Add file part header
    multipartBody.push(Buffer.from(
      `--${boundary}${lineFeed}` +
      `Content-Disposition: form-data; name="file"; filename="${filename}"${lineFeed}` +
      `Content-Type: video/mp4${lineFeed}${lineFeed}`
    ));
    
    // Add file data
    multipartBody.push(videoBuffer);
    
    // Add closing boundary
    multipartBody.push(Buffer.from(
      `${lineFeed}--${boundary}--${lineFeed}`
    ));
    
    const bodyBuffer = Buffer.concat(multipartBody);
    console.log(`[ml-runner] Multipart body size: ${(bodyBuffer.length / 1024 / 1024).toFixed(2)} MB`);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    console.log(`[ml-runner] POST ${url} with timeout ${timeoutMs / 1000}s`);
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body: bodyBuffer,
      signal: controller.signal,
    }).catch(err => {
      throw new Error(`Fetch failed: ${err instanceof Error ? err.message : String(err)}`);
    });

    clearTimeout(timer);

    // Always read response text first for debugging
    const responseText = await response.text().catch(() => "");
    
    console.log(`[ml-runner] Response status: ${response.status}`);
    
    if (!response.ok) {
      console.error(
        `[ml-runner] ❌ Colab GPU returned ${response.status} for ${scriptName}`
      );
      console.error(`[ml-runner] Response body (first 1000 chars):\n${responseText.slice(0, 1000)}`);
      throw new Error(`HTTP ${response.status}: ${responseText.slice(0, 200)}`);
    }

    // Check for empty response
    if (!responseText || !responseText.trim()) {
      console.error(`[ml-runner] ❌ Colab GPU returned empty response for ${scriptName}`);
      throw new Error("Colab returned empty response");
    }

    // Parse JSON
    let data: T;
    try {
      data = JSON.parse(responseText) as T;
    } catch (parseErr) {
      console.error(`[ml-runner] ❌ Failed to parse JSON from Colab for ${scriptName}`);
      console.error(`[ml-runner] Response text (first 500 chars):\n${responseText.slice(0, 500)}`);
      throw new Error(`JSON parse failed: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`);
    }

    console.log(
      `[ml-runner] ✅ Colab GPU ${scriptName} succeeded` +
        ((data as any)?.processingMs
          ? ` (${(data as any).processingMs}ms on GPU)`
          : "")
    );
    return data;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    
    if (err instanceof Error && err.name === "AbortError") {
      console.error(
        `[ml-runner] ❌ Colab GPU TIMEOUT for ${scriptName} after ${timeoutMs / 1000}s`
      );
      throw new Error(`Colab timeout after ${timeoutMs / 1000}s`);
    } else {
      console.error(
        `[ml-runner] ❌ Colab GPU FAILED for ${scriptName}: ${errorMsg}`
      );
      throw err;
    }
  }
}

/**
 * Run a Colab ML script with automatic retries.
 *
 * Retries up to `maxRetries` times with exponential backoff (2s, 4s, 8s)
 * before throwing error. Designed for beat detection and other endpoints
 * that may fail transiently due to network flickers or Colab cold-starts.
 */
export async function runColabMLScriptWithRetry<T = Record<string, unknown>>(
  scriptName: string,
  videoPath: string,
  timeoutMs = 600_000,
  maxRetries = 3
): Promise<T | null> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(
      `[ml-runner] Colab ${scriptName} attempt ${attempt}/${maxRetries}`
    );
    try {
      // Only run health check on the first attempt (subsequent ones already know the server was reachable)
      const result = await runColabMLScript<T>(
        scriptName,
        videoPath,
        timeoutMs,
        attempt > 1
      );
      if (result !== null) return result;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(
        `[ml-runner] ❌ Colab ${scriptName} attempt ${attempt} error: ${lastError.message}`
      );

      if (attempt < maxRetries) {
        const backoffMs = 2000 * 2 ** (attempt - 1); // 2s, 4s, 8s
        console.warn(
          `[ml-runner] Retrying in ${backoffMs / 1000}s...`
        );
        await new Promise((r) => setTimeout(r, backoffMs));
      }
    }
  }

  console.error(
    `[ml-runner] ❌ Colab ${scriptName} FAILED after ${maxRetries} attempts`
  );
  if (lastError) {
    throw lastError;
  }
  throw new Error(`Colab ${scriptName} failed after ${maxRetries} attempts`);
}

/**
 * Run the full pipeline on the remote Colab GPU server.
 *
 * Uploads the video once and gets all 5 analysis results back.
 * Throws error if COLAB_GPU_URL is not set or the request fails.
 */
export async function runColabFullPipeline(
  videoPath: string,
  timeoutMs = 900_000
): Promise<Record<string, any> | null> {
  const colabUrl = process.env.COLAB_GPU_URL;
  if (!colabUrl) {
    console.log("[ml-runner] COLAB_GPU_URL not set, skipping Colab full pipeline");
    return null;
  }

  if (!existsSync(videoPath)) {
    console.error(
      `[ml-runner] ❌ Video file not found for Colab upload: ${videoPath}`
    );
    throw new Error(`Video file not found: ${videoPath}`);
  }

  // Pre-flight health check
  const health = await checkColabHealth();
  if (!health.healthy) {
    console.warn(
      `[ml-runner] Colab pre-flight FAILED for full pipeline: ${health.message}`
    );
    return null;
  }

  const url = `${colabUrl.replace(/\/+$/, "")}/process-video`;
  console.log(`[ml-runner] 🚀 Sending full pipeline to Colab GPU: ${url}`);

  try {
    const videoBuffer = readFileSync(videoPath);
    const filename = videoPath.split(/[\\/]/).pop() || "video.mp4";
    console.log(`[ml-runner] Video file size: ${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB`);

    // Build multipart form data manually
    const boundary = `----FormBoundary${Date.now()}${Math.random().toString(36).slice(2)}`;
    const lineFeed = "\r\n";
    
    const multipartBody: Buffer[] = [];
    
    // Add file part header
    multipartBody.push(Buffer.from(
      `--${boundary}${lineFeed}` +
      `Content-Disposition: form-data; name="file"; filename="${filename}"${lineFeed}` +
      `Content-Type: video/mp4${lineFeed}${lineFeed}`
    ));
    
    // Add file data
    multipartBody.push(videoBuffer);
    
    // Add closing boundary
    multipartBody.push(Buffer.from(
      `${lineFeed}--${boundary}--${lineFeed}`
    ));
    
    const bodyBuffer = Buffer.concat(multipartBody);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    console.log(`[ml-runner] POST ${url} with timeout ${timeoutMs / 1000}s`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body: bodyBuffer,
      signal: controller.signal,
    }).catch(err => {
      throw new Error(`Fetch failed: ${err instanceof Error ? err.message : String(err)}`);
    });

    clearTimeout(timer);

    // Always read response text first for debugging
    const responseText = await response.text().catch(() => "");
    
    console.log(`[ml-runner] Response status: ${response.status}`);

    if (!response.ok) {
      console.error(
        `[ml-runner] ❌ Colab full pipeline returned ${response.status}`
      );
      console.error(`[ml-runner] Response body (first 1000 chars):\n${responseText.slice(0, 1000)}`);
      throw new Error(`HTTP ${response.status}: ${responseText.slice(0, 200)}`);
    }

    // Check for empty response
    if (!responseText || !responseText.trim()) {
      console.error(`[ml-runner] ❌ Colab full pipeline returned empty response`);
      throw new Error("Colab returned empty response");
    }

    // Parse JSON
    let data: Record<string, any>;
    try {
      data = JSON.parse(responseText);
    } catch (parseErr) {
      console.error(`[ml-runner] ❌ Failed to parse JSON from Colab full pipeline`);
      console.error(`[ml-runner] Response text (first 500 chars):\n${responseText.slice(0, 500)}`);
      throw new Error(`JSON parse failed: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`);
    }

    console.log(
      `[ml-runner] ✅ Colab full pipeline succeeded (${data?.totalProcessingMs ?? "?"}ms on GPU)`
    );
    return data;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    
    if (err instanceof Error && err.name === "AbortError") {
      console.error(
        `[ml-runner] ❌ Colab full pipeline TIMEOUT after ${timeoutMs / 1000}s`
      );
      throw new Error(`Colab timeout after ${timeoutMs / 1000}s`);
    } else {
      console.error(
        `[ml-runner] ❌ Colab full pipeline FAILED: ${errorMsg}`
      );
      throw err;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Multi-Stage Analysis Types
// ─────────────────────────────────────────────────────────────────────────────

/** A single ML analysis stage definition. */
export interface MLStage<T = Record<string, unknown>> {
  /** Human-readable stage name (for logging) */
  name: string;
  /** Python script filename in scripts/ folder */
  scriptName: string;
  /** Extra CLI arguments */
  extraArgs?: string[];
  /** Timeout in ms (default: 600s) */
  timeoutMs?: number;
  /** Whether this stage can run in parallel with others in the same group */
  parallel?: boolean;
  /** Transform the raw ML output before returning */
  transform?: (raw: Record<string, unknown>) => T;
}

/** Result of a single stage execution. */
export interface MLStageResult<T = Record<string, unknown>> {
  /** Stage name */
  name: string;
  /** Whether the stage succeeded */
  success: boolean;
  /** Parsed and optionally transformed result */
  data: T | null;
  /** Execution time in ms */
  durationMs: number;
  /** Error message if failed */
  error?: string;
  /** Pipeline envelope from the Python script (if available) */
  envelope?: MLEnvelope;
}

/** Result of the full multi-stage pipeline. */
export interface MultiStageResult {
  /** Results keyed by stage name */
  stages: Record<string, MLStageResult>;
  /** Total wall-clock time for all stages */
  totalMs: number;
  /** Number of stages that succeeded */
  successCount: number;
  /** Number of stages that failed */
  failCount: number;
}

/**
 * Run a multi-stage ML analysis pipeline.
 *
 * Stages are grouped by their `parallel` flag:
 *   • parallel=true stages within the same position run concurrently
 *   • parallel=false stages run sequentially in order
 *
 * Stages are executed in the order they appear in the array.
 * Consecutive parallel stages are batched together via Promise.all.
 *
 * @param videoPath  Absolute path to the video file
 * @param stages     Ordered array of stage definitions
 * @returns Combined results from all stages
 */
export async function runMultiStageAnalysis(
  videoPath: string,
  stages: MLStage[]
): Promise<MultiStageResult> {
  const t0 = performance.now();
  const results: Record<string, MLStageResult> = {};
  let successCount = 0;
  let failCount = 0;

  // Group consecutive parallel stages into batches
  const batches: MLStage[][] = [];
  let currentBatch: MLStage[] = [];

  for (const stage of stages) {
    if (stage.parallel !== false) {
      currentBatch.push(stage);
    } else {
      // Flush any pending parallel batch
      if (currentBatch.length > 0) {
        batches.push(currentBatch);
        currentBatch = [];
      }
      // Sequential stage = its own batch of 1
      batches.push([stage]);
    }
  }
  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  // Execute batches
  for (const batch of batches) {
    const batchPromises = batch.map(async (stage) => {
      const stageT0 = performance.now();
      try {
        const raw = await runMLScript<Record<string, unknown>>(
          stage.scriptName,
          videoPath,
          stage.extraArgs ?? [],
          stage.timeoutMs ?? 600_000
        );

        const durationMs = Math.round(performance.now() - stageT0);

        // Extract pipeline envelope from refactored Python scripts
        const { data: cleanData, envelope } = extractMLEnvelope(raw);

        // Log any warnings from the Python script
        if (envelope.warnings.length > 0) {
          console.warn(
            `[ml-runner] Stage "${stage.name}" warnings: ${envelope.warnings.join("; ")}`
          );
        }

        if (raw && !(raw as any).error) {
          const data = stage.transform
            ? stage.transform(cleanData ?? raw)
            : (cleanData ?? raw);
          successCount++;
          return {
            name: stage.name,
            success: true,
            data,
            durationMs,
            envelope,
          } as MLStageResult;
        }

        failCount++;
        return {
          name: stage.name,
          success: false,
          data: null,
          durationMs,
          error: (raw as any)?.error ?? "ML script returned no data",
          envelope,
        } as MLStageResult;
      } catch (err) {
        failCount++;
        return {
          name: stage.name,
          success: false,
          data: null,
          durationMs: Math.round(performance.now() - stageT0),
          error: err instanceof Error ? err.message : String(err),
        } as MLStageResult;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    for (const result of batchResults) {
      results[result.name] = result;
      console.log(
        `[ml-runner] Stage "${result.name}": ${result.success ? "OK" : "FAIL"} (${result.durationMs}ms)` +
          (result.error ? ` — ${result.error}` : "")
      );
    }
  }

  return {
    stages: results,
    totalMs: Math.round(performance.now() - t0),
    successCount,
    failCount,
  };
}

/**
 * Resolve the Python executable from the project's .venv.
 * Falls back to system `python` / `python3` if .venv doesn't exist.
 */
function resolvePython(): string {
  // Check .venv in project root
  const venvPaths = [
    join(PROJECT_ROOT, ".venv", "Scripts", "python.exe"), // Windows
    join(PROJECT_ROOT, ".venv", "bin", "python"), // Linux/macOS
    join(PROJECT_ROOT, "venv", "Scripts", "python.exe"),
    join(PROJECT_ROOT, "venv", "bin", "python"),
  ];

  for (const p of venvPaths) {
    if (existsSync(p)) return p;
  }

  // Fallback to system Python
  return process.platform === "win32" ? "python" : "python3";
}

/**
 * Resolve the path to an ML script in the project's `scripts/` folder.
 * Uses dynamic `path.join(process.cwd(), 'scripts', ...)` so it works
 * across environments (dev, CI, Docker) without hardcoded paths.
 */
function resolveScript(scriptName: string): string {
  const resolved = join(PROJECT_ROOT, "scripts", scriptName);
  if (!existsSync(resolved)) {
    console.warn(
      `[ml-runner] Script not found at resolved path: ${resolved}\n` +
        `  PROJECT_ROOT=${PROJECT_ROOT}, scriptName=${scriptName}`
    );
  }
  return resolved;
}

/**
 * Run a Python ML script and return the parsed JSON result.
 *
 * Priority: Colab GPU (if COLAB_GPU_URL is set) → local Python spawn.
 * 
 * STRICT MODE: Does NOT fall back silently. Throws explicit errors
 * if Colab is configured but fails. If Colab is not configured, falls
 * back to local Python.
 *
 * @param scriptName  Name of the Python script (e.g., "ml_beat_detection.py")
 * @param videoPath   Absolute path to the video file to analyse
 * @param extraArgs   Additional CLI arguments to pass to the script
 * @param timeoutMs   Maximum execution time in milliseconds (default: 600s)
 * @returns Parsed JSON from the script's stdout, or `null` on failure
 */
export async function runMLScript<T = Record<string, unknown>>(
  scriptName: string,
  videoPath: string,
  extraArgs: string[] = [],
  timeoutMs = 600_000
): Promise<T | null> {
  // ── Try Colab GPU first ──────────────────────────────────────────
  const colabUrl = process.env.COLAB_GPU_URL;
  if (colabUrl) {
    console.log(`[ml-runner] COLAB_GPU_URL is set, attempting Colab for ${scriptName}`);
    try {
      const colabResult = await runColabMLScript<T>(
        scriptName,
        videoPath,
        timeoutMs
      );
      if (colabResult !== null) {
        return colabResult;
      }
    } catch (colabErr) {
      console.error(
        `[ml-runner] ❌ Colab CRITICAL ERROR for ${scriptName}: ${colabErr instanceof Error ? colabErr.message : String(colabErr)}`
      );
      throw colabErr;
    }
  }

  // ── Fall back to local Python ────────────────────────────────────
  console.log(`[ml-runner] Running ${scriptName} locally`);
  
  const python = resolvePython();
  const script = resolveScript(scriptName);

  if (!existsSync(script)) {
    console.error(`[ml-runner] ❌ Script not found: ${script}`);
    throw new Error(`Script not found: ${script}`);
  }

  // Quote videoPath to handle Windows paths with spaces or special characters
  const quotedPath = `"${videoPath}"`;
  const args = [script, quotedPath, ...extraArgs];

  console.log(`[ml-runner] Running command: ${python} ${args.join(' ')}`);

  return new Promise<T | null>((promiseResolve, promiseReject) => {
    // ── Detached spawn — prevents Node.js from killing the child ──────
    // Using spawn() with detached:true so the Python process runs in its
    // own process group. Node won't auto-SIGTERM it under heavy load.
    // We unref() after attaching listeners so Node's event loop can
    // still exit cleanly if the main process is shutting down.
    const child = spawn(python, args, {
      cwd: PROJECT_ROOT,
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
      stdio: ["ignore", "pipe", "pipe"],
      detached: true,
      windowsHide: true,
    });

    let stdoutChunks: Buffer[] = [];
    let stderrChunks: Buffer[] = [];
    let settled = false;
    let totalStdout = 0;
    const MAX_BUFFER = 500 * 1024 * 1024; // 500 MB cap

    const finish = (exitCode: number | null, signal: string | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      const stdout = Buffer.concat(stdoutChunks).toString("utf-8");
      const stderr = Buffer.concat(stderrChunks).toString("utf-8");

      // Free chunk arrays immediately
      stdoutChunks = [];
      stderrChunks = [];

      // Log stderr (contains progress updates & ML library warnings)
      if (stderr && stderr.trim()) {
        // Show last 4000 chars — includes progress %, ML logs, and any errors
        const tail = stderr.length > 4000 ? stderr.slice(-4000) : stderr;
        console.warn(`[ml-runner] ${scriptName} stderr (tail):\n${tail}`);
      }

      if (exitCode !== 0 && exitCode !== null) {
        console.error(
          `[ml-runner] ❌ ${scriptName} exited with code=${exitCode} signal=${signal ?? "none"}`
        );
      }

      // ALWAYS try to parse stdout — even on non-zero exit
      const raw = (stdout ?? "").trim();
      if (raw) {
        try {
          const lastBrace = raw.lastIndexOf("}");
          const firstBrace = raw.indexOf("{");
          if (firstBrace !== -1 && lastBrace !== -1) {
            const jsonStr = raw.slice(firstBrace, lastBrace + 1);
            const parsed = JSON.parse(jsonStr) as T;

            // ── Check pipeline envelope from refactored Python scripts ──
            const anyParsed = parsed as Record<string, unknown>;
            if (anyParsed._pipelineOk === false) {
              const pipelineWarnings = (anyParsed._warnings as string[]) ?? [];
              console.warn(
                `[ml-runner] ${scriptName} returned _pipelineOk=false` +
                  (pipelineWarnings.length
                    ? `: ${pipelineWarnings.join("; ")}`
                    : " (no warnings provided)")
              );
            } else if (anyParsed._pipelineOk === true) {
              const pyMs = anyParsed._processingMs ?? "?";
              console.log(
                `[ml-runner] ${scriptName} ✅ _pipelineOk=true (Python: ${pyMs}ms)`
              );
            }

            if ((parsed as any).error) {
              console.warn(
                `[ml-runner] ${scriptName} returned error:`,
                (parsed as any).error
              );
            }

            promiseResolve(parsed);
            return;
          }
        } catch (parseErr) {
          console.error(
            `[ml-runner] ❌ ${scriptName} JSON parse failed:`,
            raw.slice(0, 300)
          );
          promiseReject(new Error(`Failed to parse JSON output from ${scriptName}`));
          return;
        }
      }

      if (!raw) {
        console.error(`[ml-runner] ❌ ${scriptName} produced no output`);
        promiseReject(new Error(`${scriptName} produced no output`));
        return;
      }
      
      promiseReject(new Error(`${scriptName} failed with exit code ${exitCode}`));
    };

    // Accumulate stdout / stderr with buffer-size guard
    child.stdout.on("data", (chunk: Buffer) => {
      totalStdout += chunk.length;
      if (totalStdout <= MAX_BUFFER) {
        stdoutChunks.push(chunk);
      }
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderrChunks.push(chunk);
      // Keep stderr bounded to 10 MB
      if (Buffer.concat(stderrChunks).length > 10 * 1024 * 1024) {
        stderrChunks = [stderrChunks[stderrChunks.length - 1]];
      }
    });

    child.on("close", (code, sig) => finish(code, sig));
    child.on("error", (err) => {
      console.warn(`[ml-runner] ${scriptName} spawn error:`, err.message);
      finish(1, null);
    });

    // Manual timeout — sends SIGKILL (not SIGTERM) so the process
    // actually dies instead of lingering.
    const timer = setTimeout(() => {
      if (!settled) {
        console.warn(
          `[ml-runner] ${scriptName} timed out after ${timeoutMs / 1000}s — sending SIGKILL`
        );
        try {
          // Kill entire process group on *nix; on Windows just kill pid
          if (child.pid) {
            if (process.platform !== "win32") {
              process.kill(-child.pid, "SIGKILL");
            } else {
              child.kill("SIGKILL");
            }
          }
        } catch {
          /* already dead */
        }
        finish(null, "SIGKILL");
      }
    }, timeoutMs);

    // Unref the child so it doesn't block Node's event loop exit
    child.unref();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Enhanced ML Script Runner (with envelope extraction)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run a Python ML script and return the parsed result WITH full pipeline
 * envelope metadata. This is the preferred entry-point for the orchestrator
 * because it exposes _pipelineOk, _warnings, _stages from the Python side.
 *
 * @param scriptName  Name of the Python script (e.g., "ml_beat_detection.py")
 * @param videoPath   Absolute path to the video file to analyse
 * @param extraArgs   Additional CLI arguments to pass to the script
 * @param timeoutMs   Maximum execution time in milliseconds (default: 600s)
 * @returns Structured result with data, envelope, and execution metadata
 */
export async function runMLScriptEnhanced<T = Record<string, unknown>>(
  scriptName: string,
  videoPath: string,
  extraArgs: string[] = [],
  timeoutMs = 600_000
): Promise<MLScriptResult<T>> {
  const colabUrl = process.env.COLAB_GPU_URL;
  let usedColab = false;

  // ── Try Colab GPU first ──────────────────────────────────────────
  if (colabUrl) {
    const colabResult = await runColabMLScript<Record<string, unknown>>(
      scriptName,
      videoPath,
      timeoutMs
    );
    if (colabResult !== null) {
      usedColab = true;
      const { data, envelope } = extractMLEnvelope<T>(colabResult);
      return { data, envelope, usedColab, exitCode: null };
    }
  }

  // ── Fall back to local Python ────────────────────────────────────
  const raw = await runMLScript<Record<string, unknown>>(
    scriptName,
    videoPath,
    extraArgs,
    timeoutMs
  );

  const { data, envelope } = extractMLEnvelope<T>(raw);

  return {
    data,
    envelope,
    usedColab: false,
    exitCode: raw ? 0 : 1,
  };
}
