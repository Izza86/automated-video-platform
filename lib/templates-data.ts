// lib/templates-data.ts
//
// Keys already hain tumhare .env.local mein:
//   NEXT_PUBLIC_PEXELS_API_KEY=...
//   NEXT_PUBLIC_PIXABAY_API_KEY=...

export type CategoryId =
  | "all"
  | "trending"
  | "cinematic"
  | "transitions"
  | "text"
  | "social"
  | "effects"
  | "music"
  | "promo";

export interface TemplateMusic {
  title: string;
  artist: string;
  audioUrl: string;
  duration: string;
}

export interface Template {
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
  music: TemplateMusic;
  cssFilter: string;
  overlayColor: string;
}

// ─── Pixabay Audio CDN (free, no key needed for playback) ─────
const MUSIC = {
  cinematic: {
    title: "Epic Cinematic",
    artist: "Pixabay Music",
    audioUrl: "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0c6ff1bab.mp3",
    duration: "2:34",
  },
  hiphop: {
    title: "Hip Hop Trap",
    artist: "Pixabay Music",
    audioUrl: "https://cdn.pixabay.com/download/audio/2022/03/10/audio_c8c8a73467.mp3",
    duration: "2:15",
  },
  synthwave: {
    title: "Synthwave Drive",
    artist: "Pixabay Music",
    audioUrl: "https://cdn.pixabay.com/download/audio/2022/08/02/audio_884fe92c21.mp3",
    duration: "3:02",
  },
  upbeat: {
    title: "Upbeat Pop Vlog",
    artist: "Pixabay Music",
    audioUrl: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3",
    duration: "2:45",
  },
  lofi: {
    title: "Lo-Fi Chill Hop",
    artist: "Pixabay Music",
    audioUrl: "https://cdn.pixabay.com/download/audio/2022/02/07/audio_d6aead5f48.mp3",
    duration: "3:10",
  },
  edm: {
    title: "EDM Festival Drop",
    artist: "Pixabay Music",
    audioUrl: "https://cdn.pixabay.com/download/audio/2022/10/25/audio_946b8e2fd2.mp3",
    duration: "2:55",
  },
  romantic: {
    title: "Romantic Piano",
    artist: "Pixabay Music",
    audioUrl: "https://cdn.pixabay.com/download/audio/2021/11/25/audio_22bef8a2e7.mp3",
    duration: "3:20",
  },
  sports: {
    title: "Sports Hype Anthem",
    artist: "Pixabay Music",
    audioUrl: "https://cdn.pixabay.com/download/audio/2022/07/19/audio_bf2eb1af09.mp3",
    duration: "2:20",
  },
};

