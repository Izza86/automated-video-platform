/**
 * Analysis module barrel export.
 *
 * Exposes shot detection, motion analysis, and audio beat detection
 * as a unified API surface.
 *
 * Uses explicit named exports (not `export *`) to help the bundler
 * tree-shake unused code and avoid compiling the entire module graph.
 */

export { analyzeAudio } from "./audio-analysis";
export { analyzeDepth } from "./depth-analysis";
export { analyzeMotion } from "./motion-analysis";
export { detectShots } from "./shot-detection";
