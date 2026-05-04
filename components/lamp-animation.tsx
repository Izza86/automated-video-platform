"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";

interface LampAnimationProps {
  children: React.ReactNode;
  label?: string;
}

export function LampAnimation({
  children,
  label = "LOGIN",
}: LampAnimationProps) {
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
    <div className="relative min-h-screen w-full select-none overflow-hidden">
      {/* ===== TROPICAL SUNSET BACKGROUND — bright warm colors ===== */}
      <div className="absolute inset-0">
        {/* Sky — vivid warm sunset */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, #1a0a14 0%, #3d1428 12%, #7a2244 28%, #c44a22 48%, #e8862c 62%, #f5ba3c 74%, #fcd34d 82%, #f59e0b 88%, #c2410c 94%, #1a0a06 100%)",
          }}
        />

        {/* Sun glow — large warm halo */}
        <div
          className="-translate-x-1/2 absolute bottom-[15%] left-1/2 h-[300px] w-[600px] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse, rgba(255,230,80,0.95) 0%, rgba(255,180,40,0.7) 25%, rgba(245,130,20,0.4) 50%, rgba(200,60,10,0.15) 75%, transparent 100%)",
          }}
        />

        {/* Sun disc */}
        <div
          className={cn(
            "-translate-x-1/2 absolute bottom-[18%] left-1/2 h-20 w-20 rounded-full transition-all duration-1000",
            isOn
              ? "scale-110 shadow-[0_0_80px_rgba(255,220,60,0.9),0_0_160px_rgba(255,160,20,0.6)]"
              : "shadow-[0_0_50px_rgba(255,180,40,0.6),0_0_100px_rgba(255,120,20,0.3)]"
          )}
          style={{
            background: isOn
              ? "radial-gradient(circle, #fffef0 0%, #ffe066 35%, #ffb020 70%, #ff8c00 100%)"
              : "radial-gradient(circle, #ffe566 0%, #ffaa22 45%, #e87020 80%, #c04020 100%)",
          }}
        />

        {/* Water / ocean */}
        <div
          className="absolute right-0 bottom-0 left-0 h-[14%]"
          style={{
            background: "linear-gradient(to top, #0d0604, #2a1008, #4a2010)",
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at center top, rgba(255,180,60,0.5), rgba(200,100,20,0.2) 50%, transparent 80%)",
            }}
          />
          <div className="absolute inset-0 opacity-50">
            <div
              className="lamp-water-shimmer absolute top-2 left-[25%] h-px w-[50%]"
              style={{
                background:
                  "linear-gradient(to right, transparent, rgba(252,211,77,0.8), transparent)",
              }}
            />
            <div
              className="lamp-water-shimmer absolute top-5 left-[30%] h-px w-[40%]"
              style={{
                animationDelay: "0.7s",
                background:
                  "linear-gradient(to right, transparent, rgba(251,191,36,0.6), transparent)",
              }}
            />
            <div
              className="lamp-water-shimmer absolute top-8 left-[20%] h-px w-[60%]"
              style={{
                animationDelay: "1.4s",
                background:
                  "linear-gradient(to right, transparent, rgba(253,224,71,0.4), transparent)",
              }}
            />
          </div>
        </div>

        {/* LEFT PALM TREE — dark silhouette on bright sky */}
        <svg
          className="absolute bottom-[10%] left-0 h-[88%] w-[38%]"
          fill="none"
          preserveAspectRatio="xMinYMax meet"
          viewBox="0 0 300 700"
        >
          <path
            d="M 85 700 Q 95 540 110 430 Q 125 340 140 270"
            fill="none"
            stroke="#0f0805"
            strokeLinecap="round"
            strokeWidth="20"
          />
          <path
            d="M 85 700 Q 95 540 110 430 Q 125 340 140 270"
            fill="none"
            stroke="#1a0e08"
            strokeLinecap="round"
            strokeWidth="14"
          />
          <path
            d="M 95 600 Q 100 595 115 600"
            fill="none"
            opacity="0.5"
            stroke="#2a1a10"
            strokeWidth="2"
          />
          <path
            d="M 100 520 Q 108 515 118 520"
            fill="none"
            opacity="0.5"
            stroke="#2a1a10"
            strokeWidth="2"
          />
          <path
            d="M 140 270 Q 60 190 -30 240"
            fill="none"
            stroke="#0a1608"
            strokeWidth="5"
          />
          <path d="M 140 270 Q 55 200 -20 230" fill="#0d1f0a" opacity="0.95" />
          <path
            d="M 140 270 Q 75 170 10 185"
            fill="none"
            stroke="#0a1608"
            strokeWidth="4"
          />
          <path d="M 140 270 Q 70 180 15 185" fill="#102808" opacity="0.9" />
          <path
            d="M 140 270 Q 95 165 50 145"
            fill="none"
            stroke="#0a1608"
            strokeWidth="3"
          />
          <path d="M 140 270 Q 90 175 55 150" fill="#0d1f0a" opacity="0.85" />
          <path
            d="M 140 270 Q 35 235 -40 310"
            fill="none"
            opacity="0.8"
            stroke="#081508"
            strokeWidth="3"
          />
          <path d="M 140 270 Q 45 255 -20 330" fill="#0a1a08" opacity="0.7" />
          <path d="M 140 270 Q 170 165 220 145" fill="#0d1f0a" opacity="0.85" />
          <path
            d="M 140 270 Q 180 190 240 200"
            fill="none"
            stroke="#0a1608"
            strokeWidth="3"
          />
          <path d="M 140 270 Q 175 200 230 205" fill="#102808" opacity="0.8" />
          <path d="M 140 270 Q 135 180 120 120" fill="#0d1f0a" opacity="0.75" />
        </svg>

        {/* RIGHT PALM TREE */}
        <svg
          className="absolute right-0 bottom-[10%] h-[88%] w-[38%]"
          fill="none"
          preserveAspectRatio="xMaxYMax meet"
          viewBox="0 0 300 700"
        >
          <path
            d="M 215 700 Q 205 540 190 430 Q 175 340 160 270"
            fill="none"
            stroke="#0f0805"
            strokeLinecap="round"
            strokeWidth="20"
          />
          <path
            d="M 215 700 Q 205 540 190 430 Q 175 340 160 270"
            fill="none"
            stroke="#1a0e08"
            strokeLinecap="round"
            strokeWidth="14"
          />
          <path
            d="M 205 600 Q 200 595 185 600"
            fill="none"
            opacity="0.5"
            stroke="#2a1a10"
            strokeWidth="2"
          />
          <path
            d="M 200 520 Q 192 515 182 520"
            fill="none"
            opacity="0.5"
            stroke="#2a1a10"
            strokeWidth="2"
          />
          <path
            d="M 160 270 Q 240 190 330 240"
            fill="none"
            stroke="#0a1608"
            strokeWidth="5"
          />
          <path d="M 160 270 Q 245 200 320 230" fill="#0d1f0a" opacity="0.95" />
          <path
            d="M 160 270 Q 225 170 290 185"
            fill="none"
            stroke="#0a1608"
            strokeWidth="4"
          />
          <path d="M 160 270 Q 230 180 285 185" fill="#102808" opacity="0.9" />
          <path
            d="M 160 270 Q 205 165 250 145"
            fill="none"
            stroke="#0a1608"
            strokeWidth="3"
          />
          <path d="M 160 270 Q 210 175 245 150" fill="#0d1f0a" opacity="0.85" />
          <path
            d="M 160 270 Q 265 235 340 310"
            fill="none"
            opacity="0.8"
            stroke="#081508"
            strokeWidth="3"
          />
          <path d="M 160 270 Q 255 255 320 330" fill="#0a1a08" opacity="0.7" />
          <path d="M 160 270 Q 130 165 80 145" fill="#0d1f0a" opacity="0.85" />
          <path
            d="M 160 270 Q 120 190 60 200"
            fill="none"
            stroke="#0a1608"
            strokeWidth="3"
          />
          <path d="M 160 270 Q 125 200 70 205" fill="#102808" opacity="0.8" />
          <path d="M 160 270 Q 165 180 180 120" fill="#0d1f0a" opacity="0.75" />
        </svg>

        {/* Foreground silhouette palms — left edge */}
        <svg
          className="-left-[5%] absolute bottom-[6%] h-[45%] w-[25%] opacity-60"
          fill="none"
          preserveAspectRatio="xMinYMax meet"
          viewBox="0 0 200 400"
        >
          <path
            d="M 30 400 Q 45 300 70 230"
            fill="none"
            stroke="#080604"
            strokeLinecap="round"
            strokeWidth="16"
          />
          <path d="M 70 230 Q 20 170 -40 200" fill="#0a1608" opacity="0.9" />
          <path d="M 70 230 Q 40 150 0 130" fill="#0d1f0a" opacity="0.85" />
          <path d="M 70 230 Q 100 140 150 130" fill="#0a1608" opacity="0.8" />
        </svg>

        {/* Foreground — right edge */}
        <svg
          className="-right-[5%] absolute bottom-[6%] h-[45%] w-[25%] opacity-60"
          fill="none"
          preserveAspectRatio="xMaxYMax meet"
          viewBox="0 0 200 400"
        >
          <path
            d="M 170 400 Q 155 300 130 230"
            fill="none"
            stroke="#080604"
            strokeLinecap="round"
            strokeWidth="16"
          />
          <path d="M 130 230 Q 180 170 240 200" fill="#0a1608" opacity="0.9" />
          <path d="M 130 230 Q 160 150 200 130" fill="#0d1f0a" opacity="0.85" />
          <path d="M 130 230 Q 100 140 50 130" fill="#0a1608" opacity="0.8" />
        </svg>
      </div>

      {/* ===== LAMP (top-center hanging) ===== */}
      <div className="-translate-x-1/2 absolute top-0 left-1/2 z-40 flex flex-col items-center">
        {/* Ceiling mount */}
        <div className="h-5 w-24 rounded-b-lg border-gray-600/50 border-x border-b bg-gradient-to-b from-gray-500 to-gray-700 shadow-lg" />

        {/* Wire */}
        <div
          className={cn(
            "w-0.5 origin-top bg-gray-300 transition-all duration-200",
            isPulling ? "h-14" : "h-10"
          )}
        />

        {/* Lamp shade */}
        <div className="relative">
          <svg
            className="drop-shadow-xl"
            height="60"
            viewBox="0 0 140 60"
            width="140"
          >
            <defs>
              <linearGradient id="shadeGrad" x1="0%" x2="0%" y1="0%" y2="100%">
                <stop offset="0%" stopColor={isOn ? "#9ca3af" : "#6b7280"} />
                <stop offset="50%" stopColor={isOn ? "#6b7280" : "#4b5563"} />
                <stop offset="100%" stopColor={isOn ? "#4b5563" : "#374151"} />
              </linearGradient>
            </defs>
            <path
              d="M 40 0 L 5 52 Q 5 58 12 58 L 128 58 Q 135 58 135 52 L 100 0 Z"
              fill="url(#shadeGrad)"
              stroke="#555"
              strokeWidth="1.5"
            />
            {isOn && (
              <path
                d="M 12 58 L 128 58"
                stroke="rgba(255,220,100,0.6)"
                strokeWidth="2"
              />
            )}
          </svg>

          {/* Dynamic label on shade */}
          <span
            className={cn(
              "-translate-x-1/2 absolute top-4 left-1/2 whitespace-nowrap font-bold text-[11px] tracking-[0.25em] transition-colors duration-500",
              isOn ? "text-amber-200" : "text-gray-400"
            )}
          >
            {label}
          </span>

          {/* Bulb */}
          <div className="-bottom-3 -translate-x-1/2 absolute left-1/2">
            <div
              className={cn(
                "h-6 w-5 rounded-full transition-all duration-500",
                isOn &&
                  "shadow-[0_0_25px_rgba(255,215,0,0.95),0_0_50px_rgba(255,170,0,0.7),0_0_80px_rgba(255,140,0,0.4)]"
              )}
              style={{
                background: isOn
                  ? "radial-gradient(circle, #fffef0 0%, #ffd700 50%, #ffaa00 100%)"
                  : "radial-gradient(circle, #9ca3af 0%, #6b7280 100%)",
                clipPath:
                  "polygon(25% 0%, 75% 0%, 90% 55%, 80% 90%, 55% 100%, 45% 100%, 20% 90%, 10% 55%)",
              }}
            />
          </div>

          {/* Pull cord — hanging from INSIDE the lamp shade */}
          <div className="-bottom-2 -translate-x-1/2 absolute left-1/2 flex flex-col items-center">
            <div
              className={cn(
                "w-px transition-all duration-200 origin-top",
                isPulling ? "h-24" : "h-20",
                isOn ? "bg-cyan-300/70" : "bg-gray-400"
              )}
            />
            <button
              aria-label="Pull cord to toggle lamp"
              className={cn(
                "group relative h-4 w-4 cursor-pointer rounded-full transition-all duration-300 hover:scale-[1.6]",
                isOn
                  ? "bg-gradient-to-b from-cyan-200 to-cyan-500 shadow-[0_0_12px_rgba(34,211,238,0.8)]"
                  : "bg-gradient-to-b from-gray-200 to-gray-500 shadow-md",
                isPulling && "translate-y-6 scale-125"
              )}
              onClick={toggleLamp}
            >
              {!isOn && (
                <span className="-translate-x-1/2 lamp-pull-bounce pointer-events-none absolute top-6 left-1/2 whitespace-nowrap font-bold text-[10px] text-cyan-300 opacity-0 transition-opacity group-hover:opacity-100">
                  ↓ Pull
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ===== SUNLIGHT BEAM CONE ===== */}
      <div
        className={cn(
          "-translate-x-1/2 pointer-events-none absolute left-1/2 z-20 origin-top transition-all",
          isOn
            ? "scale-y-100 opacity-100 duration-700"
            : "scale-y-0 opacity-0 duration-300"
        )}
        style={{ top: "75px" }}
      >
        <div
          className="mx-auto h-0 w-0"
          style={{
            borderLeft: "260px solid transparent",
            borderRight: "260px solid transparent",
            borderTop: "600px solid rgba(255, 220, 100, 0.08)",
            filter: "blur(12px)",
          }}
        />
      </div>
      <div
        className={cn(
          "-translate-x-1/2 pointer-events-none absolute left-1/2 z-20 origin-top transition-all",
          isOn
            ? "scale-y-100 opacity-100 delay-100 duration-700"
            : "scale-y-0 opacity-0 duration-300"
        )}
        style={{ top: "75px" }}
      >
        <div
          className="mx-auto h-0 w-0"
          style={{
            borderLeft: "140px solid transparent",
            borderRight: "140px solid transparent",
            borderTop: "550px solid rgba(255, 235, 150, 0.06)",
            filter: "blur(18px)",
          }}
        />
      </div>
      <div
        className={cn(
          "-translate-x-1/2 pointer-events-none absolute left-1/2 z-20 h-28 w-48 rounded-full transition-all duration-700",
          isOn ? "opacity-100" : "opacity-0"
        )}
        style={{
          top: "76px",
          background:
            "radial-gradient(ellipse, rgba(255,225,110,0.3) 0%, transparent 70%)",
          filter: "blur(10px)",
        }}
      />

      {/* ===== FORM (revealed inside beam) ===== */}
      <div
        className="absolute inset-0 flex items-center justify-center px-4"
        style={{ zIndex: 25 }}
      >
        <div
          className={cn(
            "w-full max-w-md transition-all",
            isOn
              ? "translate-y-0 scale-100 opacity-100 delay-300 duration-700"
              : "pointer-events-none translate-y-10 scale-90 opacity-0 duration-300"
          )}
        >
          {children}
        </div>
      </div>

      {/* Edge vignette */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            "radial-gradient(ellipse at center 55%, transparent 40%, rgba(0,0,0,0.3) 100%)",
        }}
      />

      {/* Fireflies when lamp is on */}
      {isOn && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ zIndex: 15 }}
        >
          {[...Array(6)].map((_, i) => (
            <div
              className="lamp-firefly absolute h-1 w-1 rounded-full bg-amber-300/60"
              key={i}
              style={{
                left: `${20 + Math.random() * 60}%`,
                top: `${30 + Math.random() * 50}%`,
                animationDelay: `${i * 0.8}s`,
                animationDuration: `${3 + Math.random() * 3}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
