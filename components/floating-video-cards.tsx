"use client";

import { useState } from "react";
import { Play, Sparkles, Zap, Film, Video } from "lucide-react";
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
      icon: <Sparkles className="w-6 h-6" />,
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
      icon: <Film className="w-6 h-6" />,
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
      icon: <Zap className="w-6 h-6" />,
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
      icon: <Video className="w-6 h-6" />,
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
      icon: <Play className="w-6 h-6" />,
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
    <div className="relative w-full h-[600px] lg:h-[700px]">
      {/* Central glow effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse" />

      {/* Rotating container for circular motion */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full">
        <div 
          className={cn(
            "absolute inset-0 transition-all duration-1000",
            hoveredCard !== null ? "animation-paused" : ""
          )}
          style={{
            animation: hoveredCard === null ? "circularRotate 30s linear infinite" : "none",
          }}
        >
          {/* Floating video cards */}
          {cards.map((card, index) => {
            const angle = angleStep * index;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            return (
              <div
                key={card.id}
                className={cn(
                  "absolute w-64 h-80 cursor-pointer transition-all duration-500",
                  card.scale,
                  hoveredCard === card.id ? "!scale-110 z-50" : "",
                  hoveredCard !== null && hoveredCard !== card.id ? "opacity-60 blur-[2px]" : ""
                )}
                style={{
                  left: "50%",
                  top: "50%",
                  transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                  zIndex: hoveredCard === card.id ? 100 : card.zIndex,
                }}
                onMouseEnter={() => setHoveredCard(card.id)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                {/* Card container */}
                <div
                  className={cn(
                    "relative w-full h-full rounded-2xl border-2 border-white/10 overflow-hidden shadow-2xl transition-all duration-500",
                    `bg-gradient-to-br ${card.gradient}`
                  )}
                >
                  {/* Shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  {/* Card header */}
                  <div className="p-6">
                    <div className="w-14 h-14 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-4 border border-white/20">
                      {card.icon}
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1">{card.title}</h3>
                    <p className="text-sm text-white/70">{card.subtitle}</p>
                  </div>

                  {/* Video preview area */}
                  <div className="absolute bottom-0 left-0 right-0 h-48 bg-black/40 backdrop-blur-sm border-t border-white/10">
                    {/* Animated gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    
                    {/* Preview content */}
                    <div className="relative h-full flex items-center justify-center">
                      {/* Animated dots pattern */}
                      <div className="absolute inset-0" style={{
                        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
                        backgroundSize: '20px 20px',
                      }} />

                      {/* Play button */}
                      <div className={cn(
                        "w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border-2 border-white/30 transition-all",
                        hoveredCard === card.id ? "scale-110 bg-white/30" : ""
                      )}>
                        <Play className="w-8 h-8 text-white ml-1" />
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-white/60 to-white/80 rounded-full transition-all duration-1000"
                          style={{
                            width: hoveredCard === card.id ? '60%' : '0%',
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Glow effect on hover */}
                  {hoveredCard === card.id && (
                    <div className="absolute inset-0 bg-white/5 animate-pulse" />
                  )}

                  {/* Corner decorations */}
                  <div className="absolute top-3 left-3 w-6 h-6 border-l-2 border-t-2 border-white/30" />
                  <div className="absolute top-3 right-3 w-6 h-6 border-r-2 border-t-2 border-white/30" />
                  <div className="absolute bottom-3 left-3 w-6 h-6 border-l-2 border-b-2 border-white/30" />
                  <div className="absolute bottom-3 right-3 w-6 h-6 border-r-2 border-b-2 border-white/30" />
                </div>

                {/* Shadow effect */}
                <div 
                  className={cn(
                    "absolute -bottom-4 left-1/2 -translate-x-1/2 w-4/5 h-8 bg-black/40 rounded-full blur-xl transition-all",
                    hoveredCard === card.id ? "w-full opacity-100" : "opacity-60"
                  )}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Center text */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-0">
        <h3 className="text-4xl font-bold text-white/10 mb-2">
          Powerful Features
        </h3>
        <p className="text-white/5 text-lg">
          Hover to explore
        </p>
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
