"use client";

import dynamic from "next/dynamic";

const VideoTimelineAnimation = dynamic(
  () =>
    import("../video-timeline-animation").then((m) => m.VideoTimelineAnimation),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto w-full max-w-4xl p-6">
        <div className="mb-6 h-64 animate-pulse rounded-2xl bg-gray-800" />
        <div className="space-y-4">
          <div className="h-12 animate-pulse rounded-lg bg-gray-800" />
          <div className="h-16 animate-pulse rounded-lg bg-gray-800" />
          <div className="h-10 animate-pulse rounded-lg bg-gray-800" />
        </div>
      </div>
    ),
  }
);

export { VideoTimelineAnimation };
export default VideoTimelineAnimation;
