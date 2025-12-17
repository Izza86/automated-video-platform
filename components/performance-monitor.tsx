"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function PerformanceMonitor() {
  const pathname = usePathname();

  useEffect(() => {
    // Log performance metrics
    if (typeof window !== "undefined" && window.performance) {
      const perfData = window.performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
      
      if (perfData) {
        const loadTime = perfData.loadEventEnd - perfData.fetchStart;
        const domContentLoaded = perfData.domContentLoadedEventEnd - perfData.fetchStart;
        const timeToInteractive = perfData.domInteractive - perfData.fetchStart;

        console.log(`📊 Performance Metrics for ${pathname}:`);
        console.log(`  - Page Load Time: ${Math.round(loadTime)}ms`);
        console.log(`  - DOM Content Loaded: ${Math.round(domContentLoaded)}ms`);
        console.log(`  - Time to Interactive: ${Math.round(timeToInteractive)}ms`);
      }
    }
  }, [pathname]);

  return null;
}