// ─── Templates Data ───────────────────────────────────────────
export const ALL_TEMPLATES: Template[] = [
  {
    id: "cinematic_teal_orange",
    name: "Cinematic Teal & Orange",
    category: "cinematic",
    tags: ["cinematic", "trending"],
    description: "Hollywood-grade color grade with teal shadows and warm orange highlights. Perfect for travel, fashion, and lifestyle.",
    duration: "0:15",
    uses: 128400,
    likes: 34200,
    trending: true,
    featured: true,
    previewVideoUrl: "https://videos.pexels.com/video-files/3571264/3571264-hd_1920_1080_30fps.mp4",
    thumbnailUrl: "https://images.pexels.com/videos/3571264/pictures/preview-0.jpg",
    music: MUSIC.cinematic,
    cssFilter: "saturate(1.3) contrast(1.1) hue-rotate(-10deg)",
    overlayColor: "rgba(0,180,180,0.08)",
  },
  {
    id: "fast_beat_sync",
    name: "Fast Beat Sync",
    category: "transitions",
    tags: ["transitions", "trending", "social"],
    description: "Lightning-fast cuts synced to every beat. Flash effects and zoom punches — made for viral content.",
    duration: "0:10",
    uses: 256000,
    likes: 89000,
    trending: true,
    featured: true,
    previewVideoUrl: "https://videos.pexels.com/video-files/2795405/2795405-hd_1920_1080_25fps.mp4",
    thumbnailUrl: "https://images.pexels.com/videos/2795405/pictures/preview-0.jpg",
    music: MUSIC.hiphop,
    cssFilter: "contrast(1.3) brightness(1.1) saturate(1.4)",
    overlayColor: "rgba(255,50,50,0.06)",
  },
  {
    id: "neon_glow_text",
    name: "Neon Glow Text",
    category: "text",
    tags: ["text", "effects"],
    description: "Pulsing neon light text reveals over dark moody footage. Cyberpunk aesthetic for gaming and nightlife.",
    duration: "0:08",
    uses: 94500,
    likes: 21000,
    featured: true,
    isNew: true,
    previewVideoUrl: "https://videos.pexels.com/video-files/3129957/3129957-hd_1920_1080_30fps.mp4",
    thumbnailUrl: "https://images.pexels.com/videos/3129957/pictures/preview-0.jpg",
    music: MUSIC.synthwave,
    cssFilter: "brightness(0.7) saturate(2) contrast(1.2)",
    overlayColor: "rgba(120,0,255,0.12)",
  },
  {
    id: "tiktok_viral",
    name: "TikTok Viral Style",
    category: "social",
    tags: ["social", "trending"],
    description: "The exact edit style blowing up on TikTok — fast zooms, text captions, reaction cuts.",
    duration: "0:15",
    uses: 421000,
    likes: 156000,
    trending: true,
    featured: true,
    previewVideoUrl: "https://videos.pexels.com/video-files/6466991/6466991-hd_1920_1080_25fps.mp4",
    thumbnailUrl: "https://images.pexels.com/videos/6466991/pictures/preview-0.jpg",
    music: MUSIC.upbeat,
    cssFilter: "saturate(1.5) contrast(1.15)",
    overlayColor: "rgba(255,0,100,0.06)",
  },
  {
    id: "vintage_film",
    name: "Vintage 8mm Film",
    category: "cinematic",
    tags: ["cinematic", "effects"],
    description: "Authentic Super 8 film grain, light leaks, and warm faded tones for that nostalgic analog look.",
    duration: "0:12",
    uses: 72000,
    likes: 18000,
    isNew: true,
    previewVideoUrl: "https://videos.pexels.com/video-files/4625583/4625583-hd_1920_1080_25fps.mp4",
    thumbnailUrl: "https://images.pexels.com/videos/4625583/pictures/preview-0.jpg",
    music: MUSIC.lofi,
    cssFilter: "sepia(0.6) contrast(0.9) brightness(1.1) saturate(0.8)",
    overlayColor: "rgba(255,200,100,0.10)",
  },
  {
    id: "wedding_cinematic",
    name: "Wedding Moments",
    category: "cinematic",
    tags: ["cinematic"],
    description: "Soft romantic color grade with lens flares, bokeh overlays and elegant slow motion cuts.",
    duration: "0:25",
    uses: 89000,
    likes: 31000,
    previewVideoUrl: "https://videos.pexels.com/video-files/3997992/3997992-hd_1920_1080_25fps.mp4",
    thumbnailUrl: "https://images.pexels.com/videos/3997992/pictures/preview-0.jpg",
    music: MUSIC.romantic,
    cssFilter: "brightness(1.1) saturate(0.9) contrast(0.95)",
    overlayColor: "rgba(255,220,200,0.08)",
  },
  {
    id: "smooth_zoom",
    name: "Smooth Zoom Transition",
    category: "transitions",
    tags: ["transitions", "trending"],
    description: "Buttery cinematic zoom-in/out with motion blur between every scene.",
    duration: "0:10",
    uses: 183000,
    likes: 54000,
    trending: true,
    previewVideoUrl: "https://videos.pexels.com/video-files/2278095/2278095-hd_1920_1080_30fps.mp4",
    thumbnailUrl: "https://images.pexels.com/videos/2278095/pictures/preview-0.jpg",
    music: MUSIC.cinematic,
    cssFilter: "contrast(1.1) saturate(1.2)",
    overlayColor: "rgba(0,100,255,0.05)",
  },
  {
    id: "glitch_transition",
    name: "Glitch RGB Split",
    category: "transitions",
    tags: ["transitions", "effects"],
    description: "Digital glitch artifacts and RGB channel separation for that raw, edgy aesthetic.",
    duration: "0:08",
    uses: 137000,
    likes: 41000,
    trending: true,
    previewVideoUrl: "https://videos.pexels.com/video-files/3214902/3214902-hd_1920_1080_25fps.mp4",
    thumbnailUrl: "https://images.pexels.com/videos/3214902/pictures/preview-0.jpg",
    music: MUSIC.edm,
    cssFilter: "contrast(1.4) saturate(1.6) brightness(1.05)",
    overlayColor: "rgba(255,0,255,0.08)",
  },
  {
    id: "instagram_reel",
    name: "Instagram Reel Kit",
    category: "social",
    tags: ["social", "trending"],
    description: "9:16 optimized with trending audio sync, caption animations, and story-first visual hierarchy.",
    duration: "0:30",
    uses: 315000,
    likes: 112000,
    trending: true,
    previewVideoUrl: "https://videos.pexels.com/video-files/5779049/5779049-hd_1920_1080_25fps.mp4",
    thumbnailUrl: "https://images.pexels.com/videos/5779049/pictures/preview-0.jpg",
    music: MUSIC.upbeat,
    cssFilter: "saturate(1.4) brightness(1.05) contrast(1.1)",
    overlayColor: "rgba(255,100,0,0.06)",
  },
  {
    id: "youtube_shorts",
    name: "YouTube Shorts Hype",
    category: "social",
    tags: ["social"],
    description: "Hook in the first 3 seconds with explosive text reveals and call-to-action animations.",
    duration: "0:15",
    uses: 198000,
    likes: 67000,
    isNew: true,
    previewVideoUrl: "https://videos.pexels.com/video-files/4167472/4167472-hd_1920_1080_25fps.mp4",
    thumbnailUrl: "https://images.pexels.com/videos/4167472/pictures/preview-0.jpg",
    music: MUSIC.hiphop,
    cssFilter: "contrast(1.2) saturate(1.3)",
    overlayColor: "rgba(255,0,0,0.07)",
  },
  {
    id: "vhs_retro",
    name: "VHS Retro Tape",
    category: "effects",
    tags: ["effects"],
    description: "90s VHS aesthetic with scan lines, tape wobble, and faded color palette.",
    duration: "0:12",
    uses: 63000,
    likes: 19000,
    isNew: true,
    previewVideoUrl: "https://videos.pexels.com/video-files/3843437/3843437-hd_1920_1080_25fps.mp4",
    thumbnailUrl: "https://images.pexels.com/videos/3843437/pictures/preview-0.jpg",
    music: MUSIC.synthwave,
    cssFilter: "sepia(0.4) contrast(1.1) brightness(0.95) saturate(0.7)",
    overlayColor: "rgba(0,255,100,0.05)",
  },
  {
    id: "news_lower_thirds",
    name: "News Lower Thirds",
    category: "text",
    tags: ["text"],
    description: "Professional broadcast-style animated titles and lower thirds.",
    duration: "0:05",
    uses: 43000,
    likes: 9800,
    previewVideoUrl: "https://videos.pexels.com/video-files/3571264/3571264-hd_1920_1080_30fps.mp4",
    thumbnailUrl: "https://images.pexels.com/videos/3571264/pictures/preview-0.jpg",
    music: MUSIC.cinematic,
    cssFilter: "contrast(1.05) brightness(1.0)",
    overlayColor: "rgba(0,50,200,0.06)",
  },
  {
    id: "product_showcase",
    name: "Product Showcase",
    category: "promo",
    tags: ["promo"],
    description: "Clean product reveal with animated price tags, feature callouts, and buy-now CTA.",
    duration: "0:20",
    uses: 61000,
    likes: 12000,
    previewVideoUrl: "https://videos.pexels.com/video-files/3735975/3735975-hd_1920_1080_25fps.mp4",
    thumbnailUrl: "https://images.pexels.com/videos/3735975/pictures/preview-0.jpg",
    music: MUSIC.upbeat,
    cssFilter: "brightness(1.1) saturate(1.2) contrast(1.05)",
    overlayColor: "rgba(255,200,0,0.06)",
  },
  {
    id: "sports_hype",
    name: "Sports Hype Reel",
    category: "promo",
    tags: ["promo", "trending"],
    description: "Explosive energy montage with dynamic speed ramps, impact frames and stadium effects.",
    duration: "0:20",
    uses: 192000,
    likes: 67000,
    trending: true,
    previewVideoUrl: "https://videos.pexels.com/video-files/4752903/4752903-hd_1920_1080_25fps.mp4",
    thumbnailUrl: "https://images.pexels.com/videos/4752903/pictures/preview-0.jpg",
    music: MUSIC.sports,
    cssFilter: "contrast(1.3) saturate(1.4) brightness(1.05)",
    overlayColor: "rgba(255,100,0,0.08)",
  },
  {
    id: "music_lyric_video",
    name: "Lyric Video Kit",
    category: "music",
    tags: ["music", "text"],
    description: "Beat-synced lyric reveals with particle effects and dynamic typography.",
    duration: "0:30",
    uses: 87000,
    likes: 28000,
    isNew: true,
    previewVideoUrl: "https://videos.pexels.com/video-files/3045163/3045163-hd_1920_1080_25fps.mp4",
    thumbnailUrl: "https://images.pexels.com/videos/3045163/pictures/preview-0.jpg",
    music: MUSIC.edm,
    cssFilter: "brightness(0.8) saturate(2) contrast(1.2) hue-rotate(20deg)",
    overlayColor: "rgba(100,0,255,0.12)",
  },
];

