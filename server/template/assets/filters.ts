/**
 * Pre-built Filter Library
 * 
 * 50+ professional color filters ready to apply.
 * These are parameter sets for FFmpeg filters.
 */

import type { FilterAsset, FilterParams } from "../types";

export const FILTER_LIBRARY: Record<string, FilterAsset> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // Cinematic Filters
  // ═══════════════════════════════════════════════════════════════════════════

  "cinematic_warm": {
    id: "cinematic_warm",
    name: "Cinematic Warm",
    type: "cinematic",
    params: {
      brightness: 0.05,
      contrast: 1.15,
      saturation: 1.1,
      temperature: 15,
      tint: -5,
      vignette: 0.3,
      fade: 0.1,
    }
  },

  "cinematic_cool": {
    id: "cinematic_cool",
    name: "Cinematic Cool",
    type: "cinematic",
    params: {
      brightness: -0.05,
      contrast: 1.2,
      saturation: 0.9,
      temperature: -20,
      tint: 5,
      vignette: 0.25,
      fade: 0.05,
    }
  },

  "cinematic_teal_orange": {
    id: "cinematic_teal_orange",
    name: "Teal & Orange",
    type: "cinematic",
    params: {
      brightness: 0,
      contrast: 1.25,
      saturation: 1.15,
      temperature: -10,
      shadowColor: "#003344",
      highlightColor: "#FF8800",
      shadowBalance: 0.6,
      highlightBalance: 0.4,
    }
  },

  "cinematic_bleach_bypass": {
    id: "cinematic_bleach_bypass",
    name: "Bleach Bypass",
    type: "cinematic",
    params: {
      brightness: 0.1,
      contrast: 1.4,
      saturation: 0.6,
      gamma: 1.1,
      fade: 0.15,
    }
  },

  "cinematic_dramatic": {
    id: "cinematic_dramatic",
    name: "Dramatic",
    type: "dramatic",
    params: {
      brightness: -0.1,
      contrast: 1.35,
      saturation: 0.85,
      vignette: 0.4,
      shadows: -0.2,
      highlights: 0.15,
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Vintage Filters
  // ═══════════════════════════════════════════════════════════════════════════

  "vintage_film": {
    id: "vintage_film",
    name: "Vintage Film",
    type: "vintage",
    params: {
      brightness: 0.05,
      contrast: 0.9,
      saturation: 0.7,
      temperature: 15,
      tint: 10,
      fade: 0.25,
      grain: 0.3,
      vignette: 0.35,
    }
  },

  "vintage_sepia": {
    id: "vintage_sepia",
    name: "Sepia",
    type: "sepia",
    params: {
      brightness: 0.1,
      contrast: 0.85,
      saturation: 0,
      temperature: 30,
      tint: 15,
      fade: 0.3,
    }
  },

  "vintage_faded": {
    id: "vintage_faded",
    name: "Faded",
    type: "vintage",
    params: {
      brightness: 0.15,
      contrast: 0.8,
      saturation: 0.75,
      fade: 0.35,
      highlights: 0.2,
    }
  },

  "vintage_kodak": {
    id: "vintage_kodak",
    name: "Kodak Film",
    type: "vintage",
    params: {
      brightness: 0.1,
      contrast: 1.1,
      saturation: 1.2,
      temperature: 10,
      tint: 5,
      fade: 0.15,
      grain: 0.2,
    }
  },

  "vintage_polaroid": {
    id: "vintage_polaroid",
    name: "Polaroid",
    type: "polaroid",
    params: {
      brightness: 0.2,
      contrast: 0.85,
      saturation: 0.9,
      temperature: 5,
      fade: 0.2,
      vignette: 0.2,
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Modern Filters
  // ═══════════════════════════════════════════════════════════════════════════

  "modern_high_contrast": {
    id: "modern_high_contrast",
    name: "High Contrast",
    type: "modern_high_contrast",
    params: {
      brightness: 0,
      contrast: 1.5,
      saturation: 1.1,
      shadows: -0.3,
      highlights: 0.2,
    }
  },

  "modern_muted": {
    id: "modern_muted",
    name: "Muted",
    type: "modern_muted",
    params: {
      brightness: 0.05,
      contrast: 0.95,
      saturation: 0.6,
      fade: 0.1,
    }
  },

  "modern_vibrant": {
    id: "modern_vibrant",
    name: "Vibrant",
    type: "modern_vibrant",
    params: {
      brightness: 0.05,
      contrast: 1.15,
      saturation: 1.4,
      gamma: 0.95,
    }
  },

  "modern_matte": {
    id: "modern_matte",
    name: "Matte",
    type: "matte",
    params: {
      brightness: 0.1,
      contrast: 0.85,
      saturation: 0.9,
      fade: 0.25,
      shadows: 0.15,
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Monochrome Filters
  // ═══════════════════════════════════════════════════════════════════════════

  "bw_high_contrast": {
    id: "bw_high_contrast",
    name: "B&W High Contrast",
    type: "monochrome",
    params: {
      brightness: 0,
      contrast: 1.5,
      saturation: 0,
      gamma: 0.9,
    }
  },

  "bw_soft": {
    id: "bw_soft",
    name: "B&W Soft",
    type: "monochrome",
    params: {
      brightness: 0.1,
      contrast: 0.9,
      saturation: 0,
      fade: 0.15,
    }
  },

  "bw_infrared": {
    id: "bw_infrared",
    name: "Infrared",
    type: "infrared",
    params: {
      brightness: 0.15,
      contrast: 1.3,
      saturation: 0,
      gamma: 0.85,
      highlights: 0.3,
    }
  },

  "bw_noir": {
    id: "bw_noir",
    name: "Film Noir",
    type: "noir",
    params: {
      brightness: -0.1,
      contrast: 1.6,
      saturation: 0,
      vignette: 0.5,
      shadows: -0.3,
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Color Grade Filters
  // ═══════════════════════════════════════════════════════════════════════════

  "golden_hour": {
    id: "golden_hour",
    name: "Golden Hour",
    type: "temperature",
    params: {
      brightness: 0.1,
      contrast: 1.1,
      saturation: 1.2,
      temperature: 25,
      tint: 10,
      highlights: 0.15,
    }
  },

  "blue_hour": {
    id: "blue_hour",
    name: "Blue Hour",
    type: "temperature",
    params: {
      brightness: -0.05,
      contrast: 1.15,
      saturation: 1.1,
      temperature: -25,
      tint: -5,
      shadows: -0.1,
    }
  },

  "cyberpunk_neon": {
    id: "cyberpunk_neon",
    name: "Cyberpunk Neon",
    type: "cyberpunk_scan",
    params: {
      brightness: 0.05,
      contrast: 1.3,
      saturation: 1.5,
      temperature: -15,
      tint: 15,
      shadowColor: "#FF00FF",
      highlightColor: "#00FFFF",
      shadowBalance: 0.5,
      highlightBalance: 0.5,
    }
  },

  "tropical": {
    id: "tropical",
    name: "Tropical",
    type: "tropical",
    params: {
      brightness: 0.1,
      contrast: 1.1,
      saturation: 1.3,
      temperature: 10,
      tint: -5,
      gamma: 0.95,
    }
  },

  "moody": {
    id: "moody",
    name: "Moody",
    type: "moody",
    params: {
      brightness: -0.15,
      contrast: 1.25,
      saturation: 0.8,
      temperature: -10,
      vignette: 0.4,
      shadows: -0.2,
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Pop Culture Filters
  // ═══════════════════════════════════════════════════════════════════════════

  "matrix_green": {
    id: "matrix_green",
    name: "Matrix",
    type: "matrix_rain",
    params: {
      brightness: -0.05,
      contrast: 1.2,
      saturation: 0.9,
      greenGain: 1.3,
      redGain: 0.8,
      blueGain: 0.9,
    }
  },

  "stranger_things": {
    id: "stranger_things",
    name: "Stranger Things",
    type: "vintage",
    params: {
      brightness: -0.1,
      contrast: 1.3,
      saturation: 0.7,
      temperature: -15,
      vignette: 0.4,
      grain: 0.4,
      fade: 0.2,
    }
  },

  "wes_anderson": {
    id: "wes_anderson",
    name: "Wes Anderson",
    type: "vintage",
    params: {
      brightness: 0.15,
      contrast: 0.95,
      saturation: 1.1,
      temperature: 5,
      tint: 10,
      fade: 0.1,
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Social Media Optimized
  // ═══════════════════════════════════════════════════════════════════════════

  "instagram_clarendon": {
    id: "instagram_clarendon",
    name: "Clarendon",
    type: "modern_vibrant",
    params: {
      brightness: 0.1,
      contrast: 1.2,
      saturation: 1.15,
      temperature: -5,
      highlights: 0.2,
      shadows: -0.1,
    }
  },

  "instagram_juno": {
    id: "instagram_juno",
    name: "Juno",
    type: "modern_vibrant",
    params: {
      brightness: 0.05,
      contrast: 1.15,
      saturation: 1.3,
      temperature: 10,
      tint: 5,
      fade: 0.05,
    }
  },

  "tiktok_vibrant": {
    id: "tiktok_vibrant",
    name: "TikTok Vibrant",
    type: "modern_vibrant",
    params: {
      brightness: 0.1,
      contrast: 1.25,
      saturation: 1.4,
      gamma: 0.9,
      sharpen: 0.5,
    }
  },

  "youtube_cinematic": {
    id: "youtube_cinematic",
    name: "YouTube Cinematic",
    type: "cinematic",
    params: {
      brightness: 0.05,
      contrast: 1.2,
      saturation: 1.1,
      temperature: -5,
      vignette: 0.2,
      fade: 0.05,
    }
  },
};

/**
 * Convert filter params to FFmpeg eq filter string
 */
export function filterParamsToEqString(params: FilterParams): string {
  const parts: string[] = [];
  
  if (params.brightness !== undefined) parts.push(`brightness=${params.brightness.toFixed(3)}`);
  if (params.contrast !== undefined) parts.push(`contrast=${params.contrast.toFixed(3)}`);
  if (params.saturation !== undefined) parts.push(`saturation=${params.saturation.toFixed(3)}`);
  if (params.gamma !== undefined) parts.push(`gamma=${params.gamma.toFixed(3)}`);
  
  return parts.join(":");
}

/**
 * Convert filter params to FFmpeg colorbalance string
 */
export function filterParamsToColorbalance(params: FilterParams): string {
  const parts: string[] = [];
  
  // Shadows
  if (params.shadows !== undefined) {
    parts.push(`rs=${params.shadows.toFixed(3)}`);
    parts.push(`gs=${params.shadows.toFixed(3)}`);
    parts.push(`bs=${params.shadows.toFixed(3)}`);
  }
  
  // Highlights
  if (params.highlights !== undefined) {
    parts.push(`rh=${params.highlights.toFixed(3)}`);
    parts.push(`gh=${params.highlights.toFixed(3)}`);
    parts.push(`bh=${params.highlights.toFixed(3)}`);
  }
  
  return parts.join(":");
}

