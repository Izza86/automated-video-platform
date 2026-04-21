"use client";

import dynamic from "next/dynamic";

const FloatingVideoCards = dynamic(
  () => import("../floating-video-cards").then((m) => m.FloatingVideoCards),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[600px] w-full items-center justify-center lg:h-[700px]">
        <div className="grid w-11/12 grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div
              className="h-80 animate-pulse rounded-2xl bg-gradient-to-br from-gray-800 to-gray-700"
              key={i}
            />
          ))}
        </div>
      </div>
    ),
  }
);

export { FloatingVideoCards };
export default FloatingVideoCards;
