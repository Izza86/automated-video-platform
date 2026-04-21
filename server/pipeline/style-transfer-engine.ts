import type { FrameDNA } from "./dna-analyzer";

/**
 * Deterministic Style Transfer Engine
 * ───────────────────────────────────
 * Drives FFmpeg via DNA-derived metadata to precisely match reference style.
 */
export class StyleTransferEngine {
  /**
   * Implement 1D Histogram Matching (CDF Mapping).
   * Maps target intensitiy 'i' to reference intensity 'j' such that
   * their CDF values are as close as possible.
   */
  static matchCDF(targetCdf: number[], refCdf: number[]): number[] {
    const lut = new Array(256);
    let lastRefJ = 0;

    for (let i = 0; i < 256; i++) {
      const targetVal = targetCdf[i];
      let bestJ = lastRefJ;

      // Since CDFs are monotonic, we can just continue from where we left off
      for (let j = lastRefJ; j < 256; j++) {
        if (refCdf[j] >= targetVal) {
          bestJ = j;
          break;
        }
        bestJ = j;
      }
      lut[i] = bestJ;
      lastRefJ = bestJ;
    }
    return lut;
  }

  /**
   * Generate FFmpeg 'interpolation' or 'curves' or 'lut' style strings.
   * For production, we will generate a 'halve' or 'lut3d' or use a sidecar LUT.
   * Here we use the 'curves' filter as a proxy for the 1D mapping.
   */
  static generateColorFilter(
    targetDNA: FrameDNA,
    referenceDNA: FrameDNA
  ): string {
    const rLut = StyleTransferEngine.matchCDF(
      targetDNA.color.cdf_rgb.r,
      referenceDNA.color.cdf_rgb.r
    );
    const gLut = StyleTransferEngine.matchCDF(
      targetDNA.color.cdf_rgb.g,
      referenceDNA.color.cdf_rgb.g
    );
    const bLut = StyleTransferEngine.matchCDF(
      targetDNA.color.cdf_rgb.b,
      referenceDNA.color.cdf_rgb.b
    );

    // Convert to FFmpeg curves format: r='0/0.1 0.5/0.6 1/0.9'
    // To keep the command length sane, we sample 16 points.
    const getCurve = (lut: number[]) => {
      const points: string[] = [];
      const steps = 16;
      for (let i = 0; i <= steps; i++) {
        const idx = Math.min(255, Math.round((i / steps) * 255));
        const src = (idx / 255).toFixed(3);
        const dst = (lut[idx] / 255).toFixed(3);
        points.push(`${src}/${dst}`);
      }
      return points.join(" ");
    };

    const curvesStr = `curves=r='${getCurve(rLut)}':g='${getCurve(gLut)}':b='${getCurve(bLut)}'`;

    // Fail Fast: Color variation check
    let variation = 0;
    for (let i = 0; i < 256; i++) {
      variation +=
        Math.abs(rLut[i] - i) + Math.abs(gLut[i] - i) + Math.abs(bLut[i] - i);
    }
    if (variation < 40) {
      throw new Error(
        "[STRICT] FAIL: No color variation detected (target matches reference identically)."
      );
    }

    return curvesStr;
  }

  /**
   * Align target shots to reference shot rhythm.
   */
  static calculateShotAlignment(
    referenceShots: any,
    targetDuration: number,
    refDuration: number
  ): Array<{
    refStart: number;
    refEnd: number;
    targetStart: number;
    targetEnd: number;
  }> {
    if (
      !(referenceShots && referenceShots.hardCuts)
    ) {
      throw new Error("[STRICT] FAIL: Reference shots data missing.");
    }

    // Allow 0 cuts for single-shot videos
    const timeScale = targetDuration / Math.max(0.001, refDuration);
    const cuts = referenceShots.hardCuts
      .map((c: any) => c.time_sec)
      .sort((a: number, b: number) => a - b);

    // 0 cuts is valid for static/single-shot content
    // Skip advanced cut-based processing for single-shot videos

    const timeline = [0, ...cuts, refDuration];
    const segments = [];

    for (let i = 0; i < timeline.length - 1; i++) {
      const duration = timeline[i + 1] - timeline[i];
      if (duration < 0.1) continue;
      segments.push({
        refStart: timeline[i],
        refEnd: timeline[i + 1],
        targetStart: timeline[i] * timeScale,
        targetEnd: timeline[i + 1] * timeScale,
      });
    }

    return segments;
  }

  /**
   * Build the master FFmpeg filter graph for a deterministic transfer.
   */
  static buildFilterGraph(targetDNA: FrameDNA, referenceDNA: FrameDNA): string {
    const filters: string[] = [];

    // 1. Color Transfer (Computed from sample frames)
    const colorFilter = StyleTransferEngine.generateColorFilter(
      targetDNA,
      referenceDNA
    );
    filters.push(colorFilter);

    // 2. Motion Replication with Semantic Intensity Scaling
    const refZoom = referenceDNA.motion?.zoomSpeed ?? 1;
    const refEnergy = referenceDNA.motion?.meanMagnitude ?? 0;
    const targetEnergy = targetDNA.motion?.meanMagnitude ?? 0;

    // Intensity scaling allowed ONLY for realism (scale based on target energy)
    // Reduce intensity -> never remove (0.2x min limit)
    const intensityScale = Math.max(
      0.2,
      Math.min(1.5, targetEnergy / Math.max(0.01, refEnergy))
    );

    if (refZoom > 1.05) {
      const maxZoom = 1 + (1.5 - 1) * intensityScale;
      const zoomStep = 0.001 * intensityScale;
      filters.push(
        `zoompan=z='min(zoom+${zoomStep.toFixed(5)},${maxZoom.toFixed(2)})':d=1:s=1920x1080`
      );
    }

    return filters.join(",");
  }
}
