/**
 * ML Runner — Shared helper for spawning Python ML scripts
 *
 * Provides:
 *   • `runMLScript()`          — single script invocation
 *   • `runMultiStageAnalysis()`— orchestrated multi-stage pipeline
 *     that runs Stage 1 (temporal), Stage 2 (spatial), Stage 3 (motion)
 *     with configurable parallelism.
 *
 * All ML integrations in audio-analysis.ts, shot-detection.ts,
 * motion-analysis.ts, and color-grading.ts use this helper.
 */

import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

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
 * Returns `null` if:
 *   - COLAB_GPU_URL is not set
 *   - The script has no mapped endpoint
 *   - The remote server is unreachable or returns an error
 */
async function runColabMLScript<T = Record<string, unknown>>(
  scriptName: string,
  videoPath: string,
  timeoutMs = 600_000,
): Promise<T | null> {
  const colabUrl = process.env.COLAB_GPU_URL;
  if (!colabUrl) return null;

  const endpoint = SCRIPT_TO_ENDPOINT[scriptName];
  if (!endpoint) {
    console.log(`[ml-runner] No Colab endpoint for ${scriptName}, using local Python`);
    return null;
  }

  if (!existsSync(videoPath)) {
    console.warn(`[ml-runner] Video file not found for Colab upload: ${videoPath}`);
    return null;
  }

  const url = `${colabUrl.replace(/\/+$/, "")}${endpoint}`;
  console.log(`[ml-runner] 🚀 Sending ${scriptName} to Colab GPU: ${url}`);

  try {
    // Read video file and build multipart form
    const videoBuffer = readFileSync(videoPath);
    const filename = videoPath.split(/[\\/]/).pop() || "video.mp4";

    const formData = new FormData();
    const blob = new Blob([videoBuffer], { type: "video/mp4" });
    formData.append("file", blob, filename);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      const errText = await response.text().catch(() => "unknown error");
      console.warn(
        `[ml-runner] Colab GPU returned ${response.status} for ${scriptName}: ${errText.slice(0, 200)}`,
      );
      return null;
    }

    const data = (await response.json()) as T;
    console.log(
      `[ml-runner] ✅ Colab GPU ${scriptName} succeeded` +
      ((data as any)?.processingMs ? ` (${(data as any).processingMs}ms on GPU)` : ""),
    );
    return data;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.warn(`[ml-runner] Colab GPU timed out for ${scriptName} after ${timeoutMs / 1000}s`);
    } else {
      console.warn(
        `[ml-runner] Colab GPU failed for ${scriptName}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    return null;
  }
}

/**
 * Run the full pipeline on the remote Colab GPU server.
 *
 * Uploads the video once and gets all 5 analysis results back.
 * Returns `null` if COLAB_GPU_URL is not set or the request fails.
 */
export async function runColabFullPipeline(
  videoPath: string,
  timeoutMs = 900_000,
): Promise<Record<string, any> | null> {
  const colabUrl = process.env.COLAB_GPU_URL;
  if (!colabUrl) return null;

  if (!existsSync(videoPath)) {
    console.warn(`[ml-runner] Video file not found for Colab upload: ${videoPath}`);
    return null;
  }

  const url = `${colabUrl.replace(/\/+$/, "")}/process-video`;
  console.log(`[ml-runner] 🚀 Sending full pipeline to Colab GPU: ${url}`);

  try {
    const videoBuffer = readFileSync(videoPath);
    const filename = videoPath.split(/[\\/]/).pop() || "video.mp4";

    const formData = new FormData();
    const blob = new Blob([videoBuffer], { type: "video/mp4" });
    formData.append("file", blob, filename);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      const errText = await response.text().catch(() => "unknown error");
      console.warn(`[ml-runner] Colab full pipeline returned ${response.status}: ${errText.slice(0, 200)}`);
      return null;
    }

    const data = await response.json();
    console.log(
      `[ml-runner] ✅ Colab full pipeline succeeded (${data?.totalProcessingMs ?? "?"}ms on GPU)`,
    );
    return data;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.warn(`[ml-runner] Colab full pipeline timed out after ${timeoutMs / 1000}s`);
    } else {
      console.warn(
        `[ml-runner] Colab full pipeline failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    return null;
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
  stages: MLStage[],
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
          stage.timeoutMs ?? 600_000,
        );

        const durationMs = Math.round(performance.now() - stageT0);

        if (raw && !(raw as any).error) {
          const data = stage.transform ? stage.transform(raw) : raw;
          successCount++;
          return {
            name: stage.name,
            success: true,
            data,
            durationMs,
          } as MLStageResult;
        }

        failCount++;
        return {
          name: stage.name,
          success: false,
          data: null,
          durationMs,
          error: (raw as any)?.error ?? "ML script returned no data",
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
        (result.error ? ` — ${result.error}` : ""),
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
    join(PROJECT_ROOT, ".venv", "Scripts", "python.exe"),  // Windows
    join(PROJECT_ROOT, ".venv", "bin", "python"),           // Linux/macOS
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
      `  PROJECT_ROOT=${PROJECT_ROOT}, scriptName=${scriptName}`,
    );
  }
  return resolved;
}

/**
 * Run a Python ML script and return the parsed JSON result.
 *
 * Priority: Colab GPU (if COLAB_GPU_URL is set) → local Python spawn.
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
  timeoutMs = 600_000,
): Promise<T | null> {
  // ── Try Colab GPU first ──────────────────────────────────────────
  const colabResult = await runColabMLScript<T>(scriptName, videoPath, timeoutMs);
  if (colabResult !== null) {
    return colabResult;
  }

  // ── Fall back to local Python ────────────────────────────────────
  const python = resolvePython();
  const script = resolveScript(scriptName);

  if (!existsSync(script)) {
    console.warn(`[ml-runner] Script not found: ${script}`);
    return null;
  }

  // Quote videoPath to handle Windows paths with spaces or special characters
  const quotedPath = `"${videoPath}"`;
  const args = [script, quotedPath, ...extraArgs];

  return new Promise<T | null>((promiseResolve) => {
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
        // Show last 2000 chars — includes progress % and any errors
        const tail = stderr.length > 2000 ? stderr.slice(-2000) : stderr;
        console.warn(`[ml-runner] ${scriptName} stderr (tail):\n${tail}`);
      }

      if (exitCode !== 0 && exitCode !== null) {
        console.warn(
          `[ml-runner] ${scriptName} exited code=${exitCode} signal=${signal ?? "none"}`,
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

            if ((parsed as any).error) {
              console.warn(
                `[ml-runner] ${scriptName} returned error:`,
                (parsed as any).error,
              );
            }

            promiseResolve(parsed);
            return;
          }
        } catch (parseErr) {
          console.warn(
            `[ml-runner] ${scriptName} JSON parse failed:`,
            raw.slice(0, 300),
          );
        }
      }

      if (!raw) {
        console.warn(`[ml-runner] ${scriptName} produced no output`);
      }
      promiseResolve(null);
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
        console.warn(`[ml-runner] ${scriptName} timed out after ${timeoutMs / 1000}s — sending SIGKILL`);
        try {
          // Kill entire process group on *nix; on Windows just kill pid
          if (child.pid) {
            if (process.platform !== "win32") {
              process.kill(-child.pid, "SIGKILL");
            } else {
              child.kill("SIGKILL");
            }
          }
        } catch { /* already dead */ }
        finish(null, "SIGKILL");
      }
    }, timeoutMs);

    // Unref the child so it doesn't block Node's event loop exit
    child.unref();
  });
}
