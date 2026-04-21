"use client";
import { Play, Sparkles, UploadCloud, Video } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import LandingBelowFold from "@/components/landing/landing-below-fold";
import { LandingNavbar } from "@/components/landing/landing-navbar";

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [particles, setParticles] = useState<
    Array<{ left: string; animationDelay: string; animationDuration: string }>
  >([]);

  React.useEffect(() => {
    setIsMounted(true);
    setParticles(
      [...Array(20)].map(() => ({
        left: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 15}s`,
        animationDuration: `${10 + Math.random() * 10}s`,
      }))
    );
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1408] via-[#2d1f0e] to-[#1a1408]">
      <LandingNavbar />

      {/* Marquee Text */}
      <div className="w-full overflow-hidden border-amber-400/50 border-y bg-gradient-to-r from-amber-700 via-yellow-600 to-amber-700 py-4">
        <div className="flex whitespace-nowrap">
          <div className="marquee flex items-center gap-8">
            {[...Array(10)].map((_, i) => (
              <span
                className="flex items-center gap-8 font-bold text-white text-xl md:text-2xl"
                key={i}
              >
                <span>✨ Transform Your Video with AI</span>
                <span className="text-purple-200">•</span>
                <span>Transform Your Video with AI</span>
                <span className="text-purple-200">•</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section
        className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-amber-900/20 via-yellow-900/10 to-[#1a1408] pt-24 pb-12"
        id="hero"
      >
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(180,130,50,0.2),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,rgba(200,150,60,0.15),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_80%,rgba(160,120,40,0.1),transparent_50%)]" />
        </div>

        {isMounted &&
          particles.map((particle, i) => (
            <div className="particles" key={i} style={particle} />
          ))}

        <div className="absolute top-1/4 left-1/4 h-96 w-96 animate-float rounded-full bg-amber-600/30 blur-3xl" />
        <div className="absolute right-1/4 bottom-1/3 h-80 w-80 animate-float-reverse rounded-full bg-yellow-700/20 blur-3xl" />
        <div
          className="absolute top-1/3 right-1/3 h-72 w-72 animate-float rounded-full bg-orange-600/20 blur-3xl"
          style={{ animationDelay: "2s" }}
        />

        <div className="relative z-20 mx-auto flex w-full max-w-[1400px] items-center justify-between gap-32 px-6">
          <div className="max-w-2xl text-left">
            <div className="mb-6 inline-block rounded-full border border-purple-500/50 bg-purple-600/20 px-4 py-2 backdrop-blur-sm">
              <span className="font-medium text-purple-300 text-sm">
                AI-Powered Video Editing
              </span>
            </div>

            <h1 className="mb-4 animate-[slideDown_1s_ease-out] font-extrabold text-6xl text-white drop-shadow-2xl md:text-7xl">
              Transform Your Videos
            </h1>

            <div className="mb-6 overflow-hidden">
              <div className="scroll-text flex whitespace-nowrap">
                {[...Array(5)].map((_, i) => (
                  <h2
                    className="gradient-text mx-8 font-bold text-5xl md:text-6xl"
                    key={i}
                  >
                    with AI Style Transfer
                  </h2>
                ))}
              </div>
            </div>

            <p className="mt-6 animate-[slideUp_1s_ease-out] text-white/80 text-xl leading-relaxed md:text-2xl">
              Copy cinematic looks, colors, and moods from any reference video
              <span className="font-semibold text-purple-400"> instantly</span>{" "}
              with our AI-powered style transfer
            </p>

            <div className="mt-12 flex animate-[fadeIn_1.2s_ease-out] flex-col gap-4 sm:flex-row">
              <Link
                className="group relative inline-flex items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-4 font-bold text-lg text-white shadow-2xl shadow-purple-900/50 transition-all duration-300 hover:from-purple-500 hover:to-pink-500"
                href="/signup"
              >
                <span className="shimmer-effect absolute inset-0" />
                <span className="relative flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Get Started Free
                </span>
              </Link>
              <a
                className="inline-flex items-center justify-center rounded-2xl border-2 border-purple-500/50 bg-black/40 px-8 py-4 font-semibold text-lg text-white backdrop-blur-sm transition-all duration-300 hover:border-purple-400 hover:bg-purple-900/30"
                href="#features"
              >
                <Video className="mr-2 h-5 w-5" />
                Watch Demo
              </a>
            </div>

            <div className="mt-12 grid grid-cols-3 gap-6">
              {[
                { value: "10K+", label: "Videos Processed" },
                { value: "4.9/5", label: "User Rating" },
                { value: "50+", label: "AI Models" },
              ].map((stat, i) => (
                <div key={i}>
                  <div className="mb-1 font-bold text-2xl text-purple-400 md:text-3xl">
                    {stat.value}
                  </div>
                  <div className="text-white/60 text-xs">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative ml-auto h-[650px] w-[500px] flex-shrink-0">
            {/* Reference Video Card */}
            <div className="group absolute top-0 right-0 h-80 w-52 overflow-hidden rounded-3xl border-2 border-purple-500/50 bg-gradient-to-br from-purple-900/90 to-purple-700/80 shadow-2xl backdrop-blur-xl transition-all duration-500 hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <div className="flex h-full flex-col p-5">
                <span className="mb-3 font-bold text-purple-300 text-sm">
                  📹 Reference Video
                </span>
                <div className="relative flex-1 overflow-hidden rounded-xl bg-purple-950/50">
                  <video
                    autoPlay
                    className="absolute inset-0 h-full w-full rounded-xl object-cover"
                    loop
                    muted
                    playsInline
                    src="/videos/reference.mp4"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-900/10 to-transparent">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/40 bg-white/20 backdrop-blur-sm transition-transform group-hover:scale-110">
                        <Play className="ml-0.5 h-6 w-6 text-white" />
                      </div>
                    </div>
                  </div>
                </div>
                <span className="mt-3 text-white/60 text-xs">Style Source</span>
              </div>
            </div>

            {/* Target Video Card */}
            <div className="group absolute top-0 left-0 h-80 w-52 overflow-hidden rounded-3xl border-2 border-pink-500/50 bg-gradient-to-br from-pink-900/90 to-pink-700/80 shadow-2xl backdrop-blur-xl transition-all duration-500 hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <div className="flex h-full flex-col p-5">
                <span className="mb-3 font-bold text-pink-300 text-sm">
                  🎬 Target Video
                </span>
                <div className="relative flex-1 overflow-hidden rounded-xl bg-pink-950/50">
                  <video
                    autoPlay
                    className="absolute inset-0 h-full w-full rounded-xl object-cover"
                    loop
                    muted
                    playsInline
                    src="/videos/target.mp4"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-pink-900/10 to-transparent">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="mx-auto mb-3 flex h-16 w-16 animate-pulse items-center justify-center rounded-2xl border-2 border-pink-300/50 border-dashed bg-pink-400/30 backdrop-blur-sm">
                          <UploadCloud className="h-8 w-8 animate-bounce text-pink-200" />
                        </div>
                        <span className="font-medium text-pink-200 text-xs">
                          Your Video
                        </span>
                        <div className="mt-2 text-[10px] text-pink-300/70">
                          Ready to transform
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <span className="mt-3 text-white/60 text-xs">
                  Original Content
                </span>
              </div>
            </div>

            {/* Output Video Card */}
            <div className="-translate-x-1/2 group absolute bottom-0 left-1/2 z-10 h-[340px] w-56 overflow-hidden rounded-3xl border-2 border-blue-500/50 bg-gradient-to-br from-blue-900/90 to-purple-900/90 shadow-2xl backdrop-blur-xl transition-all duration-500 hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <div className="flex h-full flex-col p-5">
                <span className="mb-3 flex items-center gap-2 font-bold text-blue-300 text-sm">
                  ✨ Output Video
                  <span className="rounded-full border border-green-500/50 bg-green-500/20 px-2 py-1 text-green-400 text-xs">
                    Ready
                  </span>
                </span>
                <div className="relative flex-1 overflow-hidden rounded-xl bg-gradient-to-br from-blue-950/50 to-purple-950/50">
                  <video
                    autoPlay
                    className="absolute inset-0 h-full w-full rounded-xl object-cover"
                    loop
                    muted
                    playsInline
                    src="/videos/output.mp4"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-900/10 to-purple-900/10">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative text-center">
                        <div className="relative">
                          <Sparkles className="mx-auto h-16 w-16 animate-pulse text-blue-300" />
                          <div className="absolute inset-0 animate-pulse bg-blue-400/40 blur-xl" />
                        </div>
                        <div className="mt-2 space-y-1">
                          <span className="block font-bold text-blue-200 text-xs">
                            AI Enhanced
                          </span>
                          <span className="block text-[10px] text-blue-300/80">
                            Style Transferred
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <span className="mt-3 font-medium text-sm text-white/80">
                  Transformed Result
                </span>
              </div>
            </div>

            {/* Connection Lines */}
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              style={{ zIndex: 5 }}
            >
              <defs>
                <linearGradient
                  id="lineGradient1"
                  x1="0%"
                  x2="100%"
                  y1="0%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="rgba(168, 85, 247, 0.6)" />
                  <stop offset="100%" stopColor="rgba(59, 130, 246, 0.6)" />
                </linearGradient>
                <linearGradient
                  id="lineGradient2"
                  x1="0%"
                  x2="100%"
                  y1="0%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="rgba(236, 72, 153, 0.6)" />
                  <stop offset="100%" stopColor="rgba(59, 130, 246, 0.6)" />
                </linearGradient>
              </defs>
              <path
                className="animate-pulse"
                d="M 130 300 Q 180 420 250 500"
                fill="none"
                stroke="url(#lineGradient1)"
                strokeDasharray="10 5"
                strokeWidth="3"
              />
              <path
                className="animate-pulse"
                d="M 370 300 Q 320 420 250 500"
                fill="none"
                stroke="url(#lineGradient2)"
                strokeDasharray="10 5"
                strokeWidth="3"
                style={{ animationDelay: "0.5s" }}
              />
            </svg>
          </div>
        </div>
      </section>

      {/* Below-fold content lazy-loaded for fast initial compilation */}
      <LandingBelowFold />
    </div>
  );
}
