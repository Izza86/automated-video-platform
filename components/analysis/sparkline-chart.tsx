"use client";

import { useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";

// ─────────────────────────────────────────────────────────────────────────────
// Sparkline — thin recharts wrapper for inline card visualisations
// ─────────────────────────────────────────────────────────────────────────────

export interface SparklineChartProps {
  /** Raw numeric data points */
  data: number[];
  /** Tailwind-compatible stroke/fill color — default purple-500 */
  color?: string;
  /** Chart height in px — default 48 */
  height?: number;
  /** Show filled area under curve — default true */
  filled?: boolean;
  /** Optional className wrapper */
  className?: string;
  /** gradient id suffix for unique SVG defs — default "sparkline" */
  gradientId?: string;
}

export function SparklineChart({
  data,
  color = "#a855f7",
  height = 48,
  filled = true,
  className = "",
  gradientId = "sparkline",
}: SparklineChartProps) {
  const chartData = useMemo(
    () => data.map((value, index) => ({ index, value })),
    [data]
  );

  if (chartData.length < 2) return null;

  const gId = `grad-${gradientId}`;

  return (
    <div className={className} style={{ width: "100%", height }}>
      <ResponsiveContainer height="100%" width="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
        >
          <defs>
            <linearGradient id={gId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <YAxis domain={["dataMin", "dataMax"]} hide />
          <Area
            activeDot={false}
            dataKey="value"
            dot={false}
            fill={filled ? `url(#${gId})` : "none"}
            isAnimationActive={false}
            stroke={color}
            strokeWidth={1.5}
            type="monotone"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
