"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Routes to prefetch for faster navigation
const PREFETCH_ROUTES = [
  "/",
  "/login",
  "/signup",
  "/dashboard",
  "/pricing",
  "/checkout",
];

export function RoutePrefetcher() {
  const router = useRouter();

  useEffect(() => {
    // Prefetch important routes when browser is idle (or after a short timeout)
    const prefetchAll = () => {
      PREFETCH_ROUTES.forEach((route) => {
        try {
          router.prefetch(route);
        } catch (e) {
          // ignore prefetch errors
        }
      });
    };

    // Prefer requestIdleCallback when available to avoid impacting main thread
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const id = (window as any).requestIdleCallback(prefetchAll, {
        timeout: 2000,
      });
      return () => (window as any).cancelIdleCallback(id);
    }

    const timer = setTimeout(prefetchAll, 1000);

    // Also add delegated mouseover listener for elements that opt-in via `data-prefetch` attribute
    const prefetched = new Set<string>();
    const onHover = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const el =
        target.closest &&
        (target.closest("[data-prefetch]") as HTMLElement | null);
      if (!el) return;
      const route = el.getAttribute("data-prefetch");
      if (route && !prefetched.has(route)) {
        try {
          router.prefetch(route);
          prefetched.add(route);
        } catch (err) {
          // ignore
        }
      }
    };

    document.addEventListener("pointerenter", onHover, { capture: true });

    return () => {
      clearTimeout(timer);
      document.removeEventListener("pointerenter", onHover, { capture: true });
    };
  }, [router]);

  return null;
}
