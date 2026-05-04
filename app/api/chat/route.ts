import { NextRequest, NextResponse } from "next/server";

// OpenAI API configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

// System prompt for the AI video editing assistant
const SYSTEM_PROMPT = `You are "EditAI", an expert AI video editing assistant for an Automated Video Editor app.

Your job is to:
1. Convert user's natural language editing requests into structured FFmpeg JSON commands
2. Answer general questions about video editing
3. Help with app navigation and features
4. Suggest best practices for video editing

When user wants to edit video, respond with JSON in this format:
{
  "response": "Human-friendly description of what will be done",
  "ffmpegCommand": {
    "action": "command_name",
    "params": { param: value },
    "description": "What this command does"
  }
}

Common FFmpeg actions:
- remove_silence: Remove silent portions
- add_music: Add background music
- color_grade: Apply color grading
- speed_change: Change playback speed
- trim: Cut video portions
- add_transitions: Add transitions between scenes
- stabilize: Stabilize shaky footage
- remove_filler_words: Remove "umm", "ahh" etc.
- jump_cuts: Create fast-paced jump cuts
- slow_motion: Apply slow motion effects
- audio_enhance: Improve audio quality

If user asks general questions (not video editing), reply normally without ffmpegCommand.
Always be helpful and suggest improvements the user might not have thought of.`;

// Natural language to FFmpeg command mapping
const FFMPEG_COMMANDS: Record<string, any> = {
  remove_silence: {
    action: "remove_silence",
    params: {
      threshold: "-30dB",
      duration: 2,
      keep_ratio: 0.95
    },
    description: "Remove silent portions longer than 2 seconds"
  },
  add_music: {
    action: "add_music",
    params: {
      volume: 0.3,
      fade_in: 2,
      fade_out: 2,
      ducking: true
    },
    description: "Add background music with volume ducking"
  },
  color_grade_cinematic: {
    action: "color_grade",
    params: {
      preset: "cinematic",
      saturation: 1.2,
      contrast: 1.1,
      warmth: 0.15
    },
    description: "Apply cinematic color grading with teal-orange look"
  },
  jump_cuts: {
    action: "jump_cuts",
    params: {
      interval: 3,
      transition_duration: 0.1,
      beat_sync: true
    },
    description: "Create fast-paced jump cuts every 3 seconds"
  },
  slow_motion: {
    action: "speed_change",
    params: {
      speed: 0.5,
      method: "optical_flow",
      scenes: ["action", "highlight"]
    },
    description: "Apply 2x slow motion with smooth interpolation"
  },
  remove_filler_words: {
    action: "remove_filler_words",
    params: {
      words: ["um", "uh", "ah", "like", "you know"],
      confidence_threshold: 0.8,
      crossfade: 0.1
    },
    description: "Remove filler words with AI speech detection"
  },
  speed_up: {
    action: "speed_change",
    params: {
      speed: 1.5,
      pitch_correction: true,
      audio_sync: true
    },
    description: "Speed up video 1.5x with pitch-corrected audio"
  },
  stabilize: {
    action: "stabilize",
    params: {
      method: "deshake",
      smoothing: 0.8,
      crop_margin: 0.1
    },
    description: "Stabilize shaky footage using AI"
  },
  audio_enhance: {
    action: "audio_enhance",
    params: {
      noise_reduction: 0.7,
      normalization: true,
      compression: 2.5,
      clarity_boost: 1.3
    },
    description: "Enhance audio quality with noise reduction"
  },
  add_subtitles: {
    action: "add_subtitles",
    params: {
      auto_generate: true,
      style: "modern",
      position: "bottom",
      highlight_keywords: true
    },
    description: "Auto-generate and burn-in subtitles"
  }
};

