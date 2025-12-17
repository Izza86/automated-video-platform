"use client";
import React, { useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
// Assuming necessary external libraries like lucide-react are available
// FIX: Importing Menu and X icons to resolve "Cannot find name 'X'" and "Cannot find name 'Menu'" errors.
import { Menu, X, UploadCloud, Video, Sparkles, Volume2, VolumeX, Pause, Play } from 'lucide-react';
import { FooterWave } from '@/components/footer-wave';
import { AnimatedFlowerLogo } from '@/components/animated-flower-logo'; 

// --- START Navbar Component (Integrated) ---

// Defined the interface for NavLink props to fix TypeScript errors (7031)
interface NavLinkProps {
  href: string;
  className: string;
  children: React.ReactNode;
}

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // NavLink is a local helper function for internal navigation links.
  const NavLink = ({ href, className, children }: NavLinkProps) => (
    <a href={href} className={className} onClick={() => setOpen(false)}>
      {children}
    </a>
  );

  return (
    // **FIX: Changed to use opaque background with blur**
    <nav className="fixed top-0 left-0 w-full z-50 bg-black/90 backdrop-blur-sm border-b border-purple-900/50">
      <div className="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center">

        {/* LOGO WITH ANIMATED FLOWER */}
        <NavLink 
          href="/" 
          className="flex items-center gap-4 group"
        >
          {/* Logo Image */}
          <div className="relative w-16 h-16 sm:w-20 sm:h-20">
            <Image 
              src="/logoimage.png" 
              alt="Automated Video Editor Logo" 
              width={80}
              height={80}
              className="w-full h-full object-contain"
              priority
            />
          </div>
          
          {/* Project Name Text Next to Logo */}
          <span className="text-lg sm:text-xl lg:text-2xl font-bold tracking-wide text-white group-hover:text-purple-400 transition-colors">
            AUTOMATED VIDEO <span className="text-purple-400">EDITOR</span>
          </span>
        </NavLink>

        {/* Desktop Menu - Increased size and padding */}
        <div className="hidden md:flex items-center space-x-6 relative" onMouseLeave={() => setHoveredIndex(null)}>
          <a 
            href="#features" 
            className="text-white/90 hover:text-white transition-all duration-300 text-base font-medium px-4 py-2 relative z-10"
            onMouseEnter={() => setHoveredIndex(0)}
            onClick={() => setOpen(false)}
          >
            <span className="relative z-10">Features</span>
            <span className={`absolute inset-0 bg-gradient-to-r from-pink-500/30 via-pink-400/25 to-pink-500/30 rounded-lg blur-sm transition-all duration-300 ease-out ${hoveredIndex === 0 ? 'scale-110 opacity-100' : 'scale-75 opacity-0'}`} />
            <span className={`absolute inset-0 bg-pink-500/15 rounded-lg transition-all duration-300 ease-out ${hoveredIndex === 0 ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`} />
          </a>

          <a 
            href="#pricing" 
            className="text-white/90 hover:text-white transition-all duration-300 text-base font-medium px-4 py-2 relative z-10"
            onMouseEnter={() => setHoveredIndex(1)}
            onClick={() => setOpen(false)}
          >
            <span className="relative z-10">Pricing</span>
            <span className={`absolute inset-0 bg-gradient-to-r from-pink-500/30 via-pink-400/25 to-pink-500/30 rounded-lg blur-sm transition-all duration-300 ease-out ${hoveredIndex === 1 ? 'scale-110 opacity-100' : 'scale-75 opacity-0'}`} />
            <span className={`absolute inset-0 bg-pink-500/15 rounded-lg transition-all duration-300 ease-out ${hoveredIndex === 1 ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`} />
          </a>

          <a 
            href="#about" 
            className="text-white/90 hover:text-white transition-all duration-300 text-sm font-medium px-4 py-2 relative z-10"
            onMouseEnter={() => setHoveredIndex(2)}
            onClick={() => setOpen(false)}
          >
            <span className="relative z-10">About</span>
            <span className={`absolute inset-0 bg-gradient-to-r from-pink-500/30 via-pink-400/25 to-pink-500/30 rounded-lg blur-sm transition-all duration-300 ease-out ${hoveredIndex === 2 ? 'scale-110 opacity-100' : 'scale-75 opacity-0'}`} />
            <span className={`absolute inset-0 bg-pink-500/15 rounded-lg transition-all duration-300 ease-out ${hoveredIndex === 2 ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`} />
          </a>

          {/* Animated underline indicator */}
          <span 
            className={`absolute bottom-0 h-0.5 bg-gradient-to-r from-purple-400 via-purple-500 to-purple-600 rounded-full transition-all duration-300 ease-out ${hoveredIndex !== null ? 'opacity-100' : 'opacity-0'}`}
            style={{
              width: hoveredIndex !== null ? '60px' : '0px',
              left: hoveredIndex === 0 ? '0px' : hoveredIndex === 1 ? '100px' : hoveredIndex === 2 ? '200px' : '0px',
              transform: 'translateX(12px)'
            }}
          />

          <Link
            href="/login"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all duration-300 font-medium text-sm shadow-lg shadow-purple-900/50 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/50 ml-4"
          >
            Login
          </Link>
        </div>

        {/* Mobile Menu Button - Now using imported icons X and Menu */}
        <button
          className="md:hidden text-white"
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>

      </div>

      {/* Mobile Menu Dropdown */}
      {open && (
        <div className="md:hidden bg-black/90 backdrop-blur-sm px-4 py-4 space-y-4 border-t border-white/10">
          <NavLink href="#features" className="block text-white/80 hover:text-white text-base">
            Features
          </NavLink>
          <NavLink href="#pricing" className="block text-white/80 hover:text-white text-base">
            Pricing
          </NavLink>
          <NavLink href="#about" className="block text-white/80 hover:text-white text-base">
            About
          </NavLink>
          <Link
            href="/login"
            className="block w-full text-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition text-base"
            onClick={() => setOpen(false)}
          >
            Login
          </Link>
        </div>
      )}
    </nav>
  );
};
// --- END Navbar Component ---

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [particles, setParticles] = useState<Array<{left: string; animationDelay: string; animationDuration: string}>>([]);

  // Wave animation on hover
  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    container.classList.add('wave-active');
    setTimeout(() => {
      container.classList.remove('wave-active');
    }, 1200);
  };

  React.useEffect(() => {
    setIsMounted(true);
    // Generate random particle properties only on client
    setParticles(
      [...Array(20)].map(() => ({
        left: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 15}s`,
        animationDuration: `${10 + Math.random() * 10}s`,
      }))
    );
  }, []);

  return (
    <div className="bg-gradient-to-b from-[#0a0014] via-[#1a0033] to-black min-h-screen">
      {/*
        --- ENHANCED ANIMATION CSS KEYFRAMES ---
      */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-30px) rotate(5deg); }
        }

        @keyframes float-reverse {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(30px) rotate(-5deg); }
        }

        @keyframes glow-pulse {
          0%, 100% { 
            box-shadow: 0 0 40px rgba(168, 85, 247, 0.4), 0 0 80px rgba(236, 72, 153, 0.2);
            opacity: 0.8;
          }
          50% { 
            box-shadow: 0 0 60px rgba(168, 85, 247, 0.6), 0 0 120px rgba(236, 72, 153, 0.4);
            opacity: 1;
          }
        }

        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }

        @keyframes particles {
          0% { transform: translateY(0) scale(1); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(-800px) scale(0); opacity: 0; }
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        .animate-float-reverse {
          animation: float-reverse 8s ease-in-out infinite;
        }

        .animate-glow-pulse {
          animation: glow-pulse 4s ease-in-out infinite;
        }

        .shimmer-effect {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          background-size: 1000px 100%;
          animation: shimmer 3s infinite;
        }

        .particles {
          position: absolute;
          width: 4px;
          height: 4px;
          background: rgba(168, 85, 247, 0.6);
          border-radius: 50%;
          animation: particles 15s linear infinite;
        }

        .gradient-text {
          background: linear-gradient(90deg, #a855f7, #ec4899, #8b5cf6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        @keyframes marquee {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(50%);
          }
        }

        @keyframes scrollText {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        .marquee {
          animation: marquee 20s linear infinite;
        }

        .scroll-text {
          animation: scrollText 8s linear infinite;
        }

        @keyframes blink {
          0%, 100% { 
            clip-path: inset(0% 0% 0% 0%);
          }
          8%, 12% { 
            clip-path: inset(48% 0% 48% 0%);
          }
          10% {
            clip-path: inset(50% 0% 50% 0%);
          }
          40%, 44% { 
            clip-path: inset(48% 0% 48% 0%);
          }
          42% {
            clip-path: inset(50% 0% 50% 0%);
          }
        }

        .eye-container:hover .eye-blink {
          animation: blink 1.2s ease-in-out 1;
        }

        /* Wave Animation Styles */
        .image-wave-container {
          position: relative;
        }

        .wave-overlay {
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(168, 85, 247, 0.6) 30%,
            rgba(168, 85, 247, 0.8) 50%,
            rgba(88, 28, 135, 0.9) 70%,
            rgba(0, 0, 0, 0) 100%
          );
          z-index: 15;
          pointer-events: none;
          opacity: 0;
        }

        .image-wave-container.wave-active .wave-overlay {
          animation: waveSlide 1.2s ease-out forwards;
          opacity: 1;
        }

        @keyframes waveSlide {
          0% {
            left: -100%;
          }
          100% {
            left: 100%;
          }
        }

        @keyframes cardFloat1 {
          0% {
            transform: translate(0px, 0px) rotate(0deg);
          }
          25% {
            transform: translate(15px, -10px) rotate(3deg);
          }
          50% {
            transform: translate(20px, 5px) rotate(-2deg);
          }
          75% {
            transform: translate(5px, 15px) rotate(2deg);
          }
          100% {
            transform: translate(0px, 0px) rotate(0deg);
          }
        }

        @keyframes cardFloat2 {
          0% {
            transform: translate(0px, 0px) rotate(0deg);
          }
          25% {
            transform: translate(-15px, -10px) rotate(-3deg);
          }
          50% {
            transform: translate(-20px, 5px) rotate(2deg);
          }
          75% {
            transform: translate(-5px, 15px) rotate(-2deg);
          }
          100% {
            transform: translate(0px, 0px) rotate(0deg);
          }
        }

        @keyframes cardFloat3 {
          0% {
            transform: translateX(-50%) translateY(0px) rotate(0deg) scale(1);
          }
          25% {
            transform: translateX(-50%) translateY(-15px) rotate(2deg) scale(1.03);
          }
          50% {
            transform: translateX(-50%) translateY(-20px) rotate(-1deg) scale(1.05);
          }
          75% {
            transform: translateX(-50%) translateY(-10px) rotate(1deg) scale(1.02);
          }
          100% {
            transform: translateX(-50%) translateY(0px) rotate(0deg) scale(1);
          }
        }

        @keyframes slideInFromLeft {
          0% {
            opacity: 0;
            transform: translateX(-100px) translateY(0) scale(0.8);
          }
          100% {
            opacity: 1;
            transform: translateX(0) translateY(0) scale(1);
          }
        }

        @keyframes slideInFromRight {
          0% {
            opacity: 0;
            transform: translateX(100px) translateY(0) scale(0.8);
          }
          100% {
            opacity: 1;
            transform: translateX(0) translateY(0) scale(1);
          }
        }

        @keyframes slideInFromBottom {
          0% {
            opacity: 0;
            transform: translateX(-50%) translateY(100px) scale(0.8);
          }
          100% {
            opacity: 1;
            transform: translateX(-50%) translateY(0) scale(1);
          }
        }

        @keyframes slideLeft {
          0%, 100% {
            left: 20%;
          }
          50% {
            left: 80%;
          }
        }

        @keyframes rotateLogo {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        .rotate-logo {
          animation: rotateLogo 4s linear infinite;
        }

        @keyframes glowPulse {
          0%, 100% {
            box-shadow: 0 0 20px rgba(168, 85, 247, 0.5), 0 0 40px rgba(168, 85, 247, 0.3);
          }
          50% {
            box-shadow: 0 0 30px rgba(168, 85, 247, 0.8), 0 0 60px rgba(168, 85, 247, 0.5);
          }
        }

        @keyframes vintageGlow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(251, 191, 36, 0.5), 0 0 40px rgba(251, 191, 36, 0.3);
          }
          50% {
            box-shadow: 0 0 30px rgba(251, 191, 36, 0.8), 0 0 60px rgba(251, 191, 36, 0.5);
          }
        }

        @keyframes neonGlow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(6, 182, 212, 0.6), 0 0 40px rgba(6, 182, 212, 0.4), 0 0 60px rgba(6, 182, 212, 0.2);
          }
          50% {
            box-shadow: 0 0 30px rgba(6, 182, 212, 0.9), 0 0 60px rgba(6, 182, 212, 0.6), 0 0 90px rgba(6, 182, 212, 0.3);
          }
        }

        @keyframes shimmerStyle {
          0% {
            background-position: -200% center;
          }
          100% {
            background-position: 200% center;
          }
        }

        .cinematic-glow {
          animation: glowPulse 2s ease-in-out infinite;
        }

        .vintage-glow {
          animation: vintageGlow 2.5s ease-in-out infinite;
        }

        .neon-glow {
          animation: neonGlow 1.5s ease-in-out infinite;
        }

        .dreamy-glow {
          animation: glowPulse 3s ease-in-out infinite;
        }
      `}</style>
      
      <Navbar />

      {/* ========= MARQUEE TEXT ========= */}
      <div className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 py-4 overflow-hidden border-y border-purple-400/50">
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

      {/* ========= ENHANCED HERO SECTION ========= */}
      <section 
        className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-purple-900/20 via-pink-900/10 to-black pt-24 pb-12"
        id="hero"
      >
        {/* Animated gradient background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(168,85,247,0.2),transparent_50%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,rgba(236,72,153,0.15),transparent_50%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_80%,rgba(139,92,246,0.1),transparent_50%)]"></div>
        </div>

        {/* Floating particles - Only render on client */}
        {isMounted && particles.map((particle, i) => (
          <div
            key={i}
            className="particles"
            style={particle}
          />
        ))}

        {/* Floating glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/30 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-pink-600/20 rounded-full blur-3xl animate-float-reverse"></div>
        <div className="absolute top-1/3 right-1/3 w-72 h-72 bg-blue-600/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>

        {/* Main Container - Split Layout */}
        <div className="relative z-20 w-full max-w-[1400px] mx-auto px-6 flex items-center gap-32 justify-between">
          
          {/* LEFT SIDE - Content (Fully Left Aligned) */}
          <div className="text-left max-w-2xl">
            {/* Badge */}
            <div className="inline-block mb-6 px-4 py-2 bg-purple-600/20 border border-purple-500/50 rounded-full backdrop-blur-sm">
              <span className="text-purple-300 text-sm font-medium">AI-Powered Video Editing</span>
            </div>

            {/* Animated Heading */}
            <h1 className="text-6xl md:text-7xl font-extrabold text-white drop-shadow-2xl mb-4 animate-[slideDown_1s_ease-out]">
              Transform Your Videos
            </h1>

            {/* Scrolling h2 heading */}
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

            {/* CTA Buttons */}
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

            {/* Stats */}
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

          {/* RIGHT SIDE - Animated Video Cards (Portrait Layout) */}
          <div className="relative w-[500px] h-[650px] flex-shrink-0 ml-auto">
            {/* Reference Video Card - Top Right */}
            <div 
              className="absolute top-0 right-0 w-52 h-80 bg-gradient-to-br from-purple-900/90 to-purple-700/80 rounded-3xl border-2 border-purple-500/50 shadow-2xl backdrop-blur-xl overflow-hidden group hover:scale-105 transition-all duration-500"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="p-5 h-full flex flex-col">
                <span className="text-purple-300 text-sm font-bold mb-3">📹 Reference Video</span>
                <div className="flex-1 bg-purple-950/50 rounded-xl overflow-hidden relative">
                  {/* Background video */}
                  <video 
                    src="/videos/reference.mp4" 
                    autoPlay 
                    loop 
                    muted 
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover rounded-xl"
                  />
                  
                  {/* Subtle overlay for visibility */}
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 to-transparent pointer-events-none">
                    {/* Play icon overlay */}
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

            {/* Target Video Card - Top Left */}
            <div 
              className="absolute top-0 left-0 w-52 h-80 bg-gradient-to-br from-pink-900/90 to-pink-700/80 rounded-3xl border-2 border-pink-500/50 shadow-2xl backdrop-blur-xl overflow-hidden group hover:scale-105 transition-all duration-500"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="p-5 h-full flex flex-col">
                <span className="text-pink-300 text-sm font-bold mb-3">🎬 Target Video</span>
                <div className="flex-1 bg-pink-950/50 rounded-xl overflow-hidden relative">
                  {/* Background video */}
                  <video 
                    src="/videos/target.mp4" 
                    autoPlay 
                    loop 
                    muted 
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover rounded-xl"
                  />
                  
                  {/* Subtle overlay for visibility */}
                  <div className="absolute inset-0 bg-gradient-to-br from-pink-900/10 to-transparent pointer-events-none">
                    {/* Upload indicator with animation */}
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

            {/* Output Video Card - Bottom Center (Positioned between top two cards) */}
            <div 
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-56 h-[340px] bg-gradient-to-br from-blue-900/90 to-purple-900/90 rounded-3xl border-2 border-blue-500/50 shadow-2xl backdrop-blur-xl overflow-hidden group hover:scale-105 transition-all duration-500 z-10"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="p-5 h-full flex flex-col">
                <span className="text-blue-300 text-sm font-bold mb-3 flex items-center gap-2">
                  ✨ Output Video
                  <span className="px-2 py-1 bg-green-500/20 border border-green-500/50 rounded-full text-green-400 text-xs">Ready</span>
                </span>
                <div className="flex-1 bg-gradient-to-br from-blue-950/50 to-purple-950/50 rounded-xl overflow-hidden relative">
                  {/* Background transformed video */}
                  <video 
                    src="/videos/output.mp4" 
                    autoPlay 
                    loop 
                    muted 
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover rounded-xl"
                  />
                  
                  {/* Subtle overlay for visibility */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 to-purple-900/10 pointer-events-none">
                    {/* Center content with AI sparkle */}
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

            {/* Connection Lines Animation */}
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
              {/* Animated connecting lines */}
              <path 
                d="M 130 300 Q 180 420 250 500" 
                stroke="url(#lineGradient1)" 
                strokeWidth="3" 
                fill="none"
                strokeDasharray="10 5"
                className="animate-pulse"
              />
              <path 
                d="M 370 300 Q 320 420 250 500" 
                stroke="url(#lineGradient2)" 
                strokeWidth="3" 
                fill="none"
                strokeDasharray="10 5"
                className="animate-pulse"
                style={{ animationDelay: '0.5s' }}
              />
            </svg>
          </div>
        </div>
      </section>

      {/* ========= PREVIEW & DEMO SECTION ========= */}
      <section className="relative py-24 bg-gradient-to-b from-black via-purple-950/10 to-black border-t border-purple-500/30">
        <div className="relative z-10 w-full max-w-5xl mx-auto px-6">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Preview & Demo
            </h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              See the magic of AI style transfer in action
            </p>
          </div>

          {/* Main Demo Container */}
          <div className="relative bg-gradient-to-br from-purple-900/20 to-pink-900/10 backdrop-blur-xl rounded-3xl border border-purple-500/30 p-8 shadow-2xl">
            {/* Video Player Container */}
            <div className="relative bg-black rounded-2xl border-2 border-purple-500/50 overflow-hidden shadow-2xl mb-8">
              {/* Before & After Label */}
              <div className="absolute top-0 left-0 right-0 bg-black/90 backdrop-blur-sm py-3 z-20 border-b border-purple-500/50">
                <p className="text-center text-white font-semibold tracking-wider">Before & After</p>
              </div>

              {/* Video Content Area with Animated Slider */}
              <div className="relative pt-12 aspect-video bg-black overflow-hidden group">
                {/* Before Image (Full Width) - Light overlay on the right (before) side */}
                <div className="absolute inset-0">
                  <img 
                    src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=675&fit=crop" 
                    alt="Before" 
                    className="w-full h-full object-cover"
                  />
                  {/* Light overlay for the before section (right side) */}
                  <div className="absolute inset-0 bg-gradient-to-l from-white/40 via-white/20 to-transparent pointer-events-none animate-[slideLeft_3s_ease-in-out_infinite]" style={{ clipPath: 'inset(0 0 0 50%)' }}></div>
                </div>

                {/* After Image (Clipped by slider) - Dark overlay on the left (after) side */}
                <div 
                  className="absolute inset-0 overflow-hidden transition-all duration-1000 ease-in-out"
                  style={{ clipPath: 'inset(0 50% 0 0)' }}
                >
                  <img 
                    src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=675&fit=crop&sat=-100&con=20&vib=30" 
                    alt="After" 
                    className="w-full h-full object-cover"
                    style={{ filter: 'sepia(0.3) saturate(1.5) hue-rotate(-10deg) brightness(1.1)' }}
                  />
                  {/* Dark overlay for the after section (left side) */}
                  <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/20 to-transparent pointer-events-none"></div>
                </div>

                {/* Animated Slider Line */}
                <div 
                  className="absolute top-0 bottom-0 w-1 bg-white shadow-2xl z-30 transition-all duration-1000 ease-in-out animate-[slideLeft_3s_ease-in-out_infinite]"
                  style={{ left: '50%' }}
                >
                  {/* Slider Handle */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-2xl flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
                    <div className="flex gap-1">
                      <div className="w-0.5 h-6 bg-gray-600"></div>
                      <div className="w-0.5 h-6 bg-gray-600"></div>
                    </div>
                  </div>
                </div>

                {/* Center Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div className="w-24 h-24 bg-purple-600/90 rounded-full flex items-center justify-center shadow-2xl shadow-purple-500/50 backdrop-blur-sm border-4 border-white/20 cursor-pointer hover:scale-110 hover:bg-purple-500/90 transition-all duration-300 group-hover:scale-95">
                    <Play className="w-12 h-12 text-white ml-1" />
                  </div>
                </div>
              </div>

              {/* Video Controls */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/90 backdrop-blur-sm py-4 px-6 border-t border-purple-500/50 z-20">
                <div className="flex items-center gap-4">
                  <button className="text-white hover:text-purple-400 transition">
                    <Pause className="w-5 h-5" />
                  </button>
                  <button className="text-white hover:text-purple-400 transition">
                    <Volume2 className="w-5 h-5" />
                  </button>
                  {/* Progress Bar */}
                  <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full w-1/3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full relative">
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg"></div>
                    </div>
                  </div>
                  <button className="text-white hover:text-purple-400 transition">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Style Thumbnails */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
              {[
                { name: 'Cinematic', color: 'from-purple-600/60 to-purple-800/80', glow: 'cinematic-glow', shadowColor: 'shadow-purple-500/50' },
                { name: 'Vintage', color: 'from-amber-600/60 to-orange-800/80', glow: 'vintage-glow', shadowColor: 'shadow-amber-500/50' },
                { name: 'Neon Noir', color: 'from-cyan-600/60 to-blue-900/80', glow: 'neon-glow', shadowColor: 'shadow-cyan-500/50' },
                { name: 'Documentary', color: 'from-gray-600/60 to-slate-800/80', glow: '', shadowColor: 'shadow-gray-500/30' },
                { name: 'Dreamy', color: 'from-pink-600/60 to-purple-800/80', glow: 'dreamy-glow', shadowColor: 'shadow-pink-500/50' }
              ].map((style, idx) => (
                <div key={idx} className="group cursor-pointer">
                  <div className={`relative aspect-video bg-gradient-to-br ${style.color} rounded-lg border-2 border-purple-500/40 hover:border-purple-400/80 transition-all duration-300 overflow-hidden ${style.glow} ${style.shadowColor} shadow-xl`}>
                    {/* Animated shimmer effect */}
                    <div className="absolute inset-0" style={{
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmerStyle 3s infinite'
                    }}></div>
                    
                    {/* Film grain texture */}
                    <div className="absolute inset-0" style={{ 
                      backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' opacity=\'0.15\'/%3E%3C/svg%3E")',
                      opacity: 0.3 
                    }}></div>
                    
                    {/* Center play button */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 bg-white/30 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/40 group-hover:scale-125 group-hover:bg-white/40 transition-all duration-300">
                        <Play className="w-4 h-4 text-white ml-0.5" />
                      </div>
                    </div>
                    
                    {/* Hover overlay with enhanced glow */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    {/* Vignette effect */}
                    <div className="absolute inset-0 rounded-lg" style={{ boxShadow: 'inset 0 0 30px rgba(0,0,0,0.3)' }}></div>
                  </div>
                  <p className="text-white/80 text-sm text-center mt-2 font-medium group-hover:text-white transition-colors">{style.name}</p>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <div className="text-center">
              <button className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold text-lg rounded-xl shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:shadow-blue-400/40 transition-all duration-300 hover:scale-105">
                APPLY STYLE & RENDER
              </button>
              <p className="text-white/50 text-sm mt-3">
                Or, Upload Your Own Video
              </p>
            </div>
          </div>
        </div>
      </section>

{/* ========= ENHANCED HOW IT WORKS ========= */}
      <section id="features" className="relative py-24 bg-gradient-to-b from-black via-purple-950/20 to-black px-6 md:px-10 border-t border-purple-500/30 overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-3xl"></div>

        <div className="relative z-10">
          <div className="text-center mb-16">
            <span className="text-purple-400 font-semibold text-sm uppercase tracking-wider">Simple Process</span>
            <h2 className="text-5xl font-bold text-white mt-4 mb-4">
              How It Works
            </h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              Three simple steps to transform your videos with AI-powered style transfer
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                title: "Upload Reference",
                desc: "Select a video whose style, color, and mood you want to copy.",
                icon: UploadCloud,
                color: "from-purple-600 to-purple-800",
                delay: "0s"
              },
              {
                title: "Upload Target",
                desc: "Your original video where the selected style will be applied.",
                icon: Video,
                color: "from-pink-600 to-purple-600",
                delay: "0.2s"
              },
              {
                title: "AI Transform",
                desc: "Our engine applies color grading, tone mapping & stylistic patterns.",
                icon: Sparkles,
                color: "from-blue-600 to-purple-600",
                delay: "0.4s"
              },
            ].map((card, i) => (
              <div
                key={i}
                className="group relative p-8 bg-gradient-to-br from-purple-900/40 via-purple-800/20 to-transparent border border-purple-500/30 rounded-3xl text-white shadow-xl hover:shadow-2xl hover:shadow-purple-900/50 transition-all duration-500 backdrop-blur-xl hover:scale-105 hover:-translate-y-2"
                style={{ animationDelay: card.delay }}
              >
                {/* Gradient overlay on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-0 group-hover:opacity-10 rounded-3xl transition-opacity duration-500`}></div>
                
                {/* Step number */}
                <div className="absolute -top-4 -right-4 w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center font-bold text-xl shadow-lg">
                  {i + 1}
                </div>

                {/* Icon */}
                <div className="w-16 h-16 bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <card.icon className="w-8 h-8 text-purple-400 group-hover:text-pink-400 transition-colors" />
                </div>

                <h3 className="text-2xl font-bold mb-3 group-hover:text-purple-300 transition-colors">
                  {card.title}
                </h3>
                <p className="text-white/70 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========= 3D FLOATING VIDEO CARDS ========= */}


      {/* ========= ENHANCED USE CASES ========= */}
      <section id="use-cases" className="relative py-24 bg-gradient-to-b from-black via-pink-950/20 to-black px-6 md:px-10 border-t border-pink-500/30 overflow-hidden">
        {/* Floating orbs */}
        <div className="absolute top-20 left-10 w-96 h-96 bg-pink-600/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-float-reverse"></div>

        <div className="relative z-10">
          <div className="text-center mb-16">
            <span className="text-pink-400 font-semibold text-sm uppercase tracking-wider">Applications</span>
            <h2 className="text-5xl font-bold text-white mt-4 mb-4">
              Perfect For Every Creator
            </h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              Whether you're creating content for YouTube, Instagram, or professional projects
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              { label: "🎬 Filmmakers", detail: "Cinematic color grading in minutes", emoji: "🎬" },
              { label: "🎨 Content Creators", detail: "Professional look without expertise", emoji: "🎨" },
              { label: "🏢 Marketing Teams", detail: "Brand-consistent video content", emoji: "🏢" },
              { label: "📚 Educators & Trainers", detail: "Enhance educational content", emoji: "📚" },
              { label: "🎞️ Archivists & Restoration", detail: "Restore and enhance old footage", emoji: "🎞️" },
              { label: "🛍️ E-commerce & Product", detail: "Stunning product showcases", emoji: "🛍️" },
            ].map((item, i) => (
              <div
                key={i}
                className="group relative p-8 bg-gradient-to-br from-purple-900/40 via-pink-900/20 to-transparent border border-purple-500/30 rounded-2xl text-white shadow-lg hover:shadow-2xl hover:shadow-purple-900/50 transition-all duration-500 backdrop-blur-xl hover:scale-105 hover:-translate-y-2"
              >
                {/* Glow effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/0 to-pink-600/0 group-hover:from-purple-600/20 group-hover:to-pink-600/20 rounded-2xl transition-all duration-500"></div>
                
                {/* Gradient ring */}
                <div className="absolute -top-3 -right-3 w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform">
                  {item.emoji}
                </div>

                <div className="relative z-10 pt-4">
                  <h3 className="text-xl font-bold mb-2 group-hover:text-pink-300 transition-colors">
                    {item.label.split(' ').slice(1).join(' ')}
                  </h3>
                  <p className="text-white/70 text-sm leading-relaxed">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========= ENHANCED TECHNOLOGY ========= */}
      <section id="technology" className="relative py-24 bg-gradient-to-b from-black via-blue-950/20 to-black px-6 md:px-10 border-t border-blue-500/30 overflow-hidden">
        {/* Background gradient orbs */}
        <div className="absolute top-1/3 right-0 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/3 left-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-3xl"></div>

        <div className="relative z-10">
          <div className="text-center mb-16">
            <span className="text-blue-400 font-semibold text-sm uppercase tracking-wider">AI Powered</span>
            <h2 className="text-5xl font-bold text-white mt-4 mb-4">
              Technology Behind It
            </h2>
            <p className="text-white/60 text-lg max-w-3xl mx-auto">
              Our AI engine uses neural style transfer, tone mapping, color grading models, 
              and scene-detection pipelines to generate professional-quality outputs.
            </p>
          </div>

          {/* Tech features grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mb-12">
            {[
              { icon: "🧠", title: "Neural Networks", desc: "Deep learning models for style transfer" },
              { icon: "🎨", title: "Color Grading", desc: "Professional color correction AI" },
              { icon: "🎬", title: "Scene Detection", desc: "Intelligent frame analysis" },
              { icon: "⚡", title: "Fast Processing", desc: "GPU-accelerated rendering" }
            ].map((tech, i) => (
              <div
                key={i}
                className="group p-6 bg-gradient-to-br from-blue-900/40 via-purple-900/20 to-transparent border border-blue-500/30 rounded-2xl text-white shadow-lg hover:shadow-2xl hover:shadow-blue-900/50 transition-all duration-500 backdrop-blur-xl hover:scale-105"
              >
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">{tech.icon}</div>
                <h3 className="text-lg font-bold mb-2 group-hover:text-blue-300 transition-colors">{tech.title}</h3>
                <p className="text-white/60 text-sm">{tech.desc}</p>
              </div>
            ))}
          </div>

          {/* Tech graphic with glow effect */}
          <div className="mt-12 max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-2xl border border-purple-500/30 relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-blue-600/20 group-hover:from-purple-600/30 group-hover:to-blue-600/30 transition-all duration-500"></div>
            <img
              src="/tech-graphic.png"
              alt="AI Pipeline"
              className="w-full object-cover opacity-90 group-hover:opacity-100 transition-all relative z-10"
            />
          </div>
        </div>
      </section>

      {/* ========= ENHANCED PRICING SECTION ========= */}
      <section id="pricing" className="relative py-24 bg-gradient-to-b from-black via-purple-950/20 to-black px-6 md:px-10 border-t border-purple-500/30 overflow-hidden">
        {/* Background effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] bg-purple-600/10 rounded-full blur-3xl"></div>

        <div className="relative z-10">
          <div className="text-center mb-16">
            <span className="text-purple-400 font-semibold text-sm uppercase tracking-wider">Pricing Plans</span>
            <h2 className="text-5xl font-bold text-white mt-4 mb-4">
              Simple Pricing, Powerful Results
            </h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              Choose the plan that fits your creative demands and scale your video production with AI.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Pricing Card 1: Basic */}
            <div className="group relative p-8 bg-gradient-to-br from-purple-900/30 via-purple-800/10 to-transparent border border-purple-600/30 rounded-3xl shadow-xl hover:shadow-2xl hover:shadow-purple-900/50 transition-all duration-500 backdrop-blur-xl hover:scale-105">
              <h3 className="text-2xl font-bold text-white mb-2">Basic</h3>
              <p className="text-white/60 mb-6">Start experimenting with AI style transfer.</p>
              <div className="text-5xl font-extrabold text-white mb-4">
                $19<span className="text-xl font-normal text-white/70">/month</span>
              </div>
              
              <ul className="space-y-3 text-white/80 mb-8">
                <li className="flex items-center"><span className="text-purple-400 mr-2">✓</span> 5 Video Jobs / month</li>
                <li className="flex items-center"><span className="text-purple-400 mr-2">✓</span> 1080p Output</li>
                <li className="flex items-center"><span className="text-purple-400 mr-2">✓</span> Standard Processing Speed</li>
                <li className="flex items-center"><span className="text-white/40 mr-2">✗</span> Priority Support</li>
              </ul>

              <Link href="/signup" className="block w-full text-center py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 rounded-xl font-semibold text-white transition-all duration-300 shadow-lg hover:shadow-purple-600/50">
                Start Free Trial
              </Link>
            </div>
            
            {/* Pricing Card 2: Pro (Highlighted) */}
            <div className="group relative p-8 bg-gradient-to-br from-purple-600/40 via-pink-600/20 to-purple-900/40 border-2 border-purple-400 rounded-3xl shadow-2xl shadow-purple-900/80 transform scale-105 hover:scale-110 transition-all duration-500 backdrop-blur-xl">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg animate-glow-pulse">
                Most Popular
              </div>
              <h3 className="text-3xl font-bold text-white mb-2">Pro Creator</h3>
              <p className="text-white/90 mb-6">Ideal for professionals and serious content creators.</p>
              <div className="text-6xl font-extrabold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent mb-4">
                $49<span className="text-xl font-normal text-white/70">/month</span>
              </div>
              
              <ul className="space-y-3 text-white mb-8">
                <li className="flex items-center"><span className="text-green-400 mr-2">✓</span> Unlimited Video Jobs</li>
                <li className="flex items-center"><span className="text-green-400 mr-2">✓</span> 4K Output (HDR Support)</li>
                <li className="flex items-center"><span className="text-green-400 mr-2">✓</span> High-Speed Processing</li>
                <li className="flex items-center"><span className="text-green-400 mr-2">✓</span> Priority Support</li>
              </ul>

              <Link href="/signup" className="block w-full text-center py-4 bg-white text-purple-800 rounded-xl font-bold text-lg hover:bg-gray-200 transition-all duration-300 shadow-lg hover:shadow-xl">
                Choose Pro
              </Link>
            </div>

            {/* Pricing Card 3: Enterprise */}
            <div className="group relative p-8 bg-gradient-to-br from-purple-900/30 via-purple-800/10 to-transparent border border-purple-600/30 rounded-3xl shadow-xl hover:shadow-2xl hover:shadow-purple-900/50 transition-all duration-500 backdrop-blur-xl hover:scale-105">
              <h3 className="text-2xl font-bold text-white mb-2">Enterprise</h3>
              <p className="text-white/60 mb-6">Tailored solutions for large teams and agencies.</p>
              <div className="text-5xl font-extrabold text-white mb-4">
                Custom
              </div>
              
              <ul className="space-y-3 text-white/80 mb-8">
                <li className="flex items-center"><span className="text-purple-400 mr-2">✓</span> Dedicated API Access</li>
                <li className="flex items-center"><span className="text-purple-400 mr-2">✓</span> Volume Discounts</li>
                <li className="flex items-center"><span className="text-purple-400 mr-2">✓</span> Custom Model Training</li>
                <li className="flex items-center"><span className="text-purple-400 mr-2">✓</span> 24/7 Enterprise Support</li>
              </ul>

              <a href="/contact" className="block w-full text-center py-3 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 rounded-xl font-semibold text-white transition-all duration-300 shadow-lg hover:shadow-gray-600/50">
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ========= ENHANCED ABOUT SECTION ========= */}
      <section id="about" className="relative py-24 bg-gradient-to-b from-black via-purple-950/30 to-black px-6 md:px-10 border-t border-purple-500/30 overflow-hidden">
        {/* Background orb */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-3xl"></div>

        <div className="relative z-10 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          
          {/* Text Content */}
          <div className="text-white">
            <span className="text-purple-400 font-semibold text-sm uppercase tracking-wider">About Us</span>
            <h2 className="text-5xl font-bold mb-6 mt-4">
              Our Mission: <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Democratizing VFX</span>
            </h2>
            <p className="text-white/70 mb-6 text-lg leading-relaxed">
              We started <strong className="text-white">Automated Video Editor</strong> to bring powerful, studio-grade visual effects and color grading to everyone. We believe that creative vision shouldn't be limited by complicated software or massive budgets.
            </p>
            <p className="text-white/70 mb-8 leading-relaxed">
              Our proprietary AI models simplify the most time-consuming aspects of post-production, giving filmmakers and creators hours back to focus on what matters: storytelling.
            </p>
            <a href="#features" className="inline-flex items-center gap-2 px-8 py-4 text-base rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all duration-300 font-semibold text-white shadow-lg hover:shadow-purple-600/50 hover:scale-105">
              See Our Technology
              <span className="text-xl">→</span>
            </a>
          </div>
          
          {/* Enhanced Image Visual - Eye with Blink Animation */}
          <div className="relative w-full h-96 rounded-2xl overflow-hidden shadow-2xl shadow-purple-900/50 border border-purple-500/30 group eye-container cursor-pointer">
            <img
              src="/AIVISION.jpg"
              alt="Our Mission"
              width={800}
              height={600}
              className="w-full h-full object-cover filter brightness-90 saturate-100 opacity-90 group-hover:opacity-100 group-hover:brightness-110 group-hover:saturate-125 transition-all duration-500 eye-blink"
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-transparent to-pink-900/40 mix-blend-multiply group-hover:opacity-75 transition-opacity"></div>
            
            {/* Floating badge */}
            <div className="absolute bottom-6 left-6 px-4 py-2 bg-black/60 backdrop-blur-md rounded-lg border border-purple-500/30">
              <p className="text-white font-semibold">Trusted by 10K+ Creators</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* ========= ENHANCED FOOTER ========= */}
      <footer className="relative bg-black overflow-hidden min-h-[400px] flex items-center justify-center">
        {/* Wave Animation - As background covering full footer */}
        <div className="absolute inset-0 w-full h-full">
          <FooterWave />
        </div>
        
        {/* Footer Content - Inside the waves */}
        <div className="relative z-10 w-full py-16">

        <div className="relative z-10 max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-white">
          
          {/* Column 1: Logo and Tagline */}
          <div className="col-span-2 md:col-span-1">
            <a href="/" className="flex items-center space-x-2 text-2xl font-bold tracking-wide text-white mb-4 group">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center font-bold text-sm group-hover:scale-110 transition-transform">
                AI
              </div>
              <span className="text-lg">
                AUTOMATED<span className="text-purple-400">VIDEO EDITOR</span>
              </span>
            </a>
            <p className="text-white/60 text-sm mt-2 leading-relaxed">
              Democratizing VFX with powerful AI style transfer tools.
            </p>
          </div>

          {/* Column 2: Product Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-purple-300">Product</h4>
            <ul className="space-y-3 text-white/70 text-sm">
              <li><a href="#features" className="hover:text-purple-300 transition">Features</a></li>
              <li><a href="#pricing" className="hover:text-purple-300 transition">Pricing</a></li>
              <li><a href="#use-cases" className="hover:text-purple-300 transition">Use Cases</a></li>
              <li><Link href="/login" className="hover:text-purple-300 transition">Login</Link></li>
            </ul>
          </div>

          {/* Column 3: Company Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-purple-300">Company</h4>
            <ul className="space-y-3 text-white/70 text-sm">
              <li><a href="#about" className="hover:text-purple-300 transition">About Us</a></li>
              <li><a href="/careers" className="hover:text-purple-300 transition">Careers (Hiring)</a></li>
              <li><a href="/press" className="hover:text-purple-300 transition">Press</a></li>
            </ul>
          </div>

          {/* Column 4: Legal & Contact */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-purple-300">Legal</h4>
            <ul className="space-y-3 text-white/70 text-sm">
              <li><a href="/privacy" className="hover:text-purple-300 transition">Privacy Policy</a></li>
              <li><a href="/terms" className="hover:text-purple-300 transition">Terms of Service</a></li>
              <li className="pt-2"><a href="mailto:support@autoeditai.com" className="hover:text-purple-300 transition">Contact Support</a></li>
            </ul>
          </div>
        </div>

        {/* Divider and Copyright/Socials */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 mt-10 pt-6 border-t border-purple-500/30 flex flex-col md:flex-row justify-between items-center text-white/50 text-sm">
          
          <p>&copy; {new Date().getFullYear()} AUTOMATED VIDEO EDITOR. All rights reserved.</p>

          {/* Social Icons */}
          <div className="flex space-x-6 mt-4 md:mt-0 text-sm">
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-purple-400 transition-colors flex items-center gap-1">
              <span className="text-base">𝕏</span> Twitter
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-purple-400 transition-colors flex items-center gap-1">
              <span className="text-base">in</span> LinkedIn
            </a>
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="hover:text-purple-400 transition-colors flex items-center gap-1">
              <span className="text-base">▶</span> YouTube
            </a>
          </div>
        </div>
        </div>
      </footer>
    </div>
  );
}