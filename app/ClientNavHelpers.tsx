"use client";
import dynamic from "next/dynamic";
const RoutePrefetcher = dynamic(() => import("@/components/route-prefetcher").then((m) => m.RoutePrefetcher), { ssr: false });
const PerformanceMonitor = dynamic(() => import("@/components/performance-monitor").then((m) => m.PerformanceMonitor), { ssr: false });

export default function ClientNavHelpers() {
  return (
    <>
      <RoutePrefetcher />
      {process.env.NODE_ENV === "development" && <PerformanceMonitor />}
    </>
  );
}