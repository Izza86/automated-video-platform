"use client";

import dynamic from "next/dynamic";
import React from "react";

const LampAnimation = dynamic(
  () => import("@/components/lamp-animation").then((m) => m.LampAnimation),
  {
    ssr: false,
    loading: () => (
      <div className="relative min-h-screen w-full overflow-hidden" style={{
        background: "linear-gradient(to bottom, #1a0a14 0%, #7a2244 35%, #e8862c 65%, #f5ba3c 80%, #1a0a06 100%)"
      }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    ),
  }
);

interface LampWrapperProps {
  children: React.ReactNode;
  label?: string;
}

export default function LampWrapper({ children, label }: LampWrapperProps) {
  return <LampAnimation label={label}>{children}</LampAnimation>;
}
