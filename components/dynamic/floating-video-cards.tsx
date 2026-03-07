"use client";

import dynamic from "next/dynamic";
import React from "react";

const FloatingVideoCards = dynamic(
  () => import("../floating-video-cards").then((m) => m.FloatingVideoCards),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[600px] lg:h-[700px] flex items-center justify-center">
        <div className="grid grid-cols-3 gap-6 w-11/12">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-80 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-700 animate-pulse" />
          ))}
        </div>
      </div>
    ),
  }
);

export { FloatingVideoCards };
export default FloatingVideoCards;