export const FEATURED_TEMPLATES = ALL_TEMPLATES.filter((t) => t.featured);
export const TRENDING_TEMPLATES = ALL_TEMPLATES.filter((t) => t.trending);
export const NEW_TEMPLATES      = ALL_TEMPLATES.filter((t) => t.isNew);

export const CATEGORIES: { id: CategoryId; label: string; emoji: string }[] = [
  { id: "all",          label: "All",           emoji: "✨" },
  { id: "trending",     label: "Trending",       emoji: "🔥" },
  { id: "cinematic",    label: "Cinematic",      emoji: "🎬" },
  { id: "transitions",  label: "Transitions",    emoji: "⚡" },
  { id: "social",       label: "Social Media",   emoji: "📱" },
  { id: "effects",      label: "Effects",        emoji: "🌀" },
  { id: "text",         label: "Text & Titles",  emoji: "✍️" },
  { id: "music",        label: "Music",          emoji: "🎵" },
  { id: "promo",        label: "Promo & Ads",    emoji: "📣" },
];

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export function filterTemplates(templates: Template[], category: CategoryId): Template[] {
  if (category === "all") return templates;
  return templates.filter((t) => t.category === category || t.tags.includes(category));
}

// ─── Pixabay API — Music Search ───────────────────────────────
export async function fetchPixabayMusic(query: string): Promise<TemplateMusic[]> {
  const key = process.env.NEXT_PUBLIC_PIXABAY_API_KEY;
  if (!key) return [];
  try {
    const res  = await fetch(`https://pixabay.com/api/videos/music/?key=${key}&q=${encodeURIComponent(query)}&per_page=5`);
    const data = await res.json();
    if (!data.hits) return [];
    return data.hits.map((hit: { title?: string; user?: string; audio?: { url?: string }; duration?: number }) => ({
      title:    hit.title   ?? "Unknown",
      artist:   hit.user    ?? "Pixabay Music",
      audioUrl: hit.audio?.url ?? "",
      duration: hit.duration
        ? `${Math.floor(hit.duration / 60)}:${String(hit.duration % 60).padStart(2, "0")}`
        : "0:00",
    }));
  } catch { return []; }
}

// ─── Pexels API — Video Search ────────────────────────────────
export async function fetchPexelsVideos(query: string): Promise<string[]> {
  const key = process.env.NEXT_PUBLIC_PEXELS_API_KEY;
  if (!key) return [];
  try {
    const res  = await fetch(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=5&size=medium`,
      { headers: { Authorization: key } }
    );
    const data = await res.json();
    if (!data.videos) return [];
    return data.videos.flatMap((v: { video_files?: { link?: string; quality?: string }[] }) =>
      (v.video_files ?? []).filter((f) => f.quality === "hd" && f.link).map((f) => f.link as string)
    );
  } catch { return []; }
}