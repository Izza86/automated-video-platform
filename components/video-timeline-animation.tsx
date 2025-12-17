"use client";

import { useState, useEffect } from "react";
import { Play, Pause, Volume2, Scissors, Sparkles, Wand2 } from "lucide-react";

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
    { start: 0, width: 25, color: "from-purple-600 to-purple-800", label: "Intro", icon: <Play className="w-3 h-3" /> },
    { start: 25, width: 35, color: "from-pink-600 to-pink-800", label: "Main", icon: <Sparkles className="w-3 h-3" /> },
    { start: 60, width: 20, color: "from-blue-600 to-blue-800", label: "Effects", icon: <Wand2 className="w-3 h-3" /> },
    { start: 80, width: 20, color: "from-purple-600 to-purple-900", label: "Outro", icon: <Scissors className="w-3 h-3" /> },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-gradient-to-br from-black/60 via-purple-950/30 to-black/60 backdrop-blur-xl rounded-3xl border border-purple-500/30 shadow-2xl">
      {/* Video Preview Area */}
      <div className="relative w-full h-64 bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-2xl mb-6 overflow-hidden group">
        {/* Animated gradient background */}
        <div className="absolute inset-0">
          <div 
            className="absolute inset-0 bg-gradient-to-r from-purple-600/40 via-pink-600/40 to-blue-600/40"
            style={{
              transform: `translateX(${playheadPosition * 2}%)`,
              transition: 'transform 0.05s linear'
            }}
          />
        </div>

        {/* Preview Content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center z-10">
            <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center mb-4 border border-white/20 group-hover:scale-110 transition-transform">
              {isPlaying ? (
                <Pause className="w-10 h-10 text-white" />
              ) : (
                <Play className="w-10 h-10 text-white ml-1" />
              )}
            </div>
            <p className="text-white/80 text-sm font-medium">AI Processing Video...</p>
            <div className="mt-2 flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400 text-xs">Live Preview</span>
            </div>
          </div>
        </div>

        {/* Scan line effect */}
        <div 
          className="absolute inset-y-0 w-1 bg-gradient-to-b from-transparent via-white to-transparent opacity-50"
          style={{
            left: `${playheadPosition}%`,
            transition: 'left 0.05s linear',
            boxShadow: '0 0 20px rgba(255,255,255,0.5)'
          }}
        />

        {/* Film grain overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }} />
      </div>

      {/* Timeline Section */}
      <div className="space-y-4">
        {/* Timeline Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-10 h-10 rounded-lg bg-purple-600 hover:bg-purple-500 flex items-center justify-center transition-all hover:scale-110"
            >
              {isPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white ml-0.5" />}
            </button>
            <Volume2 className="w-5 h-5 text-purple-400" />
            <div className="text-white font-mono text-sm">
              {Math.floor(playheadPosition / 100 * 120)}s / 120s
            </div>
          </div>
          <div className="text-purple-400 text-sm font-medium">4 Clips</div>
        </div>

        {/* Timeline Tracks */}
        <div className="space-y-3">
          {/* Video Track */}
          <div className="space-y-1">
            <div className="text-xs text-purple-300 font-medium flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              Video Track
            </div>
            <div className="relative h-16 bg-black/40 rounded-lg border border-purple-500/30 overflow-hidden">
              {/* Timeline clips */}
              {clips.map((clip, index) => (
                <div
                  key={index}
                  className={`absolute top-1 bottom-1 bg-gradient-to-br ${clip.color} rounded border border-white/20 flex items-center justify-center group hover:scale-105 transition-transform cursor-pointer overflow-hidden`}
                  style={{
                    left: `${clip.start}%`,
                    width: `${clip.width}%`,
                  }}
                >
                  {/* Clip content */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                    <div className="text-white/90 mb-1">{clip.icon}</div>
                    <span className="text-[10px] text-white/80 font-semibold">{clip.label}</span>
                  </div>
                  
                  {/* Shimmer effect on hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                      transform: 'translateX(-100%)',
                      animation: 'shimmer 2s infinite'
                    }}
                  />
                  
                  {/* Resize handles */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/50 opacity-0 group-hover:opacity-100 cursor-ew-resize" />
                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/50 opacity-0 group-hover:opacity-100 cursor-ew-resize" />
                </div>
              ))}

              {/* Playhead */}
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
                style={{
                  left: `${playheadPosition}%`,
                  transition: 'left 0.05s linear',
                  boxShadow: '0 0 10px rgba(239, 68, 68, 0.8)',
                }}
              >
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-sm" />
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-sm" />
              </div>
            </div>
          </div>

          {/* Audio Track */}
          <div className="space-y-1">
            <div className="text-xs text-pink-300 font-medium flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-pink-500" />
              Audio Track
            </div>
            <div className="relative h-12 bg-black/40 rounded-lg border border-pink-500/30 overflow-hidden">
              {/* Waveform visualization */}
              <div className="absolute inset-0 flex items-center justify-center gap-0.5 px-2">
                {[...Array(60)].map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-gradient-to-t from-pink-600 to-pink-400 rounded-sm transition-all"
                    style={{
                      height: `${Math.random() * 60 + 20}%`,
                      opacity: playheadPosition > (i / 60) * 100 ? 0.8 : 0.3,
                    }}
                  />
                ))}
              </div>

              {/* Playhead */}
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
                style={{
                  left: `${playheadPosition}%`,
                  transition: 'left 0.05s linear',
                }}
              />
            </div>
          </div>

          {/* Effects Track */}
          <div className="space-y-1">
            <div className="text-xs text-blue-300 font-medium flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              AI Effects
            </div>
            <div className="relative h-10 bg-black/40 rounded-lg border border-blue-500/30 overflow-hidden">
              {/* Effect markers */}
              <div className="absolute left-[10%] top-1 bottom-1 w-12 bg-gradient-to-r from-blue-600 to-blue-800 rounded flex items-center justify-center border border-blue-400/30">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <div className="absolute left-[40%] top-1 bottom-1 w-16 bg-gradient-to-r from-blue-600 to-blue-800 rounded flex items-center justify-center border border-blue-400/30">
                <Wand2 className="w-3 h-3 text-white" />
              </div>
              <div className="absolute left-[70%] top-1 bottom-1 w-10 bg-gradient-to-r from-blue-600 to-blue-800 rounded flex items-center justify-center border border-blue-400/30">
                <Sparkles className="w-3 h-3 text-white" />
              </div>

              {/* Playhead */}
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
                style={{
                  left: `${playheadPosition}%`,
                  transition: 'left 0.05s linear',
                }}
              />
            </div>
          </div>
        </div>

        {/* Timeline ruler */}
        <div className="flex justify-between text-[10px] text-purple-400/60 font-mono px-1">
          {[...Array(13)].map((_, i) => (
            <span key={i}>{i * 10}s</span>
          ))}
        </div>
      </div>
    </div>
  );
}
