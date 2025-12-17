"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Play, Clock, Sparkles, TrendingUp, Download, Zap, Film, Type, Share2, Wand2, Video, Upload, X, CheckCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { createProject } from "@/server/projects";

// Demo video URLs for different template categories
const DEMO_VIDEOS: Record<string, string> = {
  "Intros & Outros": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "Transitions": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  "Lower Thirds & Text": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
  "Social Media": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
  "Effects & Filters": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
  "Promo & Ads": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
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
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedVideo, setProcessedVideo] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);

  // Load FFmpeg on component mount
  useEffect(() => {
    // Only initialize FFmpeg on client side
    if (typeof window !== 'undefined') {
      ffmpegRef.current = new FFmpeg();
      loadFFmpeg();
    }
  }, []);

  const loadFFmpeg = async () => {
    const ffmpeg = ffmpegRef.current;
    
    if (!ffmpeg) {
      console.error('FFmpeg not initialized');
      return;
    }
    
    try {
      // Load FFmpeg core directly from CDN
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      await ffmpeg.load({
        coreURL: `${baseURL}/ffmpeg-core.js`,
        wasmURL: `${baseURL}/ffmpeg-core.wasm`,
      });
      
      setFfmpegLoaded(true);
      console.log('FFmpeg loaded successfully');
    } catch (error) {
      console.error('Failed to load FFmpeg:', error);
      toast.error('Video processing library failed to load');
    }
  };

  // Professional video editing templates organized by category
  const allTemplates = {
    "Intros & Outros": [
      { id: 1, name: "Cinematic Logo Reveal", category: "Intros & Outros", duration: "0:05", thumbnail: "https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=600&h=400&fit=crop", popular: true, description: "Epic cinematic intro with particle effects", effects: "Particles, Glow, Zoom", music: "Epic Orchestral" },
      { id: 2, name: "Modern Glitch Intro", category: "Intros & Outros", duration: "0:08", thumbnail: "https://images.unsplash.com/photo-1536240478700-b869070f9279?w=600&h=400&fit=crop", popular: true, description: "Urban glitch effect opener", effects: "Glitch, RGB Split, Distortion", music: "Electronic Beat" },
      { id: 3, name: "Minimal Line Animation", category: "Intros & Outros", duration: "0:06", thumbnail: "https://images.unsplash.com/photo-1557683316-973673baf926?w=600&h=400&fit=crop", popular: false, description: "Clean and professional line reveal", effects: "Line Animation, Fade", music: "Ambient" },
      { id: 4, name: "Neon Light Intro", category: "Intros & Outros", duration: "0:07", thumbnail: "https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=600&h=400&fit=crop", popular: true, description: "Vibrant neon glow animation", effects: "Neon Glow, Flicker", music: "Synthwave" },
      { id: 5, name: "3D Text Reveal", category: "Intros & Outros", duration: "0:10", thumbnail: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop", popular: false, description: "3D rotating text animation", effects: "3D Rotation, Depth", music: "Modern Pop" },
      { id: 6, name: "Fire Logo Burn", category: "Intros & Outros", duration: "0:08", thumbnail: "https://images.unsplash.com/photo-1525909002-1b05e0c869d8?w=600&h=400&fit=crop", popular: true, description: "Dramatic fire reveal effect", effects: "Fire, Smoke, Heat Distortion", music: "Dark Epic" },
      { id: 7, name: "Particle Explosion", category: "Intros & Outros", duration: "0:06", thumbnail: "https://images.unsplash.com/photo-1519810755548-39cd217da494?w=600&h=400&fit=crop", popular: false, description: "Dynamic particle burst intro", effects: "Particles, Bloom", music: "Uplifting" },
      { id: 8, name: "Corporate Clean Outro", category: "Intros & Outros", duration: "0:05", thumbnail: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop", popular: false, description: "Professional business ending", effects: "Fade, Slide", music: "Corporate" },
    ],
    "Transitions": [
      { id: 9, name: "Smooth Zoom", category: "Transitions", duration: "0:01", thumbnail: "https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?w=600&h=400&fit=crop", popular: true, description: "Seamless zoom transition", effects: "Zoom, Blur", music: "None" },
      { id: 10, name: "Slide Wipe", category: "Transitions", duration: "0:01", thumbnail: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=600&h=400&fit=crop", popular: true, description: "Dynamic slide wipe effect", effects: "Slide, Wipe", music: "None" },
      { id: 11, name: "Glitch Transition", category: "Transitions", duration: "0:01", thumbnail: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&h=400&fit=crop", popular: true, description: "Digital glitch effect", effects: "Glitch, Static", music: "None" },
      { id: 12, name: "Spin Transition", category: "Transitions", duration: "0:02", thumbnail: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=400&fit=crop", popular: false, description: "360-degree spin cut", effects: "Rotation, Motion Blur", music: "None" },
      { id: 13, name: "Dissolve", category: "Transitions", duration: "0:01", thumbnail: "https://images.unsplash.com/photo-1484417894907-623942c8ee29?w=600&h=400&fit=crop", popular: false, description: "Classic dissolve fade", effects: "Cross Dissolve", music: "None" },
      { id: 14, name: "Light Leak", category: "Transitions", duration: "0:02", thumbnail: "https://images.unsplash.com/photo-1509343256512-d77a5ae5ca00?w=600&h=400&fit=crop", popular: true, description: "Cinematic light leak", effects: "Light Leak, Flare", music: "None" },
      { id: 15, name: "Swipe Up", category: "Transitions", duration: "0:01", thumbnail: "https://images.unsplash.com/photo-1487088678257-3a541e6e3922?w=600&h=400&fit=crop", popular: true, description: "Mobile-style swipe", effects: "Swipe, Slide", music: "None" },
      { id: 16, name: "Film Burn", category: "Transitions", duration: "0:02", thumbnail: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=600&h=400&fit=crop", popular: false, description: "Vintage film burn effect", effects: "Burn, Vintage", music: "None" },
    ],
    "Lower Thirds & Text": [
      { id: 17, name: "Modern Lower Third", category: "Lower Thirds & Text", duration: "0:05", thumbnail: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&h=400&fit=crop", popular: true, description: "Clean animated name tag", effects: "Slide In, Fade", music: "None" },
      { id: 18, name: "Glitch Text", category: "Lower Thirds & Text", duration: "0:03", thumbnail: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&h=400&fit=crop", popular: true, description: "Cyberpunk style text", effects: "Glitch, RGB", music: "None" },
      { id: 19, name: "Neon Sign Text", category: "Lower Thirds & Text", duration: "0:04", thumbnail: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&h=400&fit=crop", popular: true, description: "Glowing neon letters", effects: "Glow, Flicker", music: "None" },
      { id: 20, name: "Typewriter Effect", category: "Lower Thirds & Text", duration: "0:05", thumbnail: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=600&h=400&fit=crop", popular: false, description: "Letter by letter typing", effects: "Type On", music: "Typing SFX" },
      { id: 21, name: "3D Title Card", category: "Lower Thirds & Text", duration: "0:06", thumbnail: "https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=600&h=400&fit=crop", popular: false, description: "Extruded 3D text", effects: "3D Extrude, Shadow", music: "None" },
      { id: 22, name: "Minimal Subtitle", category: "Lower Thirds & Text", duration: "0:03", thumbnail: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&h=400&fit=crop", popular: true, description: "Simple subtitle box", effects: "Fade In/Out", music: "None" },
      { id: 23, name: "Call-Out Bubble", category: "Lower Thirds & Text", duration: "0:04", thumbnail: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&h=400&fit=crop", popular: false, description: "Animated speech bubble", effects: "Pop In, Bounce", music: "Pop SFX" },
      { id: 24, name: "Title Slate", category: "Lower Thirds & Text", duration: "0:05", thumbnail: "https://images.unsplash.com/photo-1550439062-609e1531270e?w=600&h=400&fit=crop", popular: false, description: "Full screen title card", effects: "Zoom, Fade", music: "None" },
    ],
    "Social Media": [
      { id: 25, name: "Instagram Story", category: "Social Media", duration: "0:15", thumbnail: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&h=400&fit=crop", popular: true, description: "Vertical story template", effects: "Stickers, Text", music: "Upbeat Pop" },
      { id: 26, name: "TikTok Trend", category: "Social Media", duration: "0:15", thumbnail: "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=600&h=400&fit=crop", popular: true, description: "Trending TikTok style", effects: "Fast Cuts, Zoom", music: "Viral Beat" },
      { id: 27, name: "YouTube Intro", category: "Social Media", duration: "0:10", thumbnail: "https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=600&h=400&fit=crop", popular: true, description: "Channel intro animation", effects: "Logo Reveal, Subscribe", music: "Energetic" },
      { id: 28, name: "Reel Template", category: "Social Media", duration: "0:30", thumbnail: "https://images.unsplash.com/photo-1611162618071-b39a2ec055fb?w=600&h=400&fit=crop", popular: true, description: "Instagram Reels format", effects: "Transitions, Captions", music: "Trending Audio" },
      { id: 29, name: "Twitter Video", category: "Social Media", duration: "0:45", thumbnail: "https://images.unsplash.com/photo-1611605698335-8b1569810432?w=600&h=400&fit=crop", popular: false, description: "Square format tweet video", effects: "Captions, Logo", music: "None" },
      { id: 30, name: "Facebook Ad", category: "Social Media", duration: "0:30", thumbnail: "https://images.unsplash.com/photo-1600096194534-95cf5ece04cf?w=600&h=400&fit=crop", popular: true, description: "Engaging Facebook ad", effects: "CTA Button, Text", music: "Corporate" },
      { id: 31, name: "Pinterest Pin", category: "Social Media", duration: "0:06", thumbnail: "https://images.unsplash.com/photo-1611162618479-ee3d24aaef0b?w=600&h=400&fit=crop", popular: false, description: "Vertical pin video", effects: "Pan, Zoom", music: "None" },
      { id: 32, name: "LinkedIn Post", category: "Social Media", duration: "1:00", thumbnail: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=600&h=400&fit=crop", popular: false, description: "Professional post video", effects: "Minimal, Clean", music: "Ambient" },
    ],
    "Effects & Filters": [
      { id: 33, name: "VHS Retro", category: "Effects & Filters", duration: "Variable", thumbnail: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=600&h=400&fit=crop", popular: true, description: "80s VHS tape effect", effects: "Scan Lines, Noise, Tracking", music: "None" },
      { id: 34, name: "Cinematic LUT", category: "Effects & Filters", duration: "Variable", thumbnail: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=600&h=400&fit=crop", popular: true, description: "Film-grade color grading", effects: "Color Grade, Vignette", music: "None" },
      { id: 35, name: "Cyberpunk", category: "Effects & Filters", duration: "Variable", thumbnail: "https://images.unsplash.com/photo-1477346611705-65d1883cee1e?w=600&h=400&fit=crop", popular: true, description: "Futuristic neon look", effects: "Neon, Chromatic, Scan", music: "None" },
      { id: 36, name: "Film Grain", category: "Effects & Filters", duration: "Variable", thumbnail: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=600&h=400&fit=crop", popular: false, description: "Authentic film grain texture", effects: "Grain, Dust", music: "None" },
      { id: 37, name: "Bokeh Blur", category: "Effects & Filters", duration: "Variable", thumbnail: "https://images.unsplash.com/photo-1470790376778-a9fbc86d70e2?w=600&h=400&fit=crop", popular: true, description: "Dreamy bokeh background", effects: "Blur, Bokeh Lights", music: "None" },
      { id: 38, name: "Slow Motion", category: "Effects & Filters", duration: "Variable", thumbnail: "https://images.unsplash.com/photo-1516410529446-2c777cb7366d?w=600&h=400&fit=crop", popular: true, description: "Smooth 60fps slowmo", effects: "Frame Interpolation", music: "None" },
      { id: 39, name: "Shake Effect", category: "Effects & Filters", duration: "Variable", thumbnail: "https://images.unsplash.com/photo-1527430253228-e93688616381?w=600&h=400&fit=crop", popular: false, description: "Camera shake for impact", effects: "Motion Shake", music: "None" },
      { id: 40, name: "Particle Overlay", category: "Effects & Filters", duration: "Variable", thumbnail: "https://images.unsplash.com/photo-1502134249126-9f3755a50d78?w=600&h=400&fit=crop", popular: true, description: "Floating particles effect", effects: "Particles, Dust", music: "None" },
    ],
    "Promo & Ads": [
      { id: 41, name: "Product Showcase", category: "Promo & Ads", duration: "0:30", thumbnail: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=400&fit=crop", popular: true, description: "Elegant product display", effects: "Rotate, Zoom, Glow", music: "Modern" },
      { id: 42, name: "Sale Banner", category: "Promo & Ads", duration: "0:15", thumbnail: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&h=400&fit=crop", popular: true, description: "Eye-catching sale promo", effects: "Bold Text, Flash", music: "Energetic" },
      { id: 43, name: "App Promo", category: "Promo & Ads", duration: "0:45", thumbnail: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=600&h=400&fit=crop", popular: true, description: "Mobile app showcase", effects: "Screen Mockup, UI", music: "Tech" },
      { id: 44, name: "Event Teaser", category: "Promo & Ads", duration: "0:30", thumbnail: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&h=400&fit=crop", popular: false, description: "Build hype for events", effects: "Fast Cuts, Text", music: "Epic" },
      { id: 45, name: "Black Friday", category: "Promo & Ads", duration: "0:20", thumbnail: "https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=600&h=400&fit=crop", popular: true, description: "Special offer promo", effects: "Countdown, Flash", music: "Intense" },
      { id: 46, name: "Brand Video", category: "Promo & Ads", duration: "1:00", thumbnail: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=600&h=400&fit=crop", popular: false, description: "Tell your brand story", effects: "Cinematic, Fade", music: "Emotional" },
      { id: 47, name: "Testimonial", category: "Promo & Ads", duration: "0:45", thumbnail: "https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=600&h=400&fit=crop", popular: false, description: "Customer review video", effects: "Lower Third, Quote", music: "Soft" },
      { id: 48, name: "Coming Soon", category: "Promo & Ads", duration: "0:15", thumbnail: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop", popular: true, description: "Build anticipation", effects: "Countdown, Reveal", music: "Suspense" },
    ],
  };

  const categories = ["All", "Intros & Outros", "Transitions", "Lower Thirds & Text", "Social Media", "Effects & Filters", "Promo & Ads"];

  // Category icons
  const categoryIcons: Record<string, any> = {
    "All": Sparkles,
    "Intros & Outros": Film,
    "Transitions": Zap,
    "Lower Thirds & Text": Type,
    "Social Media": Share2,
    "Effects & Filters": Wand2,
    "Promo & Ads": TrendingUp,
  };

  // Get templates based on selected category
  const getFilteredTemplates = () => {
    if (selectedCategory === "All") {
      return Object.values(allTemplates).flat();
    }
    return allTemplates[selectedCategory as keyof typeof allTemplates] || [];
  };

  const filteredTemplates = getFilteredTemplates();

  const saveToProjects = async (videoUrl: string, template: Template, videoFile: File) => {
    try {
      toast.info('Saving project to database...');
      
      // Convert blob URL to base64 for database storage
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      
      console.log('Blob size:', blob.size, 'bytes');
      
      // Check if file is too large (>30MB)
      const maxSize = 30 * 1024 * 1024; // 30MB
      if (blob.size > maxSize) {
        toast.warning('Video is large, this may take a moment to save...');
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
        name: `${template.name} - ${videoFile.name.split('.')[0]}`,
        type: "template",
        videoUrl: base64Video,
        metadata: {
          templateName: template.name,
          effects: [template.effects, template.music, `Duration: ${template.duration}`],
        }
      });

      if (!result.success) {
        console.error('Failed to save project:', result.error);
        toast.error('Failed to save project to database');
      } else {
        console.log('Project saved successfully to database');
        toast.success('Project saved successfully!');
      }
    } catch (error) {
      console.error('Error saving project:', error);
      toast.error('Failed to save project');
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
      if (!file.type.startsWith('video/')) {
        toast.error('Please select a valid video file');
        return;
      }

      // Validate file size (max 500MB)
      if (file.size > 500 * 1024 * 1024) {
        toast.error('Video file size must be less than 500MB');
        return;
      }

      setSelectedVideo(file);
      
      // Create preview URL
      const url = URL.createObjectURL(file);
      setVideoPreview(url);
      
      toast.success('Video selected successfully!');
    }
  };

  const handleApplyTemplate = async () => {
    if (!selectedVideo || !selectedTemplate) {
      toast.error('Please select a video first');
      return;
    }

    if (!ffmpegLoaded || !ffmpegRef.current) {
      toast.error('Video processing is still loading. Please wait...');
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(0);
    
    try {
      const ffmpeg = ffmpegRef.current;
      
      // Track progress
      ffmpeg.on('progress', ({ progress }) => {
        setProcessingProgress(Math.round(progress * 100));
      });

      toast.info('Processing video... This may take a moment.');
      
      // Write input file to FFmpeg's virtual filesystem
      await ffmpeg.writeFile('input.mp4', await fetchFile(selectedVideo));
      
      // Apply different effects based on template category
      let ffmpegCommand: string[] = [];
      
      switch (selectedTemplate.category) {
        case "Intros & Outros":
          // Add fade in/out, remove audio, add brightness
          ffmpegCommand = [
            '-i', 'input.mp4',
            '-vf', 'fade=t=in:st=0:d=1,fade=t=out:st=4:d=1,eq=brightness=0.1:contrast=1.2',
            '-an', // Remove audio
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            'output.mp4'
          ];
          break;
          
        case "Transitions":
          // Add smooth transitions and remove audio
          ffmpegCommand = [
            '-i', 'input.mp4',
            '-vf', 'fade=t=in:st=0:d=0.5,fade=t=out:st=4:d=0.5,eq=saturation=1.3',
            '-an',
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            'output.mp4'
          ];
          break;
          
        case "Lower Thirds & Text":
          // Add contrast and remove audio
          ffmpegCommand = [
            '-i', 'input.mp4',
            '-vf', 'eq=contrast=1.3:brightness=0.05',
            '-an',
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            'output.mp4'
          ];
          break;
          
        case "Social Media":
          // Add vibrant colors and remove audio
          ffmpegCommand = [
            '-i', 'input.mp4',
            '-vf', 'eq=saturation=1.5:contrast=1.2:brightness=0.08',
            '-an',
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            'output.mp4'
          ];
          break;
          
        case "Effects & Filters":
          // Add artistic effects and remove audio
          ffmpegCommand = [
            '-i', 'input.mp4',
            '-vf', 'eq=gamma=1.2:saturation=1.4:contrast=1.3',
            '-an',
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            'output.mp4'
          ];
          break;
          
        case "Promo & Ads":
          // Add dynamic look and remove audio
          ffmpegCommand = [
            '-i', 'input.mp4',
            '-vf', 'fade=t=in:st=0:d=0.5,eq=contrast=1.4:saturation=1.3:brightness=0.1',
            '-an',
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            'output.mp4'
          ];
          break;
          
        default:
          // Default processing - remove audio and enhance
          ffmpegCommand = [
            '-i', 'input.mp4',
            '-vf', 'eq=contrast=1.2:saturation=1.2',
            '-an',
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            'output.mp4'
          ];
      }
      
      // Execute FFmpeg command
      await ffmpeg.exec(ffmpegCommand);
      
      // Read the output file
      const data = await ffmpeg.readFile('output.mp4');
      
      // Create blob URL for the processed video
      const blob = new Blob([data.buffer], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      
      setProcessedVideo(url);
      setProcessingProgress(100);
      
      // Save to projects
      saveToProjects(url, selectedTemplate, selectedVideo);
      
      toast.success(`Template applied! Video saved to My Projects.`, {
        action: {
          label: 'View Projects',
          onClick: () => window.location.href = '/dashboard/my-projects'
        }
      });
      
      // Clean up FFmpeg files
      await ffmpeg.deleteFile('input.mp4');
      await ffmpeg.deleteFile('output.mp4');
      
    } catch (error) {
      console.error('Video processing error:', error);
      toast.error('Failed to apply template. Please try again with a smaller video.');
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  };

  const handleDownloadVideo = async () => {
    if (!processedVideo || !selectedTemplate) {
      toast.error('No processed video to download');
      return;
    }

    setIsDownloading(true);
    
    try {
      // Fetch the video blob
      const response = await fetch(processedVideo);
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedTemplate.name.replace(/\s+/g, '_')}_edited_${Date.now()}.mp4`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Video downloaded successfully!');
      
    } catch (error) {
      toast.error('Failed to download video. Please try again.');
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
      fileInputRef.current.value = '';
    }
  };

  const handleStartOver = () => {
    setSelectedVideo(null);
    setVideoPreview(null);
    setProcessedVideo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownloadProcessed = async () => {
    if (!processedVideo || !selectedTemplate) {
      toast.error('No processed video available');
      return;
    }

    setIsDownloading(true);
    
    try {
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = processedVideo;
      link.download = `${selectedTemplate.name.replace(/\s+/g, '_')}_${Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Video downloaded successfully!');
    } catch (error) {
      toast.error('Failed to download video');
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
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a0f2e] to-[#0a0a0a] text-white">
      <div className="pt-16">
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <Link 
                href="/dashboard" 
                className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-4 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Link>
              <h1 className="text-5xl font-bold flex items-center gap-3 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                <Video className="w-12 h-12 text-purple-400" />
                Professional Templates
              </h1>
              <p className="text-gray-400 mt-2 text-lg">
                Choose from <span className="text-purple-400 font-semibold">{filteredTemplates.length}</span> professionally designed templates • Free to use
              </p>
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((category) => {
              const Icon = categoryIcons[category];
              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={cn(
                    "px-5 py-3 rounded-xl font-medium transition-all whitespace-nowrap flex items-center gap-2 border",
                    category === selectedCategory
                      ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white border-purple-500 shadow-lg shadow-purple-500/50" 
                      : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border-purple-500/20 hover:border-purple-500/40"
                  )}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  {category}
                  {category !== "All" && (
                    <span className={cn(
                      "ml-1 px-2 py-0.5 rounded-full text-xs",
                      category === selectedCategory ? "bg-white/20" : "bg-purple-500/20"
                    )}>
                      {allTemplates[category as keyof typeof allTemplates]?.length || 0}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="group relative bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border border-purple-500/30 rounded-2xl overflow-hidden hover:border-purple-500/60 hover:shadow-xl hover:shadow-purple-500/20 hover:-translate-y-1 transition-all duration-300"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video overflow-hidden bg-black">
                  <img
                    src={template.thumbnail}
                    alt={template.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  {/* Play Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/50 group-hover:scale-110 transition-transform">
                      <Play className="w-8 h-8 text-white ml-1" fill="white" />
                    </div>
                  </div>
                  
                  {/* Popular Badge */}
                  {template.popular && (
                    <div className="absolute top-3 left-3 z-10">
                      <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 shadow-lg">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Popular
                      </Badge>
                    </div>
                  )}
                  
                  {/* Duration Badge */}
                  <div className="absolute top-3 right-3 z-10">
                    <Badge className="bg-black/70 backdrop-blur-sm text-white border-0">
                      <Clock className="w-3 h-3 mr-1" />
                      {template.duration}
                    </Badge>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 space-y-3">
                  {/* Title & Category */}
                  <div>
                    <h3 className="font-bold text-lg text-white group-hover:text-purple-300 transition-colors line-clamp-1">
                      {template.name}
                    </h3>
                    <p className="text-sm text-purple-400 font-medium">{template.category}</p>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-400 line-clamp-2">{template.description}</p>

                  {/* Effects & Music */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-start gap-2">
                      <Wand2 className="w-3 h-3 text-purple-400 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-400 line-clamp-1">{template.effects}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <svg className="w-3 h-3 text-purple-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                      </svg>
                      <span className="text-gray-400 line-clamp-1">{template.music}</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <Button
                    onClick={() => handleTemplateClick(template)}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Use Template
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {filteredTemplates.length === 0 && (
            <div className="text-center py-20">
              <Video className="w-16 h-16 text-purple-400 mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold text-white mb-2">No templates found</h3>
              <p className="text-gray-400">Try selecting a different category</p>
            </div>
          )}
        </div>
      </div>

      {/* Template Selection Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] border-purple-500/50 text-white flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Apply Template: {selectedTemplate?.name}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Select a video from your device to apply this template
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2 space-y-6 mt-4">
            {/* Show Processed Video Result */}
            {processedVideo ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-green-400 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Video Processed Successfully!
                  </h4>
                </div>

                {/* Processed Video Player */}
                <div className="relative aspect-video rounded-lg overflow-hidden border-2 border-green-500/50 bg-black shadow-lg shadow-green-500/20">
                  <video
                    src={processedVideo}
                    controls
                    autoPlay
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Template Info */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-purple-900/20 rounded-lg border border-purple-500/30">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Template Applied</p>
                    <p className="text-white font-semibold">{selectedTemplate?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Effects Used</p>
                    <p className="text-white text-sm">{selectedTemplate?.effects}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setProcessedVideo(null);
                      setSelectedVideo(null);
                      setVideoPreview(null);
                    }}
                    className="flex-1 border-purple-500/50 text-white hover:bg-purple-900/20"
                  >
                    Process Another Video
                  </Button>
                  <Button
                    onClick={handleDownloadVideo}
                    disabled={isDownloading}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500"
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
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
                  <h4 className="text-sm font-semibold text-purple-300 flex items-center gap-2">
                    <Play className="w-4 h-4" />
                    Template Preview - Click to Play
                  </h4>
                  <div className="relative aspect-video rounded-lg overflow-hidden border border-purple-500/30 bg-black">
                    {/* Video element with controls for template preview */}
                    <video
                      key={selectedTemplate?.id}
                      poster={selectedTemplate?.thumbnail}
                      controls
                      className="w-full h-full object-cover"
                    >
                      {/* Using category-specific demo videos */}
                      <source src={DEMO_VIDEOS[selectedTemplate?.category || "Promo & Ads"]} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-3 pointer-events-none">
                      <div className="space-y-1">
                        <p className="text-white font-semibold text-sm">{selectedTemplate?.name}</p>
                        <p className="text-gray-300 text-xs">{selectedTemplate?.description}</p>
                      </div>
                    </div>
                  </div>

                  {/* Template Details */}
                  <div className="grid grid-cols-3 gap-3 p-3 bg-purple-900/20 rounded-lg border border-purple-500/30">
                    <div className="text-center">
                      <Clock className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                      <p className="text-xs text-gray-400">Duration</p>
                      <p className="text-sm text-white font-medium">{selectedTemplate?.duration}</p>
                    </div>
                    <div className="text-center border-x border-purple-500/30">
                      <Wand2 className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                      <p className="text-xs text-gray-400">Effects</p>
                      <p className="text-sm text-white font-medium line-clamp-1">{selectedTemplate?.effects?.split(',')[0]}</p>
                    </div>
                    <div className="text-center">
                      <svg className="w-4 h-4 text-purple-400 mx-auto mb-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                      </svg>
                      <p className="text-xs text-gray-400">Music</p>
                      <p className="text-sm text-white font-medium line-clamp-1">{selectedTemplate?.music}</p>
                    </div>
                  </div>
                </div>

                {/* Video Upload Section */}
                <div>
                  <h4 className="text-sm font-semibold text-purple-300 mb-3 flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Select Your Video
                  </h4>
                  
                  {/* Processing Info */}
                  <div className="mb-3 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                    <p className="text-xs text-blue-300 flex items-start gap-2">
                      <Sparkles className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>Template will remove original audio, voice, and music from your video and apply professional effects.</span>
                    </p>
                  </div>
                  
                  {!selectedVideo ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-purple-500/50 rounded-xl p-8 text-center cursor-pointer hover:border-purple-500 hover:bg-purple-500/5 transition-all"
                    >
                      <Upload className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                      <p className="text-white font-medium mb-1">Click to upload video</p>
                      <p className="text-sm text-gray-400">MP4, MOV, AVI up to 500MB</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="video/*"
                        onChange={handleVideoSelect}
                        className="hidden"
                      />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Video Preview */}
                      {videoPreview && (
                        <div className="relative aspect-video rounded-lg overflow-hidden border border-purple-500/30 bg-black">
                          <video
                            src={videoPreview}
                            controls
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}
                      
                      {/* Selected File Info */}
                      <div className="flex items-center justify-between p-4 bg-purple-900/20 rounded-lg border border-purple-500/30">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-green-400" />
                          <div>
                            <p className="text-white font-medium">{selectedVideo.name}</p>
                            <p className="text-sm text-gray-400">
                              {(selectedVideo.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedVideo(null);
                            setVideoPreview(null);
                            if (fileInputRef.current) {
                              fileInputRef.current.value = '';
                            }
                          }}
                          className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Change Video Button */}
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isProcessing}
                        className="w-full border-purple-500/50 text-purple-300 hover:bg-purple-900/20"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Change Video
                      </Button>
                    </div>
                  )}
                </div>

              </>
            )}
          </div>

          {/* Sticky Action Buttons */}
          {!processedVideo && (
            <div className="sticky bottom-0 pt-4 pb-2 bg-gradient-to-t from-[#0f0f1e] via-[#0f0f1e] to-transparent border-t border-purple-500/30 mt-4">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isProcessing}
                  className="flex-1 border-purple-500/50 text-white hover:bg-purple-900/20"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleApplyTemplate}
                  disabled={!selectedVideo || isProcessing}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <div className="flex flex-col items-center w-full gap-2">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processing... {processingProgress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-purple-900/30 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                          style={{ width: `${processingProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
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
      <style jsx global>{`
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
