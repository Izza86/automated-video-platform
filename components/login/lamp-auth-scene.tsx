"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface LampAuthSceneProps {
  children: React.ReactNode;
  label?: string;
}

export function LampAuthScene({
  children,
  label = "AUTH",
}: LampAuthSceneProps) {
  const [isOn, setIsOn] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);

  // Eye blink every minute
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 200);
    }, 60000);
    return () => clearInterval(blinkInterval);
  }, []);

  const pullString = useCallback(() => {
    setIsPulling(true);
    window.setTimeout(() => {
      setIsOn((prev) => !prev);
      setIsPulling(false);
    }, 180);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#060b1a] text-white">
      {/* Ambient glow */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 transition-opacity duration-700",
          isOn ? "opacity-100" : "opacity-60"
        )}
        style={{
          background:
            "radial-gradient(ellipse at 28% 50%, rgba(168,85,247,0.28) 0%, rgba(100,50,200,0.14) 25%, transparent 55%), linear-gradient(180deg, #04050f 0%, #080b1f 50%, #0b1229 100%)",
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col md:flex-row">
        {/* ─── Left: Lamp only ─── */}
        <section className="relative flex min-h-[420px] flex-1 flex-col items-center justify-center p-6 md:min-h-screen md:max-w-[44%]">
          <div className="relative h-[420px] w-[260px]">
            {/* Floor glow */}
            <div
              className={cn(
                "-translate-x-1/2 pointer-events-none absolute bottom-10 left-1/2 h-16 w-48 rounded-full blur-2xl transition-opacity duration-700",
                isOn ? "opacity-100" : "opacity-0"
              )}
              style={{
                background:
                  "radial-gradient(circle, rgba(168,85,247,0.5) 0%, rgba(168,85,247,0.08) 70%, transparent 100%)",
              }}
            />

            {/* Lamp SVG — wide trapezoid shade matching reference */}
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox="0 0 260 420"
            >
              <defs>
                <linearGradient id="shadeGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#d8a0ff" />
                  <stop offset="50%" stopColor="#b06aff" />
                  <stop offset="100%" stopColor="#7c3aed" />
                </linearGradient>
                <linearGradient id="stemGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#8e99c4" />
                  <stop offset="100%" stopColor="#4e5a82" />
                </linearGradient>
                <linearGradient id="baseGrad" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="#3a4570" />
                  <stop offset="50%" stopColor="#5e6da0" />
                  <stop offset="100%" stopColor="#3a4570" />
                </linearGradient>
                <radialGradient id="bulbGlow">
                  <stop offset="0%" stopColor="#fff8ee" />
                  <stop offset="100%" stopColor="#e8d0ff" />
                </radialGradient>
              </defs>

              {/* Cap */}
              <ellipse
                cx="130"
                cy="78"
                fill="#2b2f47"
                opacity="0.85"
                rx="20"
                ry="10"
              />

              {/* Shade — wide trapezoid */}
              <path
                d="M82 100 L178 100 C188 100 194 108 198 122 L218 190 C222 204 214 214 200 214 L60 214 C46 214 38 204 42 190 L62 122 C66 108 72 100 82 100Z"
                fill="url(#shadeGrad)"
              />

              {/* Eyes - with blink animation */}
              <circle 
                cx="108" 
                cy="156" 
                fill="#1d1038" 
                r={isBlinking ? "0.5" : "5"} 
                className="transition-all duration-150"
              />
              <circle 
                cx="152" 
                cy="156" 
                fill="#1d1038" 
                r={isBlinking ? "0.5" : "5"} 
                className="transition-all duration-150"
              />
              {/* Mouth - smile when on */}
              <path
                d={isOn ? "M112 176 Q130 195 148 176" : "M112 176 Q130 190 148 176"}
                fill="none"
                stroke="#1d1038"
                strokeLinecap="round"
                strokeWidth="4"
                className="transition-all duration-300"
              />

              {/* Bulb */}
              <path
                d="M118 216 C118 206 124 198 130 198 C136 198 142 206 142 216 L139 244 C138 250 122 250 121 244 Z"
                fill={isOn ? "url(#bulbGlow)" : "#c8c8d8"}
                style={{
                  filter: isOn
                    ? "drop-shadow(0 0 18px rgba(245,220,255,0.95)) drop-shadow(0 0 40px rgba(168,85,247,0.5))"
                    : "none",
                }}
              />

              {/* Stem */}
              <rect
                fill="url(#stemGrad)"
                height="78"
                rx="5"
                width="10"
                x="125"
                y="256"
              />

              {/* Base platform */}
              <rect
                fill="#384262"
                height="10"
                opacity="0.9"
                rx="5"
                width="72"
                x="94"
                y="336"
              />

              {/* Base ellipse */}
              <ellipse
                cx="130"
                cy="360"
                fill="url(#baseGrad)"
                rx="44"
                ry="12"
              />
            </svg>

              {/* Pull string — ONLY hanging down from bulb area */}
            <div className="-translate-x-1/2 absolute top-[244px] left-[50%] z-30">
              <button
                aria-label="Pull cord to toggle lamp"
                className="flex cursor-pointer flex-col items-center"
                onClick={pullString}
                type="button"
              >
                {/* Cord hanging down ONLY - no upper wire */}
                <span
                  className={cn(
                    "block w-[2px] rounded-full bg-amber-100/90 transition-all duration-300",
                    isPulling ? "h-[100px]" : "h-[80px]"
                  )}
                />
                <span
                  className={cn(
                    "mt-1 h-4 w-4 rounded-full border border-white/30 transition-all duration-200",
                    isOn
                      ? "bg-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.9)]"
                      : "bg-amber-200/80",
                    isPulling && "translate-y-3 scale-110"
                  )}
                />
              </button>
            </div>

            {/* Bright yellow light from bottom when pulled - INCREASED */}
            <div
              className={cn(
                "-translate-x-1/2 pointer-events-none absolute bottom-[60px] left-1/2 z-10 transition-all duration-700",
                isOn ? "opacity-100 scale-125" : "opacity-0 scale-100"
              )}
            >
              {/* Intense yellow glow - BRIGHTER */}
              <div 
                className="h-40 w-56 rounded-full blur-3xl"
                style={{
                  background: "radial-gradient(ellipse, rgba(251,191,36,1) 0%, rgba(251,191,36,0.8) 20%, rgba(251,191,36,0.5) 40%, rgba(168,85,247,0.3) 60%, transparent 100%)",
                  boxShadow: isOn ? "0 0 120px 60px rgba(251,191,36,0.9), 0 0 240px 120px rgba(251,191,36,0.6), 0 0 400px 200px rgba(251,191,36,0.3)" : "none"
                }}
              />
              {/* Light rays - STRONGER */}
              <div 
                className={cn(
                  "absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-28 transition-all duration-700",
                  isOn ? "opacity-100" : "opacity-0"
                )}
                style={{
                  background: "linear-gradient(to bottom, rgba(251,191,36,0.9) 0%, rgba(251,191,36,0.4) 50%, transparent 100%)",
                  filter: "blur(10px)"
                }}
              />
            </div>

            {/* Light cone */}
            <div
              className={cn(
                "-translate-x-1/2 pointer-events-none absolute top-[215px] left-1/2 transition-all duration-700",
                isOn ? "opacity-100" : "opacity-0"
              )}
            >
              <div
                className="h-0 w-0"
                style={{
                  borderLeft: "120px solid transparent",
                  borderRight: "120px solid transparent",
                  borderTop: "210px solid rgba(168,85,247,0.18)",
                  filter: "blur(10px)",
                }}
              />
            </div>
          </div>

          {/* Welcome text below lamp */}
          <div className="mt-4 text-center">
            <h2 className="font-bold text-3xl text-white tracking-tight">
              Welcome Back
            </h2>
            <p className="mt-2 text-base text-violet-300/80">
              Pull the cord to illuminate your journey
            </p>
          </div>
        </section>

        {/* ─── Right: Auth form with dark pinkish shadow ─── */}
        <section className="flex flex-[1.3] items-center justify-center p-4 pb-10 md:p-10">
          <div
            className={cn(
              "w-full max-w-xl transition-all duration-500 relative",
              isOn
                ? "translate-y-0 opacity-100"
                : "pointer-events-none translate-y-5 opacity-0"
            )}
            style={{
              boxShadow: isOn 
                ? "0 0 60px 20px rgba(236, 72, 153, 0.4), 0 0 100px 40px rgba(168, 85, 247, 0.2), inset 0 0 60px rgba(236, 72, 153, 0.1)" 
                : "0 0 40px 10px rgba(236, 72, 153, 0.15), 0 0 80px 20px rgba(168, 85, 247, 0.1)",
              borderRadius: "24px"
            }}
          >
            {/* Glow effect behind form */}
            <div 
              className="absolute -inset-4 rounded-[32px] -z-10 blur-2xl transition-all duration-700"
              style={{
                background: isOn 
                  ? "radial-gradient(ellipse, rgba(236, 72, 153, 0.5) 0%, rgba(168, 85, 247, 0.3) 50%, transparent 70%)"
                  : "radial-gradient(ellipse, rgba(236, 72, 153, 0.2) 0%, rgba(168, 85, 247, 0.1) 50%, transparent 70%)"
              }}
            />
            {children}
          </div>

          {!isOn && (
            <div className="absolute right-5 bottom-8 font-medium text-violet-200/60 text-xs md:right-10">
              Pull the cord to reveal your form
            </div>
          )}
        </section>
      </div>
    </div>
  );
}