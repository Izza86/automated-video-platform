"use client";

/**
 * PipelineSummaryCard — Shows the user which ML features succeeded,
 * used fallback, failed, or were skipped during video processing.
 *
 * Designed for the dashboard: displays a compact overview card with
 * per-stage status indicators, timing info, and any warnings.
 */

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// ─────────────────────────────────────────────────────────────────────────────
// Types (mirrored from server — keep in sync with pipeline-logger.ts)
// ─────────────────────────────────────────────────────────────────────────────

type StageStatus = "success" | "failed" | "skipped" | "fallback";

interface StageResult {
  name: string;
  key: string;
  status: StageStatus;
  durationMs: number;
  startedAt: string;
  endedAt: string;
  modelUsed?: string;
  warnings: string[];
  error?: string;
}

interface PipelineSummary {
  runId: string;
  startedAt: string;
  endedAt: string;
  totalMs: number;
  overallSuccess: boolean;
  stages: StageResult[];
  successCount: number;
  fallbackCount: number;
  failedCount: number;
  skippedCount: number;
  warnings: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Status config
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  StageStatus,
  {
    icon: string;
    label: string;
    badgeVariant: "default" | "secondary" | "destructive" | "outline";
    textClass: string;
  }
> = {
  success: {
    icon: "✅",
    label: "Success",
    badgeVariant: "default",
    textClass: "text-emerald-600 dark:text-emerald-400",
  },
  fallback: {
    icon: "⚠️",
    label: "Fallback",
    badgeVariant: "outline",
    textClass: "text-amber-600 dark:text-amber-400",
  },
  failed: {
    icon: "❌",
    label: "Failed",
    badgeVariant: "destructive",
    textClass: "text-red-600 dark:text-red-400",
  },
  skipped: {
    icon: "⏭️",
    label: "Skipped",
    badgeVariant: "secondary",
    textClass: "text-muted-foreground",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function PipelineSummaryCard({
  summary,
  className,
}: {
  summary: PipelineSummary;
  className?: string;
}) {
  const {
    stages,
    totalMs,
    overallSuccess,
    successCount,
    fallbackCount,
    failedCount,
    skippedCount,
    warnings,
  } = summary;

  // Build subtitle
  const parts: string[] = [];
  if (successCount > 0) parts.push(`${successCount} passed`);
  if (fallbackCount > 0) parts.push(`${fallbackCount} fallback`);
  if (failedCount > 0) parts.push(`${failedCount} failed`);
  if (skippedCount > 0) parts.push(`${skippedCount} skipped`);
  const subtitle = parts.join(" · ");

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="font-semibold text-base">
            {overallSuccess ? "✅" : "⚠️"} Pipeline Summary
          </CardTitle>
          <Badge variant={overallSuccess ? "default" : "destructive"}>
            {formatDuration(totalMs)}
          </Badge>
        </div>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Stage list */}
        <div className="space-y-2">
          {stages.map((stage) => {
            const config = STATUS_CONFIG[stage.status];
            return (
              <div
                className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
                key={stage.key}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="shrink-0 text-base">{config.icon}</span>
                  <div className="min-w-0">
                    <div className="truncate font-medium">{stage.name}</div>
                    {stage.modelUsed && (
                      <div className="truncate text-muted-foreground text-xs">
                        {stage.modelUsed}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-muted-foreground text-xs">
                    {formatDuration(stage.durationMs)}
                  </span>
                  <Badge className="text-xs" variant={config.badgeVariant}>
                    {config.label}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
            <div className="mb-1 font-medium text-amber-800 text-xs dark:text-amber-300">
              ⚠️ Warnings ({warnings.length})
            </div>
            <ul className="space-y-0.5 text-amber-700 text-xs dark:text-amber-400">
              {warnings.map((w, i) => (
                <li className="flex gap-1" key={i}>
                  <span className="shrink-0">•</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Compact inline version — just shows the status badges.
 * Useful as a small indicator next to "Processing complete" messages.
 */
export function PipelineStatusBadges({
  summary,
}: {
  summary: PipelineSummary;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {summary.stages.map((stage) => {
        const config = STATUS_CONFIG[stage.status];
        return (
          <Badge
            className="gap-1 text-xs"
            key={stage.key}
            title={`${stage.name}: ${config.label} (${formatDuration(stage.durationMs)})${stage.error ? ` — ${stage.error}` : ""}`}
            variant={config.badgeVariant}
          >
            {config.icon} {stage.name}
          </Badge>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60_000);
  const secs = Math.round((ms % 60_000) / 1000);
  return `${mins}m ${secs}s`;
}
