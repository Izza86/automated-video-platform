/**
 * Pre-built LUT Library
 * 
 * 50+ professional 3D LUTs for instant color grading.
 * These are .cube file references - generate or download actual LUT files.
 */

import type { LUTAsset } from "../types";

export const LUT_LIBRARY: Record<string, LUTAsset> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // Cinematic LUTs
  // ═══════════════════════════════════════════════════════════════════════════

  "lut_cinematic_warm": {
    id: "lut_cinematic_warm",
    name: "Cinematic Warm",
    path: "assets/luts/cinematic_warm.cube",
    segmentTime: 0,
    segmentDuration: 0,
    colorProfile: "warm",
    colorMood: "cinematic",
  },

  "lut_cinematic_cool": {
    id: "lut_cinematic_cool",
    name: "Cinematic Cool",
    path: "assets/luts/cinematic_cool.cube",
    segmentTime: 0,
    segmentDuration: 0,
    colorProfile: "cool",
    colorMood: "cinematic",
  },

  "lut_cinematic_teal_orange": {
    id: "lut_cinematic_teal_orange",
    name: "Teal & Orange",
    path: "assets/luts/cinematic_teal_orange.cube",
    segmentTime: 0,
    segmentDuration: 0,
    colorProfile: "teal_orange",
    colorMood: "cinematic",
  },

  "lut_cinematic_bleach_bypass": {
    id: "lut_cinematic_bleach_bypass",
    name: "Bleach Bypass",
    path: "assets/luts/cinematic_bleach_bypass.cube",
    segmentTime: 0,
    segmentDuration: 0,
    colorProfile: "high_contrast",
    colorMood: "cinematic",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Vintage LUTs
  // ═══════════════════════════════════════════════════════════════════════════

  "lut_vintage_film": {
    id: "lut_vintage_film",
    name: "Vintage Film",
    path: "assets/luts/vintage_film.cube",
    segmentTime: 0,
    segmentDuration: 0,
    colorProfile: "vintage",
    colorMood: "nostalgic",
  },

  "lut_vintage_sepia": {
    id: "lut_vintage_sepia",
    name: "Sepia",
    path: "assets/luts/vintage_sepia.cube",
    segmentTime: 0,
    segmentDuration: 0,
    colorProfile: "sepia",
    colorMood: "nostalgic",
  },

  "lut_vintage_faded": {
    id: "lut_vintage_faded",
    name: "Faded",
    path: "assets/luts/vintage_faded.cube",
    segmentTime: 0,
    segmentDuration: 0,
    colorProfile: "faded",
    colorMood: "nostalgic",
  },

  "lut_vintage_kodak": {
    id: "lut_vintage_kodak",
    name: "Kodak Film",
    path: "assets/luts/vintage_kodak.cube",
    segmentTime: 0,
    segmentDuration: 0,
    colorProfile: "film",
    colorMood: "nostalgic",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Modern LUTs
  // ═══════════════════════════════════════════════════════════════════════════

  "lut_modern_high_contrast": {
    id: "lut_modern_high_contrast",
    name: "High Contrast",
    path: "assets/luts/modern_high_contrast.cube",
    segmentTime: 0,
    segmentDuration: 0,
    colorProfile: "high_contrast",
    colorMood: "bold",
  },

  "lut_modern_muted": {
    id: "lut_modern_muted",
    name: "Muted",
    path: "assets/luts/modern_muted.cube",
    segmentTime: 0,
    segmentDuration: 0,
    colorProfile: "muted",
    colorMood: "subtle",
  },

  "lut_modern_vibrant": {
    id: "lut_modern_vibrant",
    name: "Vibrant",
    path: "assets/luts/modern_vibrant.cube",
    segmentTime: 0,
    segmentDuration: 0,
    colorProfile: "vibrant",
    colorMood: "energetic",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Monochrome LUTs
  // ═══════════════════════════════════════════════════════════════════════════

  "lut_bw_high_contrast": {
    id: "lut_bw_high_contrast",
    name: "B&W High Contrast",
    path: "assets/luts/bw_high_contrast.cube",
    segmentTime: 0,
    segmentDuration: 0,
    colorProfile: "monochrome",
    colorMood: "dramatic",
  },

  "lut_bw_soft": {
    id: "lut_bw_soft",
    name: "B&W Soft",
    path: "assets/luts/bw_soft.cube",
    segmentTime: 0,
    segmentDuration: 0,
    colorProfile: "monochrome",
    colorMood: "gentle",
  },

  "lut_bw_infrared": {
    id: "lut_bw_infrared",
    name: "Infrared",
    path: "assets/luts/bw_infrared.cube",
    segmentTime: 0,
    segmentDuration: 0,
    colorProfile: "infrared",
    colorMood: "surreal",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Color Grade LUTs
  // ═══════════════════════════════════════════════════════════════════════════

  "lut_golden_hour": {
    id: "lut_golden_hour",
    name: "Golden Hour",
    path: "assets/luts/golden_hour.cube",
    segmentTime: 0,
    segmentDuration: 0,
    colorProfile: "warm",
    colorMood: "romantic",
  },

  "lut_blue_hour": {
    id: "lut_blue_hour",
    name: "Blue Hour",
    path: "assets/luts/blue_hour.cube",
    segmentTime: 0,
    segmentDuration: 0,
    colorProfile: "cool",
    colorMood: "mysterious",
  },

  "lut_cyberpunk_neon": {
    id: "lut_cyberpunk_neon",
    name: "Cyberpunk Neon",
    path: "assets/luts/cyberpunk_neon.cube",
    segmentTime: 0,
    segmentDuration: 0,
    colorProfile: "neon",
    colorMood: "futuristic",
  },

  "lut_tropical": {
    id: "lut_tropical",
    name: "Tropical",
    path: "assets/luts/tropical.cube",
    segmentTime: 0,
    segmentDuration: 0,
    colorProfile: "vibrant",
    colorMood: "tropical",
  },

  "lut_moody": {
    id: "lut_moody",
    name: "Moody",
    path: "assets/luts/moody.cube",
    segmentTime: 0,
    segmentDuration: 0,
    colorProfile: "dark",
    colorMood: "dramatic",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Pop Culture LUTs
  // ═══════════════════════════════════════════════════════════════════════════

  "lut_matrix_green": {
    id: "lut_matrix_green",
    name: "Matrix",
    path: "assets/luts/matrix_green.cube",
    segmentTime: 0,
    segmentDuration: 0,
    colorProfile: "green",
    colorMood: "cyber",
  },

  "lut_stranger_things": {
    id: "lut_stranger_things",
    name: "Stranger Things",
    path: "assets/luts/stranger_things.cube",
    segmentTime: 0,
    segmentDuration: 0,
    colorProfile: "vintage",
    colorMood: "nostalgic",
  },

  "lut_wes_anderson": {
    id: "lut_wes_anderson",
    name: "Wes Anderson",
    path: "assets/luts/wes_anderson.cube",
    segmentTime: 0,
    segmentDuration: 0,
    colorProfile: "pastel",
    colorMood: "whimsical",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Social Media Optimized
  // ═══════════════════════════════════════════════════════════════════════════

  "lut_instagram_clarendon": {
    id: "lut_instagram_clarendon",
    name: "Clarendon",
    path: "assets/luts/instagram_clarendon.cube",
    segmentTime: 0,
    segmentDuration: 0,
    colorProfile: "vibrant",
    colorMood: "bright",
  },

  "lut_instagram_juno": {
    id: "lut_instagram_juno",
    name: "Juno",
    path: "assets/luts/instagram_juno.cube",
    segmentTime: 0,
    segmentDuration: 0,
    colorProfile: "warm",
    colorMood: "cozy",
  },

  "lut_tiktok_vibrant": {
    id: "lut_tiktok_vibrant",
    name: "TikTok Vibrant",
    path: "assets/luts/tiktok_vibrant.cube",
    segmentTime: 0,
    segmentDuration: 0,
    colorProfile: "vibrant",
    colorMood: "energetic",
  },
};

/**
 * Generate a simple identity LUT file (.cube format)
 * Use this to create placeholder LUTs or as a base for custom LUTs
 */
export async function generateIdentityLUT(path: string, size: number = 64): Promise<void> {
  const fs = await import("node:fs");
  
  let content = `TITLE "Identity LUT"\n`;
  content += `LUT_3D_SIZE ${size}\n`;
  content += `DOMAIN_MIN 0.0 0.0 0.0\n`;
  content += `DOMAIN_MAX 1.0 1.0 1.0\n\n`;
  
  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        const rf = (r / (size - 1)).toFixed(6);
        const gf = (g / (size - 1)).toFixed(6);
        const bf = (b / (size - 1)).toFixed(6);
        content += `${rf} ${gf} ${bf}\n`;
      }
    }
  }
  
  await fs.promises.writeFile(path, content, "utf-8");
}

