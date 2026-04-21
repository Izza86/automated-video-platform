"use client";

import { Pause, Play, Scissors, Sparkles, Volume2, Wand2 } from "lucide-react";
import { useEffect, useState } from "react";

export function VideoTimelineAnimation() {
  const [playheadPosition, setPlayheadPosition] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setPlayheadPosition((prev) => (prev >= 100 ? 0 : prev + 0.5));
    }, 50);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // Timeline clips data
  const clips = [
    {
      start: 0,
      width: 25,
      color: "from-purple-600 to-purple-800",
      label: "Intro",
      icon: <Play className="h-3 w-3" />,
    },
    {
      start: 25,
      width: 35,
      color: "from-pink-600 to-pink-800",
      label: "Main",
      icon: <Sparkles className="h-3 w-3" />,
    },
    {
      start: 60,
      width: 20,
      color: "from-blue-600 to-blue-800",
      label: "Effects",
      icon: <Wand2 className="h-3 w-3" />,
    },
    {
      start: 80,
      width: 20,
      color: "from-purple-600 to-purple-900",
      label: "Outro",
      icon: <Scissors className="h-3 w-3" />,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-4xl rounded-3xl border border-purple-500/30 bg-gradient-to-br from-black/60 via-purple-950/30 to-black/60 p-6 shadow-2xl backdrop-blur-xl">
      {/* Video Preview Area */}
      <div className="group relative mb-6 h-64 w-full overflow-hidden rounded-2xl bg-gradient-to-br from-purple-900/50 to-pink-900/50">
        {/* Animated gradient background */}
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-gradient-to-r from-purple-600/40 via-pink-600/40 to-blue-600/40"
            style={{
              transform: `translateX(${playheadPosition * 2}%)`,
              transition: "transform 0.05s linear",
            }}
          />
        </div>

        {/* Preview Content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="z-10 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-md transition-transform group-hover:scale-110">
              {isPlaying ? (
                <Pause className="h-10 w-10 text-white" />
              ) : (
                <Play className="ml-1 h-10 w-10 text-white" />
              )}
            </div>
            <p className="font-medium text-sm text-white/80">
              AI Processing Video...
            </p>
            <div className="mt-2 flex items-center justify-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
              <span className="text-green-400 text-xs">Live Preview</span>
            </div>
          </div>
        </div>

        {/* Scan line effect */}
        <div
          className="absolute inset-y-0 w-1 bg-gradient-to-b from-transparent via-white to-transparent opacity-50"
          style={{
            left: `${playheadPosition}%`,
            transition: "left 0.05s linear",
            boxShadow: "0 0 20px rgba(255,255,255,0.5)",
          }}
        />

        {/* Film grain overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Timeline Section */}
      <div className="space-y-4">
        {/* Timeline Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600 transition-all hover:scale-110 hover:bg-purple-500"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5 text-white" />
              ) : (
                <Play className="ml-0.5 h-5 w-5 text-white" />
              )}
            </button>
            <Volume2 className="h-5 w-5 text-purple-400" />
            <div className="font-mono text-sm text-white">
              {Math.floor((playheadPosition / 100) * 120)}s / 120s
            </div>
          </div>
          <div className="font-medium text-purple-400 text-sm">4 Clips</div>
        </div>

        {/* Timeline Tracks */}
        <div className="space-y-3">
          {/* Video Track */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-medium text-purple-300 text-xs">
              <div className="h-2 w-2 rounded-full bg-purple-500" />
              Video Track
            </div>
            <div className="relative h-16 overflow-hidden rounded-lg border border-purple-500/30 bg-black/40">
              {/* Timeline clips */}
              {clips.map((clip, index) => (
                <div
                  className={`absolute top-1 bottom-1 bg-gradient-to-br ${clip.color} group flex cursor-pointer items-center justify-center overflow-hidden rounded border border-white/20 transition-transform hover:scale-105`}
                  key={index}
                  style={{
                    left: `${clip.start}%`,
                    width: `${clip.width}%`,
                  }}
                >
                  {/* Clip content */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                    <div className="mb-1 text-white/90">{clip.icon}</div>
                    <span className="font-semibold text-[10px] text-white/80">
                      {clip.label}
                    </span>
                  </div>

                  {/* Shimmer effect on hover */}
                  <div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
                    style={{
                      transform: "translateX(-100%)",
                      animation: "shimmer 2s infinite",
                    }}
                  />

                  {/* Resize handles */}
                  <div className="absolute top-0 bottom-0 left-0 w-1 cursor-ew-resize bg-white/50 opacity-0 group-hover:opacity-100" />
                  <div className="absolute top-0 right-0 bottom-0 w-1 cursor-ew-resize bg-white/50 opacity-0 group-hover:opacity-100" />
                </div>
              ))}

              {/* Playhead */}
              <div
                className="absolute top-0 bottom-0 z-20 w-0.5 bg-red-500"
                style={{
                  left: `${playheadPosition}%`,
                  transition: "left 0.05s linear",
                  boxShadow: "0 0 10px rgba(239, 68, 68, 0.8)",
                }}
              >
                <div className="-top-1 -translate-x-1/2 absolute left-1/2 h-3 w-3 rounded-sm bg-red-500" />
                <div className="-bottom-1 -translate-x-1/2 absolute left-1/2 h-3 w-3 rounded-sm bg-red-500" />
              </div>
            </div>
          </div>

          {/* Audio Track */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-medium text-pink-300 text-xs">
              <div className="h-2 w-2 rounded-full bg-pink-500" />
              Audio Track
            </div>
            <div className="relative h-12 overflow-hidden rounded-lg border border-pink-500/30 bg-black/40">
              {/* Waveform visualization */}
              <div className="absolute inset-0 flex items-center justify-center gap-0.5 px-2">
                {[...Array(60)].map((_, i) => (
                  <div
                    className="flex-1 rounded-sm bg-gradient-to-t from-pink-600 to-pink-400 transition-all"
                    key={i}
                    style={{
                      height: `${Math.random() * 60 + 20}%`,
                      opacity: playheadPosition > (i / 60) * 100 ? 0.8 : 0.3,
                    }}
                  />
                ))}
              </div>

              {/* Playhead */}
              <div
                className="absolute top-0 bottom-0 z-20 w-0.5 bg-red-500"
                style={{
                  left: `${playheadPosition}%`,
                  transition: "left 0.05s linear",
                }}
              />
            </div>
          </div>

          {/* Effects Track */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-medium text-blue-300 text-xs">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              AI Effects
            </div>
            <div className="relative h-10 overflow-hidden rounded-lg border border-blue-500/30 bg-black/40">
              {/* Effect markers */}
              <div className="absolute top-1 bottom-1 left-[10%] flex w-12 items-center justify-center rounded border border-blue-400/30 bg-gradient-to-r from-blue-600 to-blue-800">
                <Sparkles className="h-3 w-3 text-white" />
              </div>
              <div className="absolute top-1 bottom-1 left-[40%] flex w-16 items-center justify-center rounded border border-blue-400/30 bg-gradient-to-r from-blue-600 to-blue-800">
                <Wand2 className="h-3 w-3 text-white" />
              </div>
              <div className="absolute top-1 bottom-1 left-[70%] flex w-10 items-center justify-center rounded border border-blue-400/30 bg-gradient-to-r from-blue-600 to-blue-800">
                <Sparkles className="h-3 w-3 text-white" />
              </div>

              {/* Playhead */}
              <div
                className="absolute top-0 bottom-0 z-20 w-0.5 bg-red-500"
                style={{
                  left: `${playheadPosition}%`,
                  transition: "left 0.05s linear",
                }}
              />
            </div>
          </div>
        </div>

        {/* Timeline ruler */}
        <div className="flex justify-between px-1 font-mono text-[10px] text-purple-400/60">
          {[...Array(13)].map((_, i) => (
            <span key={i}>{i * 10}s</span>
          ))}
        </div>
      </div>
    </div>
  );
}
