"use client";

import { Film, Play, Sparkles, Video, Zap } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface VideoCard {
  id: number;
  title: string;
  subtitle: string;
  gradient: string;
  icon: React.ReactNode;
  position: string;
  rotation: string;
  scale: string;
  zIndex: number;
}

export function FloatingVideoCards() {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  const cards: VideoCard[] = [
    {
      id: 1,
      title: "Style Transfer",
      subtitle: "AI-Powered",
      gradient: "from-purple-600 via-purple-700 to-purple-900",
      icon: <Sparkles className="h-6 w-6" />,
      position: "",
      rotation: "",
      scale: "scale-95",
      zIndex: 10,
    },
    {
      id: 2,
      title: "Color Grading",
      subtitle: "Cinematic Look",
      gradient: "from-pink-600 via-pink-700 to-pink-900",
      icon: <Film className="h-6 w-6" />,
      position: "",
      rotation: "",
      scale: "scale-90",
      zIndex: 20,
    },
    {
      id: 3,
      title: "Auto Edit",
      subtitle: "Smart Cuts",
      gradient: "from-blue-600 via-blue-700 to-blue-900",
      icon: <Zap className="h-6 w-6" />,
      position: "",
      rotation: "",
      scale: "scale-100",
      zIndex: 30,
    },
    {
      id: 4,
      title: "Effects",
      subtitle: "Professional",
      gradient: "from-indigo-600 via-indigo-700 to-indigo-900",
      icon: <Video className="h-6 w-6" />,
      position: "",
      rotation: "",
      scale: "scale-95",
      zIndex: 15,
    },
    {
      id: 5,
      title: "Export HD",
      subtitle: "4K Ready",
      gradient: "from-violet-600 via-violet-700 to-violet-900",
      icon: <Play className="h-6 w-6" />,
      position: "",
      rotation: "",
      scale: "scale-90",
      zIndex: 25,
    },
  ];

  // Calculate circular positions
  const radius = 280; // Distance from center
  const angleStep = (2 * Math.PI) / cards.length;

  return (
    <div className="relative h-[600px] w-full lg:h-[700px]">
      {/* Central glow effect */}
      <div className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2 h-96 w-96 animate-pulse rounded-full bg-purple-600/20 blur-3xl" />

      {/* Rotating container for circular motion */}
      <div className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2 h-full w-full">
        <div
          className={cn(
            "absolute inset-0 transition-all duration-1000",
            hoveredCard !== null ? "animation-paused" : ""
          )}
          style={{
            animation:
              hoveredCard === null
                ? "circularRotate 30s linear infinite"
                : "none",
          }}
        >
          {/* Floating video cards */}
          {cards.map((card, index) => {
            const angle = angleStep * index;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            return (
              <div
                className={cn(
                  "absolute h-80 w-64 cursor-pointer transition-all duration-500",
                  card.scale,
                  hoveredCard === card.id ? "!scale-110 z-50" : "",
                  hoveredCard !== null && hoveredCard !== card.id
                    ? "opacity-60 blur-[2px]"
                    : ""
                )}
                key={card.id}
                onMouseEnter={() => setHoveredCard(card.id)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                  left: "50%",
                  top: "50%",
                  transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                  zIndex: hoveredCard === card.id ? 100 : card.zIndex,
                }}
              >
                {/* Card container */}
                <div
                  className={cn(
                    "relative h-full w-full overflow-hidden rounded-2xl border-2 border-white/10 shadow-2xl transition-all duration-500",
                    `bg-gradient-to-br ${card.gradient}`
                  )}
                >
                  {/* Shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

                  {/* Card header */}
                  <div className="p-6">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm">
                      {card.icon}
                    </div>
                    <h3 className="mb-1 font-bold text-white text-xl">
                      {card.title}
                    </h3>
                    <p className="text-sm text-white/70">{card.subtitle}</p>
                  </div>

                  {/* Video preview area */}
                  <div className="absolute right-0 bottom-0 left-0 h-48 border-white/10 border-t bg-black/40 backdrop-blur-sm">
                    {/* Animated gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                    {/* Preview content */}
                    <div className="relative flex h-full items-center justify-center">
                      {/* Animated dots pattern */}
                      <div
                        className="absolute inset-0"
                        style={{
                          backgroundImage:
                            "radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)",
                          backgroundSize: "20px 20px",
                        }}
                      />

                      {/* Play button */}
                      <div
                        className={cn(
                          "flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/30 bg-white/20 backdrop-blur-md transition-all",
                          hoveredCard === card.id ? "scale-110 bg-white/30" : ""
                        )}
                      >
                        <Play className="ml-1 h-8 w-8 text-white" />
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="absolute right-4 bottom-4 left-4">
                      <div className="h-1 overflow-hidden rounded-full bg-white/20">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-white/60 to-white/80 transition-all duration-1000"
                          style={{
                            width: hoveredCard === card.id ? "60%" : "0%",
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Glow effect on hover */}
                  {hoveredCard === card.id && (
                    <div className="absolute inset-0 animate-pulse bg-white/5" />
                  )}

                  {/* Corner decorations */}
                  <div className="absolute top-3 left-3 h-6 w-6 border-white/30 border-t-2 border-l-2" />
                  <div className="absolute top-3 right-3 h-6 w-6 border-white/30 border-t-2 border-r-2" />
                  <div className="absolute bottom-3 left-3 h-6 w-6 border-white/30 border-b-2 border-l-2" />
                  <div className="absolute right-3 bottom-3 h-6 w-6 border-white/30 border-r-2 border-b-2" />
                </div>

                {/* Shadow effect */}
                <div
                  className={cn(
                    "-bottom-4 -translate-x-1/2 absolute left-1/2 h-8 w-4/5 rounded-full bg-black/40 blur-xl transition-all",
                    hoveredCard === card.id
                      ? "w-full opacity-100"
                      : "opacity-60"
                  )}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Center text */}
      <div className="-translate-x-1/2 -translate-y-1/2 pointer-events-none absolute top-1/2 left-1/2 z-0 text-center">
        <h3 className="mb-2 font-bold text-4xl text-white/10">
          Powerful Features
        </h3>
        <p className="text-lg text-white/5">Hover to explore</p>
      </div>

      <style jsx>{`
        @keyframes circularRotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .animation-paused {
          animation-play-state: paused !important;
        }
      `}</style>
    </div>
  );
}
