"use client";

import dynamic from "next/dynamic";
import React from "react";

const VideoTimelineAnimation = dynamic(
  () => import("../video-timeline-animation").then((m) => m.VideoTimelineAnimation),
  {
    ssr: false,
    loading: () => (
      <div className="w-full max-w-4xl mx-auto p-6">
        <div className="h-64 rounded-2xl bg-gray-800 animate-pulse mb-6" />
        <div className="space-y-4">
          <div className="h-12 bg-gray-800 rounded-lg animate-pulse" />
          <div className="h-16 bg-gray-800 rounded-lg animate-pulse" />
          <div className="h-10 bg-gray-800 rounded-lg animate-pulse" />
        </div>
      </div>
    ),
  }
);

export { VideoTimelineAnimation };
export default VideoTimelineAnimation;
