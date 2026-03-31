"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";

interface LampAuthSceneProps {
  children: React.ReactNode;
  label?: string;
}

export function LampAuthScene({ children, label = "AUTH" }: LampAuthSceneProps) {
  const [isOn, setIsOn] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

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
          isOn ? "opacity-100" : "opacity-60",
        )}
        style={{
          background:
            "radial-gradient(ellipse at 28% 50%, rgba(168,85,247,0.28) 0%, rgba(100,50,200,0.14) 25%, transparent 55%), linear-gradient(180deg, #04050f 0%, #080b1f 50%, #0b1229 100%)",
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col md:flex-row">
        {/* ─── Left: Lamp only ─── */}
        <section className="relative flex min-h-[420px] flex-1 flex-col items-center justify-center p-6 md:min-h-screen md:max-w-[44%]">
          <div className="relative w-[260px] h-[420px]">
            {/* Floor glow */}
            <div
              className={cn(
                "pointer-events-none absolute bottom-10 left-1/2 h-16 w-48 -translate-x-1/2 rounded-full blur-2xl transition-opacity duration-700",
                isOn ? "opacity-100" : "opacity-0",
              )}
              style={{
                background:
                  "radial-gradient(circle, rgba(168,85,247,0.5) 0%, rgba(168,85,247,0.08) 70%, transparent 100%)",
              }}
            />

            {/* Lamp SVG — wide trapezoid shade matching reference */}
            <svg viewBox="0 0 260 420" className="absolute inset-0 h-full w-full">
              <defs>
                <linearGradient id="shadeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#d8a0ff" />
                  <stop offset="50%" stopColor="#b06aff" />
                  <stop offset="100%" stopColor="#7c3aed" />
                </linearGradient>
                <linearGradient id="stemGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8e99c4" />
                  <stop offset="100%" stopColor="#4e5a82" />
                </linearGradient>
                <linearGradient id="baseGrad" x1="0" y1="0" x2="1" y2="0">
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
              <ellipse cx="130" cy="78" rx="20" ry="10" fill="#2b2f47" opacity="0.85" />

              {/* Shade — wide trapezoid */}
              <path
                d="M82 100 L178 100 C188 100 194 108 198 122 L218 190 C222 204 214 214 200 214 L60 214 C46 214 38 204 42 190 L62 122 C66 108 72 100 82 100Z"
                fill="url(#shadeGrad)"
              />

              {/* Eyes */}
              <circle cx="108" cy="156" r="5" fill="#1d1038" />
              <circle cx="152" cy="156" r="5" fill="#1d1038" />
              {/* Mouth */}
              <path d="M112 176 Q130 190 148 176" stroke="#1d1038" strokeWidth="4" strokeLinecap="round" fill="none" />

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
              <rect x="125" y="256" width="10" height="78" rx="5" fill="url(#stemGrad)" />

              {/* Base platform */}
              <rect x="94" y="336" width="72" height="10" rx="5" fill="#384262" opacity="0.9" />

              {/* Base ellipse */}
              <ellipse cx="130" cy="360" rx="44" ry="12" fill="url(#baseGrad)" />
            </svg>

            {/* Pull string — inside cap */}
            <div className="absolute left-1/2 top-[78px] z-20 -translate-x-1/2">
              <button
                type="button"
                onClick={pullString}
                aria-label="Pull cord to toggle lamp"
                className="flex cursor-pointer flex-col items-center"
              >
                <span
                  className={cn(
                    "block w-[2px] rounded-full bg-violet-200/80 transition-all duration-200",
                    isPulling ? "h-[110px]" : "h-[88px]",
                  )}
                />
                <span
                  className={cn(
                    "mt-1 h-5 w-5 rounded-full border border-white/30 transition-all duration-200",
                    isOn
                      ? "bg-violet-300 shadow-[0_0_14px_rgba(168,85,247,0.9)]"
                      : "bg-violet-200/80",
                    isPulling && "translate-y-2",
                  )}
                />
              </button>
            </div>

            {/* Light cone */}
            <div
              className={cn(
                "pointer-events-none absolute left-1/2 top-[215px] -translate-x-1/2 transition-all duration-700",
                isOn ? "opacity-100" : "opacity-0",
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
            <h2 className="text-3xl font-bold tracking-tight text-white">Welcome Back</h2>
            <p className="mt-2 text-base text-violet-300/80">Pull the cord to illuminate your journey</p>
          </div>
        </section>

        {/* ─── Right: Auth form only (no nav cards) ─── */}
        <section className="flex flex-[1.3] items-center justify-center p-4 pb-10 md:p-10">
          <div
            className={cn(
              "w-full max-w-xl transition-all duration-500",
              isOn ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0 pointer-events-none",
            )}
          >
            {children}
          </div>

          {!isOn && (
            <div className="absolute bottom-8 right-5 text-xs font-medium text-violet-200/60 md:right-10">
              Pull the cord to reveal your form
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
