"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface LampAnimationProps {
  children: React.ReactNode;
  label?: string;
}

export function LampAnimation({ children, label = "LOGIN" }: LampAnimationProps) {
  const [isOn, setIsOn] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  const toggleLamp = useCallback(() => {
    setIsPulling(true);
    setTimeout(() => {
      setIsOn((prev) => !prev);
      setIsPulling(false);
    }, 250);
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-hidden select-none">
      {/* ===== TROPICAL SUNSET BACKGROUND — bright warm colors ===== */}
      <div className="absolute inset-0">
        {/* Sky — vivid warm sunset */}
        <div className="absolute inset-0" style={{
          background: "linear-gradient(to bottom, #1a0a14 0%, #3d1428 12%, #7a2244 28%, #c44a22 48%, #e8862c 62%, #f5ba3c 74%, #fcd34d 82%, #f59e0b 88%, #c2410c 94%, #1a0a06 100%)"
        }} />

        {/* Sun glow — large warm halo */}
        <div className="absolute bottom-[15%] left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(255,230,80,0.95) 0%, rgba(255,180,40,0.7) 25%, rgba(245,130,20,0.4) 50%, rgba(200,60,10,0.15) 75%, transparent 100%)" }}
        />

        {/* Sun disc */}
        <div className={cn(
          "absolute bottom-[18%] left-1/2 -translate-x-1/2 w-20 h-20 rounded-full transition-all duration-1000",
          isOn
            ? "shadow-[0_0_80px_rgba(255,220,60,0.9),0_0_160px_rgba(255,160,20,0.6)] scale-110"
            : "shadow-[0_0_50px_rgba(255,180,40,0.6),0_0_100px_rgba(255,120,20,0.3)]"
        )} style={{
          background: isOn
            ? "radial-gradient(circle, #fffef0 0%, #ffe066 35%, #ffb020 70%, #ff8c00 100%)"
            : "radial-gradient(circle, #ffe566 0%, #ffaa22 45%, #e87020 80%, #c04020 100%)"
        }} />

        {/* Water / ocean */}
        <div className="absolute bottom-0 left-0 right-0 h-[14%]" style={{
          background: "linear-gradient(to top, #0d0604, #2a1008, #4a2010)"
        }}>
          <div className="absolute inset-0" style={{
            background: "radial-gradient(ellipse at center top, rgba(255,180,60,0.5), rgba(200,100,20,0.2) 50%, transparent 80%)"
          }} />
          <div className="absolute inset-0 opacity-50">
            <div className="absolute top-2 left-[25%] w-[50%] h-px lamp-water-shimmer" style={{
              background: "linear-gradient(to right, transparent, rgba(252,211,77,0.8), transparent)"
            }} />
            <div className="absolute top-5 left-[30%] w-[40%] h-px lamp-water-shimmer" style={{
              animationDelay: "0.7s",
              background: "linear-gradient(to right, transparent, rgba(251,191,36,0.6), transparent)"
            }} />
            <div className="absolute top-8 left-[20%] w-[60%] h-px lamp-water-shimmer" style={{
              animationDelay: "1.4s",
              background: "linear-gradient(to right, transparent, rgba(253,224,71,0.4), transparent)"
            }} />
          </div>
        </div>

        {/* LEFT PALM TREE — dark silhouette on bright sky */}
        <svg className="absolute bottom-[10%] left-0 w-[38%] h-[88%]" viewBox="0 0 300 700" fill="none" preserveAspectRatio="xMinYMax meet">
          <path d="M 85 700 Q 95 540 110 430 Q 125 340 140 270" stroke="#0f0805" strokeWidth="20" fill="none" strokeLinecap="round" />
          <path d="M 85 700 Q 95 540 110 430 Q 125 340 140 270" stroke="#1a0e08" strokeWidth="14" fill="none" strokeLinecap="round" />
          <path d="M 95 600 Q 100 595 115 600" stroke="#2a1a10" strokeWidth="2" fill="none" opacity="0.5" />
          <path d="M 100 520 Q 108 515 118 520" stroke="#2a1a10" strokeWidth="2" fill="none" opacity="0.5" />
          <path d="M 140 270 Q 60 190 -30 240" stroke="#0a1608" strokeWidth="5" fill="none" />
          <path d="M 140 270 Q 55 200 -20 230" fill="#0d1f0a" opacity="0.95" />
          <path d="M 140 270 Q 75 170 10 185" stroke="#0a1608" strokeWidth="4" fill="none" />
          <path d="M 140 270 Q 70 180 15 185" fill="#102808" opacity="0.9" />
          <path d="M 140 270 Q 95 165 50 145" stroke="#0a1608" strokeWidth="3" fill="none" />
          <path d="M 140 270 Q 90 175 55 150" fill="#0d1f0a" opacity="0.85" />
          <path d="M 140 270 Q 35 235 -40 310" stroke="#081508" strokeWidth="3" fill="none" opacity="0.8" />
          <path d="M 140 270 Q 45 255 -20 330" fill="#0a1a08" opacity="0.7" />
          <path d="M 140 270 Q 170 165 220 145" fill="#0d1f0a" opacity="0.85" />
          <path d="M 140 270 Q 180 190 240 200" stroke="#0a1608" strokeWidth="3" fill="none" />
          <path d="M 140 270 Q 175 200 230 205" fill="#102808" opacity="0.8" />
          <path d="M 140 270 Q 135 180 120 120" fill="#0d1f0a" opacity="0.75" />
        </svg>

        {/* RIGHT PALM TREE */}
        <svg className="absolute bottom-[10%] right-0 w-[38%] h-[88%]" viewBox="0 0 300 700" fill="none" preserveAspectRatio="xMaxYMax meet">
          <path d="M 215 700 Q 205 540 190 430 Q 175 340 160 270" stroke="#0f0805" strokeWidth="20" fill="none" strokeLinecap="round" />
          <path d="M 215 700 Q 205 540 190 430 Q 175 340 160 270" stroke="#1a0e08" strokeWidth="14" fill="none" strokeLinecap="round" />
          <path d="M 205 600 Q 200 595 185 600" stroke="#2a1a10" strokeWidth="2" fill="none" opacity="0.5" />
          <path d="M 200 520 Q 192 515 182 520" stroke="#2a1a10" strokeWidth="2" fill="none" opacity="0.5" />
          <path d="M 160 270 Q 240 190 330 240" stroke="#0a1608" strokeWidth="5" fill="none" />
          <path d="M 160 270 Q 245 200 320 230" fill="#0d1f0a" opacity="0.95" />
          <path d="M 160 270 Q 225 170 290 185" stroke="#0a1608" strokeWidth="4" fill="none" />
          <path d="M 160 270 Q 230 180 285 185" fill="#102808" opacity="0.9" />
          <path d="M 160 270 Q 205 165 250 145" stroke="#0a1608" strokeWidth="3" fill="none" />
          <path d="M 160 270 Q 210 175 245 150" fill="#0d1f0a" opacity="0.85" />
          <path d="M 160 270 Q 265 235 340 310" stroke="#081508" strokeWidth="3" fill="none" opacity="0.8" />
          <path d="M 160 270 Q 255 255 320 330" fill="#0a1a08" opacity="0.7" />
          <path d="M 160 270 Q 130 165 80 145" fill="#0d1f0a" opacity="0.85" />
          <path d="M 160 270 Q 120 190 60 200" stroke="#0a1608" strokeWidth="3" fill="none" />
          <path d="M 160 270 Q 125 200 70 205" fill="#102808" opacity="0.8" />
          <path d="M 160 270 Q 165 180 180 120" fill="#0d1f0a" opacity="0.75" />
        </svg>

        {/* Foreground silhouette palms — left edge */}
        <svg className="absolute bottom-[6%] -left-[5%] w-[25%] h-[45%] opacity-60" viewBox="0 0 200 400" fill="none" preserveAspectRatio="xMinYMax meet">
          <path d="M 30 400 Q 45 300 70 230" stroke="#080604" strokeWidth="16" fill="none" strokeLinecap="round" />
          <path d="M 70 230 Q 20 170 -40 200" fill="#0a1608" opacity="0.9" />
          <path d="M 70 230 Q 40 150 0 130" fill="#0d1f0a" opacity="0.85" />
          <path d="M 70 230 Q 100 140 150 130" fill="#0a1608" opacity="0.8" />
        </svg>

        {/* Foreground — right edge */}
        <svg className="absolute bottom-[6%] -right-[5%] w-[25%] h-[45%] opacity-60" viewBox="0 0 200 400" fill="none" preserveAspectRatio="xMaxYMax meet">
          <path d="M 170 400 Q 155 300 130 230" stroke="#080604" strokeWidth="16" fill="none" strokeLinecap="round" />
          <path d="M 130 230 Q 180 170 240 200" fill="#0a1608" opacity="0.9" />
          <path d="M 130 230 Q 160 150 200 130" fill="#0d1f0a" opacity="0.85" />
          <path d="M 130 230 Q 100 140 50 130" fill="#0a1608" opacity="0.8" />
        </svg>
      </div>

      {/* ===== LAMP (top-center hanging) ===== */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center">
        {/* Ceiling mount */}
        <div className="w-24 h-5 bg-gradient-to-b from-gray-500 to-gray-700 rounded-b-lg shadow-lg border-x border-b border-gray-600/50" />

        {/* Wire */}
        <div className={cn(
          "w-0.5 bg-gray-300 transition-all duration-200 origin-top",
          isPulling ? "h-14" : "h-10"
        )} />

        {/* Lamp shade */}
        <div className="relative">
          <svg width="140" height="60" viewBox="0 0 140 60" className="drop-shadow-xl">
            <defs>
              <linearGradient id="shadeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={isOn ? "#9ca3af" : "#6b7280"} />
                <stop offset="50%" stopColor={isOn ? "#6b7280" : "#4b5563"} />
                <stop offset="100%" stopColor={isOn ? "#4b5563" : "#374151"} />
              </linearGradient>
            </defs>
            <path d="M 40 0 L 5 52 Q 5 58 12 58 L 128 58 Q 135 58 135 52 L 100 0 Z"
              fill="url(#shadeGrad)" stroke="#555" strokeWidth="1.5" />
            {isOn && (
              <path d="M 12 58 L 128 58" stroke="rgba(255,220,100,0.6)" strokeWidth="2" />
            )}
          </svg>

          {/* Dynamic label on shade */}
          <span className={cn(
            "absolute top-4 left-1/2 -translate-x-1/2 text-[11px] font-bold tracking-[0.25em] transition-colors duration-500 whitespace-nowrap",
            isOn ? "text-amber-200" : "text-gray-400"
          )}>
            {label}
          </span>

          {/* Bulb */}
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
            <div className={cn(
              "w-5 h-6 rounded-full transition-all duration-500",
              isOn && "shadow-[0_0_25px_rgba(255,215,0,0.95),0_0_50px_rgba(255,170,0,0.7),0_0_80px_rgba(255,140,0,0.4)]"
            )} style={{
              background: isOn
                ? "radial-gradient(circle, #fffef0 0%, #ffd700 50%, #ffaa00 100%)"
                : "radial-gradient(circle, #9ca3af 0%, #6b7280 100%)",
              clipPath: "polygon(25% 0%, 75% 0%, 90% 55%, 80% 90%, 55% 100%, 45% 100%, 20% 90%, 10% 55%)",
            }} />
          </div>

          {/* Pull cord */}
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex flex-col items-center">
            <div className={cn(
              "w-px transition-all duration-200",
              isPulling ? "h-16" : "h-12",
              isOn ? "bg-amber-300/70" : "bg-gray-400"
            )} />
            <button
              onClick={toggleLamp}
              className={cn(
                "w-4 h-4 rounded-full transition-all duration-300 cursor-pointer hover:scale-[1.6] relative group",
                isOn
                  ? "bg-gradient-to-b from-amber-200 to-amber-500 shadow-[0_0_12px_rgba(255,200,0,0.6)]"
                  : "bg-gradient-to-b from-gray-200 to-gray-500 shadow-md",
                isPulling && "translate-y-4 scale-125"
              )}
              aria-label="Pull cord to toggle lamp"
            >
              {!isOn && (
                <span className="absolute top-6 left-1/2 -translate-x-1/2 text-[10px] text-amber-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none font-bold lamp-pull-bounce">
                  ↓ Pull
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ===== SUNLIGHT BEAM CONE ===== */}
      <div className={cn(
        "absolute left-1/2 -translate-x-1/2 transition-all origin-top pointer-events-none z-20",
        isOn ? "opacity-100 scale-y-100 duration-700" : "opacity-0 scale-y-0 duration-300"
      )} style={{ top: "75px" }}>
        <div className="w-0 h-0 mx-auto" style={{
          borderLeft: "260px solid transparent",
          borderRight: "260px solid transparent",
          borderTop: "600px solid rgba(255, 220, 100, 0.08)",
          filter: "blur(12px)",
        }} />
      </div>
      <div className={cn(
        "absolute left-1/2 -translate-x-1/2 transition-all origin-top pointer-events-none z-20",
        isOn ? "opacity-100 scale-y-100 duration-700 delay-100" : "opacity-0 scale-y-0 duration-300"
      )} style={{ top: "75px" }}>
        <div className="w-0 h-0 mx-auto" style={{
          borderLeft: "140px solid transparent",
          borderRight: "140px solid transparent",
          borderTop: "550px solid rgba(255, 235, 150, 0.06)",
          filter: "blur(18px)",
        }} />
      </div>
      <div className={cn(
        "absolute left-1/2 -translate-x-1/2 w-48 h-28 rounded-full pointer-events-none z-20 transition-all duration-700",
        isOn ? "opacity-100" : "opacity-0"
      )} style={{
        top: "76px",
        background: "radial-gradient(ellipse, rgba(255,225,110,0.3) 0%, transparent 70%)",
        filter: "blur(10px)",
      }} />

      {/* ===== FORM (revealed inside beam) ===== */}
      <div className="absolute inset-0 flex items-center justify-center px-4" style={{ zIndex: 25 }}>
        <div className={cn(
          "w-full max-w-md transition-all",
          isOn
            ? "opacity-100 translate-y-0 scale-100 duration-700 delay-300"
            : "opacity-0 translate-y-10 scale-90 duration-300 pointer-events-none"
        )}>
          {children}
        </div>
      </div>

      {/* Edge vignette */}
      <div className="absolute inset-0 pointer-events-none z-10" style={{
        background: "radial-gradient(ellipse at center 55%, transparent 40%, rgba(0,0,0,0.3) 100%)"
      }} />

      {/* Fireflies when lamp is on */}
      {isOn && (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 15 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute w-1 h-1 bg-amber-300/60 rounded-full lamp-firefly" style={{
              left: `${20 + Math.random() * 60}%`,
              top: `${30 + Math.random() * 50}%`,
              animationDelay: `${i * 0.8}s`,
              animationDuration: `${3 + Math.random() * 3}s`,
            }} />
          ))}
        </div>
      )}
    </div>
  );
}
