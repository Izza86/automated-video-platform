"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface LampAnimationProps {
  children: React.ReactNode;
}

export function LampAnimation({ children }: LampAnimationProps) {
  const [isOn, setIsOn] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [cordPull, setCordPull] = useState(0);

  const handlePullCord = () => {
    setIsPulling(true);
    setTimeout(() => {
      setIsOn(!isOn);
      setIsPulling(false);
    }, 200);
  };

  const handleMouseDown = () => {
    setIsPulling(true);
  };

  const handleMouseUp = () => {
    if (isPulling) {
      setIsOn(!isOn);
      setIsPulling(false);
      setCordPull(0);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPulling) {
      setCordPull(Math.min(Math.max(e.movementY * 0.5, -10), 30));
    }
  };

  return (
    <div className="flex min-h-screen bg-black" onMouseUp={handleMouseUp} onMouseMove={handleMouseMove}>
      {/* Left Side - Lamp Animation */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#0a0a0a]">
        {/* Animated Background - Only visible when lamp is on */}
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-700",
            isOn ? "opacity-100" : "opacity-0"
          )}
        >
          <div className="absolute inset-0 bg-gradient-radial from-purple-500/20 via-purple-600/10 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(168,85,247,0.15),transparent_50%)]" />
        </div>

        {/* Lamp Container */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12">
          {/* Lamp Character */}
          <div className="relative flex flex-col items-center">
            {/* Light Glow Effect */}
            <div
              className={cn(
                "absolute -top-20 w-64 h-64 rounded-full transition-all duration-700",
                isOn
                  ? "bg-purple-400/30 blur-3xl scale-150 opacity-100"
                  : "bg-transparent blur-3xl scale-100 opacity-0"
              )}
            />

            {/* Lamp Shade */}
            <div
              className={cn(
                "relative w-48 h-32 transition-all duration-500",
                isOn ? "drop-shadow-[0_0_30px_rgba(168,85,247,0.5)]" : ""
              )}
            >
              {/* Pull Cord on Left Side */}
              <div className="absolute left-8 top-1 flex flex-col items-center">
                {/* Wire attached to lamp - connecting from lamp top to pull handle */}
                <svg width="80" height="120" className="absolute top-0 left-0">
                  <path
                    d={`M 0 0 Q -10 ${15 + cordPull} -20 ${35 + cordPull} L -20 ${90 + cordPull}`}
                    stroke={isOn ? "#a855f7" : "#6b7280"}
                    strokeWidth="2"
                    fill="none"
                    className="transition-colors duration-300"
                  />
                </svg>
                
                {/* Pull Handle */}
                <div 
                  className="relative z-10"
                  style={{ transform: `translate(-20px, ${90 + cordPull}px)` }}
                >
                  <button
                    onMouseDown={handleMouseDown}
                    onClick={handlePullCord}
                    className={cn(
                      "w-8 h-12 rounded-full transition-all duration-200 cursor-grab active:cursor-grabbing shadow-lg relative",
                      isOn 
                        ? "bg-gradient-to-b from-purple-300 to-purple-600 shadow-purple-500/50" 
                        : "bg-gradient-to-b from-gray-300 to-gray-600 shadow-gray-500/50",
                      isPulling && "scale-110"
                    )}
                    aria-label="Pull cord to toggle lamp"
                  >
                    {/* Wooden texture lines */}
                    <div className="absolute inset-0 rounded-full overflow-hidden">
                      <div className="absolute inset-x-0 top-1/4 h-px bg-black/20" />
                      <div className="absolute inset-x-0 top-2/4 h-px bg-black/20" />
                      <div className="absolute inset-x-0 top-3/4 h-px bg-black/20" />
                    </div>
                    {/* Highlight */}
                    <div className="absolute top-2 left-2 w-2 h-3 bg-white/40 rounded-full blur-sm" />
                  </button>
                  
                  {/* Pull instruction */}
                  {!isOn && (
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                      <p className="text-xs text-purple-400 animate-pulse">← Pull me!</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Lamp Top */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-6 bg-gray-800 rounded-t-lg">
                {/* Pull Cord Wire */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 flex flex-col items-center">
                  {/* Wire/String */}
                  <div 
                    className={cn(
                      "w-0.5 bg-gray-400 transition-all duration-200",
                      isPulling ? "h-16" : "h-20"
                    )}
                  />
                  {/* Pull Handle */}
                  <button
                    onClick={handlePullCord}
                    className={cn(
                      "w-6 h-6 rounded-full bg-gradient-to-b transition-all duration-200 hover:scale-110 cursor-pointer shadow-lg",
                      isOn 
                        ? "from-purple-400 to-purple-600 shadow-purple-500/50" 
                        : "from-gray-400 to-gray-600 shadow-gray-500/50",
                      isPulling && "translate-y-2"
                    )}
                    aria-label="Pull cord to toggle lamp"
                  >
                    <div className="absolute inset-0 rounded-full border-2 border-white/20" />
                  </button>
                </div>
              </div>

              {/* Lamp Shade Body */}
              <svg
                viewBox="0 0 200 120"
                className="w-full h-full"
                style={{ filter: isOn ? "drop-shadow(0 0 10px rgba(168,85,247,0.3))" : "none" }}
              >
                <defs>
                  <linearGradient id="lampGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop
                      offset="0%"
                      style={{
                        stopColor: isOn ? "#e9d5ff" : "#6b7280",
                        stopOpacity: 1,
                      }}
                    />
                    <stop
                      offset="100%"
                      style={{
                        stopColor: isOn ? "#a855f7" : "#4b5563",
                        stopOpacity: 1,
                      }}
                    />
                  </linearGradient>
                </defs>
                <path
                  d="M 40 20 L 20 80 Q 20 90 30 90 L 170 90 Q 180 90 180 80 L 160 20 Q 160 10 150 10 L 50 10 Q 40 10 40 20 Z"
                  fill="url(#lampGradient)"
                  stroke={isOn ? "#a855f7" : "#374151"}
                  strokeWidth="2"
                />
              </svg>

              {/* Cute Face */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3">
                {/* Eyes */}
                <div className="flex gap-8">
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full transition-colors duration-300",
                      isOn ? "bg-gray-800" : "bg-gray-400"
                    )}
                  />
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full transition-colors duration-300",
                      isOn ? "bg-gray-800" : "bg-gray-400"
                    )}
                  />
                </div>
                {/* Smile - Happy when lamp is on */}
                <svg width="32" height="16" viewBox="0 0 32 16">
                  <path
                    d={isOn ? "M 4 4 Q 16 12 28 4" : "M 4 8 Q 16 6 28 8"}
                    stroke={isOn ? "#1f2937" : "#6b7280"}
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                </svg>
              </div>

              {/* Light Bulb */}
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
                <div
                  className={cn(
                    "w-12 h-16 rounded-full transition-all duration-500",
                    isOn
                      ? "bg-white shadow-[0_0_40px_rgba(168,85,247,0.8)]"
                      : "bg-gray-600"
                  )}
                  style={{
                    clipPath: "polygon(30% 0%, 70% 0%, 85% 70%, 70% 100%, 30% 100%, 15% 70%)",
                  }}
                />
              </div>
            </div>

            {/* Lamp Stand */}
            <div className="mt-12 flex flex-col items-center">
              {/* Neck */}
              <div className="w-3 h-16 bg-gray-700 rounded-full" />
              {/* Base */}
              <div className="w-24 h-3 bg-gray-800 rounded-full mt-1" />
              <div className="w-28 h-4 bg-gray-900 rounded-full mt-1" />
            </div>
          </div>

          {/* Welcome Text */}
          <div
            className={cn(
              "mt-16 text-center transition-all duration-700",
              isOn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
            <p className="text-purple-300 text-lg">
              Pull the cord to illuminate your journey
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Form Card */}
      <div
        className={cn(
          "w-full lg:w-1/2 flex items-center justify-center p-8 transition-all duration-700",
          isOn ? "bg-[#0f1419] opacity-100" : "bg-black opacity-0 pointer-events-none"
        )}
      >
        <div
          className={cn(
            "w-full max-w-md transition-all duration-700 delay-200",
            isOn
              ? "opacity-100 translate-x-0 scale-100"
              : "opacity-0 -translate-x-8 scale-95"
          )}
        >
          {children}
        </div>
      </div>

      {/* Mobile View (Full Screen) */}
      <div className="lg:hidden w-full flex items-center justify-center p-8 bg-black">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
