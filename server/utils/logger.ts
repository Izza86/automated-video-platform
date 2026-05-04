import { PipelineLogger } from "./pipeline-logger";

/**
 * Shared logger instance for the video processing pipeline.
 * Providing a default instance to resolve "Cannot find name 'logger'" errors
 * while maintaining compatibility with the PipelineLogger class structure.
 */
export const logger = new PipelineLogger("Shared");
