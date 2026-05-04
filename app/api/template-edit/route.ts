/**
 * POST /api/template-edit
 *
 * Template-based video editing endpoint (CapCut-style).
 * 
 * 1. Extract template from reference video OR use pre-built template
 * 2. Apply template to target video
 * 3. Return result
 *
 * Body: multipart/form-data
 *   Required fields:
 *     - "target"  — target video file to edit
 *   Optional fields:
 *     - "reference" — reference video to extract template from
 *     - "templateId" — use pre-built template instead of extracting
 *     - "strategy" — "proportional" (default) | "beat_sync" | "shot_match"
 *     - "outputMode" — "json" (default) | "video" | "both"
 */

import * as fs from "node:fs";
import { type NextRequest, NextResponse } from "next/server";
import { TemplateExtractor } from "../../../server/template/extractor";
import { TemplateApplier } from "../../../server/template/applier";
import {
  TRANSITION_LIBRARY,
  FILTER_LIBRARY,
  LUT_LIBRARY,
} from "../../../server/template";
import type { EditingTemplate, ApplyOptions } from "../../../server/template/types";
import { writeTempFile, makeTempDir, cleanTempDir } from "../../../server/utils/ffmpeg";

export const dynamic = "force-dynamic";
export const maxDuration = 600; // 10 min timeout

export async function POST(req: NextRequest) {
  const t0 = performance.now();

  try {
    // Parse form data
    const form = await req.formData();

    const targetFile = form.get("target");
    const referenceFile = form.get("reference");
    const templateId = form.get("templateId")?.toString();

    if (!targetFile || !(targetFile instanceof File) || targetFile.size === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing or empty "target" video file.' },
        { status: 400 }
      );
    }

    const targetBuffer = Buffer.from(await targetFile.arrayBuffer());

    // Parse options
    const options: ApplyOptions = {};

    const strategyRaw = form.get("strategy");
    if (
      typeof strategyRaw === "string" &&
      ["proportional", "beat_sync", "shot_match", "content_aware"].includes(strategyRaw)
    ) {
      options.strategy = strategyRaw as ApplyOptions["strategy"];
    }

    const outputMode = form.get("outputMode")?.toString() || "both";

    // Create temp directory
    const tmp = makeTempDir("template-edit");

    try {
      // Write target video
      const targetPath = await writeTempFile(tmp, "target.mp4", targetBuffer);

      let template: EditingTemplate;

      // Case 1: Use pre-built template by ID
      if (templateId) {
        console.log(`[template-edit] Using pre-built template: ${templateId}`);
        template = await loadPrebuiltTemplate(templateId);
      }
      // Case 2: Extract template from reference video
      else if (referenceFile && referenceFile instanceof File && referenceFile.size > 0) {
        console.log("[template-edit] Extracting template from reference video...");
        const referenceBuffer = Buffer.from(await referenceFile.arrayBuffer());
        const refPath = await writeTempFile(tmp, "reference.mp4", referenceBuffer);

        template = await TemplateExtractor.extractTemplate(refPath, {
          name: referenceFile.name,
          detectTransitions: true,
          detectSpeed: true,
          detectFilters: true,
          detectBeats: true,
        });
      } else {
        return NextResponse.json(
          { success: false, error: 'Provide either "reference" video or "templateId".' },
          { status: 400 }
        );
      }

      // Apply template to target
      console.log(`[template-edit] Applying template ${template.templateId} to target...`);
      const result = await TemplateApplier.applyTemplate(template, targetPath, options);

      const totalMs = Math.round(performance.now() - t0);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || "Template application failed",
            timing: { totalMs },
          },
          { status: 500 }
        );
      }

      // Build response
      const response: Record<string, any> = {
        success: true,

        template: {
          templateId: template.templateId,
          name: template.name,
          sourceDuration: template.sourceDuration,
          eventCount: template.timeline.length,
        },

        result: {
          outputPath: result.outputPath,
          videoUrl: result.videoUrl,
          outputDuration: result.outputDuration,
          outputSizeBytes: result.outputSizeBytes,
          appliedEvents: result.appliedEvents.filter(e => e.applied).length,
          totalEvents: result.appliedEvents.length,
        },

        timing: {
          totalMs,
          processingMs: result.processingMs,
        },
      };

      // Include video if requested
      if (outputMode === "both" || outputMode === "video") {
        if (result.outputPath && fs.existsSync(result.outputPath)) {
          const videoBuffer = await fs.promises.readFile(result.outputPath);
          response.videoBase64 = "data:video/mp4;base64," + videoBuffer.toString("base64");
        }
      }

      return NextResponse.json(response);

    } finally {
      cleanTempDir(tmp);
    }

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[template-edit] Error:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * Load a pre-built template by ID
 */
