"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-4">
      <div className="max-w-md space-y-4 text-center">
        <div className="text-6xl">⚠️</div>
        <h2 className="font-bold text-2xl">Dashboard Error</h2>
        <p className="text-muted-foreground">
          We couldn't load your dashboard. Please try again.
        </p>
        <Button onClick={() => reset()}>Retry</Button>
      </div>
    </div>
  );
}
