/**
 * Pipeline Logger — Timestamped stage-level logging & result tracking
 * ====================================================================
 *
 * Creates a structured log for every pipeline run.  Each stage (ML script,
 * FFmpeg pass, StyleDNA extraction, render) is tracked with:
 *   • start/end timestamps (ISO-8601)
 *   • duration in ms
 *   • success / fail / skipped status
 *   • optional warnings & model name
 *
 * The final `PipelineSummary` is returned to the UI so the user sees
 * exactly which ML features succeeded and which fell back.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type StageStatus = "success" | "failed" | "skipped" | "fallback";

export interface StageResult {
  /** Human-readable stage name (e.g. "Shot Detection") */
  name: string;
  /** Machine-readable key (e.g. "shot-detection") */
  key: string;
  /** Outcome of the stage */
  status: StageStatus;
  /** Wall-clock duration in ms */
  durationMs: number;
  /** ISO-8601 start timestamp */
  startedAt: string;
  /** ISO-8601 end timestamp */
  endedAt: string;
  /** Which ML model was actually used (e.g. "transnetv2-real", "farneback-fallback") */
  modelUsed?: string;
  /** Warnings emitted during this stage (non-fatal) */
  warnings: string[];
  /** Error message if stage failed */
  error?: string;
}

export interface PipelineSummary {
  /** Unique pipeline run ID */
  runId: string;
  /** ISO-8601 timestamp when the pipeline started */
  startedAt: string;
  /** ISO-8601 timestamp when the pipeline finished */
  endedAt: string;
  /** Total wall-clock time in ms */
  totalMs: number;
  /** Overall success: true if at least a valid output was produced */
  overallSuccess: boolean;
  /** Per-stage results */
  stages: StageResult[];
  /** Count of stages that fully succeeded */
  successCount: number;
  /** Count of stages that used a fallback */
  fallbackCount: number;
  /** Count of stages that failed */
  failedCount: number;
  /** Count of stages that were skipped */
  skippedCount: number;
  /** Global warnings aggregated from all stages */
  warnings: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// PipelineLogger class
// ─────────────────────────────────────────────────────────────────────────────

export class PipelineLogger {
  private runId: string;
  private startedAt: Date;
  private stages: StageResult[] = [];
  private activeStage: {
    key: string;
    name: string;
    t0: number;
    startedAt: Date;
  } | null = null;

  constructor(label?: string) {
    this.runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.startedAt = new Date();
    const prefix = label ? `[pipeline/${label}]` : "[pipeline]";
    console.log(
      `${prefix} ▶ Pipeline ${this.runId} started at ${this.startedAt.toISOString()}`
    );
  }

  /** Begin a named stage.  Call `endStage()` when it completes. */
  startStage(key: string, name: string): void {
    if (this.activeStage) {
      const errorMsg = `PIPELINE OVERLAP ERROR: Stage '${key}' started while '${this.activeStage.key}' was still active. Orchestration is broken!`;
      console.error(`  !! ${errorMsg}`);
      // Auto-fail the previous stage to prevent dangling state
      this.endStage("failed", { error: errorMsg });
      // Throws to prevent continuing in an unstable state
      throw new Error(errorMsg);
    }
    this.activeStage = {
      key,
      name,
      t0: performance.now(),
      startedAt: new Date(),
    };
    console.log(
      `  ┌─ [${key}] ${name} started at ${this.activeStage.startedAt.toISOString()}`
    );
  }

  /**
   * Fail the current stage with an error message.
   * Note: This does NOT close the stage; it just records the failure.
   * Useful when we want to record an error in a catch block before the
   * finally block calls endStage().
   */
  failStage(error: string | Error): void {
    if (!this.activeStage) return;
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`  ⚠️ [${this.activeStage.key}] Stage error reported: ${msg}`);
  }

  /** End the current stage with a result. */
  endStage(
    status: StageStatus,
    opts: {
      modelUsed?: string;
      warnings?: string[];
      error?: string;
    } = {}
  ): StageResult {
    if (!this.activeStage) {
      console.warn(
        "  ⚠️ logger.endStage() called without an active stage. Ignoring."
      );
      return {
        name: "unknown",
        key: "unknown",
        status: "skipped",
        durationMs: 0,
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
        warnings: ["endStage called without active stage"],
      };
    }

    const now = new Date();
    const durationMs = Math.round(performance.now() - this.activeStage.t0);

    const result: StageResult = {
      name: this.activeStage.name,
      key: this.activeStage.key,
      status,
      durationMs,
      startedAt: this.activeStage.startedAt.toISOString(),
      endedAt: now.toISOString(),
      modelUsed: opts.modelUsed,
      warnings: opts.warnings ?? [],
      error: opts.error,
    };

    this.stages.push(result);

    const icon =
      status === "success"
        ? "✅"
        : status === "fallback"
          ? "⚠️"
          : status === "failed"
            ? "❌"
            : "⏭️";

    console.log(
      `  └─ [${result.key}] ${icon} ${status.toUpperCase()} in ${durationMs}ms` +
        (opts.modelUsed ? ` (model: ${opts.modelUsed})` : "") +
        (opts.error ? ` — ${opts.error}` : "") +
        (opts.warnings?.length
          ? ` — warnings: ${opts.warnings.join("; ")}`
          : "")
    );

    this.activeStage = null;
    return result;
  }

  /** Record a stage that was skipped entirely. */
  skipStage(key: string, name: string, reason?: string): StageResult {
    const result: StageResult = {
      name,
      key,
      status: "skipped",
      durationMs: 0,
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      warnings: reason ? [reason] : [],
    };
    this.stages.push(result);
    console.log(`  ⏭️  [${key}] ${name} SKIPPED${reason ? ` — ${reason}` : ""}`);
    return result;
  }

  /** Finalize and return the pipeline summary. */
  finalize(overallSuccess: boolean): PipelineSummary {
    // Close any dangling stage
    if (this.activeStage) {
      this.endStage("failed", {
        error: "Pipeline finalized before stage completed",
      });
    }

    const endedAt = new Date();
    const totalMs = Math.round(endedAt.getTime() - this.startedAt.getTime());

    const successCount = this.stages.filter(
      (s) => s.status === "success"
    ).length;
    const fallbackCount = this.stages.filter(
      (s) => s.status === "fallback"
    ).length;
    const failedCount = this.stages.filter((s) => s.status === "failed").length;
    const skippedCount = this.stages.filter(
      (s) => s.status === "skipped"
    ).length;

    const allWarnings = this.stages.flatMap((s) => s.warnings);

    const summary: PipelineSummary = {
      runId: this.runId,
      startedAt: this.startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      totalMs,
      overallSuccess,
      stages: this.stages,
      successCount,
      fallbackCount,
      failedCount,
      skippedCount,
      warnings: allWarnings,
    };

    console.log(
      `[pipeline] ■ Pipeline ${this.runId} finished in ${totalMs}ms — ` +
        `${successCount} ok, ${fallbackCount} fallback, ${failedCount} failed, ${skippedCount} skipped`
    );

    return summary;
  }

  /** Get stages recorded so far (useful for partial results). */
  getStages(): StageResult[] {
    return [...this.stages];
  }
}
