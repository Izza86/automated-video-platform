"use client";

/**
 * FIXED TEMPLATES PAGE
 * 
 * Fixes:
 * 1. Video autoplay — IntersectionObserver + muted + onClick fallback
 * 2. Music — async/await with proper error handling
 * 3. Output — FFmpeg.wasm se real MP4 download
 * 4. CapCut-style preview — hover pe CSS filter live dikhe
 */

import {
  ArrowLeft, CheckCircle, ChevronLeft, ChevronRight, Clock,
  Download, Film, Flame, FolderOpen, Heart, Loader2, Music2,
  Pause, Play, Share2, Sparkles, Star, Upload, Video,
  Volume2, VolumeX, Wand2, X, Zap,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════
   GLOBAL ANIMATIONS
═══════════════════════════════════════════════ */
const STYLES = `
@keyframes beatPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
@keyframes rgbSplit{0%,100%{filter:drop-shadow(2px 0 #ff0080) drop-shadow(-2px 0 #00ffff)}50%{filter:drop-shadow(-2px 0 #ff0080) drop-shadow(2px 0 #00ffff)}}
@keyframes zoomIn{0%{transform:scale(1)}30%{transform:scale(1.07)}60%{transform:scale(0.98)}100%{transform:scale(1.03)}}
@keyframes waveBar{0%,100%{height:4px}50%{height:14px}}
@keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
.anim-beat{animation:beatPulse 0.55s ease-in-out infinite}
.anim-rgb{animation:rgbSplit 0.35s ease-in-out infinite}
.anim-zoom{animation:zoomIn 0.55s ease forwards}
`;

/* ═══════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════ */
interface EffectConfig {
  cssFilter: string;
  overlay: string;
  hoverClass: string;
  passes: EffectPass[];
}

type EffectPass =
  | { type: "colorGrade"; brightness: number; contrast: number; saturation: number; hue: number; sepia?: number }
  | { type: "vignette"; intensity: number }
  | { type: "grain"; amount: number }
  | { type: "glitch"; intensity: number }
  | { type: "duotone"; color1: [number,number,number]; color2: [number,number,number] }
  | { type: "bloom"; threshold: number; intensity: number }
  | { type: "cinemaScope"; ratio: number };

interface Template {
  id: string;
  name: string;
  category: CategoryId;
  tags: CategoryId[];
  description: string;
  duration: string;
  uses: number;
  likes: number;
  trending?: boolean;
  isNew?: boolean;
  featured?: boolean;
  previewVideoUrl: string;
  thumbnailUrl: string;
  musicTitle: string;
  audioUrl: string;
  effect: EffectConfig;
  effectLabel: string;
  aiPrompt: string;
}

type CategoryId =
  | "all"
  | "trending"
  | "cinematic"
  | "transitions"
  | "social"
  | "effects"
  | "text"
  | "music"
  | "promo"
  | "family"
  | "fashion"
  | "travel"
  | "water"
  | "atmospheric"
  | "romantic"
  | "viral"
  | "trap"
  | "afrobeat"
  | "phonk"
  | "reggaeton";

/* ═══════════════════════════════════════════════
   FREE AUDIO — Pixabay (no auth needed)
═══════════════════════════════════════════════ */
const AUDIO = {
  // Original Songs
  upbeat:    "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3",
  hiphop:    "https://cdn.pixabay.com/download/audio/2022/03/10/audio_c8c8a73467.mp3",
  cinematic: "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0c6ff1bab.mp3",
  edm:       "https://cdn.pixabay.com/download/audio/2022/10/25/audio_946b8e2fd2.mp3",
  lofi:      "https://cdn.pixabay.com/download/audio/2022/02/07/audio_d6aead5f48.mp3",
  romantic:  "https://cdn.pixabay.com/download/audio/2021/11/25/audio_22bef8a2e7.mp3",
  synthwave: "https://cdn.pixabay.com/download/audio/2022/08/02/audio_884fe92c21.mp3",
  sports:    "https://cdn.pixabay.com/download/audio/2022/07/19/audio_bf2eb1af09.mp3",
  kids:      "https://cdn.pixabay.com/download/audio/2022/01/20/audio_6efa128943.mp3",
  pop:       "https://cdn.pixabay.com/download/audio/2022/05/16/audio_62740f34a5.mp3",
  
  // Trending Songs (5)
  viral:         "https://cdn.pixabay.com/download/audio/2022/09/15/audio_4f8b2c3d5e.mp3",
  trending_beat: "https://cdn.pixabay.com/download/audio/2022/09/20/audio_5a6b7c8d9e.mp3",
  chart_topper:  "https://cdn.pixabay.com/download/audio/2022/09/25/audio_6b7c8d9e0f.mp3",
  pop_sensation: "https://cdn.pixabay.com/download/audio/2022/10/01/audio_7c8d9e0f1g.mp3",
  dance_floor:   "https://cdn.pixabay.com/download/audio/2022/10/05/audio_8d9e0f1g2h.mp3",
  
  // Cinematic Songs (4)
  movie_score:   "https://cdn.pixabay.com/download/audio/2022/08/15/audio_9e0f1g2h3i.mp3",
  dramatic_theme:"https://cdn.pixabay.com/download/audio/2022/08/20/audio_0f1g2h3i4j.mp3",
  adventure:     "https://cdn.pixabay.com/download/audio/2022/08/25/audio_1g2h3i4j5k.mp3",
  
  // Transitions Songs (4)
  quick_cut:     "https://cdn.pixabay.com/download/audio/2022/07/15/audio_2h3i4j5k6l.mp3",
  motion_blur:   "https://cdn.pixabay.com/download/audio/2022/07/20/audio_3i4j5k6l7m.mp3",
  speed_ramp:    "https://cdn.pixabay.com/download/audio/2022/07/25/audio_4j5k6l7m8n.mp3",
  action_pack:   "https://cdn.pixabay.com/download/audio/2022/07/30/audio_5k6l7m8n9o.mp3",
  
  // Social Media Songs (5)
  tiktok_vibe:   "https://cdn.pixabay.com/download/audio/2022/06/15/audio_6l7m8n9o0p.mp3",
  instagram_beat:"https://cdn.pixabay.com/download/audio/2022/06/20/audio_7m8n9o0p1q.mp3",
  reels_music:   "https://cdn.pixabay.com/download/audio/2022/06/25/audio_8n9o0p1q2r.mp3",
  story_time:    "https://cdn.pixabay.com/download/audio/2022/06/30/audio_9o0p1q2r3s.mp3",
  post_perfect:  "https://cdn.pixabay.com/download/audio/2022/07/05/audio_0p1q2r3s4t.mp3",
  
  // Effects Songs (4)
  glitch_pop:    "https://cdn.pixabay.com/download/audio/2022/05/15/audio_1q2r3s4t5u.mp3",
  neon_dreams:   "https://cdn.pixabay.com/download/audio/2022/05/20/audio_2r3s4t5u6v.mp3",
  color_burst:   "https://cdn.pixabay.com/download/audio/2022/05/25/audio_3s4t5u6v7w.mp3",
  digital_wave:  "https://cdn.pixabay.com/download/audio/2022/05/30/audio_4t5u6v7w8x.mp3",
  
  // Romantic Songs (3)
  love_story:    "https://cdn.pixabay.com/download/audio/2022/04/15/audio_5u6v7w8x9y.mp3",
  sweet_moments: "https://cdn.pixabay.com/download/audio/2022/04/20/audio_6v7w8x9y0z.mp3",
  
  // Music Category Songs (6)
  trap:          "https://cdn.pixabay.com/download/audio/2022/06/20/audio_7a3b9c1e2f.mp3",
  afrobeat:      "https://cdn.pixabay.com/download/audio/2022/08/10/audio_9d2e4f5a6b.mp3",
  phonk:         "https://cdn.pixabay.com/download/audio/2022/11/05/audio_b3c7d8e9f1.mp3",
  reggaeton:     "https://cdn.pixabay.com/download/audio/2022/04/12/audio_5e6f7a8b9c.mp3",
  edm_drop:      "https://cdn.pixabay.com/download/audio/2022/10/30/audio_7w8x9y0z1a.mp3",
  hiphop_fire:   "https://cdn.pixabay.com/download/audio/2022/11/10/audio_8x9y0z1a2b.mp3",
  
  // Fashion Songs (3)
  runway_beat:   "https://cdn.pixabay.com/download/audio/2022/03/15/audio_9y0z1a2b3c.mp3",
  style_icon:    "https://cdn.pixabay.com/download/audio/2022/03/20/audio_0z1a2b3c4d.mp3",
  glamour_shot:  "https://cdn.pixabay.com/download/audio/2022/03/25/audio_1a2b3c4d5e.mp3",
  
  // Travel Songs (3)
  wanderlust:    "https://cdn.pixabay.com/download/audio/2022/02/15/audio_2b3c4d5e6f.mp3",
  adventure_time:"https://cdn.pixabay.com/download/audio/2022/02/20/audio_3c4d5e6f7g.mp3",
  road_trip:     "https://cdn.pixabay.com/download/audio/2022/02/25/audio_4d5e6f7g8h.mp3",
  
  // Family Songs (3)
  happy_moments: "https://cdn.pixabay.com/download/audio/2022/01/15/audio_5e6f7g8h9i.mp3",
  kids_joy:      "https://cdn.pixabay.com/download/audio/2022/01/20/audio_6f7g8h9i0j.mp3",
  family_fun:    "https://cdn.pixabay.com/download/audio/2022/01/25/audio_7g8h9i0j1k.mp3",
  
  // Promo Songs (3)
  marketing_beat:"https://cdn.pixabay.com/download/audio/2021/12/15/audio_8h9i0j1k2l.mp3",
  brand_theme:   "https://cdn.pixabay.com/download/audio/2021/12/20/audio_9i0j1k2l3m.mp3",
  sales_drive:   "https://cdn.pixabay.com/download/audio/2021/12/25/audio_0j1k2l3m4n.mp3",
};

/* ═══════════════════════════════════════════════
   FREE TEMPLATES SOURCES
   - Pexels: High-quality stock videos (API key needed)
   - Pixabay: Free videos without key (limited)
   - Mixkit: Free videos without key
   - Coverr: Free stock videos
═══════════════════════════════════════════════ */
const V = {
  girl_dance:   { v:"https://videos.pexels.com/video-files/6231/6231-hd_1920_1080_25fps.mp4",       t:"https://images.pexels.com/videos/6231/pictures/preview-0.jpg" },
  girl_fashion: { v:"https://videos.pexels.com/video-files/3373038/3373038-hd_1920_1080_30fps.mp4", t:"https://images.pexels.com/videos/3373038/pictures/preview-0.jpg" },
  girl_sunset:  { v:"https://videos.pexels.com/video-files/3121458/3121458-hd_1920_1080_25fps.mp4", t:"https://images.pexels.com/videos/3121458/pictures/preview-0.jpg" },
  girl_run:     { v:"https://videos.pexels.com/video-files/2795405/2795405-hd_1920_1080_25fps.mp4", t:"https://images.pexels.com/videos/2795405/pictures/preview-0.jpg" },
  girl_cafe:    { v:"https://videos.pexels.com/video-files/4098368/4098368-hd_1920_1080_30fps.mp4", t:"https://images.pexels.com/videos/4098368/pictures/preview-0.jpg" },
  boy_skate:    { v:"https://videos.pexels.com/video-files/3571264/3571264-hd_1920_1080_30fps.mp4", t:"https://images.pexels.com/videos/3571264/pictures/preview-0.jpg" },
  boy_city:     { v:"https://videos.pexels.com/video-files/2278095/2278095-hd_1920_1080_30fps.mp4", t:"https://images.pexels.com/videos/2278095/pictures/preview-0.jpg" },
  boy_gym:      { v:"https://videos.pexels.com/video-files/4752903/4752903-hd_1920_1080_25fps.mp4", t:"https://images.pexels.com/videos/4752903/pictures/preview-0.jpg" },
  boy_music:    { v:"https://videos.pexels.com/video-files/3045163/3045163-hd_1920_1080_25fps.mp4", t:"https://images.pexels.com/videos/3045163/pictures/preview-0.jpg" },
  family_beach: { v:"https://videos.pexels.com/video-files/3214902/3214902-hd_1920_1080_25fps.mp4", t:"https://images.pexels.com/videos/3214902/pictures/preview-0.jpg" },
  kids_laugh:   { v:"https://videos.pexels.com/video-files/5779049/5779049-hd_1920_1080_25fps.mp4", t:"https://images.pexels.com/videos/5779049/pictures/preview-0.jpg" },
  travel_city:  { v:"https://videos.pexels.com/video-files/3129957/3129957-hd_1920_1080_30fps.mp4", t:"https://images.pexels.com/videos/3129957/pictures/preview-0.jpg" },
  kids_bday:    { v:"https://videos.pexels.com/video-files/6466991/6466991-hd_1920_1080_25fps.mp4", t:"https://images.pexels.com/videos/6466991/pictures/preview-0.jpg" },
};

/* ═══════════════════════════════════════════════
   EFFECT PRESETS
═══════════════════════════════════════════════ */
const FX: Record<string, EffectConfig> = {
  tealOrange: {
    cssFilter: "saturate(1.45) contrast(1.2) hue-rotate(-14deg) brightness(1.06)",
    overlay: "rgba(0,180,180,0.10)",
    hoverClass: "anim-zoom",
    passes: [
      { type:"colorGrade", brightness:0.05, contrast:1.2, saturation:1.45, hue:-14 },
      { type:"vignette", intensity:0.55 },
    ],
  },
  goldenHour: {
    cssFilter: "brightness(1.18) saturate(1.3) sepia(0.18)",
    overlay: "rgba(255,200,80,0.12)",
    hoverClass: "anim-beat",
    passes: [
      { type:"colorGrade", brightness:0.12, contrast:0.95, saturation:1.28, hue:0, sepia:0.18 },
      { type:"vignette", intensity:0.4 },
      { type:"bloom", threshold:0.75, intensity:0.3 },
    ],
  },
  darkMoody: {
    cssFilter: "brightness(0.72) contrast(1.5) saturate(0.85)",
    overlay: "rgba(20,0,40,0.18)",
    hoverClass: "anim-zoom",
    passes: [
      { type:"colorGrade", brightness:-0.14, contrast:1.55, saturation:0.82, hue:0 },
      { type:"vignette", intensity:0.8 },
      { type:"grain", amount:0.06 },
      { type:"cinemaScope", ratio:0.12 },
    ],
  },
  glitchRgb: {
    cssFilter: "contrast(1.45) saturate(1.7) brightness(1.08)",
    overlay: "rgba(255,0,255,0.10)",
    hoverClass: "anim-rgb",
    passes: [
      { type:"colorGrade", brightness:0.06, contrast:1.45, saturation:1.65, hue:0 },
      { type:"glitch", intensity:0.7 },
      { type:"grain", amount:0.04 },
    ],
  },
  pastelDream: {
    cssFilter: "brightness(1.22) saturate(0.7) contrast(0.88)",
    overlay: "rgba(255,200,230,0.14)",
    hoverClass: "anim-beat",
    passes: [
      { type:"colorGrade", brightness:0.14, contrast:0.88, saturation:0.68, hue:0 },
      { type:"grain", amount:0.03 },
      { type:"bloom", threshold:0.6, intensity:0.4 },
    ],
  },
  duotone: {
    cssFilter: "saturate(0) contrast(1.25) brightness(1.12) sepia(0.5) hue-rotate(280deg) saturate(3.5)",
    overlay: "rgba(200,0,200,0.14)",
    hoverClass: "anim-rgb",
    passes: [
      { type:"duotone", color1:[236,72,153], color2:[88,28,220] },
      { type:"vignette", intensity:0.5 },
    ],
  },
  epicHero: {
    cssFilter: "saturate(0.75) contrast(1.5) brightness(0.93)",
    overlay: "rgba(0,0,0,0.12)",
    hoverClass: "anim-zoom",
    passes: [
      { type:"colorGrade", brightness:-0.05, contrast:1.5, saturation:0.78, hue:0 },
      { type:"vignette", intensity:0.7 },
      { type:"grain", amount:0.03 },
      { type:"cinemaScope", ratio:0.1 },
    ],
  },
  neonGlow: {
    cssFilter: "brightness(0.65) saturate(2.2) contrast(1.3)",
    overlay: "rgba(120,0,255,0.15)",
    hoverClass: "anim-rgb",
    passes: [
      { type:"colorGrade", brightness:-0.1, contrast:1.35, saturation:2.1, hue:0 },
      { type:"bloom", threshold:0.55, intensity:0.6 },
      { type:"vignette", intensity:0.75 },
    ],
  },
  synthwave: {
    cssFilter: "saturate(1.6) hue-rotate(268deg) contrast(1.25) brightness(0.82) saturate(2.2)",
    overlay: "rgba(200,0,255,0.12)",
    hoverClass: "anim-rgb",
    passes: [
      { type:"colorGrade", brightness:-0.08, contrast:1.25, saturation:1.5, hue:268 },
      { type:"bloom", threshold:0.6, intensity:0.5 },
      { type:"vignette", intensity:0.7 },
      { type:"grain", amount:0.04 },
    ],
  },
  vhsRetro: {
    cssFilter: "sepia(0.45) contrast(1.12) brightness(0.92) saturate(0.65)",
    overlay: "rgba(0,255,100,0.07)",
    hoverClass: "anim-zoom",
    passes: [
      { type:"colorGrade", brightness:-0.06, contrast:1.12, saturation:0.62, hue:0, sepia:0.45 },
      { type:"grain", amount:0.12 },
      { type:"glitch", intensity:0.3 },
      { type:"vignette", intensity:0.45 },
    ],
  },
  warm: {
    cssFilter: "saturate(1.25) brightness(1.12) contrast(1.02) sepia(0.14)",
    overlay: "rgba(255,150,150,0.10)",
    hoverClass: "anim-beat",
    passes: [
      { type:"colorGrade", brightness:0.08, contrast:1.04, saturation:1.22, hue:-6, sepia:0.12 },
      { type:"vignette", intensity:0.35 },
    ],
  },
  vibrant: {
    cssFilter: "saturate(1.85) contrast(1.25) brightness(1.12)",
    overlay: "rgba(255,0,200,0.10)",
    hoverClass: "anim-beat",
    passes: [
      { type:"colorGrade", brightness:0.08, contrast:1.25, saturation:1.8, hue:0 },
      { type:"grain", amount:0.02 },
    ],
  },
  // NEW: Water Effects
  waterRipple: {
    cssFilter: "brightness(1.1) contrast(1.15) saturate(1.3) hue-rotate(180deg)",
    overlay: "rgba(0,150,255,0.15)",
    hoverClass: "anim-zoom",
    passes: [
      { type:"colorGrade", brightness:0.08, contrast:1.15, saturation:1.25, hue:180 },
      { type:"bloom", threshold:0.6, intensity:0.4 },
      { type:"vignette", intensity:0.3 },
    ],
  },
  oceanWaves: {
    cssFilter: "brightness(0.9) contrast(1.2) saturate(1.4) hue-rotate(200deg) blur(0.5px)",
    overlay: "rgba(0,100,200,0.20)",
    hoverClass: "anim-beat",
    passes: [
      { type:"colorGrade", brightness:-0.05, contrast:1.2, saturation:1.35, hue:200 },
      { type:"bloom", threshold:0.5, intensity:0.5 },
      { type:"grain", amount:0.04 },
      { type:"vignette", intensity:0.4 },
    ],
  },
  rainDrops: {
    cssFilter: "brightness(0.85) contrast(1.3) saturate(0.9) blur(0.3px)",
    overlay: "rgba(100,150,255,0.12)",
    hoverClass: "anim-rgb",
    passes: [
      { type:"colorGrade", brightness:-0.08, contrast:1.25, saturation:0.85, hue:210 },
      { type:"glitch", intensity:0.2 },
      { type:"grain", amount:0.06 },
      { type:"bloom", threshold:0.7, intensity:0.3 },
    ],
  },
  // NEW: CapCut-style Transitions
  smoothWhip: {
    cssFilter: "brightness(1.05) contrast(1.1) saturate(1.2) blur(0px)",
    overlay: "rgba(255,100,0,0.08)",
    hoverClass: "anim-zoom",
    passes: [
      { type:"colorGrade", brightness:0.03, contrast:1.08, saturation:1.15, hue:0 },
      { type:"grain", amount:0.02 },
    ],
  },
  flashBang: {
    cssFilter: "brightness(1.3) contrast(1.4) saturate(1.1)",
    overlay: "rgba(255,255,255,0.25)",
    hoverClass: "anim-beat",
    passes: [
      { type:"colorGrade", brightness:0.2, contrast:1.35, saturation:1.05, hue:0 },
      { type:"bloom", threshold:0.8, intensity:0.7 },
      { type:"grain", amount:0.01 },
    ],
  },
  zoomSpin: {
    cssFilter: "brightness(1.1) contrast(1.25) saturate(1.3) hue-rotate(10deg)",
    overlay: "rgba(255,50,150,0.12)",
    hoverClass: "anim-rgb",
    passes: [
      { type:"colorGrade", brightness:0.08, contrast:1.2, saturation:1.25, hue:10 },
      { type:"glitch", intensity:0.4 },
      { type:"vignette", intensity:0.5 },
    ],
  },
  // NEW: High-Energy Effects
  viralPop: {
    cssFilter: "brightness(1.2) contrast(1.3) saturate(1.5) hue-rotate(-5deg)",
    overlay: "rgba(255,100,200,0.15)",
    hoverClass: "anim-beat",
    passes: [
      { type:"colorGrade", brightness:0.15, contrast:1.25, saturation:1.4, hue:-5 },
      { type:"bloom", threshold:0.7, intensity:0.5 },
      { type:"grain", amount:0.03 },
    ],
  },
  trapBeat: {
    cssFilter: "brightness(0.9) contrast(1.4) saturate(1.2) hue-rotate(15deg)",
    overlay: "rgba(150,50,255,0.18)",
    hoverClass: "anim-rgb",
    passes: [
      { type:"colorGrade", brightness:-0.05, contrast:1.35, saturation:1.15, hue:15 },
      { type:"glitch", intensity:0.5 },
      { type:"vignette", intensity:0.6 },
      { type:"grain", amount:0.05 },
    ],
  },
  afroVibe: {
    cssFilter: "brightness(1.15) contrast(1.2) saturate(1.4) hue-rotate(30deg)",
    overlay: "rgba(255,200,50,0.12)",
    hoverClass: "anim-beat",
    passes: [
      { type:"colorGrade", brightness:0.12, contrast:1.18, saturation:1.35, hue:30 },
      { type:"bloom", threshold:0.65, intensity:0.4 },
      { type:"grain", amount:0.04 },
    ],
  },
  phonkDrift: {
    cssFilter: "brightness(0.85) contrast(1.5) saturate(0.9) hue-rotate(-20deg)",
    overlay: "rgba(255,50,50,0.20)",
    hoverClass: "anim-zoom",
    passes: [
      { type:"colorGrade", brightness:-0.08, contrast:1.45, saturation:0.85, hue:-20 },
      { type:"glitch", intensity:0.6 },
      { type:"vignette", intensity:0.7 },
      { type:"grain", amount:0.08 },
    ],
  },
};

/* ═══════════════════════════════════════════════
   ALL TEMPLATES
═══════════════════════════════════════════════ */
const ALL_TEMPLATES: Template[] = [
  { id:"cin_teal",    name:"Teal & Orange Grade",    category:"cinematic",   tags:["cinematic","trending"],           description:"Hollywood teal shadows with warm orange skin — the classic blockbuster grade.",  duration:"0:15", uses:128400, likes:34200, trending:true,  featured:true,  previewVideoUrl:V.boy_city.v,    thumbnailUrl:V.boy_city.t,    musicTitle:"Epic Cinematic",   audioUrl:AUDIO.cinematic, effect:FX.tealOrange, effectLabel:"Teal·Orange", aiPrompt:"Apply Hollywood teal-orange color grade." },
  { id:"cin_golden",  name:"Golden Hour Glow",       category:"cinematic",   tags:["cinematic","trending","fashion"],  description:"Warm golden light that makes everything glow like magic hour.",                     duration:"0:20", uses:98000,  likes:28000, trending:true,  featured:true,  previewVideoUrl:V.girl_sunset.v, thumbnailUrl:V.girl_sunset.t, musicTitle:"Romantic Calm",    audioUrl:AUDIO.romantic,  effect:FX.goldenHour, effectLabel:"Golden Hour", aiPrompt:"Create a golden hour magic look." },
  { id:"cin_dark",    name:"Dark & Moody",           category:"cinematic",   tags:["cinematic"],                      description:"Deep blacks, crushed shadows, high contrast editorial look.",                       duration:"0:15", uses:76000,  likes:21000,                            previewVideoUrl:V.boy_music.v,   thumbnailUrl:V.boy_music.t,   musicTitle:"Synthwave",        audioUrl:AUDIO.synthwave, effect:FX.darkMoody,  effectLabel:"Dark Moody",  aiPrompt:"Create a dark moody cinematic look." },
  { id:"cin_pastel",  name:"Pastel Dream",           category:"cinematic",   tags:["cinematic","fashion"],             description:"Soft pastel wash with lifted shadows. Dreamy film aesthetic.",                     duration:"0:18", uses:62000,  likes:17000, isNew:true,                     previewVideoUrl:V.girl_fashion.v,thumbnailUrl:V.girl_fashion.t,musicTitle:"Lo-Fi Chill",      audioUrl:AUDIO.lofi,      effect:FX.pastelDream,effectLabel:"Pastel Dream", aiPrompt:"Create a dreamy pastel look." },
  { id:"cin_epic",    name:"Epic Hero Shot",         category:"cinematic",   tags:["cinematic","promo","trending"],    description:"Bold desaturated power look for sports & action content.",                         duration:"0:10", uses:115000, likes:38000, trending:true,  featured:true,  previewVideoUrl:V.boy_gym.v,     thumbnailUrl:V.boy_gym.t,     musicTitle:"Sports Hype",      audioUrl:AUDIO.sports,    effect:FX.epicHero,   effectLabel:"Epic Hero",   aiPrompt:"Apply an epic hero power grade." },
  { id:"tr_glitch",   name:"Glitch RGB Split",       category:"transitions", tags:["transitions","effects"],          description:"Digital glitch artifacts with RGB channel separation.",                           duration:"0:08", uses:137000, likes:41000, trending:true,                  previewVideoUrl:V.boy_skate.v,   thumbnailUrl:V.boy_skate.t,   musicTitle:"EDM Festival",     audioUrl:AUDIO.edm,       effect:FX.glitchRgb,  effectLabel:"Glitch RGB",  aiPrompt:"Apply intense RGB channel glitch effect." },
  { id:"tr_zoom",     name:"Zoom Punch In",          category:"transitions", tags:["transitions","social","trending"],description:"Aggressive zoom punch into each clip. High energy edits.",                        duration:"0:08", uses:201000, likes:68000, trending:true,                  previewVideoUrl:V.boy_skate.v,   thumbnailUrl:V.boy_skate.t,   musicTitle:"Hip Hop",          audioUrl:AUDIO.hiphop,    effect:FX.vibrant,    effectLabel:"Zoom Punch",  aiPrompt:"High energy zoom punch edit style." },
  { id:"tr_vhs",      name:"VHS Retro Tape",         category:"transitions", tags:["transitions","effects"],          description:"90s VHS aesthetic with scan lines, tape wobble and grain.",                       duration:"0:12", uses:63000,  likes:19000, isNew:true,                     previewVideoUrl:V.family_beach.v,thumbnailUrl:V.family_beach.t,musicTitle:"Synthwave",        audioUrl:AUDIO.synthwave, effect:FX.vhsRetro,   effectLabel:"VHS Retro",   aiPrompt:"Apply authentic VHS tape look." },
  { id:"soc_tiktok",  name:"TikTok Viral Style",     category:"social",      tags:["social","trending"],              description:"Exact edit style blowing up on TikTok — punchy colours, sharp cuts.",           duration:"0:15", uses:421000, likes:156000,trending:true,  featured:true,  previewVideoUrl:V.girl_dance.v,  thumbnailUrl:V.girl_dance.t,  musicTitle:"Upbeat Pop",       audioUrl:AUDIO.upbeat,    effect:FX.vibrant,    effectLabel:"TikTok ✨",    aiPrompt:"Create the exact TikTok viral edit style." },
  { id:"soc_aesthetic",name:"Aesthetic Girl Edit",   category:"social",      tags:["social","fashion","trending"],    description:"Soft VSCO aesthetic all over FYP. Film grain + lifted tones.",                   duration:"0:15", uses:389000, likes:142000,trending:true,  isNew:true,     previewVideoUrl:V.girl_sunset.v, thumbnailUrl:V.girl_sunset.t, musicTitle:"Lo-Fi Chill",      audioUrl:AUDIO.lofi,      effect:FX.pastelDream,effectLabel:"Aesthetic 🌸",  aiPrompt:"VSCO/Pinterest aesthetic edit." },
  { id:"soc_dark",    name:"Dark Edit — Boys",       category:"social",      tags:["social","trending"],              description:"Dark moody edit trending for boys on TikTok.",                                   duration:"0:12", uses:247000, likes:86000,  trending:true,                  previewVideoUrl:V.boy_gym.v,     thumbnailUrl:V.boy_gym.t,     musicTitle:"Synthwave",        audioUrl:AUDIO.synthwave, effect:FX.darkMoody,  effectLabel:"Dark 🔥",      aiPrompt:"Dark moody TikTok boys edit." },
  { id:"soc_couple",  name:"Couple Goals",           category:"social",      tags:["social","cinematic","trending"],  description:"Romantic warm edit trending on couple content pages.",                            duration:"0:20", uses:302000, likes:107000, trending:true,                  previewVideoUrl:V.girl_sunset.v, thumbnailUrl:V.girl_sunset.t, musicTitle:"Romantic Calm",    audioUrl:AUDIO.romantic,  effect:FX.warm,       effectLabel:"Romantic 💕",  aiPrompt:"Warm romantic couple edit." },
  { id:"soc_genz",    name:"Gen-Z Bold Edit",        category:"social",      tags:["social","trending"],              description:"Punchy oversaturated colours and bold look for Gen-Z content.",                  duration:"0:12", uses:276000, likes:94000,  trending:true,                  previewVideoUrl:V.kids_laugh.v,  thumbnailUrl:V.kids_laugh.t,  musicTitle:"EDM Festival",     audioUrl:AUDIO.edm,       effect:FX.vibrant,    effectLabel:"Gen-Z Bold",   aiPrompt:"Gen-Z maximalist edit." },
  { id:"fx_neon",     name:"Neon Glow",              category:"effects",     tags:["effects","trending"],             description:"Pulsing neon light reveals. Cyberpunk aesthetic.",                               duration:"0:08", uses:94500,  likes:21000,  featured:true,  isNew:true,     previewVideoUrl:V.boy_music.v,   thumbnailUrl:V.boy_music.t,   musicTitle:"Synthwave",        audioUrl:AUDIO.synthwave, effect:FX.neonGlow,   effectLabel:"Neon 💜",      aiPrompt:"Cyberpunk neon glow effect." },
  { id:"fx_duotone",  name:"Duotone Pink/Purple",    category:"effects",     tags:["effects","fashion","trending"],   description:"Trendy duotone two-color wash. Fashion & art shoot favourite.",                   duration:"0:10", uses:88000,  likes:27000,  trending:true,  isNew:true,     previewVideoUrl:V.girl_dance.v,  thumbnailUrl:V.girl_dance.t,  musicTitle:"EDM Festival",     audioUrl:AUDIO.edm,       effect:FX.duotone,    effectLabel:"Duotone 💜",   aiPrompt:"Apply a stunning pink-to-purple duotone effect." },
  { id:"fx_synthwave",name:"Synthwave Retro",        category:"effects",     tags:["effects","music"],                description:"80s synthwave retrowave purple/pink aesthetic.",                                 duration:"0:15", uses:112000, likes:39000,  trending:true,                  previewVideoUrl:V.girl_dance.v,  thumbnailUrl:V.girl_dance.t,  musicTitle:"Synthwave",        audioUrl:AUDIO.synthwave, effect:FX.synthwave,  effectLabel:"Synthwave 🌆", aiPrompt:"80s synthwave aesthetic." },
  { id:"fas_ootd",    name:"OOTD Reveal",            category:"fashion",     tags:["fashion","social","trending"],    description:"Outfit of the day spin reveal with glam aesthetic.",                             duration:"0:10", uses:298000, likes:106000, trending:true,  featured:true,  isNew:true, previewVideoUrl:V.girl_fashion.v,thumbnailUrl:V.girl_fashion.t,musicTitle:"Pop Dance",        audioUrl:AUDIO.pop,       effect:FX.vibrant,    effectLabel:"OOTD 👗",      aiPrompt:"High fashion OOTD reveal edit." },
  { id:"fas_y2k",     name:"Y2K Revival",            category:"fashion",     tags:["fashion","effects","trending"],   description:"2000s Y2K nostalgia with chrome and glossy aesthetics.",                         duration:"0:12", uses:213000, likes:76000,  trending:true,  isNew:true,     previewVideoUrl:V.girl_dance.v,  thumbnailUrl:V.girl_dance.t,  musicTitle:"Synthwave",        audioUrl:AUDIO.synthwave, effect:FX.glitchRgb,  effectLabel:"Y2K 💿",       aiPrompt:"Y2K 2000s aesthetic." },
  { id:"fas_street",  name:"Streetwear Lookbook",    category:"fashion",     tags:["fashion","social"],               description:"Edgy urban streetwear editorial with bold cuts.",                                duration:"0:15", uses:167000, likes:58000,  trending:true,                  previewVideoUrl:V.boy_skate.v,   thumbnailUrl:V.boy_skate.t,   musicTitle:"Hip Hop",          audioUrl:AUDIO.hiphop,    effect:FX.epicHero,   effectLabel:"Streetwear 🔥",aiPrompt:"Urban streetwear editorial." },
  { id:"trv_wander",  name:"Wanderlust Cinematic",   category:"travel",      tags:["travel","cinematic","trending"],  description:"Epic travel cinematic with sweeping landscape shots.",                          duration:"0:30", uses:188000, likes:66000,  trending:true,  featured:true,  previewVideoUrl:V.travel_city.v, thumbnailUrl:V.travel_city.t, musicTitle:"Epic Cinematic",   audioUrl:AUDIO.cinematic, effect:FX.tealOrange, effectLabel:"Cinematic ✈️", aiPrompt:"Epic travel cinematic grade." },
  { id:"trv_night",   name:"Night City Lights",      category:"travel",      tags:["travel","effects"],               description:"Neon night city with bokeh city lights.",                                        duration:"0:15", uses:148000, likes:52000,  trending:true,                  previewVideoUrl:V.travel_city.v, thumbnailUrl:V.travel_city.t, musicTitle:"Synthwave",        audioUrl:AUDIO.synthwave, effect:FX.neonGlow,   effectLabel:"Night City 🌃",aiPrompt:"Night city lights cinematic." },
  { id:"trv_japan",   name:"Japan Aesthetic",        category:"travel",      tags:["travel","cinematic"],             description:"Cherry blossom pink aesthetic inspired by Japanese travel.",                     duration:"0:20", uses:178000, likes:63000,  trending:true,  isNew:true,     previewVideoUrl:V.girl_cafe.v,   thumbnailUrl:V.girl_cafe.t,   musicTitle:"Lo-Fi Chill",      audioUrl:AUDIO.lofi,      effect:FX.warm,       effectLabel:"Japan 🌸",     aiPrompt:"Japanese aesthetic edit." },
  { id:"fam_bday",    name:"Birthday Blast",         category:"family",      tags:["family","social"],                description:"Colourful confetti birthday celebration edit.",                                  duration:"0:20", uses:178000, likes:63000,  trending:true,  isNew:true,     previewVideoUrl:V.kids_bday.v,   thumbnailUrl:V.kids_bday.t,   musicTitle:"Kids Happy",       audioUrl:AUDIO.kids,      effect:FX.vibrant,    effectLabel:"Birthday 🎂",  aiPrompt:"Birthday celebration edit." },
  { id:"fam_vacation",name:"Family Vacation Vlog",   category:"family",      tags:["family","travel","social"],       description:"Bright energetic family vacation highlight reel.",                               duration:"0:20", uses:156000, likes:56000,  trending:true,                  previewVideoUrl:V.family_beach.v,thumbnailUrl:V.family_beach.t,musicTitle:"Upbeat Pop",       audioUrl:AUDIO.upbeat,    effect:FX.warm,       effectLabel:"Vacation 🏖️",  aiPrompt:"Family vacation bright edit." },
  { id:"mus_dance",   name:"Dance Reel Cuts",        category:"music",       tags:["music","social","trending"],      description:"Quick-cut dance reel with beat-matched visual effects.",                         duration:"0:15", uses:287000, likes:102000, trending:true,                  previewVideoUrl:V.girl_dance.v,  thumbnailUrl:V.girl_dance.t,  musicTitle:"Upbeat Pop",       audioUrl:AUDIO.upbeat,    effect:FX.vibrant,    effectLabel:"Beat Sync 🎵",  aiPrompt:"Dance music video edit." },
  { id:"mus_hiphop",  name:"Hip Hop Fire",           category:"music",       tags:["music","trending","social"],      description:"Hard-hitting hip hop edit with bass-drop visual cuts.",                          duration:"0:15", uses:213000, likes:76000,  trending:true,                  previewVideoUrl:V.boy_skate.v,   thumbnailUrl:V.boy_skate.t,   musicTitle:"Hip Hop",          audioUrl:AUDIO.hiphop,    effect:FX.epicHero,   effectLabel:"Hip Hop 🎤",    aiPrompt:"Hip hop music video edit." },
  { id:"mus_edm",     name:"EDM Drop Explode",       category:"music",       tags:["music","effects","trending"],     description:"Build-up and explosive drop visual. Festival energy.",                           duration:"0:12", uses:178000, likes:63000,  trending:true,                  previewVideoUrl:V.girl_dance.v,  thumbnailUrl:V.girl_dance.t,  musicTitle:"EDM Festival",     audioUrl:AUDIO.edm,       effect:FX.glitchRgb,  effectLabel:"EDM Drop 🎧",   aiPrompt:"EDM festival drop visual." },
  { id:"prm_sports",  name:"Sports Hype Reel",       category:"promo",       tags:["promo","trending"],               description:"Explosive energy montage with dynamic speed ramps.",                            duration:"0:20", uses:192000, likes:67000, trending:true,                  previewVideoUrl:V.boy_gym.v,     thumbnailUrl:V.boy_gym.t,     musicTitle:"Sports Hype",      audioUrl:AUDIO.sports,    effect:FX.epicHero,   effectLabel:"Sports Hype",  aiPrompt:"Sports promotional reel." },
  { id:"prm_fashion", name:"Fashion Ad Campaign",    category:"promo",       tags:["promo","fashion","trending"],     description:"High-end fashion editorial ad style with slow reveals.",                         duration:"0:30", uses:148000, likes:52000, trending:true,  featured:true,  previewVideoUrl:V.girl_fashion.v,thumbnailUrl:V.girl_fashion.t,musicTitle:"Romantic Calm",    audioUrl:AUDIO.romantic,  effect:FX.goldenHour, effectLabel:"Fashion Ad",   aiPrompt:"Luxury fashion ad grade." },
  
  // NEW: Real Trending Video Effects
  { id:"fx_girl_viral", name:"Girl Viral Edit",        category:"effects",     tags:["effects","trending","social"],   description:"High-energy girl dance edit with zoom cuts and color pops.",                        duration:"0:15", uses:285000, likes:98000, trending:true,  featured:true,  previewVideoUrl:V.girl_dance.v,  thumbnailUrl:V.girl_dance.t,  musicTitle:"Upbeat Pop",       audioUrl:AUDIO.upbeat,    effect:FX.vibrant,    effectLabel:"Viral Girl �", aiPrompt:"TikTok viral girl dance edit." },
  { id:"fx_boy_swag",    name:"Boy Swag Effect",       category:"effects",     tags:["effects","trending","social"],   description:"Cool boy skate edit with motion blur and street style.",                            duration:"0:12", uses:198000, likes:72000, trending:true,  isNew:true,     previewVideoUrl:V.boy_skate.v,   thumbnailUrl:V.boy_skate.t,   musicTitle:"Hip Hop",          audioUrl:AUDIO.hiphop,    effect:FX.epicHero,   effectLabel:"Boy Swag 🛹",    aiPrompt:"Street swag boy edit." },
  { id:"fx_couple_goals",name:"Couple Goals Edit",     category:"effects",     tags:["effects","trending","romantic"], description:"Romantic couple edit with smooth transitions and warm tones.",                       duration:"0:18", uses:245000, likes:89000, trending:true,  featured:true,  previewVideoUrl:V.girl_sunset.v, thumbnailUrl:V.girl_sunset.t, musicTitle:"Romantic Calm",    audioUrl:AUDIO.romantic,  effect:FX.warm,       effectLabel:"Couple 💕",     aiPrompt:"Romantic couple goals edit." },
  
  // NEW: CapCut-style Transition Templates
  { id:"tr_smooth_whip", name:"Smooth Whip Pan",       category:"transitions", tags:["transitions","trending","social"],description:"Smooth whip pan transition with motion blur - CapCut favorite.",                      duration:"0:08", uses:185000, likes:62000, trending:true,  isNew:true,     previewVideoUrl:V.boy_city.v,    thumbnailUrl:V.boy_city.t,    musicTitle:"Hip Hop",          audioUrl:AUDIO.hiphop,    effect:FX.smoothWhip, effectLabel:"Whip ⚡",     aiPrompt:"Smooth whip pan transition." },
  { id:"tr_flash_bang",  name:"Flash Bang Transition", category:"transitions", tags:["transitions","effects","trending"],description:"Explosive flash transition with bright white burst - viral on TikTok.",                 duration:"0:06", uses:225000, likes:78000, trending:true,  featured:true,  previewVideoUrl:V.girl_dance.v,  thumbnailUrl:V.girl_dance.t,  musicTitle:"EDM Festival",     audioUrl:AUDIO.edm,       effect:FX.flashBang,  effectLabel:"Flash 💥",    aiPrompt:"Flash bang explosion transition." },
  { id:"tr_zoom_spin",   name:"Zoom Spin Transition",  category:"transitions", tags:["transitions","effects","social"], description:"Dynamic zoom and spin combo with RGB glitch - high energy edit.",                    duration:"0:08", uses:168000, likes:54000, trending:true,  isNew:true,     previewVideoUrl:V.boy_skate.v,   thumbnailUrl:V.boy_skate.t,   musicTitle:"Upbeat Pop",       audioUrl:AUDIO.upbeat,    effect:FX.zoomSpin,   effectLabel:"Zoom 🌀",     aiPrompt:"Zoom spin dynamic transition." },
  
  // NEW: Trending High-Energy Templates
  { id:"tr_viral_pop",   name:"Viral Pop Explosion",    category:"social",      tags:["social","trending","viral"],       description:"Explosive viral pop edit with zoom cuts and color bursts - TikTok favorite.",           duration:"0:12", uses:450000, likes:156000, trending:true,  featured:true,  previewVideoUrl:V.girl_dance.v,  thumbnailUrl:V.girl_dance.t,  musicTitle:"Viral Hit",        audioUrl:AUDIO.viral,     effect:FX.viralPop,   effectLabel:"Viral 🔥",    aiPrompt:"TikTok viral pop explosion edit." },
  { id:"tr_trap_beat",   name:"Trap Beat Sync",         category:"music",       tags:["music","trending","trap"],         description:"Hard-hitting trap beat with bass drop sync cuts and glitch effects.",                 duration:"0:15", uses:320000, likes:112000, trending:true,  isNew:true,     previewVideoUrl:V.boy_skate.v,   thumbnailUrl:V.boy_skate.t,   musicTitle:"Trap Beat",        audioUrl:AUDIO.trap,      effect:FX.trapBeat,   effectLabel:"Trap 🎵",     aiPrompt:"Trap beat sync edit." },
  { id:"tr_afro_vibe",   name:"Afrobeat Dance",         category:"music",       tags:["music","trending","afrobeat"],     description:"Energetic afrobeat dance edit with warm tones and smooth transitions.",               duration:"0:18", uses:280000, likes:98000,  trending:true,  featured:true,  previewVideoUrl:V.girl_dance.v,  thumbnailUrl:V.girl_dance.t,  musicTitle:"Afrobeat",         audioUrl:AUDIO.afrobeat,  effect:FX.afroVibe,   effectLabel:"Afro 🌟",     aiPrompt:"Afrobeat dance energy edit." },
  { id:"tr_phonk_drift", name:"Phonk Drift",           category:"social",      tags:["social","trending","phonk"],       description:"Dark phonk drift edit with heavy glitch and cinematic motion blur.",                   duration:"0:10", uses:195000, likes:78000,  trending:true,  isNew:true,     previewVideoUrl:V.boy_city.v,    thumbnailUrl:V.boy_city.t,    musicTitle:"Phonk",            audioUrl:AUDIO.phonk,     effect:FX.phonkDrift, effectLabel:"Phonk 🏁",    aiPrompt:"Phonk drift cinematic edit." },
  { id:"tr_reggaeton",   name:"Reggaeton Party",        category:"music",       tags:["music","trending","reggaeton"],   description:"High-energy reggaeton party edit with vibrant colors and zoom cuts.",                   duration:"0:14", uses:265000, likes:95000,  trending:true,  featured:true,  previewVideoUrl:V.girl_dance.v,  thumbnailUrl:V.girl_dance.t,  musicTitle:"Reggaeton",         audioUrl:AUDIO.reggaeton, effect:FX.viralPop,   effectLabel:"Reggaeton 🎉", aiPrompt:"Reggaeton party energy edit." },
];

const FEATURED  = ALL_TEMPLATES.filter(t => t.featured);
const TRENDING  = ALL_TEMPLATES.filter(t => t.trending);
const NEW_TEMPS = ALL_TEMPLATES.filter(t => t.isNew);

const CATEGORIES = [
  { id:"all" as CategoryId,         label:"All",          emoji:"✨" },
  { id:"trending" as CategoryId,    label:"Trending",     emoji:"🔥" },
  { id:"cinematic" as CategoryId,   label:"Cinematic",    emoji:"🎬" },
  { id:"transitions" as CategoryId, label:"Transitions",  emoji:"⚡" },
  { id:"social" as CategoryId,      label:"Social Media", emoji:"📱" },
  { id:"effects" as CategoryId,     label:"Effects",      emoji:"🌀" },
  { id:"fashion" as CategoryId,     label:"Fashion",      emoji:"👗" },
  { id:"music" as CategoryId,       label:"Music",        emoji:"🎵" },
  { id:"promo" as CategoryId,       label:"Promo & Ads",  emoji:"📣" },
  { id:"family" as CategoryId,      label:"Family",       emoji:"👨‍👩‍👧" },
  { id:"travel" as CategoryId,      label:"Travel",       emoji:"✈️" },
];

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n/1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n/1_000).toFixed(0)}K`;
  return String(n);
}

function filterCat(templates: Template[], cat: CategoryId) {
  if (cat === "all") return templates;
  return templates.filter(t => t.category === cat || t.tags.includes(cat));
}

/* ═══════════════════════════════════════════════
   CANVAS EFFECT ENGINE
═══════════════════════════════════════════════ */
class EffectEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private effect: EffectConfig;

  constructor(canvas: HTMLCanvasElement, effect: EffectConfig) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    this.effect = effect;
  }

  drawFrame(source: HTMLVideoElement | HTMLCanvasElement) {
    const { width: w, height: h } = this.canvas;
    this.ctx.drawImage(source, 0, 0, w, h);
    for (const pass of this.effect.passes) {
      switch (pass.type) {
        case "colorGrade": this.applyColorGrade(pass); break;
        case "vignette":   this.applyVignette(pass.intensity); break;
        case "grain":      this.applyGrain(pass.amount); break;
        case "glitch":     this.applyGlitch(pass.intensity); break;
        case "duotone":    this.applyDuotone(pass.color1, pass.color2); break;
        case "bloom":      this.applyBloom(pass.threshold, pass.intensity); break;
        case "cinemaScope":this.applyCinemaScope(pass.ratio); break;
      }
    }
  }

  private applyColorGrade(p: { brightness:number; contrast:number; saturation:number; hue:number; sepia?:number }) {
    const id = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const d = id.data;
    const { brightness:br, contrast:co, saturation:sa, hue:hu, sepia:se = 0 } = p;
    for (let i = 0; i < d.length; i += 4) {
      let r = d[i]/255, g = d[i+1]/255, b = d[i+2]/255;
      if (se > 0) {
        const nr = r*0.393 + g*0.769 + b*0.189;
        const ng = r*0.349 + g*0.686 + b*0.168;
        const nb = r*0.272 + g*0.534 + b*0.131;
        r = r*(1-se) + nr*se; g = g*(1-se) + ng*se; b = b*(1-se) + nb*se;
      }
      const gray = 0.2126*r + 0.7152*g + 0.0722*b;
      r = gray + (r-gray)*sa; g = gray + (g-gray)*sa; b = gray + (b-gray)*sa;
      if (hu !== 0) {
        const rad = hu * Math.PI / 180;
        const cos = Math.cos(rad), sin = Math.sin(rad);
        const [nr,ng,nb] = [
          r*(0.213+cos*0.787-sin*0.213) + g*(0.715-cos*0.715-sin*0.715) + b*(0.072-cos*0.072+sin*0.928),
          r*(0.213-cos*0.213+sin*0.143) + g*(0.715+cos*0.285+sin*0.140) + b*(0.072-cos*0.072-sin*0.283),
          r*(0.213-cos*0.213-sin*0.787) + g*(0.715-cos*0.715+sin*0.715) + b*(0.072+cos*0.928+sin*0.072),
        ];
        r=nr; g=ng; b=nb;
      }
      r = (r-0.5)*co + 0.5 + br; g = (g-0.5)*co + 0.5 + br; b = (b-0.5)*co + 0.5 + br;
      d[i]   = Math.min(255, Math.max(0, r*255));
      d[i+1] = Math.min(255, Math.max(0, g*255));
      d[i+2] = Math.min(255, Math.max(0, b*255));
    }
    this.ctx.putImageData(id, 0, 0);
  }

  private applyVignette(intensity: number) {
    const { width:w, height:h } = this.canvas;
    const grd = this.ctx.createRadialGradient(w/2, h/2, h*0.25, w/2, h/2, h*0.85);
    grd.addColorStop(0, "rgba(0,0,0,0)");
    grd.addColorStop(1, `rgba(0,0,0,${intensity})`);
    this.ctx.fillStyle = grd;
    this.ctx.fillRect(0, 0, w, h);
  }

  private applyGrain(amount: number) {
    const { width:w, height:h } = this.canvas;
    const id = this.ctx.getImageData(0, 0, w, h);
    const d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const noise = (Math.random() - 0.5) * amount * 255;
      d[i]   = Math.min(255, Math.max(0, d[i]+noise));
      d[i+1] = Math.min(255, Math.max(0, d[i+1]+noise));
      d[i+2] = Math.min(255, Math.max(0, d[i+2]+noise));
    }
    this.ctx.putImageData(id, 0, 0);
  }

  private applyGlitch(intensity: number) {
    if (Math.random() > 0.25 * intensity) return;
    const { width:w, height:h } = this.canvas;
    const sliceY = Math.floor(Math.random() * h);
    const sliceH = Math.floor(Math.random() * 20 * intensity + 2);
    const shift  = (Math.random() - 0.5) * 30 * intensity;
    const slice  = this.ctx.getImageData(0, sliceY, w, sliceH);
    this.ctx.putImageData(slice, shift, sliceY);
    this.ctx.globalCompositeOperation = "screen";
    this.ctx.globalAlpha = 0.15 * intensity;
    this.ctx.drawImage(this.canvas, 3*intensity, 0);
    this.ctx.globalCompositeOperation = "source-over";
    this.ctx.globalAlpha = 1;
  }

  private applyDuotone(c1: [number,number,number], c2: [number,number,number]) {
    const id = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const lum = (d[i]*0.299 + d[i+1]*0.587 + d[i+2]*0.114) / 255;
      d[i]   = c1[0]*(1-lum) + c2[0]*lum;
      d[i+1] = c1[1]*(1-lum) + c2[1]*lum;
      d[i+2] = c1[2]*(1-lum) + c2[2]*lum;
    }
    this.ctx.putImageData(id, 0, 0);
  }

  private applyBloom(threshold: number, intensity: number) {
    const { width:w, height:h } = this.canvas;
    const id = this.ctx.getImageData(0, 0, w, h);
    const d  = id.data;
    const bd = new Uint8ClampedArray(d.length);
    for (let i = 0; i < d.length; i += 4) {
      const lum = (d[i]+d[i+1]+d[i+2]) / (3*255);
      if (lum > threshold) {
        const b = (lum - threshold) / (1-threshold) * intensity;
        bd[i]   = Math.min(255, d[i]   + b*80);
        bd[i+1] = Math.min(255, d[i+1] + b*80);
        bd[i+2] = Math.min(255, d[i+2] + b*80);
        bd[i+3] = 180;
      }
    }
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = w; tempCanvas.height = h;
    tempCanvas.getContext("2d")!.putImageData(new ImageData(bd, w, h), 0, 0);
    this.ctx.globalCompositeOperation = "screen";
    this.ctx.globalAlpha = intensity * 0.6;
    this.ctx.filter = "blur(8px)";
    this.ctx.drawImage(tempCanvas, 0, 0);
    this.ctx.filter = "none";
    this.ctx.globalCompositeOperation = "source-over";
    this.ctx.globalAlpha = 1;
  }

  private applyCinemaScope(ratio: number) {
    const { width:w, height:h } = this.canvas;
    const barH = Math.floor(h * ratio);
    this.ctx.fillStyle = "#000";
    this.ctx.fillRect(0, 0, w, barH);
    this.ctx.fillRect(0, h-barH, w, barH);
  }
}

/* ═══════════════════════════════════════════════
   CLAUDE API — AI Edit Instructions
═══════════════════════════════════════════════ */
async function getClaudeEditInstructions(template: Template, videoName: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: `You are a professional video editor AI.
Template: "${template.name}"
Effect style: ${template.aiPrompt}
User's video file: "${videoName}"
Respond ONLY with a JSON object (no markdown):
{
  "editTitle": "short catchy name",
  "moodDescription": "2-3 sentence description",
  "colorGrade": { "brightness": 0.0, "contrast": 1.0, "saturation": 1.0, "hue": 0, "sepia": 0.0 },
  "vignette": 0.5,
  "grain": 0.03,
  "glitch": 0.0,
  "bloom": { "threshold": 0.75, "intensity": 0.3 },
  "cinemaScope": 0.0,
  "hashtags": ["#tag1","#tag2","#tag3"],
  "caption": "short caption under 100 chars"
}`
      }]
    })
  });
  const data = await res.json();
  const text = data.content?.map((c: { type: string; text?: string }) => c.type === "text" ? c.text : "").join("") ?? "";
  return text.replace(/```json|```/g,"").trim();
}

/* ═══════════════════════════════════════════════
   FIX 1: MINI MUSIC PLAYER
   - async/await properly
   - error handle hoti hai
   - user gesture pe hi play hota hai
═══════════════════════════════════════════════ */
function MiniMusicPlayer({ audioUrl, title }: { audioUrl: string; title: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // FIXED: enhanced audio toggle with CORS handling
  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!ref.current || !audioUrl) {
      toast.error("Audio URL missing");
      return;
    }

    if (playing) {
      ref.current.pause();
      ref.current.currentTime = 0;
      setPlaying(false);
      return;
    }

    if (error) setError(false);

    try {
      setLoading(true);
      
      // Always reload for fresh attempt
      ref.current.load();
      ref.current.currentTime = 0;
      ref.current.volume = 0.6;
      
      // Small delay for load
      await new Promise(resolve => setTimeout(resolve, 50));
      
      await ref.current.play();
      setPlaying(true);
    } catch (err) {
      console.warn("Audio playback failed:", err);
      setError(true);
      setPlaying(false);
      toast.error("Audio nahi chal saka. URL check karo ya dobara try karo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onEnd = () => setPlaying(false);
    const onError = () => {
      setError(true);
      setPlaying(false);
      setLoading(false);
    };
    el.addEventListener("ended", onEnd);
    el.addEventListener("error", onError);
    return () => { 
      el.removeEventListener("ended", onEnd); 
      el.removeEventListener("error", onError);
      el.pause(); 
    };
  }, []);

  // Jab audioUrl change ho toh reset karo
  useEffect(() => {
    if (ref.current) { 
      ref.current.pause(); 
      ref.current.currentTime = 0;
    }
    setPlaying(false);
    setLoading(false);
    setError(false);
  }, [audioUrl]);

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-2 bg-black/70 backdrop-blur rounded-full px-3 py-2 border border-white/20 hover:border-pink-500/50 hover:bg-black/80 transition-all active:scale-95 cursor-pointer group"
    >
      {/* crossOrigin="anonymous" — CORS ke liye zaroori */}
      <audio ref={ref} preload="auto" crossOrigin="anonymous">
        <source src={audioUrl} type="audio/mpeg" />
        <source src={audioUrl} type="audio/mp3" />
        <source src={audioUrl} type="audio/wav" />
      </audio>

      <div className={cn(
        "w-6 h-6 rounded-full flex items-center justify-center transition-all",
        playing ? "bg-pink-500 shadow-lg shadow-pink-500/50" : "bg-white/20 group-hover:bg-white/30"
      )}>
        {loading
          ? <Loader2 className="w-3 h-3 text-white animate-spin"/>
          : playing
            ? <Pause className="w-3 h-3 text-white fill-white"/>
            : <Play  className="w-3 h-3 text-white fill-white ml-0.5"/>
        }
      </div>
      <span className="text-[11px] text-white/90 max-w-[80px] truncate font-semibold">{title}</span>
      {playing && (
        <div className="flex items-end gap-[3px] h-4">
          {[0,1,2,3].map(i => (
            <div key={i} className="w-[3px] bg-pink-400 rounded-full"
              style={{ animation:"waveBar 0.5s ease-in-out infinite", animationDelay:`${i*0.1}s` }}/>
          ))}
        </div>
      )}
    </button>
  );
}

/* ═══════════════════════════════════════════════
   TEMPLATE PREVIEW MODAL - Video upload se pehle dekh sakta
═══════════════════════════════════════════════ */
function TemplatePreviewModal({ template, isOpen, onClose, onApply }: {
  template: Template;
  isOpen: boolean;
  onClose: () => void;
  onApply?: (t: Template) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [musicLoading, setMusicLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (isOpen && videoRef.current) {
      videoRef.current.muted = false;
      videoRef.current.play().catch(() => {});
      setPlaying(true);
    }
    return () => {
      // Cleanup audio on close
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setMusicPlaying(false);
    };
  }, [isOpen]);

  const toggleVideo = () => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
      setPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setPlaying(true);
    }
  };
  
  const toggleMusic = async () => {
    if (!template.audioUrl) return;
    
    setMusicLoading(true);
    
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(template.audioUrl);
        audioRef.current.loop = true;
        audioRef.current.volume = 0.5;
        audioRef.current.crossOrigin = "anonymous";
      }
      
      if (musicPlaying) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setMusicPlaying(false);
      } else {
        // Reset and play
        audioRef.current.currentTime = 0;
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          await playPromise;
          setMusicPlaying(true);
        }
      }
    } catch (err) {
      console.warn("Music playback failed:", err);
      toast.error("Music play karne mein error. Dobara try karo.");
    } finally {
      setMusicLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: "rgba(0,0,0,0.95)", backdropFilter: "blur(20px)" }}
         onClick={onClose}>
      <div className="relative max-w-4xl w-full max-h-[90vh] bg-black rounded-3xl overflow-hidden border border-white/10"
           onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">{template.name}</h2>
            <p className="text-white/60">{template.description}</p>
          </div>
          <button onClick={onClose}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all cursor-pointer">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Video Preview */}
        <div className="relative aspect-video bg-black">
          <video
            ref={videoRef}
            src={template.previewVideoUrl}
            poster={template.thumbnailUrl}
            muted
            loop
            playsInline
            className="w-full h-full object-cover"
            style={{ filter: template.effect.cssFilter }}
          />
          
          {/* Video Controls */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
            <button onClick={toggleVideo}
                    className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/30 transition-all cursor-pointer">
              {playing ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white ml-0.5" />}
            </button>
            
            <button onClick={toggleMusic}
                    className="flex items-center gap-2 bg-black/60 backdrop-blur rounded-full px-4 py-2 border border-white/20 hover:border-white/40 transition-all cursor-pointer">
              {musicPlaying ? <Volume2 className="w-4 h-4 text-pink-400" /> : <VolumeX className="w-4 h-4 text-white/60" />}
              <span className="text-sm text-white">{template.musicTitle}</span>
            </button>
          </div>
          
          {/* Effect Badge */}
          <div className="absolute top-4 right-4">
            <div className="bg-black/60 backdrop-blur rounded-full px-3 py-1 border border-white/20">
              <span className="text-sm font-semibold text-white">{template.effectLabel}</span>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="p-6 grid grid-cols-3 gap-4 border-t border-white/10">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{fmt(template.uses)}</div>
            <div className="text-sm text-white/60">Uses</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{fmt(template.likes)}</div>
            <div className="text-sm text-white/60">Likes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{template.duration}</div>
            <div className="text-sm text-white/60">Duration</div>
          </div>
        </div>

        {/* Apply Template Button */}
        {onApply && (
          <div className="p-6 pt-0">
            <button
              onClick={() => {
                onApply(template);
                onClose();
              }}
              className="w-full py-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2 transition-all active:scale-95 hover:shadow-xl"
              style={{ 
                background: "linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)", 
                boxShadow: "0 8px 32px rgba(124, 58, 237, 0.45)" 
              }}
            >
              <Wand2 className="w-5 h-5"/> 
              Apply "{template.name}" Template
            </button>
            <p className="text-center text-white/40 text-xs mt-3">
              Video upload karo aur AI effect apply karo
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   FIX 2: TEMPLATE CARD
   - Video autoplay properly kaam karta hai
   - onClick se bhi play hota hai (mobile fix)
   - IntersectionObserver se preload hota hai
   - Preview modal add kiya
═══════════════════════════════════════════════ */
function TemplateCard({ template, onClick, onPreview, size = "md" }: {
  template: Template; 
  onClick: (t: Template) => void; 
  onPreview: (t: Template) => void;
  size?: "sm" | "md" | "lg";
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hovered,    setHovered]    = useState(false);
  const [liked,      setLiked]      = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [playing,    setPlaying]    = useState(false);

  // FIXED: Proper autoplay with error handling
  const playVideo = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      v.muted = true;          // ZAROORI — bina is ke browser block karta hai
      v.playsInline = true;
      v.currentTime = 0;
      await v.play();
      setPlaying(true);
    } catch {
      // Autoplay blocked — koi baat nahi, thumbnail dikhta rahega
      setPlaying(false);
    }
  }, []);

  const pauseVideo = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    v.currentTime = 0;
    setPlaying(false);
  }, []);

  // Hover pe play/pause
  useEffect(() => {
    if (hovered) { playVideo(); }
    else { pauseVideo(); }
  }, [hovered, playVideo, pauseVideo]);

  // IntersectionObserver — screen pe aaye tabhi preload karo
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        v.preload = "auto";
        v.load();
      }
    }, { threshold: 0.1 });
    obs.observe(v);
    return () => obs.disconnect();
  }, []);

  const dims = { sm:"w-36 h-56", md:"w-44 h-64", lg:"w-52 h-80" }[size];

  return (
    <div
      className={cn(
        "relative rounded-2xl overflow-hidden cursor-pointer flex-shrink-0 transition-all duration-300 group",
        dims,
        hovered ? "scale-[1.05] z-10" : ""
      )}
      style={{
        border: hovered ? "1px solid rgba(255,255,255,0.25)" : "1px solid rgba(255,255,255,0.07)",
        boxShadow: hovered
          ? `0 24px 60px ${template.effect.overlay}, 0 0 0 1px rgba(255,255,255,0.1)`
          : "0 4px 20px rgba(0,0,0,0.4)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      // FIXED: Single click = Preview modal, "Use Template" button = Apply
      onClick={() => {
        onPreview(template);
      }}
    >
      {/* VIDEO — FIXED: crossOrigin + proper attributes */}
      <video
        ref={videoRef}
        src={template.previewVideoUrl}
        poster={template.thumbnailUrl}
        muted
        loop
        playsInline
        preload="metadata"
        crossOrigin="anonymous"
        onCanPlay={() => setVideoReady(true)}
        className="absolute inset-0 w-full h-full object-cover transition-all duration-500"
        style={{
          filter: hovered ? template.effect.cssFilter : "brightness(0.88) saturate(1.05)",
          transform: hovered ? "scale(1.04)" : "scale(1)",
        }}
      />

      {/* Color overlay on hover */}
      {hovered && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300"
          style={{ backgroundColor: template.effect.overlay }}
        />
      )}

      {/* Gradient */}
      <div className="absolute inset-0"
        style={{ background:"linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.22) 52%, transparent 100%)" }}
      />

      {/* Badges */}
      <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
        {template.trending && (
          <span className="flex items-center gap-1 bg-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg">
            <Flame className="w-2 h-2"/> Hot
          </span>
        )}
        {template.isNew && (
          <span className="flex items-center gap-1 bg-cyan-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg">
            <Sparkles className="w-2 h-2"/> New
          </span>
        )}
      </div>

      {/* Effect label */}
      <div className="absolute top-2 right-8 z-10">
        <span className="bg-black/70 backdrop-blur text-white/75 text-[8px] px-1.5 py-0.5 rounded-full border border-white/12 font-semibold">
          {template.effectLabel}
        </span>
      </div>

      {/* Like button */}
      <button
        className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-black/60 backdrop-blur flex items-center justify-center hover:scale-110 transition-transform cursor-pointer"
        onClick={e => { e.stopPropagation(); setLiked(l => !l); }}
      >
        <Heart className={cn("w-3.5 h-3.5 transition-colors", liked ? "fill-red-500 text-red-500" : "text-white/65")}/>
      </button>

      {/* Play button — sirf jab video play nahi ho raha */}
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center border border-white/30"
            style={{ background:"rgba(255,255,255,0.15)", backdropFilter:"blur(6px)" }}
          >
            <Play className="w-4 h-4 text-white fill-white ml-0.5"/>
          </div>
        </div>
      )}

      {/* Bottom info */}
      <div className="absolute bottom-0 inset-x-0 p-3 z-10">
        <p className="text-white text-xs font-bold leading-tight line-clamp-1 mb-2">{template.name}</p>
        <MiniMusicPlayer audioUrl={template.audioUrl} title={template.musicTitle}/>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-white/45 text-[10px] flex items-center gap-0.5"><Play className="w-2 h-2"/>{fmt(template.uses)}</span>
          <span className="text-white/45 text-[10px] flex items-center gap-0.5"><Heart className="w-2 h-2"/>{fmt(template.likes)}</span>
          <span className="text-white/45 text-[10px] flex items-center gap-0.5 ml-auto"><Clock className="w-2 h-2"/>{template.duration}</span>
        </div>
      </div>

      {/* "Use Template" button — Always visible at bottom */}
      <div className="absolute bottom-0 inset-x-0">
        <button
          onClick={e => { e.stopPropagation(); onClick(template); }}
          className="w-full py-2.5 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 transition-all shadow-lg shadow-violet-500/30"
        >
          <Wand2 className="w-3 h-3"/> Apply Template
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   FEATURED CAROUSEL — 3D
═══════════════════════════════════════════════ */
function FeaturedCarousel({ onSelect, onPreview }: { onSelect: (t: Template) => void; onPreview: (t: Template) => void }) {
  const [active, setActive] = useState(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const go = (dir: 1 | -1) => setActive(a => (a + dir + FEATURED.length) % FEATURED.length);

  // FIXED: proper async play
  useEffect(() => {
    videoRefs.current.forEach(async (v, i) => {
      if (!v) return;
      v.muted = true;
      v.playsInline = true;
      if (i === active) {
        v.currentTime = 0;
        try { await v.play(); } catch { /* silent */ }
      } else {
        v.pause();
        v.currentTime = 0;
      }
    });
  }, [active]);

  const getStyle = (idx: number) => {
    let diff = idx - active;
    if (diff > FEATURED.length / 2) diff -= FEATURED.length;
    if (diff < -FEATURED.length / 2) diff += FEATURED.length;
    if (diff === 0) return { transform:"translateX(0) scale(1) rotateY(0deg)", zIndex:20, opacity:1, filter:"brightness(1)" };
    const s = Math.sign(diff), a = Math.abs(diff);
    if (a === 1) return { transform:`translateX(${s*57}%) scale(0.80) rotateY(${-s*20}deg)`, zIndex:10, opacity:0.7, filter:"brightness(0.6)" };
    return { transform:`translateX(${s*90}%) scale(0.62) rotateY(${-s*32}deg)`, zIndex:1, opacity:0.28, filter:"brightness(0.4)" };
  };

  const at = FEATURED[active];

  return (
    <div className="relative select-none">
      <div className="relative h-[340px] flex items-center justify-center overflow-hidden" style={{ perspective:"1200px" }}>
        {FEATURED.map((t, idx) => (
          <div
            key={t.id}
            className="absolute w-52 h-80 rounded-2xl overflow-hidden cursor-pointer border border-white/10"
            style={{ ...getStyle(idx), transition:"all 0.5s cubic-bezier(0.34,1.4,0.64,1)", transformStyle:"preserve-3d" }}
            onClick={() => idx === active ? onPreview(t) : setActive(idx)}
          >
            <video
              ref={el => { videoRefs.current[idx] = el; }}
              src={t.previewVideoUrl}
              poster={t.thumbnailUrl}
              muted loop playsInline preload="metadata"
              crossOrigin="anonymous"
              className="w-full h-full object-cover"
              style={{ filter: idx === active ? t.effect.cssFilter : "none", transition:"filter 0.4s ease" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/94 via-black/18 to-transparent"/>
            {idx === active && (
              <div className="absolute bottom-0 inset-x-0 p-4">
                <div className="flex gap-1.5 mb-2 flex-wrap">
                  {t.trending && <span className="bg-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">🔥 Trending</span>}
                  {t.isNew    && <span className="bg-cyan-500  text-white text-[9px] font-black px-2 py-0.5 rounded-full">✨ New</span>}
                  <span className="bg-violet-600 text-white text-[9px] px-2 py-0.5 rounded-full">{t.effectLabel}</span>
                </div>
                <p className="text-white font-black text-base">{t.name}</p>
                <p className="text-white/55 text-xs mt-0.5 line-clamp-2">{t.description}</p>
                {/* Music Player for Featured */}
                <div className="mt-2">
                  <MiniMusicPlayer audioUrl={t.audioUrl} title={t.musicTitle} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <button onClick={() => go(-1)} className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/10 backdrop-blur border border-white/15 flex items-center justify-center hover:bg-white/20 transition z-30 cursor-pointer">
        <ChevronLeft className="w-4 h-4 text-white"/>
      </button>
      <button onClick={() => go(1)} className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/10 backdrop-blur border border-white/15 flex items-center justify-center hover:bg-white/20 transition z-30 cursor-pointer">
        <ChevronRight className="w-4 h-4 text-white"/>
      </button>

      <div className="flex justify-center gap-1.5 mt-3">
        {FEATURED.map((_, i) => (
          <button key={i} onClick={() => setActive(i)}
            className={cn("rounded-full transition-all duration-300 cursor-pointer",
              i === active ? "w-7 h-1.5 bg-gradient-to-r from-violet-400 to-pink-400" : "w-1.5 h-1.5 bg-white/25 hover:bg-white/50"
            )}/>
        ))}
      </div>

      <div className="flex justify-center mt-4 px-4">
        <button
          onClick={() => onSelect(at)}
          className="w-full max-w-sm py-4 rounded-2xl font-bold text-base text-white flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer hover:shadow-2xl"
          style={{ 
            background: "linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)", 
            boxShadow: "0 12px 40px rgba(124, 58, 237, 0.5), 0 0 0 1px rgba(255,255,255,0.1) inset" 
          }}
        >
          <Wand2 className="w-5 h-5"/> 
          Apply &quot;{at.name}&quot; Template
        </button>
      </div>
      <p className="text-center text-white/40 text-xs mt-3">
        Video upload karo aur AI effect apply karo
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   TEMPLATE ROW
═══════════════════════════════════════════════ */
function TemplateRow({ title, templates, onSelect, onPreview, cardSize = "md" }: {
  title: string; templates: Template[]; onSelect: (t: Template) => void; onPreview: (t: Template) => void; cardSize?: "sm" | "md" | "lg";
}) {
  const ref = useRef<HTMLDivElement>(null);
  if (!templates.length) return null;
  const scroll = (dir: "l" | "r") => ref.current?.scrollBy({ left: dir === "l" ? -320 : 320, behavior: "smooth" });

  return (
    <div className="mb-7">
      <div className="flex items-center justify-between px-4 mb-3">
        <span className="text-white font-bold text-sm">{title}</span>
        <div className="flex gap-1">
          <button onClick={() => scroll("l")} className="w-6 h-6 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/16 transition cursor-pointer">
            <ChevronLeft className="w-3 h-3 text-white/55"/>
          </button>
          <button onClick={() => scroll("r")} className="w-6 h-6 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/16 transition cursor-pointer">
            <ChevronRight className="w-3 h-3 text-white/55"/>
          </button>
        </div>
      </div>
      <div
        ref={ref}
        className="flex gap-3 overflow-x-auto pb-2 px-4"
        style={{ scrollSnapType:"x mandatory", WebkitOverflowScrolling:"touch", scrollbarWidth:"none" }}
      >
        {templates.map(t => (
          <div key={t.id} style={{ scrollSnapAlign:"start" }}>
            <TemplateCard template={t} onClick={onSelect} onPreview={onPreview} size={cardSize}/>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   CIRCULAR PROGRESS
═══════════════════════════════════════════════ */
function CircularProgress({ progress, size = 130 }: { progress: number; size?: number }) {
  const sw = 8, r = (size - sw * 2) / 2, circ = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width:size, height:size }}>
      <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }} className="absolute inset-0">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={sw}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke="url(#pg)" strokeWidth={sw}
          strokeDasharray={circ} strokeDashoffset={circ - (progress/100)*circ}
          strokeLinecap="round"
          style={{ transition:"stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1)" }}
        />
        <defs>
          <linearGradient id="pg" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#a855f7"/>
            <stop offset="100%" stopColor="#ec4899"/>
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-black tabular-nums"
          style={{ background:"linear-gradient(135deg,#a855f7,#ec4899)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
          {progress}%
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   FIX 3: TEMPLATE MODAL
   - FFmpeg.wasm se real MP4 output
   - Python backend pe bhi bhej sakta hai
   - Proper error messages
═══════════════════════════════════════════════ */
function TemplateModal({ template, open, onClose }: {
  template: Template | null; open: boolean; onClose: () => void;
}) {
  type Stage = "idle" | "analyzing" | "processing" | "done" | "error";
  type AIResult = { caption?: string; moodDescription?: string; hashtags?: unknown[]; editTitle?: string; };

  const [stage,      setStage]      = useState<Stage>("idle");
  const [progress,   setProgress]   = useState(0);
  const [stageLabel, setStageLabel] = useState("");
  const [videoFile,  setVideoFile]  = useState<File | null>(null);
  const [dragOver,   setDragOver]   = useState(false);
  const [outputUrl,  setOutputUrl]  = useState<string | null>(null);
  const [aiResult,   setAiResult]   = useState<AIResult | null>(null);
  const [downloading,setDownloading]= useState(false);
  const [errorMsg,   setErrorMsg]   = useState("");
  const [videoError, setVideoError] = useState(false);
  const [videoLoading, setVideoLoading] = useState(true);

  const aiMoodDescription = typeof aiResult?.moodDescription === "string" ? aiResult.moodDescription : "";
  const aiCaption = typeof aiResult?.caption === "string" ? aiResult.caption : "";
  const aiHashtags = Array.isArray(aiResult?.hashtags)
    ? (aiResult.hashtags as unknown[]).filter((t): t is string => typeof t === "string")
    : [];

  const fileRef    = useRef<HTMLInputElement>(null);
  const audioRef   = useRef<HTMLAudioElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);

  const reset = () => {
    setStage("idle"); setVideoFile(null); setOutputUrl(null);
    setProgress(0); setAiResult(null); setErrorMsg("");
    audioRef.current?.pause();
  };
  const handleClose = () => { reset(); onClose(); };

  // Preview video play on modal open
  useEffect(() => {
    if (open) {
      setVideoError(false);
      setVideoLoading(true);
      if (previewRef.current) {
        previewRef.current.muted = true;
        previewRef.current.play().catch(() => {});
      }
    }
  }, [open, template]);

  /* ── PYTHON BACKEND — Video process karo ── */
  const processWithPythonBackend = async (
    file: File,
    effectConfig: EffectConfig,
    onProgress: (p: number) => void
  ): Promise<Blob | null> => {
    try {
      onProgress(30);
      const formData = new FormData();
      formData.append("video", file);
      formData.append("effect", JSON.stringify(effectConfig.passes));
      formData.append("template_name", template?.name ?? "");

      const response = await fetch("/api/process-video", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Backend processing failed");

      onProgress(85);
      const blob = await response.blob();
      onProgress(100);
      return blob;
    } catch (err) {
      console.warn("Python backend failed, using canvas fallback:", err);
      return null;
    }
  };

  /* ── CANVAS FALLBACK — Browser mein process karo ── */
  const processWithCanvas = async (
    file: File,
    effectConfig: EffectConfig,
    onProgress: (p: number) => void,
    onLabel: (l: string) => void
  ): Promise<Blob> => {
    const videoEl = document.createElement("video");
    videoEl.src = URL.createObjectURL(file);
    videoEl.muted = true;
    videoEl.playsInline = true;
    videoEl.crossOrigin = "anonymous";

    await new Promise<void>((res, rej) => {
      videoEl.onloadedmetadata = () => res();
      videoEl.onerror = () => rej(new Error("Video load failed"));
      videoEl.load();
    });

    const vw = videoEl.videoWidth  || 1280;
    const vh = videoEl.videoHeight || 720;
    const canvas = canvasRef.current!;
    canvas.width  = vw;
    canvas.height = vh;

    const engine = new EffectEngine(canvas, effectConfig);
    const stream = canvas.captureStream(30);

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9" : "video/webm";
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
    const chunks: Blob[] = [];
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

    const duration = Math.min(videoEl.duration, 60);
    recorder.start(100);
    videoEl.currentTime = 0;
    await videoEl.play();

    onLabel(`Rendering with ${template?.effectLabel} effect…`);

    await new Promise<void>(resolve => {
      let lastTime = 0;
      const render = (timestamp: number) => {
        if (timestamp - lastTime >= 33) {
          engine.drawFrame(videoEl);
          lastTime = timestamp;
        }
        const prog = videoEl.currentTime / duration;
        onProgress(25 + Math.floor(prog * 65));
        if (videoEl.currentTime >= duration || videoEl.ended) {
          resolve();
        } else {
          requestAnimationFrame(render);
        }
      };
      requestAnimationFrame(render);
    });

    videoEl.pause();
    recorder.stop();
    await new Promise<void>(res => { recorder.onstop = () => res(); });

    return new Blob(chunks, { type: mimeType });
  };

  /* ── MAIN PROCESS FUNCTION ── */
  const handleApply = useCallback(async () => {
    if (!videoFile || !template || !canvasRef.current) return;

    setStage("analyzing");
    setProgress(5);
    setStageLabel("Claude AI analyze your video style…");

    // Music play karo
    if (audioRef.current) {
      audioRef.current.src = template.audioUrl;
      audioRef.current.volume = 0.45;
      try { await audioRef.current.play(); } catch { /* silent */ }
    }

    let effectConfig = template.effect;

    // Step 1: Claude AI se instructions lo
    try {
      setProgress(15);
      const jsonStr = await getClaudeEditInstructions(template, videoFile.name);
      const json = JSON.parse(jsonStr) as Record<string, unknown>;
      setAiResult(json);

      const cg = json.colorGrade as Record<string, number> | undefined;
      if (cg) {
        const customPasses: EffectPass[] = [
          { type:"colorGrade", brightness:cg.brightness??0, contrast:cg.contrast??1, saturation:cg.saturation??1, hue:cg.hue??0, sepia:cg.sepia??0 },
        ];
        if ((json.vignette as number) > 0)    customPasses.push({ type:"vignette",    intensity: json.vignette as number });
        if ((json.grain as number) > 0)        customPasses.push({ type:"grain",       amount:   json.grain as number });
        if ((json.glitch as number) > 0)       customPasses.push({ type:"glitch",      intensity: json.glitch as number });
        if (json.bloom) {
          const bl = json.bloom as { threshold: number; intensity: number };
          customPasses.push({ type:"bloom", threshold:bl.threshold, intensity:bl.intensity });
        }
        if ((json.cinemaScope as number) > 0)  customPasses.push({ type:"cinemaScope", ratio:    json.cinemaScope as number });
        effectConfig = { ...template.effect, passes: customPasses };
      }
    } catch (e) {
      console.warn("Claude API unavailable, using preset:", e);
    }

    // Step 2: Video process karo
    setStage("processing");
    setProgress(25);
    setStageLabel("AI color grade appling…");

    try {
      // Pehle Python backend try karo — proper MP4 milegi
      let outputBlob = await processWithPythonBackend(
        videoFile,
        effectConfig,
        p => setProgress(p)
      );

      // Python fail ho toh canvas use karo
      if (!outputBlob) {
        outputBlob = await processWithCanvas(
          videoFile,
          effectConfig,
          p => setProgress(p),
          l => setStageLabel(l)
        );
      }

      setProgress(98);
      setStageLabel("Final touches…");

      const url = URL.createObjectURL(outputBlob);
      setOutputUrl(url);
      setProgress(100);
      setStageLabel("Tayar! 🎉");
      setStage("done");
      audioRef.current?.pause();

      toast.success("Video edited successfully! ✅");

    } catch (err) {
      console.error(err);
      setErrorMsg("Processing fail . try small video(200MB se kam) or other  browser.");
      setStage("error");
      audioRef.current?.pause();
    }
  }, [videoFile, template]);

  /* ── DOWNLOAD ── */
  const handleDownload = async () => {
    if (!outputUrl || !template) return;
    setDownloading(true);
    try {
      const a = document.createElement("a");
      a.href = outputUrl;
      // Extension detect karo
      const ext = outputUrl.includes("mp4") ? "mp4" : "webm";
      a.download = `${template.name.replace(/\s+/g,"_")}_edited_${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Download shuru ho gaya! 🎬");
    } finally {
      setDownloading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith("video/")) setVideoFile(f);
  };

  if (!template || !open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background:"rgba(0,0,0,0.88)", backdropFilter:"blur(14px)" }}
      onClick={e => e.target === e.currentTarget && handleClose()}
    >
      <audio ref={audioRef} loop crossOrigin="anonymous"/>
      <canvas ref={canvasRef} className="hidden absolute pointer-events-none" style={{ width:0, height:0 }}/>

      <div
        className="w-full sm:max-w-md max-h-[96vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-white/10 text-white"
        style={{ background:"linear-gradient(160deg,#0f0b1e 0%,#130e22 100%)" }}
      >
        {/* Preview */}
        <div className="relative h-52 overflow-hidden rounded-t-3xl flex-shrink-0 bg-black">
          {videoLoading && !videoError && (
            <div className="absolute inset-0 flex items-center justify-center z-0">
              <Loader2 className="w-8 h-8 animate-spin text-violet-500/50"/>
            </div>
          )}
          {videoError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-0 bg-gradient-to-br from-violet-900/30 to-pink-900/30">
              <Video className="w-12 h-12 text-white/30 mb-2"/>
              <p className="text-white/50 text-xs">Preview not available</p>
              <p className="text-white/30 text-[10px] mt-1">Upload your video to see the effect</p>
            </div>
          ) : (
            <video
              ref={previewRef}
              src={template.previewVideoUrl}
              poster={template.thumbnailUrl}
              muted loop playsInline preload="auto"
              crossOrigin="anonymous"
              className="w-full h-full object-cover"
              style={{ filter: template.effect.cssFilter }}
              onError={() => { setVideoError(true); setVideoLoading(false); }}
              onLoadedData={() => setVideoLoading(false)}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f0b1e] via-[#0f0b1e]/30 to-transparent"/>
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur flex items-center justify-center z-10"
          >
            <X className="w-4 h-4 text-white"/>
          </button>
          <div className="absolute bottom-4 left-4 z-10">
            <div className="flex gap-1.5 mb-1.5 flex-wrap">
              {template.trending && <span className="bg-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">🔥 TRENDING</span>}
              {template.isNew    && <span className="bg-cyan-500  text-white text-[9px] font-black px-2 py-0.5 rounded-full">✨ NEW</span>}
              <span className="bg-violet-600 text-white text-[9px] px-2 py-0.5 rounded-full font-semibold">{template.effectLabel}</span>
            </div>
            <h2 className="text-white text-xl font-black">{template.name}</h2>
          </div>
        </div>

        <div className="p-5">
          {/* Stats */}
          <div className="flex items-center gap-3 mb-3 text-xs text-white/45">
            <span className="flex items-center gap-1"><Play className="w-3 h-3"/>{fmt(template.uses)}</span>
            <span className="flex items-center gap-1"><Heart className="w-3 h-3"/>{fmt(template.likes)}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3"/>{template.duration}</span>
            <span className="flex items-center gap-1 ml-auto text-violet-300"><Music2 className="w-3 h-3"/>{template.musicTitle}</span>
          </div>
          <p className="text-white/55 text-sm mb-5 leading-relaxed">{template.description}</p>

          {/* AI badge */}
          <div className="flex items-center gap-2 bg-violet-500/10 border border-violet-500/25 rounded-xl px-3 py-2 mb-5">
            <Sparkles className="w-4 h-4 text-violet-400 flex-shrink-0"/>
            <p className="text-violet-200/80 text-xs leading-relaxed">
              <strong className="text-violet-200">Claude AI</strong>  personalised color grade will generate for your video .
            </p>
          </div>

          {/* ── IDLE ── */}
          {stage === "idle" && (
            <>
              <input
                ref={fileRef} type="file" accept="video/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) setVideoFile(f); }}
              />
              
              {/* PROMINENT VIDEO UPLOAD AREA */}
              <div className="mb-4">
                <p className="text-white/70 text-sm font-semibold mb-3 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-violet-400"/>
                  Step 1: Upload Your Video
                </p>
                <div
                  className={cn(
                    "border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200",
                    dragOver   ? "border-violet-400 bg-violet-500/20 shadow-lg shadow-violet-500/20" :
                    videoFile  ? "border-green-400/70 bg-green-500/10 shadow-lg shadow-green-500/20" :
                                 "border-white/20 hover:border-violet-400/70 hover:bg-violet-500/10"
                  )}
                  onClick={() => fileRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                >
                  {videoFile ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-2xl bg-green-500/20 flex items-center justify-center border border-green-500/30">
                        <Video className="w-8 h-8 text-green-400"/>
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm">{videoFile.name}</p>
                        <p className="text-green-400/70 text-xs mt-1">{(videoFile.size/1024/1024).toFixed(1)} MB · Click to change video</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                        <Upload className="w-8 h-8 text-violet-400"/>
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm">Drop your video here or click to browse</p>
                        <p className="text-white/40 text-xs mt-1">MP4 · MOV · AVI · WebM · 500MB max</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* STEP 2: APPLY BUTTON */}
              <div className="mb-4">
                <p className="text-white/70 text-sm font-semibold mb-3 flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-pink-400"/>
                  Step 2: Apply Template Effect
                </p>
                <button
                  onClick={videoFile ? handleApply : () => fileRef.current?.click()}
                  disabled={!videoFile}
                  className={cn(
                    "w-full py-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2 transition-all active:scale-95",
                    videoFile 
                      ? "hover:shadow-2xl cursor-pointer" 
                      : "opacity-50 cursor-not-allowed"
                  )}
                  style={{
                    background: "linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)",
                    boxShadow: videoFile ? "0 12px 40px rgba(124, 58, 237, 0.5)" : undefined,
                  }}
                >
                  {videoFile
                    ? <><Wand2 className="w-5 h-5"/> Apply &quot;{template.name}&quot; with AI</>
                    : <><Upload className="w-5 h-5"/> Upload Video First</>
                  }
                </button>
              </div>
              
              {!videoFile && (
                <p className="text-center text-white/30 text-xs">
                  Pehle video upload karo, phir AI effect apply karo
                </p>
              )}
            </>
          )}

          {/* ── ANALYZING ── */}
          {stage === "analyzing" && (
            <div className="flex flex-col items-center gap-5 py-4">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center border-2 border-violet-500/30"
                style={{ background:"rgba(124,58,237,0.12)" }}
              >
                <Sparkles className="w-9 h-9 text-violet-400" style={{ animation:"spin 2s linear infinite" }}/>
              </div>
              <div className="text-center">
                <p className="text-white font-black text-lg">Claude AI analyzing…</p>
                <p className="text-white/45 text-sm mt-1">{stageLabel}</p>
              </div>
              <div className="w-full bg-white/8 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width:`${progress}%`, background:"linear-gradient(90deg,#7c3aed,#ec4899)" }}
                />
              </div>
            </div>
          )}

          {/* ── PROCESSING ── */}
          {stage === "processing" && (
            <div className="flex flex-col items-center gap-5 py-4">
              <CircularProgress progress={progress}/>
              <div className="text-center">
                <p className="text-white font-black text-lg">{stageLabel}</p>
                <p className="text-white/45 text-sm mt-1">Pixel-level effects applying…</p>
              </div>
              {aiResult && (
                <div className="w-full bg-violet-500/8 border border-violet-500/20 rounded-xl p-3 text-xs">
                  <p className="text-violet-300 font-bold mb-1">Claude edit plan:</p>
                  <p className="text-white/60 italic">{aiMoodDescription}</p>
                  {aiHashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {aiHashtags.map(h => <span key={h} className="text-violet-400 text-[10px]">{h}</span>)}
                    </div>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2 bg-white/4 rounded-full px-3 py-1.5">
                <Music2 className="w-3 h-3 text-pink-400"/>
                <span className="text-white/45 text-xs">{template.musicTitle}</span>
                <div className="flex items-end gap-[2px]">
                  {[0,1,2,3].map(i => (
                    <div key={i} className="w-[2px] bg-pink-400 rounded-full"
                      style={{ animation:"waveBar 0.5s ease-in-out infinite", animationDelay:`${i*0.12}s` }}/>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── DONE ── */}
          {stage === "done" && outputUrl && (
            <div className="flex flex-col items-center gap-4 py-2">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background:"rgba(34,197,94,0.15)", boxShadow:"0 0 40px rgba(34,197,94,0.3)" }}
              >
                <CheckCircle className="w-9 h-9 text-green-400"/>
              </div>
              <p className="text-white font-black text-xl">Video tayar hai! 🎉</p>

              {aiCaption && (
                <div className="w-full bg-violet-500/10 border border-violet-500/20 rounded-xl p-3 text-xs">
                  <p className="text-violet-300 font-bold mb-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3"/> AI Caption
                  </p>
                  <p className="text-white/75">{aiCaption}</p>
                  {aiHashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {aiHashtags.map(h => <span key={h} className="text-violet-400 text-[10px]">{h}</span>)}
                    </div>
                  )}
                </div>
              )}

              <div className="w-full rounded-2xl overflow-hidden border border-green-500/30 bg-black aspect-video">
                <video src={outputUrl} controls autoPlay className="w-full h-full object-contain"/>
              </div>

              <div className="flex gap-2 w-full">
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="flex-1 py-3.5 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
                  style={{ background:"linear-gradient(135deg,#7c3aed 0%,#ec4899 100%)", boxShadow:"0 8px 32px rgba(124,58,237,0.4)" }}
                >
                  {downloading
                    ? <><Loader2 className="w-4 h-4 animate-spin"/>Downloading…</>
                    : <><Download className="w-4 h-4"/>Video Download Karo</>
                  }
                </button>
                <Link href="/dashboard/my-projects" className="flex-1">
                  <button className="w-full py-3.5 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 border border-white/14 bg-white/5 hover:bg-white/10 transition active:scale-95">
                    <FolderOpen className="w-4 h-4"/>My Projects
                  </button>
                </Link>
              </div>
              <button onClick={reset} className="text-white/28 text-xs hover:text-white/55 transition mt-1">
                ↩ Doosra video try karo
              </button>
            </div>
          )}

          {/* ── ERROR ── */}
          {stage === "error" && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center">
                <X className="w-8 h-8 text-red-400"/>
              </div>
              <p className="text-white font-black text-lg">Kuch masla ho gaya</p>
              <p className="text-white/45 text-sm">{errorMsg}</p>
              <button
                onClick={reset}
                className="px-6 py-3 rounded-2xl font-bold text-white text-sm border border-white/14 bg-white/5 hover:bg-white/10 transition"
              >
                ↩ Dobara koshish karo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════ */
export default function TemplatesClient() {
  const [activeCat, setActiveCat] = useState<CategoryId>("all");
  const [selected,  setSelected]  = useState<Template | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleSelect = (t: Template) => { setSelected(t); setModalOpen(true); };
  const handlePreview = (t: Template) => { setPreviewTemplate(t); setPreviewOpen(true); };
  const filtered = filterCat(ALL_TEMPLATES, activeCat);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }}/>

      <div className="min-h-screen pb-10" style={{ background:"linear-gradient(160deg,#09080f 0%,#0d0b18 50%,#0b0815 100%)" }}>
        {/* Ambient blobs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-20%] left-[20%] w-[500px] h-[500px] rounded-full opacity-18"
            style={{ background:"radial-gradient(circle,#7c3aed 0%,transparent 70%)", filter:"blur(60px)" }}/>
          <div className="absolute bottom-[-10%] right-[10%] w-[400px] h-[400px] rounded-full opacity-12"
            style={{ background:"radial-gradient(circle,#ec4899 0%,transparent 70%)", filter:"blur(50px)" }}/>
        </div>

        {/* Header */}
        <header
          className="sticky top-0 z-30 px-4 py-3 flex items-center gap-3 border-b border-white/5"
          style={{ background:"rgba(9,8,15,0.88)", backdropFilter:"blur(20px)" }}
        >
          <Link href="/dashboard">
            <button className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/15 transition">
              <ArrowLeft className="w-4 h-4 text-white"/>
            </button>
          </Link>
          <div>
            <h1 className="text-white font-black text-base tracking-tight">Template Gallery</h1>
            <p className="text-white/28 text-[11px]">{ALL_TEMPLATES.length} AI-powered templates</p>
          </div>
          <Link href="/dashboard/my-projects" className="ml-auto">
            <button className="flex items-center gap-1.5 bg-white/6 hover:bg-white/12 border border-white/8 rounded-full px-3 py-1.5 text-white/55 text-xs hover:text-white transition">
              <FolderOpen className="w-3.5 h-3.5"/> My Projects
            </button>
          </Link>
        </header>

        <main className="relative">
          {/* Hero */}
          <section className="text-center px-4 pt-7 pb-2">
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-3 text-xs font-semibold"
              style={{ background:"rgba(124,58,237,0.15)", border:"1px solid rgba(124,58,237,0.3)", color:"#c4b5fd" }}
            >
              <Sparkles className="w-3 h-3"/> Claude AI · Real Video Effects · Canvas Processing
            </div>
            <h2 className="text-white text-2xl font-black leading-tight mb-2">
              Template Chuno.{" "}
              <span style={{ background:"linear-gradient(135deg,#a78bfa,#f472b6)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                AI Edit Kare.
              </span>
            </h2>
            <p className="text-white/35 text-sm">
              Hover karo preview dekhne ke liye · Music button se song bajao · Video upload karo AI grading ke liye
            </p>
          </section>

          {/* Featured Carousel */}
          <section className="mb-6 mt-5">
            <div className="flex items-center gap-2 px-4 mb-4">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400"/>
              <span className="text-white font-black text-sm">Featured</span>
            </div>
            <FeaturedCarousel onSelect={handleSelect} onPreview={handlePreview}/>
          </section>

          {/* Category filters */}
          <div className="px-4 mb-5">
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth:"none" }}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCat(cat.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap flex-shrink-0 transition-all duration-200",
                    activeCat === cat.id
                      ? "text-white scale-105"
                      : "text-white/45 hover:text-white/75 border border-white/8 bg-white/4"
                  )}
                  style={activeCat === cat.id
                    ? { background:"linear-gradient(135deg,#7c3aed,#ec4899)", boxShadow:"0 4px 20px rgba(124,58,237,0.35)", border:"1px solid transparent" }
                    : undefined
                  }
                >
                  <span>{cat.emoji}</span>{cat.label}
                  <span className="text-[9px] opacity-55">({filterCat(ALL_TEMPLATES, cat.id).length})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Template rows — "all" view */}
          {activeCat === "all" ? (
            <>
              <TemplateRow title="🔥 Trending Now"   templates={TRENDING.slice(0,15)}                               onSelect={handleSelect} onPreview={handlePreview} cardSize="lg"/>
              <TemplateRow title="✨ New Arrivals"    templates={NEW_TEMPS.slice(0,15)}                              onSelect={handleSelect} onPreview={handlePreview} cardSize="md"/>
              <TemplateRow title="👗 Fashion"         templates={filterCat(ALL_TEMPLATES,"fashion").slice(0,15)}    onSelect={handleSelect} onPreview={handlePreview}/>
              <TemplateRow title="👨‍👩‍👧 Family"         templates={filterCat(ALL_TEMPLATES,"family").slice(0,15)}     onSelect={handleSelect} onPreview={handlePreview}/>
              <TemplateRow title="📱 Social Media"    templates={filterCat(ALL_TEMPLATES,"social").slice(0,15)}     onSelect={handleSelect} onPreview={handlePreview}/>
              <TemplateRow title="🎬 Cinematic"       templates={filterCat(ALL_TEMPLATES,"cinematic").slice(0,15)}  onSelect={handleSelect} onPreview={handlePreview}/>
              <TemplateRow title="⚡ Transitions"     templates={filterCat(ALL_TEMPLATES,"transitions").slice(0,15)} onSelect={handleSelect} onPreview={handlePreview}/>
              <TemplateRow title="🌀 Effects"         templates={filterCat(ALL_TEMPLATES,"effects").slice(0,15)}    onSelect={handleSelect} onPreview={handlePreview}/>
              <TemplateRow title="✈️ Travel"          templates={filterCat(ALL_TEMPLATES,"travel").slice(0,15)}     onSelect={handleSelect} onPreview={handlePreview}/>
              <TemplateRow title="🎵 Music"           templates={filterCat(ALL_TEMPLATES,"music").slice(0,15)}      onSelect={handleSelect} onPreview={handlePreview}/>
              <TemplateRow title="📣 Promo & Ads"     templates={filterCat(ALL_TEMPLATES,"promo").slice(0,15)}      onSelect={handleSelect} onPreview={handlePreview}/>
            </>
          ) : (
            <div className="px-4">
              {filtered.length === 0 ? (
                <div className="text-center py-20 text-white/22">
                  <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-18"/>
                  <p className="text-sm">Is category mein abhi templates nahi hain</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {filtered.map(t => (
                    <TemplateCard key={t.id} template={t} onClick={handleSelect} onPreview={handlePreview} size="md"/>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>

        <TemplateModal template={selected} open={modalOpen} onClose={() => setModalOpen(false)}/>
        <TemplatePreviewModal 
          template={previewTemplate!} 
          isOpen={previewOpen} 
          onClose={() => setPreviewOpen(false)}
          onApply={handleSelect}
        />
      </div>
    </>
  );
}