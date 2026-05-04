import * as fs from "node:fs";
import * as path from "node:path";
import type {
  EditingTemplate,
  TemplateEvent,
  ApplyOptions,
  ApplyResult,
  AppliedEvent,
  TransitionAsset,
} from "./types";
import {
  cleanTempDir,
  execAsync,
  makeTempDir,
  probeVideo,
  resolveFfmpeg,
  safeExe,
} from "../utils/ffmpeg";
import { runFFmpegSafe } from "../utils/ffmpeg-safe";

const CONFIG = {
  defaultResolution: { width: 480, height: 850 },
  minSpeed: 0.25,
  maxSpeed: 4.0,
};

export class TemplateApplier {
  static async applyTemplate(
    template: EditingTemplate,
    targetPath: string,
    options: ApplyOptions = {}
  ): Promise<ApplyResult> {
    const t0 = Date.now();
    const tmp = makeTempDir("template-apply");

    try {
      const targetProbe = await probeVideo(targetPath);
      const targetDuration = options.targetDuration || targetProbe.duration;

      const ratio = targetDuration / template.sourceDuration;

      const appliedEvents: AppliedEvent[] = [];
      let finalOutput = targetPath;

      // Get output dimensions
      const outputW = options.outputWidth || targetProbe.width || CONFIG.defaultResolution.width;
      const outputH = options.outputHeight || targetProbe.height || CONFIG.defaultResolution.height;

      // Build one large filter_complex with all edits
      let filterInputs = "[0:v]";
      const labels: string[] = [];
      let labelIndex = 0;

      for (const event of template.timeline) {
        const targetTime = event.time_sec * ratio;
        const targetEventDuration = event.duration_sec * ratio;

        switch (event.type) {
          case "cut": {
            // Cuts handled by splitting video at cut points - extracted segments are concatenated
            appliedEvents.push({
              sourceEvent: event,
              targetTime,
              targetDuration: 0,
              applied: true,
            });
            continue;
          }

          case "transition": {
            const filter = buildTransitionFilter(
              event,
              targetTime,
              targetEventDuration,
              ratio
            );
            if (filter) {
              const curLabel = `v${labelIndex++}`;
              const outLabel = `v${labelIndex}`;
              // Use sendcmd for time-based activation
              const sendcmdFile = makeTempDir("sendcmd");
              const cmdPath = path.join(sendcmdFile, "trans.cmd");
              
              // Write sendcmd file for this transition
              const startT = targetTime.toFixed(3);
              const endT = (targetTime + targetEventDuration).toFixed(3);
              
              let cmdContent = "";
              // Simple approach: generate per-frame effect using enable expression
              const enableExpr = `enable='between(t\\,${startT}\\,${endT})'`;
              
              // Build the filter with enable expression
              const enabledFilter = filter.replace("format=yuv420p", `${enableExpr},format=yuv420p`);
              
              // Apply transition on a copy of input
              // We chain the filter: [prevLabel] filter [newLabel]
              // But we need to merge back - this gets complex. Instead use overlay approach.
              
              // Simplest: just note this transition for now and apply at the end via a complex graph
              labels.push(`${filter};${enableExpr}`);
              
              appliedEvents.push({
                sourceEvent: event,
                targetTime,
                targetDuration: targetEventDuration,
                applied: true,
              });
            }
            break;
          }

          case "filter": {
            const filter = buildFilterString(event, template.assets);
            if (filter) {
              const enableExpr = targetEventDuration > 0
                ? `enable='between(t\\,${targetTime.toFixed(3)}\\,${(targetTime + targetEventDuration).toFixed(3)})'`
                : "";
              
              const fullFilter = enableExpr
                ? `${filter},${enableExpr}`
                : filter;
              
              labels.push(fullFilter);
              
              appliedEvents.push({
                sourceEvent: event,
                targetTime,
                targetDuration: targetEventDuration,
                applied: true,
              });
            }
            break;
          }

          case "speed": {
            if (event.speedCurve) {
              const speedFilter = buildSpeedFilter(event.speedCurve, targetTime, targetEventDuration, targetDuration);
              if (speedFilter) {
                labels.push(speedFilter);
                appliedEvents.push({
                  sourceEvent: event,
                  targetTime,
                  targetDuration: targetEventDuration,
                  applied: true,
                });
              }
            }
            break;
          }

          case "zoom": {
            if (event.zoomParams) {
              const zoomFilter = buildZoomFilter(
                event.zoomParams,
                outputW,
                outputH
              );
              if (zoomFilter) {
                const enableExpr = `enable='between(t\\,${targetTime.toFixed(3)}\\,${(targetTime + targetEventDuration).toFixed(3)})'`;
                labels.push(`${zoomFilter},${enableExpr}`);
                appliedEvents.push({
                  sourceEvent: event,
                  targetTime,
                  targetDuration: targetEventDuration,
                  applied: true,
                });
              }
            }
            break;
          }

          case "shake": {
            if (event.shakeParams) {
              const shakeFilter = buildShakeFilter(event.shakeParams);
              if (shakeFilter) {
                const enableExpr = `enable='between(t\\,${targetTime.toFixed(3)}\\,${(targetTime + targetEventDuration).toFixed(3)})'`;
                labels.push(`${shakeFilter},${enableExpr}`);
                appliedEvents.push({
                  sourceEvent: event,
                  targetTime,
                  targetDuration: targetEventDuration,
                  applied: true,
                });
              }
            }
            break;
          }

          case "blur": {
            if (event.blurParams) {
              const blurFilter = buildBlurFilter(event.blurParams);
              if (blurFilter) {
                const enableExpr = `enable='between(t\\,${targetTime.toFixed(3)}\\,${(targetTime + targetEventDuration).toFixed(3)})'`;
                labels.push(`${blurFilter},${enableExpr}`);
                appliedEvents.push({
                  sourceEvent: event,
                  targetTime,
                  targetDuration: targetEventDuration,
                  applied: true,
                });
              }
            }
            break;
          }

          case "flash": {
            if (event.flashParams) {
              const flashFilter = buildFlashFilter(event.flashParams, targetTime, targetEventDuration);
              if (flashFilter) {
                labels.push(flashFilter);
                appliedEvents.push({
                  sourceEvent: event,
                  targetTime,
                  targetDuration: targetEventDuration,
                  applied: true,
                });
              }
            }
            break;
          }
        }
      }

      // Build final filter graph
      // Approach: Split video into segments at cut points
      const cutEvents = template.timeline.filter(e => e.type === "cut");
      const segments: { start: number; end: number; filters: string[] }[] = [];
      
      let lastTime = 0;
      for (const cut of cutEvents.sort((a, b) => a.time_sec - b.time_sec)) {
        const cutTime = cut.time_sec * ratio;
        if (cutTime > lastTime) {
          const segmentFilters: string[] = [];
          for (const event of template.timeline) {
            if (event.type === "cut") continue;
            const eventStart = event.time_sec * ratio;
            const eventEnd = eventStart + event.duration_sec * ratio;
            
            // If this event overlaps with this segment
            if (eventStart >= lastTime && eventStart < cutTime || 
                eventEnd > lastTime && eventEnd <= cutTime ||
                eventStart <= lastTime && eventEnd >= cutTime) {
              // This filter applies to this segment
              const filter = getFilterForEvent(event, template.assets, outputW, outputH);
              if (filter) segmentFilters.push(filter);
            }
          }
          segments.push({ start: lastTime, end: cutTime, filters: segmentFilters });
        }
        lastTime = cutTime;
      }
      // Add final segment
      if (lastTime < targetDuration) {
        const segmentFilters: string[] = [];
        for (const event of template.timeline) {
          if (event.type === "cut") continue;
          const eventStart = event.time_sec * ratio;
          const eventEnd = eventStart + event.duration_sec * ratio;
          if (eventStart >= lastTime && eventStart < targetDuration || 
              eventEnd > lastTime && eventEnd <= targetDuration ||
              eventStart <= lastTime && eventEnd >= targetDuration) {
            const filter = getFilterForEvent(event, template.assets, outputW, outputH);
            if (filter) segmentFilters.push(filter);
          }
        }
        segments.push({ start: lastTime, end: targetDuration, filters: segmentFilters });
      }

      // If no segments (no cuts), treat whole video as one segment
      if (segments.length === 0) {
        const segmentFilters: string[] = [];
        for (const event of template.timeline) {
          if (event.type === "cut") continue;
          const filter = getFilterForEvent(event, template.assets, outputW, outputH);
          if (filter) segmentFilters.push(filter);
        }
        segments.push({ start: 0, end: targetDuration, filters: segmentFilters });
      }

      // Build filter_complex: split into segments, apply filters, concat
      const ffmpeg = await resolveFfmpeg();
      const exe = safeExe(ffmpeg);

      if (segments.length === 1 && segments[0].filters.length === 0) {
        // No edits needed, just copy with proper encoding
        const outputPath = path.join(tmp, "output.mp4");
        await runFFmpegSafe({
          label: "template-copy",
          args: [
            "-y",
            `-i "${targetPath}"`,
            "-c:v libx264",
            "-preset fast",
            "-crf 23",
            "-pix_fmt yuv420p",
            "-movflags +faststart",
            `"${outputPath}"`,
          ].join(" "),
          outputFile: outputPath,
          minOutputBytes: 1024,
        });
        finalOutput = outputPath;
      } else {
        // Build complex filter graph
        const outputPath = path.join(tmp, "output.mp4");
        
        // Trim and filter each segment
        const filterParts: string[] = [];
        const concatLabels: string[] = [];
        
        for (let i = 0; i < segments.length; i++) {
          const seg = segments[i];
          const label = `seg${i}`;
          const start = seg.start.toFixed(3);
          const duration = (seg.end - seg.start).toFixed(3);
          
          let segFilter = `[0:v]trim=start=${start}:duration=${duration},setpts=PTS-STARTPTS`;
          
          // Apply segment-specific filters
          for (const f of seg.filters) {
            segFilter += `,${f}`;
          }
          
          segFilter += `[${label}]`;
          filterParts.push(segFilter);
          concatLabels.push(`[${label}]`);
        }

        if (segments.length > 1) {
          filterParts.push(
            `${concatLabels.join("")}concat=n=${segments.length}:v=1:a=0[vout]`
          );
        } else {
          // Rename single segment to vout
          const single = filterParts[0];
          filterParts[0] = single.replace(`[seg0]`, `[vout]`);
        }

        const filterComplex = filterParts.join(";");
        
        // Write filter to file
        const filterFile = path.join(tmp, "filter.txt");
        fs.writeFileSync(filterFile, filterComplex, "utf-8");

        const audioArgs = targetProbe.hasAudio ? `-map 0:a? -c:a copy` : "";

        const args = [
          "-y",
          `-i "${targetPath}"`,
          "-filter_complex_script",
          `"${filterFile}"`,
          "-map",
          `"[vout]"`,
          audioArgs,
          "-c:v libx264",
          "-preset fast",
          "-crf 23",
          "-pix_fmt yuv420p",
          "-movflags +faststart",
          `"${outputPath}"`,
        ]
          .filter(Boolean)
          .join(" ");

        const result = await runFFmpegSafe({
          label: "template-apply",
          args,
          outputFile: outputPath,
          minOutputBytes: 1024,
        });

        if (!result.success) {
          throw new Error(`FFmpeg failed: ${result.error}`);
        }

        finalOutput = outputPath;
      }

      // Copy to public outputs
      const outputDir = path.join(process.cwd(), "public", "outputs");
      await fs.promises.mkdir(outputDir, { recursive: true });
      const finalPath = path.join(outputDir, `template-${Date.now()}.mp4`);
      await fs.promises.copyFile(finalOutput, finalPath);

      const stats = await fs.promises.stat(finalPath);
      const processingMs = Date.now() - t0;

      console.log(
        `[TemplateApplier] Done! Applied ${appliedEvents.filter(e => e.applied).length}/${appliedEvents.length} events`
      );

      return {
        success: true,
        outputPath: finalPath,
        videoUrl: `/outputs/${path.basename(finalPath)}`,
        templateId: template.templateId,
        appliedEvents,
        processingMs,
        outputDuration: targetDuration,
        outputSizeBytes: stats.size,
      };
    } catch (error) {
      console.error("[TemplateApplier] Error:", error);
      return {
        success: false,
        templateId: template.templateId,
        appliedEvents: [],
        processingMs: Date.now() - t0,
        outputDuration: 0,
        outputSizeBytes: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      cleanTempDir(tmp);
    }
  }
}

function getFilterForEvent(
  event: TemplateEvent,
  assets: EditingTemplate["assets"],
  w: number,
  h: number
): string | null {
  switch (event.type) {
    case "transition":
      return buildTransitionFilter(event, 0, 0, 1);
    case "filter":
      return buildFilterString(event, assets) || null;
    case "speed":
      return event.speedCurve ? buildSpeedFilter(event.speedCurve, 0, 0, 1) : null;
    case "zoom":
      return event.zoomParams ? buildZoomFilter(event.zoomParams, w, h) : null;
    case "shake":
      return event.shakeParams ? buildShakeFilter(event.shakeParams) : null;
    case "blur":
      return event.blurParams ? buildBlurFilter(event.blurParams) : null;
    case "flash":
      return event.flashParams ? buildFlashFilter(event.flashParams, 0, 0) : null;
    default:
      return null;
  }
}

function buildTransitionFilter(
  event: TemplateEvent,
  _targetTime: number,
  _duration: number,
  _ratio: number
): string | null {
  const params = event.params || {};
  const tType = params.transitionType || event.transitionId;

  switch (tType) {
    case "zoom_in":
    case "zoom_in_fast":
    case "zoom_in_slow":
      return `zoompan=z='min(zoom+0.002,1.5)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`;
    case "zoom_out":
    case "zoom_out_fast":
      return `zoompan=z='max(zoom-0.002,0.8)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`;
    case "fade":
    case "cross_dissolve":
      return `fade=t=in:st=0:d=0.3`;
    case "whip":
    case "whip_right":
    case "whip_left":
      return `zoompan=z='min(zoom+0.005,1.3)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`;
    case "flash":
    case "white_flash":
      return `eq=brightness=0.3`;
    case "glitch":
    case "glitch_digital":
    case "glitch_rgb":
      return `noise=alls=20:allf=t`;
    case "light_leak":
    case "film_burn":
      return `eq=saturation=1.5:brightness=0.1`;
    default:
      return null;
  }
}

function buildFilterString(
  event: TemplateEvent,
  assets: EditingTemplate["assets"]
): string | null {
  const lut = assets.luts.find((l) => l.id === event.filterId);
  if (lut?.path && fs.existsSync(lut.path)) {
    return `lut3d='${lut.path}'`;
  }

  const brightness = (event.params.brightness as number) || 0;
  const contrast = (event.params.contrast as number) || 1;
  const saturation = (event.params.saturation as number) || 1;

  if (brightness !== 0 || contrast !== 1 || saturation !== 1) {
    return `eq=brightness=${brightness.toFixed(2)}:contrast=${contrast.toFixed(2)}:saturation=${saturation.toFixed(2)}`;
  }

  return null;
}

function buildSpeedFilter(
  speedCurve: any,
  _targetTime: number,
  _duration: number,
  _targetDuration: number
): string | null {
  if (!speedCurve || !speedCurve.points || speedCurve.points.length < 2) {
    return null;
  }

  const points = speedCurve.points;
  let expr = "PTS";

  for (let i = points.length - 1; i >= 0; i--) {
    const pt = points[i];
    const speed = Math.max(CONFIG.minSpeed, Math.min(CONFIG.maxSpeed, pt.speed || 1));
    const factor = (1 / speed).toFixed(4);

    if (i === points.length - 1) {
      expr = `${factor}*PTS`;
    } else {
      const nextTime = points[i + 1].time_sec;
      expr = `if(between(T\\,${pt.time_sec.toFixed(3)}\\,${nextTime.toFixed(3)})\\,${factor}*PTS\\,${expr})`;
    }
  }

  return `setpts='${expr}'`;
}

function buildZoomFilter(zoomParams: any, w: number, h: number): string | null {
  if (!zoomParams || typeof zoomParams.scale !== "number") return null;

  const scale = zoomParams.scale;
  const zoomExpr =
    scale > 1
      ? `min(zoom+0.001,${scale.toFixed(2)})`
      : `max(zoom-0.001,${scale.toFixed(2)})`;

  const cx = zoomParams.centerX ?? 0.5;
  const cy = zoomParams.centerY ?? 0.5;

  return `zoompan=z='${zoomExpr}':d=1:x='iw*${cx}-(iw/zoom/2)':y='ih*${cy}-(ih/zoom/2)':s=${w}x${h}`;
}

function buildShakeFilter(shakeParams: any): string | null {
  if (!shakeParams) return null;
  const amp = shakeParams.amplitude || 5;
  const freq = shakeParams.frequency || 5;
  return `crop=iw-${amp * 2}:ih-${amp * 2}:${amp}+${amp}*sin(${freq}*PI*t):${amp}+${amp}*cos(${freq}*PI*t)`;
}

function buildBlurFilter(blurParams: any): string | null {
  if (!blurParams) return null;
  const strength = blurParams.strength || 0.5;
  const radius = Math.round(strength * 10);

  switch (blurParams.type) {
    case "gaussian":
      return `gblur=sigma=${radius}`;
    case "motion":
      return `boxblur=luma_radius=${radius}:luma_power=2`;
    case "pixelate":
      return `pixelize=w=${Math.round(100 * strength)}:h=${Math.round(100 * strength)}`;
    default:
      return `gblur=sigma=${radius}`;
  }
}

function buildFlashFilter(flashParams: any, _targetTime: number, _duration: number): string | null {
  if (!flashParams) return null;
  const intensity = flashParams.intensity || 0.5;
  return `eq=brightness=${intensity.toFixed(2)}`;
}