// Keywords to command mapping for quick processing
const KEYWORD_MAPPING: Record<string, string[]> = {
  remove_silence: ["silence", "quiet", "mute", "gap", "pause", "no audio", "empty"],
  add_music: ["music", "song", "audio", "background", "soundtrack"],
  color_grade_cinematic: ["cinematic", "movie", "film", "color", "grade", "look", "style"],
  jump_cuts: ["jump", "fast", "quick", "vlog", "beat", "sync"],
  slow_motion: ["slow", "slomo", "slow-mo"],
  remove_filler_words: ["filler", "um", "uh", "remove words", "clean speech"],
  speed_up: ["speed", "fast", "quicker", "timelapse", "time-lapse"],
  stabilize: ["shaky", "shake", "stable", "smooth", "handheld"],
  audio_enhance: ["enhance", "improve audio", "clear audio", "better sound"],
  add_subtitles: ["subtitle", "caption", "text", "transcribe"]
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, context, videoId } = body;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Check for OpenAI API key
    if (!OPENAI_API_KEY) {
      console.warn("OpenAI API key not configured, using fallback");
      
      // Fallback: Process with keyword matching
      const result = processWithKeywords(message);
      return NextResponse.json(result);
    }

    // Call OpenAI API
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { 
            role: "user", 
            content: `Context: ${context || "general"}\nVideo ID: ${videoId || "none"}\n\nUser request: ${message}` 
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("OpenAI API error:", errorData);
      
      // Fallback to keyword processing
      const result = processWithKeywords(message);
      return NextResponse.json(result);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      throw new Error("No response from AI");
    }

    // Try to parse JSON response
    try {
      const parsed = JSON.parse(aiResponse);
      return NextResponse.json(parsed);
    } catch {
      // Not JSON, return as text response
      return NextResponse.json({
        response: aiResponse,
        ffmpegCommand: null
      });
    }

  } catch (error) {
    console.error("Chat API error:", error);
    
    // Return user-friendly error
    return NextResponse.json({
      response: "⚠️ **Server busy hai** - Please try again in a moment.",
      ffmpegCommand: null,
      error: "Service temporarily unavailable"
    }, { status: 500 });
  }
}

// Fallback function using keyword matching
function processWithKeywords(message: string): any {
  const lowerMessage = message.toLowerCase();
  
  // Find matching command
  let matchedCommand: string | null = null;
  
  for (const [command, keywords] of Object.entries(KEYWORD_MAPPING)) {
    if (keywords.some(keyword => lowerMessage.includes(keyword))) {
      matchedCommand = command;
      break;
    }
  }
  
  if (matchedCommand && FFMPEG_COMMANDS[matchedCommand]) {
    const command = FFMPEG_COMMANDS[matchedCommand];
    
    // Customize based on message
    let customizedParams = { ...command.params };
    
    // Extract specific values from message
    const silenceMatch = message.match(/(\d+)\s*second/);
    if (silenceMatch && matchedCommand === "remove_silence") {
      customizedParams.duration = parseInt(silenceMatch[1]);
    }
    
    const volumeMatch = message.match(/(\d+)%/);
    if (volumeMatch && matchedCommand === "add_music") {
      customizedParams.volume = parseInt(volumeMatch[1]) / 100;
    }
    
    const speedMatch = message.match(/(\d+)x/);
    if (speedMatch && matchedCommand === "slow_motion") {
      customizedParams.speed = 1 / parseInt(speedMatch[1]);
    }
    
    return {
      response: `✨ I'll help you with that! I'll apply: ${command.description}`,
      ffmpegCommand: {
        ...command,
        params: customizedParams
      }
    };
  }
  
  // General response if no command matched
  return {
    response: `🎬 I understand you want to edit your video. Here are some things I can help with:

• Remove silence or filler words
• Add background music
• Apply cinematic color grading
• Create jump cuts or slow motion
• Enhance audio quality
• Stabilize shaky footage

What specific edit would you like to make?`,
    ffmpegCommand: null
  };
}

// GET endpoint for health check
export async function GET() {
  return NextResponse.json({ 
    status: "healthy",
    ai_enabled: !!OPENAI_API_KEY 
  });
}
