/**
 * Template Extractor
 *
 * Extracts precise editing templates from reference videos.
 * Uses FFmpeg analysis + optional ML detection to identify:
 *   - Cut points (shot boundaries)
 *   - Transitions (zoom, flash, whip, etc.)
 *   - Speed changes
 *   - Color filters
 *   - Audio beats
 *
 * Output: EditingTemplate JSON that can be saved and reused.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import {
  cleanTempDir,
  execAsync,
  makeTempDir,
  probeVideo,
  resolveFfmpeg,
  safeExe,
} from "../utils/ffmpeg";
import type {
  EditingTemplate,
  TemplateEvent,
  TemplateAssets,
  CutDetection,
  FrameAnalysis,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const CONFIG = {
  // Shot detection
  minShotDuration: 0.5, // seconds
  cutThreshold: 0.3, // scene change threshold
  
  // Transition detection
  transitionWindow: 0.5, // seconds around cut to analyze
  zoomThreshold: 1.1, // scale change to detect zoom
  flashThreshold: 1.5, // brightness spike to detect flash
  
  // Speed detection
  speedWindow: 1.0, // seconds to analyze motion
  speedThreshold: 0.2, // relative speed change threshold
  
  // Beat detection
  beatWindow: 0.1, // seconds tolerance for beat alignment
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Extractor
// ─────────────────────────────────────────────────────────────────────────────

export class TemplateExtractor {
  /**
   * Extract a complete editing template from a reference video.
   */
  static async extractTemplate(
    videoPath: string,
    options: {
      name?: string;
      detectTransitions?: boolean;
      detectSpeed?: boolean;
      detectFilters?: boolean;
      detectBeats?: boolean;
    } = {}
  ): Promise<EditingTemplate> {
    const t0 = Date.now();
    
    console.log(`[TemplateExtractor] Extracting template from ${videoPath}`);
    
    // Step 1: Probe video
    const probe = await probeVideo(videoPath);
    console.log(`[TemplateExtractor] Video: ${probe.width}x${probe.height}, ${probe.duration}s, ${probe.fps}fps`);
    
    // Step 2: Detect cuts
    const cuts = await detectCuts(videoPath, probe.duration);
    console.log(`[TemplateExtractor] Detected ${cuts.length} cuts`);
    
    // Step 3: Analyze segments between cuts
    const events: TemplateEvent[] = [];
    
    // Add cut events
    for (const cut of cuts) {
      events.push({
        time_sec: cut.time_sec,
        duration_sec: 0,
        type: "cut",
        params: {
          confidence: cut.confidence,
          cutType: cut.type,
        },
      });
    }
    
    // Step 4: Detect transitions at cut points
    if (options.detectTransitions !== false) {
      const transitions = await detectTransitions(videoPath, cuts);
      events.push(...transitions);
      console.log(`[TemplateExtractor] Detected ${transitions.length} transitions`);
    }
    
    // Step 5: Detect speed changes
    if (options.detectSpeed !== false) {
      const speedEvents = await detectSpeedChanges(videoPath, cuts, probe.duration);
      events.push(...speedEvents);
      console.log(`[TemplateExtractor] Detected ${speedEvents.length} speed changes`);
    }
    
    // Step 6: Detect color filters
    if (options.detectFilters !== false) {
      const filterEvents = await detectFilters(videoPath, cuts, probe.duration);
      events.push(...filterEvents);
      console.log(`[TemplateExtractor] Detected ${filterEvents.length} filter changes`);
    }
    
    // Step 7: Sort events by time
    events.sort((a, b) => a.time_sec - b.time_sec);
    
    // Step 8: Build assets
    const assets: TemplateAssets = {
      transitions: [],
      filters: [],
      overlays: [],
      luts: [],
    };
    
    const template: EditingTemplate = {
      templateId: `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: options.name || `Template ${new Date().toLocaleDateString()}`,
      version: 1,
      createdAt: new Date().toISOString(),
      sourceDuration: probe.duration,
      sourceResolution: { width: probe.width, height: probe.height },
      sourceFps: probe.fps,
      timeline: events,
      assets,
    };
    
    console.log(`[TemplateExtractor] Template extracted in ${Date.now() - t0}ms`);
    console.log(`[TemplateExtractor] Total events: ${events.length}`);
    
    return template;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cut Detection
// ─────────────────────────────────────────────────────────────────────────────

async function detectCuts(
  videoPath: string,
  duration: number
): Promise<CutDetection[]> {
  const ffmpeg = await resolveFfmpeg();
  const exe = safeExe(ffmpeg);
  const tmp = makeTempDir("cut-detect");
  
  try {
    // Use FFmpeg scene detection
    const cmd = [
      exe,
      `-i "${videoPath}"`,
      `-vf "select='gt(scene,${CONFIG.cutThreshold})',showinfo"`,
      `-f null -`,
    ].join(" ");
    
    const { stderr } = await execAsync(cmd, { maxBuffer: 50 * 1024 * 1024 });
    
    const cuts: CutDetection[] = [];
    const lines = stderr.split("\n");
    
    for (const line of lines) {
      // Parse showinfo output for frame timestamps
      const ptsMatch = line.match(/pts:\s*(\d+)/);
      const timeMatch = line.match(/pts_time:\s*([\d.]+)/);
      const sceneMatch = line.match(/scene:\s*([\d.]+)/);
      
      if (timeMatch) {
        const time_sec = parseFloat(timeMatch[1]);
        const confidence = sceneMatch ? parseFloat(sceneMatch[1]) : 0.5;
        
        if (time_sec > 0.1 && time_sec < duration - 0.1) {
          cuts.push({
            frame: ptsMatch ? parseInt(ptsMatch[1]) : 0,
            time_sec,
            type: confidence > 0.7 ? "hard" : "soft",
            confidence,
            hasTransition: false,
          });
        }
      }
    }
    
    // De-duplicate cuts that are too close
    const deduped: CutDetection[] = [];
    let lastCut = -CONFIG.minShotDuration;
    
    for (const cut of cuts.sort((a, b) => a.time_sec - b.time_sec)) {
      if (cut.time_sec - lastCut >= CONFIG.minShotDuration) {
        deduped.push(cut);
        lastCut = cut.time_sec;
      }
    }
    
    return deduped;
    
  } finally {
    cleanTempDir(tmp);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Transition Detection
// ─────────────────────────────────────────────────────────────────────────══

async function detectTransitions(
  videoPath: string,
  cuts: CutDetection[]
): Promise<TemplateEvent[]> {
  const events: TemplateEvent[] = [];
  const ffmpeg = await resolveFfmpeg();
  const exe = safeExe(ffmpeg);
  
  for (const cut of cuts) {
    const window = CONFIG.transitionWindow;
    const startTime = Math.max(0, cut.time_sec - window / 2);
    
    // Extract frames around the cut for analysis
    const tmp = makeTempDir("transition-detect");
    
    try {
      // Sample frames at the cut point
      const cmd = [
        exe,
        `-ss ${startTime.toFixed(3)}`,
        `-t ${window.toFixed(3)}`,
        `-i "${videoPath}"`,
        `-vf "fps=10,scale=320:-2"`,
        `-f rawvideo -pix_fmt rgb24`,
        `"${tmp}/frames.raw"`,
      ].join(" ");
      
      await execAsync(cmd, { maxBuffer: 100 * 1024 * 1024 }).catch(() => {});
      
      // Analyze the frames for transition types
      // This is a simplified version - in production, use ML classification
      const transitionType = classifyTransition(cut);
      
      if (transitionType) {
        events.push({
          time_sec: cut.time_sec,
          duration_sec: 0.3,
          type: "transition",
          transitionId: transitionType,
          params: {
            transitionType,
            confidence: cut.confidence,
          },
        });
        
        // Mark cut as having transition
        cut.hasTransition = true;
        cut.transitionType = transitionType;
      }
    } finally {
      cleanTempDir(tmp);
    }
  }
  
  return events;
}

function classifyTransition(cut: CutDetection): string | null {
  // Simple heuristic-based classification
  // In production, use a trained classifier on frame data
  
  if (cut.confidence > 0.8) {
    return "zoom_in_fast";
  } else if (cut.confidence > 0.6) {
    return "whip_right";
  } else if (cut.confidence > 0.4) {
    return "cross_dissolve";
  }
  
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Speed Change Detection
// ─────────────────────────────────────────────────────────────────────────────

async function detectSpeedChanges(
  videoPath: string,
  cuts: CutDetection[],
  duration: number
): Promise<TemplateEvent[]> {
  const events: TemplateEvent[] = [];
  
  // Create segments between cuts
  const segments: { start: number; end: number }[] = [];
  let prev = 0;
  
  for (const cut of cuts) {
    if (cut.time_sec - prev > CONFIG.minShotDuration) {
      segments.push({ start: prev, end: cut.time_sec });
    }
    prev = cut.time_sec;
  }
  
  if (duration - prev > CONFIG.minShotDuration) {
    segments.push({ start: prev, end: duration });
  }
  
  // Analyze motion in each segment
  for (const segment of segments) {
    const speed = await analyzeSegmentSpeed(videoPath, segment.start, segment.end);
    
    if (Math.abs(speed - 1.0) > CONFIG.speedThreshold) {
      events.push({
        time_sec: segment.start,
        duration_sec: segment.end - segment.start,
        type: "speed",
        params: {
          speed,
          originalDuration: segment.end - segment.start,
        },
        speedCurve: {
          points: [
            { time_sec: 0, speed: 1.0 },
            { time_sec: (segment.end - segment.start) / 2, speed },
            { time_sec: segment.end - segment.start, speed: 1.0 },
          ],
          easing: "easeInOut",
          maintainPitch: true,
        },
      });
    }
  }
  
  return events;
}

async function analyzeSegmentSpeed(
  videoPath: string,
  start: number,
  end: number
): Promise<number> {
  const ffmpeg = await resolveFfmpeg();
  const exe = safeExe(ffmpeg);
  const tmp = makeTempDir("speed-detect");
  
  try {
    // Use motion vectors to estimate speed
    const cmd = [
      exe,
      `-ss ${start.toFixed(3)}`,
      `-t ${(end - start).toFixed(3)}`,
      `-i "${videoPath}"`,
      `-vf "mestimate,metadata=print:file=-"`,
      `-f null -`,
    ].join(" ");
    
    const { stderr } = await execAsync(cmd, { maxBuffer: 50 * 1024 * 1024 });
    
    // Parse motion vector magnitudes
    const motionValues: number[] = [];
    const lines = stderr.split("\n");
    
    for (const line of lines) {
      const match = line.match(/lavfi\.motion\.magnitude=(\d+\.?\d*)/);
      if (match) {
        motionValues.push(parseFloat(match[1]));
      }
    }
    
    if (motionValues.length === 0) return 1.0;
    
    const avgMotion = motionValues.reduce((a, b) => a + b, 0) / motionValues.length;
    
    // Compare to expected motion (this is simplified)
    // In production, compare against a baseline
    const expectedMotion = 10; // arbitrary baseline
    const speed = Math.min(4.0, Math.max(0.25, avgMotion / expectedMotion));
    
    return speed;
    
  } finally {
    cleanTempDir(tmp);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Filter Detection
// ─────────────────────────────────────────────────────────────────────────────

async function detectFilters(
  videoPath: string,
  cuts: CutDetection[],
  duration: number
): Promise<TemplateEvent[]> {
  const events: TemplateEvent[] = [];
  
  // Analyze color in each segment
  const segments: { start: number; end: number }[] = [];
  let prev = 0;
  
  for (const cut of cuts) {
    if (cut.time_sec - prev > CONFIG.minShotDuration) {
      segments.push({ start: prev, end: cut.time_sec });
    }
    prev = cut.time_sec;
  }
  
  if (duration - prev > CONFIG.minShotDuration) {
    segments.push({ start: prev, end: duration });
  }
  
  for (const segment of segments) {
    const colorProfile = await analyzeSegmentColor(videoPath, segment.start, segment.end);
    
    if (colorProfile) {
      events.push({
        time_sec: segment.start,
        duration_sec: segment.end - segment.start,
        type: "filter",
        filterId: colorProfile,
        params: {
          filterType: colorProfile,
        },
      });
    }
  }
  
  return events;
}

async function analyzeSegmentColor(
  videoPath: string,
  start: number,
  end: number
): Promise<string | null> {
  const ffmpeg = await resolveFfmpeg();
  const exe = safeExe(ffmpeg);
  const tmp = makeTempDir("color-detect");
  
  try {
    // Extract color statistics
    const cmd = [
      exe,
      `-ss ${start.toFixed(3)}`,
      `-t ${Math.min(2, end - start).toFixed(3)}`,
      `-i "${videoPath}"`,
      `-vf "signalstats,metadata=print:file=-"`,
      `-f null -`,
    ].join(" ");
    
    const { stderr } = await execAsync(cmd, { maxBuffer: 50 * 1024 * 1024 });
    
    // Parse color statistics
    const yavgMatch = stderr.match(/YAVG=(\d+\.?\d*)/);
    const satMatch = stderr.match(/SATAVG=(\d+\.?\d*)/);
    
    if (!yavgMatch || !satMatch) return null;
    
    const brightness = parseFloat(yavgMatch[1]) / 255;
    const saturation = parseFloat(satMatch[1]) / 100;
    
    // Classify color profile
    if (saturation < 0.3) {
      return "lut_modern_muted";
    } else if (brightness > 0.6 && saturation > 0.8) {
      return "lut_modern_vibrant";
    } else if (brightness < 0.4) {
      return "lut_moody";
    } else if (saturation > 1.0) {
      return "lut_tropical";
    }
    
    return "lut_cinematic_warm";
    
  } finally {
    cleanTempDir(tmp);
  }
}
