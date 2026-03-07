"use client";

import {
  Activity,
  Music,
  Palette,
  Scissors,
  Fingerprint,
  type LucideIcon,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SparklineChart } from "@/components/analysis/sparkline-chart";
import type { DashboardCard } from "@/lib/types/analysis";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Icon / colour map per card id
// ─────────────────────────────────────────────────────────────────────────────

const CARD_META: Record<
  string,
  { icon: LucideIcon; accent: string; sparkColor: string }
> = {
  "shot-detection": {
    icon: Scissors,
    accent: "text-red-400",
    sparkColor: "#f87171",
  },
  "motion-analysis": {
    icon: Activity,
    accent: "text-sky-400",
    sparkColor: "#38bdf8",
  },
  "audio-beats": {
    icon: Music,
    accent: "text-cyan-400",
    sparkColor: "#22d3ee",
  },
  "color-grading": {
    icon: Palette,
    accent: "text-purple-400",
    sparkColor: "#a855f7",
  },
  "video-identity": {
    icon: Fingerprint,
    accent: "text-emerald-400",
    sparkColor: "#34d399",
  },
};

const DEFAULT_META = {
  icon: Activity,
  accent: "text-gray-400",
  sparkColor: "#9ca3af",
};

// ─────────────────────────────────────────────────────────────────────────────
// Badge variant mapping
// ─────────────────────────────────────────────────────────────────────────────

function mapBadgeVariant(
  v?: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (v) {
    case "success":
      return "default";
    case "warning":
      return "secondary";
    case "destructive":
      return "destructive";
    default:
      return "outline";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AnalysisCard — generic card rendered for every dashboard.cards[] entry
// ─────────────────────────────────────────────────────────────────────────────

export interface AnalysisCardProps {
  card: DashboardCard;
  className?: string;
}

export function AnalysisCard({ card, className }: AnalysisCardProps) {
  const meta = CARD_META[card.id] ?? DEFAULT_META;
  const Icon = meta.icon;

  return (
    <Card
      className={cn(
        "bg-gradient-to-br from-[#141420] to-[#0c0c18] border-white/[0.06] hover:border-white/[0.12] transition-colors",
        className,
      )}
    >
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className={cn("h-5 w-5 shrink-0", meta.accent)} />
          <CardTitle className="text-sm font-semibold text-white">
            {card.title}
          </CardTitle>
        </div>
        {card.badge && (
          <CardAction>
            <Badge variant={mapBadgeVariant(card.badgeVariant)}>
              {card.badge}
            </Badge>
          </CardAction>
        )}
        <CardDescription className="text-xs text-gray-500">
          {card.subtitle}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Hero value */}
        <p className="text-2xl font-bold tracking-tight text-white">
          {card.value}
        </p>

        {/* Sparkline (if data exists) */}
        {card.sparkline && card.sparkline.length >= 2 && (
          <SparklineChart
            data={card.sparkline}
            color={meta.sparkColor}
            height={56}
            gradientId={card.id}
          />
        )}

        {/* Detail rows */}
        {card.details && card.details.length > 0 && (
          <div className="space-y-1.5 pt-1 border-t border-white/5">
            {card.details.map((d) => (
              <div
                key={d.label}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-gray-500">{d.label}</span>
                <span className="text-gray-300 font-medium">{d.value}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
