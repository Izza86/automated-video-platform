/**
 * Template System - CapCut-Style 100% Accurate Editing Replication
 * 
 * This module provides:
 *   • TemplateExtractor - Extract precise editing templates from reference videos
 *   • TemplateApplier - Apply templates to target videos with exact accuracy
 *   • Pre-built transition/filter libraries
 */

export * from "./types";
export { TemplateExtractor } from "./extractor";
export { TemplateApplier } from "./applier";

// Pre-built asset libraries
export { TRANSITION_LIBRARY } from "./assets/transitions";
export { FILTER_LIBRARY } from "./assets/filters";
export { LUT_LIBRARY } from "./assets/luts";