async function loadPrebuiltTemplate(templateId: string): Promise<EditingTemplate> {
  // Pre-built templates library
  const templates: Record<string, EditingTemplate> = {
    // Cinematic template
    cinematic: {
      templateId: "cinematic",
      name: "Cinematic",
      version: 1,
      createdAt: new Date().toISOString(),
      sourceDuration: 15,
      sourceResolution: { width: 1080, height: 1920 },
      sourceFps: 30,
      timeline: [
        {
          time_sec: 0,
          duration_sec: 0,
          type: "cut",
          params: {},
        },
        {
          time_sec: 0,
          duration_sec: 15,
          type: "filter",
          filterId: "lut_cinematic_teal_orange",
          params: { filterType: "lut" },
        },
        {
          time_sec: 3,
          duration_sec: 0.3,
          type: "transition",
          transitionId: "zoom_in_slow",
          params: { transitionType: "zoom_in" },
        },
        {
          time_sec: 7,
          duration_sec: 0.25,
          type: "transition",
          transitionId: "whip_right",
          params: { transitionType: "whip" },
        },
        {
          time_sec: 11,
          duration_sec: 0.5,
          type: "transition",
          transitionId: "cross_dissolve",
          params: { transitionType: "dissolve" },
        },
      ],
      assets: {
        transitions: Object.values(TRANSITION_LIBRARY),
        filters: Object.values(FILTER_LIBRARY),
        overlays: [],
        luts: Object.values(LUT_LIBRARY),
      },
    },

    // Fast cuts template (TikTok style)
    fast_cuts: {
      templateId: "fast_cuts",
      name: "Fast Cuts",
      version: 1,
      createdAt: new Date().toISOString(),
      sourceDuration: 10,
      sourceResolution: { width: 1080, height: 1920 },
      sourceFps: 30,
      timeline: [
        { time_sec: 0, duration_sec: 0, type: "cut", params: {} },
        { time_sec: 1.5, duration_sec: 0, type: "cut", params: {} },
        { time_sec: 2.8, duration_sec: 0.15, type: "transition", transitionId: "white_flash", params: { transitionType: "flash" } },
        { time_sec: 3.2, duration_sec: 0, type: "cut", params: {} },
        { time_sec: 4.5, duration_sec: 0, type: "cut", params: {} },
        { time_sec: 5.8, duration_sec: 0.15, type: "transition", transitionId: "glitch_digital", params: { transitionType: "glitch" } },
        { time_sec: 6.2, duration_sec: 0, type: "cut", params: {} },
        { time_sec: 7.5, duration_sec: 0, type: "cut", params: {} },
        { time_sec: 8.8, duration_sec: 0, type: "cut", params: {} },
      ],
      assets: {
        transitions: Object.values(TRANSITION_LIBRARY),
        filters: Object.values(FILTER_LIBRARY),
        overlays: [],
        luts: Object.values(LUT_LIBRARY),
      },
    },

    // Smooth zoom template
    smooth_zoom: {
      templateId: "smooth_zoom",
      name: "Smooth Zoom",
      version: 1,
      createdAt: new Date().toISOString(),
      sourceDuration: 12,
      sourceResolution: { width: 1080, height: 1920 },
      sourceFps: 30,
      timeline: [
        { time_sec: 0, duration_sec: 0, type: "cut", params: {} },
        {
          time_sec: 0,
          duration_sec: 12,
          type: "zoom",
          params: {},
          zoomParams: {
            scale: 1.3,
            centerX: 0.5,
            centerY: 0.5,
            easing: "easeInOut",
          },
        },
        {
          time_sec: 0,
          duration_sec: 12,
          type: "filter",
          filterId: "lut_modern_high_contrast",
          params: { filterType: "lut" },
        },
      ],
      assets: {
        transitions: Object.values(TRANSITION_LIBRARY),
        filters: Object.values(FILTER_LIBRARY),
        overlays: [],
        luts: Object.values(LUT_LIBRARY),
      },
    },

    // Beat sync template
    beat_sync: {
      templateId: "beat_sync",
      name: "Beat Sync",
      version: 1,
      createdAt: new Date().toISOString(),
      sourceDuration: 8,
      sourceResolution: { width: 1080, height: 1920 },
      sourceFps: 30,
      timeline: [
        { time_sec: 0, duration_sec: 0, type: "cut", params: {} },
        { time_sec: 1, duration_sec: 0.15, type: "transition", transitionId: "zoom_in_fast", params: { transitionType: "zoom_in" } },
        { time_sec: 2, duration_sec: 0.15, type: "transition", transitionId: "white_flash", params: { transitionType: "flash" } },
        { time_sec: 3, duration_sec: 0.15, type: "transition", transitionId: "zoom_out_fast", params: { transitionType: "zoom_out" } },
        { time_sec: 4, duration_sec: 0.15, type: "transition", transitionId: "glitch_rgb", params: { transitionType: "glitch" } },
        { time_sec: 5, duration_sec: 0.15, type: "transition", transitionId: "zoom_in_fast", params: { transitionType: "zoom_in" } },
        { time_sec: 6, duration_sec: 0.15, type: "transition", transitionId: "white_flash", params: { transitionType: "flash" } },
        { time_sec: 7, duration_sec: 0.15, type: "transition", transitionId: "zoom_out_fast", params: { transitionType: "zoom_out" } },
      ],
      assets: {
        transitions: Object.values(TRANSITION_LIBRARY),
        filters: Object.values(FILTER_LIBRARY),
        overlays: [],
        luts: Object.values(LUT_LIBRARY),
      },
    },

    // Vintage film template
    vintage_film: {
      templateId: "vintage_film",
      name: "Vintage Film",
      version: 1,
      createdAt: new Date().toISOString(),
      sourceDuration: 20,
      sourceResolution: { width: 1080, height: 1920 },
      sourceFps: 24,
      timeline: [
        { time_sec: 0, duration_sec: 0, type: "cut", params: {} },
        {
          time_sec: 0,
          duration_sec: 20,
          type: "filter",
          filterId: "lut_vintage_film",
          params: { filterType: "lut" },
        },
        {
          time_sec: 5,
          duration_sec: 0.5,
          type: "transition",
          transitionId: "light_leak",
          params: { transitionType: "fade" },
        },
        {
          time_sec: 10,
          duration_sec: 0.5,
          type: "transition",
          transitionId: "film_burn",
          params: { transitionType: "fade" },
        },
        {
          time_sec: 15,
          duration_sec: 0.5,
          type: "transition",
          transitionId: "light_leak",
          params: { transitionType: "fade" },
        },
      ],
      assets: {
        transitions: Object.values(TRANSITION_LIBRARY),
        filters: Object.values(FILTER_LIBRARY),
        overlays: [],
        luts: Object.values(LUT_LIBRARY),
      },
    },
  };

  const template = templates[templateId];
  if (!template) {
    throw new Error(`Unknown template ID: ${templateId}. Available: ${Object.keys(templates).join(", ")}`);
  }

  return template;
}
