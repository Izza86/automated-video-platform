"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { Play, Pause, Volume2, UploadCloud, Video, Sparkles } from "lucide-react";

const FooterWave = dynamic(
  () => import("@/components/footer-wave").then((m) => m.FooterWave),
  { ssr: false, loading: () => <div className="w-full h-40 bg-gradient-to-r from-amber-50 to-yellow-50 animate-pulse" /> }
);

export default function LandingBelowFold() {
  return (
    <>
      {/* ========= PREVIEW & DEMO SECTION ========= */}
      <section className="relative py-24 bg-gradient-to-b from-[#1a1408] via-amber-950/10 to-[#1a1408] border-t border-amber-500/30">
        <div className="relative z-10 w-full max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Preview & Demo</h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">See the magic of AI style transfer in action</p>
          </div>

          <div className="relative bg-gradient-to-br from-purple-900/20 to-pink-900/10 backdrop-blur-xl rounded-3xl border border-purple-500/30 p-8 shadow-2xl">
            <div className="relative bg-black rounded-2xl border-2 border-purple-500/50 overflow-hidden shadow-2xl mb-8">
              <div className="absolute top-0 left-0 right-0 bg-black/90 backdrop-blur-sm py-3 z-20 border-b border-purple-500/50">
                <p className="text-center text-white font-semibold tracking-wider">Before & After</p>
              </div>

              <div className="relative pt-12 aspect-video bg-black overflow-hidden group">
                <div className="absolute inset-0">
                  <img src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=675&fit=crop" alt="Before" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-l from-white/40 via-white/20 to-transparent pointer-events-none animate-[slideLeft_3s_ease-in-out_infinite]" style={{ clipPath: "inset(0 0 0 50%)" }} />
                </div>

                <div className="absolute inset-0 overflow-hidden transition-all duration-1000 ease-in-out" style={{ clipPath: "inset(0 50% 0 0)" }}>
                  <img src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=675&fit=crop&sat=-100&con=20&vib=30" alt="After" className="w-full h-full object-cover" style={{ filter: "sepia(0.3) saturate(1.5) hue-rotate(-10deg) brightness(1.1)" }} />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/20 to-transparent pointer-events-none" />
                </div>

                <div className="absolute top-0 bottom-0 w-1 bg-white shadow-2xl z-30 transition-all duration-1000 ease-in-out animate-[slideLeft_3s_ease-in-out_infinite]" style={{ left: "50%" }}>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-2xl flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
                    <div className="flex gap-1">
                      <div className="w-0.5 h-6 bg-gray-600" />
                      <div className="w-0.5 h-6 bg-gray-600" />
                    </div>
                  </div>
                </div>

                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div className="w-24 h-24 bg-purple-600/90 rounded-full flex items-center justify-center shadow-2xl shadow-purple-500/50 backdrop-blur-sm border-4 border-white/20 cursor-pointer hover:scale-110 hover:bg-purple-500/90 transition-all duration-300 group-hover:scale-95">
                    <Play className="w-12 h-12 text-white ml-1" />
                  </div>
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 bg-black/90 backdrop-blur-sm py-4 px-6 border-t border-purple-500/50 z-20">
                <div className="flex items-center gap-4">
                  <button className="text-white hover:text-purple-400 transition"><Pause className="w-5 h-5" /></button>
                  <button className="text-white hover:text-purple-400 transition"><Volume2 className="w-5 h-5" /></button>
                  <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full w-1/3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full relative">
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg" />
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
                { name: "Cinematic", color: "from-purple-600/60 to-purple-800/80", glow: "cinematic-glow", shadowColor: "shadow-purple-500/50" },
                { name: "Vintage", color: "from-amber-600/60 to-orange-800/80", glow: "vintage-glow", shadowColor: "shadow-amber-500/50" },
                { name: "Neon Noir", color: "from-cyan-600/60 to-blue-900/80", glow: "neon-glow", shadowColor: "shadow-cyan-500/50" },
                { name: "Documentary", color: "from-gray-600/60 to-slate-800/80", glow: "", shadowColor: "shadow-gray-500/30" },
                { name: "Dreamy", color: "from-pink-600/60 to-purple-800/80", glow: "dreamy-glow", shadowColor: "shadow-pink-500/50" },
              ].map((style, idx) => (
                <div key={idx} className="group cursor-pointer">
                  <div className={`relative aspect-video bg-gradient-to-br ${style.color} rounded-lg border-2 border-purple-500/40 hover:border-purple-400/80 transition-all duration-300 overflow-hidden ${style.glow} ${style.shadowColor} shadow-xl`}>
                    <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)", backgroundSize: "200% 100%", animation: "shimmerStyle 3s infinite" }} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 bg-white/30 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/40 group-hover:scale-125 group-hover:bg-white/40 transition-all duration-300">
                        <Play className="w-4 h-4 text-white ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <p className="text-white/80 text-sm text-center mt-2 font-medium group-hover:text-white transition-colors">{style.name}</p>
                </div>
              ))}
            </div>

            <div className="text-center">
              <button className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold text-lg rounded-xl shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:shadow-blue-400/40 transition-all duration-300 hover:scale-105">
                APPLY STYLE & RENDER
              </button>
              <p className="text-white/50 text-sm mt-3">Or, Upload Your Own Video</p>
            </div>
          </div>
        </div>
      </section>

      {/* ========= HOW IT WORKS ========= */}
      <section id="features" className="relative py-24 bg-gradient-to-b from-[#1a1408] via-amber-950/20 to-[#1a1408] px-6 md:px-10 border-t border-amber-500/30 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="text-center mb-16">
            <span className="text-purple-400 font-semibold text-sm uppercase tracking-wider">Simple Process</span>
            <h2 className="text-5xl font-bold text-white mt-4 mb-4">How It Works</h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">Three simple steps to transform your videos with AI-powered style transfer</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              { title: "Upload Reference", desc: "Select a video whose style, color, and mood you want to copy.", icon: UploadCloud, color: "from-purple-600 to-purple-800" },
              { title: "Upload Target", desc: "Your original video where the selected style will be applied.", icon: Video, color: "from-pink-600 to-purple-600" },
              { title: "AI Transform", desc: "Our engine applies color grading, tone mapping & stylistic patterns.", icon: Sparkles, color: "from-blue-600 to-purple-600" },
            ].map((card, i) => (
              <div key={i} className="group relative p-8 bg-gradient-to-br from-purple-900/40 via-purple-800/20 to-transparent border border-purple-500/30 rounded-3xl text-white shadow-xl hover:shadow-2xl hover:shadow-purple-900/50 transition-all duration-500 backdrop-blur-xl hover:scale-105 hover:-translate-y-2">
                <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-0 group-hover:opacity-10 rounded-3xl transition-opacity duration-500`} />
                <div className="absolute -top-4 -right-4 w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center font-bold text-xl shadow-lg">{i + 1}</div>
                <div className="w-16 h-16 bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <card.icon className="w-8 h-8 text-purple-400 group-hover:text-pink-400 transition-colors" />
                </div>
                <h3 className="text-2xl font-bold mb-3 group-hover:text-purple-300 transition-colors">{card.title}</h3>
                <p className="text-white/70 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========= USE CASES ========= */}
      <section id="use-cases" className="relative py-24 bg-gradient-to-b from-[#1a1408] via-amber-900/20 to-[#1a1408] px-6 md:px-10 border-t border-amber-500/30 overflow-hidden">
        <div className="absolute top-20 left-10 w-96 h-96 bg-pink-600/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-float-reverse" />
        <div className="relative z-10">
          <div className="text-center mb-16">
            <span className="text-pink-400 font-semibold text-sm uppercase tracking-wider">Applications</span>
            <h2 className="text-5xl font-bold text-white mt-4 mb-4">Perfect For Every Creator</h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">Whether you&apos;re creating content for YouTube, Instagram, or professional projects</p>
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
              <div key={i} className="group relative p-8 bg-gradient-to-br from-purple-900/40 via-pink-900/20 to-transparent border border-purple-500/30 rounded-2xl text-white shadow-lg hover:shadow-2xl hover:shadow-purple-900/50 transition-all duration-500 backdrop-blur-xl hover:scale-105 hover:-translate-y-2">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/0 to-pink-600/0 group-hover:from-purple-600/20 group-hover:to-pink-600/20 rounded-2xl transition-all duration-500" />
                <div className="absolute -top-3 -right-3 w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform">{item.emoji}</div>
                <div className="relative z-10 pt-4">
                  <h3 className="text-xl font-bold mb-2 group-hover:text-pink-300 transition-colors">{item.label.split(" ").slice(1).join(" ")}</h3>
                  <p className="text-white/70 text-sm leading-relaxed">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========= TECHNOLOGY ========= */}
      <section id="technology" className="relative py-24 bg-gradient-to-b from-[#1a1408] via-amber-950/15 to-[#1a1408] px-6 md:px-10 border-t border-amber-600/30 overflow-hidden">
        <div className="absolute top-1/3 right-0 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="text-center mb-16">
            <span className="text-blue-400 font-semibold text-sm uppercase tracking-wider">AI Powered</span>
            <h2 className="text-5xl font-bold text-white mt-4 mb-4">Technology Behind It</h2>
            <p className="text-white/60 text-lg max-w-3xl mx-auto">Our AI engine uses neural style transfer, tone mapping, color grading models, and scene-detection pipelines to generate professional-quality outputs.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mb-12">
            {[
              { icon: "🧠", title: "Neural Networks", desc: "Deep learning models for style transfer" },
              { icon: "🎨", title: "Color Grading", desc: "Professional color correction AI" },
              { icon: "🎬", title: "Scene Detection", desc: "Intelligent frame analysis" },
              { icon: "⚡", title: "Fast Processing", desc: "GPU-accelerated rendering" },
            ].map((tech, i) => (
              <div key={i} className="group p-6 bg-gradient-to-br from-blue-900/40 via-purple-900/20 to-transparent border border-blue-500/30 rounded-2xl text-white shadow-lg hover:shadow-2xl hover:shadow-blue-900/50 transition-all duration-500 backdrop-blur-xl hover:scale-105">
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">{tech.icon}</div>
                <h3 className="text-lg font-bold mb-2 group-hover:text-blue-300 transition-colors">{tech.title}</h3>
                <p className="text-white/60 text-sm">{tech.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-2xl border border-purple-500/30 relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-blue-600/20 group-hover:from-purple-600/30 group-hover:to-blue-600/30 transition-all duration-500" />
            <img src="/tech-graphic.png" alt="AI Pipeline" className="w-full object-cover opacity-90 group-hover:opacity-100 transition-all relative z-10" />
          </div>
        </div>
      </section>

      {/* ========= PRICING ========= */}
      <section id="pricing" className="relative py-24 bg-gradient-to-b from-[#1a1408] via-amber-950/20 to-[#1a1408] px-6 md:px-10 border-t border-amber-500/30 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] bg-purple-600/10 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="text-center mb-16">
            <span className="text-purple-400 font-semibold text-sm uppercase tracking-wider">Pricing Plans</span>
            <h2 className="text-5xl font-bold text-white mt-4 mb-4">Simple Pricing, Powerful Results</h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">Choose the plan that fits your creative demands and scale your video production with AI.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="group relative p-8 bg-gradient-to-br from-purple-900/30 via-purple-800/10 to-transparent border border-purple-600/30 rounded-3xl shadow-xl hover:shadow-2xl hover:shadow-purple-900/50 transition-all duration-500 backdrop-blur-xl hover:scale-105">
              <h3 className="text-2xl font-bold text-white mb-2">Basic</h3>
              <p className="text-white/60 mb-6">Start experimenting with AI style transfer.</p>
              <div className="text-5xl font-extrabold text-white mb-4">$19<span className="text-xl font-normal text-white/70">/month</span></div>
              <ul className="space-y-3 text-white/80 mb-8">
                <li className="flex items-center"><span className="text-purple-400 mr-2">✓</span> 5 Video Jobs / month</li>
                <li className="flex items-center"><span className="text-purple-400 mr-2">✓</span> 1080p Output</li>
                <li className="flex items-center"><span className="text-purple-400 mr-2">✓</span> Standard Processing Speed</li>
                <li className="flex items-center"><span className="text-white/40 mr-2">✗</span> Priority Support</li>
              </ul>
              <Link href="/signup" className="block w-full text-center py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 rounded-xl font-semibold text-white transition-all duration-300 shadow-lg hover:shadow-purple-600/50">Start Free Trial</Link>
            </div>
            <div className="group relative p-8 bg-gradient-to-br from-purple-600/40 via-pink-600/20 to-purple-900/40 border-2 border-purple-400 rounded-3xl shadow-2xl shadow-purple-900/80 transform scale-105 hover:scale-110 transition-all duration-500 backdrop-blur-xl">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg animate-glow-pulse">Most Popular</div>
              <h3 className="text-3xl font-bold text-white mb-2">Pro Creator</h3>
              <p className="text-white/90 mb-6">Ideal for professionals and serious content creators.</p>
              <div className="text-6xl font-extrabold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent mb-4">$49<span className="text-xl font-normal text-white/70">/month</span></div>
              <ul className="space-y-3 text-white mb-8">
                <li className="flex items-center"><span className="text-green-400 mr-2">✓</span> Unlimited Video Jobs</li>
                <li className="flex items-center"><span className="text-green-400 mr-2">✓</span> 4K Output (HDR Support)</li>
                <li className="flex items-center"><span className="text-green-400 mr-2">✓</span> High-Speed Processing</li>
                <li className="flex items-center"><span className="text-green-400 mr-2">✓</span> Priority Support</li>
              </ul>
              <Link href="/signup" className="block w-full text-center py-4 bg-white text-purple-800 rounded-xl font-bold text-lg hover:bg-gray-200 transition-all duration-300 shadow-lg hover:shadow-xl">Choose Pro</Link>
            </div>
            <div className="group relative p-8 bg-gradient-to-br from-purple-900/30 via-purple-800/10 to-transparent border border-purple-600/30 rounded-3xl shadow-xl hover:shadow-2xl hover:shadow-purple-900/50 transition-all duration-500 backdrop-blur-xl hover:scale-105">
              <h3 className="text-2xl font-bold text-white mb-2">Enterprise</h3>
              <p className="text-white/60 mb-6">Tailored solutions for large teams and agencies.</p>
              <div className="text-5xl font-extrabold text-white mb-4">Custom</div>
              <ul className="space-y-3 text-white/80 mb-8">
                <li className="flex items-center"><span className="text-purple-400 mr-2">✓</span> Dedicated API Access</li>
                <li className="flex items-center"><span className="text-purple-400 mr-2">✓</span> Volume Discounts</li>
                <li className="flex items-center"><span className="text-purple-400 mr-2">✓</span> Custom Model Training</li>
                <li className="flex items-center"><span className="text-purple-400 mr-2">✓</span> 24/7 Enterprise Support</li>
              </ul>
              <a href="/contact" className="block w-full text-center py-3 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 rounded-xl font-semibold text-white transition-all duration-300 shadow-lg hover:shadow-gray-600/50">Contact Sales</a>
            </div>
          </div>
        </div>
      </section>

      {/* ========= ABOUT ========= */}
      <section id="about" className="relative py-24 bg-gradient-to-b from-[#1a1408] via-amber-950/30 to-[#1a1408] px-6 md:px-10 border-t border-amber-500/30 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-3xl" />
        <div className="relative z-10 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="text-white">
            <span className="text-purple-400 font-semibold text-sm uppercase tracking-wider">About Us</span>
            <h2 className="text-5xl font-bold mb-6 mt-4">Our Mission: <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Democratizing VFX</span></h2>
            <p className="text-white/70 mb-6 text-lg leading-relaxed">We started <strong className="text-white">Automated Video Editor</strong> to bring powerful, studio-grade visual effects and color grading to everyone.</p>
            <p className="text-white/70 mb-8 leading-relaxed">Our proprietary AI models simplify the most time-consuming aspects of post-production, giving filmmakers and creators hours back to focus on storytelling.</p>
            <a href="#features" className="inline-flex items-center gap-2 px-8 py-4 text-base rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all duration-300 font-semibold text-white shadow-lg hover:shadow-purple-600/50 hover:scale-105">See Our Technology <span className="text-xl">→</span></a>
          </div>
          <div className="relative w-full h-96 rounded-2xl overflow-hidden shadow-2xl shadow-purple-900/50 border border-purple-500/30 group eye-container cursor-pointer">
            <img src="/AIVISION.jpg" alt="Our Mission" className="w-full h-full object-cover filter brightness-90 saturate-100 opacity-90 group-hover:opacity-100 group-hover:brightness-110 group-hover:saturate-125 transition-all duration-500 eye-blink" />
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-transparent to-pink-900/40 mix-blend-multiply group-hover:opacity-75 transition-opacity" />
            <div className="absolute bottom-6 left-6 px-4 py-2 bg-black/60 backdrop-blur-md rounded-lg border border-purple-500/30"><p className="text-white font-semibold">Trusted by 10K+ Creators</p></div>
          </div>
        </div>
      </section>

      {/* ========= FOOTER ========= */}
      <footer className="relative bg-[#1a1408] overflow-hidden min-h-[400px] flex items-center justify-center">
        <div className="absolute inset-0 w-full h-full"><FooterWave /></div>
        <div className="relative z-10 w-full py-16">
          <div className="relative z-10 max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-white">
            <div className="col-span-2 md:col-span-1">
              <a href="/" className="flex items-center space-x-2 text-2xl font-bold tracking-wide text-white mb-4 group">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center font-bold text-sm group-hover:scale-110 transition-transform">AI</div>
                <span className="text-lg">AUTOMATED<span className="text-purple-400">VIDEO EDITOR</span></span>
              </a>
              <p className="text-white/60 text-sm mt-2 leading-relaxed">Democratizing VFX with powerful AI style transfer tools.</p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4 text-purple-300">Product</h4>
              <ul className="space-y-3 text-white/70 text-sm">
                <li><a href="#features" className="hover:text-purple-300 transition">Features</a></li>
                <li><a href="#pricing" className="hover:text-purple-300 transition">Pricing</a></li>
                <li><a href="#use-cases" className="hover:text-purple-300 transition">Use Cases</a></li>
                <li><Link href="/login" className="hover:text-purple-300 transition">Login</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4 text-purple-300">Company</h4>
              <ul className="space-y-3 text-white/70 text-sm">
                <li><a href="#about" className="hover:text-purple-300 transition">About Us</a></li>
                <li><a href="/careers" className="hover:text-purple-300 transition">Careers (Hiring)</a></li>
                <li><a href="/press" className="hover:text-purple-300 transition">Press</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4 text-purple-300">Legal</h4>
              <ul className="space-y-3 text-white/70 text-sm">
                <li><a href="/privacy" className="hover:text-purple-300 transition">Privacy Policy</a></li>
                <li><a href="/terms" className="hover:text-purple-300 transition">Terms of Service</a></li>
                <li className="pt-2"><a href="mailto:support@autoeditai.com" className="hover:text-purple-300 transition">Contact Support</a></li>
              </ul>
            </div>
          </div>
          <div className="relative z-10 max-w-7xl mx-auto px-6 mt-10 pt-6 border-t border-purple-500/30 flex flex-col md:flex-row justify-between items-center text-white/50 text-sm">
            <p>&copy; {new Date().getFullYear()} AUTOMATED VIDEO EDITOR. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 md:mt-0 text-sm">
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-purple-400 transition-colors flex items-center gap-1"><span className="text-base">𝕏</span> Twitter</a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-purple-400 transition-colors flex items-center gap-1"><span className="text-base">in</span> LinkedIn</a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="hover:text-purple-400 transition-colors flex items-center gap-1"><span className="text-base">▶</span> YouTube</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
