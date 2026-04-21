"use client";

import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Download,
  Film,
  Loader2,
  Play,
  Share2,
  Sparkles,
  TrendingUp,
  Type,
  Upload,
  Video,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { createProject } from "@/server/projects";

// FFmpeg is lazy-loaded only when the user starts processing
type FFmpegInstance = import("@ffmpeg/ffmpeg").FFmpeg;

// CapCut template URLs for different template categories
const CAPCUT_TEMPLATES: Record<string, string> = {
  "Intros & Outros":
    "https://www.capcut.com/templates/intro-outro-video-7159609137982734594",
  Transitions:
    "https://www.capcut.com/templates/transition-video-7152882498678954242",
  "Lower Thirds & Text":
    "https://www.capcut.com/templates/text-animation-video-7148498479355177218",
  "Social Media":
    "https://www.capcut.com/templates/social-media-video-7159609137982734594",
  "Effects & Filters":
    "https://www.capcut.com/templates/effects-video-7159609137982734594",
  "Promo & Ads":
    "https://www.capcut.com/templates/promo-video-7159609137982734594",
};

const CATEGORIES = [
  "All",
  "Intros & Outros",
  "Transitions",
  "Lower Thirds & Text",
  "Social Media",
  "Effects & Filters",
  "Promo & Ads",
] as const;

const CATEGORY_ICONS: Record<string, any> = {
  All: Sparkles,
  "Intros & Outros": Film,
  Transitions: Zap,
  "Lower Thirds & Text": Type,
  "Social Media": Share2,
  "Effects & Filters": Wand2,
  "Promo & Ads": TrendingUp,
};

