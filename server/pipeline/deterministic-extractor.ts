import { spawn } from "node:child_process";
import {
  execAsync,
  resolveFfmpeg,
  resolveFfprobe,
  safeExe,
} from "../utils/ffmpeg";

/**
 * Deterministic Frame Metadata
 * Ground-truth alignment for a single frame.
 */
export interface DeterministicFrame {
  index: number;
  pts: number;
  buffer: Buffer;
  width: number;
  height: number;
}

/**
 * Probe Data
 * The "Ground Truth" set of timestamps from ffprobe.
 */
interface ProbeData {
  timestamps: number[];
  width: number;
  height: number;
  fps: number;
}

/**
 * DeterministicExtractor
 * ──────────────────────
 * A production-grade frame extraction engine designed for 1:1 frame-to-PTS accuracy.
 * Unlike standard extraction, this module:
 *  1. Probes EVERY frame timestamp via ffprobe before extraction.
 *  2. Pipes raw rgb24 data to avoid compression artifacts and I/O overhead.
 *  3. Asserts frame count and byte alignment matches exactly.
 */
export class DeterministicExtractor {
  private videoPath: string;

  constructor(videoPath: string) {
    this.videoPath = videoPath;
  }

  /**
   * Run the ffprobe ground-truth pass.
   * Extracts every pkt_pts_time into an array.
   */
  async probe(): Promise<ProbeData> {
    const ffprobe = await resolveFfprobe();
    const exe = safeExe(ffprobe);

    console.log(`[D-Extractor] Probing ground truth: ${this.videoPath}`);

    // Get width, height, and all frame timestamps
    const cmd = `${exe} -v quiet -select_streams v:0 -show_frames -show_entries stream=width,height,r_frame_rate -show_entries frame=pts_time -of json "${this.videoPath}"`;
    const { stdout } = await execAsync(cmd, { maxBuffer: 100 * 1024 * 1024 });
    const data = JSON.parse(stdout);

    if (!data.frames || data.frames.length === 0) {
      throw new Error(
        `[D-Extractor] No frames found in video during probe: ${this.videoPath}`
      );
    }

    const stream = data.streams[0];
    const width = stream.width;
    const height = stream.height;

    const [n, d] = stream.r_frame_rate.split("/").map(Number);
    const fps = d > 0 ? n / d : 30;

    const timestamps = data.frames
      .map((f: any) => Number.parseFloat(f.pts_time))
      .filter((t: any) => !isNaN(t));

    console.log(
      `[D-Extractor] Probe complete: ${width}x${height}, ${timestamps.length} frames detected.`
    );
    return { timestamps, width, height, fps };
  }

  /**
   * Extract frames using a raw-video pipe.
   * Yields DeterministicFrame objects one by one.
   */
  async *extract(): AsyncGenerator<DeterministicFrame> {
    const probe = await this.probe();
    const frameSize = probe.width * probe.height * 3; // rgb24
    const ffmpeg = await resolveFfmpeg();
    const exe = safeExe(ffmpeg);

    const args = [
      "-i",
      this.videoPath,
      "-f",
      "rawvideo",
      "-pix_fmt",
      "rgb24",
      "-v",
      "quiet",
      "pipe:1",
    ];

    console.log(
      `[D-Extractor] Starting extraction pipe: ${probe.width}x${probe.height} | Expected: ${probe.timestamps.length} frames`
    );

    const child = spawn(ffmpeg, args);
    let framesYielded = 0;
    let buffer = Buffer.alloc(0);

    // Readable stream for raw video data
    for await (const chunk of child.stdout) {
      buffer = Buffer.concat([buffer, chunk]);

      while (buffer.length >= frameSize) {
        const frameBuffer = buffer.subarray(0, frameSize);
        buffer = buffer.subarray(frameSize);

        const frameIndex = framesYielded;
        const pts = probe.timestamps[frameIndex];

        if (pts === undefined) {
          // This happens if ffmpeg yields more frames than ffprobe reported
          throw new Error(
            `[D-Extractor] FATAL: Extra frame yielded at index ${frameIndex}. ffprobe only reported ${probe.timestamps.length} frames.`
          );
        }

        yield {
          index: frameIndex,
          pts,
          buffer: frameBuffer,
          width: probe.width,
          height: probe.height,
        };

        framesYielded++;
      }
    }

    // Final Validation
    const exitCode = await new Promise<number>((resolve) => {
      child.on("close", resolve);
    });

    if (exitCode !== 0) {
      throw new Error(`[D-Extractor] FFmpeg exited with code ${exitCode}`);
    }

    if (buffer.length > 0) {
      throw new Error(
        `[D-Extractor] FATAL: Leftover bytes in pipe (${buffer.length}). Stream was not aligned to frame size (${frameSize}).`
      );
    }

    if (framesYielded !== probe.timestamps.length) {
      throw new Error(
        `[D-Extractor] FATAL: Frame count mismatch! Extracted ${framesYielded} frames, but ffprobe reported ${probe.timestamps.length}.`
      );
    }

    console.log(
      `[D-Extractor] EXTRACTION SUCCESS: ${framesYielded}/${probe.timestamps.length} frames perfectly aligned.`
    );
  }
}
