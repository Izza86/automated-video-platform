/**
 * Shared FFmpeg / FFprobe helpers used by all analysis modules.
 *
 * Centralises executable resolution, temp-dir management,
 * and common probe queries so every module stays DRY.
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

export const execAsync = promisify(exec);

// ─────────────────────────────────────────────────────────────────────────────
// Executable resolution
// ─────────────────────────────────────────────────────────────────────────────

/** Resolve the ffmpeg binary (env var → PATH → platform fallbacks). */
export async function resolveFfmpeg(): Promise<string> {
  const candidates: string[] = [];
  if (process.env.FFMPEG_PATH) candidates.push(process.env.FFMPEG_PATH);
  candidates.push("ffmpeg");
  if (process.platform === "win32") {
    candidates.push("C:\\ffmpeg\\bin\\ffmpeg.exe");
  } else {
    candidates.push("/usr/bin/ffmpeg", "/usr/local/bin/ffmpeg");
  }
  for (const c of candidates) {
    if (!c) continue;
    try {
      const cmd = /\\|\s/.test(c) ? `"${c}" -version` : `${c} -version`;
      await execAsync(cmd);
      return c;
    } catch { /* next */ }
  }
  throw new Error("ffmpeg not found — install it or set FFMPEG_PATH");
}

/** Resolve the ffprobe binary. */
export async function resolveFfprobe(): Promise<string> {
  const candidates: string[] = [];
  if (process.env.FFPROBE_PATH) candidates.push(process.env.FFPROBE_PATH);
  if (process.env.FFMPEG_PATH) {
    candidates.push(process.env.FFMPEG_PATH.replace(/ffmpeg(\.exe)?$/i, "ffprobe$1"));
  }
  candidates.push("ffprobe");
  if (process.platform === "win32") {
    candidates.push("C:\\ffmpeg\\bin\\ffprobe.exe");
  } else {
    candidates.push("/usr/bin/ffprobe", "/usr/local/bin/ffprobe");
  }
  for (const c of candidates) {
    if (!c) continue;
    try {
      const cmd = /\\|\s/.test(c) ? `"${c}" -version` : `${c} -version`;
      await execAsync(cmd);
      return c;
    } catch { /* next */ }
  }
  throw new Error("ffprobe not found — install it or set FFPROBE_PATH");
}

/** Quote an executable path that contains spaces or backslashes. */
export function safeExe(exe: string): string {
  return /\\|\s/.test(exe) ? `"${exe}"` : exe;
}

// ─────────────────────────────────────────────────────────────────────────────
// Probe helpers
// ─────────────────────────────────────────────────────────────────────────────

export interface ProbeResult {
  fps: number;
  width: number;
  height: number;
  aspectRatio: string;
  hasAudio: boolean;
  duration: number;
  videoCodec: string;
  audioCodec: string | null;
}

/** Full ffprobe of a local video file → ProbeResult. */
export async function probeVideo(videoPath: string): Promise<ProbeResult> {
  const ffprobe = await resolveFfprobe();
  const cmd = `"${ffprobe}" -v quiet -print_format json -show_streams -show_format "${videoPath}"`;
  const { stdout } = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 });
  const data = JSON.parse(stdout);

  let fps = 30;
  let width = 1920;
  let height = 1080;
  let aspectRatio = "16:9";
  let hasAudio = false;
  let duration = 0;
  let videoCodec = "unknown";
  let audioCodec: string | null = null;

  for (const s of data.streams ?? []) {
    if (s.codec_type === "video") {
      videoCodec = s.codec_name ?? "unknown";
      width = s.width ?? 1920;
      height = s.height ?? 1080;
      if (s.r_frame_rate) {
        const [n, d] = s.r_frame_rate.split("/").map(Number);
        if (d > 0) fps = Math.round(n / d);
      }
      if (s.display_aspect_ratio && s.display_aspect_ratio !== "0:1") {
        aspectRatio = s.display_aspect_ratio;
      } else {
        const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
        const g = gcd(width, height);
        aspectRatio = `${width / g}:${height / g}`;
      }
      if (!duration && s.duration) duration = parseFloat(s.duration);
    }
    if (s.codec_type === "audio") {
      hasAudio = true;
      audioCodec = s.codec_name ?? null;
    }
  }
  if (!duration && data.format?.duration) {
    duration = parseFloat(data.format.duration);
  }

  return { fps, width, height, aspectRatio, hasAudio, duration, videoCodec, audioCodec };
}

// ─────────────────────────────────────────────────────────────────────────────
// Temp directory helpers
// ─────────────────────────────────────────────────────────────────────────────

const TEMP_ROOT = path.join(os.tmpdir(), "ave-modules");

/** Create a namespaced temp directory and return its path. */
export function makeTempDir(prefix: string): string {
  const dir = path.join(TEMP_ROOT, `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Remove a temp directory (best-effort, never throws). */
export function cleanTempDir(dir: string): void {
  try {
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  } catch { /* ignore */ }
}

/** Write a Buffer to a temp file inside `dir`, return the path. */
export async function writeTempFile(dir: string, name: string, data: Buffer): Promise<string> {
  const fp = path.join(dir, name);
  await fs.promises.writeFile(fp, data);
  return fp;
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────────────────

/** Parse numeric values from an array of regex-match strings like "KEY=123.45". */
export function parseMetricValues(matches: string[]): number[] {
  return matches
    .map((m) => parseFloat(m.split("=")[1]))
    .filter((v) => !Number.isNaN(v));
}

/** Arithmetic mean of a number array (returns 0 for empty). */
export function mean(arr: number[]): number {
  return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}
