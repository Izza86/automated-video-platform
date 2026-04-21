"use client";

import {
  Pause,
  Play,
  Sparkles,
  UploadCloud,
  Video,
  Volume2,
} from "lucide-react";
import Link from "next/link";
import { FooterWave } from "@/components/footer-wave";

export default function LandingBelowFold() {
  return (
    <>
      {/* ========= PREVIEW & DEMO SECTION ========= */}
      <section className="relative border-amber-500/30 border-t bg-gradient-to-b from-[#1a1408] via-amber-950/10 to-[#1a1408] py-24">
        <div className="relative z-10 mx-auto w-full max-w-5xl px-6">
          <div className="mb-12 text-center">
            <h2 className="mb-4 font-bold text-4xl text-white md:text-5xl">
              Preview & Demo
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-white/60">
              See the magic of AI style transfer in action
            </p>
          </div>

          <div className="relative rounded-3xl border border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-pink-900/10 p-8 shadow-2xl backdrop-blur-xl">
            <div className="relative mb-8 overflow-hidden rounded-2xl border-2 border-purple-500/50 bg-black shadow-2xl">
              <div className="absolute top-0 right-0 left-0 z-20 border-purple-500/50 border-b bg-black/90 py-3 backdrop-blur-sm">
                <p className="text-center font-semibold text-white tracking-wider">
                  Before & After
                </p>
              </div>

              <div className="group relative aspect-video overflow-hidden bg-black pt-12">
                <div className="absolute inset-0">
                  <img
                    alt="Before"
                    className="h-full w-full object-cover"
                    src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=675&fit=crop"
                  />
                  <div
                    className="pointer-events-none absolute inset-0 animate-[slideLeft_3s_ease-in-out_infinite] bg-gradient-to-l from-white/40 via-white/20 to-transparent"
                    style={{ clipPath: "inset(0 0 0 50%)" }}
                  />
                </div>

                <div
                  className="absolute inset-0 overflow-hidden transition-all duration-1000 ease-in-out"
                  style={{ clipPath: "inset(0 50% 0 0)" }}
                >
                  <img
                    alt="After"
                    className="h-full w-full object-cover"
                    src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=675&fit=crop&sat=-100&con=20&vib=30"
                    style={{
                      filter:
                        "sepia(0.3) saturate(1.5) hue-rotate(-10deg) brightness(1.1)",
                    }}
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/40 via-black/20 to-transparent" />
                </div>

                <div
                  className="absolute top-0 bottom-0 z-30 w-1 animate-[slideLeft_3s_ease-in-out_infinite] bg-white shadow-2xl transition-all duration-1000 ease-in-out"
                  style={{ left: "50%" }}
                >
                  <div className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-white shadow-2xl transition-transform hover:scale-110">
                    <div className="flex gap-1">
                      <div className="h-6 w-0.5 bg-gray-600" />
                      <div className="h-6 w-0.5 bg-gray-600" />
                    </div>
                  </div>
                </div>

                <div className="absolute inset-0 z-10 flex items-center justify-center">
                  <div className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-full border-4 border-white/20 bg-purple-600/90 shadow-2xl shadow-purple-500/50 backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:bg-purple-500/90 group-hover:scale-95">
                    <Play className="ml-1 h-12 w-12 text-white" />
                  </div>
                </div>
              </div>

              <div className="absolute right-0 bottom-0 left-0 z-20 border-purple-500/50 border-t bg-black/90 px-6 py-4 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                  <button className="text-white transition hover:text-purple-400">
                    <Pause className="h-5 w-5" />
                  </button>
                  <button className="text-white transition hover:text-purple-400">
                    <Volume2 className="h-5 w-5" />
                  </button>
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
                    <div className="relative h-full w-1/3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500">
                      <div className="-translate-y-1/2 absolute top-1/2 right-0 h-3 w-3 rounded-full bg-white shadow-lg" />
                    </div>
                  </div>
                  <button className="text-white transition hover:text-purple-400">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Style Thumbnails */}
            <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
              {[
                {
                  name: "Cinematic",
                  color: "from-purple-600/60 to-purple-800/80",
                  glow: "cinematic-glow",
                  shadowColor: "shadow-purple-500/50",
                },
                {
                  name: "Vintage",
                  color: "from-amber-600/60 to-orange-800/80",
                  glow: "vintage-glow",
                  shadowColor: "shadow-amber-500/50",
                },
                {
                  name: "Neon Noir",
                  color: "from-cyan-600/60 to-blue-900/80",
                  glow: "neon-glow",
                  shadowColor: "shadow-cyan-500/50",
                },
                {
                  name: "Documentary",
                  color: "from-gray-600/60 to-slate-800/80",
                  glow: "",
                  shadowColor: "shadow-gray-500/30",
                },
                {
                  name: "Dreamy",
                  color: "from-pink-600/60 to-purple-800/80",
                  glow: "dreamy-glow",
                  shadowColor: "shadow-pink-500/50",
                },
              ].map((style, idx) => (
                <div className="group cursor-pointer" key={idx}>
                  <div
                    className={`relative aspect-video bg-gradient-to-br ${style.color} overflow-hidden rounded-lg border-2 border-purple-500/40 transition-all duration-300 hover:border-purple-400/80 ${style.glow} ${style.shadowColor} shadow-xl`}
                  >
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)",
                        backgroundSize: "200% 100%",
                        animation: "shimmerStyle 3s infinite",
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/40 bg-white/30 backdrop-blur-sm transition-all duration-300 group-hover:scale-125 group-hover:bg-white/40">
                        <Play className="ml-0.5 h-4 w-4 text-white" />
                      </div>
                    </div>
                  </div>
                  <p className="mt-2 text-center font-medium text-sm text-white/80 transition-colors group-hover:text-white">
                    {style.name}
                  </p>
                </div>
              ))}
            </div>

            <div className="text-center">
              <button className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-8 py-4 font-bold text-lg text-white shadow-blue-500/30 shadow-xl transition-all duration-300 hover:scale-105 hover:from-blue-500 hover:to-blue-400 hover:shadow-2xl hover:shadow-blue-400/40">
                APPLY STYLE & RENDER
              </button>
              <p className="mt-3 text-sm text-white/50">
                Or, Upload Your Own Video
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========= HOW IT WORKS ========= */}
      <section
        className="relative overflow-hidden border-amber-500/30 border-t bg-gradient-to-b from-[#1a1408] via-amber-950/20 to-[#1a1408] px-6 py-24 md:px-10"
        id="features"
      >
        <div className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2 h-[800px] w-[800px] rounded-full bg-purple-600/10 blur-3xl" />
        <div className="relative z-10">
          <div className="mb-16 text-center">
            <span className="font-semibold text-purple-400 text-sm uppercase tracking-wider">
              Simple Process
            </span>
            <h2 className="mt-4 mb-4 font-bold text-5xl text-white">
              How It Works
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-white/60">
              Three simple steps to transform your videos with AI-powered style
              transfer
            </p>
          </div>
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-3">
            {[
              {
                title: "Upload Reference",
                desc: "Select a video whose style, color, and mood you want to copy.",
                icon: UploadCloud,
                color: "from-purple-600 to-purple-800",
              },
              {
                title: "Upload Target",
                desc: "Your original video where the selected style will be applied.",
                icon: Video,
                color: "from-pink-600 to-purple-600",
              },
              {
                title: "AI Transform",
                desc: "Our engine applies color grading, tone mapping & stylistic patterns.",
                icon: Sparkles,
                color: "from-blue-600 to-purple-600",
              },
            ].map((card, i) => (
              <div
                className="group hover:-translate-y-2 relative rounded-3xl border border-purple-500/30 bg-gradient-to-br from-purple-900/40 via-purple-800/20 to-transparent p-8 text-white shadow-xl backdrop-blur-xl transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-purple-900/50"
                key={i}
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${card.color} rounded-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-10`}
                />
                <div className="-top-4 -right-4 absolute flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-pink-600 font-bold text-xl shadow-lg">
                  {i + 1}
                </div>
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600/20 to-pink-600/20 transition-transform duration-300 group-hover:scale-110">
                  <card.icon className="h-8 w-8 text-purple-400 transition-colors group-hover:text-pink-400" />
                </div>
                <h3 className="mb-3 font-bold text-2xl transition-colors group-hover:text-purple-300">
                  {card.title}
                </h3>
                <p className="text-white/70 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========= USE CASES ========= */}
      <section
        className="relative overflow-hidden border-amber-500/30 border-t bg-gradient-to-b from-[#1a1408] via-amber-900/20 to-[#1a1408] px-6 py-24 md:px-10"
        id="use-cases"
      >
        <div className="absolute top-20 left-10 h-96 w-96 animate-float rounded-full bg-pink-600/20 blur-3xl" />
        <div className="absolute right-10 bottom-20 h-96 w-96 animate-float-reverse rounded-full bg-purple-600/20 blur-3xl" />
        <div className="relative z-10">
          <div className="mb-16 text-center">
            <span className="font-semibold text-pink-400 text-sm uppercase tracking-wider">
              Applications
            </span>
            <h2 className="mt-4 mb-4 font-bold text-5xl text-white">
              Perfect For Every Creator
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-white/60">
              Whether you&apos;re creating content for YouTube, Instagram, or
              professional projects
            </p>
          </div>
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                label: "🎬 Filmmakers",
                detail: "Cinematic color grading in minutes",
                emoji: "🎬",
              },
              {
                label: "🎨 Content Creators",
                detail: "Professional look without expertise",
                emoji: "🎨",
              },
              {
                label: "🏢 Marketing Teams",
                detail: "Brand-consistent video content",
                emoji: "🏢",
              },
              {
                label: "📚 Educators & Trainers",
                detail: "Enhance educational content",
                emoji: "📚",
              },
              {
                label: "🎞️ Archivists & Restoration",
                detail: "Restore and enhance old footage",
                emoji: "🎞️",
              },
              {
                label: "🛍️ E-commerce & Product",
                detail: "Stunning product showcases",
                emoji: "🛍️",
              },
            ].map((item, i) => (
              <div
                className="group hover:-translate-y-2 relative rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-900/40 via-pink-900/20 to-transparent p-8 text-white shadow-lg backdrop-blur-xl transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-purple-900/50"
                key={i}
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-600/0 to-pink-600/0 transition-all duration-500 group-hover:from-purple-600/20 group-hover:to-pink-600/20" />
                <div className="-top-3 -right-3 absolute flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-pink-600 text-2xl shadow-lg transition-transform group-hover:scale-110">
                  {item.emoji}
                </div>
                <div className="relative z-10 pt-4">
                  <h3 className="mb-2 font-bold text-xl transition-colors group-hover:text-pink-300">
                    {item.label.split(" ").slice(1).join(" ")}
                  </h3>
                  <p className="text-sm text-white/70 leading-relaxed">
                    {item.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========= TECHNOLOGY ========= */}
      <section
        className="relative overflow-hidden border-amber-600/30 border-t bg-gradient-to-b from-[#1a1408] via-amber-950/15 to-[#1a1408] px-6 py-24 md:px-10"
        id="technology"
      >
        <div className="absolute top-1/3 right-0 h-[600px] w-[600px] rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute bottom-1/3 left-0 h-[600px] w-[600px] rounded-full bg-purple-600/10 blur-3xl" />
        <div className="relative z-10">
          <div className="mb-16 text-center">
            <span className="font-semibold text-blue-400 text-sm uppercase tracking-wider">
              AI Powered
            </span>
            <h2 className="mt-4 mb-4 font-bold text-5xl text-white">
              Technology Behind It
            </h2>
            <p className="mx-auto max-w-3xl text-lg text-white/60">
              Our AI engine uses neural style transfer, tone mapping, color
              grading models, and scene-detection pipelines to generate
              professional-quality outputs.
            </p>
          </div>
          <div className="mx-auto mb-12 grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: "🧠",
                title: "Neural Networks",
                desc: "Deep learning models for style transfer",
              },
              {
                icon: "🎨",
                title: "Color Grading",
                desc: "Professional color correction AI",
              },
              {
                icon: "🎬",
                title: "Scene Detection",
                desc: "Intelligent frame analysis",
              },
              {
                icon: "⚡",
                title: "Fast Processing",
                desc: "GPU-accelerated rendering",
              },
            ].map((tech, i) => (
              <div
                className="group rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-900/40 via-purple-900/20 to-transparent p-6 text-white shadow-lg backdrop-blur-xl transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-blue-900/50"
                key={i}
              >
                <div className="mb-3 text-4xl transition-transform group-hover:scale-110">
                  {tech.icon}
                </div>
                <h3 className="mb-2 font-bold text-lg transition-colors group-hover:text-blue-300">
                  {tech.title}
                </h3>
                <p className="text-sm text-white/60">{tech.desc}</p>
              </div>
            ))}
          </div>
          <div className="group relative mx-auto mt-12 max-w-4xl overflow-hidden rounded-2xl border border-purple-500/30 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-blue-600/20 transition-all duration-500 group-hover:from-purple-600/30 group-hover:to-blue-600/30" />
            <img
              alt="AI Pipeline"
              className="relative z-10 w-full object-cover opacity-90 transition-all group-hover:opacity-100"
              src="/tech-graphic.png"
            />
          </div>
        </div>
      </section>

      {/* ========= PRICING ========= */}
      <section
        className="relative overflow-hidden border-amber-500/30 border-t bg-gradient-to-b from-[#1a1408] via-amber-950/20 to-[#1a1408] px-6 py-24 md:px-10"
        id="pricing"
      >
        <div className="-translate-x-1/2 absolute top-0 left-1/2 h-[1000px] w-[1000px] rounded-full bg-purple-600/10 blur-3xl" />
        <div className="relative z-10">
          <div className="mb-16 text-center">
            <span className="font-semibold text-purple-400 text-sm uppercase tracking-wider">
              Pricing Plans
            </span>
            <h2 className="mt-4 mb-4 font-bold text-5xl text-white">
              Simple Pricing, Powerful Results
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-white/60">
              Choose the plan that fits your creative demands and scale your
              video production with AI.
            </p>
          </div>
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-3">
            <div className="group relative rounded-3xl border border-purple-600/30 bg-gradient-to-br from-purple-900/30 via-purple-800/10 to-transparent p-8 shadow-xl backdrop-blur-xl transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-purple-900/50">
              <h3 className="mb-2 font-bold text-2xl text-white">Basic</h3>
              <p className="mb-6 text-white/60">
                Start experimenting with AI style transfer.
              </p>
              <div className="mb-4 font-extrabold text-5xl text-white">
                $19
                <span className="font-normal text-white/70 text-xl">
                  /month
                </span>
              </div>
              <ul className="mb-8 space-y-3 text-white/80">
                <li className="flex items-center">
                  <span className="mr-2 text-purple-400">✓</span> 5 Video Jobs /
                  month
                </li>
                <li className="flex items-center">
                  <span className="mr-2 text-purple-400">✓</span> 1080p Output
                </li>
                <li className="flex items-center">
                  <span className="mr-2 text-purple-400">✓</span> Standard
                  Processing Speed
                </li>
                <li className="flex items-center">
                  <span className="mr-2 text-white/40">✗</span> Priority Support
                </li>
              </ul>
              <Link
                className="block w-full rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 py-3 text-center font-semibold text-white shadow-lg transition-all duration-300 hover:from-purple-500 hover:to-purple-600 hover:shadow-purple-600/50"
                href="/signup"
              >
                Start Free Trial
              </Link>
            </div>
            <div className="group relative scale-105 transform rounded-3xl border-2 border-purple-400 bg-gradient-to-br from-purple-600/40 via-pink-600/20 to-purple-900/40 p-8 shadow-2xl shadow-purple-900/80 backdrop-blur-xl transition-all duration-500 hover:scale-110">
              <div className="-top-4 -translate-x-1/2 absolute left-1/2 animate-glow-pulse rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-1.5 font-bold text-white text-xs uppercase tracking-wider shadow-lg">
                Most Popular
              </div>
              <h3 className="mb-2 font-bold text-3xl text-white">
                Pro Creator
              </h3>
              <p className="mb-6 text-white/90">
                Ideal for professionals and serious content creators.
              </p>
              <div className="mb-4 bg-gradient-to-r from-white to-purple-200 bg-clip-text font-extrabold text-6xl text-transparent">
                $49
                <span className="font-normal text-white/70 text-xl">
                  /month
                </span>
              </div>
              <ul className="mb-8 space-y-3 text-white">
                <li className="flex items-center">
                  <span className="mr-2 text-green-400">✓</span> Unlimited Video
                  Jobs
                </li>
                <li className="flex items-center">
                  <span className="mr-2 text-green-400">✓</span> 4K Output (HDR
                  Support)
                </li>
                <li className="flex items-center">
                  <span className="mr-2 text-green-400">✓</span> High-Speed
                  Processing
                </li>
                <li className="flex items-center">
                  <span className="mr-2 text-green-400">✓</span> Priority
                  Support
                </li>
              </ul>
              <Link
                className="block w-full rounded-xl bg-white py-4 text-center font-bold text-lg text-purple-800 shadow-lg transition-all duration-300 hover:bg-gray-200 hover:shadow-xl"
                href="/signup"
              >
                Choose Pro
              </Link>
            </div>
            <div className="group relative rounded-3xl border border-purple-600/30 bg-gradient-to-br from-purple-900/30 via-purple-800/10 to-transparent p-8 shadow-xl backdrop-blur-xl transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-purple-900/50">
              <h3 className="mb-2 font-bold text-2xl text-white">Enterprise</h3>
              <p className="mb-6 text-white/60">
                Tailored solutions for large teams and agencies.
              </p>
              <div className="mb-4 font-extrabold text-5xl text-white">
                Custom
              </div>
              <ul className="mb-8 space-y-3 text-white/80">
                <li className="flex items-center">
                  <span className="mr-2 text-purple-400">✓</span> Dedicated API
                  Access
                </li>
                <li className="flex items-center">
                  <span className="mr-2 text-purple-400">✓</span> Volume
                  Discounts
                </li>
                <li className="flex items-center">
                  <span className="mr-2 text-purple-400">✓</span> Custom Model
                  Training
                </li>
                <li className="flex items-center">
                  <span className="mr-2 text-purple-400">✓</span> 24/7
                  Enterprise Support
                </li>
              </ul>
              <a
                className="block w-full rounded-xl bg-gradient-to-r from-gray-700 to-gray-800 py-3 text-center font-semibold text-white shadow-lg transition-all duration-300 hover:from-gray-600 hover:to-gray-700 hover:shadow-gray-600/50"
                href="/contact"
              >
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ========= ABOUT ========= */}
      <section
        className="relative overflow-hidden border-amber-500/30 border-t bg-gradient-to-b from-[#1a1408] via-amber-950/30 to-[#1a1408] px-6 py-24 md:px-10"
        id="about"
      >
        <div className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2 h-[800px] w-[800px] rounded-full bg-purple-600/10 blur-3xl" />
        <div className="relative z-10 mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 md:grid-cols-2">
          <div className="text-white">
            <span className="font-semibold text-purple-400 text-sm uppercase tracking-wider">
              About Us
            </span>
            <h2 className="mt-4 mb-6 font-bold text-5xl">
              Our Mission:{" "}
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Democratizing VFX
              </span>
            </h2>
            <p className="mb-6 text-lg text-white/70 leading-relaxed">
              We started{" "}
              <strong className="text-white">Automated Video Editor</strong> to
              bring powerful, studio-grade visual effects and color grading to
              everyone.
            </p>
            <p className="mb-8 text-white/70 leading-relaxed">
              Our proprietary AI models simplify the most time-consuming aspects
              of post-production, giving filmmakers and creators hours back to
              focus on storytelling.
            </p>
            <a
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-4 font-semibold text-base text-white shadow-lg transition-all duration-300 hover:scale-105 hover:from-purple-500 hover:to-pink-500 hover:shadow-purple-600/50"
              href="#features"
            >
              See Our Technology <span className="text-xl">→</span>
            </a>
          </div>
          <div className="group eye-container relative h-96 w-full cursor-pointer overflow-hidden rounded-2xl border border-purple-500/30 shadow-2xl shadow-purple-900/50">
            <img
              alt="Our Mission"
              className="eye-blink h-full w-full object-cover opacity-90 brightness-90 saturate-100 filter transition-all duration-500 group-hover:opacity-100 group-hover:brightness-110 group-hover:saturate-125"
              src="/AIVISION.jpg"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-transparent to-pink-900/40 mix-blend-multiply transition-opacity group-hover:opacity-75" />
            <div className="absolute bottom-6 left-6 rounded-lg border border-purple-500/30 bg-black/60 px-4 py-2 backdrop-blur-md">
              <p className="font-semibold text-white">
                Trusted by 10K+ Creators
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========= FOOTER ========= */}
      <footer className="relative flex min-h-[400px] items-center justify-center overflow-hidden bg-[#1a1408]">
        <div className="absolute inset-0 h-full w-full">
          <FooterWave />
        </div>
        <div className="relative z-10 w-full py-16">
          <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-2 gap-8 px-6 text-white md:grid-cols-4">
            <div className="col-span-2 md:col-span-1">
              <a
                className="group mb-4 flex items-center space-x-2 font-bold text-2xl text-white tracking-wide"
                href="/"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-pink-600 font-bold text-sm transition-transform group-hover:scale-110">
                  AI
                </div>
                <span className="text-lg">
                  AUTOMATED<span className="text-purple-400">VIDEO EDITOR</span>
                </span>
              </a>
              <p className="mt-2 text-sm text-white/60 leading-relaxed">
                Democratizing VFX with powerful AI style transfer tools.
              </p>
            </div>
            <div>
              <h4 className="mb-4 font-semibold text-lg text-purple-300">
                Product
              </h4>
              <ul className="space-y-3 text-sm text-white/70">
                <li>
                  <a
                    className="transition hover:text-purple-300"
                    href="#features"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    className="transition hover:text-purple-300"
                    href="#pricing"
                  >
                    Pricing
                  </a>
                </li>
                <li>
                  <a
                    className="transition hover:text-purple-300"
                    href="#use-cases"
                  >
                    Use Cases
                  </a>
                </li>
                <li>
                  <Link
                    className="transition hover:text-purple-300"
                    href="/login"
                  >
                    Login
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-semibold text-lg text-purple-300">
                Company
              </h4>
              <ul className="space-y-3 text-sm text-white/70">
                <li>
                  <a className="transition hover:text-purple-300" href="#about">
                    About Us
                  </a>
                </li>
                <li>
                  <a
                    className="transition hover:text-purple-300"
                    href="/careers"
                  >
                    Careers (Hiring)
                  </a>
                </li>
                <li>
                  <a className="transition hover:text-purple-300" href="/press">
                    Press
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-semibold text-lg text-purple-300">
                Legal
              </h4>
              <ul className="space-y-3 text-sm text-white/70">
                <li>
                  <a
                    className="transition hover:text-purple-300"
                    href="/privacy"
                  >
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a className="transition hover:text-purple-300" href="/terms">
                    Terms of Service
                  </a>
                </li>
                <li className="pt-2">
                  <a
                    className="transition hover:text-purple-300"
                    href="mailto:support@autoeditai.com"
                  >
                    Contact Support
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="relative z-10 mx-auto mt-10 flex max-w-7xl flex-col items-center justify-between border-purple-500/30 border-t px-6 pt-6 text-sm text-white/50 md:flex-row">
            <p>
              &copy; {new Date().getFullYear()} AUTOMATED VIDEO EDITOR. All
              rights reserved.
            </p>
            <div className="mt-4 flex space-x-6 text-sm md:mt-0">
              <a
                className="flex items-center gap-1 transition-colors hover:text-purple-400"
                href="https://twitter.com"
                rel="noopener noreferrer"
                target="_blank"
              >
                <span className="text-base">𝕏</span> Twitter
              </a>
              <a
                className="flex items-center gap-1 transition-colors hover:text-purple-400"
                href="https://linkedin.com"
                rel="noopener noreferrer"
                target="_blank"
              >
                <span className="text-base">in</span> LinkedIn
              </a>
              <a
                className="flex items-center gap-1 transition-colors hover:text-purple-400"
                href="https://youtube.com"
                rel="noopener noreferrer"
                target="_blank"
              >
                <span className="text-base">▶</span> YouTube
              </a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
