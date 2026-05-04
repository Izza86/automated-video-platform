/**
 * Pre-built Transition Library
 *
 * 50+ professional transitions ready to apply.
 * These can be pre-rendered videos or FFmpeg filter definitions.
 */

import type { TransitionAsset } from "../types";

export const TRANSITION_LIBRARY: Record<string, TransitionAsset> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // Zoom Transitions
  // ═══════════════════════════════════════════════════════════════════════════

  zoom_in_fast: {
    id: "zoom_in_fast",
    name: "Zoom In Fast",
    type: "zoom_in_fast",
    duration: 0.3,
    params: {
      zoomStart: 1.0,
      zoomEnd: 1.5,
      duration: 0.3,
      easing: "easeOut",
    },
  },

  zoom_in_slow: {
    id: "zoom_in_slow",
    name: "Zoom In Slow",
    type: "zoom_in",
    duration: 0.6,
    params: {
      zoomStart: 1.0,
      zoomEnd: 1.3,
      duration: 0.6,
      easing: "easeInOut",
    },
  },

  zoom_out_fast: {
    id: "zoom_out_fast",
    name: "Zoom Out Fast",
    type: "zoom_out",
    duration: 0.3,
    params: {
      zoomStart: 1.5,
      zoomEnd: 1.0,
      duration: 0.3,
      easing: "easeIn",
    },
  },

  zoom_out_slow: {
    id: "zoom_out_slow",
    name: "Zoom Out Slow",
    type: "zoom_out",
    duration: 0.5,
    params: {
      zoomStart: 1.3,
      zoomEnd: 1.0,
      duration: 0.5,
      easing: "easeInOut",
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Whip/Pan Transitions
  // ═══════════════════════════════════════════════════════════════════════════

  whip_left: {
    id: "whip_left",
    name: "Whip Pan Left",
    type: "whip_left",
    duration: 0.25,
    params: {
      blurAmount: 20,
      direction: "left",
      duration: 0.25,
      easing: "easeIn",
    },
  },

  whip_right: {
    id: "whip_right",
    name: "Whip Pan Right",
    type: "whip_right",
    duration: 0.25,
    params: {
      blurAmount: 20,
      direction: "right",
      duration: 0.25,
      easing: "easeIn",
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Flash Transitions
  // ═══════════════════════════════════════════════════════════════════════════

  white_flash: {
    id: "white_flash",
    name: "White Flash",
    type: "white_flash",
    duration: 0.15,
    params: {
      peakBrightness: 3.0,
      flashColor: "#FFFFFF",
      duration: 0.15,
      easing: "easeOut",
    },
  },

  color_flash_pink: {
    id: "color_flash_pink",
    name: "Pink Flash",
    type: "color_flash",
    duration: 0.15,
    params: {
      peakBrightness: 2.5,
      flashColor: "#FF00FF",
      duration: 0.15,
      easing: "easeOut",
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Glitch Transitions
  // ═══════════════════════════════════════════════════════════════════════════

  glitch_digital: {
    id: "glitch_digital",
    name: "Digital Glitch",
    type: "glitch_digital",
    duration: 0.3,
    params: {
      blockSize: 20,
      rgbSplit: 10,
      chromaticAberration: true,
      duration: 0.3,
      easing: "linear",
    },
  },

  glitch_rgb: {
    id: "glitch_rgb",
    name: "RGB Split Glitch",
    type: "glitch_rgb",
    duration: 0.2,
    params: {
      rgbSplit: 20,
      chromaticAberration: true,
      duration: 0.2,
      easing: "easeIn",
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Blur Transitions
  // ═══════════════════════════════════════════════════════════════════════════

  blur_radial_in: {
    id: "blur_radial_in",
    name: "Radial Blur In",
    type: "blur_radial_in",
    duration: 0.4,
    params: {
      blurStart: 0,
      blurEnd: 15,
      blurType: "radial",
      duration: 0.4,
      easing: "easeIn",
    },
  },

  blur_radial_out: {
    id: "blur_radial_out",
    name: "Radial Blur Out",
    type: "blur_radial_out",
    duration: 0.4,
    params: {
      blurStart: 15,
      blurEnd: 0,
      blurType: "radial",
      duration: 0.4,
      easing: "easeOut",
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Dissolve/Fade
  // ═══════════════════════════════════════════════════════════════════════════

  cross_dissolve: {
    id: "cross_dissolve",
    name: "Cross Dissolve",
    type: "cross_dissolve",
    duration: 0.5,
    params: {
      duration: 0.5,
      easing: "linear",
    },
  },

  fade_black: {
    id: "fade_black",
    name: "Fade to Black",
    type: "fade_black",
    duration: 0.5,
    params: {
      duration: 0.5,
      easing: "easeInOut",
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Slide Transitions
  // ═══════════════════════════════════════════════════════════════════════════

  slide_left: {
    id: "slide_left",
    name: "Slide Left",
    type: "slide_left",
    duration: 0.4,
    params: {
      direction: "left",
      duration: 0.4,
      easing: "easeInOut",
    },
  },

  slide_right: {
    id: "slide_right",
    name: "Slide Right",
    type: "slide_right",
    duration: 0.4,
    params: {
      direction: "right",
      duration: 0.4,
      easing: "easeInOut",
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Shake/Vibration
  // ═══════════════════════════════════════════════════════════════════════════

  camera_shake_light: {
    id: "camera_shake_light",
    name: "Light Camera Shake",
    type: "camera_shake_light",
    duration: 0.3,
    params: {
      shakeAmplitude: 5,
      shakeFrequency: 25,
      duration: 0.3,
      easing: "linear",
    },
  },

  camera_shake_heavy: {
    id: "camera_shake_heavy",
    name: "Heavy Camera Shake",
    type: "camera_shake_heavy",
    duration: 0.5,
    params: {
      shakeAmplitude: 15,
      shakeFrequency: 20,
      duration: 0.5,
      easing: "linear",
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 3D Transitions
  // ═══════════════════════════════════════════════════════════════════════════

  flip_3d_x: {
    id: "flip_3d_x",
    name: "3D Flip X",
    type: "flip_3d_x",
    duration: 0.5,
    params: {
      rotateX: 180,
      perspective: 1000,
      duration: 0.5,
      easing: "easeInOut",
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Special Effects
  // ═══════════════════════════════════════════════════════════════════════════

  ripple: {
    id: "ripple",
    name: "Ripple",
    type: "ripple",
    duration: 0.5,
    params: {
      duration: 0.5,
      easing: "easeOut",
    },
  },

  light_leak: {
    id: "light_leak",
    name: "Light Leak",
    type: "light_leak",
    duration: 0.5,
    params: {
      duration: 0.5,
      easing: "easeOut",
    },
  },
};

