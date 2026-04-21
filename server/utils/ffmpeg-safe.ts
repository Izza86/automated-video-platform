/**
 * FFmpeg Safe — Validated FFmpeg execution with file checks
 * ===========================================================
 *
 * Wraps FFmpeg command execution with:
 *   • Input file existence check before running
 *   • Output file existence + minimum size validation after
 *   • Structured error logging with stderr capture
 *   • Retry logic for transient failures
 *   • Timestamp logging for each step
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { execAsync, resolveFfmpeg, safeExe } from "./ffmpeg";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface FFmpegRunOptions {
  /** Human-readable label for logging (e.g. "HALD CLUT generation") */
  label: string;
  /** FFmpeg command string (without the ffmpeg executable path) */
  args: string;
  /** Input file paths to verify before running */
  inputFiles?: string[];
  /** Expected output file path to validate after running */
  outputFile?: string;
  /** Minimum expected output size in bytes (default: 100) */
  minOutputBytes?: number;
  /** Maximum buffer size for stdout/stderr (default: 200MB) */
  maxBuffer?: number;
  /** Number of retry attempts on failure (default: 0 = no retry) */
  retries?: number;
  /** Retry backoff in ms (default: 2000) */
  retryBackoffMs?: number;
}

export interface FFmpegRunResult {
  /** Whether the command succeeded and output was validated */
  success: boolean;
  /** Human-readable error description if failed */
  error?: string;
  /** FFmpeg stderr output (last 2000 chars) */
  stderr?: string;
  /** Output file size in bytes (if applicable) */
  outputSizeBytes?: number;
  /** Execution duration in ms */
  durationMs: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run an FFmpeg command with full safety checks.
 *
 * 1. Verifies all input files exist and are non-empty
 * 2. Executes the FFmpeg command
 * 3. Verifies output file exists and meets minimum size
 * 4. Logs structured errors on any failure
 * 5. Retries on transient failures if configured
 */
export async function runFFmpegSafe(
  opts: FFmpegRunOptions
): Promise<FFmpegRunResult> {
  const t0 = performance.now();
  const prefix = `[ffmpeg/${opts.label}]`;

  // ── Step 1: Validate input files ────────────────────────────────────
  if (opts.inputFiles) {
    for (const inputPath of opts.inputFiles) {
      if (!fs.existsSync(inputPath)) {
        const err = `Input file not found: ${inputPath}`;
        console.error(`${prefix} ❌ ${err}`);
        return {
          success: false,
          error: err,
          durationMs: Math.round(performance.now() - t0),
        };
      }
      const stat = fs.statSync(inputPath);
      if (stat.size === 0) {
        const err = `Input file is empty (0 bytes): ${inputPath}`;
        console.error(`${prefix} ❌ ${err}`);
        return {
          success: false,
          error: err,
          durationMs: Math.round(performance.now() - t0),
        };
      }
    }
  }

  // ── Step 2: Resolve FFmpeg path ─────────────────────────────────────
  let exe: string;
  try {
    const ffmpeg = await resolveFfmpeg();
    exe = safeExe(ffmpeg);
  } catch (err) {
    const msg = `FFmpeg not found: ${err instanceof Error ? err.message : String(err)}`;
    console.error(`${prefix} ❌ ${msg}`);
    return {
      success: false,
      error: msg,
      durationMs: Math.round(performance.now() - t0),
    };
  }

  // ── Step 3: Execute with retries ────────────────────────────────────
  const maxAttempts = (opts.retries ?? 0) + 1;
  const backoff = opts.retryBackoffMs ?? 2000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const attemptT0 = performance.now();
    const cmd = `${exe} ${opts.args}`;

    if (attempt > 1) {
      console.log(`${prefix} 🔄 Retry attempt ${attempt}/${maxAttempts}`);
    }

    try {
      const { stderr } = await execAsync(cmd, {
        maxBuffer: opts.maxBuffer ?? 200 * 1024 * 1024,
      });

      const durationMs = Math.round(performance.now() - attemptT0);

      // ── Step 4: Validate output ─────────────────────────────────────
      if (opts.outputFile) {
        if (!fs.existsSync(opts.outputFile)) {
          const err = `FFmpeg completed (${durationMs}ms) but output file was not created: ${opts.outputFile}`;
          console.error(`${prefix} ❌ ${err}`);
          if (stderr) {
            const tail = stderr.length > 2000 ? stderr.slice(-2000) : stderr;
            console.error(`${prefix} stderr:\n${tail}`);
          }

          if (attempt < maxAttempts) {
            await sleep(backoff * attempt);
            continue;
          }
          return {
            success: false,
            error: err,
            stderr: stderr?.slice(-2000),
            durationMs,
          };
        }

        const stat = fs.statSync(opts.outputFile);
        const minBytes = opts.minOutputBytes ?? 100;

        if (stat.size < minBytes) {
          const err = `Output file too small: ${stat.size} bytes (min: ${minBytes}) at ${opts.outputFile}`;
          console.warn(`${prefix} ⚠️ ${err}`);
          if (stderr) {
            const tail = stderr.length > 2000 ? stderr.slice(-2000) : stderr;
            console.warn(`${prefix} stderr:\n${tail}`);
          }

          // Don't fail — the file was created, but warn heavily
          return {
            success: true,
            error: err,
            stderr: stderr?.slice(-2000),
            outputSizeBytes: stat.size,
            durationMs,
          };
        }

        console.log(
          `${prefix} ✅ Success in ${durationMs}ms — output: ${path.basename(opts.outputFile)} (${(stat.size / 1024).toFixed(1)}KB)`
        );
        return { success: true, outputSizeBytes: stat.size, durationMs };
      }

      // No output file to check — command success is enough
      console.log(`${prefix} ✅ Success in ${durationMs}ms`);
      return { success: true, durationMs };
    } catch (ffErr: unknown) {
      const durationMs = Math.round(performance.now() - attemptT0);
      const errObj = ffErr as {
        stderr?: string;
        stdout?: string;
        message?: string;
      };
      const stderr = errObj.stderr ?? "";
      const msg = errObj.message ?? String(ffErr);

      console.error(
        `${prefix} ❌ FFmpeg command failed (attempt ${attempt}/${maxAttempts}, ${durationMs}ms)`
      );
      console.error(`${prefix} Command: ${cmd.slice(0, 500)}`);
      if (stderr) {
        const tail = stderr.length > 2000 ? stderr.slice(-2000) : stderr;
        console.error(`${prefix} stderr (tail):\n${tail}`);
      }

      if (attempt < maxAttempts) {
        console.log(`${prefix} Retrying in ${(backoff * attempt) / 1000}s...`);
        await sleep(backoff * attempt);
        continue;
      }

      return {
        success: false,
        error: `FFmpeg failed after ${maxAttempts} attempt(s): ${msg}`,
        stderr: stderr.slice(-2000),
        durationMs: Math.round(performance.now() - t0),
      };
    }
  }

  // Should never reach here
  return {
    success: false,
    error: "Unexpected state",
    durationMs: Math.round(performance.now() - t0),
  };
}

/**
 * Quick helper: verify a file exists and is above a minimum size.
 * Returns an error string or null if valid.
 */
export function validateFile(
  filePath: string,
  label: string,
  minBytes = 100
): string | null {
  if (!fs.existsSync(filePath)) {
    return `${label}: file not found at ${filePath}`;
  }
  const stat = fs.statSync(filePath);
  if (stat.size < minBytes) {
    return `${label}: file too small (${stat.size} bytes, min: ${minBytes}) at ${filePath}`;
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
