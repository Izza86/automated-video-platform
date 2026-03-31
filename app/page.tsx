"use client";
import React, { useState } from "react";
import Link from "next/link";
import { UploadCloud, Video, Sparkles, Play } from 'lucide-react';
import { LandingNavbar } from '@/components/landing/landing-navbar';
import LandingBelowFold from '@/components/landing/landing-below-fold';

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [particles, setParticles] = useState<Array<{left: string; animationDelay: string; animationDuration: string}>>([]);

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
    <div className="bg-gradient-to-b from-[#1a1408] via-[#2d1f0e] to-[#1a1408] min-h-screen">
      <LandingNavbar />

      {/* Marquee Text */}
      <div className="w-full bg-gradient-to-r from-amber-700 via-yellow-600 to-amber-700 py-4 overflow-hidden border-y border-amber-400/50">
        <div className="flex whitespace-nowrap">
          <div className="flex items-center gap-8 marquee">
            {[...Array(10)].map((_, i) => (
              <span key={i} className="text-white font-bold text-xl md:text-2xl flex items-center gap-8">
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
        className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-amber-900/20 via-yellow-900/10 to-[#1a1408] pt-24 pb-12"
        id="hero"
      >
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(180,130,50,0.2),transparent_50%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,rgba(200,150,60,0.15),transparent_50%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_80%,rgba(160,120,40,0.1),transparent_50%)]"></div>
        </div>

        {isMounted && particles.map((particle, i) => (
          <div key={i} className="particles" style={particle} />
        ))}

        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-600/30 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-yellow-700/20 rounded-full blur-3xl animate-float-reverse"></div>
        <div className="absolute top-1/3 right-1/3 w-72 h-72 bg-orange-600/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>

        <div className="relative z-20 w-full max-w-[1400px] mx-auto px-6 flex items-center gap-32 justify-between">
          <div className="text-left max-w-2xl">
            <div className="inline-block mb-6 px-4 py-2 bg-purple-600/20 border border-purple-500/50 rounded-full backdrop-blur-sm">
              <span className="text-purple-300 text-sm font-medium">AI-Powered Video Editing</span>
            </div>

            <h1 className="text-6xl md:text-7xl font-extrabold text-white drop-shadow-2xl mb-4 animate-[slideDown_1s_ease-out]">
              Transform Your Videos
            </h1>

            <div className="overflow-hidden mb-6">
              <div className="flex whitespace-nowrap scroll-text">
                {[...Array(5)].map((_, i) => (
                  <h2 key={i} className="text-5xl md:text-6xl font-bold gradient-text mx-8">
                    with AI Style Transfer
                  </h2>
                ))}
              </div>
            </div>

            <p className="text-white/80 mt-6 text-xl md:text-2xl leading-relaxed animate-[slideUp_1s_ease-out]">
              Copy cinematic looks, colors, and moods from any reference video 
              <span className="text-purple-400 font-semibold"> instantly</span> with our AI-powered style transfer
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mt-12 animate-[fadeIn_1.2s_ease-out]">
              <Link href="/signup" 
                className="group relative inline-flex items-center justify-center px-8 py-4 text-lg rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all duration-300 shadow-2xl shadow-purple-900/50 font-bold text-white overflow-hidden">
                <span className="absolute inset-0 shimmer-effect"></span>
                <span className="relative flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Get Started Free
                </span>
              </Link>
              <a href="#features" 
                className="inline-flex items-center justify-center px-8 py-4 text-lg rounded-2xl border-2 border-purple-500/50 hover:border-purple-400 bg-black/40 backdrop-blur-sm transition-all duration-300 font-semibold text-white hover:bg-purple-900/30">
                <Video className="w-5 h-5 mr-2" />
                Watch Demo
              </a>
            </div>

            <div className="grid grid-cols-3 gap-6 mt-12">
              {[
                { value: "10K+", label: "Videos Processed" },
                { value: "4.9/5", label: "User Rating" },
                { value: "50+", label: "AI Models" },
              ].map((stat, i) => (
                <div key={i}>
                  <div className="text-2xl md:text-3xl font-bold text-purple-400 mb-1">{stat.value}</div>
                  <div className="text-xs text-white/60">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative w-[500px] h-[650px] flex-shrink-0 ml-auto">
            {/* Reference Video Card */}
            <div className="absolute top-0 right-0 w-52 h-80 bg-gradient-to-br from-purple-900/90 to-purple-700/80 rounded-3xl border-2 border-purple-500/50 shadow-2xl backdrop-blur-xl overflow-hidden group hover:scale-105 transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="p-5 h-full flex flex-col">
                <span className="text-purple-300 text-sm font-bold mb-3">📹 Reference Video</span>
                <div className="flex-1 bg-purple-950/50 rounded-xl overflow-hidden relative">
                  <video src="/videos/reference.mp4" autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover rounded-xl" />
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 to-transparent pointer-events-none">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/40 group-hover:scale-110 transition-transform">
                        <Play className="w-6 h-6 text-white ml-0.5" />
                      </div>
                    </div>
                  </div>
                </div>
                <span className="text-white/60 text-xs mt-3">Style Source</span>
              </div>
            </div>

            {/* Target Video Card */}
            <div className="absolute top-0 left-0 w-52 h-80 bg-gradient-to-br from-pink-900/90 to-pink-700/80 rounded-3xl border-2 border-pink-500/50 shadow-2xl backdrop-blur-xl overflow-hidden group hover:scale-105 transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="p-5 h-full flex flex-col">
                <span className="text-pink-300 text-sm font-bold mb-3">🎬 Target Video</span>
                <div className="flex-1 bg-pink-950/50 rounded-xl overflow-hidden relative">
                  <video src="/videos/target.mp4" autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover rounded-xl" />
                  <div className="absolute inset-0 bg-gradient-to-br from-pink-900/10 to-transparent pointer-events-none">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-pink-400/30 backdrop-blur-sm flex items-center justify-center border-2 border-dashed border-pink-300/50 animate-pulse">
                          <UploadCloud className="w-8 h-8 text-pink-200 animate-bounce" />
                        </div>
                        <span className="text-xs text-pink-200 font-medium">Your Video</span>
                        <div className="mt-2 text-[10px] text-pink-300/70">Ready to transform</div>
                      </div>
                    </div>
                  </div>
                </div>
                <span className="text-white/60 text-xs mt-3">Original Content</span>
              </div>
            </div>

            {/* Output Video Card */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-56 h-[340px] bg-gradient-to-br from-blue-900/90 to-purple-900/90 rounded-3xl border-2 border-blue-500/50 shadow-2xl backdrop-blur-xl overflow-hidden group hover:scale-105 transition-all duration-500 z-10">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="p-5 h-full flex flex-col">
                <span className="text-blue-300 text-sm font-bold mb-3 flex items-center gap-2">
                  ✨ Output Video
                  <span className="px-2 py-1 bg-green-500/20 border border-green-500/50 rounded-full text-green-400 text-xs">Ready</span>
                </span>
                <div className="flex-1 bg-gradient-to-br from-blue-950/50 to-purple-950/50 rounded-xl overflow-hidden relative">
                  <video src="/videos/output.mp4" autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover rounded-xl" />
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 to-purple-900/10 pointer-events-none">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center relative">
                        <div className="relative">
                          <Sparkles className="w-16 h-16 text-blue-300 animate-pulse mx-auto" />
                          <div className="absolute inset-0 blur-xl bg-blue-400/40 animate-pulse"></div>
                        </div>
                        <div className="mt-2 space-y-1">
                          <span className="text-xs text-blue-200 font-bold block">AI Enhanced</span>
                          <span className="text-[10px] text-blue-300/80 block">Style Transferred</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <span className="text-white/80 text-sm mt-3 font-medium">Transformed Result</span>
              </div>
            </div>

            {/* Connection Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
              <defs>
                <linearGradient id="lineGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(168, 85, 247, 0.6)" />
                  <stop offset="100%" stopColor="rgba(59, 130, 246, 0.6)" />
                </linearGradient>
                <linearGradient id="lineGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(236, 72, 153, 0.6)" />
                  <stop offset="100%" stopColor="rgba(59, 130, 246, 0.6)" />
                </linearGradient>
              </defs>
              <path d="M 130 300 Q 180 420 250 500" stroke="url(#lineGradient1)" strokeWidth="3" fill="none" strokeDasharray="10 5" className="animate-pulse" />
              <path d="M 370 300 Q 320 420 250 500" stroke="url(#lineGradient2)" strokeWidth="3" fill="none" strokeDasharray="10 5" className="animate-pulse" style={{ animationDelay: '0.5s' }} />
            </svg>
          </div>
        </div>
      </section>

      {/* Below-fold content lazy-loaded for fast initial compilation */}
      <LandingBelowFold />
    </div>
  );
}
