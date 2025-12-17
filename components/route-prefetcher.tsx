"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Routes to prefetch for faster navigation
const PREFETCH_ROUTES = [
  "/login",
  "/signup",
  "/dashboard",
  "/pricing",
];

export function RoutePrefetcher() {
  const router = useRouter();

  useEffect(() => {
    // Prefetch important routes after initial render
    const timer = setTimeout(() => {
      PREFETCH_ROUTES.forEach((route) => {
        router.prefetch(route);
      });
    }, 1000); // Wait 1 second after page load

    return () => clearTimeout(timer);
  }, [router]);

  return null;
}
