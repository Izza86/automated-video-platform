"use client";

import { CheckCircle, Clock, Zap } from "lucide-react";
import { AnalysisCard } from "@/components/analysis/analysis-card";
import type {
  DashboardData,
  BlueprintSummary,
  PipelineTiming,
} from "@/lib/types/analysis";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// AnalysisDashboard — responsive grid of backend-produced cards
// ─────────────────────────────────────────────────────────────────────────────

export interface AnalysisDashboardProps {
  dashboard: DashboardData;
  blueprintSummary?: BlueprintSummary | null;
  timing?: PipelineTiming | null;
  className?: string;
}

export function AnalysisDashboard({
  dashboard,
  blueprintSummary,
  timing,
  className,
}: AnalysisDashboardProps) {
  return (
    <div
      className={cn(
        "bg-gradient-to-br from-green-900/20 to-emerald-800/10 border border-green-500/30 rounded-xl p-6 space-y-5",
        className,
      )}
    >
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-6 w-6 text-green-400" />
          <h2 className="text-xl font-bold text-white">
            AI Style Cloner — Analysis Results
          </h2>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500 sm:ml-auto">
          <span>{dashboard.filename}</span>
          <span>{new Date(dashboard.processedAt).toLocaleTimeString()}</span>
        </div>
      </div>

      {/* ── Cards Grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {dashboard.cards.map((card) => (
          <AnalysisCard key={card.id} card={card} />
        ))}
      </div>

      {/* ── Blueprint Summary (optional) ──────────────────────────── */}
      {blueprintSummary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-2">
          <SummaryPill label="Duration" value={`${blueprintSummary.totalDuration.toFixed(1)}s`} />
          <SummaryPill label="Cuts" value={String(blueprintSummary.totalCuts)} />
          <SummaryPill label="Speed Ramps" value={String(blueprintSummary.totalSpeedRamps)} />
          <SummaryPill label="BPM" value={`${blueprintSummary.bpm} (${(blueprintSummary.bpmConfidence * 100).toFixed(0)}%)`} />
          <SummaryPill label="Pace" value={blueprintSummary.dominantPace} />
          <SummaryPill label="Color Mood" value={blueprintSummary.dominantColorMood} />
        </div>
      )}

      {/* ── Pipeline Timing Bar ───────────────────────────────────── */}
      {timing && (
        <div className="flex items-center gap-3 text-xs text-gray-500 pt-2 border-t border-green-500/10">
          <Clock className="h-3.5 w-3.5" />
          <span>
            Total <strong className="text-gray-300">{(timing.totalMs / 1000).toFixed(1)}s</strong>
          </span>
          <TimingSegment label="Analysis" ms={timing.analysisMs} total={timing.totalMs} color="bg-purple-500" />
          <TimingSegment label="Blueprint" ms={timing.blueprintMs} total={timing.totalMs} color="bg-sky-500" />
          <TimingSegment label="Instructions" ms={timing.instructionsMs} total={timing.totalMs} color="bg-emerald-500" />
          <TimingSegment label="Render" ms={timing.renderMs} total={timing.totalMs} color="bg-amber-500" />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Small helpers
// ─────────────────────────────────────────────────────────────────────────────

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center rounded-lg bg-black/30 border border-white/5 px-3 py-2">
      <span className="text-[10px] uppercase tracking-wider text-gray-500">
        {label}
      </span>
      <span className="text-sm font-semibold text-white capitalize">
        {value}
      </span>
    </div>
  );
}

function TimingSegment({
  label,
  ms,
  total,
  color,
}: {
  label: string;
  ms: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? ((ms / total) * 100).toFixed(0) : "0";
  return (
    <span className="flex items-center gap-1">
      <span className={cn("inline-block h-2 w-2 rounded-full", color)} />
      {label} {(ms / 1000).toFixed(1)}s ({pct}%)
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Progress overlay for in-flight analysis
// ─────────────────────────────────────────────────────────────────────────────

export interface AnalysisProgressBarProps {
  stage: string;
  percent: number;
  message: string;
}

export function AnalysisProgressBar({
  stage,
  percent,
  message,
}: AnalysisProgressBarProps) {
  if (stage === "idle" || stage === "complete") return null;

  return (
    <div className="bg-gradient-to-br from-purple-900/20 to-indigo-800/10 border border-purple-500/30 rounded-xl p-6 space-y-3">
      <div className="flex items-center gap-2">
        <Zap className="h-5 w-5 text-purple-400 animate-pulse" />
        <h3 className="font-semibold text-white text-sm">
          {stage === "error" ? "Analysis Failed" : "Analyzing Reference Video…"}
        </h3>
      </div>

      <p className="text-xs text-purple-300">{message}</p>

      {stage !== "error" && (
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}

      {stage === "error" && (
        <p className="text-xs text-red-400">{message}</p>
      )}
    </div>
  );
}