const ALL_TEMPLATES: Record<string, Template[]> = {
  "Intros & Outros": [
    {
      id: 1,
      name: "Cinematic Logo Reveal",
      category: "Intros & Outros",
      duration: "0:05",
      thumbnail:
        "https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=600&h=400&fit=crop",
      popular: true,
      description: "Epic cinematic intro with particle effects",
      effects: "Particles, Glow, Zoom",
      music: "Epic Orchestral",
    },
    {
      id: 2,
      name: "Modern Glitch Intro",
      category: "Intros & Outros",
      duration: "0:08",
      thumbnail:
        "https://images.unsplash.com/photo-1536240478700-b869070f9279?w=600&h=400&fit=crop",
      popular: true,
      description: "Urban glitch effect opener",
      effects: "Glitch, RGB Split, Distortion",
      music: "Electronic Beat",
    },
    {
      id: 3,
      name: "Minimal Line Animation",
      category: "Intros & Outros",
      duration: "0:06",
      thumbnail:
        "https://images.unsplash.com/photo-1557683316-973673baf926?w=600&h=400&fit=crop",
      popular: false,
      description: "Clean and professional line reveal",
      effects: "Line Animation, Fade",
      music: "Ambient",
    },
    {
      id: 4,
      name: "Neon Light Intro",
      category: "Intros & Outros",
      duration: "0:07",
      thumbnail:
        "https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=600&h=400&fit=crop",
      popular: true,
      description: "Vibrant neon glow animation",
      effects: "Neon Glow, Flicker",
      music: "Synthwave",
    },
    {
      id: 5,
      name: "3D Text Reveal",
      category: "Intros & Outros",
      duration: "0:10",
      thumbnail:
        "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop",
      popular: false,
      description: "3D rotating text animation",
      effects: "3D Rotation, Depth",
      music: "Modern Pop",
    },
    {
      id: 6,
      name: "Fire Logo Burn",
      category: "Intros & Outros",
      duration: "0:08",
      thumbnail:
        "https://images.unsplash.com/photo-1525909002-1b05e0c869d8?w=600&h=400&fit=crop",
      popular: true,
      description: "Dramatic fire reveal effect",
      effects: "Fire, Smoke, Heat Distortion",
      music: "Dark Epic",
    },
    {
      id: 7,
      name: "Particle Explosion",
      category: "Intros & Outros",
      duration: "0:06",
      thumbnail:
        "https://images.unsplash.com/photo-1519810755548-39cd217da494?w=600&h=400&fit=crop",
      popular: false,
      description: "Dynamic particle burst intro",
      effects: "Particles, Bloom",
      music: "Uplifting",
    },
    {
      id: 8,
      name: "Corporate Clean Outro",
      category: "Intros & Outros",
      duration: "0:05",
      thumbnail:
        "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop",
      popular: false,
      description: "Professional business ending",
      effects: "Fade, Slide",
      music: "Corporate",
    },
  ],
  Transitions: [
    {
      id: 9,
      name: "Smooth Zoom",
      category: "Transitions",
      duration: "0:01",
      thumbnail:
        "https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?w=600&h=400&fit=crop",
      popular: true,
      description: "Seamless zoom transition",
      effects: "Zoom, Blur",
      music: "None",
    },
    {
      id: 10,
      name: "Slide Wipe",
      category: "Transitions",
      duration: "0:01",
      thumbnail:
        "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=600&h=400&fit=crop",
      popular: true,
      description: "Dynamic slide wipe effect",
      effects: "Slide, Wipe",
      music: "None",
    },
    {
      id: 11,
      name: "Glitch Transition",
      category: "Transitions",
      duration: "0:01",
      thumbnail:
        "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&h=400&fit=crop",
      popular: true,
      description: "Digital glitch effect",
      effects: "Glitch, Static",
      music: "None",
    },
    {
      id: 12,
      name: "Spin Transition",
      category: "Transitions",
      duration: "0:02",
      thumbnail:
        "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=400&fit=crop",
      popular: false,
      description: "360-degree spin cut",
      effects: "Rotation, Motion Blur",
      music: "None",
    },
    {
      id: 13,
      name: "Dissolve",
      category: "Transitions",
      duration: "0:01",
      thumbnail:
        "https://images.unsplash.com/photo-1484417894907-623942c8ee29?w=600&h=400&fit=crop",
      popular: false,
      description: "Classic dissolve fade",
      effects: "Cross Dissolve",
      music: "None",
    },
    {
      id: 14,
      name: "Light Leak",
      category: "Transitions",
      duration: "0:02",
      thumbnail:
        "https://images.unsplash.com/photo-1509343256512-d77a5ae5ca00?w=600&h=400&fit=crop",
      popular: true,
      description: "Cinematic light leak",
      effects: "Light Leak, Flare",
      music: "None",
    },
    {
      id: 15,
      name: "Swipe Up",
      category: "Transitions",
      duration: "0:01",
      thumbnail:
        "https://images.unsplash.com/photo-1487088678257-3a541e6e3922?w=600&h=400&fit=crop",
      popular: true,
      description: "Mobile-style swipe",
      effects: "Swipe, Slide",
      music: "None",
    },
    {
      id: 16,
      name: "Film Burn",
      category: "Transitions",
      duration: "0:02",
      thumbnail:
        "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=600&h=400&fit=crop",
      popular: false,
      description: "Vintage film burn effect",
      effects: "Burn, Vintage",
      music: "None",
    },
  ],
  "Lower Thirds & Text": [
    {
      id: 17,
      name: "Modern Lower Third",
      category: "Lower Thirds & Text",
      duration: "0:05",
      thumbnail:
        "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&h=400&fit=crop",
      popular: true,
      description: "Clean animated name tag",
      effects: "Slide In, Fade",
      music: "None",
    },
    {
      id: 18,
      name: "Glitch Text",
      category: "Lower Thirds & Text",
      duration: "0:03",
      thumbnail:
        "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&h=400&fit=crop",
      popular: true,
      description: "Cyberpunk style text",
      effects: "Glitch, RGB",
      music: "None",
    },
    {
      id: 19,
      name: "Neon Sign Text",
      category: "Lower Thirds & Text",
      duration: "0:04",
      thumbnail:
        "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&h=400&fit=crop",
      popular: true,
      description: "Glowing neon letters",
      effects: "Glow, Flicker",
      music: "None",
    },
    {
      id: 20,
      name: "Typewriter Effect",
      category: "Lower Thirds & Text",
      duration: "0:05",
      thumbnail:
        "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=600&h=400&fit=crop",
      popular: false,
      description: "Letter by letter typing",
      effects: "Type On",
      music: "Typing SFX",
    },
    {
      id: 21,
      name: "3D Title Card",
      category: "Lower Thirds & Text",
      duration: "0:06",
      thumbnail:
        "https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=600&h=400&fit=crop",
      popular: false,
      description: "Extruded 3D text",
      effects: "3D Extrude, Shadow",
      music: "None",
    },
    {
      id: 22,
      name: "Minimal Subtitle",
      category: "Lower Thirds & Text",
      duration: "0:03",
      thumbnail:
        "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&h=400&fit=crop",
      popular: true,
      description: "Simple subtitle box",
      effects: "Fade In/Out",
      music: "None",
    },
    {
      id: 23,
      name: "Call-Out Bubble",
      category: "Lower Thirds & Text",
      duration: "0:04",
      thumbnail:
        "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&h=400&fit=crop",
      popular: false,
      description: "Animated speech bubble",
      effects: "Pop In, Bounce",
      music: "Pop SFX",
    },
    {
      id: 24,
      name: "Title Slate",
      category: "Lower Thirds & Text",
      duration: "0:05",
      thumbnail:
        "https://images.unsplash.com/photo-1550439062-609e1531270e?w=600&h=400&fit=crop",
      popular: false,
      description: "Full screen title card",
      effects: "Zoom, Fade",
      music: "None",
    },
  ],
  "Social Media": [
    {
      id: 25,
      name: "Instagram Story",
      category: "Social Media",
      duration: "0:15",
      thumbnail:
        "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&h=400&fit=crop",
      popular: true,
      description: "Vertical story template",
      effects: "Stickers, Text",
      music: "Upbeat Pop",
    },
    {
      id: 26,
      name: "TikTok Trend",
      category: "Social Media",
      duration: "0:15",
      thumbnail:
        "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=600&h=400&fit=crop",
      popular: true,
      description: "Trending TikTok style",
      effects: "Fast Cuts, Zoom",
      music: "Viral Beat",
    },
    {
      id: 27,
      name: "YouTube Intro",
      category: "Social Media",
      duration: "0:10",
      thumbnail:
        "https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=600&h=400&fit=crop",
      popular: true,
      description: "Channel intro animation",
      effects: "Logo Reveal, Subscribe",
      music: "Energetic",
    },
    {
      id: 28,
      name: "Reel Template",
      category: "Social Media",
      duration: "0:30",
      thumbnail:
        "https://images.unsplash.com/photo-1611162618071-b39a2ec055fb?w=600&h=400&fit=crop",
      popular: true,
      description: "Instagram Reels format",
      effects: "Transitions, Captions",
      music: "Trending Audio",
    },
    {
      id: 29,
      name: "Twitter Video",
      category: "Social Media",
      duration: "0:45",
      thumbnail:
        "https://images.unsplash.com/photo-1611605698335-8b1569810432?w=600&h=400&fit=crop",
      popular: false,
      description: "Square format tweet video",
      effects: "Captions, Logo",
      music: "None",
    },
    {
      id: 30,
      name: "Facebook Ad",
      category: "Social Media",
      duration: "0:30",
      thumbnail:
        "https://images.unsplash.com/photo-1600096194534-95cf5ece04cf?w=600&h=400&fit=crop",
      popular: true,
      description: "Engaging Facebook ad",
      effects: "CTA Button, Text",
      music: "Corporate",
    },
    {
      id: 31,
      name: "Pinterest Pin",
      category: "Social Media",
      duration: "0:06",
      thumbnail:
        "https://images.unsplash.com/photo-1611162618479-ee3d24aaef0b?w=600&h=400&fit=crop",
      popular: false,
      description: "Vertical pin video",
      effects: "Pan, Zoom",
      music: "None",
    },
    {
      id: 32,
      name: "LinkedIn Post",
      category: "Social Media",
      duration: "1:00",
      thumbnail:
        "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=600&h=400&fit=crop",
      popular: false,
      description: "Professional post video",
      effects: "Minimal, Clean",
      music: "Ambient",
    },
  ],
  "Effects & Filters": [
    {
      id: 33,
      name: "VHS Retro",
      category: "Effects & Filters",
      duration: "Variable",
      thumbnail:
        "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=600&h=400&fit=crop",
      popular: true,
      description: "80s VHS tape effect",
      effects: "Scan Lines, Noise, Tracking",
      music: "None",
    },
    {
      id: 34,
      name: "Cinematic LUT",
      category: "Effects & Filters",
      duration: "Variable",
      thumbnail:
        "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=600&h=400&fit=crop",
      popular: true,
      description: "Film-grade color grading",
      effects: "Color Grade, Vignette",
      music: "None",
    },
    {
      id: 35,
      name: "Cyberpunk",
      category: "Effects & Filters",
      duration: "Variable",
      thumbnail:
        "https://images.unsplash.com/photo-1477346611705-65d1883cee1e?w=600&h=400&fit=crop",
      popular: true,
      description: "Futuristic neon look",
      effects: "Neon, Chromatic, Scan",
      music: "None",
    },
    {
      id: 36,
      name: "Film Grain",
      category: "Effects & Filters",
      duration: "Variable",
      thumbnail:
        "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=600&h=400&fit=crop",
      popular: false,
      description: "Authentic film grain texture",
      effects: "Grain, Dust",
      music: "None",
    },
    {
      id: 37,
      name: "Bokeh Blur",
      category: "Effects & Filters",
      duration: "Variable",
      thumbnail:
        "https://images.unsplash.com/photo-1470790376778-a9fbc86d70e2?w=600&h=400&fit=crop",
      popular: true,
      description: "Dreamy bokeh background",
      effects: "Blur, Bokeh Lights",
      music: "None",
    },
    {
      id: 38,
      name: "Slow Motion",
      category: "Effects & Filters",
      duration: "Variable",
      thumbnail:
        "https://images.unsplash.com/photo-1516410529446-2c777cb7366d?w=600&h=400&fit=crop",
      popular: true,
      description: "Smooth 60fps slowmo",
      effects: "Frame Interpolation",
      music: "None",
    },
    {
      id: 39,
      name: "Shake Effect",
      category: "Effects & Filters",
      duration: "Variable",
      thumbnail:
        "https://images.unsplash.com/photo-1527430253228-e93688616381?w=600&h=400&fit=crop",
      popular: false,
      description: "Camera shake for impact",
      effects: "Motion Shake",
      music: "None",
    },
    {
      id: 40,
      name: "Particle Overlay",
      category: "Effects & Filters",
      duration: "Variable",
      thumbnail:
        "https://images.unsplash.com/photo-1502134249126-9f3755a50d78?w=600&h=400&fit=crop",
      popular: true,
      description: "Floating particles effect",
      effects: "Particles, Dust",
      music: "None",
    },
  ],
  "Promo & Ads": [
    {
      id: 41,
      name: "Product Showcase",
      category: "Promo & Ads",
      duration: "0:30",
      thumbnail:
        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=400&fit=crop",
      popular: true,
      description: "Elegant product display",
      effects: "Rotate, Zoom, Glow",
      music: "Modern",
    },
    {
      id: 42,
      name: "Sale Banner",
      category: "Promo & Ads",
      duration: "0:15",
      thumbnail:
        "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&h=400&fit=crop",
      popular: true,
      description: "Eye-catching sale promo",
      effects: "Bold Text, Flash",
      music: "Energetic",
    },
    {
      id: 43,
      name: "App Promo",
      category: "Promo & Ads",
      duration: "0:45",
      thumbnail:
        "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=600&h=400&fit=crop",
      popular: true,
      description: "Mobile app showcase",
      effects: "Screen Mockup, UI",
      music: "Tech",
    },
    {
      id: 44,
      name: "Event Teaser",
      category: "Promo & Ads",
      duration: "0:30",
      thumbnail:
        "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&h=400&fit=crop",
      popular: false,
      description: "Build hype for events",
      effects: "Fast Cuts, Text",
      music: "Epic",
    },
    {
      id: 45,
      name: "Black Friday",
      category: "Promo & Ads",
      duration: "0:20",
      thumbnail:
        "https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=600&h=400&fit=crop",
      popular: true,
      description: "Special offer promo",
      effects: "Countdown, Flash",
      music: "Intense",
    },
    {
      id: 46,
      name: "Brand Video",
      category: "Promo & Ads",
      duration: "1:00",
      thumbnail:
        "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=600&h=400&fit=crop",
      popular: false,
      description: "Tell your brand story",
      effects: "Cinematic, Fade",
      music: "Emotional",
    },
    {
      id: 47,
      name: "Testimonial",
      category: "Promo & Ads",
      duration: "0:45",
      thumbnail:
        "https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=600&h=400&fit=crop",
      popular: false,
      description: "Customer review video",
      effects: "Lower Third, Quote",
      music: "Soft",
    },
    {
      id: 48,
      name: "Coming Soon",
      category: "Promo & Ads",
      duration: "0:15",
      thumbnail:
        "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop",
      popular: true,
      description: "Build anticipation",
      effects: "Countdown, Reveal",
      music: "Suspense",
    },
  ],
};

