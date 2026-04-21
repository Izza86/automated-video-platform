"use client";
import dynamic from "next/dynamic";

const PerformanceMonitor = dynamic(
  () =>
    import("@/components/performance-monitor").then(
      (m) => m.PerformanceMonitor
    ),
  { ssr: false }
);

export default function ClientMonitor() {
  if (process.env.NODE_ENV !== "development") return null;
  return <PerformanceMonitor />;
}