interface Template {
  id: number;
  name: string;
  category: string;
  duration: string;
  thumbnail: string;
  popular: boolean;
  description: string;
  effects: string;
  music: string;
}

export default function TemplatesClient() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedVideo, setProcessedVideo] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ffmpegRef = useRef<FFmpegInstance | null>(null);

  // Lazy-load FFmpeg only when user triggers processing (not on mount)
  const ensureFFmpegLoaded = useCallback(async (): Promise<FFmpegInstance> => {
    if (ffmpegRef.current && ffmpegLoaded) {
      return ffmpegRef.current;
    }

    toast.info("Loading video processor… This only happens once.");

    const { FFmpeg } = await import("@ffmpeg/ffmpeg");
    const ffmpeg = new FFmpeg();

    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
    await ffmpeg.load({
      coreURL: `${baseURL}/ffmpeg-core.js`,
      wasmURL: `${baseURL}/ffmpeg-core.wasm`,
    });

    ffmpegRef.current = ffmpeg;
    setFfmpegLoaded(true);
    console.log("FFmpeg loaded successfully");
    return ffmpeg;
  }, [ffmpegLoaded]);

  // Professional video editing templates organized by category
  // Get templates based on selected category
  const getFilteredTemplates = () => {
    if (selectedCategory === "All") {
      return Object.values(ALL_TEMPLATES).flat();
    }
    return ALL_TEMPLATES[selectedCategory as keyof typeof ALL_TEMPLATES] || [];
  };

  const filteredTemplates = getFilteredTemplates();

  const saveToProjects = async (
    videoUrl: string,
    template: Template,
    videoFile: File
  ) => {
    try {
      toast.info("Saving project to database...");

      // Convert blob URL to base64 for database storage
      const response = await fetch(videoUrl);
      const blob = await response.blob();

      console.log("Blob size:", blob.size, "bytes");

      // Check if file is too large (>30MB)
      const maxSize = 30 * 1024 * 1024; // 30MB
      if (blob.size > maxSize) {
        toast.warning("Video is large, this may take a moment to save...");
      }

      // Convert blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const base64Video = await base64Promise;

      const result = await createProject({
        name: `${template.name} - ${videoFile.name.split(".")[0]}`,
        type: "template",
        videoUrl: base64Video,
        metadata: {
          templateName: template.name,
          effects: [
            template.effects,
            template.music,
            `Duration: ${template.duration}`,
          ],
        },
      });

      if (result.success) {
        console.log("Project saved successfully to database");
        toast.success("Project saved successfully!");
      } else {
        console.error("Failed to save project:", result.error);
        toast.error("Failed to save project to database");
      }
    } catch (error) {
      console.error("Error saving project:", error);
      toast.error("Failed to save project");
    }
  };

  const handleTemplateClick = (template: Template) => {
    setSelectedTemplate(template);
    setIsDialogOpen(true);
    setSelectedVideo(null);
    setVideoPreview(null);
    setProcessedVideo(null);
  };

  const handleVideoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("video/")) {
        toast.error("Please select a valid video file");
        return;
      }

      // Validate file size (max 500MB)
      if (file.size > 500 * 1024 * 1024) {
        toast.error("Video file size must be less than 500MB");
        return;
      }

      setSelectedVideo(file);

      // Create preview URL
      const url = URL.createObjectURL(file);
      setVideoPreview(url);

      toast.success("Video selected successfully!");
    }
  };

  const handleApplyTemplate = async () => {
    if (!(selectedVideo && selectedTemplate)) {
      toast.error("Please select a video first");
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(0);

    try {
      // Lazy-load FFmpeg + fetchFile only now
      const ffmpeg = await ensureFFmpegLoaded();
      const { fetchFile } = await import("@ffmpeg/util");

      // Track progress
      ffmpeg.on("progress", ({ progress }) => {
        setProcessingProgress(Math.round(progress * 100));
      });

      toast.info("Processing video... This may take a moment.");

      // Write input file to FFmpeg's virtual filesystem
      await ffmpeg.writeFile("input.mp4", await fetchFile(selectedVideo));

      // Apply different effects based on template category
      let ffmpegCommand: string[] = [];

      switch (selectedTemplate.category) {
        case "Intros & Outros":
          // Add fade in/out, remove audio, add brightness
          ffmpegCommand = [
            "-i",
            "input.mp4",
            "-vf",
            "fade=t=in:st=0:d=1,fade=t=out:st=4:d=1,eq=brightness=0.1:contrast=1.2",
            "-an", // Remove audio
            "-c:v",
            "libx264",
            "-preset",
            "ultrafast",
            "output.mp4",
          ];
          break;

        case "Transitions":
          // Add smooth transitions and remove audio
          ffmpegCommand = [
            "-i",
            "input.mp4",
            "-vf",
            "fade=t=in:st=0:d=0.5,fade=t=out:st=4:d=0.5,eq=saturation=1.3",
            "-an",
            "-c:v",
            "libx264",
            "-preset",
            "ultrafast",
            "output.mp4",
          ];
          break;

        case "Lower Thirds & Text":
          // Add contrast and remove audio
          ffmpegCommand = [
            "-i",
            "input.mp4",
            "-vf",
            "eq=contrast=1.3:brightness=0.05",
            "-an",
            "-c:v",
            "libx264",
            "-preset",
            "ultrafast",
            "output.mp4",
          ];
          break;

        case "Social Media":
          // Add vibrant colors and remove audio
          ffmpegCommand = [
            "-i",
            "input.mp4",
            "-vf",
            "eq=saturation=1.5:contrast=1.2:brightness=0.08",
            "-an",
            "-c:v",
            "libx264",
            "-preset",
            "ultrafast",
            "output.mp4",
          ];
          break;

        case "Effects & Filters":
          // Add artistic effects and remove audio
          ffmpegCommand = [
            "-i",
            "input.mp4",
            "-vf",
            "eq=gamma=1.2:saturation=1.4:contrast=1.3",
            "-an",
            "-c:v",
            "libx264",
            "-preset",
            "ultrafast",
            "output.mp4",
          ];
          break;

        case "Promo & Ads":
          // Add dynamic look and remove audio
          ffmpegCommand = [
            "-i",
            "input.mp4",
            "-vf",
            "fade=t=in:st=0:d=0.5,eq=contrast=1.4:saturation=1.3:brightness=0.1",
            "-an",
            "-c:v",
            "libx264",
            "-preset",
            "ultrafast",
            "output.mp4",
          ];
          break;

        default:
          // Default processing - remove audio and enhance
          ffmpegCommand = [
            "-i",
            "input.mp4",
            "-vf",
            "eq=contrast=1.2:saturation=1.2",
            "-an",
            "-c:v",
            "libx264",
            "-preset",
            "ultrafast",
            "output.mp4",
          ];
      }

      // Execute FFmpeg command
      await ffmpeg.exec(ffmpegCommand);

      // Read the output file
      const data = await ffmpeg.readFile("output.mp4");

      // Create blob URL for the processed video
      const uint8 = data as Uint8Array;
      const blob = new Blob([new Uint8Array(uint8)], { type: "video/mp4" });
      const url = URL.createObjectURL(blob);

      setProcessedVideo(url);
      setProcessingProgress(100);

      // Save to projects
      saveToProjects(url, selectedTemplate, selectedVideo);

      toast.success("Template applied! Video saved to My Projects.", {
        action: {
          label: "View Projects",
          onClick: () => (window.location.href = "/dashboard/my-projects"),
        },
      });

      // Clean up FFmpeg files
      await ffmpeg.deleteFile("input.mp4");
      await ffmpeg.deleteFile("output.mp4");
    } catch (error) {
      console.error("Video processing error:", error);
      toast.error(
        "Failed to apply template. Please try again with a smaller video."
      );
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  };

  const handleDownloadVideo = async () => {
    if (!(processedVideo && selectedTemplate)) {
      toast.error("No processed video to download");
      return;
    }

    setIsDownloading(true);

    try {
      // Fetch the video blob
      const response = await fetch(processedVideo);
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${selectedTemplate.name.replace(/\s+/g, "_")}_edited_${Date.now()}.mp4`;

      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Video downloaded successfully!");
    } catch (error) {
      toast.error("Failed to download video. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedVideo(null);
    setVideoPreview(null);
    setProcessedVideo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleStartOver = () => {
    setSelectedVideo(null);
    setVideoPreview(null);
    setProcessedVideo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDownloadProcessed = async () => {
    if (!(processedVideo && selectedTemplate)) {
      toast.error("No processed video available");
      return;
    }

    setIsDownloading(true);

    try {
      // Create a temporary link and trigger download
      const link = document.createElement("a");
      link.href = processedVideo;
      link.download = `${selectedTemplate.name.replace(/\s+/g, "_")}_${Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Video downloaded successfully!");
    } catch (error) {
      toast.error("Failed to download video");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCloseModal = () => {
    setIsDialogOpen(false);
    // Reset states after a short delay to avoid UI flicker
    setTimeout(() => {
      setSelectedVideo(null);
      setVideoPreview(null);
      setProcessedVideo(null);
      setSelectedTemplate(null);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1408] via-[#2d1f0e] to-[#1a1408] text-white">
      <div className="pt-16">
        <div className="mx-auto max-w-[1600px] space-y-6 p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <Link
                className="mb-4 inline-flex items-center gap-2 text-purple-400 transition-colors hover:text-purple-300"
                href="/dashboard"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Link>
              <h1 className="flex items-center gap-3 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text font-bold text-5xl text-transparent">
                <Video className="h-12 w-12 text-purple-400" />
                Professional Templates
              </h1>
              <p className="mt-2 text-gray-400 text-lg">
                Choose from{" "}
                <span className="font-semibold text-purple-400">
                  {filteredTemplates.length}
                </span>{" "}
                professionally designed templates • Free to use
              </p>
            </div>
          </div>

          {/* Category Filter */}
          <div className="scrollbar-hide flex gap-3 overflow-x-auto pb-2">
            {CATEGORIES.map((category) => {
              const Icon = CATEGORY_ICONS[category];
              return (
                <button
                  className={cn(
                    "flex items-center gap-2 whitespace-nowrap rounded-xl border px-5 py-3 font-medium transition-all",
                    category === selectedCategory
                      ? "border-purple-500 bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/50"
                      : "border-purple-500/20 bg-white/5 text-gray-400 hover:border-purple-500/40 hover:bg-white/10 hover:text-white"
                  )}
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  {category}
                  {category !== "All" && (
                    <span
                      className={cn(
                        "ml-1 rounded-full px-2 py-0.5 text-xs",
                        category === selectedCategory
                          ? "bg-white/20"
                          : "bg-purple-500/20"
                      )}
                    >
                      {ALL_TEMPLATES[category as keyof typeof ALL_TEMPLATES]
                        ?.length || 0}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredTemplates.map((template) => (
              <div
                className="group hover:-translate-y-1 relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#16213e] transition-all duration-300 hover:border-purple-500/60 hover:shadow-purple-500/20 hover:shadow-xl"
                key={template.id}
              >
                {/* Thumbnail */}
                <div className="relative aspect-video overflow-hidden bg-black">
                  <img
                    alt={template.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    src={template.thumbnail}
                  />
                  {/* Play Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black via-black/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg shadow-purple-500/50 transition-transform group-hover:scale-110">
                      <Play className="ml-1 h-8 w-8 text-white" fill="white" />
                    </div>
                  </div>

                  {/* Popular Badge */}
                  {template.popular && (
                    <div className="absolute top-3 left-3 z-10">
                      <Badge className="border-0 bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg">
                        <TrendingUp className="mr-1 h-3 w-3" />
                        Popular
                      </Badge>
                    </div>
                  )}

                  {/* Duration Badge */}
                  <div className="absolute top-3 right-3 z-10">
                    <Badge className="border-0 bg-black/70 text-white backdrop-blur-sm">
                      <Clock className="mr-1 h-3 w-3" />
                      {template.duration}
                    </Badge>
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-3 p-5">
                  {/* Title & Category */}
                  <div>
                    <h3 className="line-clamp-1 font-bold text-lg text-white transition-colors group-hover:text-purple-300">
                      {template.name}
                    </h3>
                    <p className="font-medium text-purple-400 text-sm">
                      {template.category}
                    </p>
                  </div>

                  {/* Description */}
                  <p className="line-clamp-2 text-gray-400 text-sm">
                    {template.description}
                  </p>

                  {/* Effects & Music */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-start gap-2">
                      <Wand2 className="mt-0.5 h-3 w-3 flex-shrink-0 text-purple-400" />
                      <span className="line-clamp-1 text-gray-400">
                        {template.effects}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <svg
                        className="mt-0.5 h-3 w-3 flex-shrink-0 text-purple-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                      </svg>
                      <span className="line-clamp-1 text-gray-400">
                        {template.music}
                      </span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <Button
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 font-semibold text-white shadow-lg transition-all hover:from-purple-500 hover:to-pink-500 hover:shadow-xl"
                    onClick={() => handleTemplateClick(template)}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Use Template
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {filteredTemplates.length === 0 && (
            <div className="py-20 text-center">
              <Video className="mx-auto mb-4 h-16 w-16 text-purple-400 opacity-50" />
              <h3 className="mb-2 font-semibold text-white text-xl">
                No templates found
              </h3>
              <p className="text-gray-400">
                Try selecting a different category
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Template Selection Modal */}
      <Dialog onOpenChange={setIsDialogOpen} open={isDialogOpen}>
        <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col border-purple-500/50 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] text-white">
          <DialogHeader>
            <DialogTitle className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text font-bold text-2xl text-transparent">
              Apply Template: {selectedTemplate?.name}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Select a video from your device to apply this template
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex-1 space-y-6 overflow-y-auto pr-2">
            {/* Show Processed Video Result */}
            {processedVideo ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="flex items-center gap-2 font-semibold text-green-400 text-lg">
                    <CheckCircle className="h-5 w-5" />
                    Video Processed Successfully!
                  </h4>
                </div>

                {/* Processed Video Player */}
                <div className="relative aspect-video overflow-hidden rounded-lg border-2 border-green-500/50 bg-black shadow-green-500/20 shadow-lg">
                  <video
                    autoPlay
                    className="h-full w-full object-contain"
                    controls
                    src={processedVideo}
                  />
                </div>

                {/* Template Info */}
                <div className="grid grid-cols-2 gap-4 rounded-lg border border-purple-500/30 bg-purple-900/20 p-4">
                  <div>
                    <p className="mb-1 text-gray-400 text-sm">
                      Template Applied
                    </p>
                    <p className="font-semibold text-white">
                      {selectedTemplate?.name}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-gray-400 text-sm">Effects Used</p>
                    <p className="text-sm text-white">
                      {selectedTemplate?.effects}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    className="flex-1 border-purple-500/50 text-white hover:bg-purple-900/20"
                    onClick={() => {
                      setProcessedVideo(null);
                      setSelectedVideo(null);
                      setVideoPreview(null);
                    }}
                    variant="outline"
                  >
                    Process Another Video
                  </Button>
                  <Button
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500"
                    disabled={isDownloading}
                    onClick={handleDownloadVideo}
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Download Video
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Template Preview with Video Player */}
                <div className="space-y-3">
                  <h4 className="flex items-center gap-2 font-semibold text-purple-300 text-sm">
                    <Play className="h-4 w-4" />
                    Template Preview - Click to Play
                  </h4>
                  <div className="group/preview relative aspect-video overflow-hidden rounded-lg border border-purple-500/30 bg-black">
                    {/* Thumbnail preview with CapCut link */}
                    <img
                      alt={selectedTemplate?.name}
                      className="h-full w-full object-cover"
                      src={selectedTemplate?.thumbnail}
                    />
                    {/* CapCut template link overlay */}
                    <a
                      className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 opacity-0 transition-opacity duration-300 group-hover/preview:opacity-100"
                      href={
                        CAPCUT_TEMPLATES[
                          selectedTemplate?.category || "Promo & Ads"
                        ]
                      }
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <div className="mb-2 rounded-full bg-purple-600 p-3 text-white transition-colors hover:bg-purple-500">
                        <Play className="h-6 w-6" />
                      </div>
                      <span className="font-medium text-sm text-white">
                        View on CapCut
                      </span>
                    </a>
                    <div className="pointer-events-none absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-3">
                      <div className="space-y-1">
                        <p className="font-semibold text-sm text-white">
                          {selectedTemplate?.name}
                        </p>
                        <p className="text-gray-300 text-xs">
                          {selectedTemplate?.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Template Details */}
                  <div className="grid grid-cols-3 gap-3 rounded-lg border border-purple-500/30 bg-purple-900/20 p-3">
                    <div className="text-center">
                      <Clock className="mx-auto mb-1 h-4 w-4 text-purple-400" />
                      <p className="text-gray-400 text-xs">Duration</p>
                      <p className="font-medium text-sm text-white">
                        {selectedTemplate?.duration}
                      </p>
                    </div>
                    <div className="border-purple-500/30 border-x text-center">
                      <Wand2 className="mx-auto mb-1 h-4 w-4 text-purple-400" />
                      <p className="text-gray-400 text-xs">Effects</p>
                      <p className="line-clamp-1 font-medium text-sm text-white">
                        {selectedTemplate?.effects?.split(",")[0]}
                      </p>
                    </div>
                    <div className="text-center">
                      <svg
                        className="mx-auto mb-1 h-4 w-4 text-purple-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                      </svg>
                      <p className="text-gray-400 text-xs">Music</p>
                      <p className="line-clamp-1 font-medium text-sm text-white">
                        {selectedTemplate?.music}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Video Upload Section */}
                <div>
                  <h4 className="mb-3 flex items-center gap-2 font-semibold text-purple-300 text-sm">
                    <Upload className="h-4 w-4" />
                    Select Your Video
                  </h4>

                  {/* Processing Info */}
                  <div className="mb-3 rounded-lg border border-blue-500/30 bg-blue-900/20 p-3">
                    <p className="flex items-start gap-2 text-blue-300 text-xs">
                      <Sparkles className="mt-0.5 h-3 w-3 flex-shrink-0" />
                      <span>
                        Template will remove original audio, voice, and music
                        from your video and apply professional effects.
                      </span>
                    </p>
                  </div>

                  {selectedVideo ? (
                    <div className="space-y-3">
                      {/* Video Preview */}
                      {videoPreview && (
                        <div className="relative aspect-video overflow-hidden rounded-lg border border-purple-500/30 bg-black">
                          <video
                            className="h-full w-full object-contain"
                            controls
                            src={videoPreview}
                          />
                        </div>
                      )}

                      {/* Selected File Info */}
                      <div className="flex items-center justify-between rounded-lg border border-purple-500/30 bg-purple-900/20 p-4">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-green-400" />
                          <div>
                            <p className="font-medium text-white">
                              {selectedVideo.name}
                            </p>
                            <p className="text-gray-400 text-sm">
                              {(selectedVideo.size / (1024 * 1024)).toFixed(2)}{" "}
                              MB
                            </p>
                          </div>
                        </div>
                        <Button
                          className="text-red-400 hover:bg-red-900/20 hover:text-red-300"
                          onClick={() => {
                            setSelectedVideo(null);
                            setVideoPreview(null);
                            if (fileInputRef.current) {
                              fileInputRef.current.value = "";
                            }
                          }}
                          size="sm"
                          variant="ghost"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Change Video Button */}
                      <Button
                        className="w-full border-purple-500/50 text-purple-300 hover:bg-purple-900/20"
                        disabled={isProcessing}
                        onClick={() => fileInputRef.current?.click()}
                        variant="outline"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Change Video
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="cursor-pointer rounded-xl border-2 border-purple-500/50 border-dashed p-8 text-center transition-all hover:border-purple-500 hover:bg-purple-500/5"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="mx-auto mb-3 h-12 w-12 text-purple-400" />
                      <p className="mb-1 font-medium text-white">
                        Click to upload video
                      </p>
                      <p className="text-gray-400 text-sm">
                        MP4, MOV, AVI up to 500MB
                      </p>
                      <input
                        accept="video/*"
                        className="hidden"
                        onChange={handleVideoSelect}
                        ref={fileInputRef}
                        type="file"
                      />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Sticky Action Buttons */}
          {!processedVideo && (
            <div className="sticky bottom-0 mt-4 border-purple-500/30 border-t bg-gradient-to-t from-[#0f0f1e] via-[#0f0f1e] to-transparent pt-4 pb-2">
              <div className="flex gap-3">
                <Button
                  className="flex-1 border-purple-500/50 text-white hover:bg-purple-900/20"
                  disabled={isProcessing}
                  onClick={() => setIsDialogOpen(false)}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!selectedVideo || isProcessing}
                  onClick={handleApplyTemplate}
                >
                  {isProcessing ? (
                    <div className="flex w-full flex-col items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Processing... {processingProgress}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-purple-900/30">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                          style={{ width: `${processingProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Apply Template
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add scrollbar hiding */}
      <style global jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
